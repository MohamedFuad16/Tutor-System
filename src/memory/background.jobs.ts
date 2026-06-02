import { db, type BackgroundJob } from "./longterm.memory";

type BackgroundJobStatusInput =
  | BackgroundJob["status"]
  | "started"
  | "start"
  | "success"
  | "error"
  | "dead-letter";

export type BackgroundJobEventInput = {
  id?: string;
  timestamp?: number;
  jobName?: string;
  status?: BackgroundJobStatusInput;
  requestId?: string;
  source?: string;
  queue?: string;
  attempt?: number;
  maxAttempts?: number;
  nextRunAt?: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type BackgroundJobRunResult<T = unknown> = {
  job: BackgroundJob;
  output?: T;
  attempts: number;
  failed: boolean;
};

const compact = (value: unknown, fallback = "", limit = 500) => {
  const text =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? ""
        : JSON.stringify(value);
  return (text || fallback).replace(/\s+/g, " ").trim().slice(0, limit);
};

const positiveInt = (value: unknown, fallback: number, min = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.round(numeric));
};

const jobAnchorFor = (input: BackgroundJobEventInput, timestamp: number) =>
  compact(
    input.metadata?.jobKey ||
      input.metadata?.interactionId ||
      input.metadata?.toolCallId ||
      input.metadata?.conversationId ||
      input.metadata?.sessionId ||
      input.timestamp ||
      timestamp,
    "",
  );

export const normalizeBackgroundJobStatus = (
  status: BackgroundJobStatusInput | undefined,
): BackgroundJob["status"] => {
  if (status === "started" || status === "start") return "running";
  if (status === "success") return "completed";
  if (status === "error") return "failed";
  if (status === "dead-letter") return "dead_letter";
  if (
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "retry_scheduled" ||
    status === "dead_letter"
  ) {
    return status;
  }
  return "queued";
};

export const nextBackgroundJobFailureStatus = (
  attempt: number,
  maxAttempts: number,
): Extract<BackgroundJob["status"], "retry_scheduled" | "dead_letter"> =>
  positiveInt(attempt, 1) < positiveInt(maxAttempts, 1)
    ? "retry_scheduled"
    : "dead_letter";

export const backgroundJobIdFor = (
  input: BackgroundJobEventInput,
  timestamp = Date.now(),
) => {
  const requestId = compact(input.requestId, "local");
  const jobName = compact(input.jobName, "unknown_job");
  const anchor = jobAnchorFor(input, timestamp);
  return ["background-job", requestId, jobName, anchor]
    .filter(Boolean)
    .join(":");
};

export const createBackgroundJobRecord = (
  input: BackgroundJobEventInput,
  timestamp = Date.now(),
): BackgroundJob => {
  const maxAttempts = positiveInt(input.maxAttempts, 2);
  const attempt = Math.min(
    positiveInt(input.attempt, 1),
    Math.max(maxAttempts, 1),
  );

  return {
    id: input.id || backgroundJobIdFor(input, timestamp),
    timestamp: input.timestamp || timestamp,
    jobName: compact(input.jobName, "unknown_job"),
    status: normalizeBackgroundJobStatus(input.status),
    requestId: input.requestId,
    source: compact(input.source, "local_background"),
    queue: input.queue ? compact(input.queue) : input.queue,
    attempt,
    maxAttempts,
    nextRunAt: input.nextRunAt,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMs:
      input.durationMs === undefined
        ? undefined
        : Math.max(0, input.durationMs),
    inputSummary: input.inputSummary
      ? compact(input.inputSummary)
      : input.inputSummary,
    outputSummary: input.outputSummary
      ? compact(input.outputSummary)
      : input.outputSummary,
    error: input.error ? compact(input.error) : input.error,
    metadata: input.metadata,
  };
};

export const recordBackgroundJobEvent = async (
  input: BackgroundJobEventInput,
) => {
  const record = createBackgroundJobRecord(input);

  try {
    await db.backgroundJobs.put(record);
  } catch (error) {
    console.warn("[BackgroundJobs] write failed", error);
  }

  return record;
};

const errorSummary = (error: unknown) =>
  error instanceof Error ? error.message : compact(error, "Unknown error");

export const runBackgroundJob = async <T>(
  input: BackgroundJobEventInput,
  worker: (attempt: number) => Promise<T>,
): Promise<BackgroundJobRunResult<T>> => {
  const jobId = input.id || backgroundJobIdFor(input);
  const maxAttempts = positiveInt(input.maxAttempts, 2);
  const startedAt = Date.now();
  let lastJob = await recordBackgroundJobEvent({
    ...input,
    id: jobId,
    status: "queued",
    attempt: 1,
    maxAttempts,
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptStartedAt = Date.now();
    await recordBackgroundJobEvent({
      ...input,
      id: jobId,
      status: "running",
      attempt,
      maxAttempts,
      startedAt: attemptStartedAt,
    });

    try {
      const output = await worker(attempt);
      lastJob = await recordBackgroundJobEvent({
        ...input,
        id: jobId,
        status: "completed",
        attempt,
        maxAttempts,
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - attemptStartedAt,
        outputSummary:
          input.outputSummary || compact(output, "Background job completed."),
      });
      return {
        job: lastJob,
        output,
        attempts: attempt,
        failed: false,
      };
    } catch (error) {
      const status = nextBackgroundJobFailureStatus(attempt, maxAttempts);
      lastJob = await recordBackgroundJobEvent({
        ...input,
        id: jobId,
        status,
        attempt,
        maxAttempts,
        startedAt,
        completedAt: status === "dead_letter" ? Date.now() : undefined,
        durationMs: Date.now() - attemptStartedAt,
        error: errorSummary(error),
        nextRunAt: status === "retry_scheduled" ? Date.now() : undefined,
      });
    }
  }

  return {
    job: lastJob,
    attempts: maxAttempts,
    failed: true,
  };
};
