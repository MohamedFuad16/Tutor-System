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

const port = Number(process.env.CDP_PORT || 9361);
const appUrl = process.env.APP_URL || "http://127.0.0.1:3001";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";

const PROOF_ATTEMPT_ID = "acl-proof-receipt-proof";
const CHAT_REQUEST_ID = "acl-chat-proof-receipt";
const VOICE_REQUEST_ID = "acl-voice-proof-receipt";
const BOOK_ID = "acl-book-proof-receipt";
const THREAD_ID = "acl-thread-proof-receipt";
const DOCUMENT_IDS = ["acl-doc-active", "acl-doc-companion"];
const BASE_TS = Number(process.env.QA_BASE_TS || Date.now() - 60_000);
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

const scrollTextIntoView = (text) => `(() => {
  const wanted = ${JSON.stringify(text)}.toLowerCase();
  const target = Array.from(document.querySelectorAll("*"))
    .filter((element) => element !== document.body && (element.innerText || element.textContent || "").toLowerCase().includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.scrollIntoView({ block: "center", inline: "nearest" });
  return true;
})()`;

const systemActivityPayload = () => ({
  generatedAt: new Date(BASE_TS + 100).toISOString(),
  localOnly: true,
  retention: { limit: 800, strategy: "local_debug_only" },
  summary: {
    total: 1,
    byKind: { voice: 1 },
    byStatus: { completed: 1 },
    latestError: null,
    latestEventAt: BASE_TS + 10,
    retentionLimit: 800,
  },
  meters: {
    providers: { openRouter: true, deepgram: true },
    graph: { graphify: "ready" },
    tuning: {},
  },
  events: [
    {
      id: "acl-voice-provider-ready",
      timestamp: BASE_TS + 10,
      kind: "voice",
      status: "completed",
      title: "Voice provider ready",
      detail: "Deepgram realtime provider is ready for the ACL browser QA run.",
      requestId: VOICE_REQUEST_ID,
      phase: "settings",
      metadata: {
        proofAttemptId: PROOF_ATTEMPT_ID,
        mode: "voice",
        agentLayer: "voice_realtime",
        proofSource: "local_qa_seed",
        qaSeeded: true,
      },
    },
  ],
});

const injectedSetupScript = () => `
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
  const aclActivityPayload = ${JSON.stringify(systemActivityPayload())};
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const url = String(args[0]?.url || args[0] || "");
    if (url.includes("/api/debug/system-activity")) {
      return new Response(JSON.stringify(aclActivityPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return originalFetch(...args);
  };
`;

