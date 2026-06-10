import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const storeSource = readFileSync(`${repoRoot}/src/store/index.ts`, "utf8");
const memorySource = readFileSync(
  `${repoRoot}/src/memory/longterm.memory.ts`,
  "utf8",
);

test("Zustand store models every top-level Tutor page and study PDF state", () => {
  assert.match(
    storeSource,
    /export type ViewState = "study" \| "analytics" \| "revision" \| "admin";/,
  );
  assert.match(storeSource, /activeView: ViewState;/);
  assert.match(storeSource, /setActiveView: \(view: ViewState\) => void;/);

  for (const contract of [
    /pdfUrl: string \| null;/,
    /pdfScale: number;/,
    /pdfPage: number;/,
    /pdfTotalPages: number;/,
    /activeDocumentId: string \| null;/,
    /setPdfPage: \(page: number\) => void;/,
    /setActiveDocumentId: \(documentId: string \| null\) => void;/,
  ]) {
    assert.match(storeSource, contract);
  }
});

test("Zustand store covers annotation, chat, selection, and usage signals", () => {
  for (const contract of [
    /annotations: Annotation\[\];/,
    /addAnnotation: \(ann: Annotation\) => void;/,
    /removeAnnotationsForDocument: \(documentId: string\) => void;/,
    /askTutorQuery: string;/,
    /selectedTextContext: string;/,
    /messages: Message\[\];/,
    /setMessages: \(updater: Message\[\] \| \(\(prev: Message\[\]\) => Message\[\]\)\) => void;/,
    /recordChatUsage: \(usage: Partial<ChatUsage>\) => void;/,
    /recordVoiceUsage: \(usage: Partial<VoiceUsage>\) => void;/,
    /recordWebUsage: \(usage: Partial<WebUsage>\) => void;/,
    /recordWebSearchEvent:/,
    /recordVoiceAgentEvent:/,
  ]) {
    assert.match(storeSource, contract);
  }
});

test("Zustand persistence protects chat messages and beta proof approvals", () => {
  assert.match(storeSource, /name: "learning-ai-store"/);
  assert.match(
    storeSource,
    /const \{ messages: _messages, \.\.\.safePersistedState \} = persistedState;/,
  );
  assert.match(storeSource, /messages: current\.messages/);
  assert.match(
    storeSource,
    /activeLearningBookId: state\.activeLearningBookId/,
  );
  assert.match(storeSource, /activeDocumentId: state\.activeDocumentId/);
  assert.match(
    storeSource,
    /activeBetaProofAttemptId: state\.activeBetaProofAttemptId/,
  );

  assert.match(storeSource, /const approvalStillMatches =/);
  assert.match(storeSource, /currentApproval\?\.attemptId === cleanAttemptId/);
  assert.match(
    storeSource,
    /localStorage\.removeItem\(BETA_PROOF_TRAFFIC_APPROVAL_STORAGE_KEY\)/,
  );
});

test("Dexie schema exposes learner data tables needed by architecture tests", () => {
  for (const declaration of [
    /concepts!: Table<PersistentConcept, string>;/,
    /flashcards!: Table<Flashcard, string>;/,
    /traceLogs!: Table<TraceLog, string>;/,
    /learningBooks!: Table<LearningBook, string>;/,
    /learningDocuments!: Table<LearningDocument, string>;/,
    /bookChatThreads!: Table<BookChatThread, string>;/,
    /evidenceEvents!: Table<EvidenceEvent, string>;/,
    /masteryDeltas!: Table<MasteryDelta, string>;/,
    /memoryEvents!: Table<MemoryEvent, string>;/,
    /retrievalEvents!: Table<RetrievalEvent, string>;/,
    /correctionEvents!: Table<CorrectionEvent, string>;/,
    /artifactRecords!: Table<ArtifactRecord, string>;/,
    /citationStates!: Table<CitationState, string>;/,
    /toolJobs!: Table<ToolJob, string>;/,
    /backgroundJobs!: Table<BackgroundJob, string>;/,
    /modelRuns!: Table<ModelRun, string>;/,
  ]) {
    assert.match(memorySource, declaration);
  }
});

test("Dexie latest migration indexes critical learning, event, and trace stores", () => {
  const version16 = memorySource.match(
    /this\.version\(16\)\.stores\(\{([\s\S]*?)\n    \}\);/,
  );
  assert.ok(version16, "Expected latest Dexie version 16 stores block.");
  const stores = version16[1];

  for (const table of [
    "concepts",
    "flashcards",
    "traceLogs",
    "learningBooks",
    "learningBookConcepts",
    "learningDocuments",
    "bookChatThreads",
    "evidenceEvents",
    "masteryDeltas",
    "memoryEvents",
    "retrievalEvents",
    "correctionEvents",
    "artifactRecords",
    "citationStates",
    "toolJobs",
    "backgroundJobs",
    "modelRuns",
  ]) {
    assert.match(stores, new RegExp(`${table}:`));
  }

  assert.match(
    stores,
    /concepts:\s+"id, userId, name, p_learn, lastReviewedAt"/,
  );
  assert.match(
    stores,
    /interactions:\s+"id, userId, sessionId, bookId, conversationId, timestamp"/,
  );
  assert.match(
    stores,
    /learningBooks:\s+"id, userId, sessionId, title, userName, source, activeDocumentId, updatedAt"/,
  );
  assert.match(
    stores,
    /learningEntries:\s+"id, userId, bookId, conversationId, timestamp, userName"/,
  );
  assert.match(
    stores,
    /learningDocuments:\s+"id, userId, bookId, title, mimeType, updatedAt, createdAt"/,
  );
  assert.match(
    stores,
    /evidenceEvents:\s+"id, userId, timestamp, conceptId, bookId, conversationId, evidenceType, verified"/,
  );
  assert.match(
    stores,
    /masteryDeltas:\s+"id, userId, timestamp, conceptId, evidenceEventId, evidenceType, verified"/,
  );
  assert.match(stores, /traceLogs: "id, timestamp, action"/);
  assert.match(
    stores,
    /backgroundJobs:\s+"id, userId, timestamp, jobName, status, requestId, nextRunAt"/,
  );
});
