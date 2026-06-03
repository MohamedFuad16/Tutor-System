import fs from "node:fs/promises";
import WebSocket from "ws";

const port = Number(process.env.CDP_PORT || 9361);
const appUrl = process.env.APP_URL || "http://127.0.0.1:3001";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";

const PROOF_ATTEMPT_ID = "ack-provider-capture-proof";
const CHAT_REQUEST_ID = "ack-chat-provider-capture";
const VOICE_REQUEST_ID = "ack-voice-provider-capture";
const BOOK_ID = "ack-book-provider-capture";
const THREAD_ID = "ack-thread-provider-capture";
const DOCUMENT_IDS = ["ack-doc-active", "ack-doc-companion"];
const BASE_TS = Date.parse("2026-06-04T03:00:00.000Z");

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
      id: "ack-voice-provider-ready",
      timestamp: BASE_TS + 10,
      kind: "voice",
      status: "completed",
      title: "Voice provider ready",
      detail: "Deepgram realtime provider is ready for the ACK browser QA run.",
      requestId: VOICE_REQUEST_ID,
      phase: "settings",
      metadata: {
        proofAttemptId: PROOF_ATTEMPT_ID,
        mode: "voice",
        agentLayer: "voice_realtime",
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
  const ackActivityPayload = ${JSON.stringify(systemActivityPayload())};
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const url = String(args[0]?.url || args[0] || "");
    if (url.includes("/api/debug/system-activity")) {
      return new Response(JSON.stringify(ackActivityPayload), {
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
        title: "ACK Provider Capture Book",
        userName: "Beta QA",
        source: "local_beta_qa",
        overview: "Local provider capture QA book.",
        summary: "Local provider capture QA book.",
        knowledgeSummary: "Local provider capture QA book.",
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
      extractedText: "Provider capture QA source text.",
      processingStatus: "ready",
      createdAt: BASE_TS,
      updatedAt: BASE_TS + index,
      totalPages: 3,
    })),
    bookChatThreads: [
      {
        id: THREAD_ID,
        bookId: BOOK_ID,
        bookTitle: "ACK Provider Capture Book",
        title: "ACK provider capture thread",
        messages: [],
        createdAt: BASE_TS,
        updatedAt: BASE_TS + 20,
      },
    ],
    memoryEvents: [
      {
        id: "ack-proof-attempt-started",
        timestamp: BASE_TS,
        eventType: "beta_proof_attempt_started",
        status: "completed",
        source: "admin_beta_diagnostics",
        sessionId: PROOF_ATTEMPT_ID,
        summary: "ACK provider capture proof attempt started.",
        metadata: { proofAttemptId: PROOF_ATTEMPT_ID, mode: "admin" },
      },
      {
        id: "ack-chat-context",
        timestamp: BASE_TS + 1,
        eventType: "brain_context_injected",
        status: "completed",
        source: "chat_stream",
        bookId: BOOK_ID,
        summary: "ACK chat context injected.",
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
        id: "ack-voice-context",
        timestamp: BASE_TS + 2,
        eventType: "brain_context_injected",
        status: "completed",
        source: "voice_realtime",
        bookId: BOOK_ID,
        summary: "ACK voice context injected.",
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
        id: "ack-chat-background",
        timestamp: BASE_TS + 3,
        eventType: "learning_book_updated",
        status: "completed",
        source: "memory_worker",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACK chat background memory row.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
          requestId: CHAT_REQUEST_ID,
          evidenceContract: "model_observation_v1",
          verified: false,
          masteryMutation: false,
          confidenceMutation: false,
        },
      },
      {
        id: "ack-voice-background",
        timestamp: BASE_TS + 4,
        eventType: "learning_book_updated",
        status: "completed",
        source: "memory_worker",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACK voice background memory row.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
          requestId: VOICE_REQUEST_ID,
          evidenceContract: "model_observation_v1",
          verified: false,
          masteryMutation: false,
          confidenceMutation: false,
        },
      },
      {
        id: "ack-chat-thread",
        timestamp: BASE_TS + 5,
        eventType: "book_chat_thread_saved",
        status: "completed",
        source: "chat_stream",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACK chat transcript saved.",
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
        id: "ack-voice-thread",
        timestamp: BASE_TS + 6,
        eventType: "book_chat_thread_saved",
        status: "completed",
        source: "voice_realtime",
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACK voice transcript saved.",
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
        id: "ack-chat-retrieval",
        timestamp: BASE_TS + 7,
        status: "completed",
        source: "chat_stream",
        querySummary: "ACK chat retrieval",
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
        },
      },
      {
        id: "ack-voice-retrieval",
        timestamp: BASE_TS + 8,
        status: "completed",
        source: "voice_realtime",
        querySummary: "ACK voice retrieval",
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
        id: "ack-chat-model-completed",
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
        id: "ack-voice-model-completed",
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
        id: "ack-chat-tool-job",
        timestamp: BASE_TS + 11,
        toolName: "evaluate_answer",
        status: "completed",
        requestId: CHAT_REQUEST_ID,
        source: "chat_stream",
        outputSummary: "ACK chat tool completed.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
        },
      },
      {
        id: "ack-voice-tool-job",
        timestamp: BASE_TS + 12,
        toolName: "evaluate_answer",
        status: "completed",
        requestId: VOICE_REQUEST_ID,
        source: "voice_agent",
        outputSummary: "ACK voice tool completed.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "voice",
          agentLayer: "voice_realtime",
        },
      },
    ],
    evidenceEvents: [
      {
        id: "ack-chat-evidence",
        timestamp: BASE_TS + 13,
        source: "chat_stream",
        evidenceType: "generation",
        verified: true,
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACK chat evaluated mastery evidence.",
        metadata: {
          proofAttemptId: PROOF_ATTEMPT_ID,
          mode: "chat",
          agentLayer: "chat_stream",
          requestId: CHAT_REQUEST_ID,
          evidenceContract: "evaluated_answer_v1",
        },
      },
      {
        id: "ack-voice-evidence",
        timestamp: BASE_TS + 14,
        source: "voice_realtime",
        evidenceType: "generation",
        verified: true,
        bookId: BOOK_ID,
        conversationId: THREAD_ID,
        summary: "ACK voice evaluated mastery evidence.",
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

async function adminProviderCaptureCheck(label, metrics) {
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
  await evaluate(cdp, scrollTextIntoView("Provider capture"));
  await sleep(400);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const lower = text.toLowerCase();
      return {
        surface: "admin",
        label: ${JSON.stringify(label)},
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        hasProviderProof: lower.includes("provider-key live proof"),
        hasCoherentBundle: lower.includes("typed chat bundle") && lower.includes("live voice bundle"),
        hasOpenRouterCapture: lower.includes("openrouter") && lower.includes("model openai/gpt-4.1-mini") && lower.includes("provider model run"),
        hasDeepgramCapture: lower.includes("deepgram") && lower.includes("phase settings") && lower.includes("voice provider ready"),
        hasProviderCaptureCards: lower.includes("provider model run") && lower.includes("voice provider ready"),
        hasAttemptChip: lower.includes(${JSON.stringify(PROOF_ATTEMPT_ID)}),
        hasSelectedRequests: lower.includes(${JSON.stringify(CHAT_REQUEST_ID)}) && lower.includes(${JSON.stringify(VOICE_REQUEST_ID)}),
        hasReadyBundle: lower.includes("ready") && lower.includes("100%")
      };
    })()`,
  );
  if (
    !snapshot.hasProviderProof ||
    !snapshot.hasCoherentBundle ||
    !snapshot.hasOpenRouterCapture ||
    !snapshot.hasDeepgramCapture ||
    !snapshot.hasProviderCaptureCards ||
    !snapshot.hasAttemptChip ||
    !snapshot.hasSelectedRequests ||
    !snapshot.hasReadyBundle
  ) {
    throw new Error(
      `${label} provider capture mismatch: ${JSON.stringify(snapshot)}`,
    );
  }
  assertNoOverflow(label, snapshot);
  await screenshot(cdp, `ACK-admin-provider-captures-${label}.png`);
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
  results.push(
    await adminProviderCaptureCheck(viewport.label, viewport.metrics),
  );
}

await fs.writeFile(
  `${outDir}/phase71-browser-qa.json`,
  JSON.stringify(results, null, 2),
);

console.log(JSON.stringify(results, null, 2));
