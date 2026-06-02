export type MasteryEvidenceType =
  | "model_summary"
  | "recognition"
  | "generation"
  | "transfer";

const VERIFIED_MASTERY_EVIDENCE = new Set<MasteryEvidenceType>([
  "recognition",
  "generation",
  "transfer",
]);

const TYPE_CAPS: Record<
  Exclude<MasteryEvidenceType, "model_summary">,
  number
> = {
  recognition: 0.7,
  generation: 0.85,
  transfer: 0.95,
};

export const clamp01 = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
};

export const isVerifiedMasteryEvidence = (
  type: MasteryEvidenceType,
  isCorrect = true,
) => VERIFIED_MASTERY_EVIDENCE.has(type) && isCorrect;

export const isDirectRecallEvidence = (type: MasteryEvidenceType) =>
  VERIFIED_MASTERY_EVIDENCE.has(type);

export const gateModelSummaryMastery = (
  currentMastery: unknown,
  _proposedMastery?: unknown,
) => clamp01(currentMastery, 0);

export const confidenceFromModelSummary = (
  currentConfidence: unknown,
  _proposedConfidence: unknown,
) => clamp01(currentConfidence, 0);

export const confidenceFromUnderstandingDelta = (
  currentConfidence: unknown,
  understandingDelta: unknown,
) => {
  const current = clamp01(currentConfidence, 0);
  const delta = Math.max(-0.2, Math.min(0.2, Number(understandingDelta) || 0));
  return Math.max(0, Math.min(1, current + delta));
};

export const masteryFromEvidenceAttempt = (
  type: Exclude<MasteryEvidenceType, "model_summary">,
  posterior: unknown,
) => Math.min(clamp01(posterior, 0), TYPE_CAPS[type]);
