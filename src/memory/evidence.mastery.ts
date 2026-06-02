export type MasteryEvidenceType =
  | "model_summary"
  | "recognition"
  | "generation"
  | "transfer";

export const MODEL_OBSERVATION_EVIDENCE_CONTRACT =
  "model_observation_v1" as const;

export const MODEL_SUMMARY_CONFIDENCE_GATE =
  "model_summary_no_confidence_increase" as const;

export const MODEL_SUMMARY_MASTERY_GATE =
  "model_summary_no_mastery_increase" as const;

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

const CONFIDENCE_ATTEMPT_DELTAS: Record<
  Exclude<MasteryEvidenceType, "model_summary">,
  { correct: number; incorrect: number }
> = {
  recognition: {
    correct: 0.04,
    incorrect: -0.08,
  },
  generation: {
    correct: 0.08,
    incorrect: -0.12,
  },
  transfer: {
    correct: 0.12,
    incorrect: -0.16,
  },
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

export const modelObservationGateMetadata = (
  metadata: Record<string, unknown> = {},
) => ({
  ...metadata,
  evidenceContract: MODEL_OBSERVATION_EVIDENCE_CONTRACT,
  evidenceRole: "model_observation",
  evidenceType: "model_summary",
  evidenceVerified: false,
  masteryMutationAllowed: false,
  confidenceMutationAllowed: false,
  confidenceGate: MODEL_SUMMARY_CONFIDENCE_GATE,
  masteryGate: MODEL_SUMMARY_MASTERY_GATE,
});

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

export const confidenceDeltaFromEvidenceAttempt = (
  type: Exclude<MasteryEvidenceType, "model_summary">,
  isCorrect: boolean,
) => {
  const deltas = CONFIDENCE_ATTEMPT_DELTAS[type];
  return isCorrect ? deltas.correct : deltas.incorrect;
};

export const confidenceFromEvidenceAttempt = (
  currentConfidence: unknown,
  type: Exclude<MasteryEvidenceType, "model_summary">,
  isCorrect: boolean,
) =>
  confidenceFromUnderstandingDelta(
    currentConfidence,
    confidenceDeltaFromEvidenceAttempt(type, isCorrect),
  );

export const masteryFromEvidenceAttempt = (
  type: Exclude<MasteryEvidenceType, "model_summary">,
  posterior: unknown,
) => Math.min(clamp01(posterior, 0), TYPE_CAPS[type]);
