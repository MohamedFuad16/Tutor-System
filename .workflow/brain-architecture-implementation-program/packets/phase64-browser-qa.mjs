import fs from "node:fs/promises";
import WebSocket from "ws";

const port = Number(process.env.CDP_PORT || 9342);
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createTarget() {
  const response = await fetch(
    `http://127.0.0.1:${port}/json/new?about:blank`,
    {
      method: "PUT",
    },
  );
  if (!response.ok) {
    throw new Error(`Unable to create Chrome target: ${response.status}`);
  }
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const consoleLogs = [];

  ws.on("message", (data) => {
    const message = JSON.parse(String(data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message || "CDP command failed"));
      } else {
        resolve(message.result || {});
      }
      return;
    }
    if (
      message.method === "Runtime.exceptionThrown" ||
      message.method === "Log.entryAdded" ||
      (message.method === "Runtime.consoleAPICalled" &&
        ["warning", "error"].includes(message.params?.type))
    ) {
      consoleLogs.push({
        method: message.method,
        text:
          message.params?.exceptionDetails?.text ||
          message.params?.entry?.text ||
          message.params?.args
            ?.map((arg) => arg.value || arg.description)
            .join(" ") ||
          "",
      });
    }
  });

  const opened = new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  const send = async (method, params = {}) => {
    await opened;
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  };

  const close = () => {
    try {
      ws.close();
    } catch {
      // no-op
    }
  };

  return { send, close, consoleLogs };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

