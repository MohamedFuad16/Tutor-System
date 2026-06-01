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
  }
}

export const db = new BrainDatabase();
