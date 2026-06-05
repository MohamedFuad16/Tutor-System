import {
  db,
  type EvidenceEvent,
  type MasteryDelta,
  type PersistentConcept,
} from "./longterm.memory";
import {
  clamp01,
  confidenceDeltaFromEvidenceAttempt,
  confidenceFromEvidenceAttempt,
  masteryFromEvidenceAttempt,
  type MasteryEvidenceType,
} from "./evidence.mastery";
import { createMasteryDeltaRecords } from "./evidence.ledger";
import {
  normalizeBrainRuntimeSettings,
  type BrainRuntimeSettings,
} from "../lib/brainRuntimeSettings";

export type ValidatedMasteryEvidenceContract =
  | "evaluated_answer_v1"
  | "flashcard_review_v1";

export type BKTAttemptOptions = {
  attemptId: string;
  evidenceContract: ValidatedMasteryEvidenceContract;
  source?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  runtimeSettings?: Partial<BrainRuntimeSettings> | null;
  bktParameters?: Partial<BKTParameters> | null;
};

export type BKTParameters = {
  p_transit: number;
  p_slip: number;
  p_guess: number;
};

export type MasteryCommitStore = {
  transaction: <T>(operation: () => Promise<T>) => Promise<T>;
  getConcept: (id: string) => Promise<PersistentConcept | undefined>;
  putConcept: (concept: PersistentConcept) => Promise<unknown>;
  getEvidenceEvent: (id: string) => Promise<EvidenceEvent | undefined>;
  getMasteryDelta: (id: string) => Promise<MasteryDelta | undefined>;
  addEvidenceEvent: (event: EvidenceEvent) => Promise<unknown>;
  addMasteryDelta: (delta: MasteryDelta) => Promise<unknown>;
};

