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

async function seedFreshProof(cdp) {
  return evaluate(
    cdp,
    `new Promise((resolve, reject) => {
      const open = indexedDB.open("NeuralNestBrain");
      open.onerror = () => reject(open.error || new Error("open failed"));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(["memoryEvents", "retrievalEvents", "modelRuns", "toolJobs", "evidenceEvents"], "readwrite");
        const timestamp = Date.now() - 30000;
        const docs = ["qa-attempt-active", "qa-attempt-companion"];
        const proofAttemptId = "qa-proof-attempt";
        const contextMetadata = (agentLayer, requestId, mode) => ({
          agentLayer,
          mode,
          requestId,
          proofAttemptId,
          bookId: "qa-attempt-book",
          activeBookId: "qa-attempt-book",
          conversationId: "thread:qa-attempt-book",
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
          proofAttemptId,
          evidenceContract: "model_observation_v1",
          evidenceRole: "model_observation",
          evidenceType: "model_summary",
          evidenceVerified: false,
          masteryMutationAllowed: false,
          confidenceMutationAllowed: false
        });
        const memoryEvents = [
          {
            id: "qa-attempt-memory-context-chat",
            timestamp: timestamp + 1,
            eventType: "brain_context_injected",
            status: "completed",
            source: "chat_stream",
            bookId: "qa-attempt-book",
            conversationId: "thread:qa-attempt-book",
            summary: "QA proof attempt typed chat context",
            metadata: contextMetadata("chat_stream", "qa-attempt-chat", "chat")
          },
          {
            id: "qa-attempt-memory-context-voice",
            timestamp: timestamp + 2,
            eventType: "brain_context_injected",
            status: "completed",
            source: "voice_realtime",
            bookId: "qa-attempt-book",
            conversationId: "thread:qa-attempt-book",
            summary: "QA proof attempt live voice context",
            metadata: contextMetadata("voice_realtime", "qa-attempt-voice", "voice")
          },
          {
            id: "qa-attempt-thread-chat",
            timestamp: timestamp + 3,
            eventType: "book_chat_thread_saved",
            status: "completed",
            source: "chat_stream",
            bookId: "qa-attempt-book",
            conversationId: "thread:qa-attempt-book",
            summary: "QA proof attempt typed chat transcript",
            metadata: {
              mode: "chat",
              requestId: "qa-attempt-chat",
              proofAttemptId,
              requestIds: ["qa-attempt-chat"],
              requestCorrelated: true,
              hasTypedChat: true,
              hasVoiceSession: false
            }
          },
          {
            id: "qa-attempt-thread-voice",
            timestamp: timestamp + 4,
            eventType: "book_chat_thread_saved",
            status: "completed",
            source: "voice_realtime",
            bookId: "qa-attempt-book",
            conversationId: "thread:qa-attempt-book",
            summary: "QA proof attempt voice transcript",
            metadata: {
              mode: "voice",
              requestId: "qa-attempt-voice",
              proofAttemptId,
              requestIds: ["qa-attempt-voice"],
              requestCorrelated: true,
              hasTypedChat: false,
              hasVoiceSession: true,
              voiceSessionCount: 1,
              voiceTurnCount: 2
            }
          },
          {
            id: "qa-attempt-background-chat",
            timestamp: timestamp + 5,
            eventType: "learning_book_updated",
            status: "completed",
            source: "chat_stream",
            bookId: "qa-attempt-book",
            conversationId: "thread:qa-attempt-book",
            summary: "QA proof attempt chat memory worker",
            metadata: gateMetadata("chat_stream", "qa-attempt-chat", "chat")
          },
          {
            id: "qa-attempt-background-voice",
            timestamp: timestamp + 6,
            eventType: "learning_book_updated",
            status: "completed",
            source: "voice_realtime",
            bookId: "qa-attempt-book",
            conversationId: "thread:qa-attempt-book",
            summary: "QA proof attempt voice memory worker",
            metadata: gateMetadata("voice_realtime", "qa-attempt-voice", "voice")
          }
        ];
        const retrievalEvents = [
          {
            id: "qa-attempt-retrieval-chat",
            timestamp: timestamp + 7,
            status: "completed",
            source: "chat_stream",
            querySummary: "QA proof attempt typed chat retrieval",
            requestId: "qa-attempt-chat",
            activeBookId: "qa-attempt-book",
            candidateInteractionCount: 1,
            candidateConceptCount: 1,
            selectedInteractionIds: [],
            selectedConceptIds: [],
            selectedConceptNames: [],
            contextChars: 120,
            metadata: { requestId: "qa-attempt-chat", proofAttemptId, mode: "chat" }
          },
          {
            id: "qa-attempt-retrieval-voice",
            timestamp: timestamp + 8,
            status: "completed",
            source: "voice_agent",
            querySummary: "QA proof attempt voice retrieval",
            requestId: "qa-attempt-voice",
            activeBookId: "qa-attempt-book",
            candidateInteractionCount: 1,
            candidateConceptCount: 1,
            selectedInteractionIds: [],
            selectedConceptIds: [],
            selectedConceptNames: [],
            contextChars: 120,
            metadata: { requestId: "qa-attempt-voice", proofAttemptId, mode: "voice" }
          }
        ];
        const modelRuns = [
          {
            id: "qa-attempt-model-chat",
            timestamp: timestamp + 9,
            status: "completed",
            provider: "qa",
            source: "chat_stream",
            requestId: "qa-attempt-chat",
            requestedModel: "qa-chat",
            usedModel: "qa-chat",
            estimated: true,
            metadata: { requestId: "qa-attempt-chat", proofAttemptId, mode: "chat" }
          },
          {
            id: "qa-attempt-model-voice",
            timestamp: timestamp + 10,
            status: "completed",
            provider: "qa",
            source: "voice_agent",
            requestId: "qa-attempt-voice",
            requestedModel: "qa-voice",
            usedModel: "qa-voice",
            estimated: true,
            metadata: { requestId: "qa-attempt-voice", proofAttemptId, mode: "voice" }
          }
        ];
        const toolJobs = [
          {
            id: "qa-attempt-tool-chat",
            timestamp: timestamp + 11,
            toolName: "evaluate_answer",
            status: "completed",
            source: "chat_stream",
            requestId: "qa-attempt-chat",
            inputSummary: "QA chat tool",
            outputSummary: "stored",
            metadata: { requestId: "qa-attempt-chat", proofAttemptId, mode: "chat" }
          },
          {
            id: "qa-attempt-tool-voice",
            timestamp: timestamp + 12,
            toolName: "evaluate_answer",
            status: "completed",
            source: "voice_agent",
            requestId: "qa-attempt-voice",
            inputSummary: "QA voice tool",
            outputSummary: "stored",
            metadata: { requestId: "qa-attempt-voice", proofAttemptId, mode: "voice" }
          }
        ];
        const evidenceEvents = [
          {
            id: "qa-attempt-evidence-chat",
            timestamp: timestamp + 13,
            evidenceType: "generation",
            verified: true,
            source: "qa",
            metadata: {
              requestId: "qa-attempt-chat",
              proofAttemptId,
              evidenceContract: "evaluated_answer_v1",
              agentLayer: "chat_stream",
              mode: "chat"
            }
          },
          {
            id: "qa-attempt-evidence-voice",
            timestamp: timestamp + 14,
            evidenceType: "generation",
            verified: true,
            source: "qa",
            metadata: {
              requestId: "qa-attempt-voice",
              proofAttemptId,
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
            proofAttemptId,
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
  const seeded = await seedFreshProof(cdp);
  await cdp.send("Page.reload");
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
    "document.body.innerText.includes('Deliberate beta-run checklist')",
  );
  await waitFor(cdp, "document.body.innerText.includes('qa-proof-attempt')");
  return { cdp, seeded };
}

async function checkDiagnostics(label, metrics) {
  const { cdp, seeded } = await openDiagnostics(metrics);
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
  await sleep(500);
  const snapshot = await evaluate(
    cdp,
    `(() => {
      const text = document.body.innerText;
      const lower = text.toLowerCase();
      return {
        label: ${JSON.stringify(label)},
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasProviderProof: lower.includes("deliberate beta-run checklist"),
        hasStartControl: lower.includes("start proof attempt"),
        hasSharedAttempt: lower.includes("qa-proof-attempt"),
        hasAttemptCheck: lower.includes("shared deliberate proof attempt"),
        hasFreshProof: lower.includes("fresh proof") || lower.includes("proof fresh"),
        hasQaChat: lower.includes("qa-attempt-chat"),
        hasQaVoice: lower.includes("qa-attempt-voice"),
        activeAttemptCleared: localStorage.getItem("active_beta_proof_attempt_id") === null,
        activeAttemptId: ${JSON.stringify(activeAttemptId)}
      };
    })()`,
  );
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
  const required = [
    "hasProviderProof",
    "hasStartControl",
    "hasSharedAttempt",
    "hasAttemptCheck",
    "hasFreshProof",
    "hasQaChat",
    "hasQaVoice",
    "activeAttemptCleared",
  ];
  const missing = required.filter((key) => !snapshot[key]);
  if (missing.length) {
    throw new Error(`${label} missing proof-attempt UI: ${missing.join(", ")}`);
  }
  await evaluate(cdp, scrollTextIntoView("Deliberate beta-run checklist"));
  await sleep(250);
  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await fs.writeFile(
    `${outDir}/ACD-admin-proof-attempt-${label}.png`,
    Buffer.from(screenshot.data, "base64"),
  );
  const result = {
    ...snapshot,
    seeded,
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
  `${outDir}/phase66-browser-qa.json`,
  JSON.stringify(payload, null, 2),
);
console.log(JSON.stringify(payload, null, 2));
