import Dexie, { type Table } from "dexie";
import type { Message } from "../types";

export const GENERAL_STUDY_BOOK_ID = "book:general-study";

export interface PersistentConcept {
  id: string; // Typically lowercase string like 'monkey patching'
  name: string;
  description: string;

  // Phase 4 leftovers (migrating to Phase 5)
  mastery: number;
  confidence: number;

  // Phase 5: BKT Engine
  p_learn: number; // probability student knows it
  p_transit: number; // learning rate
  p_slip: number; // probability of slip
  p_guess: number; // probability of guess
  attempt_history: {
    correct: boolean;
    type: "recognition" | "generation" | "transfer";
    timestamp: number;
  }[];
  decay_factor: number;

  // Phase 5: Prerequisite DAG
  prerequisites: string[]; // IDs of preceding concepts

  relatedConcepts: string[];
  sourcePages: number[];
  revisionCount: number;
  lastReviewedAt: number;
  firstLearnedAt: number;
  linkedAnnotations: string[];
  embedding?: number[];
}

export interface Misconception {
  id: string;
  concept_id: string;
  description: string;
  evidence: string[];
  confidence: number; // 0 to 1
  attempts_to_resolve: number;
  resolved: boolean;
  resolution_strategy?: string;
  createdAt: number;
}

export interface SessionMemoryRecord {
  id: string; // sessionId
  startTime: number;
  endTime?: number;
  pagesVisited: number[];
  conceptsDiscussed: string[];
  solvedProblems: number;
  mistakes: string[];
  summary?: string;
  cognitive_load_level?: "low" | "optimal" | "high" | "overload";
}

