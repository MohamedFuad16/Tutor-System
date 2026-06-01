export const WEB_SEARCH_POLICIES = [
  "source_first",
  "manual_only",
  "auto_freshness",
] as const;

export type BrainWebSearchPolicy = (typeof WEB_SEARCH_POLICIES)[number];

export interface BrainRuntimeSettings {
  activityRefreshMs: number;
  memoryConceptLimit: number;
  toolIterationLimit: number;
  webSearchPolicy: BrainWebSearchPolicy;
}

export const BRAIN_RUNTIME_SETTING_LIMITS = {
  activityRefreshMs: { min: 3000, max: 30000, step: 1000 },
  memoryConceptLimit: { min: 4, max: 24, step: 1 },
  toolIterationLimit: { min: 2, max: 8, step: 1 },
} as const;

export const DEFAULT_BRAIN_RUNTIME_SETTINGS: BrainRuntimeSettings = {
  activityRefreshMs: 5000,
  memoryConceptLimit: 12,
  toolIterationLimit: 5,
  webSearchPolicy: "source_first",
};

const clampInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const normalizeWebSearchPolicy = (value: unknown): BrainWebSearchPolicy =>
  WEB_SEARCH_POLICIES.includes(value as BrainWebSearchPolicy)
    ? (value as BrainWebSearchPolicy)
    : DEFAULT_BRAIN_RUNTIME_SETTINGS.webSearchPolicy;

export function normalizeBrainRuntimeSettings(
  input?: Partial<BrainRuntimeSettings> | null,
): BrainRuntimeSettings {
  const value =
    input && typeof input === "object"
      ? (input as Partial<BrainRuntimeSettings>)
      : {};

  return {
    activityRefreshMs: clampInteger(
      value.activityRefreshMs,
      DEFAULT_BRAIN_RUNTIME_SETTINGS.activityRefreshMs,
      BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs.min,
      BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs.max,
    ),
    memoryConceptLimit: clampInteger(
      value.memoryConceptLimit,
      DEFAULT_BRAIN_RUNTIME_SETTINGS.memoryConceptLimit,
      BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit.min,
      BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit.max,
    ),
    toolIterationLimit: clampInteger(
      value.toolIterationLimit,
      DEFAULT_BRAIN_RUNTIME_SETTINGS.toolIterationLimit,
      BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit.min,
      BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit.max,
    ),
    webSearchPolicy: normalizeWebSearchPolicy(value.webSearchPolicy),
  };
}
