import {
  buildTutorInteractionContext,
  createTutorInteractionSnapshot,
  type TutorInteractionMode,
} from "../lib/interactionModel";
import type { BrainRuntimeSettings } from "../lib/brainRuntimeSettings";
import { recordMemoryEvent, type MemoryEventInput } from "./memory.events";
import {
  db,
  type LearningBook,
  type LearningBookConcept,
  type LearningDocument,
} from "./longterm.memory";

export type BrainContextMode = "chat" | "voice";
export type BrainAgentLayer = "chat_stream" | "voice_realtime";

export type BrainContextInteractionInput = {
  mode: TutorInteractionMode;
  text: string;
  selectedTextAttached: boolean;
  webSearchSelected: boolean;
  voiceState: "idle" | "listening" | "speaking";
  sendState: "idle" | "sending" | "success";
  lastInputAt: number | null;
  lastSubmitAt: number | null;
};

export type BrainContextPacketInput = {
  requestId?: string;
  mode: BrainContextMode;
  agentLayer: BrainAgentLayer;
  query: string;
  getRelevantContext: (
    query: string,
    pageNumber?: number,
    activeBookId?: string | null,
    options?: {
      requestId?: string;
      mode?: "chat" | "voice" | "revision" | "admin";
      activeDocumentId?: string | null;
      documentCount?: number;
    },
  ) => Promise<string>;
  activeBookId?: string | null;
  activeBookTitle?: string;
  activeProject?: string;
  activeDocumentId?: string | null;
  documents?: LearningDocument[];
  runtimeSettings: Pick<BrainRuntimeSettings, "memoryConceptLimit">;
  interaction: BrainContextInteractionInput;
  maxContextChars?: number;
};

export type BrainContextPacket = {
  requestId?: string;
  mode: BrainContextMode;
  agentLayer: BrainAgentLayer;
  querySummary: string;
  activeBookId?: string;
  activeBookTitle?: string;
  activeDocumentId?: string;
  documentIds: string[];
  documentCount: number;
  context: string;
  rawContext: string;
  contextChars: number;
  rawContextChars: number;
  memoryContextChars: number;
  activeBookContextChars: number;
  documentContextChars: number;
  interactionContextChars: number;
  compacted: boolean;
};

const compact = (value: unknown, maxLength = 500) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

export const compactBrainContext = (
  context: string,
  maxLength?: number,
  mode: BrainContextMode = "chat",
) => {
  const compacted = context.replace(/\n{3,}/g, "\n\n").trim();
  if (!maxLength || compacted.length <= maxLength) return compacted;
  const suffix =
    mode === "voice"
      ? "\n\n[Local voice brain context truncated for the live prompt.]"
      : "\n\n[Local brain context truncated for this request.]";
  return `${compacted.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`;
};

