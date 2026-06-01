import test from "node:test";
import assert from "node:assert/strict";

import {
  confidenceFromUnderstandingDelta,
  gateModelSummaryMastery,
  isDirectRecallEvidence,
  isVerifiedMasteryEvidence,
  masteryFromEvidenceAttempt,
} from "../.tmp-test/evidence.mastery.mjs";
import {
  createMasteryDeltaRecords,
  createModelSummaryEvidenceRecord,
} from "../.tmp-test/evidence.ledger.mjs";

test("model summaries cannot raise mastery", () => {
  assert.equal(gateModelSummaryMastery(0.2, 0.95), 0.2);
  assert.equal(gateModelSummaryMastery(undefined, 0.75), 0);
});

test("confidence can move separately from evidence-gated mastery", () => {
  assert.ok(Math.abs(confidenceFromUnderstandingDelta(0.4, 0.2) - 0.6) < 0.001);
  assert.equal(confidenceFromUnderstandingDelta(0.1, -0.4), 0);
});

test("only explicit recall evidence can raise mastery through BKT caps", () => {
  assert.equal(isVerifiedMasteryEvidence("model_summary"), false);
  assert.equal(isDirectRecallEvidence("model_summary"), false);
  assert.equal(isDirectRecallEvidence("recognition"), true);
  assert.equal(isVerifiedMasteryEvidence("recognition"), true);
  assert.equal(masteryFromEvidenceAttempt("recognition", 0.9), 0.7);
  assert.equal(masteryFromEvidenceAttempt("generation", 0.9), 0.85);
  assert.equal(masteryFromEvidenceAttempt("transfer", 0.9), 0.9);
});

test("model-summary evidence records are durable but not mastery evidence", () => {
  const event = createModelSummaryEvidenceRecord(
    {
      conceptId: "bayes",
      source: "chat_graph_update",
      summary: "Model noticed the learner discussed Bayes rule.",
      confidence: 0.7,
      metadata: { proposedMastery: 0.9, acceptedMastery: 0.2 },
    },
    123,
  );

  assert.equal(event.evidenceType, "model_summary");
  assert.equal(event.verified, false);
  assert.equal(event.conceptId, "bayes");
  assert.equal(event.confidence, 0.7);
});

test("mastery delta records link explicit evidence to BKT changes", () => {
  const { event, delta } = createMasteryDeltaRecords(
    {
      conceptId: "bayes",
      evidenceType: "generation",
      correct: true,
      previousMastery: 0.2,
      nextMastery: 0.81,
      previousPLearn: 0.25,
      nextPLearn: 0.81,
      source: "bkt_attempt",
      summary: "generation recall attempt was correct",
    },
    456,
  );

  assert.equal(event.verified, true);
  assert.equal(delta.evidenceEventId, event.id);
  assert.equal(delta.evidenceType, "generation");
  assert.ok(Math.abs(delta.delta - 0.61) < 0.001);
});
