import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE ||
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
);

const port = Number(process.env.CDP_PORT || 9362);
const appUrl = process.env.APP_URL || "http://127.0.0.1:3001";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";

const PROOF_ATTEMPT_ID = "acp-proof-hud-attempt";
const BOOK_ID = "acp-proof-hud-book";
const THREAD_ID = "acp-proof-hud-thread";
const DOCUMENT_IDS = ["acp-doc-active", "acp-doc-companion"];
const BASE_TS = Number(process.env.QA_BASE_TS || Date.now() - 60_000);
const DUMMY_PDF_URL =
  "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMCAvS2lkcyBbXT4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAwPj4Kc3RyZWFtCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjQgMDAwMDAgbiAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE3IDAwMDAwIG4gCnRyYWlsZXIKPDwvUm9vdCAxIDAgUiAvU2l6ZSA1Pj4Kc3RhcnR4cmVmCjE2NwolJUVPRg==";
const defaultChromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cdpVersionAvailable() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureCdpBrowser() {
  if (await cdpVersionAvailable()) return null;
  const executablePath =
    process.env.CHROME_EXECUTABLE || defaultChromeExecutable;
  const launchOptions = {
    headless: true,
    args: [`--remote-debugging-port=${port}`],
  };
  try {
    await fs.access(executablePath);
    launchOptions.executablePath = executablePath;
  } catch {
    // Fall back to Playwright's bundled browser if the system Chrome path is unavailable.
  }
  const browser = await chromium.launch(launchOptions);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await cdpVersionAvailable()) return browser;
    await sleep(250);
  }
  await browser.close();
  throw new Error(`Unable to start Chromium CDP server on ${port}.`);
}

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
  const bodyText = await evaluate(
    cdp,
    "document.body?.innerText?.slice(0, 800) || ''",
  ).catch(() => "");
  throw new Error(
    `Timed out waiting for ${expression}. Body starts: ${JSON.stringify(bodyText)}`,
  );
}

const injectedSetupScript = () => `
  localStorage.setItem("access_mode", "admin");
  localStorage.setItem("openrouter_api_key", "hud-openrouter-key");
  localStorage.setItem("deepgram_api_key", "hud-deepgram-key");
  localStorage.setItem("learning-ai-store", JSON.stringify({
    state: {
      activeView: "study",
      accessMode: "admin",
      activeProject: "ACP Proof HUD Book",
      activeLearningBookId: ${JSON.stringify(BOOK_ID)},
      activeDocumentId: ${JSON.stringify(DOCUMENT_IDS[0])},
      activeBetaProofAttemptId: ${JSON.stringify(PROOF_ATTEMPT_ID)},
      pdfUrl: ${JSON.stringify(DUMMY_PDF_URL)},
      pdfPage: 1,
      pdfTotalPages: 1,
      language: "en"
    },
    version: 0
  }));
`;

