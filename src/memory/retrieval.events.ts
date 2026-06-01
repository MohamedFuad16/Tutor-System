import { db, type RetrievalEvent } from "./longterm.memory";

type RetrievalEventStatusInput =
  | RetrievalEvent["status"]
  | "success"
  | "complete"
  | "error";

export type RetrievalEventInput = {
  id?: string;
  timestamp?: number;
  status?: RetrievalEventStatusInput;
  source?: string;
  querySummary?: unknown;
  activeBookId?: string | null;
  pageNumber?: number;
  durationMs?: number;
  candidateInteractionCount?: number;
  candidateConceptCount?: number;
  selectedInteractionIds?: unknown[];
  selectedConceptIds?: unknown[];
  selectedConceptNames?: unknown[];
  topInteractionScore?: number;
  topConceptScore?: number;
  contextChars?: number;
  tutorInstructionChars?: number;
  error?: unknown;
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

const cleanList = (values: unknown[] | undefined, limit = 12) =>
  Array.from(
    new Set((values || []).map((value) => compact(value)).filter(Boolean)),
  ).slice(0, limit);

const nonNegativeInteger = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
};

const optionalNonNegativeInteger = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.round(numeric))
    : undefined;
};

const boundedScore = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(-1, Math.min(1, numeric));
};

export const normalizeRetrievalEventStatus = (
  status: RetrievalEventStatusInput | undefined,
): RetrievalEvent["status"] => {
  if (status === "success" || status === "complete") return "completed";
  if (status === "error") return "failed";
  if (status === "completed" || status === "failed" || status === "skipped") {
    return status;
  }
  return "completed";
};

export const retrievalEventIdFor = (
  input: RetrievalEventInput,
  timestamp = Date.now(),
) => {
  const source = compact(input.source, "memory_retrieval");
  const anchor = compact(input.activeBookId || input.pageNumber || "general");
  const suffix = Math.random().toString(36).slice(2, 10);
  return ["retrieval-event", source, anchor, timestamp, suffix]
    .filter(Boolean)
    .join(":");
};

export const createRetrievalEventRecord = (
  input: RetrievalEventInput,
  timestamp = Date.now(),
): RetrievalEvent => {
  const recordTimestamp = input.timestamp || timestamp;

  return {
    id: input.id || retrievalEventIdFor(input, recordTimestamp),
    timestamp: recordTimestamp,
    status: normalizeRetrievalEventStatus(input.status),
    source: compact(input.source, "memory_retrieval"),
    querySummary: compact(input.querySummary, "Memory retrieval request."),
    activeBookId: optionalCompact(input.activeBookId),
    pageNumber: optionalNonNegativeInteger(input.pageNumber),
    durationMs: optionalNonNegativeInteger(input.durationMs),
    candidateInteractionCount: nonNegativeInteger(
      input.candidateInteractionCount,
    ),
    candidateConceptCount: nonNegativeInteger(input.candidateConceptCount),
    selectedInteractionIds: cleanList(input.selectedInteractionIds),
    selectedConceptIds: cleanList(input.selectedConceptIds),
    selectedConceptNames: cleanList(input.selectedConceptNames),
    topInteractionScore: boundedScore(input.topInteractionScore),
    topConceptScore: boundedScore(input.topConceptScore),
    contextChars: nonNegativeInteger(input.contextChars),
    tutorInstructionChars: optionalNonNegativeInteger(
      input.tutorInstructionChars,
    ),
    error: input.error ? compact(input.error) : undefined,
    metadata: input.metadata,
  };
};

export const recordRetrievalEvent = async (input: RetrievalEventInput) => {
  const record = createRetrievalEventRecord(input);

  try {
    await db.retrievalEvents.add(record);
  } catch (error) {
    console.warn("[RetrievalEvents] write failed", error);
  }

  return record;
};
