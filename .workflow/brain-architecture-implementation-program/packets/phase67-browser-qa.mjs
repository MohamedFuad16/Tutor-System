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
    { method: "PUT" },
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
  const wanted = ${JSON.stringify(text)}.toLowerCase();
  const candidates = Array.from(document.querySelectorAll("button,a,[role='button']"));
  const target = candidates
    .filter((element) => (element.innerText || element.textContent || "").toLowerCase().includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
})()`;

const scrollTextIntoView = (text) => `(() => {
  const wanted = ${JSON.stringify(text)}.toLowerCase();
  const target = Array.from(document.querySelectorAll("*"))
    .filter((element) => element !== document.body && (element.innerText || element.textContent || "").toLowerCase().includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (target) {
    target.scrollIntoView({ block: "center", inline: "nearest" });
    return true;
  }
  return false;
})()`;

const lifecycleRowsExpression = (
  proofAttemptId,
) => `new Promise((resolve, reject) => {
  const open = indexedDB.open("NeuralNestBrain");
  open.onerror = () => reject(open.error || new Error("open failed"));
  open.onsuccess = () => {
    const db = open.result;
    const tx = db.transaction(["memoryEvents"], "readonly");
    const request = tx.objectStore("memoryEvents").getAll();
    request.onerror = () => reject(request.error || new Error("getAll failed"));
    request.onsuccess = () => {
      const rows = (request.result || []).filter((row) => row?.metadata?.proofAttemptId === ${JSON.stringify(proofAttemptId)});
      db.close();
      resolve({
        started: rows.filter((row) => row.eventType === "beta_proof_attempt_started").length,
        cleared: rows.filter((row) => row.eventType === "beta_proof_attempt_cleared").length,
        sources: rows.map((row) => row.source),
        summaries: rows.map((row) => row.summary)
      });
    };
  };
})`;

async function waitForLifecycleRows(cdp, proofAttemptId, field) {
  return waitFor(
    cdp,
    `(async () => {
      const rows = await (${lifecycleRowsExpression(proofAttemptId)});
      return rows.${field} > 0 ? rows : false;
    })()`,
  );
}

async function openDiagnostics(metrics) {
  const target = await createTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", metrics);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      localStorage.setItem("access_mode", "admin");
      localStorage.removeItem("active_beta_proof_attempt_id");
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
  const alreadyOnDiagnostics = await evaluate(
    cdp,
    `document.body.innerText.toLowerCase().includes("deliberate beta-run checklist")`,
  );
  if (!alreadyOnDiagnostics) {
    const clicked =
      (await evaluate(cdp, clickVisibleText("Beta Diagnostics"))) ||
      (await evaluate(cdp, clickVisibleText("Beta")));
    if (!clicked) {
      throw new Error("Unable to click Diagnostics tab.");
    }
  }
  await waitFor(
    cdp,
    `document.body.innerText.toLowerCase().includes("deliberate beta-run checklist")`,
  );
  return cdp;
}

async function checkLifecycle(label, metrics) {
  const cdp = await openDiagnostics(metrics);
  const startClicked = await evaluate(
    cdp,
    clickVisibleText("Start proof attempt"),
  );
  if (!startClicked) {
    throw new Error(`${label} could not click Start proof attempt.`);
  }
  await waitFor(
    cdp,
    `(() => (localStorage.getItem("active_beta_proof_attempt_id") || "").startsWith("beta-"))()`,
  );
  const activeAttemptId = await evaluate(
    cdp,
    `localStorage.getItem("active_beta_proof_attempt_id") || ""`,
  );
  const startedRows = await waitForLifecycleRows(
    cdp,
    activeAttemptId,
    "started",
  );
  await waitFor(
    cdp,
    `document.body.innerText.toLowerCase().includes(${JSON.stringify(activeAttemptId.toLowerCase())})`,
  );

  const clearClicked = await evaluate(cdp, clickVisibleText("Clear attempt"));
  if (!clearClicked) {
    throw new Error(`${label} could not click Clear attempt.`);
  }
  await waitFor(
    cdp,
    `localStorage.getItem("active_beta_proof_attempt_id") === null && document.body.innerText.toLowerCase().includes("active attempt not started")`,
  );
  const clearedRows = await waitForLifecycleRows(
    cdp,
    activeAttemptId,
    "cleared",
  );
  await evaluate(cdp, scrollTextIntoView("Deliberate beta-run checklist"));
  await sleep(250);

  const snapshot = await evaluate(
    cdp,
    `(() => ({
      label: ${JSON.stringify(label)},
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      activeAttemptId: ${JSON.stringify(activeAttemptId)},
      hasChecklist: document.body.innerText.toLowerCase().includes("deliberate beta-run checklist"),
      hasStartControl: document.body.innerText.toLowerCase().includes("start proof attempt"),
      activeAttemptCleared: localStorage.getItem("active_beta_proof_attempt_id") === null
    }))()`,
  );
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
  if (
    !snapshot.hasChecklist ||
    !snapshot.hasStartControl ||
    !snapshot.activeAttemptCleared
  ) {
    throw new Error(
      `${label} missing lifecycle UI: ${JSON.stringify(snapshot)}`,
    );
  }
  if (startedRows.started < 1 || clearedRows.cleared < 1) {
    throw new Error(
      `${label} missing lifecycle ledger rows: ${JSON.stringify({ startedRows, clearedRows })}`,
    );
  }
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    `${outDir}/ACE-admin-proof-lifecycle-${label}.png`,
    Buffer.from(screenshot.data, "base64"),
  );
  const result = {
    ...snapshot,
    startedRows,
    clearedRows,
    consoleLogs: cdp.consoleLogs,
  };
  if (cdp.consoleLogs.length) {
    throw new Error(
      `${label} console logs: ${JSON.stringify(cdp.consoleLogs)}`,
    );
  }
  cdp.close();
  return result;
}

await fs.mkdir(outDir, { recursive: true });
const results = [];
try {
  results.push(
    await checkLifecycle("desktop", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  );
  results.push(
    await checkLifecycle("mobile", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    }),
  );
} finally {
  // individual targets are closed after successful checks
}

const payload = {
  generatedAt: new Date().toISOString(),
  appUrl,
  results,
};
await fs.writeFile(
  `${outDir}/phase67-browser-qa.json`,
  `${JSON.stringify(payload, null, 2)}\n`,
);
console.log(JSON.stringify(payload, null, 2));
