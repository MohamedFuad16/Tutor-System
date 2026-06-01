import { db, type ToolJob } from "./longterm.memory";

type ToolJobStatusInput =
  | ToolJob["status"]
  | "started"
  | "start"
  | "success"
  | "error";

export type ToolJobEventInput = {
  id?: string;
  timestamp?: number;
  toolName?: string;
  status?: ToolJobStatusInput;
  requestId?: string;
  model?: string;
  source?: string;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  durationMs?: number;
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

export const normalizeToolJobStatus = (
  status: ToolJobStatusInput | undefined,
): ToolJob["status"] => {
  if (status === "started" || status === "start") return "running";
  if (status === "success") return "completed";
  if (status === "error") return "failed";
  if (
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "blocked"
  ) {
    return status;
  }
  return "running";
};

export const toolJobIdFor = (input: ToolJobEventInput) => {
  const requestId = compact(input.requestId, "local");
  const toolName = compact(input.toolName, "unknown_tool");
  const toolCallId = compact(input.metadata?.toolCallId, "");
  return ["tool-job", requestId, toolName, toolCallId]
    .filter(Boolean)
    .join(":");
};

export const createToolJobRecord = (
  input: ToolJobEventInput,
  timestamp = Date.now(),
): ToolJob => ({
  id: input.id || toolJobIdFor(input),
  timestamp: input.timestamp || timestamp,
  toolName: compact(input.toolName, "unknown_tool"),
  status: normalizeToolJobStatus(input.status),
  requestId: input.requestId,
  model: input.model,
  source: compact(input.source, "chat_stream"),
  inputSummary: input.inputSummary
    ? compact(input.inputSummary)
    : input.inputSummary,
  outputSummary: input.outputSummary
    ? compact(input.outputSummary)
    : input.outputSummary,
  error: input.error ? compact(input.error) : input.error,
  durationMs:
    input.durationMs === undefined ? undefined : Math.max(0, input.durationMs),
  metadata: input.metadata,
});

export const recordToolJobEvent = async (input: ToolJobEventInput) => {
  const record = createToolJobRecord(input);

  try {
    await db.toolJobs.put(record);
  } catch (error) {
    console.warn("[ToolJobs] write failed", error);
  }

  return record;
};