async function waitFor(cdp, expression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(cdp, expression);
    if (value) return value;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const clickVisibleText = (text) => `(() => {
  const wanted = ${JSON.stringify(text)};
  const candidates = Array.from(document.querySelectorAll("button,a,[role='button']"));
  const target = candidates
    .filter((element) => Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length))
    .filter((element) => (element.innerText || element.textContent || "").includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.click();
  return true;
})()`;

async function seedModelRuns(cdp) {
  return evaluate(
    cdp,
    `new Promise((resolve, reject) => {
      const open = indexedDB.open("NeuralNestBrain");
      open.onerror = () => reject(open.error || new Error("open failed"));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("modelRuns", "readwrite");
        const store = tx.objectStore("modelRuns");
        const timestamp = Date.now();
        const rows = [
          {
            id: "model-run:chat_stream:qa-phase64:started:deepseek-deepseek-v4-flash",
            timestamp: timestamp - 30,
            status: "started",
            provider: "openrouter",
            source: "chat_stream",
            requestId: "qa-phase64",
            requestedModel: "deepseek/deepseek-v4-flash",
            usedModel: "deepseek/deepseek-v4-flash",
            estimated: true
          },
          {
            id: "model-run:chat_stream:qa-phase64:fallback:google-gemini-2.5-flash",
            timestamp: timestamp - 20,
            status: "fallback",
            provider: "openrouter",
            source: "chat_stream",
            requestId: "qa-phase64",
            requestedModel: "deepseek/deepseek-v4-flash",
            usedModel: "google/gemini-2.5-flash",
            estimated: true
          },
          {
            id: "model-run:chat_stream:qa-phase64:completed:google-gemini-2.5-flash",
            timestamp: timestamp - 10,
            status: "completed",
            provider: "openrouter",
            source: "chat_stream",
            requestId: "qa-phase64",
            requestedModel: "deepseek/deepseek-v4-flash",
            usedModel: "google/gemini-2.5-flash",
            inputTokens: 120,
            outputTokens: 80,
            estimated: true,
            durationMs: 420
          }
        ];
        rows.forEach((row) => store.put(row));
        tx.oncomplete = () => {
          db.close();
          resolve(rows.length);
        };
        tx.onerror = () => reject(tx.error || new Error("transaction failed"));
      };
    })`,
  );
}

async function openAdmin(metrics) {
  const target = await createTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", metrics);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      localStorage.setItem("access_mode", "admin");
      localStorage.setItem("learning-ai-store", JSON.stringify({
        state: {
          activeView: "admin",
          accessMode: "admin",
          activeProject: "General Study",
          language: "en"
        },
        version: 0
      }));
    `,
  });
  await cdp.send("Page.navigate", { url: appUrl });
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  await seedModelRuns(cdp);
  await cdp.send("Page.reload");
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  await waitFor(
    cdp,
    "document.body.innerText.includes('Model Runs') || document.body.innerText.includes('Models')",
  );
  const clickedModelRuns = await evaluate(cdp, clickVisibleText("Model Runs"));
  const clickedModels = clickedModelRuns
    ? true
    : await evaluate(cdp, clickVisibleText("Models"));
  if (!clickedModels) {
    throw new Error("Unable to click Model Runs or Models tab.");
  }
  await sleep(500);
  const tabSwitched = await evaluate(
    cdp,
    "document.body.innerText.includes('Chat model run ledger')",
  );
  if (!tabSwitched) {
    const debug = await evaluate(
      cdp,
      `(() => ({
        headings: Array.from(document.querySelectorAll("h1,h2,h3")).map((node) => (node.innerText || node.textContent || "").trim()).slice(0, 12),
        buttons: Array.from(document.querySelectorAll("button"))
          .map((button) => ({
            text: (button.innerText || button.textContent || "").trim(),
            visible: Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length)
          }))
          .filter((button) => button.visible)
          .slice(0, 40)
      }))()`,
    );
    throw new Error(`Model tab did not open: ${JSON.stringify(debug)}`);
  }
  await waitFor(
    cdp,
    "document.body.innerText.includes('Chat model run ledger')",
  );
  await waitFor(cdp, "document.body.innerText.includes('qa-phase64')");
  return cdp;
}

async function checkAdminModelRuns(label, metrics) {
  const cdp = await openAdmin(metrics);
  await sleep(800);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const lower = text.toLowerCase();
      return {
        label: ${JSON.stringify(label)},
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasModelLedger: lower.includes("chat model run ledger"),
        hasPhaseCopy: lower.includes("starts, fallbacks, completions"),
        hasStartedRow: lower.includes("started"),
        hasFallbackRow: lower.includes("fallback"),
        hasCompletedRow: lower.includes("completed"),
        qaRequestMentions: (text.match(/qa-phase64/g) || []).length,
        modelMentions: (text.match(/google\\/gemini-2.5-flash/g) || []).length
      };
    })()`,
  );
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
  const required = [
    "hasModelLedger",
    "hasPhaseCopy",
    "hasStartedRow",
    "hasFallbackRow",
    "hasCompletedRow",
  ];
  const missing = required.filter((key) => !snapshot[key]);
  if (snapshot.qaRequestMentions < 3) missing.push("qaRequestMentions>=3");
  if (snapshot.modelMentions < 2) missing.push("modelMentions>=2");
  if (missing.length) {
    throw new Error(
      `${label} missing model-run evidence: ${missing.join(", ")}`,
    );
  }
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    `${outDir}/ACB-admin-model-runs-${label}.png`,
    Buffer.from(screenshot.data, "base64"),
  );
  const result = {
    ...snapshot,
    consoleLogs: cdp.consoleLogs,
  };
  cdp.close();
  return result;
}

await fs.mkdir(outDir, { recursive: true });
const results = [
  await checkAdminModelRuns("desktop", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }),
  await checkAdminModelRuns("mobile", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  }),
];

for (const result of results) {
  if (result.consoleLogs.length) {
    throw new Error(
      `${result.label} console logs: ${JSON.stringify(result.consoleLogs)}`,
    );
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  appUrl,
  results,
};
await fs.writeFile(
  `${outDir}/phase64-browser-qa.json`,
  JSON.stringify(payload, null, 2),
);
console.log(JSON.stringify(payload, null, 2));
