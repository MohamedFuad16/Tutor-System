import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv();

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE ||
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
);

const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";
const defaultChromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chromeExecutable =
  process.env.CHROME_EXECUTABLE ||
  (existsSync(defaultChromeExecutable) ? defaultChromeExecutable : undefined);
const runId = process.env.PROOF_RUN_ID || `adq-live-provider-${Date.now()}`;
const now = Date.now();
const BOOK_ID = `${runId}:book`;
const THREAD_ID = `thread:${BOOK_ID}`;
const DOCUMENT_IDS = [`${runId}:doc:active`, `${runId}:doc:companion`];
const CONCEPT_ID = `${BOOK_ID}:concept:instantaneous-rate`;
const resultPath = path.join(outDir, "ADQ-real-provider-proof-run.json");
const desktopScreenshotPath = path.join(
  outDir,
  "ADQ-real-provider-proof-desktop.png",
);
const mobileScreenshotPath = path.join(
  outDir,
  "ADQ-real-provider-proof-mobile.png",
);
const fakeAudioPath = path.join(outDir, "ADQ-fake-microphone.wav");

const openRouterKey = process.env.OPENROUTER_API_KEY || "";
const deepgramKey = process.env.DEEPGRAM_API_KEY || "";
const serperKey = process.env.SERPER_API_KEY || "";

if (!openRouterKey.trim()) {
  throw new Error("OPENROUTER_API_KEY is required for ADQ real provider proof.");
}
if (!deepgramKey.trim()) {
  throw new Error("DEEPGRAM_API_KEY is required for ADQ real provider proof.");
}

const DUMMY_PDF_BASE64 =
  "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMCAvS2lkcyBbXT4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAwPj4Kc3RyZWFtCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjQgMDAwMDAgbiAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE3IDAwMDAwIG4gCnRyYWlsZXIKPDwvUm9vdCAxIDAgUiAvU2l6ZSA1Pj4Kc3RhcnR4cmVmCjE2NwolJUVPRg==";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeError = (error) => ({
  name: error?.name || "Error",
  message: error?.message || String(error),
  stack: error?.stack
    ? String(error.stack)
        .replace(openRouterKey, "[OPENROUTER_API_KEY]")
        .replace(deepgramKey, "[DEEPGRAM_API_KEY]")
        .replace(serperKey, "[SERPER_API_KEY]")
        .slice(0, 4000)
    : undefined,
});

const proofMetadata = () => ({
  runId,
  bookId: BOOK_ID,
  threadId: THREAD_ID,
  documentIds: DOCUMENT_IDS,
  conceptId: CONCEPT_ID,
  appUrl,
  generatedAt: new Date().toISOString(),
  providerKeysConfigured: {
    openrouter: Boolean(openRouterKey),
    deepgram: Boolean(deepgramKey),
    serper: Boolean(serperKey),
  },
});

