import { db, type ArtifactRecord, type CitationState } from "./longterm.memory";

type ArtifactStatusInput =
  | ArtifactRecord["status"]
  | "complete"
  | "completed"
  | "error";

type ArtifactVerificationInput =
  | ArtifactRecord["verificationState"]
  | "pending"
  | "available";

type CitationStateInput =
  | CitationState["state"]
  | "pending"
  | "failed"
  | "error";

export type WebSourceArtifactInput = {
  webSource: {
    id?: string;
    type?: string;
    title?: string;
    url?: string;
    domain?: string;
    snippet?: string;
    date?: string;
    position?: number;
  };
  searchId?: string;
  messageId?: string;
  conversationId?: string;
  bookId?: string;
  eventSource?: string;
  query?: string;
  metadata?: Record<string, unknown>;
};

export type UnavailableCitationInput = {
  searchId?: string;
  query?: string;
  reason?: unknown;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type GeneratedFlashcardsArtifactInput = {
  batchId?: string;
  cards: Array<{
    id?: string;
    front?: unknown;
    back?: unknown;
    conceptId?: unknown;
  }>;
  source?: string;
  sourceMessageId?: string;
  messageId?: string;
  conversationId?: string;
  bookId?: string;
  bookTitle?: string;
  toolJobId?: string;
  metadata?: Record<string, unknown>;
};

export type GeneratedNoteSourceSpanInput = {
  id?: string;
  documentId?: string;
  title?: unknown;
  classification?: unknown;
  extractionMode?: unknown;
  text?: unknown;
  source?: string;
};

export type GeneratedNoteSourceSpan = {
  id: string;
  documentId?: string;
  title?: string;
  classification?: string;
  extractionMode?: string;
  preview: string;
  textLength: number;
  source?: string;
};

export type GeneratedNotesArtifactInput = {
  entryId: string;
  bookId?: string;
  bookTitle?: string;
  chapterId?: string;
  chapterTitle?: string;
  conversationId?: string;
  documentId?: string;
  userName?: string;
  model?: string;
  confidence?: unknown;
  conceptIds?: unknown[];
  source?: string;
  summary?: unknown;
  knowledgeSummary?: unknown;
  assistantSummary?: unknown;
  sourceSpanRequired?: boolean;
  sourceSpans?: GeneratedNoteSourceSpanInput[];
  metadata?: Record<string, unknown>;
};

export type StoredAudioOverviewArtifactInput = {
  overviewId?: string;
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  title: string;
  summary?: unknown;
  transcript?: unknown;
  audioSrc: string;
  durationLabel?: string;
  generatedBy?: string;
  voice?: string;
  storedAt?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type CitationIntegrityState = CitationState["state"];

export type CitationIntegrityResult = {
  state: CitationIntegrityState;
  artifactVerificationState: ArtifactRecord["verificationState"];
  verifier: "local_citation_integrity";
  checkedAt: number;
  failureReason?: string;
  metadata: {
    localOnly: true;
    externalContentFetched: false;
    verifierVersion: 1;
    citationId: string;
    artifactId?: string;
    artifactType?: ArtifactRecord["artifactType"];
    checkedFields: string[];
    sourceKind: "url" | "local_source_ref" | "missing";
    normalizedDomain?: string;
    claimCheck:
      | "artifact_level_source_card"
      | "generated_flashcard_provenance"
      | "generated_learning_note_provenance"
      | "stored_audio_overview_integrity";
  };
};

const compact = (value: unknown, fallback = "") => {
  const text =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? ""
        : JSON.stringify(value);
  return (text || fallback).replace(/\s+/g, " ").trim().slice(0, 500);
};

const optionalCompact = (value: unknown) => {
  const text = compact(value);
  return text || undefined;
};

const cleanList = (values: unknown[] | undefined, limit = 16) =>
  Array.from(
    new Set((values || []).map((value) => compact(value)).filter(Boolean)),
  ).slice(0, limit);

const stableHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const normalizeDomain = (value: unknown) => {
  const text = compact(value).toLowerCase();
  return text
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
};

const parseHttpUrl = (value: unknown) => {
  const text = compact(value);
  if (!text) return null;

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const sameUrl = (a: unknown, b: unknown) => {
  const urlA = parseHttpUrl(a);
  const urlB = parseHttpUrl(b);
  if (!urlA || !urlB) return false;
  const normalizedA = `${urlA.origin}${urlA.pathname.replace(/\/+$/, "")}${urlA.search}${urlA.hash}`;
  const normalizedB = `${urlB.origin}${urlB.pathname.replace(/\/+$/, "")}${urlB.search}${urlB.hash}`;
  return normalizedA === normalizedB;
};

const isPlaceholderSourceRef = (value: unknown) => {
  const text = compact(value).toLowerCase();
  return (
    !text ||
    text === "source" ||
    text === "source-card" ||
    text === "source-claim" ||
    text === "generated-flashcards" ||
    text === "learning-entry" ||
    text === "generated-learning-note" ||
    text === "local"
  );
};

const domainMatches = (urlValue: unknown, domainValue: unknown) => {
  const parsed = parseHttpUrl(urlValue);
  const domain = normalizeDomain(domainValue);
  if (!parsed || !domain) return true;
  const host = normalizeDomain(parsed.hostname);
  return host === domain || host.endsWith(`.${domain}`);
};

const mergeMetadata = (
  metadata: Record<string, unknown> | undefined,
  key: string,
  value: Record<string, unknown>,
) => ({
  ...(metadata || {}),
  [key]: value,
});

export const normalizeArtifactStatus = (
  status: ArtifactStatusInput | undefined,
): ArtifactRecord["status"] => {
  if (status === "complete" || status === "completed") return "ready";
  if (status === "error") return "failed";
  if (
    status === "draft" ||
    status === "ready" ||
    status === "failed" ||
    status === "stale"
  ) {
    return status;
  }
  return "ready";
};

export const normalizeArtifactVerificationState = (
  state: ArtifactVerificationInput | undefined,
): ArtifactRecord["verificationState"] => {
  if (state === "pending") return "checking";
  if (state === "available") return "not_checked";
  if (
    state === "checking" ||
    state === "verified" ||
    state === "unavailable" ||
    state === "conflicting" ||
    state === "not_checked"
  ) {
    return state;
  }
  return "checking";
};

export const normalizeCitationState = (
  state: CitationStateInput | undefined,
): CitationState["state"] => {
  if (state === "pending") return "checking";
  if (state === "failed" || state === "error") return "unavailable";
  if (
    state === "checking" ||
    state === "verified" ||
    state === "unavailable" ||
    state === "conflicting" ||
    state === "unsupported" ||
    state === "not_checked"
  ) {
    return state;
  }
  return "checking";
};

export const artifactRecordIdFor = (input: {
  artifactType?: ArtifactRecord["artifactType"];
  sourceRef?: unknown;
  searchId?: string;
}) => {
  const artifactType = compact(input.artifactType, "source_card");
  const sourceRef = compact(input.sourceRef || input.searchId || "local");
  return ["artifact", artifactType, stableHash(sourceRef)].join(":");
};

export const citationStateIdFor = (input: {
  claimId?: unknown;
  sourceRef?: unknown;
  artifactId?: string;
}) => {
  const claimId = compact(input.claimId, "source-claim");
  const sourceRef = compact(input.sourceRef || input.artifactId || "local");
  return ["citation-state", stableHash(`${claimId}:${sourceRef}`)].join(":");
};

export const createArtifactRecord = (
  input: Partial<ArtifactRecord> & {
    artifactType?: ArtifactRecord["artifactType"];
    sourceRef?: unknown;
  },
  timestamp = Date.now(),
): ArtifactRecord => {
  const artifactType = input.artifactType || "source_card";
  const sourceRef = input.url || input.sourceRef || input.id || input.title;

  return {
    id: input.id || artifactRecordIdFor({ artifactType, sourceRef }),
    timestamp: input.timestamp || timestamp,
    artifactType,
    status: normalizeArtifactStatus(input.status),
    verificationState: normalizeArtifactVerificationState(
      input.verificationState,
    ),
    source: compact(input.source, "chat_stream"),
    title: compact(input.title, "Untitled artifact"),
    summary: optionalCompact(input.summary),
    url: optionalCompact(input.url),
    domain: optionalCompact(input.domain),
    sourceIds: cleanList(input.sourceIds),
    citationStateIds: cleanList(input.citationStateIds),
    searchId: optionalCompact(input.searchId),
    toolJobId: optionalCompact(input.toolJobId),
    messageId: optionalCompact(input.messageId),
    conversationId: optionalCompact(input.conversationId),
    bookId: optionalCompact(input.bookId),
    conceptId: optionalCompact(input.conceptId),
    metadata: input.metadata,
  };
};

export const createCitationStateRecord = (
  input: Partial<CitationState> & { sourceRef?: unknown },
  timestamp = Date.now(),
): CitationState => {
  const sourceRef = compact(input.sourceRef || input.url || input.id, "source");
  const claimId = compact(input.claimId, "source-card");

  return {
    id: input.id || citationStateIdFor({ claimId, sourceRef }),
    timestamp: input.timestamp || timestamp,
    state: normalizeCitationState(input.state),
    claimId,
    sourceRef,
    artifactId: optionalCompact(input.artifactId),
    url: optionalCompact(input.url),
    domain: optionalCompact(input.domain),
    title: optionalCompact(input.title),
    verifier: compact(input.verifier, "local_citation_state"),
    checkedAt:
      typeof input.checkedAt === "number" && Number.isFinite(input.checkedAt)
        ? Math.max(0, Math.round(input.checkedAt))
        : undefined,
    failureReason: optionalCompact(input.failureReason),
    metadata: input.metadata,
  };
};

export const artifactVerificationStateForCitationStates = (
  states: CitationState["state"][],
): ArtifactRecord["verificationState"] => {
  if (states.includes("conflicting")) return "conflicting";
  if (states.includes("unavailable") || states.includes("unsupported")) {
    return "unavailable";
  }
  if (states.includes("checking")) return "checking";
  if (states.includes("not_checked")) return "not_checked";
  if (states.length > 0 && states.every((state) => state === "verified")) {
    return "verified";
  }
  return "not_checked";
};

export const supportsLocalCitationIntegrityArtifact = (
  artifact?: Pick<ArtifactRecord, "artifactType"> | null,
) =>
  artifact?.artifactType === "source_card" ||
  artifact?.artifactType === "flashcards" ||
  artifact?.artifactType === "notes" ||
  artifact?.artifactType === "audio_overview";

const isLocalAudioOverviewSource = (value: unknown) => {
  const text = compact(value);
  return text.startsWith("/audio-overviews/") && text.endsWith(".mp3");
};

export const createGeneratedNoteSourceSpans = (
  inputs: GeneratedNoteSourceSpanInput[] | undefined,
  limit = 8,
): GeneratedNoteSourceSpan[] =>
  (inputs || [])
    .map((input, index) => {
      const preview = compact(input.text);
      if (!preview) return null;

      const documentId = optionalCompact(input.documentId);
      const id = compact(
        input.id ||
          [
            documentId || "document",
            "source-span",
            stableHash(`${documentId || ""}:${preview}:${index}`),
          ].join(":"),
      );

      return {
        id,
        documentId,
        title: optionalCompact(input.title),
        classification: optionalCompact(input.classification),
        extractionMode: optionalCompact(input.extractionMode),
        preview,
        textLength: String(input.text || "").trim().length,
        source: optionalCompact(input.source),
      };
    })
    .filter(Boolean)
    .slice(0, limit) as GeneratedNoteSourceSpan[];

export const verifyLocalCitationIntegrity = (input: {
  artifact?: ArtifactRecord | null;
  citation: CitationState;
  timestamp?: number;
}): CitationIntegrityResult => {
  const checkedAt = Math.max(0, Math.round(input.timestamp || Date.now()));
  const artifact = input.artifact || null;
  const citation = input.citation;
  const generatedFlashcardsArtifact = artifact?.artifactType === "flashcards";
  const generatedNoteArtifact = artifact?.artifactType === "notes";
  const audioOverviewArtifact = artifact?.artifactType === "audio_overview";
  const checkedFields = audioOverviewArtifact
    ? [
        "artifactId",
        "citationStateIds",
        "sourceRef",
        "sourceIds",
        "bookId",
        "summary",
        "metadata.overviewId",
        "metadata.audioSrc",
        "metadata.bookId",
        "metadata.chapterIndex",
        "metadata.chapterTitle",
        "metadata.durationLabel",
        "metadata.generatedBy",
        "metadata.voice",
        "metadata.storedAt",
        "metadata.transcriptLength",
        "metadata.localOnly",
        "metadata.externalContentFetched",
      ]
    : generatedFlashcardsArtifact
      ? [
          "artifactId",
          "citationStateIds",
          "sourceRef",
          "sourceIds",
          "bookId",
          "conversationId",
          "summary",
          "metadata.batchId",
          "metadata.sourceMessageId",
          "metadata.cardCount",
          "metadata.cardIds",
          "metadata.conceptIds",
          "metadata.samplePrompts",
          "metadata.localOnly",
          "metadata.externalContentFetched",
        ]
      : generatedNoteArtifact
        ? [
            "artifactId",
            "citationStateIds",
            "sourceRef",
            "sourceIds",
            "bookId",
            "conversationId",
            "summary",
            "metadata.entryId",
            "metadata.sourceSpanRequired",
            "metadata.sourceSpanCount",
            "metadata.sourceSpanIds",
            "metadata.sourceDocumentIds",
            "metadata.sourceSpanPreviews",
            "metadata.sourceSpanCoverage",
            "metadata.localOnly",
            "metadata.externalContentFetched",
          ]
        : [
            "artifactId",
            "citationStateIds",
            "url",
            "domain",
            "sourceRef",
            "sourceIds",
            "title",
          ];
  const sourceUrl = citation.url || artifact?.url;
  const parsedUrl = parseHttpUrl(sourceUrl);
  const explicitLocalSourceRefs = cleanList([
    citation.sourceRef,
    ...(artifact?.sourceIds || []),
    artifact?.searchId,
    citation.metadata?.searchId,
  ]).filter(
    (value) =>
      !isPlaceholderSourceRef(value) &&
      value !== citation.id &&
      value !== citation.claimId &&
      value !== artifact?.id,
  );
  const hasLocalSourceRef = explicitLocalSourceRefs.length > 0;
  const sourceKind = parsedUrl
    ? "url"
    : hasLocalSourceRef
      ? "local_source_ref"
      : "missing";
  const baseMetadata: CitationIntegrityResult["metadata"] = {
    localOnly: true,
    externalContentFetched: false,
    verifierVersion: 1,
    citationId: citation.id,
    artifactId: artifact?.id || citation.artifactId,
    artifactType: artifact?.artifactType,
    checkedFields,
    sourceKind,
    normalizedDomain: parsedUrl
      ? normalizeDomain(parsedUrl.hostname)
      : normalizeDomain(citation.domain || artifact?.domain) || undefined,
    claimCheck: audioOverviewArtifact
      ? "stored_audio_overview_integrity"
      : generatedFlashcardsArtifact
        ? "generated_flashcard_provenance"
        : generatedNoteArtifact
          ? "generated_learning_note_provenance"
          : "artifact_level_source_card",
  };
  const result = (
    state: CitationIntegrityState,
    failureReason?: string,
  ): CitationIntegrityResult => ({
    state,
    artifactVerificationState: artifactVerificationStateForCitationStates([
      state,
    ]),
    verifier: "local_citation_integrity",
    checkedAt,
    failureReason,
    metadata: baseMetadata,
  });

  if (!artifact) {
    return result(
      "unavailable",
      "No local artifact record exists for this citation.",
    );
  }

  if (artifact.status === "failed") {
    return result("unavailable", "The linked artifact is marked failed.");
  }

  if (!supportsLocalCitationIntegrityArtifact(artifact)) {
    return result(
      "unsupported",
      "The local verifier currently supports source-card, generated flashcard, generated learning-note, and stored audio-guide citation rows only.",
    );
  }

  if (citation.artifactId && citation.artifactId !== artifact.id) {
    return result(
      "conflicting",
      "Citation artifactId does not match the artifact.",
    );
  }

  if (
    artifact.citationStateIds.length > 0 &&
    !artifact.citationStateIds.includes(citation.id)
  ) {
    return result(
      "conflicting",
      "Artifact citationStateIds do not include this citation row.",
    );
  }

  if (artifact.artifactType === "flashcards") {
    const artifactMetadata = artifact.metadata || {};
    const citationMetadata = citation.metadata || {};
    const sourceRef = compact(citation.sourceRef);
    const batchId = compact(artifactMetadata.batchId);
    const citationBatchId = compact(citationMetadata.batchId);
    const sourceMessageId = compact(artifactMetadata.sourceMessageId);
    const citationSourceMessageId = compact(citationMetadata.sourceMessageId);
    const artifactMessageId = compact(artifact.messageId);
    const artifactBookId = compact(artifact.bookId);
    const artifactConversationId = compact(artifact.conversationId);
    const cardIds = cleanList(
      Array.isArray(artifactMetadata.cardIds)
        ? artifactMetadata.cardIds
        : [artifactMetadata.cardIds],
      64,
    );
    const citationCardIds = cleanList(
      Array.isArray(citationMetadata.cardIds)
        ? citationMetadata.cardIds
        : [citationMetadata.cardIds],
      64,
    );
    const conceptIds = cleanList(
      Array.isArray(artifactMetadata.conceptIds)
        ? artifactMetadata.conceptIds
        : [artifactMetadata.conceptIds],
      32,
    );
    const cardCount = Number(artifactMetadata.cardCount);
    const citationCardCount = Number(citationMetadata.cardCount);
    const samplePrompts = cleanList(
      Array.isArray(artifactMetadata.samplePrompts)
        ? artifactMetadata.samplePrompts
        : [artifactMetadata.samplePrompts],
      3,
    );
    const acceptedSourceRefs = cleanList(
      [
        sourceMessageId,
        artifactMessageId,
        batchId,
        cardIds.length ? cardIds.join(":") : undefined,
      ],
      8,
    );

    if (
      artifactMetadata.localOnly !== true ||
      citationMetadata.localOnly !== true
    ) {
      return result(
        "unavailable",
        "Generated flashcard provenance is not marked local-only.",
      );
    }

    if (
      artifactMetadata.externalContentFetched !== false ||
      citationMetadata.externalContentFetched !== false
    ) {
      return result(
        "unavailable",
        "Generated flashcard provenance does not prove that no external content was fetched.",
      );
    }

    if (artifactMetadata.generatedArtifact !== true) {
      return result(
        "unavailable",
        "Generated flashcard artifact metadata is missing the generated-artifact marker.",
      );
    }

    if (compact(artifactMetadata.artifactType) !== "flashcards") {
      return result(
        "unavailable",
        "Generated flashcard artifact metadata is not marked as flashcards.",
      );
    }

    if (!sourceRef || isPlaceholderSourceRef(sourceRef)) {
      return result(
        "unavailable",
        "Generated flashcard citation is missing a local source reference.",
      );
    }

    if (!batchId || isPlaceholderSourceRef(batchId)) {
      return result(
        "unavailable",
        "Generated flashcard metadata is missing the batch id.",
      );
    }

    if (citationBatchId && citationBatchId !== batchId) {
      return result(
        "conflicting",
        "Generated flashcard citation batch id disagrees with the artifact.",
      );
    }

    if (
      citationSourceMessageId &&
      citationSourceMessageId !== sourceMessageId
    ) {
      return result(
        "conflicting",
        "Generated flashcard citation source message disagrees with the artifact.",
      );
    }

    if (
      sourceMessageId &&
      artifactMessageId &&
      sourceMessageId !== artifactMessageId
    ) {
      return result(
        "conflicting",
        "Generated flashcard artifact message id disagrees with metadata.",
      );
    }

    if (!acceptedSourceRefs.includes(sourceRef)) {
      return result(
        "conflicting",
        "Generated flashcard citation source does not match the artifact batch or message anchor.",
      );
    }

    if (!artifact.sourceIds.includes(sourceRef)) {
      return result(
        "conflicting",
        "Generated flashcard artifact sourceIds do not include the citation source reference.",
      );
    }

    if (!Number.isFinite(cardCount) || cardCount <= 0) {
      return result(
        "unavailable",
        "Generated flashcard metadata has no saved card count.",
      );
    }

    if (Number.isFinite(citationCardCount) && citationCardCount !== cardCount) {
      return result(
        "conflicting",
        "Generated flashcard citation card count disagrees with the artifact.",
      );
    }

    if (cardIds.length === 0 || cardIds.length !== cardCount) {
      return result(
        "unavailable",
        "Generated flashcard metadata does not include every saved card id.",
      );
    }

    if (
      citationCardIds.length > 0 &&
      citationCardIds.some((cardId) => !cardIds.includes(cardId))
    ) {
      return result(
        "conflicting",
        "Generated flashcard citation card ids disagree with the artifact.",
      );
    }

    if (cardIds.some((cardId) => !artifact.sourceIds.includes(cardId))) {
      return result(
        "conflicting",
        "Generated flashcard artifact sourceIds do not include every saved card id.",
      );
    }

    if (
      conceptIds.length > 0 &&
      artifact.conceptId &&
      !conceptIds.includes(artifact.conceptId)
    ) {
      return result(
        "conflicting",
        "Generated flashcard artifact conceptId disagrees with metadata.",
      );
    }

    if (!artifactBookId && !artifactConversationId && !sourceMessageId) {
      return result(
        "unavailable",
        "Generated flashcards have no local book, conversation, or message anchor.",
      );
    }

    if (!compact(artifact.summary) || samplePrompts.length === 0) {
      return result(
        "unavailable",
        "Generated flashcards have no saved prompt preview to inspect locally.",
      );
    }

    return result("verified");
  }

  if (artifact.artifactType === "notes") {
    const artifactMetadata = artifact.metadata || {};
    const citationMetadata = citation.metadata || {};
    const artifactEntryId = compact(artifactMetadata.entryId);
    const citationEntryId = compact(citationMetadata.entryId);
    const sourceRef = compact(citation.sourceRef);
    const artifactBookId = compact(artifact.bookId);
    const metadataBookId = compact(artifactMetadata.bookId);
    const artifactConversationId = compact(artifact.conversationId);
    const metadataConversationId = compact(artifactMetadata.conversationId);
    const sourceSpanRequired =
      artifactMetadata.sourceSpanRequired === true ||
      citationMetadata.sourceSpanRequired === true;
    const sourceSpanCount = Number(artifactMetadata.sourceSpanCount);
    const citationSourceSpanCount = Number(citationMetadata.sourceSpanCount);
    const sourceSpanIds = cleanList(
      Array.isArray(artifactMetadata.sourceSpanIds)
        ? artifactMetadata.sourceSpanIds
        : [artifactMetadata.sourceSpanIds],
      32,
    );
    const citationSourceSpanIds = cleanList(
      Array.isArray(citationMetadata.sourceSpanIds)
        ? citationMetadata.sourceSpanIds
        : [citationMetadata.sourceSpanIds],
      32,
    );
    const sourceSpanPreviews = cleanList(
      Array.isArray(artifactMetadata.sourceSpanPreviews)
        ? artifactMetadata.sourceSpanPreviews
        : [artifactMetadata.sourceSpanPreviews],
      8,
    );
    const sourceSpanCoverage = compact(artifactMetadata.sourceSpanCoverage);

    if (
      artifactMetadata.localOnly !== true ||
      citationMetadata.localOnly !== true
    ) {
      return result(
        "unavailable",
        "Generated note provenance is not marked local-only.",
      );
    }

    if (
      artifactMetadata.externalContentFetched !== false ||
      citationMetadata.externalContentFetched !== false
    ) {
      return result(
        "unavailable",
        "Generated note provenance does not prove that no external content was fetched.",
      );
    }

    if (artifactMetadata.generatedArtifact !== true) {
      return result(
        "unavailable",
        "Generated note artifact metadata is missing the generated-artifact marker.",
      );
    }

    if (compact(artifactMetadata.noteKind) !== "learning_entry") {
      return result(
        "unavailable",
        "Generated note artifact metadata is not a learning-entry note.",
      );
    }

    if (!artifactEntryId) {
      return result(
        "unavailable",
        "Generated note artifact metadata is missing the learning entry id.",
      );
    }

    if (!sourceRef || isPlaceholderSourceRef(sourceRef)) {
      return result(
        "unavailable",
        "Generated note citation is missing a local learning-entry source reference.",
      );
    }

    if (
      sourceRef !== artifactEntryId ||
      (citationEntryId && citationEntryId !== artifactEntryId)
    ) {
      return result(
        "conflicting",
        "Generated note citation source does not match the artifact learning entry id.",
      );
    }

    if (!artifact.sourceIds.includes(artifactEntryId)) {
      return result(
        "conflicting",
        "Generated note artifact sourceIds do not include the learning entry id.",
      );
    }

    if (artifactBookId && metadataBookId && artifactBookId !== metadataBookId) {
      return result(
        "conflicting",
        "Generated note artifact bookId disagrees with metadata.",
      );
    }

    if (
      artifactConversationId &&
      metadataConversationId &&
      artifactConversationId !== metadataConversationId
    ) {
      return result(
        "conflicting",
        "Generated note artifact conversationId disagrees with metadata.",
      );
    }

    if (
      Number.isFinite(citationSourceSpanCount) &&
      Number.isFinite(sourceSpanCount) &&
      citationSourceSpanCount !== sourceSpanCount
    ) {
      return result(
        "conflicting",
        "Generated note citation source-span count disagrees with the artifact.",
      );
    }

    if (
      citationSourceSpanIds.length > 0 &&
      citationSourceSpanIds.some((spanId) => !sourceSpanIds.includes(spanId))
    ) {
      return result(
        "conflicting",
        "Generated note citation source-span ids disagree with the artifact.",
      );
    }

    if (sourceSpanIds.some((spanId) => !artifact.sourceIds.includes(spanId))) {
      return result(
        "conflicting",
        "Generated note artifact sourceIds do not include every saved source-span id.",
      );
    }

    if (sourceSpanRequired) {
      if (
        !Number.isFinite(sourceSpanCount) ||
        sourceSpanCount <= 0 ||
        sourceSpanIds.length === 0
      ) {
        return result(
          "unavailable",
          "Generated note source-span anchors were required but no local source spans were saved.",
        );
      }

      if (sourceSpanCoverage !== "anchored") {
        return result(
          "unavailable",
          "Generated note source-span coverage is not marked anchored.",
        );
      }

      if (sourceSpanPreviews.length === 0) {
        return result(
          "unavailable",
          "Generated note source-span anchors have no saved preview text.",
        );
      }
    }

    if (
      !artifactBookId &&
      !metadataBookId &&
      !artifactConversationId &&
      !metadataConversationId
    ) {
      return result(
        "unavailable",
        "Generated note has no local book or conversation anchor.",
      );
    }

    if (
      !compact(artifact.summary) ||
      !compact(artifactMetadata.summaryPreview)
    ) {
      return result(
        "unavailable",
        "Generated note has no saved summary preview to inspect locally.",
      );
    }

    return result("verified");
  }

  if (artifact.artifactType === "audio_overview") {
    const artifactMetadata = artifact.metadata || {};
    const citationMetadata = citation.metadata || {};
    const sourceRef = compact(citation.sourceRef);
    const artifactAudioSrc = compact(artifactMetadata.audioSrc);
    const citationAudioSrc = compact(citationMetadata.audioSrc);
    const overviewId = compact(artifactMetadata.overviewId);
    const artifactBookId = compact(artifact.bookId);
    const metadataBookId = compact(artifactMetadata.bookId);
    const citationBookId = compact(citationMetadata.bookId);
    const chapterTitle = compact(artifactMetadata.chapterTitle);
    const durationLabel = compact(artifactMetadata.durationLabel);
    const generatedBy = compact(artifactMetadata.generatedBy);
    const voice = compact(artifactMetadata.voice);
    const storedAt = compact(artifactMetadata.storedAt);
    const chapterIndex = Number(artifactMetadata.chapterIndex);
    const transcriptLength = Number(artifactMetadata.transcriptLength);

    if (
      artifactMetadata.localOnly !== true ||
      citationMetadata.localOnly !== true
    ) {
      return result(
        "unavailable",
        "Stored audio guide provenance is not marked local-only.",
      );
    }

    if (
      artifactMetadata.externalContentFetched !== false ||
      citationMetadata.externalContentFetched !== false
    ) {
      return result(
        "unavailable",
        "Stored audio guide provenance does not prove that no external content was fetched.",
      );
    }

    if (artifactMetadata.generatedArtifact !== true) {
      return result(
        "unavailable",
        "Stored audio guide metadata is missing the generated-artifact marker.",
      );
    }

    if (compact(artifactMetadata.artifactType) !== "audio_overview") {
      return result(
        "unavailable",
        "Stored audio guide metadata is not marked as an audio overview.",
      );
    }

    if (!sourceRef || isPlaceholderSourceRef(sourceRef)) {
      return result(
        "unavailable",
        "Stored audio guide citation is missing a local MP3 source reference.",
      );
    }

    if (!isLocalAudioOverviewSource(sourceRef)) {
      return result(
        "unavailable",
        "Stored audio guide source is not a local audio-overviews MP3 path.",
      );
    }

    if (
      sourceRef !== artifactAudioSrc ||
      (citationAudioSrc && citationAudioSrc !== sourceRef)
    ) {
      return result(
        "conflicting",
        "Stored audio guide source reference disagrees with saved metadata.",
      );
    }

    if (!artifact.sourceIds.includes(sourceRef)) {
      return result(
        "conflicting",
        "Stored audio guide artifact sourceIds do not include the local MP3 path.",
      );
    }

    if (!overviewId || isPlaceholderSourceRef(overviewId)) {
      return result(
        "unavailable",
        "Stored audio guide metadata is missing the overview id.",
      );
    }

    if (!artifact.sourceIds.includes(overviewId)) {
      return result(
        "conflicting",
        "Stored audio guide artifact sourceIds do not include the overview id.",
      );
    }

    if (
      !artifactBookId ||
      !metadataBookId ||
      artifactBookId !== metadataBookId
    ) {
      return result(
        "conflicting",
        "Stored audio guide artifact bookId disagrees with metadata.",
      );
    }

    if (citationBookId && citationBookId !== artifactBookId) {
      return result(
        "conflicting",
        "Stored audio guide citation bookId disagrees with the artifact.",
      );
    }

    if (!Number.isFinite(chapterIndex) || chapterIndex < 0) {
      return result(
        "unavailable",
        "Stored audio guide metadata has no valid chapter index.",
      );
    }

    if (!chapterTitle || !artifact.sourceIds.includes(chapterTitle)) {
      return result(
        "unavailable",
        "Stored audio guide metadata is missing a chapter title anchor.",
      );
    }

    if (
      !compact(artifact.summary) ||
      !compact(artifactMetadata.summaryPreview)
    ) {
      return result(
        "unavailable",
        "Stored audio guide has no saved summary preview to inspect locally.",
      );
    }

    if (!Number.isFinite(transcriptLength) || transcriptLength <= 0) {
      return result(
        "unavailable",
        "Stored audio guide has no saved transcript length to inspect locally.",
      );
    }

    if (!durationLabel || !generatedBy || !voice || !storedAt) {
      return result(
        "unavailable",
        "Stored audio guide is missing duration, generator, voice, or stored date metadata.",
      );
    }

    if (!Number.isFinite(Date.parse(storedAt))) {
      return result(
        "unavailable",
        "Stored audio guide storedAt metadata is not a valid date.",
      );
    }

    return result("verified");
  }

  if (citation.url && artifact.url && !sameUrl(citation.url, artifact.url)) {
    return result("conflicting", "Citation URL and artifact URL disagree.");
  }

  if (!domainMatches(citation.url || artifact.url, citation.domain)) {
    return result(
      "conflicting",
      "Citation domain does not match the URL host.",
    );
  }

  if (!domainMatches(artifact.url || citation.url, artifact.domain)) {
    return result(
      "conflicting",
      "Artifact domain does not match the URL host.",
    );
  }

  if (sourceKind === "missing") {
    return result(
      "unavailable",
      "No URL, source reference, source id, or search id is available locally.",
    );
  }

  if (sourceUrl && !parsedUrl) {
    return result(
      "unavailable",
      "The saved source URL is not a valid HTTP(S) URL.",
    );
  }

  if (!parsedUrl && !hasLocalSourceRef) {
    return result(
      "unavailable",
      "The citation has no source reference to check.",
    );
  }

  return result("verified");
};

export const recordArtifactRecord = async (
  input: Parameters<typeof createArtifactRecord>[0],
) => {
  const record = createArtifactRecord(input);

  try {
    await db.artifactRecords.put(record);
  } catch (error) {
    console.warn("[ArtifactRecords] write failed", error);
  }

  return record;
};

const loadLinkedCitationStates = async (
  artifact: ArtifactRecord,
  updated?: CitationState,
) => {
  const linkedIds = cleanList([...artifact.citationStateIds, updated?.id]);
  const byId = new Map<string, CitationState>();
  const linked = await Promise.all(
    linkedIds.map((id) => db.citationStates.get(id)),
  );
  linked.filter(Boolean).forEach((state) => {
    byId.set((state as CitationState).id, state as CitationState);
  });

  if (updated) byId.set(updated.id, updated);

  const byArtifactId = await db.citationStates
    .where("artifactId")
    .equals(artifact.id)
    .toArray();
  byArtifactId.forEach((state) => byId.set(state.id, state));

  return Array.from(byId.values());
};

const applyCitationIntegrityResult = (
  citation: CitationState,
  result: CitationIntegrityResult,
): CitationState =>
  createCitationStateRecord(
    {
      ...citation,
      state: result.state,
      verifier: result.verifier,
      checkedAt: result.checkedAt,
      failureReason:
        result.state === "verified" ? undefined : result.failureReason,
      metadata: mergeMetadata(
        citation.metadata,
        "localCitationIntegrity",
        result.metadata,
      ),
    },
    citation.timestamp,
  );

const applyArtifactCitationState = (
  artifact: ArtifactRecord,
  states: CitationState[],
  timestamp: number,
) =>
  createArtifactRecord(
    {
      ...artifact,
      timestamp: artifact.timestamp,
      verificationState: artifactVerificationStateForCitationStates(
        states.map((state) => state.state),
      ),
      citationStateIds: cleanList([
        ...artifact.citationStateIds,
        ...states.map((state) => state.id),
      ]),
      metadata: mergeMetadata(artifact.metadata, "localCitationIntegrity", {
        localOnly: true,
        externalContentFetched: false,
        verifier: "local_citation_integrity",
        checkedAt: timestamp,
        citationStates: states.map((state) => ({
          id: state.id,
          state: state.state,
        })),
      }),
    },
    artifact.timestamp,
  );

export const createInitialLocalCitationIntegrityRecords = (
  input: { artifact: ArtifactRecord; citation: CitationState },
  timestamp = Date.now(),
) => {
  const result = verifyLocalCitationIntegrity({
    artifact: input.artifact,
    citation: input.citation,
    timestamp,
  });
  const citation = applyCitationIntegrityResult(input.citation, result);
  const artifact = applyArtifactCitationState(
    input.artifact,
    [citation],
    result.checkedAt,
  );

  return { artifact, citation, result };
};

export const verifyCitationStateIntegrity = async (
  citationId: string,
  timestamp = Date.now(),
) => {
  const citation = await db.citationStates.get(citationId);
  if (!citation) {
    throw new Error(`Citation state not found: ${citationId}`);
  }

  const artifact = citation.artifactId
    ? await db.artifactRecords.get(citation.artifactId)
    : null;
  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp,
  });
  if (artifact && !supportsLocalCitationIntegrityArtifact(artifact)) {
    return {
      citation,
      artifact,
      result,
    };
  }

  const updatedCitation = applyCitationIntegrityResult(citation, result);
  const linkedCitationStates = artifact
    ? await loadLinkedCitationStates(artifact, updatedCitation)
    : [updatedCitation];
  const updatedArtifact = artifact
    ? applyArtifactCitationState(
        artifact,
        linkedCitationStates,
        result.checkedAt,
      )
    : null;

  try {
    if (updatedArtifact) {
      await db.transaction("rw", db.artifactRecords, db.citationStates, () =>
        Promise.all([
          db.citationStates.put(updatedCitation),
          db.artifactRecords.put(updatedArtifact),
        ]),
      );
    } else {
      await db.citationStates.put(updatedCitation);
    }
  } catch (error) {
    console.warn("[CitationStates] local integrity check failed", error);
  }

  return {
    citation: updatedCitation,
    artifact: updatedArtifact,
    result,
  };
};

export const verifyArtifactCitationIntegrity = async (
  artifactId: string,
  timestamp = Date.now(),
) => {
  const artifact = await db.artifactRecords.get(artifactId);
  if (!artifact) {
    throw new Error(`Artifact record not found: ${artifactId}`);
  }

  const citationStates = await loadLinkedCitationStates(artifact);
  if (!supportsLocalCitationIntegrityArtifact(artifact)) {
    return {
      artifact,
      citations: citationStates,
      results: citationStates.map((citation) =>
        verifyLocalCitationIntegrity({
          artifact,
          citation,
          timestamp,
        }),
      ),
    };
  }

  if (citationStates.length === 0) {
    const updatedArtifact = createArtifactRecord(
      {
        ...artifact,
        timestamp: artifact.timestamp,
        verificationState: "not_checked",
        metadata: mergeMetadata(artifact.metadata, "localCitationIntegrity", {
          localOnly: true,
          externalContentFetched: false,
          verifier: "local_citation_integrity",
          checkedAt: Math.max(0, Math.round(timestamp)),
          reason: "No citation states are linked to this artifact.",
        }),
      },
      artifact.timestamp,
    );
    await db.artifactRecords.put(updatedArtifact);
    return {
      artifact: updatedArtifact,
      citations: [],
      results: [],
    };
  }

  const results = citationStates.map((citation) => {
    const result = verifyLocalCitationIntegrity({
      artifact,
      citation,
      timestamp,
    });
    return {
      citation: applyCitationIntegrityResult(citation, result),
      result,
    };
  });
  const updatedCitations = results.map((entry) => entry.citation);
  const updatedArtifact = applyArtifactCitationState(
    artifact,
    updatedCitations,
    Math.max(0, Math.round(timestamp)),
  );

  try {
    await db.transaction("rw", db.artifactRecords, db.citationStates, () =>
      Promise.all([
        db.artifactRecords.put(updatedArtifact),
        ...updatedCitations.map((citation) => db.citationStates.put(citation)),
      ]),
    );
  } catch (error) {
    console.warn("[ArtifactRecords] local integrity check failed", error);
  }

  return {
    artifact: updatedArtifact,
    citations: updatedCitations,
    results: results.map((entry) => entry.result),
  };
};

export const recordCitationState = async (
  input: Parameters<typeof createCitationStateRecord>[0],
) => {
  const record = createCitationStateRecord(input);

  try {
    await db.citationStates.put(record);
  } catch (error) {
    console.warn("[CitationStates] write failed", error);
  }

  return record;
};

export const recordWebSourceArtifact = async (
  input: WebSourceArtifactInput,
) => {
  const url = compact(input.webSource.url);
  const title = compact(input.webSource.title, "Web source");
  const sourceId = compact(input.webSource.id || url || title);
  const artifactId = artifactRecordIdFor({
    artifactType: "source_card",
    sourceRef: url || sourceId,
  });
  const citationId = citationStateIdFor({
    claimId: artifactId,
    sourceRef: url || sourceId,
  });
  const timestamp = Date.now();

  const citation = createCitationStateRecord(
    {
      id: citationId,
      state: "checking",
      claimId: artifactId,
      sourceRef: url || sourceId,
      artifactId,
      url,
      domain: input.webSource.domain,
      title,
      verifier: "local_web_source_capture",
      metadata: {
        searchId: input.searchId,
        query: input.query,
        type: input.webSource.type,
        position: input.webSource.position,
        date: input.webSource.date,
        ...input.metadata,
      },
    },
    timestamp,
  );
  const artifact = createArtifactRecord(
    {
      id: artifactId,
      artifactType: "source_card",
      status: "ready",
      verificationState: "checking",
      source: input.eventSource || "chat_web_search",
      title,
      summary: input.webSource.snippet,
      url,
      domain: input.webSource.domain,
      sourceIds: [sourceId],
      citationStateIds: [citation.id],
      searchId: input.searchId,
      messageId: input.messageId,
      conversationId: input.conversationId,
      bookId: input.bookId,
      metadata: {
        query: input.query,
        type: input.webSource.type,
        position: input.webSource.position,
        date: input.webSource.date,
        ...input.metadata,
      },
    },
    timestamp,
  );

  try {
    await db.transaction("rw", db.artifactRecords, db.citationStates, () =>
      Promise.all([
        db.artifactRecords.put(artifact),
        db.citationStates.put(citation),
      ]),
    );
  } catch (error) {
    console.warn("[ArtifactRecords] source artifact write failed", error);
  }

  return { artifact, citation };
};

export const createGeneratedFlashcardsArtifactRecords = (
  input: GeneratedFlashcardsArtifactInput,
  timestamp = Date.now(),
) => {
  const validCards = input.cards.filter(
    (card) => compact(card.front) || compact(card.back),
  );
  const cardIds = cleanList(
    validCards.map((card) => card.id),
    64,
  );
  const conceptIds = cleanList(
    validCards
      .map((card) => card.conceptId)
      .filter((value) => compact(value).toLowerCase() !== "general"),
    32,
  );
  const sourceRef = compact(
    input.sourceMessageId ||
      input.messageId ||
      input.batchId ||
      cardIds.join(":") ||
      input.bookId ||
      "generated-flashcards",
  );
  const batchId = compact(input.batchId || sourceRef);
  const artifactId = artifactRecordIdFor({
    artifactType: "flashcards",
    sourceRef: batchId,
  });
  const citationId = citationStateIdFor({
    claimId: artifactId,
    sourceRef,
  });
  const cardCount = validCards.length;
  const title =
    cardCount === 1
      ? "Generated flashcard"
      : `${cardCount} generated flashcards`;
  const samplePrompts = validCards
    .map((card) => compact(card.front))
    .filter(Boolean)
    .slice(0, 3);

  const citation = createCitationStateRecord(
    {
      id: citationId,
      state: "not_checked",
      claimId: artifactId,
      sourceRef,
      artifactId,
      title,
      verifier: "generated_flashcard_provenance",
      metadata: {
        ...input.metadata,
        localOnly: true,
        externalContentFetched: false,
        generatedArtifact: true,
        artifactType: "flashcards",
        batchId,
        sourceMessageId: input.sourceMessageId,
        messageId: input.messageId,
        conversationId: input.conversationId,
        bookId: input.bookId,
        cardCount,
        cardIds,
        conceptIds,
      },
    },
    timestamp,
  );
  const artifact = createArtifactRecord(
    {
      id: artifactId,
      artifactType: "flashcards",
      status: cardCount > 0 ? "ready" : "failed",
      verificationState: "not_checked",
      source: input.source || "chat_flashcard_generation",
      title,
      summary: samplePrompts.length
        ? `Saved ${cardCount} generated flashcard${cardCount === 1 ? "" : "s"}: ${samplePrompts.join("; ")}`
        : `Saved ${cardCount} generated flashcard${cardCount === 1 ? "" : "s"}.`,
      sourceIds: cleanList(
        [
          sourceRef,
          input.sourceMessageId,
          input.messageId,
          input.bookId,
          ...cardIds,
        ],
        64,
      ),
      citationStateIds: [citation.id],
      toolJobId: input.toolJobId,
      messageId: input.messageId || input.sourceMessageId,
      conversationId: input.conversationId,
      bookId: input.bookId,
      conceptId: conceptIds.length === 1 ? conceptIds[0] : undefined,
      metadata: {
        ...input.metadata,
        localOnly: true,
        externalContentFetched: false,
        generatedArtifact: true,
        artifactType: "flashcards",
        batchId,
        sourceMessageId: input.sourceMessageId,
        messageId: input.messageId,
        conversationId: input.conversationId,
        bookId: input.bookId,
        bookTitle: input.bookTitle,
        cardCount,
        cardIds,
        conceptIds,
        unresolvedCards: validCards.filter(
          (card) => compact(card.conceptId).toLowerCase() === "general",
        ).length,
        samplePrompts,
      },
    },
    timestamp,
  );

  return { artifact, citation };
};

export const recordGeneratedFlashcardsArtifact = async (
  input: GeneratedFlashcardsArtifactInput,
) => {
  const { artifact, citation } =
    createGeneratedFlashcardsArtifactRecords(input);

  try {
    await db.transaction("rw", db.artifactRecords, db.citationStates, () =>
      Promise.all([
        db.artifactRecords.put(artifact),
        db.citationStates.put(citation),
      ]),
    );
  } catch (error) {
    console.warn("[ArtifactRecords] flashcard artifact write failed", error);
  }

  return { artifact, citation };
};

export const createGeneratedNotesArtifactRecords = (
  input: GeneratedNotesArtifactInput,
  timestamp = Date.now(),
) => {
  const entryId = compact(input.entryId, "learning-entry");
  const conceptIds = cleanList(input.conceptIds, 32);
  const sourceRef = compact(
    entryId ||
      input.conversationId ||
      input.bookId ||
      "generated-learning-note",
  );
  const artifactId = artifactRecordIdFor({
    artifactType: "notes",
    sourceRef,
  });
  const citationId = citationStateIdFor({
    claimId: artifactId,
    sourceRef,
  });
  const noteTitle = compact(
    input.chapterTitle || input.bookTitle || "Generated learning note",
  );
  const noteSummary = compact(
    input.summary || input.assistantSummary || input.knowledgeSummary,
  );
  const confidence = Number(input.confidence);
  const normalizedConfidence = Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, confidence))
    : undefined;
  const sourceSpans = createGeneratedNoteSourceSpans(input.sourceSpans);
  const sourceSpanIds = cleanList(
    sourceSpans.map((span) => span.id),
    32,
  );
  const sourceDocumentIds = cleanList(
    sourceSpans.map((span) => span.documentId),
    16,
  );
  const sourceSpanRequired = input.sourceSpanRequired === true;
  const sourceSpanCoverage = sourceSpanRequired
    ? sourceSpans.length > 0
      ? "anchored"
      : "missing"
    : sourceSpans.length > 0
      ? "anchored"
      : "not_required";

  const sharedMetadata = {
    ...input.metadata,
    localOnly: true,
    externalContentFetched: false,
    generatedArtifact: true,
    artifactType: "notes",
    noteKind: "learning_entry",
    entryId,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    conversationId: input.conversationId,
    documentId: input.documentId,
    userName: input.userName,
    model: input.model,
    confidence: normalizedConfidence,
    conceptIds,
    sourceSpanRequired,
    sourceSpanCount: sourceSpans.length,
    sourceSpanIds,
    sourceDocumentIds,
    sourceSpanCoverage,
    sourceSpanPreviews: sourceSpans.map((span) => ({
      id: span.id,
      documentId: span.documentId,
      title: span.title,
      classification: span.classification,
      extractionMode: span.extractionMode,
      preview: span.preview,
      textLength: span.textLength,
      source: span.source,
    })),
    summaryLength: String(input.summary || "").trim().length,
    knowledgeSummaryLength: String(input.knowledgeSummary || "").trim().length,
    assistantSummaryLength: String(input.assistantSummary || "").trim().length,
  };

  const citation = createCitationStateRecord(
    {
      id: citationId,
      state: "not_checked",
      claimId: artifactId,
      sourceRef,
      artifactId,
      title: `Generated learning note: ${noteTitle}`,
      verifier: "generated_learning_entry_provenance",
      metadata: sharedMetadata,
    },
    timestamp,
  );
  const artifact = createArtifactRecord(
    {
      id: artifactId,
      artifactType: "notes",
      status: noteSummary ? "ready" : "failed",
      verificationState: "not_checked",
      source: input.source || "learning_book_update",
      title: `Generated learning note: ${noteTitle}`,
      summary: noteSummary || "Generated learning note without saved summary.",
      sourceIds: cleanList(
        [
          entryId,
          input.conversationId,
          input.bookId,
          input.chapterId,
          input.documentId,
          ...conceptIds,
          ...sourceDocumentIds,
          ...sourceSpanIds,
        ],
        64,
      ),
      citationStateIds: [citation.id],
      conversationId: input.conversationId,
      bookId: input.bookId,
      conceptId: conceptIds.length === 1 ? conceptIds[0] : undefined,
      metadata: {
        ...sharedMetadata,
        summaryPreview: noteSummary,
      },
    },
    timestamp,
  );

  return { artifact, citation };
};

