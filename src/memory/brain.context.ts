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
  readyDocumentIds: string[];
  contextDocumentIds: string[];
  documentCount: number;
  readyDocumentCount: number;
  unreadyDocumentCount: number;
  omittedReadyDocumentCount: number;
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

export type BrainDocumentContextOptions = {
  activeDocumentId?: string | null;
  maxDocuments?: number;
};

export type BrainDocumentContextReport = {
  context: string;
  documentIds: string[];
  readyDocumentIds: string[];
  contextDocumentIds: string[];
  documentCount: number;
  readyDocumentCount: number;
  unreadyDocumentCount: number;
  omittedReadyDocumentCount: number;
};

const compact = (value: unknown, maxLength = 500) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

export const buildBrainDocumentRetrievalHint = (
  documents: LearningDocument[] = [],
  activeDocumentId?: string | null,
  maxDocuments = 8,
) => {
  if (!documents.length) return "";
  const activeId = activeDocumentId || "";
  const orderedDocuments = [...documents].sort((a, b) =>
    a.id === activeId ? -1 : b.id === activeId ? 1 : 0,
  );
  const hintDocuments = orderedDocuments.slice(0, maxDocuments);
  const omittedDocumentCount = Math.max(
    0,
    orderedDocuments.length - hintDocuments.length,
  );
  const readyCount = documents.filter(
    (document) =>
      document.processingStatus === "ready" &&
      document.extractedText &&
      document.extractedText.trim(),
  ).length;
  const activeDocument = orderedDocuments.find(
    (document) => document.id === activeId,
  );

  return [
    "### Active Book PDF Retrieval Hint",
    `Active book PDFs: ${documents.length}`,
    `Ready extracted PDFs: ${readyCount}`,
    activeDocument
      ? `Active PDF on screen: ${compact(activeDocument.title, 140)} (${activeDocument.id})`
      : "",
    ...hintDocuments.map((document, index) =>
      [
        `PDF ${index + 1}: ${compact(document.title, 140)}`,
        `Document ID: ${document.id}`,
        document.id === activeId ? "Role: active PDF" : "Role: companion PDF",
        `Status: ${document.processingStatus || "processing"}`,
        document.classification
          ? `Classification: ${document.classification}`
          : "",
        document.extractionMode ? `Extraction: ${document.extractionMode}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    omittedDocumentCount
      ? `Additional PDFs omitted from retrieval hint: ${omittedDocumentCount}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildBrainRetrievalQuery = (
  query: string,
  documents: LearningDocument[] = [],
  activeDocumentId?: string | null,
) => {
  const baseQuery = String(query || "").trim();
  const documentHint = buildBrainDocumentRetrievalHint(
    documents,
    activeDocumentId,
  );
  return [baseQuery, documentHint].filter(Boolean).join("\n\n");
};

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
  options: BrainDocumentContextOptions = {},
) => buildBrainDocumentContextReport(documents, options).context;

export const buildBrainDocumentContextReport = (
  documents: LearningDocument[] = [],
  options: BrainDocumentContextOptions = {},
) => {
  const activeDocumentId = options.activeDocumentId || "";
  const documentIds = documents.map((document) => document.id).filter(Boolean);
  const orderedDocuments = [...documents].sort((a, b) =>
    a.id === activeDocumentId ? -1 : b.id === activeDocumentId ? 1 : 0,
  );
  const readyDocuments = orderedDocuments.filter(
    (document) =>
      document.processingStatus === "ready" &&
      document.extractedText &&
      document.extractedText.trim(),
  );
  const readyDocumentIds = readyDocuments
    .map((document) => document.id)
    .filter(Boolean);
  const contextDocuments = readyDocuments.slice(0, options.maxDocuments || 6);
  const contextDocumentIds = contextDocuments
    .map((document) => document.id)
    .filter(Boolean);
  const unreadyDocumentCount = Math.max(
    0,
    documents.length - readyDocuments.length,
  );
  const omittedReadyDocumentCount = Math.max(
    0,
    readyDocuments.length - contextDocuments.length,
  );
  if (!documents.length) {
    return {
      context: "",
      documentIds,
      readyDocumentIds,
      contextDocumentIds,
      documentCount: 0,
      readyDocumentCount: 0,
      unreadyDocumentCount: 0,
      omittedReadyDocumentCount: 0,
    };
  }

  const excerptBudget = contextDocuments.length === 1 ? 5000 : 5200;
  const perDocumentExcerptChars =
    contextDocuments.length === 0
      ? 0
      : contextDocuments.length === 1
        ? excerptBudget
        : Math.max(700, Math.floor(excerptBudget / contextDocuments.length));
  const manifestDocuments = orderedDocuments.slice(0, 12);
  const documentManifest = [
    "### Active Book Document Manifest",
    `Added PDFs in active book: ${documents.length}`,
    `Ready extracted PDFs: ${readyDocuments.length}`,
    `PDFs with excerpts in this prompt: ${contextDocuments.length}`,
    unreadyDocumentCount
      ? `PDFs without usable extracted text yet: ${unreadyDocumentCount}`
      : "",
    omittedReadyDocumentCount
      ? `Ready PDFs omitted because of prompt budget: ${omittedReadyDocumentCount}`
      : "",
    documents.length > manifestDocuments.length
      ? `Manifest includes first ${manifestDocuments.length} added PDFs; ${documents.length - manifestDocuments.length} additional PDF(s) are not listed.`
      : "",
    ...manifestDocuments.map((document, index) => {
      const isReady = readyDocumentIds.includes(document.id);
      const isIncluded = contextDocumentIds.includes(document.id);
      const role = document.id === activeDocumentId ? "active" : "companion";
      const status =
        document.processingStatus === "ready" && !isReady
          ? "ready_without_extracted_text"
          : document.processingStatus || "processing";
      return [
        `PDF ${index + 1}: ${document.title}`,
        `Document ID: ${document.id}`,
        `Role: ${role}`,
        `Status: ${status}`,
        isIncluded
          ? "Prompt context: included with excerpt"
          : isReady
            ? "Prompt context: ready but omitted by budget"
            : "Prompt context: manifest only until extraction succeeds",
        document.error ? `Error: ${compact(document.error, 180)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }),
  ]
    .filter(Boolean)
    .join("\n");

  const documentIndex = [
    `Ready documents in active book: ${readyDocuments.length}`,
    readyDocuments.length > contextDocuments.length
      ? `Context includes first ${contextDocuments.length} ready documents; ${readyDocuments.length - contextDocuments.length} additional ready document(s) are omitted from this prompt.`
      : "",
    ...contextDocuments.map((document, index) =>
      [
        `Document ${index + 1}: ${document.title}`,
        `Document ID: ${document.id}`,
        document.id === activeDocumentId ? "Role: Active document" : "",
        document.classification
          ? `Classification: ${document.classification}`
          : "",
        document.extractionMode ? `Extraction: ${document.extractionMode}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const readyExcerptContext = [
    "### Active Book Document Contexts",
    documentIndex,
    ...contextDocuments.map((document, index) => {
      const compactedText = String(document.extractedText || "").replace(
        /\s+/g,
        " ",
      );
      const excerpt = compactedText.slice(0, perDocumentExcerptChars);
      return [
        `Document ${index + 1}: ${document.title}`,
        `Document ID: ${document.id}`,
        document.id === activeDocumentId ? "Role: Active document" : "",
        document.classification
          ? `Classification: ${document.classification}`
          : "",
        document.extractionMode ? `Extraction: ${document.extractionMode}` : "",
        `Excerpt: ${excerpt}`,
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ]
    .filter(Boolean)
    .join("\n\n");

  const context = [documentManifest, readyExcerptContext]
    .filter(Boolean)
    .join("\n\n");

  return {
    context,
    documentIds,
    readyDocumentIds,
    contextDocumentIds,
    documentCount: documents.length,
    readyDocumentCount: readyDocuments.length,
    unreadyDocumentCount,
    omittedReadyDocumentCount,
  };
};

export const assembleBrainContextSections = ({
  mode,
  relatedMemoryContext,
  activeBookContext,
  documentContext,
  interactionContext,
}: {
  mode: BrainContextMode;
  relatedMemoryContext: string;
  activeBookContext: string;
  documentContext: string;
  interactionContext: string;
}) => {
  const sections =
    mode === "voice"
      ? [
          activeBookContext,
          documentContext,
          relatedMemoryContext,
          interactionContext,
        ]
      : [
          relatedMemoryContext,
          activeBookContext,
          documentContext,
          interactionContext,
        ];
  return sections.filter(Boolean).join("\n\n");
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
    documentIds: packet.documentIds,
    readyDocumentCount: packet.readyDocumentCount,
    readyDocumentIds: packet.readyDocumentIds,
    contextDocumentIds: packet.contextDocumentIds,
    unreadyDocumentCount: packet.unreadyDocumentCount,
    omittedReadyDocumentCount: packet.omittedReadyDocumentCount,
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
  const retrievalQuery = buildBrainRetrievalQuery(
    input.query,
    documents,
    activeDocumentId,
  );
  const relatedMemoryContext = await input.getRelevantContext(
    retrievalQuery,
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

  const documentReport = buildBrainDocumentContextReport(documents, {
    activeDocumentId,
  });
  const documentContext = documentReport.context;
  const interactionContext = buildTutorInteractionContext(
    createTutorInteractionSnapshot({
      ...input.interaction,
      activeBookId,
      activeBookTitle,
    }),
  );
  const rawContext = assembleBrainContextSections({
    mode: input.mode,
    relatedMemoryContext,
    activeBookContext,
    documentContext,
    interactionContext,
  });
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
    documentIds: documentReport.documentIds,
    readyDocumentIds: documentReport.readyDocumentIds,
    contextDocumentIds: documentReport.contextDocumentIds,
    documentCount: documentReport.documentCount,
    readyDocumentCount: documentReport.readyDocumentCount,
    unreadyDocumentCount: documentReport.unreadyDocumentCount,
    omittedReadyDocumentCount: documentReport.omittedReadyDocumentCount,
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
