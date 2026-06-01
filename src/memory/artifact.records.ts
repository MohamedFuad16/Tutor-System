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
