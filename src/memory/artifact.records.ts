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
    claimCheck: "artifact_level_source_card";
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
) => artifact?.artifactType === "source_card";

export const verifyLocalCitationIntegrity = (input: {
  artifact?: ArtifactRecord | null;
  citation: CitationState;
  timestamp?: number;
}): CitationIntegrityResult => {
  const checkedAt = Math.max(0, Math.round(input.timestamp || Date.now()));
  const artifact = input.artifact || null;
  const citation = input.citation;
  const checkedFields = [
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
    claimCheck: "artifact_level_source_card",
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
      "The local verifier currently supports source-card citation rows only.",
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
        localOnly: true,
        generatedArtifact: true,
        artifactType: "flashcards",
        batchId,
        sourceMessageId: input.sourceMessageId,
        cardCount,
        cardIds,
        conceptIds,
        ...input.metadata,
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
        localOnly: true,
        generatedArtifact: true,
        batchId,
        sourceMessageId: input.sourceMessageId,
        bookTitle: input.bookTitle,
        cardCount,
        cardIds,
        conceptIds,
        unresolvedCards: validCards.filter(
          (card) => compact(card.conceptId).toLowerCase() === "general",
        ).length,
        samplePrompts,
        ...input.metadata,
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
    entryId || input.conversationId || input.bookId || "generated-learning-note",
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

const timestampForStoredAt = (storedAt: string | undefined, fallback: number) => {
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
  const title = compact(input.title, "Stored audio overview");
  const chapterTitle = compact(input.chapterTitle, `Chapter ${chapterIndex + 1}`);
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
      title: `Stored audio overview: ${chapterTitle}`,
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
      title: `Stored audio overview: ${title}`,
      summary: summary || "Stored audio overview without saved transcript.",
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
  const { artifact, citation } = createGeneratedNotesArtifactRecords(input);

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

  return { artifact, citation };
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
    console.warn("[ArtifactRecords] audio overview artifact write failed", error);
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