function setupLocalStorage(seed) {
  localStorage.setItem("access_mode", "admin");
  localStorage.setItem("openrouter_api_key", seed.openRouterKey);
  localStorage.setItem("deepgram_api_key", seed.deepgramKey);
  if (seed.serperKey) {
    localStorage.setItem("serper_api_key", seed.serperKey);
  } else {
    localStorage.removeItem("serper_api_key");
  }
  localStorage.setItem("active_project", seed.title);
  localStorage.setItem("active_learning_book_id", seed.bookId);
  localStorage.setItem("active_document_id", seed.documentIds[0]);
  localStorage.setItem("learner_name", "Beta QA");
  localStorage.setItem("ai_model", "openai/gpt-4.1-mini");
  localStorage.setItem(
    "learning-ai-store",
    JSON.stringify({
      state: {
        activeView: "admin",
        accessMode: "admin",
        activeProject: seed.title,
        activeLearningBookId: seed.bookId,
        activeDocumentId: seed.documentIds[0],
        activeBetaProofAttemptId: null,
        language: "en",
      },
      version: 0,
    }),
  );
  localStorage.removeItem("active_beta_proof_attempt_id");
  localStorage.removeItem("beta_proof_traffic_approval");
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function seedProofBookRows(page, seed) {
  const rows = {
    learningBooks: [
      {
        id: BOOK_ID,
        sessionId: `${runId}:session`,
        title: "ADQ Live Provider Proof Book",
        userName: "Beta QA",
        source: "local_provider_proof",
        overview:
          "A local beta proof book with two ready PDF contexts and one concept.",
        summary:
          "A local beta proof book used only for the approved provider proof run.",
        knowledgeSummary:
          "Derivatives measure instantaneous rate of change. The active concept id is available in the local context.",
        chapters: [
          {
            id: `${BOOK_ID}:chapter:1`,
            title: "Rates and derivatives",
            summary:
              "A compact chapter for proving book-scoped chat and voice context.",
            conceptIds: [CONCEPT_ID],
            conversationCount: 0,
            createdAt: seed.timestamp,
            updatedAt: seed.timestamp,
          },
        ],
        conceptIds: [CONCEPT_ID],
        conversationCount: 1,
        createdAt: seed.timestamp,
        updatedAt: seed.timestamp + 20,
        lastConversationId: THREAD_ID,
        activeDocumentId: DOCUMENT_IDS[0],
        documentIds: DOCUMENT_IDS,
        agentModel: "openai/gpt-4.1-mini",
      },
    ],
    learningBookConcepts: [
      {
        id: CONCEPT_ID,
        bookId: BOOK_ID,
        name: "Instantaneous Rate of Change",
        summary:
          "A derivative describes the instantaneous rate of change of a function.",
        mastery: 0.35,
        confidence: 0.8,
        parentConcepts: [],
        childConcepts: [],
        evidence: [
          `Use conceptId ${CONCEPT_ID} when evaluating active recall about derivatives.`,
        ],
        firstSeenAt: seed.timestamp,
        updatedAt: seed.timestamp,
      },
    ],
    learningDocuments: DOCUMENT_IDS.map((id, index) => ({
      id,
      bookId: BOOK_ID,
      title:
        index === 0
          ? "Derivative proof context"
          : "Companion rate-change examples",
      mimeType: "application/pdf",
      size: 1024 + index,
      blob: new Blob([base64ToUint8Array(seed.pdfBase64)], {
        type: "application/pdf",
      }),
      extractedText:
        index === 0
          ? `Provider proof document A. The active local concept id is ${CONCEPT_ID}. A derivative is the instantaneous rate of change at a point. When asked to evaluate an active-recall answer about derivatives, use conceptId ${CONCEPT_ID}.`
          : `Provider proof document B. The same active local concept id is ${CONCEPT_ID}. Rates can be composed with the chain rule, and the derivative connects local slope with function behavior. Use conceptId ${CONCEPT_ID} for evaluated-answer evidence.`,
      classification: "Native",
      extractionMode: "local_provider_proof_seed",
      processingStatus: "ready",
      createdAt: seed.timestamp + index,
      updatedAt: seed.timestamp + 10 + index,
      totalPages: 1,
      lastViewedPage: 1,
      scale: 1,
    })),
    bookChatThreads: [
      {
        id: THREAD_ID,
        bookId: BOOK_ID,
        bookTitle: "ADQ Live Provider Proof Book",
        title: "ADQ live provider proof thread",
        messages: [],
        createdAt: seed.timestamp,
        updatedAt: seed.timestamp + 20,
      },
    ],
  };

  await page.evaluate(async (seedRows) => {
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
  }, rows);
}

async function clickButtonByText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (label) =>
      [...document.querySelectorAll("button")].some(
        (button) =>
          button.getClientRects().length > 0 &&
          (button.textContent || "").includes(label),
      ),
    text,
    { timeout },
  );
  await page.evaluate((label) => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) =>
        candidate.getClientRects().length > 0 &&
        (candidate.textContent || "").includes(label),
    );
    if (!button) throw new Error(`Button ${label} not found.`);
    button.click();
  }, text);
}

async function clickButtonByTextMatch(page, patterns, timeout = 15000) {
  await page.waitForFunction(
    (labels) =>
      [...document.querySelectorAll("button")].some((button) => {
        const text = button.textContent || "";
        return (
          button.getClientRects().length > 0 &&
          labels.some((label) => text.includes(label))
        );
      }),
    patterns,
    { timeout },
  );
  await page.evaluate((labels) => {
    const button = [...document.querySelectorAll("button")].find((candidate) => {
      const text = candidate.textContent || "";
      return (
        candidate.getClientRects().length > 0 &&
        labels.some((label) => text.includes(label))
      );
    });
    if (!button) throw new Error(`Button ${labels.join(" or ")} not found.`);
    button.click();
  }, patterns);
}

