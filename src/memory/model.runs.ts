import { db, type ModelRun } from "./longterm.memory";

type ModelRunStatusInput =
  | ModelRun["status"]
  | "start"
  | "running"
  | "success"
  | "complete"
  | "error";

export type ModelRunEventInput = {
  id?: string;
  timestamp?: number;
  status?: ModelRunStatusInput;
  provider?: string;
  source?: string;
  requestId?: string;
  requestedModel?: string;
  usedModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  estimated?: boolean;
  durationMs?: number;
  memoryContextChars?: number;
  sourceMaterialRequest?: boolean;
  requestedWebSearch?: boolean;
  webSources?: number;
  graphUpdates?: number;
  flashcards?: number;
  iterations?: number;
  error?: string;
  runtimeSettings?: Record<string, unknown>;
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

const nonNegativeNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : undefined;
};

const idPart = (value: unknown, fallback = "") =>
  compact(value, fallback)
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

export const normalizeModelRunStatus = (
  status: ModelRunStatusInput | undefined,
): ModelRun["status"] => {
  if (status === "start" || status === "running") return "started";
  if (status === "success" || status === "complete") return "completed";
  if (status === "error") return "failed";
  if (
    status === "started" ||
    status === "completed" ||
    status === "failed" ||
    status === "blocked" ||
    status === "fallback"
  ) {
    return status;
  }
  return "started";
};

export const modelRunIdFor = (input: ModelRunEventInput) => {
  const requestId = idPart(input.requestId, "local");
  const source = idPart(input.source, "chat_stream");
  const status = normalizeModelRunStatus(input.status);
  const model = idPart(input.usedModel || input.requestedModel);
  return ["model-run", source, requestId, status, model]
    .filter(Boolean)
    .join(":");
};

export const createModelRunRecord = (
  input: ModelRunEventInput,
  timestamp = Date.now(),
): ModelRun => ({
  id: input.id || modelRunIdFor(input),
  timestamp: input.timestamp || timestamp,
  status: normalizeModelRunStatus(input.status),
  provider: compact(input.provider, "openrouter"),
  source: compact(input.source, "chat_stream"),
  requestId: input.requestId,
  requestedModel: input.requestedModel
    ? compact(input.requestedModel)
    : input.requestedModel,
  usedModel: input.usedModel ? compact(input.usedModel) : input.usedModel,
  inputTokens: nonNegativeNumber(input.inputTokens),
  outputTokens: nonNegativeNumber(input.outputTokens),
  cost: nonNegativeNumber(input.cost),
  estimated:
    input.estimated === undefined ? undefined : Boolean(input.estimated),
  durationMs: nonNegativeNumber(input.durationMs),
  memoryContextChars: nonNegativeNumber(input.memoryContextChars),
  sourceMaterialRequest:
    input.sourceMaterialRequest === undefined
      ? undefined
      : Boolean(input.sourceMaterialRequest),
  requestedWebSearch:
    input.requestedWebSearch === undefined
      ? undefined
      : Boolean(input.requestedWebSearch),
  webSources: nonNegativeNumber(input.webSources),
  graphUpdates: nonNegativeNumber(input.graphUpdates),
  flashcards: nonNegativeNumber(input.flashcards),
  iterations: nonNegativeNumber(input.iterations),
  error: input.error ? compact(input.error) : input.error,
  runtimeSettings: input.runtimeSettings,
  metadata: input.metadata,
});

export const recordModelRunEvent = async (input: ModelRunEventInput) => {
  const record = createModelRunRecord(input);

  try {
    await db.modelRuns.put(record);
  } catch (error) {
    console.warn("[ModelRuns] write failed", error);
  }

  return record;
};