export interface ConversationInteraction {
  id: string;
  sessionId: string;
  bookId?: string;
  conversationId?: string;
  documentId?: string;
  timestamp: number;
  userMessage: string;
  assistantMessage: string;
  identifiedConcepts: string[];
  userConfusionDetected: boolean;
  pageNumber?: number;
  embedding?: number[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  conceptId?: string;
  bookId?: string;
  bookTitle?: string;
  nextReviewAt: number;
}

export interface TraceLog {
  id: string;
  timestamp: number;
  action: string;
  payload: any;
  llmExplanation: string;
}

export interface LearningBook {
  id: string;
  sessionId: string;
  title: string;
  userName: string;
  source: string;
  overview: string;
  summary: string;
  knowledgeSummary: string;
  chapters: LearningChapter[];
  conceptIds: string[];
  conversationCount: number;
  createdAt: number;
  updatedAt: number;
  lastConversationId?: string;
  activeDocumentId?: string;
  documentIds?: string[];
  agentModel?: string;
}

export interface LearningChapter {
  id: string;
  title: string;
  summary: string;
  conceptIds: string[];
  conversationCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface LearningBookConcept {
  id: string;
  bookId: string;
  name: string;
  summary: string;
  mastery: number;
  confidence: number;
  parentConcepts: string[];
  childConcepts: string[];
  evidence: string[];
  firstSeenAt: number;
  updatedAt: number;
}

export interface LearningEntry {
  id: string;
  bookId: string;
  conversationId: string;
  documentId?: string;
  timestamp: number;
  userName: string;
  userMessage: string;
  assistantSummary: string;
  conversationSummary: string;
  learnedConcepts: string[];
  risks: string[];
  model: string;
  confidence: number;
}

export interface LearningDocument {
  id: string;
  bookId: string;
  title: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  extractedText?: string;
  classification?: string;
  extractionMode?: string;
  processingStatus: "ready" | "processing" | "failed";
  error?: string;
  createdAt: number;
  updatedAt: number;
  lastViewedPage?: number;
  totalPages?: number;
  scale?: number;
}

export interface BookChatThread {
  id: string;
  bookId: string;
  bookTitle: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface EvidenceEvent {
  id: string;
  timestamp: number;
  source: string;
  evidenceType: "model_summary" | "recognition" | "generation" | "transfer";
  verified: boolean;
  conceptId?: string;
  bookId?: string;
  conversationId?: string;
  sourceId?: string;
  summary: string;
  confidence?: number;
  correct?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MasteryDelta {
  id: string;
  timestamp: number;
  conceptId: string;
  evidenceEventId: string;
  evidenceType: "recognition" | "generation" | "transfer";
  verified: boolean;
  previousMastery: number;
  nextMastery: number;
  previousPLearn: number;
  nextPLearn: number;
  delta: number;
  correct: boolean;
  reason: string;
}

export interface MemoryEvent {
  id: string;
  timestamp: number;
  eventType:
    | "session_started"
    | "interaction_recorded"
    | "brain_context_injected"
    | "learning_book_updated"
    | "learning_concept_updated"
    | "graph_concept_updated"
    | "memory_error";
  status: "pending" | "completed" | "failed" | "skipped";
  source: string;
  sessionId?: string;
  bookId?: string;
  conversationId?: string;
  documentId?: string;
  conceptId?: string;
  sourceIds?: string[];
  summary: string;
  confidence?: number;
  retentionPolicy?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalEvent {
  id: string;
  timestamp: number;
  status: "completed" | "failed" | "skipped";
  source: string;
  querySummary: string;
  requestId?: string;
  activeBookId?: string;
  pageNumber?: number;
  durationMs?: number;
  candidateInteractionCount: number;
  candidateConceptCount: number;
  selectedInteractionIds: string[];
  selectedConceptIds: string[];
  selectedConceptNames: string[];
  topInteractionScore?: number;
  topConceptScore?: number;
  contextChars: number;
  tutorInstructionChars?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface CorrectionEvent {
  id: string;
  timestamp: number;
  status: "open" | "applied" | "blocked" | "dismissed";
  action: "mark_wrong" | "delete_request" | "supersede" | "review";
  targetType:
    | "memory_event"
    | "retrieval_event"
    | "evidence_event"
    | "mastery_delta"
    | "model_run"
    | "tool_job"
    | "artifact_record"
    | "citation_state"
    | "concept"
    | "interaction"
    | "learning_book"
    | "other";
  targetId: string;
  targetSummary?: string;
  reason: string;
  source: string;
  requestedBy: "admin" | "system";
  bookId?: string;
  conversationId?: string;
  conceptId?: string;
  relatedEventIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ArtifactRecord {
  id: string;
  timestamp: number;
  artifactType:
    | "source_card"
    | "chart"
    | "code"
    | "image"
    | "website"
    | "flashcards"
    | "notes"
    | "audio_overview"
    | "preview"
    | "other";
  status: "draft" | "ready" | "failed" | "stale";
  verificationState:
    | "checking"
    | "verified"
    | "unavailable"
    | "conflicting"
    | "not_checked";
  source: string;
  title: string;
  summary?: string;
  url?: string;
  domain?: string;
  sourceIds: string[];
  citationStateIds: string[];
  searchId?: string;
  toolJobId?: string;
  messageId?: string;
  conversationId?: string;
  bookId?: string;
  conceptId?: string;
  metadata?: Record<string, unknown>;
}

export interface CitationState {
  id: string;
  timestamp: number;
  state:
    | "checking"
    | "verified"
    | "unavailable"
    | "conflicting"
    | "unsupported"
    | "not_checked";
  claimId: string;
  sourceRef: string;
  artifactId?: string;
  url?: string;
  domain?: string;
  title?: string;
  verifier: string;
  checkedAt?: number;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolJob {
  id: string;
  timestamp: number;
  toolName: string;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  requestId?: string;
  model?: string;
  source?: string;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelRun {
  id: string;
  timestamp: number;
  status: "started" | "completed" | "failed" | "blocked" | "fallback";
  provider: string;
  source?: string;
  requestId?: string;
  requestedModel?: string;
  usedModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  estimated?: boolean;
  durationMs?: number;
  memoryContextChars?: number;
  sourceMaterialRequest?: boolean;
  requestedWebSearch?: boolean;
  webSources?: number;
  graphUpdates?: number;
  flashcards?: number;
  iterations?: number;
  error?: string;
  runtimeSettings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class BrainDatabase extends Dexie {
  concepts!: Table<PersistentConcept, string>;
  misconceptions!: Table<Misconception, string>;
  sessions!: Table<SessionMemoryRecord, string>;
  interactions!: Table<ConversationInteraction, string>;
  flashcards!: Table<Flashcard, string>;
  traceLogs!: Table<TraceLog, string>;
  learningBooks!: Table<LearningBook, string>;
  learningBookConcepts!: Table<LearningBookConcept, string>;
  learningEntries!: Table<LearningEntry, string>;
  learningDocuments!: Table<LearningDocument, string>;
  bookChatThreads!: Table<BookChatThread, string>;
  evidenceEvents!: Table<EvidenceEvent, string>;
  masteryDeltas!: Table<MasteryDelta, string>;
  memoryEvents!: Table<MemoryEvent, string>;
  retrievalEvents!: Table<RetrievalEvent, string>;
  correctionEvents!: Table<CorrectionEvent, string>;
  artifactRecords!: Table<ArtifactRecord, string>;
  citationStates!: Table<CitationState, string>;
  toolJobs!: Table<ToolJob, string>;
  modelRuns!: Table<ModelRun, string>;

  constructor() {
    super("NeuralNestBrain");
    this.version(4).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId",
      traceLogs: "id, timestamp, action",
    });
    this.version(5).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId",
      traceLogs: "id, timestamp, action",
      learningBooks: "id, title, userName, source, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
    });
    this.version(6).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId",
      traceLogs: "id, timestamp, action",
      learningBooks: "id, sessionId, title, userName, source, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
    });
    this.version(7).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
    });
    this.version(8).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
      evidenceEvents:
        "id, timestamp, conceptId, bookId, conversationId, evidenceType, verified",
      masteryDeltas:
        "id, timestamp, conceptId, evidenceEventId, evidenceType, verified",
      toolJobs: "id, timestamp, toolName, status, requestId",
    });
    this.version(9).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
      evidenceEvents:
        "id, timestamp, conceptId, bookId, conversationId, evidenceType, verified",
      masteryDeltas:
        "id, timestamp, conceptId, evidenceEventId, evidenceType, verified",
      toolJobs: "id, timestamp, toolName, status, requestId",
      modelRuns: "id, timestamp, status, requestId, requestedModel, usedModel",
    });
    this.version(10).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
      evidenceEvents:
        "id, timestamp, conceptId, bookId, conversationId, evidenceType, verified",
      masteryDeltas:
        "id, timestamp, conceptId, evidenceEventId, evidenceType, verified",
      memoryEvents:
        "id, timestamp, eventType, status, source, sessionId, bookId, conversationId, conceptId",
      toolJobs: "id, timestamp, toolName, status, requestId",
      modelRuns: "id, timestamp, status, requestId, requestedModel, usedModel",
    });
    this.version(11).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
      evidenceEvents:
        "id, timestamp, conceptId, bookId, conversationId, evidenceType, verified",
      masteryDeltas:
        "id, timestamp, conceptId, evidenceEventId, evidenceType, verified",
      memoryEvents:
        "id, timestamp, eventType, status, source, sessionId, bookId, conversationId, conceptId",
      retrievalEvents:
        "id, timestamp, status, source, activeBookId, pageNumber",
      toolJobs: "id, timestamp, toolName, status, requestId",
      modelRuns: "id, timestamp, status, requestId, requestedModel, usedModel",
    });
    this.version(12).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
      evidenceEvents:
        "id, timestamp, conceptId, bookId, conversationId, evidenceType, verified",
      masteryDeltas:
        "id, timestamp, conceptId, evidenceEventId, evidenceType, verified",
      memoryEvents:
        "id, timestamp, eventType, status, source, sessionId, bookId, conversationId, conceptId",
      retrievalEvents:
        "id, timestamp, status, source, activeBookId, pageNumber",
      correctionEvents:
        "id, timestamp, status, action, targetType, targetId, bookId, conceptId",
      toolJobs: "id, timestamp, toolName, status, requestId",
      modelRuns: "id, timestamp, status, requestId, requestedModel, usedModel",
    });
    this.version(13).stores({
      concepts: "id, name, p_learn, lastReviewedAt",
      misconceptions: "id, concept_id, resolved",
      sessions: "id, startTime",
      interactions: "id, sessionId, bookId, conversationId, timestamp",
      flashcards: "id, front, nextReviewAt, conceptId, bookId",
      traceLogs: "id, timestamp, action",
      learningBooks:
        "id, sessionId, title, userName, source, activeDocumentId, updatedAt",
      learningBookConcepts: "id, bookId, name, updatedAt",
      learningEntries: "id, bookId, conversationId, timestamp, userName",
      learningDocuments: "id, bookId, title, mimeType, updatedAt, createdAt",
      bookChatThreads: "id, bookId, updatedAt",
      evidenceEvents:
        "id, timestamp, conceptId, bookId, conversationId, evidenceType, verified",
      masteryDeltas:
        "id, timestamp, conceptId, evidenceEventId, evidenceType, verified",
      memoryEvents:
        "id, timestamp, eventType, status, source, sessionId, bookId, conversationId, conceptId",
      retrievalEvents:
        "id, timestamp, status, source, activeBookId, pageNumber",
      correctionEvents:
        "id, timestamp, status, action, targetType, targetId, bookId, conceptId",
      artifactRecords:
        "id, timestamp, artifactType, status, verificationState, source, searchId, toolJobId, bookId, conceptId",
      citationStates:
        "id, timestamp, state, claimId, sourceRef, artifactId, domain",
      toolJobs: "id, timestamp, toolName, status, requestId",
      modelRuns: "id, timestamp, status, requestId, requestedModel, usedModel",
    });
  }
}

export const db = new BrainDatabase();
