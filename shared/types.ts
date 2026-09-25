/**
 * Wire contracts shared by the server and the web client. Anything that
 * crosses HTTP, SSE or the voice WebSocket is typed here exactly once.
 */

export type Id = string;

export type Book = {
  id: Id;
  title: string;
  /** Accent colour key used by the library card ("ink" | "ember" | "paper"). */
  theme: "ink" | "ember" | "paper";
  createdAt: number;
  updatedAt: number;
  documentCount: number;
  messageCount: number;
  conceptCount: number;
  guideVersion: number;
};

export type DocumentStatus = "processing" | "ready" | "failed";

export type StudyDocument = {
  id: Id;
  bookId: Id;
  title: string;
  filename: string;
  sizeBytes: number;
  pageCount: number;
  status: DocumentStatus;
  error?: string;
  /** Pages whose text layer was empty (scanned) and needed OCR. */
  ocrPages: number;
  createdAt: number;
  lastPage: number;
};

export type Annotation = {
  id: Id;
  documentId: Id;
  page: number;
  kind: "highlight" | "underline" | "note";
  color: string;
  text: string;
  note?: string;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  createdAt: number;
};

export type SourceRef = {
  documentId: Id;
  documentTitle?: string;
  page: number;
  snippet?: string;
};

export type WebSource = {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  date?: string;
};

export type WebImage = {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  domain: string;
  width?: number;
  height?: number;
};

export type DiagramStep = {
  /** Mermaid node id to highlight (e.g. "A"). */
  node: string;
  /** One or two sentences explaining that node, spoken during the tour. */
  say: string;
};

export type Diagram = {
  id: Id;
  title: string;
  mermaid: string;
  steps: DiagramStep[];
};

export type QuizItem = {
  id: Id;
  concept: string;
  question: string;
  /** Multiple-choice options; empty means free-text answer. */
  options: string[];
  /** Index into options for MCQ; -1 for free text. */
  answerIndex: number;
  answer: string;
  explanation: string;
};

export type QuizResult = {
  quizId: Id;
  correct: boolean;
  score: number;
  feedback: string;
  mastery?: number;
};

/** Structured attachments that ride along with an assistant message. */
export type MessagePart =
  | { type: "sources"; sources: SourceRef[] }
  | { type: "web"; sources: WebSource[] }
  | { type: "images"; query: string; images: WebImage[] }
  | { type: "diagram"; diagram: Diagram }
  | { type: "quiz"; quiz: QuizItem; result?: QuizResult }
  | { type: "task"; taskId: Id; title: string; status: "running" | "done" | "failed"; summary?: string };

export type MessageRole = "user" | "assistant";
export type MessageChannel = "chat" | "voice";

export type ChatMessage = {
  id: Id;
  bookId: Id;
  role: MessageRole;
  channel: MessageChannel;
  content: string;
  parts: MessagePart[];
  createdAt: number;
  /** Assistant-only metadata. */
  model?: string;
  latencyMs?: number;
  interrupted?: boolean;
};

export type ChatRequest = {
  bookId: Id;
  message: string;
  /** What the learner is looking at right now. */
  focus?: {
    documentId?: Id;
    page?: number;
    selection?: string;
  };
  /** Use the stronger reasoning model with thinking enabled. */
  deep?: boolean;
  /** Let the tutor search the web for this turn. */
  web?: boolean;
  language?: string;
};

/** Named SSE events emitted by POST /api/chat. */
export type ChatStreamEvent =
  | { event: "start"; data: { userMessage: ChatMessage; assistantId: Id; model: string } }
  | { event: "delta"; data: { text: string } }
  | { event: "reasoning"; data: { text: string } }
  | { event: "status"; data: { label: string } }
  | { event: "part"; data: MessagePart }
  | { event: "done"; data: { message: ChatMessage } }
  | { event: "error"; data: { message: string; retryable: boolean } };

export type ConceptState = {
  id: Id;
  bookId: Id;
  name: string;
  summary: string;
  mastery: number;
  attempts: number;
  correct: number;
  lastSeenAt: number;
  dueAt: number | null;
};

export type Flashcard = {
  id: Id;
  bookId: Id;
  conceptId?: Id;
  conceptName?: string;
  front: string;
  back: string;
  dueAt: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
};

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type AnalyticsSummary = {
  generatedAt: number;
  totals: {
    studyMinutes: number;
    questions: number;
    voiceMinutes: number;
    documents: number;
    concepts: number;
    masteredConcepts: number;
    cardsDue: number;
    reviews: number;
    streakDays: number;
    averageMastery: number;
  };
  daily: Array<{ day: string; chat: number; voice: number; reviews: number; minutes: number }>;
  masteryBuckets: Array<{ label: string; count: number }>;
  concepts: ConceptState[];
  books: Array<{ id: Id; title: string; concepts: number; mastery: number; messages: number }>;
  accuracyTrend: Array<{ day: string; accuracy: number; attempts: number }>;
};

export type ServerEvent =
  | { type: "guide.updated"; bookId: Id; version: number }
  | { type: "guide.syncing"; bookId: Id }
  | { type: "document.updated"; document: StudyDocument }
  | { type: "book.updated"; book: Book };

export type HealthInfo = {
  ok: boolean;
  version: string;
  llm: { provider: string; fastModel: string; smartModel: string; visionModel: string };
  speech: { stt: boolean; tts: boolean; provider: string };
  search: { web: boolean; images: boolean; provider: string };
  accessCodeRequired: boolean;
};