async function seedBookRows(cdp) {
  const rows = {
    learningBooks: [
      {
        id: BOOK_ID,
        sessionId: PROOF_ATTEMPT_ID,
        title: "ACP Proof HUD Book",
        userName: "Beta QA",
        source: "local_beta_qa",
        overview: "Local proof HUD QA book.",
        summary: "Local proof HUD QA book.",
        knowledgeSummary: "Local proof HUD QA book.",
        chapters: [],
        conceptIds: [],
        conversationCount: 1,
        createdAt: BASE_TS,
        updatedAt: BASE_TS + 20,
        lastConversationId: THREAD_ID,
        activeDocumentId: DOCUMENT_IDS[0],
        documentIds: DOCUMENT_IDS,
        agentModel: "openai/gpt-4.1-mini",
      },
    ],
    learningDocuments: DOCUMENT_IDS.map((id, index) => ({
      id,
      bookId: BOOK_ID,
      title: index === 0 ? "Active PDF" : "Companion PDF",
      mimeType: "application/pdf",
      size: 1024 + index,
      extractedText: "Proof HUD QA source text.",
      processingStatus: "ready",
      createdAt: BASE_TS,
      updatedAt: BASE_TS + index,
      totalPages: 3,
    })),
    bookChatThreads: [
      {
        id: THREAD_ID,
        bookId: BOOK_ID,
        bookTitle: "ACP Proof HUD Book",
        title: "ACP proof HUD thread",
        messages: [],
        createdAt: BASE_TS,
        updatedAt: BASE_TS + 20,
      },
    ],
  };

  await evaluate(
    cdp,
    `(${async (seedRows) => {
      const openRequest = indexedDB.open("NeuralNestBrain");
      const db = await new Promise((resolve, reject) => {
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => resolve(openRequest.result);
      });
      const storeNames = Object.keys(seedRows);
      const tx = db.transaction(storeNames, "readwrite");
      await Promise.all(
        storeNames.flatMap((storeName) =>
          seedRows[storeName].map(
            (row) =>
              new Promise((resolve, reject) => {
                const store = tx.objectStore(storeName);
                const deleteRequest = store.delete(row.id);
                deleteRequest.onerror = () => reject(deleteRequest.error);
                deleteRequest.onsuccess = () => {
                  const putRequest = store.put(row);
                  putRequest.onerror = () => reject(putRequest.error);
                  putRequest.onsuccess = () => resolve();
                };
              }),
          ),
        ),
      );
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
      return true;
    }})(${JSON.stringify(rows)})`,
  );
}

async function openStudy(metrics) {
  const target = await createTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", metrics);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: injectedSetupScript(),
  });
  await cdp.send("Page.navigate", { url: appUrl });
  await waitFor(cdp, "document.body.innerText.includes('Tutor')");
  await seedBookRows(cdp);
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(
    cdp,
    "document.body.innerText.toLowerCase().includes('live proof capture')",
  );
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
  const actionableLogs = consoleLogs.filter(
    (entry) => !String(entry.text || "").startsWith("[vite] connecting"),
  );
  if (actionableLogs.length) {
    throw new Error(`${label} console logs: ${JSON.stringify(actionableLogs)}`);
  }
}

async function chatProofHudCheck(label, metrics) {
  const cdp = await openStudy(metrics);
  await sleep(400);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const lower = text.toLowerCase();
      return {
        surface: "chat",
        label: ${JSON.stringify(label)},
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        hasHud: lower.includes("live proof capture"),
        hasAttempt: lower.includes(${JSON.stringify(PROOF_ATTEMPT_ID)}),
        hasBook: lower.includes("acp proof hud book"),
        hasReadyPdfs: lower.includes("ready pdfs 2"),
        hasChatCapture: lower.includes("chat capture on"),
        hasVoiceCapture: lower.includes("voice capture ready"),
        hasOpenRouterKey: lower.includes("openrouter key set"),
        hasDeepgramKey: lower.includes("deepgram key set"),
      };
    })()`,
  );
  if (
    !snapshot.hasHud ||
    !snapshot.hasAttempt ||
    !snapshot.hasBook ||
    !snapshot.hasReadyPdfs ||
    !snapshot.hasChatCapture ||
    !snapshot.hasVoiceCapture ||
    !snapshot.hasOpenRouterKey ||
    !snapshot.hasDeepgramKey
  ) {
    throw new Error(`${label} proof HUD mismatch: ${JSON.stringify(snapshot)}`);
  }
  assertNoOverflow(label, snapshot);
  await screenshot(cdp, `ACP-chat-proof-hud-${label}.png`);
  assertCleanConsole(label, cdp.consoleLogs);
  cdp.close();
  return { ...snapshot, consoleLogs: [] };
}

const launchedBrowser = await ensureCdpBrowser();

try {
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
    results.push(await chatProofHudCheck(viewport.label, viewport.metrics));
  }

  await fs.writeFile(
    `${outDir}/phase73-chat-proof-hud-qa.json`,
    JSON.stringify(results, null, 2),
  );

  console.log(JSON.stringify(results, null, 2));
} finally {
  if (launchedBrowser) {
    await launchedBrowser.close();
  }
}
