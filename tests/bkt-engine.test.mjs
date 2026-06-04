import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBKTConfidenceUpdate,
  commitValidatedMasteryAttempt,
} from "../.tmp-test/bkt.engine.mjs";

const conceptRecord = () => ({
  id: "bayes",
  name: "Bayes rule",
  description: "Updates belief after evidence.",
  mastery: 0.2,
  confidence: 0.3,
  p_learn: 0.2,
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
});

const createTransactionalStore = ({ failAt } = {}) => {
  const state = {
    concepts: new Map([["bayes", conceptRecord()]]),
    evidenceEvents: new Map(),
    masteryDeltas: new Map(),
  };
  const snapshot = () => structuredClone(state);
  const restore = (next) => {
    state.concepts = next.concepts;
    state.evidenceEvents = next.evidenceEvents;
    state.masteryDeltas = next.masteryDeltas;
  };
  const store = {
    async transaction(operation) {
      const before = snapshot();
      try {
        return await operation();
      } catch (error) {
        restore(before);
        throw error;
      }
    },
    async getConcept(id) {
      return state.concepts.get(id);
    },
    async putConcept(concept) {
      if (failAt === "concept") throw new Error("concept write failed");
      state.concepts.set(concept.id, concept);
    },
    async getEvidenceEvent(id) {
      return state.evidenceEvents.get(id);
    },
    async getMasteryDelta(id) {
      return state.masteryDeltas.get(id);
    },
    async addEvidenceEvent(event) {
      if (failAt === "evidence") throw new Error("evidence write failed");
      state.evidenceEvents.set(event.id, event);
    },
    async addMasteryDelta(delta) {
      if (failAt === "delta") throw new Error("delta write failed");
      state.masteryDeltas.set(delta.id, delta);
    },
  };
  return { state, store };
};

const validatedAttempt = (overrides = {}) => ({
  conceptId: "bayes",
  isCorrect: true,
  type: "generation",
  options: {
    attemptId: "chat-1:tool-1:bayes",
    evidenceContract: "evaluated_answer_v1",
    source: "chat_tool_evaluate_answer",
    metadata: { requestId: "chat-1" },
  },
  calculatePosterior: () => 0.8,
  timestamp: 123,
  ...overrides,
});

test("BKT confidence updates are driven by validated recall attempts", () => {
  const correctGeneration = buildBKTConfidenceUpdate(0.4, "generation", true);

  assert.equal(correctGeneration.previousConfidence, 0.4);
  assert.ok(Math.abs(correctGeneration.nextConfidence - 0.48) < 0.001);
  assert.ok(Math.abs(correctGeneration.confidenceDelta - 0.08) < 0.001);
  assert.equal(correctGeneration.confidenceSignal, 0.08);
  assert.equal(correctGeneration.confidenceSource, "validated_recall_attempt");

  const missedTransfer = buildBKTConfidenceUpdate(0.4, "transfer", false);

  assert.ok(Math.abs(missedTransfer.nextConfidence - 0.24) < 0.001);
  assert.ok(Math.abs(missedTransfer.confidenceDelta + 0.16) < 0.001);
  assert.equal(missedTransfer.confidenceSignal, -0.16);
});

test("validated mastery commits concept, evidence, and delta atomically", async () => {
  const { state, store } = createTransactionalStore();
  const result = await commitValidatedMasteryAttempt(validatedAttempt(), store);

  assert.equal(result.attempt_history.length, 1);
  assert.equal(state.concepts.get("bayes").mastery, 0.8);
  assert.equal(state.evidenceEvents.size, 1);
  assert.equal(state.masteryDeltas.size, 1);

  const event = [...state.evidenceEvents.values()][0];
  const delta = [...state.masteryDeltas.values()][0];
  assert.equal(event.attemptId, "chat-1:tool-1:bayes");
  assert.equal(delta.attemptId, event.attemptId);
  assert.equal(delta.evidenceEventId, event.id);
  assert.equal(event.metadata.masteryMutationAllowed, true);
  assert.deepEqual(result.attempt_history[0], {
    correct: true,
    type: "generation",
    timestamp: 123,
    attemptId: "chat-1:tool-1:bayes",
    evidenceEventId: event.id,
    masteryDeltaId: delta.id,
    evidenceContract: "evaluated_answer_v1",
  });
});

test("validated mastery commit rolls back all rows when the ledger fails", async () => {
  const { state, store } = createTransactionalStore({ failAt: "delta" });

  await assert.rejects(
    commitValidatedMasteryAttempt(validatedAttempt(), store),
    /delta write failed/,
  );

  assert.equal(state.concepts.get("bayes").mastery, 0.2);
  assert.equal(state.concepts.get("bayes").attempt_history.length, 0);
  assert.equal(state.evidenceEvents.size, 0);
  assert.equal(state.masteryDeltas.size, 0);
});

test("validated mastery commit ignores duplicate attempt replays", async () => {
  const { state, store } = createTransactionalStore();

  await commitValidatedMasteryAttempt(validatedAttempt(), store);
  await commitValidatedMasteryAttempt(
    validatedAttempt({ timestamp: 456 }),
    store,
  );

  assert.equal(state.concepts.get("bayes").attempt_history.length, 1);
  assert.equal(state.evidenceEvents.size, 1);
  assert.equal(state.masteryDeltas.size, 1);
});

test("validated mastery replay fails closed when audit rows are incomplete", async () => {
  const { state, store } = createTransactionalStore();

  await commitValidatedMasteryAttempt(validatedAttempt(), store);
  state.evidenceEvents.clear();

  await assert.rejects(
    commitValidatedMasteryAttempt(validatedAttempt(), store),
    /incomplete or mismatched audit rows/,
  );

  assert.equal(state.concepts.get("bayes").attempt_history.length, 1);
  assert.equal(state.evidenceEvents.size, 0);
  assert.equal(state.masteryDeltas.size, 1);
});

test("validated mastery replay fails closed when concept history conflicts", async () => {
  const { state, store } = createTransactionalStore();

  await commitValidatedMasteryAttempt(validatedAttempt(), store);
  state.concepts.get("bayes").attempt_history[0].correct = false;

  await assert.rejects(
    commitValidatedMasteryAttempt(validatedAttempt(), store),
    /incomplete or mismatched audit rows/,
  );
});

test("raw mastery attempts without a validated evidence contract fail closed", async () => {
  const { state, store } = createTransactionalStore();

  await assert.rejects(
    commitValidatedMasteryAttempt(
      validatedAttempt({
        options: {
          attemptId: "raw-attempt",
          evidenceContract: "model_summary_v1",
        },
      }),
      store,
    ),
    /recognized evidence contract/,
  );

  assert.equal(state.concepts.get("bayes").attempt_history.length, 0);
  assert.equal(state.evidenceEvents.size, 0);
  assert.equal(state.masteryDeltas.size, 0);
});