const timestampForStoredAt = (
  storedAt: string | undefined,
  fallback: number,
) => {
  const parsed = storedAt ? Date.parse(storedAt) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const createStoredAudioOverviewArtifactRecords = (
  input: StoredAudioOverviewArtifactInput,
  timestamp = timestampForStoredAt(input.storedAt, Date.now()),
) => {
  const chapterIndex = Math.max(0, Math.round(input.chapterIndex));
  const overviewId = compact(
    input.overviewId ||
      `${input.bookId}:chapter-${chapterIndex}:stored-audio-overview`,
  );
  const sourceRef = compact(input.audioSrc || overviewId);
  const artifactId = artifactRecordIdFor({
    artifactType: "audio_overview",
    sourceRef,
  });
  const citationId = citationStateIdFor({
    claimId: artifactId,
    sourceRef,
  });
  const transcript = compact(input.transcript);
  const summary = compact(input.summary || transcript);
  const title = compact(input.title, "Chapter audio guide");
  const chapterTitle = compact(
    input.chapterTitle,
    `Chapter ${chapterIndex + 1}`,
  );
  const storedAt = compact(input.storedAt);

  const sharedMetadata = {
    ...input.metadata,
    localOnly: true,
    externalContentFetched: false,
    generatedArtifact: true,
    artifactType: "audio_overview",
    overviewId,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    chapterIndex,
    chapterTitle,
    audioSrc: sourceRef,
    durationLabel: input.durationLabel,
    generatedBy: input.generatedBy,
    voice: input.voice,
    storedAt,
    transcriptLength: String(input.transcript || "").trim().length,
  };

  const citation = createCitationStateRecord(
    {
      id: citationId,
      state: "not_checked",
      claimId: artifactId,
      sourceRef,
      artifactId,
      title: `Chapter audio guide: ${chapterTitle}`,
      verifier: "stored_audio_overview_provenance",
      metadata: sharedMetadata,
    },
    timestamp,
  );
  const artifact = createArtifactRecord(
    {
      id: artifactId,
      artifactType: "audio_overview",
      status: sourceRef && transcript ? "ready" : "failed",
      verificationState: "not_checked",
      source: input.source || "stored_audio_overview_manifest",
      title: `Chapter audio guide: ${title}`,
      summary: summary || "Chapter audio guide without saved transcript.",
      sourceIds: cleanList([overviewId, input.bookId, chapterTitle, sourceRef]),
      citationStateIds: [citation.id],
      bookId: input.bookId,
      metadata: {
        ...sharedMetadata,
        summaryPreview: summary,
      },
    },
    timestamp,
  );

  return { artifact, citation };
};

export const recordGeneratedNotesArtifact = async (
  input: GeneratedNotesArtifactInput,
) => {
  const { artifact, citation, result } =
    createInitialLocalCitationIntegrityRecords(
      createGeneratedNotesArtifactRecords(input),
    );

  try {
    await db.transaction("rw", db.artifactRecords, db.citationStates, () =>
      Promise.all([
        db.artifactRecords.put(artifact),
        db.citationStates.put(citation),
      ]),
    );
  } catch (error) {
    console.warn("[ArtifactRecords] note artifact write failed", error);
  }

  return { artifact, citation, result };
};

export const recordStoredAudioOverviewArtifacts = async (
  inputs: StoredAudioOverviewArtifactInput[],
) => {
  const records = inputs.map((input) =>
    createStoredAudioOverviewArtifactRecords(input),
  );

  if (records.length === 0) return records;

  try {
    await db.transaction("rw", db.artifactRecords, db.citationStates, () =>
      Promise.all(
        records.flatMap(({ artifact, citation }) => [
          db.artifactRecords.put(artifact),
          db.citationStates.put(citation),
        ]),
      ),
    );
  } catch (error) {
    console.warn(
      "[ArtifactRecords] audio overview artifact write failed",
      error,
    );
  }

  return records;
};

export const recordUnavailableCitationState = async (
  input: UnavailableCitationInput,
) =>
  recordCitationState({
    id: citationStateIdFor({
      claimId: input.searchId || input.query || "web-search",
      sourceRef: input.reason || "unavailable",
    }),
    state: "unavailable",
    claimId: compact(input.searchId || input.query, "web-search"),
    sourceRef: compact(input.query, "web-search"),
    verifier: compact(input.source, "local_web_search"),
    failureReason: optionalCompact(input.reason),
    metadata: input.metadata,
  });
