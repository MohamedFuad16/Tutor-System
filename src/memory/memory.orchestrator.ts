import { generateEmbedding, cosineSimilarity } from "./memory.embeddings";
import {
  confidenceFromModelSummary,
  gateModelSummaryMastery,
  modelObservationGateMetadata,
} from "./evidence.mastery";
import { recordModelSummaryEvidence } from "./evidence.ledger";
import { recordMemoryEvent } from "./memory.events";
import { recordRetrievalEvent } from "./retrieval.events";
import {
  db,
  GENERAL_STUDY_BOOK_ID,
  PersistentConcept,
  ConversationInteraction,
  LearningBook,
  LearningBookConcept,
  LearningDocument,
} from "./longterm.memory";
import { recordGeneratedNotesArtifact } from "./artifact.records";

function generateId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "general-study"
  );
}

function clamp01(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function getStoredOpenRouterKey() {
  try {
    const storeKey = JSON.parse(
      localStorage.getItem("NeuralNest_Store") || "{}",
    )?.state?.apiKey;
    return storeKey || localStorage.getItem("openrouter_api_key") || "";
  } catch {
    return localStorage.getItem("openrouter_api_key") || "";
  }
}

function getStoredLearnerName() {
  try {
    const storeName = JSON.parse(
      localStorage.getItem("NeuralNest_Store") || "{}",
    )?.state?.learnerName;
    return (
      String(
        storeName || localStorage.getItem("learner_name") || "Learner",
      ).trim() || "Learner"
    );
  } catch {
    return localStorage.getItem("learner_name") || "Learner";
  }
}

export interface LearningBookUpdateInput {
  userName: string;
  activeProject: string;
  activeBookId?: string | null;
  activeDocumentId?: string | null;
  conversationId?: string;
  requestId?: string;
  mode?: "chat" | "voice" | "revision" | "admin";
  agentLayer?: "chat_stream" | "voice_realtime";
  documentContexts?: Pick<
    LearningDocument,
    "id" | "title" | "classification" | "extractionMode" | "extractedText"
  >[];
  userMessage: string;
  assistantMessage: string;
  apiKey?: string;
}

type RelevantContextOptions = {
  requestId?: string;
  mode?: "chat" | "voice" | "revision" | "admin";
  activeDocumentId?: string | null;
  documentCount?: number;
};

type MemoryTraceContext = {
  requestId?: string;
  mode?: "chat" | "voice" | "revision" | "admin";
  agentLayer?: "chat_stream" | "voice_realtime";
  bookId?: string | null;
  conversationId?: string;
  documentId?: string | null;
  toolCallId?: string;
  source?: string;
};

interface LearningAgentConcept {
  name: string;
  summary?: string;
  mastery?: number;
  confidence?: number;
  parentConcepts?: string[];
  childConcepts?: string[];
  evidence?: string[];
}

const mergeUnique = (values: string[], limit = 12) =>
  Array.from(new Set(values.filter(Boolean))).slice(0, limit);

const compactText = (value: unknown, fallback = "") => {
  const text = String(value || fallback || "").trim();
  return text.replace(/\s+/g, " ").slice(0, 1800);
};

const memoryTraceMetadata = (context?: MemoryTraceContext) => ({
  ...(context?.requestId ? { requestId: context.requestId } : {}),
  ...(context?.mode ? { mode: context.mode } : {}),
  ...(context?.agentLayer ? { agentLayer: context.agentLayer } : {}),
  ...(context?.toolCallId ? { toolCallId: context.toolCallId } : {}),
});

const stripConversationArtifacts = (value: string) =>
  compactText(value)
    .replace(/\bPrompt:\s*/gi, "")
    .replace(/\bLearning note:\s*/gi, "")
    .replace(
      /\bReview hook:\s*restate the idea in your own words, identify the key mechanism, and test it with a fresh example\.?/gi,
      "",
    )
    .trim();

const buildStudyNoteFallback = (
  userMessage: string,
  assistantMessage: string,
) => {
  const cleanUser = stripConversationArtifacts(userMessage);
  const cleanAssistant = stripConversationArtifacts(
    assistantMessage || userMessage || "The learner explored a tutor concept.",
  );
  const genericScreenQuestion =
    /\b(what\s+is\s+(this|the)\s+(page|screen)\s+about|what'?s\s+on\s+(the\s+)?screen)\b/i.test(
      cleanUser,
    );
  const focus =
    genericScreenQuestion || !cleanUser
      ? "the studied material"
      : cleanUser.length > 120
        ? `${cleanUser.slice(0, 117).trim()}...`
        : cleanUser;
  return [
    `Key idea: ${cleanAssistant}`,
    `Why it matters: This page preserves the useful learning from ${focus} so it can be revised later without replaying the whole chat.`,
    "How to review it: restate the idea, identify the mechanism, and test it with a fresh example.",
  ].join("\n\n");
};

const buildGeneratedNoteSourceSpans = (
  documentContexts: LearningBookUpdateInput["documentContexts"],
) =>
  (documentContexts || [])
    .filter((document) => String(document.extractedText || "").trim())
    .slice(0, 6)
    .map((document) => ({
      documentId: document.id,
      title: document.title,
      classification: document.classification,
      extractionMode: document.extractionMode,
      text: compactText(document.extractedText, ""),
      source: "learning_book_update_document_context",
    }));

const announceActiveLearningBook = (book: LearningBook, force = true) => {
  if (!force) {
    const storedBookId = localStorage.getItem("active_learning_book_id");
    if (storedBookId && storedBookId !== book.id) return;
  }
  localStorage.setItem("active_learning_book_id", book.id);
  localStorage.setItem("active_project", book.title);
  window.dispatchEvent(
    new CustomEvent("learning-book-updated", {
      detail: { bookId: book.id, title: book.title },
    }),
  );
};

export class MemoryOrchestrator {
  private currentSessionId: string;
  private initialization: Promise<void>;

  constructor() {
    this.currentSessionId = generateId();
    this.initialization = this.startSession();
  }

  private async startSession() {
    await db.sessions.add({
      id: this.currentSessionId,
      startTime: Date.now(),
      pagesVisited: [],
      conceptsDiscussed: [],
      solvedProblems: 0,
      mistakes: [],
    });
    const book = await this.upsertSessionLearningBook(
      getStoredLearnerName(),
      "General Study",
    );
    await recordMemoryEvent({
      eventType: "session_started",
      status: "completed",
      source: "memory_orchestrator",
      sessionId: this.currentSessionId,
      bookId: book.id,
      summary: `Started local memory session for ${book.title}.`,
      retentionPolicy: "local_indexeddb",
      metadata: {
        bookSource: book.source,
        userName: book.userName,
      },
    });
    const storedBookId = localStorage.getItem("active_learning_book_id");
    if (!storedBookId) {
      announceActiveLearningBook(book);
      return;
    }
    const storedBook = await db.learningBooks
      .get(storedBookId)
      .catch(() => undefined);
    if (!storedBook) {
      announceActiveLearningBook(book);
    }
  }

  private async resetGeneratedLearningLibraryForSession() {
    try {
      await db.learningEntries.clear();
      await db.learningBookConcepts.clear();
      await db.learningBooks.clear();
      const concepts = await db.concepts.toArray();
      await Promise.all(
        concepts
          .filter((concept) => concept.id !== "tutor-book")
          .map((concept) => db.concepts.delete(concept.id)),
      );
    } catch (error) {
      console.warn("[Memory] Learning library reset skipped:", error);
    }
  }

  private sessionBookId(userName: string) {
    return GENERAL_STUDY_BOOK_ID;
  }

  public getCurrentSessionId() {
    return this.currentSessionId;
  }

  private async upsertSessionLearningBook(
    userName = "Learner",
    title = "General Study",
  ) {
    const now = Date.now();
    const safeUserName = userName.trim() || "Learner";
    const safeTitle = title.trim() || "General Study";
    const bookId = this.sessionBookId(safeUserName);
    const existing = await db.learningBooks.get(bookId).catch(() => undefined);
    if (existing) {
      if (existing.sessionId === this.currentSessionId) return existing;
      const nextBook = { ...existing, sessionId: this.currentSessionId };
      await db.learningBooks.put(nextBook);
      return nextBook;
    }

    const book: LearningBook = {
      id: bookId,
      sessionId: this.currentSessionId,
      title: safeTitle,
      userName: safeUserName,
      source: safeTitle === "General Study" ? "chat" : "pdf",
      overview:
        "A temporary session learning book. It will rename itself when a PDF or clear study topic is detected.",
      summary: "",
      knowledgeSummary: "No tutor conversation has been added yet.",
      chapters: [],
      conceptIds: [],
      conversationCount: 0,
      createdAt: now,
      updatedAt: now,
      agentModel: "session-bootstrap",
    };
    await db.learningBooks.put(book);
    return book;
  }

  public async ensureSessionLearningBook(
    userName = "Learner",
    title = "General Study",
  ) {
    await this.initialization;
    return this.upsertSessionLearningBook(userName, title);
  }

  public async updateSessionBookTitle(
    title: string,
    userName = getStoredLearnerName(),
    source: LearningBook["source"] = "pdf",
  ) {
    await this.initialization;
    const cleanTitle =
      compactText(title, "General Study")
        .replace(/[^a-zA-Z0-9 .:;,_-]/g, "")
        .trim() || "General Study";
    const book = await this.upsertSessionLearningBook(
      userName,
      "General Study",
    );
    const nextBook: LearningBook = {
      ...book,
      title: cleanTitle,
      source,
      overview:
        book.overview &&
        !book.overview.startsWith("A temporary session learning book")
          ? book.overview
          : `A session learning book for ${cleanTitle}. Tutor conversations and extracted concepts are collected here.`,
      updatedAt: Date.now(),
    };
    await db.learningBooks.put(nextBook);
    announceActiveLearningBook(nextBook);
    return nextBook;
  }

  public async updateLearningBookTitle(
    bookId: string,
    title: string,
    userName = getStoredLearnerName(),
    source: LearningBook["source"] = "chat",
  ) {
    await this.initialization;
    const cleanTitle =
      compactText(title, "General Study")
        .replace(/[^a-zA-Z0-9 .:;,_-]/g, "")
        .trim() || "General Study";
    const existing = await db.learningBooks.get(bookId).catch(() => undefined);
    const base =
      existing ||
      (await this.upsertSessionLearningBook(userName, "General Study"));
    const nextBook: LearningBook = {
      ...base,
      id: existing ? base.id : bookId,
      title: cleanTitle,
      source: existing?.source || source,
      overview:
        base.overview &&
        !base.overview.startsWith("A temporary session learning book")
          ? base.overview
          : `A learning book for ${cleanTitle}. Tutor conversations and document notes are collected here.`,
      updatedAt: Date.now(),
    };
    await db.learningBooks.put(nextBook);
    announceActiveLearningBook(nextBook);
    return nextBook;
  }

  public async trackInteraction(
    userMessage: string,
    assistantMessage: string,
    pageNumber?: number,
    context?: {
      bookId?: string | null;
      conversationId?: string;
      documentId?: string | null;
      requestId?: string;
      mode?: "chat" | "voice" | "revision" | "admin";
      agentLayer?: "chat_stream" | "voice_realtime";
    },
  ) {
    await this.initialization;
    const interactionId = generateId();

    // Very rudimentary concept extraction from text without AI call,
    // ideally should use AI, but for performance we can extract nouns or use exact match from existing graph
    // We will leave the concept processing to a background task or rely on the AI response parsing.

    // Asynchronous background heavy processing
    setTimeout(async () => {
      let embedding: number[] | undefined;
      try {
        const combinedText = (userMessage + " " + assistantMessage).slice(
          0,
          1500,
        );
        embedding = await generateEmbedding(combinedText);
      } catch (e) {
        console.warn("Embedding generation failed", e);
      }

      const interaction: ConversationInteraction = {
        id: interactionId,
        sessionId: this.currentSessionId,
        bookId: context?.bookId || undefined,
        conversationId: context?.conversationId,
        documentId: context?.documentId || undefined,
        requestId: context?.requestId,
        mode: context?.mode,
        agentLayer: context?.agentLayer,
        timestamp: Date.now(),
        userMessage,
        assistantMessage,
        identifiedConcepts: [], // to be enriched
        userConfusionDetected:
          userMessage.toLowerCase().includes("confused") ||
          userMessage.toLowerCase().includes("dont understand") ||
          userMessage.toLowerCase().includes("not sure"),
        pageNumber,
        embedding,
      };

      await db.interactions.add(interaction);
      await recordMemoryEvent({
        eventType: "interaction_recorded",
        status: "completed",
        source: "memory_orchestrator",
        sessionId: this.currentSessionId,
        bookId: interaction.bookId,
        conversationId: interaction.conversationId,
        documentId: interaction.documentId,
        summary: compactText(
          userMessage || assistantMessage,
          "Conversation interaction recorded.",
        ),
        retentionPolicy: "local_indexeddb",
        metadata: {
          ...memoryTraceMetadata(context),
          assistantChars: assistantMessage.length,
          hasEmbedding: Boolean(embedding?.length),
          pageNumber,
          userChars: userMessage.length,
          userConfusionDetected: interaction.userConfusionDetected,
        },
      });

      // Log the conversation action to trace backend
      await this.logTrace("Conversation Interaction", {
        userMessage,
        assistantMessageSnippet: assistantMessage.slice(0, 100) + "...",
        confusionDetected: interaction.userConfusionDetected,
      });
    }, 0);
  }

  public async updateLearningBookFromConversation(
    input: LearningBookUpdateInput,
  ) {
    await this.initialization;
    const userMessage = input.userMessage.trim();
    const assistantMessage = input.assistantMessage.trim();
    if (!userMessage && !assistantMessage) return null;
    const traceMetadata = memoryTraceMetadata(input);

    const apiKey = input.apiKey || getStoredOpenRouterKey();
    const userName = (input.userName || "Learner").trim() || "Learner";
    const selectedBook = input.activeBookId
      ? await db.learningBooks.get(input.activeBookId).catch(() => undefined)
      : undefined;
    const sessionBook =
      selectedBook ||
      (await this.upsertSessionLearningBook(userName, "General Study"));
    const bookId = sessionBook.id;
    const existingSessionBook = await db.learningBooks
      .get(bookId)
      .catch(() => sessionBook);
    const recentBooks = await db.learningBooks
      .orderBy("updatedAt")
      .reverse()
      .limit(12)
      .toArray()
      .catch(() => []);
    let update: any = null;

    if (apiKey) {
      try {
        const response = await fetch("/api/learning-book-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            userName,
            activeProject: input.activeProject || "General Study",
            currentSessionId: this.currentSessionId,
            activeBookId: bookId,
            activeDocumentId: input.activeDocumentId || null,
            conversationId: input.conversationId || null,
            requestId: input.requestId || null,
            mode: input.mode || "chat",
            agentLayer: input.agentLayer || null,
            documentContexts: input.documentContexts || [],
            currentBook: existingSessionBook
              ? {
                  title: existingSessionBook.title,
                  overview: existingSessionBook.overview,
                  knowledgeSummary: existingSessionBook.knowledgeSummary,
                  chapters: existingSessionBook.chapters || [],
                  conversationCount: existingSessionBook.conversationCount,
                }
              : null,
            userMessage,
            assistantMessage,
            recentBookTitles: recentBooks.map((book) => book.title),
          }),
        });

        if (response.ok) {
          update = await response.json();
        } else {
          console.warn(
            "[Memory] Learning book agent unavailable:",
            await response.text().catch(() => response.statusText),
          );
        }
      } catch (error) {
        console.warn("[Memory] Learning book agent request failed:", error);
      }
    }

    if (!update) {
      const fallbackTitle =
        existingSessionBook?.title || input.activeProject || "Study Session";
      const fallbackStudyNote = buildStudyNoteFallback(
        userMessage,
        assistantMessage,
      );
      update = {
        userName,
        bookTitle: fallbackTitle,
        bookSource: "chat",
        overview:
          existingSessionBook?.overview ||
          `A continuous learning book for this tutor session.`,
        chapterTitle: fallbackTitle,
        chapterSummary: fallbackStudyNote,
        conversationSummary: fallbackStudyNote,
        knowledgeSummary: existingSessionBook?.knowledgeSummary
          ? `${existingSessionBook.knowledgeSummary}\n\n${fallbackStudyNote}`
          : fallbackStudyNote,
        conceptsLearned: [fallbackTitle],
        risks: [],
        confidence: 0.35,
        concepts: [
          {
            name: fallbackTitle,
            summary: fallbackStudyNote,
            mastery: 0,
            confidence: 0.35,
            parentConcepts: [],
            childConcepts: [],
            evidence: [userMessage.slice(0, 160)].filter(Boolean),
          },
        ],
        model: "local-session-fallback",
      };
    }

    const now = Date.now();
    const proposedTitle =
      String(
        update.bookTitle || input.activeProject || "Study Session",
      ).trim() || "Study Session";
    const title =
      existingSessionBook?.title &&
      existingSessionBook.title !== "General Study"
        ? existingSessionBook.title
        : proposedTitle;
    const conversationId = input.conversationId || generateId();
    const agentConcepts: LearningAgentConcept[] = Array.isArray(update.concepts)
      ? update.concepts
      : [];
    const conceptIds: string[] = [];

    for (const concept of agentConcepts.slice(0, 12)) {
      const name = String(concept.name || "").trim();
      if (!name) continue;
      const conceptId = `${bookId}:concept:${slugify(name)}`;
      conceptIds.push(conceptId);
      const existing = await db.learningBookConcepts.get(conceptId);
      const nextConcept: LearningBookConcept = {
        id: conceptId,
        bookId,
        name,
        summary:
          String(concept.summary || existing?.summary || "").trim().length >=
          120
            ? String(concept.summary || existing?.summary || "").trim()
            : buildStudyNoteFallback(userMessage, assistantMessage),
        mastery: gateModelSummaryMastery(
          existing?.mastery ?? 0,
          concept.mastery,
        ),
        confidence: confidenceFromModelSummary(
          existing?.confidence ?? 0,
          concept.confidence,
        ),
        parentConcepts: mergeUnique(
          [
            ...(existing?.parentConcepts || []),
            ...(Array.isArray(concept.parentConcepts)
              ? concept.parentConcepts.map(String)
              : []),
          ],
          8,
        ),
        childConcepts: mergeUnique(
          [
            ...(existing?.childConcepts || []),
            ...(Array.isArray(concept.childConcepts)
              ? concept.childConcepts.map(String)
              : []),
          ],
          12,
        ),
        evidence: [
          ...(existing?.evidence || []),
          ...(Array.isArray(concept.evidence)
            ? concept.evidence.map(String)
            : []),
        ]
          .filter(Boolean)
          .slice(-8),
        firstSeenAt: existing?.firstSeenAt || now,
        updatedAt: now,
      };
      await db.learningBookConcepts.put(nextConcept);
      await recordModelSummaryEvidence({
        conceptId,
        bookId,
        conversationId,
        sourceId: "learning-book-update",
        source: "learning_book_update",
        summary: nextConcept.summary,
        confidence: nextConcept.confidence,
        metadata: modelObservationGateMetadata({
          ...traceMetadata,
          acceptedConfidence: nextConcept.confidence,
          proposedMastery: concept.mastery,
          proposedConfidence: concept.confidence,
          acceptedMastery: nextConcept.mastery,
        }),
      });
      await recordMemoryEvent({
        eventType: "learning_concept_updated",
        status: "completed",
        source: "learning_book_update",
        sessionId: this.currentSessionId,
        bookId,
        conversationId,
        documentId: input.activeDocumentId || undefined,
        conceptId,
        sourceIds: nextConcept.evidence,
        summary: nextConcept.summary,
        confidence: nextConcept.confidence,
        retentionPolicy: "local_indexeddb",
        metadata: modelObservationGateMetadata({
          ...traceMetadata,
          acceptedMastery: nextConcept.mastery,
          acceptedConfidence: nextConcept.confidence,
          childConcepts: nextConcept.childConcepts,
          conceptName: nextConcept.name,
          evidenceCount: nextConcept.evidence.length,
          fallback: update.model === "local-session-fallback",
          model: update.model || "deepseek/deepseek-v4-flash",
          parentConcepts: nextConcept.parentConcepts,
        }),
      });
    }

    const existingBook =
      existingSessionBook || (await db.learningBooks.get(bookId));
    const mergedConceptIds = Array.from(
      new Set([...(existingBook?.conceptIds || []), ...conceptIds]),
    );
    const chapterTitle = compactText(update.chapterTitle, title) || title;
    const chapterId = `${bookId}:chapter:${slugify(chapterTitle)}`;
    const existingChapters = existingBook?.chapters || [];
    const chapterIndex = existingChapters.findIndex(
      (chapter) =>
        chapter.id === chapterId ||
        chapter.title.toLowerCase() === chapterTitle.toLowerCase(),
    );
    const studyNoteFallback = buildStudyNoteFallback(
      userMessage,
      assistantMessage,
    );
    const proposedChapterSummary = compactText(
      update.chapterSummary || update.conversationSummary,
      existingChapters[chapterIndex]?.summary || "",
    );
    const proposedConversationSummary = compactText(
      update.conversationSummary || update.chapterSummary,
      existingBook?.summary || "",
    );
    const proposedKnowledgeSummary = compactText(
      update.knowledgeSummary,
      existingBook?.knowledgeSummary || "",
    );
    const nextChapter = {
      id: chapterIndex >= 0 ? existingChapters[chapterIndex].id : chapterId,
      title: chapterTitle,
      summary:
        proposedChapterSummary.length >= 160
          ? proposedChapterSummary
          : studyNoteFallback,
      conceptIds: mergeUnique(
        [...(existingChapters[chapterIndex]?.conceptIds || []), ...conceptIds],
        24,
      ),
      conversationCount:
        (existingChapters[chapterIndex]?.conversationCount || 0) + 1,
      createdAt: existingChapters[chapterIndex]?.createdAt || now,
      updatedAt: now,
    };
    const chapters =
      chapterIndex >= 0
        ? existingChapters.map((chapter, index) =>
            index === chapterIndex ? nextChapter : chapter,
          )
        : [...existingChapters, nextChapter];
    const book: LearningBook = {
      id: bookId,
      sessionId: this.currentSessionId,
      title,
      userName,
      source: String(update.bookSource || existingBook?.source || "chat"),
      overview: compactText(
        update.overview,
        existingBook?.overview ||
          `A continuous learning book for ${userName}'s current tutor session.`,
      ),
      summary:
        proposedConversationSummary.length >= 160
          ? proposedConversationSummary
          : studyNoteFallback,
      knowledgeSummary:
        proposedKnowledgeSummary.length >= 160
          ? proposedKnowledgeSummary
          : studyNoteFallback,
      chapters,
      conceptIds: mergedConceptIds,
      conversationCount: (existingBook?.conversationCount || 0) + 1,
      createdAt: existingBook?.createdAt || now,
      updatedAt: now,
      lastConversationId: conversationId,
      activeDocumentId:
        input.activeDocumentId || existingBook?.activeDocumentId,
      documentIds: existingBook?.documentIds || [],
      agentModel: String(update.model || "deepseek/deepseek-v4-flash"),
    };
    await db.learningBooks.put(book);
    announceActiveLearningBook(book);

    const learningEntryId = generateId();
    const learningEntry = {
      id: learningEntryId,
      bookId,
      conversationId,
      documentId: input.activeDocumentId || undefined,
      timestamp: now,
      userName,
      userMessage,
      assistantSummary: assistantMessage.slice(0, 1200),
      conversationSummary: book.summary,
      learnedConcepts: conceptIds,
      risks: Array.isArray(update.risks)
        ? update.risks.map(String).slice(0, 8)
        : [],
      model: book.agentModel || "deepseek/deepseek-v4-flash",
      confidence: clamp01(update.confidence, 0.55),
    };
    await db.learningEntries.add(learningEntry);
    const generatedNoteSourceSpans = buildGeneratedNoteSourceSpans(
      input.documentContexts,
    );
    await recordGeneratedNotesArtifact({
      entryId: learningEntryId,
      source: "learning_book_update",
      conversationId,
      bookId,
      bookTitle: book.title,
      chapterId: nextChapter.id,
      chapterTitle: nextChapter.title,
      documentId: input.activeDocumentId || undefined,
      userName,
      model: learningEntry.model,
      confidence: learningEntry.confidence,
      conceptIds,
      summary: learningEntry.conversationSummary,
      knowledgeSummary: book.knowledgeSummary,
      assistantSummary: learningEntry.assistantSummary,
      sourceSpanRequired: generatedNoteSourceSpans.length > 0,
      sourceSpans: generatedNoteSourceSpans,
      metadata: {
        ...traceMetadata,
        activeProject: input.activeProject || "General Study",
        fallback: book.agentModel === "local-session-fallback",
        generatedBy: "MemoryOrchestrator.updateLearningBookFromConversation",
        sourceSpanPolicy:
          generatedNoteSourceSpans.length > 0
            ? "document_context_preview_anchors"
            : "no_document_source_text_available",
        claimSpanPolicy:
          generatedNoteSourceSpans.length > 0
            ? "local_generated_note_preview_lexical_support"
            : "provenance_only_no_document_source_text",
        sourceTable: "learningEntries",
      },
    });
    await recordMemoryEvent({
      eventType: "learning_book_updated",
      status: "completed",
      source: "learning_book_update",
      sessionId: this.currentSessionId,
      bookId,
      conversationId,
      documentId: input.activeDocumentId || undefined,
      sourceIds: conceptIds,
      summary: book.summary,
      confidence: clamp01(update.confidence, 0.55),
      retentionPolicy: "local_indexeddb",
      metadata: modelObservationGateMetadata({
        ...traceMetadata,
        activeDocumentId: book.activeDocumentId,
        chapterCount: book.chapters.length,
        conceptCount: conceptIds.length,
        conversationCount: book.conversationCount,
        fallback: book.agentModel === "local-session-fallback",
        model: book.agentModel,
        title: book.title,
      }),
    });

    await this.logTrace("Learning Book Update", {
      userName,
      bookTitle: title,
      conceptCount: conceptIds.length,
      summary: book.summary,
      model: book.agentModel,
    });

    return book;
  }

  public async addOrUpdateConcept(
    name: string,
    description: string,
    understandingDelta: number,
    sourcePage?: number,
    context?: MemoryTraceContext,
  ) {
    const id = name.toLowerCase().trim();
    const existing = await db.concepts.get(id);
    let savedConcept: PersistentConcept | null = null;
    let action: "created" | "updated" = "created";
    const traceMetadata = memoryTraceMetadata(context);
    const source = context?.source || "chat_graph_update";

    if (existing) {
      action = "updated";
      existing.mastery = gateModelSummaryMastery(
        existing.mastery,
        understandingDelta,
      );
      existing.confidence = confidenceFromModelSummary(
        existing.confidence,
        understandingDelta,
      );
      existing.lastReviewedAt = Date.now();
      existing.revisionCount += 1;
      if (sourcePage && !existing.sourcePages.includes(sourcePage)) {
        existing.sourcePages.push(sourcePage);
      }
      await db.concepts.put(existing);
      await recordModelSummaryEvidence({
        conceptId: id,
        bookId: context?.bookId || undefined,
        conversationId: context?.conversationId,
        source,
        sourceId: "addOrUpdateConcept",
        summary: description,
        confidence: existing.confidence,
        metadata: modelObservationGateMetadata({
          ...traceMetadata,
          understandingDelta,
          sourcePage,
          proposedConfidence: understandingDelta,
          acceptedConfidence: existing.confidence,
          acceptedMastery: existing.mastery,
        }),
      });
      savedConcept = existing;
    } else {
      const newConcept: PersistentConcept = {
        id,
        name,
        description,
        mastery: 0,
        confidence: confidenceFromModelSummary(0, understandingDelta),

        // Phase 5 defaults
        p_learn: 0.2,
        p_transit: 0.1,
        p_slip: 0.1,
        p_guess: 0.2,
        attempt_history: [],
        decay_factor: 1.0,
        prerequisites: [],

        relatedConcepts: [],
        sourcePages: sourcePage ? [sourcePage] : [],
        revisionCount: 1,
        lastReviewedAt: Date.now(),
        firstLearnedAt: Date.now(),
        linkedAnnotations: [],
      };
      // generate embedding
      generateEmbedding(name + " " + description).then((emb) => {
        newConcept.embedding = emb;
        db.concepts.put(newConcept);
      });
      await db.concepts.put(newConcept);
      await recordModelSummaryEvidence({
        conceptId: id,
        bookId: context?.bookId || undefined,
        conversationId: context?.conversationId,
        source,
        sourceId: "addOrUpdateConcept",
        summary: description,
        confidence: newConcept.confidence,
        metadata: modelObservationGateMetadata({
          ...traceMetadata,
          understandingDelta,
          sourcePage,
          proposedConfidence: understandingDelta,
          acceptedConfidence: newConcept.confidence,
          acceptedMastery: newConcept.mastery,
        }),
      });
      savedConcept = newConcept;
    }

    if (savedConcept) {
      await recordMemoryEvent({
        eventType: "graph_concept_updated",
        status: "completed",
        source,
        bookId: context?.bookId || undefined,
        conversationId: context?.conversationId,
        documentId: context?.documentId || undefined,
        conceptId: id,
        sourceIds: savedConcept.sourcePages.map((page) => `page:${page}`),
        summary: description,
        confidence: savedConcept.confidence,
        retentionPolicy: "local_indexeddb",
        metadata: modelObservationGateMetadata({
          ...traceMetadata,
          acceptedMastery: savedConcept.mastery,
          acceptedConfidence: savedConcept.confidence,
          action,
          conceptName: savedConcept.name,
          revisionCount: savedConcept.revisionCount,
          sourcePage,
          understandingDelta,
        }),
      });
    }

    // Log the graph update to trace backend
    await this.logTrace("Brain Graph Update", {
      conceptName: name,
      understandingDelta,
      sourcePage,
      requestId: context?.requestId,
      mode: context?.mode,
      agentLayer: context?.agentLayer,
      confidenceGate: "model_summary_no_confidence_increase",
      masteryGate: "model_summary_no_mastery_increase",
    });
  }

  public async getRelevantContext(
    query: string,
    pageNumber?: number,
    activeBookId?: string | null,
    options: RelevantContextOptions = {},
  ): Promise<string> {
    const startedAt = Date.now();
    try {
      const queryEmbedding = await generateEmbedding(query);

      // Fetch recent interactions (optimized from full table scan)
      const interactions = activeBookId
        ? (await db.interactions.where("bookId").equals(activeBookId).toArray())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100)
        : await db.interactions
            .orderBy("timestamp")
            .reverse()
            .limit(100)
            .toArray();
      const scoredInteractions = interactions
        .filter((i) => i.embedding)
        .map((i) => ({
          i,
          score: cosineSimilarity(queryEmbedding, i.embedding!),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Fetch concepts (optimized to active concepts)
      const concepts = await db.concepts
        .orderBy("lastReviewedAt")
        .reverse()
        .limit(200)
        .toArray();
      const scoredConcepts = concepts
        .filter((c) => c.embedding)
        .map((c) => ({
          c,
          score: cosineSimilarity(queryEmbedding, c.embedding!),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      let contextStr = "### Persistent Memory Context\\n";

      if (scoredConcepts.length > 0) {
        contextStr +=
          "\\n**Related Learned Concepts:**\\n" +
          scoredConcepts
            .map(
              (sc) =>
                `- ${sc.c.name} (Mastery: ${(sc.c.mastery * 100).toFixed(0)}%, Confidence: ${(sc.c.confidence * 100).toFixed(0)}%) - ${sc.c.description}`,
            )
            .join("\\n");
      }

      if (scoredInteractions.length > 0) {
        contextStr +=
          "\\n\\n**Recent Relevant Discussion History:**\\n" +
          scoredInteractions
            .map(
              (si) =>
                `User: ${si.i.userMessage}\\nTutor: ${si.i.assistantMessage.slice(0, 200)}...`,
            )
            .join("\\n");
      }

      // Weak areas overall
      // Phase 5 Learner Model Injection
      const { learnerModel } = await import("./learner.model");
      const snapshot = await learnerModel.getLearnerSnapshot(
        scoredConcepts[0]?.c.id,
      );
      const tutorInstructions =
        await learnerModel.getTutorInstructions(snapshot);

      contextStr += "\n\n" + tutorInstructions;

      await recordRetrievalEvent({
        status: "completed",
        source: "memory_orchestrator",
        querySummary: query,
        requestId: options.requestId,
        activeBookId,
        pageNumber,
        durationMs: Date.now() - startedAt,
        candidateInteractionCount: interactions.length,
        candidateConceptCount: concepts.length,
        selectedInteractionIds: scoredInteractions.map(({ i }) => i.id),
        selectedConceptIds: scoredConcepts.map(({ c }) => c.id),
        selectedConceptNames: scoredConcepts.map(({ c }) => c.name),
        topInteractionScore: scoredInteractions[0]?.score,
        topConceptScore: scoredConcepts[0]?.score,
        contextChars: contextStr.length,
        tutorInstructionChars: tutorInstructions.length,
        metadata: {
          mode: options.mode,
          requestId: options.requestId,
          activeDocumentId: options.activeDocumentId || undefined,
          documentCount: options.documentCount,
          activeBookFiltered: Boolean(activeBookId),
          interactionsWithEmbeddings: interactions.filter((i) => i.embedding)
            .length,
          conceptsWithEmbeddings: concepts.filter((c) => c.embedding).length,
          learnerSnapshotConceptId: scoredConcepts[0]?.c.id,
        },
      });

      return contextStr;
    } catch (e) {
      console.error(e);
      await recordRetrievalEvent({
        status: "failed",
        source: "memory_orchestrator",
        querySummary: query,
        requestId: options.requestId,
        activeBookId,
        pageNumber,
        durationMs: Date.now() - startedAt,
        error: e instanceof Error ? e.message : e,
        metadata: {
          mode: options.mode,
          requestId: options.requestId,
          activeDocumentId: options.activeDocumentId || undefined,
          documentCount: options.documentCount,
        },
      });
      return "";
    }
  }

  public async logTrace(action: string, payload: any) {
    try {
      const traceId = generateId();
      const apiKey = getStoredOpenRouterKey();

      if (!apiKey) return; // Silent skip if no API key

      const response = await fetch("/api/trace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ action, payload }),
      });

      if (!response.ok) {
        console.error("Failed to fetch trace:", await response.text());
        return;
      }

      const { explanation } = await response.json();

      await db.traceLogs.add({
        id: traceId,
        timestamp: Date.now(),
        action,
        payload,
        llmExplanation: explanation,
      });
      console.log(`[Trace] ${action} logged and explained by DeepSeek.`);
    } catch (err) {
      console.error("Trace logging failed", err);
    }
  }
}

export const brainOrchestrator = new MemoryOrchestrator();
