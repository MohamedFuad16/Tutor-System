import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";

const ROOT = process.cwd();
const WORKFLOW_DIR = path.join(ROOT, ".workflow/learningai-three-page-autonomous-qa");
const RESULTS_DIR = path.join(WORKFLOW_DIR, "results/live-qa");
const PROFILE_DIR = path.join(WORKFLOW_DIR, "chrome-profile");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const APP_URL = "http://127.0.0.1:3100/";
const PORT = 9337;

const scenarios = [
  { page: "study", viewport: "desktop", width: 1280, height: 800 },
  { page: "study", viewport: "mobile", width: 390, height: 844 },
  { page: "analytics", viewport: "desktop", width: 1280, height: 800 },
  { page: "analytics", viewport: "mobile", width: 390, height: 844 },
  {
    page: "revision",
    viewport: "desktop",
    width: 1280,
    height: 800,
    bookId: "user-brain-architecture",
    bookTitle: "User Brain Architecture",
  },
  {
    page: "revision",
    viewport: "mobile",
    width: 390,
    height: 844,
    bookId: "user-brain-architecture",
    bookTitle: "User Brain Architecture",
  },
  {
    page: "revision",
    viewport: "mobile-mermaid",
    width: 390,
    height: 844,
    bookId: "user-brain-architecture",
    bookTitle: "User Brain Architecture",
    clickChapter: "Chapter 5:",
    scrollToDiagram: true,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForChrome() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Keep waiting.
    }
    await sleep(150);
  }
  throw new Error("Chrome remote debugging endpoint did not become ready.");
}