async function seedProviderRows(cdp) {
  const rows = {
    learningBooks: [
      {
        id: BOOK_ID,
        sessionId: PROOF_ATTEMPT_ID,
        title: "ACL Proof Receipt Book",
        userName: "Beta QA",
        source: "local_beta_qa",
        overview: "Local proof receipt QA book.",
        summary: "Local proof receipt QA book.",
        knowledgeSummary: "Local proof receipt QA book.",
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
      extractedText: "Provider receipt QA source text.",
      processingStatus: "ready",
      createdAt: BASE_TS,
      updatedAt: BASE_TS + index,
      totalPages: 3,
    })),
    bookChatThreads: [
      {
        id: THREAD_ID,
        bookId: BOOK_ID,
        bookTitle: "ACL Proof Receipt Book",
        title: "ACL proof receipt thread",
        messages: [],
        createdAt: BASE_TS,
        updatedAt: BASE_TS + 20,
      },
    ],
    memoryEvents: [
      {
        id: "acl-proof-attempt-started",
        timestamp: BASE_TS,
        eventType: "beta_proof_attempt_started",
        status: "completed",
        source: "admin_beta_diagnostics",
        sessionId: PROOF_ATTEMPT_ID,
        summary: "ACL proof receipt attempt started.",
        metadata: { proofAttemptId: PROOF_ATTEMPT_ID, mode: "admin" },
      },
      {
        id: "acl-chat-context",
        timestamp: BASE_TS + 1,
        eventType: "brain_context_injected",
        status: "completed",
        source: "chat_stream",
        bookId: BOOK_ID,
        summary: "ACL chat context injected.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          agentLayer: "chat_stream",
          mode: "chat",
          requestId: CHAT_REQUEST_ID,
          documentCount: 2,
          readyDocumentCount: 2,
          contextDocumentIds: DOCUMENT_IDS,
          documentIds: DOCUMENT_IDS,
          readyDocumentIds: DOCUMENT_IDS,
        },
      },
      {
        id: "acl-voice-context",
        timestamp: BASE_TS + 2,
        eventType: "brain_context_injected",
        status: "completed",
        source: "voice_realtime",
        bookId: BOOK_ID,
        summary: "ACL voice context injected.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          agentLayer: "voice_realtime",
          mode: "voice",
          requestId: VOICE_REQUEST_ID,
          documentCount: 2,
          readyDocumentCount: 2,
          contextDocumentIds: DOCUMENT_IDS,
          documentIds: DOCUMENT_IDS,
          readyDocumentIds: DOCUMENT_IDS,
        },
      },
      {
        id: "acl-chat-background",
        timestamp: BASE_TS + 3,
        eventType: "learning_book_updated",
        status: "completed",
        source: "memory_worker",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACL chat background memory row.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
          requestId: CHAT_REQUEST_ID,
          evidenceContract: "model_observation_v1",
          evidenceRole: "model_observation",
          evidenceType: "model_summary",
          evidenceVerified: false,
          verified: false,
          masteryMutationAllowed: false,
          confidenceMutationAllowed: false,
          masteryMutation: false,
          confidenceMutation: false,
        },
      },
      {
        id: "acl-voice-background",
        timestamp: BASE_TS + 4,
        eventType: "learning_book_updated",
        status: "completed",
        source: "memory_worker",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACL voice background memory row.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
          requestId: VOICE_REQUEST_ID,
          evidenceContract: "model_observation_v1",
          evidenceRole: "model_observation",
          evidenceType: "model_summary",
          evidenceVerified: false,
          verified: false,
          masteryMutationAllowed: false,
          confidenceMutationAllowed: false,
          masteryMutation: false,
          confidenceMutation: false,
        },
      },
      {
        id: "acl-chat-thread",
        timestamp: BASE_TS + 5,
        eventType: "book_chat_thread_saved",
        status: "completed",
        source: "chat_stream",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACL chat transcript saved.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          requestId: CHAT_REQUEST_ID,
          requestIds: [CHAT_REQUEST_ID],
          requestCorrelated: true,
          hasTypedChat: true,
          hasVoiceSession: false,
        },
      },
      {
        id: "acl-voice-thread",
        timestamp: BASE_TS + 6,
        eventType: "book_chat_thread_saved",
        status: "completed",
        source: "voice_realtime",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACL voice transcript saved.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          requestId: VOICE_REQUEST_ID,
          requestIds: [VOICE_REQUEST_ID],
          requestCorrelated: true,
          hasTypedChat: false,
          hasVoiceSession: true,
          voiceSessionCount: 1,
          voiceTurnCount: 2,
        },
      },
    ],
    retrievalEvents: [
      {
        id: "acl-chat-retrieval",
        timestamp: BASE_TS + 7,
        status: "completed",
        source: "chat_stream",
        querySummary: "ACL chat retrieval",
        requestId: CHAT_REQUEST_ID,
        activeBookId: BOOK_ID,
        candidateInteractionCount: 0,
        candidateConceptCount: 0,
        selectedInteractionIds: [],
        selectedConceptIds: [],
        selectedConceptNames: [],
        contextChars: 512,
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
          proofSource: "local_qa_seed",
          qaSeeded: true,
        },
      },
      {
        id: "acl-voice-retrieval",
        timestamp: BASE_TS + 8,
        status: "completed",
        source: "voice_realtime",
        querySummary: "ACL voice retrieval",
        requestId: VOICE_REQUEST_ID,
        activeBookId: BOOK_ID,
        candidateInteractionCount: 0,
        candidateConceptCount: 0,
        selectedInteractionIds: [],
        selectedConceptIds: [],
        selectedConceptNames: [],
        contextChars: 512,
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
        },
      },
    ],
    modelRuns: [
      {
        id: "acl-chat-model-completed",
        timestamp: BASE_TS + 9,
        status: "completed",
        provider: "openrouter",
        source: "chat_stream",
        requestId: CHAT_REQUEST_ID,
        requestedModel: "openai/gpt-4.1-mini",
        usedModel: "openai/gpt-4.1-mini",
        inputTokens: 200,
        outputTokens: 80,
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
        },
      },
      {
        id: "acl-voice-model-completed",
        timestamp: BASE_TS + 10,
        status: "completed",
        provider: "deepgram",
        source: "voice_agent",
        requestId: VOICE_REQUEST_ID,
        requestedModel: "Deepgram Voice Agent",
        usedModel: "Deepgram Voice Agent",
        inputTokens: 120,
        outputTokens: 60,
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
        },
      },
    ],
    toolJobs: [
      {
        id: "acl-chat-tool-job",
        timestamp: BASE_TS + 11,
        toolName: "evaluate_answer",
        status: "completed",
        requestId: CHAT_REQUEST_ID,
        source: "chat_stream",
        outputSummary: "ACL chat tool completed.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
        },
      },
      {
        id: "acl-voice-tool-job",
        timestamp: BASE_TS + 12,
        toolName: "evaluate_answer",
        status: "completed",
        requestId: VOICE_REQUEST_ID,
        source: "voice_agent",
        outputSummary: "ACL voice tool completed.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
        },
      },
    ],
    evidenceEvents: [
      {
        id: "acl-chat-evidence",
        timestamp: BASE_TS + 13,
        source: "chat_stream",
        evidenceType: "generation",
        verified: true,
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACL chat evaluated mastery evidence.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
          requestId: CHAT_REQUEST_ID,
          evidenceContract: "evaluated_answer_v1",
        },
      },
      {
        id: "acl-voice-evidence",
        timestamp: BASE_TS + 14,
        source: "voice_realtime",
        evidenceType: "generation",
        verified: true,
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACL voice evaluated mastery evidence.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
          requestId: VOICE_REQUEST_ID,
          evidenceContract: "evaluated_answer_v1",
        },
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