// Default BKT Parameters for new concepts
export const DEFAULT_BKT = {
  p_learn_init: 0.2, // P(L0)
  p_transit: 0.1, // P(T) - chance to learn at each step
  p_slip: 0.1, // P(S) - chance of making a mistake despite knowing
  p_guess: 0.2, // P(G) - chance of guessing correctly without knowing
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const probabilityOrFallback = (value: unknown, fallback: number) =>
  clamp01(value, fallback);

const normalizeBKTParameterOverrides = (
  value: unknown,
): Partial<BKTParameters> | null => {
  const record = asRecord(value);
  if (!record) return null;

  const overrides: Partial<BKTParameters> = {};
  if ("p_transit" in record) {
    overrides.p_transit = probabilityOrFallback(
      record.p_transit,
      DEFAULT_BKT.p_transit,
    );
  }
  if ("p_slip" in record) {
    overrides.p_slip = probabilityOrFallback(record.p_slip, DEFAULT_BKT.p_slip);
  }
  if ("p_guess" in record) {
    overrides.p_guess = probabilityOrFallback(
      record.p_guess,
      DEFAULT_BKT.p_guess,
    );
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
};

export const bktParametersFromRuntimeSettings = (
  settings?: Partial<BrainRuntimeSettings> | null,
): BKTParameters | null => {
  if (!settings || typeof settings !== "object") return null;
  const normalized = normalizeBrainRuntimeSettings(settings);
  return {
    p_transit: normalized.bktTransitProbability,
    p_slip: normalized.bktSlipProbability,
    p_guess: normalized.bktGuessProbability,
  };
};

const bktParameterOverridesFromOptions = (
  options: BKTAttemptOptions,
): Partial<BKTParameters> | null => {
  const metadata = asRecord(options.metadata);
  const metadataRuntimeSettings = asRecord(metadata?.runtimeSettings);
  const runtimeSettings =
    bktParametersFromRuntimeSettings(options.runtimeSettings) ||
    bktParametersFromRuntimeSettings(metadataRuntimeSettings);
  const explicitOverrides = normalizeBKTParameterOverrides(
    options.bktParameters,
  );

  const overrides = {
    ...(runtimeSettings || {}),
    ...(explicitOverrides || {}),
  };

  return Object.keys(overrides).length > 0 ? overrides : null;
};

export const resolveBKTParameters = (
  concept: PersistentConcept,
  overrides?: Partial<BKTParameters> | null,
) => ({
  p_learn: probabilityOrFallback(concept.p_learn, DEFAULT_BKT.p_learn_init),
  p_transit: probabilityOrFallback(
    overrides?.p_transit ?? concept.p_transit,
    DEFAULT_BKT.p_transit,
  ),
  p_slip: probabilityOrFallback(
    overrides?.p_slip ?? concept.p_slip,
    DEFAULT_BKT.p_slip,
  ),
  p_guess: probabilityOrFallback(
    overrides?.p_guess ?? concept.p_guess,
    DEFAULT_BKT.p_guess,
  ),
});

export const buildBKTConfidenceUpdate = (
  currentConfidence: unknown,
  type: Exclude<MasteryEvidenceType, "model_summary">,
  isCorrect: boolean,
) => {
  const previousConfidence = clamp01(currentConfidence, 0);
  const confidenceSignal = confidenceDeltaFromEvidenceAttempt(type, isCorrect);
  const nextConfidence = confidenceFromEvidenceAttempt(
    previousConfidence,
    type,
    isCorrect,
  );

  return {
    previousConfidence,
    nextConfidence,
    confidenceDelta: nextConfidence - previousConfidence,
    confidenceSignal,
    confidenceSource: "validated_recall_attempt",
  };
};

const validatedAttemptId = (options: BKTAttemptOptions) => {
  const attemptId = options.attemptId.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!attemptId) {
    throw new Error("Validated mastery attempts require an attempt id.");
  }
  if (
    options.evidenceContract !== "evaluated_answer_v1" &&
    options.evidenceContract !== "flashcard_review_v1"
  ) {
    throw new Error(
      "Validated mastery attempts require a recognized evidence contract.",
    );
  }
  return attemptId;
};

const dexieMasteryCommitStore: MasteryCommitStore = {
  transaction: async <T>(operation: () => Promise<T>) =>
    await db.transaction(
      "rw",
      db.concepts,
      db.evidenceEvents,
      db.masteryDeltas,
      operation,
    ),
  getConcept: (id) => db.concepts.get(id),
  putConcept: (concept) => db.concepts.put(concept),
  getEvidenceEvent: (id) => db.evidenceEvents.get(id),
  getMasteryDelta: (id) => db.masteryDeltas.get(id),
  addEvidenceEvent: (event) => db.evidenceEvents.add(event),
  addMasteryDelta: (delta) => db.masteryDeltas.add(delta),
};

export const commitValidatedMasteryAttempt = async (
  input: {
    conceptId: string;
    isCorrect: boolean;
    type: "recognition" | "generation" | "transfer";
    options: BKTAttemptOptions;
    calculatePosterior: (
      concept: PersistentConcept,
      isCorrect: boolean,
    ) => number;
    posteriorMetadata?: (
      concept: PersistentConcept,
      isCorrect: boolean,
      posterior: number,
    ) => Record<string, unknown>;
    timestamp?: number;
  },
  store: MasteryCommitStore = dexieMasteryCommitStore,
) => {
  const attemptId = validatedAttemptId(input.options);
  const deltaId = `mastery-delta:${attemptId}`;
  const timestamp = input.timestamp ?? Date.now();

  return await store.transaction(async () => {
    const existingDelta = await store.getMasteryDelta(deltaId);
    if (existingDelta) {
      const existingConcept = await store.getConcept(input.conceptId);
      const existingEvidence = await store.getEvidenceEvent(
        existingDelta.evidenceEventId,
      );
      const existingAttempt = existingConcept?.attempt_history.find(
        (attempt) => attempt.attemptId === attemptId,
      );
      if (
        !existingConcept ||
        !existingEvidence ||
        !existingAttempt ||
        existingDelta.attemptId !== attemptId ||
        existingDelta.conceptId !== input.conceptId ||
        existingDelta.evidenceType !== input.type ||
        existingDelta.correct !== input.isCorrect ||
        existingDelta.verified !== true ||
        existingEvidence.attemptId !== attemptId ||
        existingEvidence.conceptId !== input.conceptId ||
        existingEvidence.evidenceType !== input.type ||
        existingEvidence.correct !== input.isCorrect ||
        existingEvidence.verified !== true ||
        existingAttempt.type !== input.type ||
        existingAttempt.correct !== input.isCorrect ||
        existingAttempt.evidenceEventId !== existingEvidence.id ||
        existingAttempt.masteryDeltaId !== existingDelta.id ||
        existingAttempt.evidenceContract !== input.options.evidenceContract ||
        existingEvidence.metadata?.evidenceContract !==
          input.options.evidenceContract
      ) {
        throw new Error(
          "Validated mastery replay has incomplete or mismatched audit rows.",
        );
      }
      return existingConcept;
    }

    const concept = await store.getConcept(input.conceptId);
    if (!concept) return null;

    const previousMastery = concept.mastery;
    const previousPLearn = concept.p_learn;
    const posterior = input.calculatePosterior(concept, input.isCorrect);
    const posteriorMetadata =
      input.posteriorMetadata?.(concept, input.isCorrect, posterior) || {};
    const confidenceUpdate = buildBKTConfidenceUpdate(
      concept.confidence,
      input.type,
      input.isCorrect,
    );
    const cappedPosterior = masteryFromEvidenceAttempt(input.type, posterior);
    const records = createMasteryDeltaRecords(
      {
        attemptId,
        conceptId: input.conceptId,
        evidenceType: input.type,
        correct: input.isCorrect,
        previousMastery,
        nextMastery: cappedPosterior,
        previousPLearn,
        nextPLearn: cappedPosterior,
        source: input.options.source || "bkt_attempt",
        summary:
          input.options.summary ||
          `${input.type} recall attempt was ${
            input.isCorrect ? "correct" : "incorrect"
          }`,
        metadata: {
          ...input.options.metadata,
          evidenceContract: input.options.evidenceContract,
          masteryAttemptId: attemptId,
          posterior,
          cappedPosterior,
          attemptCount: concept.attempt_history.length + 1,
          ...posteriorMetadata,
          ...confidenceUpdate,
        },
      },
      timestamp,
    );
    const nextConcept: PersistentConcept = {
      ...concept,
      p_learn: cappedPosterior,
      mastery: cappedPosterior,
      confidence: confidenceUpdate.nextConfidence,
      attempt_history: [
        ...concept.attempt_history,
        {
          correct: input.isCorrect,
          type: input.type,
          timestamp,
          attemptId,
          evidenceEventId: records.event.id,
          masteryDeltaId: records.delta.id,
          evidenceContract: input.options.evidenceContract,
        },
      ],
      lastReviewedAt: timestamp,
    };

    await store.addEvidenceEvent(records.event);
    await store.addMasteryDelta(records.delta);
    await store.putConcept(nextConcept);
    return nextConcept;
  });
};

export class BKTEngine {
  /**
   * Calculate Bayesian Knowledge Tracing update
   */
  public calculatePosterior(
    concept: PersistentConcept,
    isCorrect: boolean,
    parameterOverrides?: Partial<BKTParameters> | null,
  ): number {
    const { p_learn, p_transit, p_slip, p_guess } = resolveBKTParameters(
      concept,
      parameterOverrides,
    );

    // Probability of observing the current result given the state
    let p_obs_given_learned = isCorrect ? 1 - p_slip : p_slip;
    let p_obs_given_unlearned = isCorrect ? p_guess : 1 - p_guess;

    // Probability of the observation
    let p_obs =
      p_learn * p_obs_given_learned + (1 - p_learn) * p_obs_given_unlearned;

    // Filtered probability (P of knowing given the observation)
    let p_learn_given_obs =
      (p_learn * p_obs_given_learned) / Math.max(0.0001, p_obs);

    // Update with transit (learning rate)
    let p_learn_next = p_learn_given_obs + (1 - p_learn_given_obs) * p_transit;

    return Math.max(0, Math.min(1, p_learn_next));
  }

  public async updateConceptAttempt(
    conceptId: string,
    isCorrect: boolean,
    type: "recognition" | "generation" | "transfer",
    options: BKTAttemptOptions,
    store: MasteryCommitStore = dexieMasteryCommitStore,
  ) {
    const parameterOverrides = bktParameterOverridesFromOptions(options);

    return await commitValidatedMasteryAttempt(
      {
        conceptId,
        isCorrect,
        type,
        options,
        calculatePosterior: (concept, correct) =>
          this.calculatePosterior(concept, correct, parameterOverrides),
        posteriorMetadata: (concept) => ({
          bktParameters: resolveBKTParameters(concept, parameterOverrides),
          bktRuntimeSettingsApplied: Boolean(parameterOverrides),
        }),
      },
      store,
    );
  }
}

export const bktEngine = new BKTEngine();
