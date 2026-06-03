import fs from "node:fs/promises";
import WebSocket from "ws";

const port = Number(process.env.CDP_PORT || 9342);
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createTarget() {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  });
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

const clickVisibleText = (text) => `(() => {
  const wanted = ${JSON.stringify(text)};
  const candidates = Array.from(document.querySelectorAll("button,a,[role='button'],.cursor-pointer"));
  const target = candidates
    .filter((element) => (element.innerText || element.textContent || "").includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
})()`;

async function adminCheck(label, metrics) {
  const cdp = await openState("admin", metrics);
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  const snapshot = await evaluate(
    cdp,
    `(() => ({
      text: document.body.innerText,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      adminCopy: document.body.innerText.includes("See what Tutor just did: models, tools, memory, retrieval, voice, and beta readiness.")
    }))()`,
  );
  if (!snapshot.adminCopy) {
    throw new Error(`${label} missing simplified Admin preface.`);
  }
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} Admin overflow: ${JSON.stringify(snapshot)}`);
  }
  const result = {
    label,
    surface: "admin",
    width: snapshot.width,
    scrollWidth: snapshot.scrollWidth,
    simplifiedAdminPreface: snapshot.adminCopy,
    consoleLogs: cdp.consoleLogs,
  };
  cdp.close();
  return result;
}

async function revisionCheck(label, metrics) {
  const cdp = await openState("revision", metrics, {
    activeView: "revision",
  });
  let bodyText = await evaluate(cdp, "document.body.innerText || ''");
  if (!bodyText.includes("App Design Language")) {
    await evaluate(cdp, clickVisibleText("Revision"));
    await sleep(700);
    await evaluate(cdp, clickVisibleText("App Design Language"));
    await sleep(1000);
  }
  bodyText = await evaluate(cdp, "document.body.innerText || ''");
  if (!bodyText.includes("App Design Language")) {
    throw new Error(
      `${label} could not open App Design Language. Body: ${bodyText.slice(0, 1600)}`,
    );
  }
  if (!bodyText.includes("Chapter audio guide")) {
    await evaluate(cdp, clickVisibleText("App Design Language"));
    await sleep(900);
    await evaluate(cdp, clickVisibleText("Wireframe Connections"));
    await sleep(900);
  }
  bodyText = await evaluate(cdp, "document.body.innerText || ''");
  if (!bodyText.toLowerCase().includes("chapter audio guide")) {
    throw new Error(
      `${label} missing chapter audio guide after opening App Design. Body: ${bodyText.slice(0, 2200)}`,
    );
  }
  await evaluate(cdp, clickVisibleText("Local Beta Control Patterns"));
  await sleep(900);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
        .filter((button) => {
          const style = getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 1 && rect.height > 1;
        })
        .map((button) => (button.innerText || button.textContent || "").trim())
        .filter(Boolean);
      const audios = Array.from(document.querySelectorAll("audio"));
      return {
        text: document.body.innerText,
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasRetrievalHintCopy: document.body.innerText.includes("retrieval hint that names the active and companion PDFs"),
        hasAudioGuide: (document.body.innerText || "").toLowerCase().includes("chapter audio guide"),
        visiblePlayButtons: buttons.filter((text) => /^play$/i.test(text) || /\\bplay\\b/i.test(text)),
        visibleFallbackButtons: buttons.filter((text) => /fallback|retry|native/i.test(text)),
        audioCount: audios.length,
        nativeControlsVisible: audios.filter((audio) => audio.controls).length,
        hiddenAudioCount: audios.filter((audio) => audio.className.includes("sr-only")).length
      };
    })()`,
  );
  if (!snapshot.hasRetrievalHintCopy) {
    throw new Error(`${label} missing App Design retrieval-hint copy.`);
  }
  if (!snapshot.hasAudioGuide) {
    throw new Error(`${label} missing chapter audio guide.`);
  }
  if (snapshot.visiblePlayButtons.length !== 1) {
    throw new Error(
      `${label} expected one visible Play button, saw ${snapshot.visiblePlayButtons.length}.`,
    );
  }
  if (snapshot.visibleFallbackButtons.length) {
    throw new Error(
      `${label} exposed visible fallback controls: ${snapshot.visibleFallbackButtons.join(", ")}`,
    );
  }
  if (snapshot.nativeControlsVisible !== 0 || snapshot.hiddenAudioCount < 1) {
    throw new Error(`${label} audio element is not hidden custom-player-only.`);
  }
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} Revision overflow: ${JSON.stringify(snapshot)}`);
  }
  const result = {
    label,
    surface: "revision",
    width: snapshot.width,
    scrollWidth: snapshot.scrollWidth,
    visiblePlayButtons: snapshot.visiblePlayButtons,
    visibleFallbackButtons: snapshot.visibleFallbackButtons,
    audioCount: snapshot.audioCount,
    nativeControlsVisible: snapshot.nativeControlsVisible,
    hiddenAudioCount: snapshot.hiddenAudioCount,
    hasRetrievalHintCopy: snapshot.hasRetrievalHintCopy,
    consoleLogs: cdp.consoleLogs,
  };
  cdp.close();
  return result;
}

const desktop = {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
};
const mobile = {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
};

const results = [
  await adminCheck("desktop", desktop),
  await adminCheck("mobile", mobile),
  await revisionCheck("desktop", desktop),
  await revisionCheck("mobile", mobile),
];

const noisy = results.flatMap((result) =>
  result.consoleLogs.map((log) => `${result.label}/${result.surface}: ${log.text}`),
);
if (noisy.length) {
  throw new Error(`Captured browser errors: ${noisy.join(" | ")}`);
}

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(
  `${outDir}/phase59-browser-qa.json`,
  `${JSON.stringify(results, null, 2)}\n`,
);
console.log(JSON.stringify(results, null, 2));
