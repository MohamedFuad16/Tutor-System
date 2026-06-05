export const WEB_SEARCH_POLICIES = [
  "source_first",
  "manual_only",
  "auto_freshness",
] as const;

export type BrainWebSearchPolicy = (typeof WEB_SEARCH_POLICIES)[number];

export const MASTERY_EVIDENCE_POLICIES = [
  "validated_only",
  "review_required",
] as const;

export type MasteryEvidencePolicy = (typeof MASTERY_EVIDENCE_POLICIES)[number];

export interface BrainRuntimeSettings {
  activityRefreshMs: number;
  memoryConceptLimit: number;
  toolIterationLimit: number;
  webSearchPolicy: BrainWebSearchPolicy;
  masteryEvidencePolicy: MasteryEvidencePolicy;
  bktTransitProbability: number;
  bktSlipProbability: number;
  bktGuessProbability: number;
}

export const BRAIN_RUNTIME_SETTING_LIMITS = {
  activityRefreshMs: { min: 3000, max: 30000, step: 1000 },
  memoryConceptLimit: { min: 4, max: 24, step: 1 },
  toolIterationLimit: { min: 2, max: 8, step: 1 },
  bktTransitProbability: { min: 0.01, max: 0.35, step: 0.01 },
  bktSlipProbability: { min: 0.01, max: 0.35, step: 0.01 },
  bktGuessProbability: { min: 0.01, max: 0.35, step: 0.01 },
} as const;

export const DEFAULT_BRAIN_RUNTIME_SETTINGS: BrainRuntimeSettings = {
  activityRefreshMs: 5000,
  memoryConceptLimit: 12,
  toolIterationLimit: 5,
  webSearchPolicy: "source_first",
  masteryEvidencePolicy: "validated_only",
  bktTransitProbability: 0.1,
  bktSlipProbability: 0.1,
  bktGuessProbability: 0.2,
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

const normalizeMasteryEvidencePolicy = (
  value: unknown,
): MasteryEvidencePolicy =>
  MASTERY_EVIDENCE_POLICIES.includes(value as MasteryEvidencePolicy)
    ? (value as MasteryEvidencePolicy)
    : DEFAULT_BRAIN_RUNTIME_SETTINGS.masteryEvidencePolicy;

const clampProbability = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const clamped = Math.min(max, Math.max(min, numeric));
  return Math.round(clamped * 100) / 100;
};

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
    masteryEvidencePolicy: normalizeMasteryEvidencePolicy(
      value.masteryEvidencePolicy,
    ),
    bktTransitProbability: clampProbability(
      value.bktTransitProbability,
      DEFAULT_BRAIN_RUNTIME_SETTINGS.bktTransitProbability,
      BRAIN_RUNTIME_SETTING_LIMITS.bktTransitProbability.min,
      BRAIN_RUNTIME_SETTING_LIMITS.bktTransitProbability.max,
    ),
    bktSlipProbability: clampProbability(
      value.bktSlipProbability,
      DEFAULT_BRAIN_RUNTIME_SETTINGS.bktSlipProbability,
      BRAIN_RUNTIME_SETTING_LIMITS.bktSlipProbability.min,
      BRAIN_RUNTIME_SETTING_LIMITS.bktSlipProbability.max,
    ),
    bktGuessProbability: clampProbability(
      value.bktGuessProbability,
      DEFAULT_BRAIN_RUNTIME_SETTINGS.bktGuessProbability,
      BRAIN_RUNTIME_SETTING_LIMITS.bktGuessProbability.min,
      BRAIN_RUNTIME_SETTING_LIMITS.bktGuessProbability.max,
    ),
  };
}
