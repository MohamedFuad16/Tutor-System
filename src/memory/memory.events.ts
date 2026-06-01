import { db, type MemoryEvent } from "./longterm.memory";

type MemoryEventStatusInput =
  | MemoryEvent["status"]
  | "start"
  | "running"
  | "success"
  | "complete"
  | "error";

export type MemoryEventInput = {
  id?: string;
  timestamp?: number;
  eventType?: MemoryEvent["eventType"];
  status?: MemoryEventStatusInput;
  source?: string;
  sessionId?: string;
  bookId?: string;
  conversationId?: string;
  documentId?: string;
  conceptId?: string;
  sourceIds?: unknown[];
  summary?: unknown;
  confidence?: number;
  retentionPolicy?: string;
  traceId?: string;
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

const clamp01 = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.min(1, numeric));
};

const cleanSourceIds = (values: unknown[] | undefined) =>
  Array.from(
    new Set((values || []).map((value) => compact(value)).filter(Boolean)),
  ).slice(0, 24);

export const normalizeMemoryEventStatus = (
  status: MemoryEventStatusInput | undefined,
): MemoryEvent["status"] => {
  if (status === "start" || status === "running") return "pending";
  if (status === "success" || status === "complete") return "completed";
  if (status === "error") return "failed";
  if (
    status === "pending" ||
    status === "completed" ||
    status === "failed" ||
    status === "skipped"
  ) {
    return status;
  }
  return "completed";
};

export const memoryEventIdFor = (
  input: MemoryEventInput,
  timestamp = Date.now(),
) => {
  const eventType = compact(input.eventType, "interaction_recorded");
  const source = compact(input.source, "memory_orchestrator");
  const anchor = compact(
    input.conceptId ||
      input.bookId ||
      input.conversationId ||
      input.sessionId ||
      "local",
  );
  const suffix = Math.random().toString(36).slice(2, 10);
  return ["memory-event", eventType, source, anchor, timestamp, suffix]
    .filter(Boolean)
    .join(":");
};

export const createMemoryEventRecord = (
  input: MemoryEventInput,
  timestamp = Date.now(),
): MemoryEvent => {
  const recordTimestamp = input.timestamp || timestamp;
  const eventType = input.eventType || "interaction_recorded";
  const source = compact(input.source, "memory_orchestrator");
  const sourceIds = cleanSourceIds(input.sourceIds);

  return {
    id:
      input.id ||
      memoryEventIdFor({ ...input, eventType, source }, recordTimestamp),
    timestamp: recordTimestamp,
    eventType,
    status: normalizeMemoryEventStatus(input.status),
    source,
    sessionId: optionalCompact(input.sessionId),
    bookId: optionalCompact(input.bookId),
    conversationId: optionalCompact(input.conversationId),
    documentId: optionalCompact(input.documentId),
    conceptId: optionalCompact(input.conceptId),
    sourceIds: sourceIds.length ? sourceIds : undefined,
    summary: compact(input.summary, "Memory event recorded."),
    confidence: clamp01(input.confidence),
    retentionPolicy: optionalCompact(input.retentionPolicy),
    traceId: optionalCompact(input.traceId),
    metadata: input.metadata,
  };
};

export const recordMemoryEvent = async (input: MemoryEventInput) => {
  const record = createMemoryEventRecord(input);

  try {
    await db.memoryEvents.add(record);
  } catch (error) {
    console.warn("[MemoryEvents] write failed", error);
  }

  return record;
};