async function waitForBodyText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (expected) => document.body.textContent.includes(expected),
    text,
    { timeout },
  );
}

async function fillTextarea(page, value) {
  await page.waitForSelector("textarea", { state: "visible", timeout: 15000 });
  await page.fill("textarea", value);
}

async function textareaValue(page) {
  await page.waitForSelector("textarea", { state: "visible", timeout: 15000 });
  return page.$eval("textarea", (textarea) => textarea.value);
}

async function clickSendMessage(page) {
  const selector = 'button[aria-label="Send message"]';
  await page.waitForSelector(selector, { state: "visible", timeout: 15000 });
  await page.click(selector);
}

async function readStore(page, storeName) {
  return page.evaluate(
    async (name) =>
      new Promise((resolve, reject) => {
        const openRequest = indexedDB.open("NeuralNestBrain");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          if (!db.objectStoreNames.contains(name)) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction(name, "readonly");
          const request = tx.objectStore(name).getAll();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            db.close();
            resolve(request.result || []);
          };
        };
      }),
    storeName,
  );
}

async function readDiagnostics(page, proofAttemptId) {
  return page.evaluate(
    async ({ proofAttemptId: activeProofAttemptId }) => {
      const readStoreInPage = async (storeName) =>
        new Promise((resolve, reject) => {
          const openRequest = indexedDB.open("NeuralNestBrain");
          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const db = openRequest.result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.close();
              resolve([]);
              return;
            }
            const tx = db.transaction(storeName, "readonly");
            const request = tx.objectStore(storeName).getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              db.close();
              resolve(request.result || []);
            };
          };
        });

      const [
        memoryEvents,
        retrievalEvents,
        modelRuns,
        toolJobs,
        evidenceEvents,
        masteryDeltas,
        learningBooks,
        learningDocuments,
        bookChatThreads,
      ] = await Promise.all([
        readStoreInPage("memoryEvents"),
        readStoreInPage("retrievalEvents"),
        readStoreInPage("modelRuns"),
        readStoreInPage("toolJobs"),
        readStoreInPage("evidenceEvents"),
        readStoreInPage("masteryDeltas"),
        readStoreInPage("learningBooks"),
        readStoreInPage("learningDocuments"),
        readStoreInPage("bookChatThreads"),
      ]);
      const activityResponse = await fetch("/api/debug/system-activity");
      const activity = activityResponse.ok
        ? await activityResponse.json()
        : { events: [], generatedAt: new Date().toISOString() };
      const module = await import("/src/memory/beta.diagnostics.ts");
      const ledgerInput = {
        memoryEvents,
        retrievalEvents,
        modelRuns,
        toolJobs,
        evidenceEvents,
        systemActivityEvents: activity.events || [],
      };
      const brainFlow =
        module.buildBrainFlowCoverageFromLedgers(ledgerInput);
      const coherentLiveProof =
        module.buildCoherentLiveProofFromLedgers(ledgerInput, {
          nowMs: Date.parse(activity.generatedAt) || Date.now(),
        });
      const checklist = module.buildProviderKeyProofChecklist({
        brainFlow,
        coherentLiveProof,
        providerKeys: {
          chatModelKeyConfigured: true,
          voiceRealtimeKeyConfigured: true,
        },
      });
      const proofAttemptFrom = (row) =>
        row?.metadata?.proofAttemptId ||
        row?.metadata?.studyContextMetadata?.proofAttemptId ||
        null;
      const summarizeFailedRow = (storeName, row) => ({
        storeName,
        id: row.id,
        status: row.status,
        eventType: row.eventType,
        source: row.source,
        toolName: row.toolName,
        requestId: row.requestId,
        title: row.title,
        phase: row.phase,
        proofAttemptId: proofAttemptFrom(row),
        summary: row.summary,
        error: row.error,
        detail: row.detail,
      });
      const failedRowSummaries = [
        ...memoryEvents
          .filter((row) => row.status === "failed")
          .map((row) => summarizeFailedRow("memoryEvents", row)),
        ...retrievalEvents
          .filter((row) => row.status === "failed")
          .map((row) => summarizeFailedRow("retrievalEvents", row)),
        ...modelRuns
          .filter((row) => ["blocked", "failed"].includes(row.status))
          .map((row) => summarizeFailedRow("modelRuns", row)),
        ...toolJobs
          .filter((row) => ["blocked", "failed"].includes(row.status))
          .map((row) => summarizeFailedRow("toolJobs", row)),
      ].slice(0, 12);
      const attemptRows = {
        memoryEvents: memoryEvents.filter(
          (row) => proofAttemptFrom(row) === activeProofAttemptId,
        ).length,
        retrievalEvents: retrievalEvents.filter(
          (row) => proofAttemptFrom(row) === activeProofAttemptId,
        ).length,
        modelRuns: modelRuns.filter(
          (row) => proofAttemptFrom(row) === activeProofAttemptId,
        ).length,
        toolJobs: toolJobs.filter(
          (row) => proofAttemptFrom(row) === activeProofAttemptId,
        ).length,
        evidenceEvents: evidenceEvents.filter(
          (row) => proofAttemptFrom(row) === activeProofAttemptId,
        ).length,
        systemActivityEvents: (activity.events || []).filter(
          (row) => proofAttemptFrom(row) === activeProofAttemptId,
        ).length,
      };
      const activeProviderCaptures = [
        ...modelRuns
          .filter(
            (row) =>
              row.status === "completed" &&
              proofAttemptFrom(row) === activeProofAttemptId,
          )
          .map((row) => ({
            layer: row.source === "voice_agent" ? "voice" : "chat",
            provider: row.provider,
            requestedModel: row.requestedModel,
            usedModel: row.usedModel,
            source: row.source,
            requestId: row.requestId,
          })),
        ...(activity.events || [])
          .filter(
            (row) =>
              row.status === "completed" &&
              row.title === "Voice provider ready" &&
              proofAttemptFrom(row) === activeProofAttemptId,
          )
          .map((row) => ({
            layer: "voice",
            provider: "deepgram",
            source: "system_activity",
            requestId: row.requestId,
            title: row.title,
            phase: row.phase,
          })),
      ];
      return {
        activeProofAttemptId,
        checklist: {
          status: checklist.status,
          completionPercent: checklist.completionPercent,
          proofComplete: checklist.proofComplete,
          betaProofReady: checklist.betaProofReady,
          sourceReadyForBeta: checklist.sourceReadyForBeta,
          readyChecks: checklist.readyChecks,
          totalChecks: checklist.totalChecks,
          missingChecks: checklist.missingChecks,
          summary: checklist.summary,
        },
        receipt: {
          schema: checklist.liveProofReceipt.schema,
          status: checklist.liveProofReceipt.status,
          ready: checklist.liveProofReceipt.ready,
          sourceKind: checklist.liveProofReceipt.sourceKind,
          sourceReadyForBeta:
            checklist.liveProofReceipt.sourceReadyForBeta,
          proofComplete: checklist.liveProofReceipt.proofComplete,
          providerCaptureCount:
            checklist.liveProofReceipt.providerCaptureCount,
          selectedRequestIds:
            checklist.liveProofReceipt.selectedRequestIds,
          sharedProofAttemptIds:
            checklist.liveProofReceipt.sharedProofAttemptIds,
          sharedBookIds: checklist.liveProofReceipt.sharedBookIds,
          sharedConversationIds:
            checklist.liveProofReceipt.sharedConversationIds,
          sharedDocumentIds: checklist.liveProofReceipt.sharedDocumentIds,
          chatRequestId: checklist.liveProofReceipt.chatRequestId,
          voiceRequestId: checklist.liveProofReceipt.voiceRequestId,
          warnings: checklist.liveProofReceipt.warnings,
          summary: checklist.liveProofReceipt.summary,
        },
        coherent: {
          ready: coherentLiveProof.ready,
          status: coherentLiveProof.status,
          chatRequestId: coherentLiveProof.chatRequestId,
          voiceRequestId: coherentLiveProof.voiceRequestId,
          sharedProofAttemptIds:
            coherentLiveProof.sharedProofAttemptIds,
          sharedBookIds: coherentLiveProof.sharedBookIds,
          sharedConversationIds:
            coherentLiveProof.sharedConversationIds,
          sharedDocumentIds: coherentLiveProof.sharedDocumentIds,
          missingChecks: coherentLiveProof.missingChecks,
          failedRows: coherentLiveProof.failedRows,
        },
        counts: {
          memoryEvents: memoryEvents.length,
          retrievalEvents: retrievalEvents.length,
          modelRuns: modelRuns.length,
          toolJobs: toolJobs.length,
          evidenceEvents: evidenceEvents.length,
          masteryDeltas: masteryDeltas.length,
          learningBooks: learningBooks.length,
          learningDocuments: learningDocuments.length,
          bookChatThreads: bookChatThreads.length,
          systemActivityEvents: (activity.events || []).length,
        },
        attemptRows,
        activeProviderCaptures,
        failedRowSummaries,
        generatedAt: activity.generatedAt || new Date().toISOString(),
      };
    },
    { proofAttemptId },
  );
}

