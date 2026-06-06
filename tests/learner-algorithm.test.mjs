import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateLearnerAlgorithmPosterior,
  selectLearnerAlgorithm,
} from "../.tmp-test/learner.algorithm.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

const conceptRecord = (overrides = {}) => ({
  id: "bayes",
  name: "Bayes rule",
  description: "Updates belief after evidence.",
  mastery: 0.42,
  confidence: 0.4,
  p_learn: 0.42,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_history: [],
  decay_factor: 1,
  prerequisites: [],
  relatedConcepts: [],
  sourcePages: [],
  revisionCount: 0,
  lastReviewedAt: 0,
  firstLearnedAt: 0,
  linkedAnnotations: [],
  ...overrides,
});

test("learner algorithm selector keeps sparse first attempts conservative", () => {
  const selection = selectLearnerAlgorithm({
    concept: conceptRecord(),
    isCorrect: true,
    evidenceType: "generation",
    evidenceContract: "evaluated_answer_v1",
    timestamp: 1000,
  });

  assert.equal(selection.selectedAlgorithm, "conservative_threshold");
  assert.equal(selection.signals.attemptCount, 0);
  assert.equal(selection.signals.explicitBktTuning, false);
  assert.match(selection.selectionReason, /too little history/);

  const posterior = calculateLearnerAlgorithmPosterior({
    concept: conceptRecord(),
    isCorrect: true,
    evidenceType: "generation",
    selection,
    calculateBktPosterior: () => 0.99,
  });

  assert.ok(posterior > 0.42);
  assert.ok(posterior < 0.6);
});

test("learner algorithm selector chooses decay-sensitive BKT for stale reviewed concepts", () => {
  const now = 30 * DAY_MS;
  const selection = selectLearnerAlgorithm({
    concept: conceptRecord({
      p_learn: 0.8,
      lastReviewedAt: 5 * DAY_MS,
      attempt_history: [
        { correct: true, type: "generation", timestamp: 5 * DAY_MS },
        { correct: true, type: "transfer", timestamp: 6 * DAY_MS },
      ],
    }),
    isCorrect: false,
    evidenceType: "transfer",
    evidenceContract: "evaluated_answer_v1",
    timestamp: now,
  });

  assert.equal(selection.selectedAlgorithm, "decay_sensitive_bkt");
  assert.equal(selection.signals.daysSinceReview, 24);

  const posterior = calculateLearnerAlgorithmPosterior({
    concept: conceptRecord({ p_learn: 0.8 }),
    isCorrect: false,
    evidenceType: "transfer",
    selection,
    calculateBktPosterior: (candidateConcept) => candidateConcept.p_learn,
  });

  assert.ok(posterior < 0.8);
});

test("learner algorithm selector preserves explicit Admin BKT tuning", () => {
  const selection = selectLearnerAlgorithm({
    concept: conceptRecord(),
    isCorrect: true,
    evidenceType: "generation",
    evidenceContract: "evaluated_answer_v1",
    explicitBktTuning: true,
  });

  assert.equal(selection.selectedAlgorithm, "bayesian_knowledge_tracing");
  assert.equal(selection.signals.explicitBktTuning, true);
  assert.match(selection.selectionReason, /BKT tuning/);
});