async function newPageWebSocket() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Could not create Chrome target: ${response.status}`);
  }
  const target = await response.json();
  return target.webSocketDebuggerUrl;
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const events = [];

  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    events.push(message);
  });

  const opened = new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });

  async function send(method, params = {}) {
    await opened;
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  }

  return { socket, send, events };
}

function storePayload(page) {
  return JSON.stringify({
    state: {
      activeProject: "General Study",
      activeLearningBookId: null,
      activeView: page,
      language: "en",
    },
    version: 0,
  });
}

function initScript({ page, bookId }) {
  return `
    localStorage.setItem("learning-ai-store", ${JSON.stringify(storePayload(page))});
    localStorage.setItem("learning_ai_language", "en");
    localStorage.setItem("animations_enabled", "false");
    localStorage.setItem("access_mode", "user");
    localStorage.removeItem("user_brain_architecture_book_hidden");
    localStorage.removeItem("tutor_book_hidden");
    localStorage.removeItem("app_design_language_book_hidden");
    ${bookId ? `localStorage.setItem("revision_open_book_id", ${JSON.stringify(bookId)});` : "localStorage.removeItem('revision_open_book_id');"}
  `;
}

function pageAuditScript({ bookTitle, clickChapter, scrollToDiagram }) {
  return `(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    ${bookTitle ? `
      const bookDeadline = Date.now() + 6000;
      while (Date.now() < bookDeadline) {
        if ((document.body.innerText || "").includes("Back to Library")) break;
        const bookNodes = [...document.querySelectorAll("button, [class*='cursor-pointer'], h2, div")];
        const bookLabel =
          bookNodes.find((node) => (node.textContent || "").trim() === ${JSON.stringify(bookTitle)}) ||
          bookNodes
            .filter((node) => (node.textContent || "").includes(${JSON.stringify(bookTitle)}))
            .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
        const bookTarget =
          bookLabel?.closest?.("[class*='cursor-pointer']") ||
          bookLabel?.closest?.("button") ||
          bookLabel;
        if (bookTarget) {
          bookTarget.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          }));
          break;
        }
        await sleep(150);
      }
      await sleep(900);
    ` : ""}
    ${clickChapter ? `
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) {
        const button = [...document.querySelectorAll("button")].find((node) =>
          (node.textContent || "").includes(${JSON.stringify(clickChapter)})
        );
        if (button) {
          button.click();
          break;
        }
        await sleep(150);
      }
      await sleep(1600);
    ` : ""}
    ${scrollToDiagram ? `
      const diagramDeadline = Date.now() + 7000;
      while (Date.now() < diagramDeadline) {
        const diagram =
          document.querySelector("[aria-label='User Brain Architecture chart']") ||
          document.querySelector("[aria-label='Revision diagram']") ||
          document.querySelector(".not-prose [role='img']");
        if (diagram) {
          diagram.scrollIntoView({ block: "center", inline: "nearest" });
          break;
        }
        await sleep(180);
      }
      await sleep(900);
    ` : ""}
    await sleep(2200);
    const root = document.documentElement;
    const body = document.body;
    const wideElements = [...document.querySelectorAll("body *")]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          text: (node.textContent || "").replace(/\\s+/g, " ").slice(0, 80),
          className: String(node.className || "").slice(0, 140),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.width > 0 && (item.left < -2 || item.right > window.innerWidth + 2))
      .slice(0, 12);
    const mobileChrome = [...document.querySelectorAll("button, h1, [role='img'], svg")]
      .slice(0, 80)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          text: (node.textContent || node.getAttribute("aria-label") || "").replace(/\\s+/g, " ").slice(0, 70),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.height > 0 && item.width > 0);
    return {
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: {
        documentWidth: root.scrollWidth,
        viewportWidth: root.clientWidth,
        bodyWidth: body.scrollWidth,
        xOverflow: root.scrollWidth > root.clientWidth + 1 || body.scrollWidth > root.clientWidth + 1,
      },
      wideElements,
      visibleSignals: mobileChrome,
      textSample: (body.innerText || "").replace(/\\s+/g, " ").slice(0, 600),
    };
  })()`;
}

function interestingLogs(events) {
  return events
    .filter((event) =>
      ["Runtime.exceptionThrown", "Log.entryAdded", "Runtime.consoleAPICalled"].includes(
        event.method,
      ),
    )
    .map((event) => {
      if (event.method === "Runtime.exceptionThrown") {
        return {
          level: "error",
          message:
            event.params?.exceptionDetails?.text ||
            event.params?.exceptionDetails?.exception?.description ||
            "Runtime exception",
        };
      }
      if (event.method === "Log.entryAdded") {
        return {
          level: event.params?.entry?.level || "log",
          message: event.params?.entry?.text || "",
        };
      }
      return {
        level: event.params?.type || "log",
        message: (event.params?.args || [])
          .map((arg) => arg.value || arg.description || "")
          .join(" "),
      };
    })
    .filter((entry) =>
      ["error", "warning", "warn"].includes(entry.level) &&
      !entry.message.includes("Download the React DevTools"),
    );
}

await mkdir(RESULTS_DIR, { recursive: true });
await rm(PROFILE_DIR, { recursive: true, force: true });
await mkdir(PROFILE_DIR, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-features=Translate,OptimizationHints",
  "about:blank",
]);

chrome.stderr.setEncoding("utf8");
chrome.stderr.on("data", (chunk) => {
  if (!chunk.includes("DevTools listening")) process.stderr.write(chunk);
});

try {
  await waitForChrome();
  const summary = [];

  for (const scenario of scenarios) {
    const wsUrl = await newPageWebSocket();
    const page = connect(wsUrl);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: scenario.width,
      height: scenario.height,
      deviceScaleFactor: 1,
      mobile: scenario.width < 500,
    });
    await page.send("Page.addScriptToEvaluateOnNewDocument", {
      source: initScript(scenario),
    });
    await page.send("Page.navigate", { url: APP_URL });
    await sleep(3200);
    const audit = await page.send("Runtime.evaluate", {
      expression: pageAuditScript(scenario),
      awaitPromise: true,
      returnByValue: true,
    });
    const metrics = audit.result?.value;
    const screenshot = await page.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const screenshotPath = path.join(
      RESULTS_DIR,
      `${scenario.page}-${scenario.viewport}-${scenario.width}x${scenario.height}.png`,
    );
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

    const logs = interestingLogs(page.events);
    summary.push({
      scenario,
      screenshotPath,
      metrics,
      logs,
    });
    page.socket.close();
  }

  const summaryPath = path.join(RESULTS_DIR, "summary.json");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, summaryPath, scenarios: summary.length }, null, 2));
} finally {
  chrome.kill("SIGTERM");
}
