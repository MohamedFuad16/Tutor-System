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
  const wanted = ${JSON.stringify(text)}.toLowerCase();
  const candidates = Array.from(document.querySelectorAll("button,a,[role='button'],.cursor-pointer"));
  const target = candidates
    .filter((element) => (element.innerText || element.textContent || "").toLowerCase().includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
})()`;

async function openState(view, metrics, extraState = {}) {
  const target = await createTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", metrics);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      localStorage.setItem("access_mode", "admin");
      localStorage.removeItem("tutor_book_hidden");
      localStorage.removeItem("user_brain_architecture_book_hidden");
      localStorage.removeItem("app_design_language_book_hidden");
      if (${JSON.stringify(view)} === "revision") {
        localStorage.setItem("revision_open_book_id", "app-design-language");
      }
      localStorage.setItem("learning-ai-store", JSON.stringify({
        state: {
          activeView: ${JSON.stringify(view)},
          accessMode: "admin",
          activeProject: "General Study",
          language: "en",
          ...${JSON.stringify(extraState)}
        },
        version: 0
      }));
    `,
  });
  await cdp.send("Page.navigate", { url: appUrl });
  await sleep(1600);
  return cdp;
}

async function screenshot(cdp, fileName) {
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(`${outDir}/${fileName}`, Buffer.from(shot.data, "base64"));
}

function assertNoOverflow(label, snapshot) {
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
}

function assertCleanConsole(label, consoleLogs) {
  if (consoleLogs.length) {
    throw new Error(`${label} console logs: ${JSON.stringify(consoleLogs)}`);
  }
}

async function studyCheck(label, metrics) {
  const cdp = await openState("study", metrics);
  await waitFor(
    cdp,
    `document.querySelectorAll('input[type="file"]').length > 0`,
  );
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="file"][accept="application/pdf"]'));
      return {
        surface: "study",
        label: ${JSON.stringify(label)},
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        pdfInputs: inputs.length,
        multiPdfInputs: inputs.filter((input) => input.multiple).length,
        hasStudySurface: document.body.innerText.includes("Tutor") || document.body.innerText.includes("Study")
      };
    })()`,
  );
  if (snapshot.pdfInputs < 1 || snapshot.multiPdfInputs < 1) {
    throw new Error(
      `${label} missing multi-PDF Study input: ${JSON.stringify(snapshot)}`,
    );
  }
  assertNoOverflow(label, snapshot);
  await screenshot(cdp, `ACF-study-multipdf-${label}.png`);
  assertCleanConsole(label, cdp.consoleLogs);
  cdp.close();
  return { ...snapshot, consoleLogs: [] };
}

async function adminCheck(label, metrics) {
  const cdp = await openState("admin", metrics);
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      return {
        surface: "admin",
        label: ${JSON.stringify(label)},
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasSimplePreface: text.includes("Track models, tools, memory, retrieval, voice, and beta readiness."),
        hasOldPreface: text.includes("See what Tutor just did")
      };
    })()`,
  );
  if (!snapshot.hasSimplePreface || snapshot.hasOldPreface) {
    throw new Error(
      `${label} Admin preface mismatch: ${JSON.stringify(snapshot)}`,
    );
  }
  assertNoOverflow(label, snapshot);
  await screenshot(cdp, `ACF-admin-simple-copy-${label}.png`);
  assertCleanConsole(label, cdp.consoleLogs);
  cdp.close();
  return { ...snapshot, consoleLogs: [] };
}

async function revisionCheck(label, metrics) {
  const cdp = await openState("revision", metrics, {
    activeView: "revision",
  });
  let bodyText = await evaluate(cdp, "document.body.innerText || ''");
  if (
    !bodyText.includes("App Design Language") ||
    !bodyText.includes("Local Beta Control Patterns")
  ) {
    await evaluate(cdp, clickVisibleText("Revision"));
    await sleep(700);
    await evaluate(cdp, clickVisibleText("App Design Language"));
    await sleep(1000);
  }
  await evaluate(cdp, clickVisibleText("Local Beta Control Patterns"));
  await sleep(1000);
  bodyText = await evaluate(cdp, "document.body.innerText || ''");
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const visibleButtons = Array.from(document.querySelectorAll("button"))
        .filter((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1;
        })
        .map((button) => (button.innerText || button.textContent || "").trim());
      const audios = Array.from(document.querySelectorAll("audio"));
      return {
        surface: "revision",
        label: ${JSON.stringify(label)},
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasAppDesign: text.toLowerCase().includes("app design language"),
        hasMultiIntakeCopy: text.includes("one or several uploaded PDFs are saved into the active book"),
        hasContextPacketCopy: text.includes("Typed chat and live voice share one context builder"),
        hasAudioGuide: text.includes("Chapter audio guide"),
        visiblePlayButtons: visibleButtons.filter((label) => /^Play$/.test(label)).length,
        audioCount: audios.length,
        hiddenAudioCount: audios.filter((audio) => audio.className.includes("sr-only")).length,
        nativeControls: audios.filter((audio) => audio.controls).length,
        fallbackTextVisible: /fallback play|native fallback/i.test(text)
      };
    })()`,
  );
  if (
    !snapshot.hasAppDesign ||
    !snapshot.hasMultiIntakeCopy ||
    !snapshot.hasContextPacketCopy ||
    !snapshot.hasAudioGuide ||
    snapshot.visiblePlayButtons !== 1 ||
    snapshot.audioCount !== 1 ||
    snapshot.hiddenAudioCount !== 1 ||
    snapshot.nativeControls !== 0 ||
    snapshot.fallbackTextVisible
  ) {
    throw new Error(
      `${label} Revision mismatch: ${JSON.stringify(snapshot)} body=${bodyText.slice(0, 1200)}`,
    );
  }
  assertNoOverflow(label, snapshot);
  await screenshot(cdp, `ACF-revision-multipdf-audio-${label}.png`);
  assertCleanConsole(label, cdp.consoleLogs);
  cdp.close();
  return { ...snapshot, consoleLogs: [] };
}

await fs.mkdir(outDir, { recursive: true });

const viewports = [
  {
    label: "desktop",
    metrics: {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    },
  },
  {
    label: "mobile",
    metrics: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    },
  },
];

const results = [];
for (const viewport of viewports) {
  results.push(await studyCheck(viewport.label, viewport.metrics));
  results.push(await adminCheck(viewport.label, viewport.metrics));
  results.push(await revisionCheck(viewport.label, viewport.metrics));
}

const output = {
  status: "passed",
  appUrl,
  port,
  results,
  generatedAt: new Date().toISOString(),
};

await fs.writeFile(
  `${outDir}/phase68-browser-qa.json`,
  JSON.stringify(output, null, 2),
);
console.log(JSON.stringify(output, null, 2));
