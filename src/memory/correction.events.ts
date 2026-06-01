import { db, type CorrectionEvent } from "./longterm.memory";

type CorrectionEventStatusInput =
  | CorrectionEvent["status"]
  | "pending"
  | "completed"
  | "complete"
  | "failed"
  | "error";

type CorrectionEventActionInput =
  | CorrectionEvent["action"]
  | "wrong"
  | "delete"
  | "remove"
  | "correct";

type CorrectionEventTargetInput =
  | CorrectionEvent["targetType"]
  | "memory"
  | "retrieval"
  | "evidence"
  | "mastery"
  | "model"
  | "tool"
  | "book";

export type CorrectionEventInput = {
  id?: string;
  timestamp?: number;
  status?: CorrectionEventStatusInput;
  action?: CorrectionEventActionInput;
  targetType?: CorrectionEventTargetInput;
  targetId?: unknown;
  targetSummary?: unknown;
  reason?: unknown;
  source?: string;
  requestedBy?: CorrectionEvent["requestedBy"];
  bookId?: string | null;
  conversationId?: string | null;
  conceptId?: string | null;
  relatedEventIds?: unknown[];
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

export const normalizeCorrectionEventStatus = (
  status: CorrectionEventStatusInput | undefined,
): CorrectionEvent["status"] => {
  if (status === "pending") return "open";
  if (status === "completed" || status === "complete") return "applied";
  if (status === "failed" || status === "error") return "blocked";
  if (
    status === "open" ||
    status === "applied" ||
    status === "blocked" ||
    status === "dismissed"
  ) {
    return status;
  }
  return "open";
};

export const normalizeCorrectionEventAction = (
  action: CorrectionEventActionInput | undefined,
): CorrectionEvent["action"] => {
  if (action === "wrong" || action === "correct") return "mark_wrong";
  if (action === "delete" || action === "remove") return "delete_request";
  if (
    action === "mark_wrong" ||
    action === "delete_request" ||
    action === "supersede" ||
    action === "review"
  ) {
    return action;
  }
  return "review";
};

export const normalizeCorrectionEventTargetType = (
  targetType: CorrectionEventTargetInput | undefined,
): CorrectionEvent["targetType"] => {
  if (targetType === "memory") return "memory_event";
  if (targetType === "retrieval") return "retrieval_event";
  if (targetType === "evidence") return "evidence_event";
  if (targetType === "mastery") return "mastery_delta";
  if (targetType === "model") return "model_run";
  if (targetType === "tool") return "tool_job";
  if (targetType === "book") return "learning_book";
  if (
    targetType === "memory_event" ||
    targetType === "retrieval_event" ||
    targetType === "evidence_event" ||
    targetType === "mastery_delta" ||
    targetType === "model_run" ||
    targetType === "tool_job" ||
    targetType === "concept" ||
    targetType === "interaction" ||
    targetType === "learning_book" ||
    targetType === "other"
  ) {
    return targetType;
  }
  return "other";
};

export const correctionEventIdFor = (
  input: CorrectionEventInput,
  timestamp = Date.now(),
) => {
  const action = normalizeCorrectionEventAction(input.action);
  const targetType = normalizeCorrectionEventTargetType(input.targetType);
  const targetId = compact(input.targetId, "local");
  const suffix = Math.random().toString(36).slice(2, 10);
  return ["correction-event", action, targetType, targetId, timestamp, suffix]
    .filter(Boolean)
    .join(":");
};

export const createCorrectionEventRecord = (
  input: CorrectionEventInput,
  timestamp = Date.now(),
): CorrectionEvent => {
  const recordTimestamp = input.timestamp || timestamp;
  const action = normalizeCorrectionEventAction(input.action);
  const targetType = normalizeCorrectionEventTargetType(input.targetType);
  const targetId = compact(input.targetId, "unscoped-target");
  const source = compact(input.source, "admin_correction");

  return {
    id: input.id || correctionEventIdFor(input, recordTimestamp),
    timestamp: recordTimestamp,
    status: normalizeCorrectionEventStatus(input.status),
    action,
    targetType,
    targetId,
    targetSummary: optionalCompact(input.targetSummary),
    reason: compact(input.reason, "Correction review requested."),
    source,
    requestedBy: input.requestedBy === "system" ? "system" : "admin",
    bookId: optionalCompact(input.bookId),
    conversationId: optionalCompact(input.conversationId),
    conceptId: optionalCompact(input.conceptId),
    relatedEventIds: cleanList(input.relatedEventIds),
    metadata: input.metadata,
  };
};

export const recordCorrectionEvent = async (input: CorrectionEventInput) => {
  const record = createCorrectionEventRecord(input);

  try {
    await db.correctionEvents.add(record);
  } catch (error) {
    console.warn("[CorrectionEvents] write failed", error);
  }

  return record;
};
