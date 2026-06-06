import type { PersistentConcept } from "./longterm.memory";
import { clamp01, type MasteryEvidenceType } from "./evidence.mastery";

export type LearnerAlgorithmId =
  | "bayesian_knowledge_tracing"
  | "decay_sensitive_bkt"
  | "conservative_threshold";

export type LearnerAlgorithmCandidate = {
  id: LearnerAlgorithmId;
  label: string;
  score: number;
  applicable: boolean;
  reason: string;
};

export type LearnerAlgorithmSelection = {
  selectedAlgorithm: LearnerAlgorithmId;
  selectedLabel: string;
  selectionReason: string;
  selectionConfidence: number;
  candidates: LearnerAlgorithmCandidate[];
  signals: {
    attemptCount: number;
    daysSinceReview: number | null;
    evidenceType: Exclude<MasteryEvidenceType, "model_summary">;
    evidenceContract: string;
    explicitBktTuning: boolean;
    correctnessSignal: "correct" | "incorrect";
  };
};

export type LearnerAlgorithmSelectionInput = {
  concept: PersistentConcept;
  isCorrect: boolean;
  evidenceType: Exclude<MasteryEvidenceType, "model_summary">;
  evidenceContract: string;
  explicitBktTuning?: boolean;
  timestamp?: number;
};

export type LearnerAlgorithmPosteriorInput = {
  concept: PersistentConcept;
  isCorrect: boolean;
  evidenceType: Exclude<MasteryEvidenceType, "model_summary">;
  selection: LearnerAlgorithmSelection;
  calculateBktPosterior: (concept: PersistentConcept) => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const roundScore = (value: number) =>
  Math.round(clamp01(value, 0) * 1000) / 1000;

const latestAttemptTimestamp = (concept: PersistentConcept) =>
  (concept.attempt_history || []).reduce(
    (latest, attempt) =>
      typeof attempt.timestamp === "number"
        ? Math.max(latest, attempt.timestamp)
        : latest,
    typeof concept.lastReviewedAt === "number" ? concept.lastReviewedAt : 0,
  );

const daysSinceLastReview = (
  concept: PersistentConcept,
  timestamp = Date.now(),
) => {
  const latest = latestAttemptTimestamp(concept);
  if (!latest) return null;
  return Math.max(0, Math.floor((timestamp - latest) / DAY_MS));
};

const algorithmLabel = (id: LearnerAlgorithmId) => {
  switch (id) {
    case "decay_sensitive_bkt":
      return "Decay-sensitive BKT";
    case "conservative_threshold":
      return "Conservative evidence threshold";
    case "bayesian_knowledge_tracing":
    default:
      return "Bayesian Knowledge Tracing";
  }
};

export const selectLearnerAlgorithm = (
  input: LearnerAlgorithmSelectionInput,
): LearnerAlgorithmSelection => {
  const attemptCount = input.concept.attempt_history?.length || 0;
  const daysSinceReview = daysSinceLastReview(input.concept, input.timestamp);
  const explicitBktTuning = input.explicitBktTuning === true;
  const sparseEvidence = attemptCount < 2;
  const staleEvidence =
    daysSinceReview !== null && daysSinceReview >= 7 && attemptCount >= 2;

  const rawCandidates: LearnerAlgorithmCandidate[] = [
    {
      id: "bayesian_knowledge_tracing",
      label: algorithmLabel("bayesian_knowledge_tracing"),
      applicable: true,
      score: roundScore(
        (explicitBktTuning ? 0.98 : 0.68) +
          Math.min(0.16, attemptCount * 0.03) +
          (input.evidenceType === "transfer" ? 0.04 : 0) -
          (sparseEvidence && !explicitBktTuning ? 0.12 : 0) -
          (staleEvidence ? 0.08 : 0),
      ),
      reason: explicitBktTuning
        ? "Admin/runtime BKT tuning is present, so the tuned BKT path is preferred."
        : "BKT is the default validated mastery model when there is enough attempt history.",
    },
    {
      id: "decay_sensitive_bkt",
      label: algorithmLabel("decay_sensitive_bkt"),
      applicable: staleEvidence,
      score: roundScore(
        staleEvidence
          ? 0.88 + Math.min(0.08, (daysSinceReview || 0) / 100)
          : 0.24,
      ),
      reason: staleEvidence
        ? "The concept has prior attempts but has not been reviewed recently, so retention decay should influence the update."
        : "Decay-sensitive BKT waits for both prior attempts and a meaningful review gap.",
    },
    {
      id: "conservative_threshold",
      label: algorithmLabel("conservative_threshold"),
      applicable: sparseEvidence && !explicitBktTuning,
      score: roundScore(
        (sparseEvidence && !explicitBktTuning ? 0.86 : 0.34) +
          (input.evidenceType === "recognition" ? 0.04 : 0) +
          (!input.isCorrect ? 0.03 : 0),
      ),
      reason:
        sparseEvidence && !explicitBktTuning
          ? "The learner has too little history for a confident probabilistic trace, so the first update stays conservative."
          : "The threshold path is reserved for sparse or fragile evidence.",
    },
  ];
  const candidates = [...rawCandidates].sort((a, b) => b.score - a.score);

  const selected =
    candidates.find((candidate) => candidate.applicable) || candidates[0];
  const runnerUp =
    candidates.find((candidate) => candidate.id !== selected.id) || selected;

  return {
    selectedAlgorithm: selected.id,
    selectedLabel: selected.label,
    selectionReason: selected.reason,
    selectionConfidence: roundScore(
      Math.max(0.55, Math.min(0.98, selected.score - runnerUp.score + 0.65)),
    ),
    candidates,
    signals: {
      attemptCount,
      daysSinceReview,
      evidenceType: input.evidenceType,
      evidenceContract: input.evidenceContract,
      explicitBktTuning,
      correctnessSignal: input.isCorrect ? "correct" : "incorrect",
    },
  };
};

const thresholdDeltaFor = (
  evidenceType: Exclude<MasteryEvidenceType, "model_summary">,
  isCorrect: boolean,
) => {
  if (!isCorrect) {
    return evidenceType === "transfer" ? -0.1 : -0.06;
  }
  if (evidenceType === "transfer") return 0.16;
  if (evidenceType === "generation") return 0.12;
  return 0.08;
};

const decayedConceptFor = (
  concept: PersistentConcept,
  selection: LearnerAlgorithmSelection,
): PersistentConcept => {
  const days = selection.signals.daysSinceReview || 0;
  const decayPenalty = Math.min(0.28, Math.max(0, days - 6) * 0.01);
  return {
    ...concept,
    p_learn: clamp01(concept.p_learn, 0.2) * (1 - decayPenalty),
  };
};

export const calculateLearnerAlgorithmPosterior = (
  input: LearnerAlgorithmPosteriorInput,
) => {
  if (input.selection.selectedAlgorithm === "conservative_threshold") {
    const previous = clamp01(input.concept.p_learn, 0.2);
    return clamp01(
      previous + thresholdDeltaFor(input.evidenceType, input.isCorrect),
      previous,
    );
  }

  if (input.selection.selectedAlgorithm === "decay_sensitive_bkt") {
    return input.calculateBktPosterior(
      decayedConceptFor(input.concept, input.selection),
    );
  }

  return input.calculateBktPosterior(input.concept);
};
