import fs from "node:fs/promises";
import WebSocket from "ws";

const port = Number(process.env.CDP_PORT || 9342);
const appUrl = process.env.APP_URL || "http://localhost:3100";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";

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
  const listeners = new Map();
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

    const waits = listeners.get(message.method) || [];
    for (const resolve of waits) resolve(message.params || {});
    listeners.delete(message.method);
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

  const waitForEvent = async (method, timeoutMs = 10000) => {
    await opened;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${method}`)),
        timeoutMs,
      );
      const wrapped = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      const waits = listeners.get(method) || [];
      waits.push(wrapped);
      listeners.set(method, waits);
    });
  };

  const close = () => {
    try {
      ws.close();
    } catch {
      // no-op
    }
  };

  return { send, waitForEvent, close, consoleLogs };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

async function waitFor(cdp, predicateExpression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(cdp, predicateExpression);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${predicateExpression}`);
}

const clickTextExpression = (text) => `(() => {
  const wanted = ${JSON.stringify(text)};
  const controls = Array.from(document.querySelectorAll("button,a,[role='button']"));
  const target = controls.find((element) => {
    const label = (element.innerText || element.textContent || "").trim();
    return label === wanted || label.includes(wanted);
  });
  if (!target) return false;
  target.click();
  return true;
})()`;

async function scrollUntilText(cdp, text, timeoutMs = 10000) {
  const started = Date.now();
  const wanted = JSON.stringify(text);
  while (Date.now() - started < timeoutMs) {
    const hasText = await evaluate(
      cdp,
      `document.body.textContent.includes(${wanted})`,
    );
    if (hasText) {
      await evaluate(
        cdp,
        `(() => {
          const wanted = ${wanted};
          const target = Array.from(document.querySelectorAll("section,h1,h2,h3,article,div"))
            .filter((element) => (element.textContent || "").includes(wanted))
            .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
          if (target) {
            target.scrollIntoView({ block: "start", inline: "nearest" });
          }
          return Boolean(target);
        })()`,
      );
      return true;
    }
    await evaluate(
      cdp,
      `(() => {
        const scrollables = Array.from(document.querySelectorAll("*")).filter((element) => (
          element.scrollHeight > element.clientHeight + 24
        ));
        for (const element of scrollables) {
          element.scrollTop = Math.min(element.scrollTop + 720, element.scrollHeight);
        }
        window.scrollBy(0, 720);
        return scrollables.length;
      })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function openAdminBeta(label, metrics) {
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
          activeProject: "General Study",
          language: "en"
        },
        version: 0
      }));
    `,
  });
  const load = cdp.waitForEvent("Page.loadEventFired", 15000).catch(() => null);
  await cdp.send("Page.navigate", { url: appUrl });
  await load;
  await new Promise((resolve) => setTimeout(resolve, 750));

  let bodyText = await evaluate(cdp, "document.body.innerText || ''");
  if (!bodyText.includes("Admin Center")) {
    await evaluate(cdp, clickTextExpression("Admin"));
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  bodyText = await evaluate(cdp, "document.body.innerText || ''");
  if (!bodyText.includes("Admin Center")) {
    await evaluate(cdp, clickTextExpression("Revision"));
    await new Promise((resolve) => setTimeout(resolve, 500));
    await evaluate(cdp, clickTextExpression("Admin"));
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  try {
    await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  } catch (error) {
    const body = await evaluate(
      cdp,
      "(document.body.innerText || '').slice(0, 1200)",
    );
    throw new Error(`${error.message}\nVisible body:\n${body}`);
  }
  await evaluate(cdp, clickTextExpression("Beta"));
  const foundBackgroundLedger = await scrollUntilText(
    cdp,
    "Background Job Ledger",
  );
  if (!foundBackgroundLedger) {
    const body = await evaluate(
      cdp,
      "(document.body.innerText || '').slice(0, 2000)",
    );
    throw new Error(
      `Timed out waiting for Background Job Ledger\nVisible body:\n${body}`,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 500));

  const layout = await evaluate(
    cdp,
    `(() => ({
      url: location.href,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      hasLedgerCopy: document.body.textContent.includes('Memory workers now record interaction, learning-book, and graph-concept jobs'),
      hasEmptyState: document.body.textContent.includes('Run a chat turn, voice turn, document ingest, or graph update'),
      hasCloudBoundary: document.body.textContent.includes('without cloud workers'),
      hasBetaDiagnostics: document.body.textContent.includes('Beta Diagnostics')
    }))()`,
  );

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fullPage: true,
  });
  const screenshotPath = `${outDir}/ABM-admin-beta-${label}.png`;
  await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  cdp.close();
  return {
    label,
    layout,
    consoleLogs: cdp.consoleLogs,
    screenshotPath,
  };
}

await fs.mkdir(outDir, { recursive: true });

const results = [];
results.push(
  await openAdminBeta("desktop", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }),
);
results.push(
  await openAdminBeta("mobile", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  }),
);

await fs.writeFile(
  `${outDir}/ABM-admin-beta-browser-qa.json`,
  `${JSON.stringify(results, null, 2)}\n`,
);

console.log(JSON.stringify(results, null, 2));
