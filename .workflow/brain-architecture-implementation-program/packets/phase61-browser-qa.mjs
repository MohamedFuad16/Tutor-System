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
    .filter((element) => (element.innerText || element.textContent || "").includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
})()`;

async function openAdmin(metrics) {
  const target = await createTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", metrics);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__systemActivityRequests = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input?.url || "";
        if (String(url).includes("/api/debug/system-activity")) {
          window.__systemActivityRequests.push(Date.now());
        }
        return originalFetch(input, init);
      };
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
  await waitFor(
    cdp,
    "window.__systemActivityRequests && window.__systemActivityRequests.length >= 1",
  );
  return cdp;
}

async function checkAdminProviderMeters(label, metrics) {
  const cdp = await openAdmin(metrics);
  await evaluate(cdp, "window.__betaClickedAt = Date.now()");
  await evaluate(cdp, clickVisibleText("Beta Diagnostics"));
  await waitFor(
    cdp,
    "document.body.innerText.toLowerCase().includes('live beta runbook')",
  );
  await sleep(5600);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const lower = text.toLowerCase();
      const requests = window.__systemActivityRequests || [];
      const betaClickedAt = window.__betaClickedAt || 0;
      const betaRequests = requests.filter((timestamp) => timestamp >= betaClickedAt).length;
      return {
        label: ${JSON.stringify(label)},
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        requestCount: requests.length,
        betaRequests,
        hasLocalBetaReadiness: lower.includes("local beta readiness"),
        hasRunbook: lower.includes("live beta runbook") && lower.includes("ordered manual proof path"),
        hasProviderMeterChip:
          lower.includes("provider meters live") ||
          lower.includes("provider meters loading") ||
          lower.includes("provider meters offline"),
        hasManualStatus: lower.includes("manual run can start") || lower.includes("setup before run"),
        hasProviderKeysStep: lower.includes("confirm local provider keys"),
        hasLocalOnly: lower.includes("local only")
      };
    })()`,
  );
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
  if (snapshot.betaRequests < 1) {
    throw new Error(
      `${label} did not keep system activity polling active in Beta Diagnostics: ${JSON.stringify(snapshot)}`,
    );
  }
  const required = [
    "hasLocalBetaReadiness",
    "hasRunbook",
    "hasProviderMeterChip",
    "hasManualStatus",
    "hasProviderKeysStep",
    "hasLocalOnly",
  ];
  const missing = required.filter((key) => !snapshot[key]);
  if (missing.length) {
    throw new Error(
      `${label} missing provider-meter evidence: ${missing.join(", ")}`,
    );
  }
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    `${outDir}/ABY-admin-provider-meters-${label}.png`,
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
  await checkAdminProviderMeters("desktop", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }),
  await checkAdminProviderMeters("mobile", {
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
  `${outDir}/phase61-browser-qa.json`,
  JSON.stringify(payload, null, 2),
);
console.log(JSON.stringify(payload, null, 2));