export const buildBrainDocumentContext = (
  documents: LearningDocument[] = [],
) => {
  const readyDocuments = documents.filter(
    (document) =>
      document.processingStatus === "ready" &&
      document.extractedText &&
      document.extractedText.trim(),
  );
  if (!readyDocuments.length) return "";
  return [
    "### Active Book Document Contexts",
    ...readyDocuments.slice(0, 6).map((document, index) => {
      const excerpt = String(document.extractedText || "")
        .replace(/\s+/g, " ")
        .slice(0, index === 0 ? 5000 : 2600);
      return [
        `Document ${index + 1}: ${document.title}`,
        `Document ID: ${document.id}`,
        document.classification
          ? `Classification: ${document.classification}`
          : "",
        document.extractionMode ? `Extraction: ${document.extractionMode}` : "",
        `Excerpt: ${excerpt}`,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n\n");
};

export const buildActiveBookContext = (
  book?: LearningBook | null,
  concepts: LearningBookConcept[] = [],
) => {
  if (!book) return "";
  return [
    "### Active Library Book Context",
    `Book: ${book.title}`,
    `Overview: ${book.overview || "Pending"}`,
    `Knowledge Summary: ${book.knowledgeSummary || book.summary || "Pending"}`,
    `Chapters: ${
      (book.chapters || [])
        .slice(-5)
        .map((chapter) => chapter.title)
        .join(", ") || "None yet"
    }`,
    concepts.length
      ? `Mapped Concepts: ${concepts.map((concept) => `${concept.name} (${Math.round((concept.confidence || 0) * 100)}%)`).join(", ")}`
      : "Mapped Concepts: None yet",
  ].join("\n");
};

export const createBrainContextMemoryEventInput = (
  packet: BrainContextPacket,
): MemoryEventInput => ({
  eventType: "brain_context_injected",
  status: "completed",
  source: "brain_context_builder",
  bookId: packet.activeBookId,
  documentId: packet.activeDocumentId,
  sourceIds: packet.documentIds,
  summary: `${packet.mode} ${packet.agentLayer} injected ${packet.contextChars.toLocaleString()} chars of local brain context.`,
  retentionPolicy: "local_indexeddb",
  metadata: {
    requestId: packet.requestId,
    mode: packet.mode,
    agentLayer: packet.agentLayer,
    activeBookTitle: packet.activeBookTitle,
    documentCount: packet.documentCount,
    rawContextChars: packet.rawContextChars,
    memoryContextChars: packet.memoryContextChars,
    activeBookContextChars: packet.activeBookContextChars,
    documentContextChars: packet.documentContextChars,
    interactionContextChars: packet.interactionContextChars,
    compacted: packet.compacted,
    querySummary: packet.querySummary,
  },
});

export const recordBrainContextInjected = async (packet: BrainContextPacket) =>
  recordMemoryEvent(createBrainContextMemoryEventInput(packet));

export const buildBrainContextPacket = async (
  input: BrainContextPacketInput,
): Promise<BrainContextPacket> => {
  const activeBookId = input.activeBookId || undefined;
  const activeDocumentId = input.activeDocumentId || undefined;
  const documents = input.documents || [];
  const relatedMemoryContext = await input.getRelevantContext(
    input.query,
    undefined,
    activeBookId,
    {
      requestId: input.requestId,
      mode: input.mode,
      activeDocumentId,
      documentCount: documents.length,
    },
  );

  let activeBookContext = "";
  let activeBookTitle = input.activeBookTitle || input.activeProject;
  if (activeBookId) {
    const book = await db.learningBooks
      .get(activeBookId)
      .catch(() => undefined);
    if (book) {
      activeBookTitle = book.title || activeBookTitle;
      const bookConcepts = await db.learningBookConcepts
        .where("bookId")
        .equals(book.id)
        .limit(input.runtimeSettings.memoryConceptLimit)
        .toArray()
        .catch(() => []);
      activeBookContext = buildActiveBookContext(book, bookConcepts);
    }
  }

  const documentContext = buildBrainDocumentContext(documents);
  const interactionContext = buildTutorInteractionContext(
    createTutorInteractionSnapshot({
      ...input.interaction,
      activeBookId,
      activeBookTitle,
    }),
  );
  const rawContext = [
    relatedMemoryContext,
    activeBookContext,
    documentContext,
    interactionContext,
  ]
    .filter(Boolean)
    .join("\n\n");
  const context = compactBrainContext(
    rawContext,
    input.maxContextChars,
    input.mode,
  );
  const packet: BrainContextPacket = {
    requestId: input.requestId,
    mode: input.mode,
    agentLayer: input.agentLayer,
    querySummary: compact(input.query),
    activeBookId,
    activeBookTitle,
    activeDocumentId,
    documentIds: documents.map((document) => document.id).filter(Boolean),
    documentCount: documents.length,
    context,
    rawContext,
    contextChars: context.length,
    rawContextChars: rawContext.length,
    memoryContextChars: relatedMemoryContext.length,
    activeBookContextChars: activeBookContext.length,
    documentContextChars: documentContext.length,
    interactionContextChars: interactionContext.length,
    compacted: context.length < rawContext.length,
  };

  await recordBrainContextInjected(packet);
  return packet;
};