async function waitUntil(label, callback, timeoutMs = 120000, intervalMs = 1000) {
  const startedAt = Date.now();
  let lastValue;
  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await callback();
    if (lastValue) return lastValue;
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out. Last value: ${JSON.stringify(lastValue)}`);
}

async function waitForCompletedChatProviderRun(page, proofAttemptId) {
  return waitUntil(
    "completed OpenRouter chat model run",
    async () => {
      const rows = await readStore(page, "modelRuns");
      return rows
        .filter(
          (row) =>
            row.status === "completed" &&
            row.source === "chat_stream" &&
            row.provider === "openrouter" &&
            row.metadata?.proofAttemptId === proofAttemptId,
        )
        .map((row) => ({
          requestId: row.requestId,
          requestedModel: row.requestedModel,
          usedModel: row.usedModel,
          provider: row.provider,
          source: row.source,
        }))[0];
    },
    180000,
  );
}

async function waitForVoiceProviderReady(page, proofAttemptId) {
  return waitUntil(
    "Deepgram Voice provider ready",
    async () => {
      const response = await page.request.get(
        `${appUrl.replace(/\/$/, "")}/api/debug/system-activity`,
      );
      if (!response.ok()) return null;
      const payload = await response.json();
      return (payload.events || [])
        .filter(
          (event) =>
            event.title === "Voice provider ready" &&
            event.status === "completed" &&
            event.metadata?.proofAttemptId === proofAttemptId,
        )
        .map((event) => ({
          requestId: event.requestId,
          title: event.title,
          status: event.status,
          phase: event.phase,
        }))[0];
    },
    120000,
  );
}

async function waitForAttemptRows(page, proofAttemptId, layer, minimums) {
  return waitUntil(
    `${layer} ledger rows`,
    async () => {
      const [toolJobs, evidenceEvents, memoryEvents, retrievalEvents] =
        await Promise.all([
          readStore(page, "toolJobs"),
          readStore(page, "evidenceEvents"),
          readStore(page, "memoryEvents"),
          readStore(page, "retrievalEvents"),
        ]);
      const byAttempt = (row) => row.metadata?.proofAttemptId === proofAttemptId;
      const byLayer = (row) =>
        row.metadata?.agentLayer === layer ||
        row.metadata?.mode === (layer === "voice_realtime" ? "voice" : "chat") ||
        row.source === (layer === "voice_realtime" ? "voice_agent" : "chat_stream");
      const snapshot = {
        toolJobs: toolJobs.filter(
          (row) =>
            row.status === "completed" && byAttempt(row) && byLayer(row),
        ).length,
        evidenceEvents: evidenceEvents.filter(
          (row) => row.verified && byAttempt(row) && byLayer(row),
        ).length,
        memoryEvents: memoryEvents.filter(
          (row) =>
            row.status === "completed" && byAttempt(row) && byLayer(row),
        ).length,
        retrievalEvents: retrievalEvents.filter(
          (row) =>
            row.status === "completed" && byAttempt(row) && byLayer(row),
        ).length,
      };
      return Object.entries(minimums).every(
        ([key, value]) => snapshot[key] >= value,
      )
        ? snapshot
        : null;
    },
    180000,
    1500,
  );
}

async function waitForModelObservationGateRows(page) {
  return waitUntil(
    "model observation gate rows",
    async () => {
      const rows = await readStore(page, "memoryEvents");
      const observationEvents = new Set([
        "learning_book_updated",
        "learning_concept_updated",
        "graph_concept_updated",
      ]);
      const backgroundRows = rows.filter(
        (row) =>
          row.status === "completed" && observationEvents.has(row.eventType),
      );
      const hasGate = (metadata = {}) =>
        metadata.evidenceContract === "model_observation_v1" &&
        metadata.evidenceRole === "model_observation" &&
        metadata.evidenceType === "model_summary" &&
        metadata.evidenceVerified === false &&
        metadata.masteryMutationAllowed === false &&
        metadata.confidenceMutationAllowed === false;
      const gatedRows = backgroundRows.filter((row) => hasGate(row.metadata));
      const ungatedRows = backgroundRows.filter((row) => !hasGate(row.metadata));
      const snapshot = {
        gatedRows: gatedRows.length,
        ungatedRows: ungatedRows.length,
        eventTypes: [...new Set(gatedRows.map((row) => row.eventType))],
      };
      return gatedRows.length > 0 && ungatedRows.length === 0
        ? snapshot
        : null;
    },
    120000,
    2000,
  );
}

async function writeFakeMicrophoneWav(filePath) {
  const sampleRate = 48000;
  const seconds = 8;
  const sampleCount = sampleRate * seconds;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / sampleRate;
    const amplitude = Math.sin(2 * Math.PI * 440 * t) * 0.18;
    buffer.writeInt16LE(Math.round(amplitude * 32767), 44 + index * 2);
  }
  await fs.writeFile(filePath, buffer);
}

async function navigateToBetaDiagnostics(page) {
  const alreadyInAdmin = await page.evaluate(() =>
    (document.body.textContent || "").includes("Admin Center"),
  );
  if (!alreadyInAdmin) {
    await clickButtonByText(page, "Admin");
  }
  await waitForBodyText(page, "Beta Diagnostics");
  await clickButtonByText(page, "Beta Diagnostics");
  await waitForBodyText(page, "Exact local prompts for chat and voice");
}

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  await writeFakeMicrophoneWav(fakeAudioPath);
  const consoleLogs = [];
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "0",
    executablePath: chromeExecutable,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${path.resolve(fakeAudioPath)}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  await context.grantPermissions(["microphone"], {
    origin: new URL(appUrl).origin,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      const text = message
        .text()
        .replace(openRouterKey, "[OPENROUTER_API_KEY]")
        .replace(deepgramKey, "[DEEPGRAM_API_KEY]")
        .replace(serperKey, "[SERPER_API_KEY]");
      consoleLogs.push({ type: message.type(), text });
    }
  });
  page.on("pageerror", (error) => {
    consoleLogs.push({ type: "pageerror", text: error.message });
  });

  const seed = {
    title: "ADQ Live Provider Proof Book",
    bookId: BOOK_ID,
    documentIds: DOCUMENT_IDS,
    timestamp: now,
    openRouterKey,
    deepgramKey,
    serperKey,
    pdfBase64: DUMMY_PDF_BASE64,
  };

  try {
    await page.addInitScript(setupLocalStorage, seed);
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await waitForBodyText(page, "Admin");
    await page.evaluate(setupLocalStorage, seed);
    await seedProofBookRows(page, seed);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForBodyText(page, "Admin");
    await navigateToBetaDiagnostics(page);

    await clickButtonByTextMatch(page, [
      "Start proof attempt",
      "Restart proof attempt",
    ]);
    const proofAttemptId = await page.waitForFunction(
      () => localStorage.getItem("active_beta_proof_attempt_id") || "",
      undefined,
      { timeout: 15000 },
    );
    const activeProofAttemptId = await proofAttemptId.jsonValue();
    if (!activeProofAttemptId) {
      throw new Error("No active proof attempt was created.");
    }

    await clickButtonByText(page, "Approve provider traffic");
    await waitForBodyText(page, "traffic approved");
    await waitForBodyText(page, "approval event");

    await clickButtonByText(page, "Load in chat");
    await waitForBodyText(page, "Tutor");
    const loadedChatPrompt = await textareaValue(page);
    const chatPrompt = `${loadedChatPrompt}

For this approved real provider proof, use exactly this existing local conceptId: ${CONCEPT_ID}. Before the final answer, call evaluate_answer with conceptId ${CONCEPT_ID}, question Explain what a derivative measures, learnerAnswer A derivative is the instantaneous rate of change at a point and connects local slope to function behavior, correct true, score 1, maxScore 1, evidenceType generation. Keep the final answer short.`;
    await fillTextarea(page, chatPrompt);
    await clickSendMessage(page);
    const chatProviderRun = await waitForCompletedChatProviderRun(
      page,
      activeProofAttemptId,
    );
    const chatLedgerRows = await waitForAttemptRows(
      page,
      activeProofAttemptId,
      "chat_stream",
      {
        toolJobs: 1,
        evidenceEvents: 1,
        memoryEvents: 2,
        retrievalEvents: 1,
      },
    );

    await navigateToBetaDiagnostics(page);
    await clickButtonByText(page, "Load voice script");
    await waitForBodyText(page, "Tutor");
    await textareaValue(page);
    const voicePrompt = `Provider-key voice proof turn. Live proof capture. For this approved real live voice proof, use exactly this existing local conceptId: ${CONCEPT_ID}. First call look_at_study_context for the active book context. Then call evaluate_answer with conceptId ${CONCEPT_ID}, question What does a derivative measure, learnerAnswer A derivative measures instantaneous rate of change and local slope, correct true, score 1, maxScore 1, evidenceType generation. After the evaluation, say one short sentence.`;
    await fillTextarea(page, voicePrompt);
    await clickSendMessage(page);
    const voiceProviderReady = await waitForVoiceProviderReady(
      page,
      activeProofAttemptId,
    );
    await waitForAttemptRows(page, activeProofAttemptId, "voice_realtime", {
      memoryEvents: 2,
      retrievalEvents: 1,
    });
    await waitForAttemptRows(page, activeProofAttemptId, "voice_realtime", {
      toolJobs: 1,
      evidenceEvents: 1,
      memoryEvents: 2,
      retrievalEvents: 1,
    });
    await sleep(2500);
    const activeVoiceButton = page.locator('button[aria-label="Voice input"]');
    if ((await activeVoiceButton.count()) > 0) {
      await activeVoiceButton.click();
    }
    await sleep(1500);
    const modelObservationGateRows = await waitForModelObservationGateRows(page);

    const diagnostics = await readDiagnostics(page, activeProofAttemptId);
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: mobileScreenshotPath, fullPage: false });

    const pass =
      diagnostics.checklist.betaProofReady === true &&
      diagnostics.checklist.sourceReadyForBeta === true &&
      diagnostics.receipt.sourceKind === "local_live_ledger" &&
      diagnostics.receipt.providerCaptureCount >= 2 &&
      diagnostics.receipt.sharedProofAttemptIds.includes(activeProofAttemptId) &&
      diagnostics.receipt.sharedDocumentIds.length >= 2;

    const result = {
      status: pass ? "passed" : "failed",
      ...proofMetadata(),
      activeProofAttemptId,
      chatProviderRun,
      chatLedgerRows,
      voiceProviderReady,
      modelObservationGateRows,
      diagnostics,
      screenshots: {
        desktop: desktopScreenshotPath,
        mobile: mobileScreenshotPath,
      },
      consoleLogs,
    };
    await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    if (!pass) {
      throw new Error(
        `ADQ real provider proof did not pass diagnostics: ${JSON.stringify(
          diagnostics.checklist.missingChecks,
        )}`,
      );
    }
    await browser.close();
    return result;
  } catch (error) {
    let diagnostics = null;
    try {
      const attempt =
        (await page
          .evaluate(() => localStorage.getItem("active_beta_proof_attempt_id"))
          .catch(() => null)) || "";
      diagnostics = attempt ? await readDiagnostics(page, attempt) : null;
      await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
    } catch {}
    const failure = {
      status: "failed",
      ...proofMetadata(),
      error: sanitizeError(error),
      diagnostics,
      screenshots: {
        desktop: existsSync(desktopScreenshotPath)
          ? desktopScreenshotPath
          : null,
        mobile: existsSync(mobileScreenshotPath) ? mobileScreenshotPath : null,
      },
      consoleLogs,
    };
    await fs.writeFile(resultPath, `${JSON.stringify(failure, null, 2)}\n`);
    await browser.close();
    throw error;
  }
}

run()
  .then((result) => {
    console.log(
      JSON.stringify(
        {
          status: result.status,
          runId: result.runId,
          activeProofAttemptId: result.activeProofAttemptId,
          receipt: result.diagnostics.receipt,
          screenshots: result.screenshots,
          resultPath,
        },
        null,
        2,
      ),
    );
  })
  .catch((error) => {
    console.error(
      JSON.stringify(
        { status: "failed", error: sanitizeError(error), resultPath },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  });
