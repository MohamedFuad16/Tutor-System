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
  const wanted = ${JSON.stringify(text)};
  const candidates = Array.from(document.querySelectorAll("button,a,[role='button']"));
  const target = candidates
    .filter((element) => (element.innerText || element.textContent || "").includes(wanted))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  if (!target) return false;
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return true;
})()`;

async function seedStaleProof(cdp) {
  return evaluate(
    cdp,
    `new Promise((resolve, reject) => {
      const open = indexedDB.open("NeuralNestBrain");
      open.onerror = () => reject(open.error || new Error("open failed"));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(["memoryEvents", "retrievalEvents", "modelRuns", "toolJobs", "evidenceEvents"], "readwrite");
        const timestamp = Date.now() - (3 * 60 * 60 * 1000);
        const docs = ["qa-stale-active", "qa-stale-companion"];
        const contextMetadata = (agentLayer, requestId, mode) => ({
          agentLayer,
          mode,
          requestId,
          bookId: "qa-stale-book",
          activeBookId: "qa-stale-book",
          conversationId: "thread:qa-stale-book",
          documentCount: 2,
          readyDocumentCount: 2,
          documentIds: docs,
          readyDocumentIds: docs,
          contextDocumentIds: docs
        });
        const gateMetadata = (agentLayer, requestId, mode) => ({
          agentLayer,
          mode,
          requestId,
          evidenceContract: "model_observation_v1",
          evidenceRole: "model_observation",
          evidenceType: "model_summary",
          evidenceVerified: false,
          masteryMutationAllowed: false,
          confidenceMutationAllowed: false
        });
        const memoryEvents = [
          {
            id: "qa-stale-memory-context-chat",
            timestamp: timestamp + 1,
            eventType: "brain_context_injected",
            status: "completed",
            source: "chat_stream",
            bookId: "qa-stale-book",
            conversationId: "thread:qa-stale-book",
            summary: "QA stale typed chat context",
            metadata: contextMetadata("chat_stream", "qa-stale-chat", "chat")
          },
          {
            id: "qa-stale-memory-context-voice",
            timestamp: timestamp + 2,
            eventType: "brain_context_injected",
            status: "completed",
            source: "voice_realtime",
            bookId: "qa-stale-book",
            conversationId: "thread:qa-stale-book",
            summary: "QA stale live voice context",
            metadata: contextMetadata("voice_realtime", "qa-stale-voice", "voice")
          },
          {
            id: "qa-stale-thread-chat",
            timestamp: timestamp + 3,
            eventType: "book_chat_thread_saved",
            status: "completed",
            source: "chat_stream",
            bookId: "qa-stale-book",
            conversationId: "thread:qa-stale-book",
            summary: "QA stale typed chat transcript",
            metadata: {
              mode: "chat",
              requestId: "qa-stale-chat",
              requestIds: ["qa-stale-chat"],
              requestCorrelated: true,
              hasTypedChat: true,
              hasVoiceSession: false
            }
          },
          {
            id: "qa-stale-thread-voice",
            timestamp: timestamp + 4,
            eventType: "book_chat_thread_saved",
            status: "completed",
            source: "voice_realtime",
            bookId: "qa-stale-book",
            conversationId: "thread:qa-stale-book",
            summary: "QA stale voice transcript",
            metadata: {
              mode: "voice",
              requestId: "qa-stale-voice",
              requestIds: ["qa-stale-voice"],
              requestCorrelated: true,
              hasTypedChat: false,
              hasVoiceSession: true,
              voiceSessionCount: 1,
              voiceTurnCount: 2
            }
          },
          {
            id: "qa-stale-background-chat",
            timestamp: timestamp + 5,
            eventType: "learning_book_updated",
            status: "completed",
            source: "chat_stream",
            bookId: "qa-stale-book",
            conversationId: "thread:qa-stale-book",
            summary: "QA stale chat memory worker",
            metadata: gateMetadata("chat_stream", "qa-stale-chat", "chat")
          },
          {
            id: "qa-stale-background-voice",
            timestamp: timestamp + 6,
            eventType: "learning_book_updated",
            status: "completed",
            source: "voice_realtime",
            bookId: "qa-stale-book",
            conversationId: "thread:qa-stale-book",
            summary: "QA stale voice memory worker",
            metadata: gateMetadata("voice_realtime", "qa-stale-voice", "voice")
          }
        ];
        const retrievalEvents = [
          {
            id: "qa-stale-retrieval-chat",
            timestamp: timestamp + 7,
            status: "completed",
            source: "chat_stream",
            querySummary: "QA stale typed chat retrieval",
            requestId: "qa-stale-chat",
            activeBookId: "qa-stale-book",
            candidateInteractionCount: 1,
            candidateConceptCount: 1,
            selectedInteractionIds: [],
            selectedConceptIds: [],
            selectedConceptNames: [],
            contextChars: 120
          },
          {
            id: "qa-stale-retrieval-voice",
            timestamp: timestamp + 8,
            status: "completed",
            source: "voice_agent",
            querySummary: "QA stale voice retrieval",
            requestId: "qa-stale-voice",
            activeBookId: "qa-stale-book",
            candidateInteractionCount: 1,
            candidateConceptCount: 1,
            selectedInteractionIds: [],
            selectedConceptIds: [],
            selectedConceptNames: [],
            contextChars: 120
          }
        ];
        const modelRuns = [
          {
            id: "model-run:chat_stream:qa-stale-chat:completed:qa-model",
            timestamp: timestamp + 9,
            status: "completed",
            provider: "openrouter",
            source: "chat_stream",
            requestId: "qa-stale-chat",
            requestedModel: "qa/model",
            usedModel: "qa/model",
            estimated: true
          },
          {
            id: "model-run:voice_agent:qa-stale-voice:completed:qa-voice-model",
            timestamp: timestamp + 10,
            status: "completed",
            provider: "deepgram",
            source: "voice_agent",
            requestId: "qa-stale-voice",
            requestedModel: "qa/voice-model",
            usedModel: "qa/voice-model",
            estimated: true
          }
        ];
        const toolJobs = [
          {
            id: "tool-job:chat_stream:qa-stale-chat:evaluate_answer",
            timestamp: timestamp + 11,
            toolName: "evaluate_answer",
            status: "completed",
            requestId: "qa-stale-chat",
            source: "chat_stream"
          },
          {
            id: "tool-job:voice_agent:qa-stale-voice:evaluate_answer",
            timestamp: timestamp + 12,
            toolName: "evaluate_answer",
            status: "completed",
            requestId: "qa-stale-voice",
            source: "voice_agent"
          }
        ];
        const evidenceEvents = [
          {
            id: "qa-stale-evidence-chat",
            timestamp: timestamp + 13,
            source: "chat_stream",
            evidenceType: "generation",
            verified: true,
            summary: "QA stale chat evaluated answer",
            metadata: {
              requestId: "qa-stale-chat",
              evidenceContract: "evaluated_answer_v1",
              agentLayer: "chat_stream",
              mode: "chat"
            }
          },
          {
            id: "qa-stale-evidence-voice",
            timestamp: timestamp + 14,
            source: "voice_agent",
            evidenceType: "generation",
            verified: true,
            summary: "QA stale voice evaluated answer",
            metadata: {
              requestId: "qa-stale-voice",
              evidenceContract: "evaluated_answer_v1",
              agentLayer: "voice_realtime",
              mode: "voice"
            }
          }
        ];
        memoryEvents.forEach((row) => tx.objectStore("memoryEvents").put(row));
        retrievalEvents.forEach((row) => tx.objectStore("retrievalEvents").put(row));
        modelRuns.forEach((row) => tx.objectStore("modelRuns").put(row));
        toolJobs.forEach((row) => tx.objectStore("toolJobs").put(row));
        evidenceEvents.forEach((row) => tx.objectStore("evidenceEvents").put(row));
        tx.oncomplete = () => {
          db.close();
          resolve({
            memoryEvents: memoryEvents.length,
            retrievalEvents: retrievalEvents.length,
            modelRuns: modelRuns.length,
            toolJobs: toolJobs.length,
            evidenceEvents: evidenceEvents.length
          });
        };
        tx.onerror = () => reject(tx.error || new Error("transaction failed"));
      };
    })`,
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
  await seedStaleProof(cdp);
  await cdp.send("Page.reload");
  await waitFor(cdp, "document.body.innerText.includes('Admin Center')");
  const clicked = await evaluate(cdp, clickVisibleText("Beta Diagnostics"));
  if (!clicked) {
    throw new Error("Unable to click Diagnostics tab.");
  }
  await sleep(1000);
  const providerProofOpen = await evaluate(
    cdp,
    "document.body.innerText.includes('Deliberate beta-run checklist')",
  );
  if (!providerProofOpen) {
    const debug = await evaluate(
      cdp,
      `(() => ({
        textSample: document.body.innerText.slice(0, 1200),
        headings: Array.from(document.querySelectorAll("h1,h2,h3,h4")).map((node) => (node.innerText || node.textContent || "").trim()).slice(0, 20),
        buttons: Array.from(document.querySelectorAll("button"))
          .map((button) => ({
            text: (button.innerText || button.textContent || "").trim(),
            visible: Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length)
          }))
          .slice(0, 60)
      }))()`,
    );
    throw new Error(`Beta Diagnostics did not open: ${JSON.stringify(debug)}`);
  }
  await waitFor(
    cdp,
    "document.body.innerText.toLowerCase().includes('stale proof') || document.body.innerText.toLowerCase().includes('proof stale')",
  );
  return cdp;
}

async function checkDiagnostics(label, metrics) {
  const cdp = await openDiagnostics(metrics);
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
        hasProviderProof: text.includes("Deliberate beta-run checklist"),
        hasFreshnessCheck: text.includes("Fresh live proof window"),
        hasStaleProof: lower.includes("stale proof") || lower.includes("proof stale"),
        hasStaleSummary: lower.includes("latest selected proof row"),
        hasQaChat: text.includes("qa-stale-chat"),
        hasQaVoice: text.includes("qa-stale-voice"),
        hasWindowChip: lower.includes("proof window")
      };
    })()`,
  );
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
  const required = [
    "hasProviderProof",
    "hasFreshnessCheck",
    "hasStaleProof",
    "hasStaleSummary",
    "hasQaChat",
    "hasQaVoice",
    "hasWindowChip",
  ];
  const missing = required.filter((key) => !snapshot[key]);
  if (missing.length) {
    throw new Error(`${label} missing stale proof UI: ${missing.join(", ")}`);
  }
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    `${outDir}/ACC-admin-proof-freshness-${label}.png`,
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
  await checkDiagnostics("desktop", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  }),
  await checkDiagnostics("mobile", {
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
  `${outDir}/phase65-browser-qa.json`,
  JSON.stringify(payload, null, 2),
);
console.log(JSON.stringify(payload, null, 2));