async function openAdmin(metrics) {
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
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  await seedProviderRows(cdp);
  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
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

async function adminProofReceiptCheck(label, metrics) {
  const cdp = await openAdmin(metrics);
  const clicked =
    (await evaluate(cdp, clickVisibleText("Beta Diagnostics"))) ||
    (await evaluate(cdp, clickVisibleText("Beta")));
  if (!clicked) {
    throw new Error(`${label} could not click Beta Diagnostics.`);
  }
  await waitFor(
    cdp,
    "document.body.innerText.toLowerCase().includes('provider-key live proof')",
  );
  await evaluate(cdp, scrollTextIntoView("Local proof receipt"));
  await sleep(400);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const lower = text.toLowerCase();
      const receiptHeading = Array.from(document.querySelectorAll("*"))
        .filter((element) => (element.innerText || element.textContent || "").toLowerCase().includes("local proof receipt"))
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
      const receiptCard = receiptHeading?.closest(".rounded-2xl") || receiptHeading;
      const receiptText = (receiptCard?.innerText || receiptCard?.textContent || "").slice(0, 1200);
      return {
        surface: "admin",
        label: ${JSON.stringify(label)},
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        receiptText,
        hasProviderProof: lower.includes("provider-key live proof"),
        hasLedgerChecks: lower.includes("ledger checks") && lower.includes("100%"),
        hasReceipt: lower.includes("local proof receipt") && lower.includes("export-ready chat and voice run summary"),
        hasSourceProofPending: lower.includes("source proof pending"),
        hasReadyReceipt: lower.includes("receipt ready") && lower.includes("not final live beta proof"),
        hasMixedSource: lower.includes("mixed") && lower.includes("seeded qa"),
        hasLocalBoundary: lower.includes("local beta receipt only") && lower.includes("not a cloud sync"),
        hasProviderCount: lower.includes("provider captures 2"),
        hasOpenRouterCapture: lower.includes("openrouter") && lower.includes("openai/gpt-4.1-mini") && lower.includes("provider model run"),
        hasDeepgramCapture: lower.includes("deepgram") && lower.includes("settings") && lower.includes("voice provider ready"),
        hasAttemptChip: lower.includes(${JSON.stringify(PROOF_ATTEMPT_ID)}),
        hasSelectedRequests: lower.includes(${JSON.stringify(CHAT_REQUEST_ID)}) && lower.includes(${JSON.stringify(VOICE_REQUEST_ID)}),
        hasReadyBundle: lower.includes("ready") && lower.includes("100%")
      };
    })()`,
  );
  if (
    !snapshot.hasProviderProof ||
    !snapshot.hasLedgerChecks ||
    !snapshot.hasReceipt ||
    !snapshot.hasSourceProofPending ||
    !snapshot.hasReadyReceipt ||
    !snapshot.hasMixedSource ||
    !snapshot.hasLocalBoundary ||
    !snapshot.hasProviderCount ||
    !snapshot.hasOpenRouterCapture ||
    !snapshot.hasDeepgramCapture ||
    !snapshot.hasAttemptChip ||
    !snapshot.hasSelectedRequests ||
    !snapshot.hasReadyBundle
  ) {
    throw new Error(
      `${label} proof receipt mismatch: ${JSON.stringify(snapshot)}`,
    );
  }
  assertNoOverflow(label, snapshot);
  await screenshot(cdp, `ACL-admin-proof-receipt-${label}.png`);
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
    results.push(
      await adminProofReceiptCheck(viewport.label, viewport.metrics),
    );
  }

  await fs.writeFile(
    `${outDir}/phase72-browser-qa.json`,
    JSON.stringify(results, null, 2),
  );

  console.log(JSON.stringify(results, null, 2));
} finally {
  if (launchedBrowser) {
    await launchedBrowser.close();
  }
}
