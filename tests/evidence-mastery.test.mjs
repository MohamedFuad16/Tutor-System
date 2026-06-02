import test from "node:test";
import assert from "node:assert/strict";

import {
  confidenceDeltaFromEvidenceAttempt,
  confidenceFromEvidenceAttempt,
  confidenceFromModelSummary,
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

test("model summaries cannot raise learner confidence", () => {
  assert.equal(confidenceFromModelSummary(0.25, 0.95), 0.25);
  assert.equal(confidenceFromModelSummary(undefined, 0.8), 0);
});

test("confidence can move separately from evidence-gated mastery", () => {
  assert.ok(Math.abs(confidenceFromUnderstandingDelta(0.4, 0.2) - 0.6) < 0.001);
  assert.equal(confidenceFromUnderstandingDelta(0.1, -0.4), 0);
});

test("validated recall evidence moves confidence conservatively", () => {
  assert.equal(confidenceDeltaFromEvidenceAttempt("recognition", true), 0.04);
  assert.equal(confidenceDeltaFromEvidenceAttempt("generation", true), 0.08);
  assert.equal(confidenceDeltaFromEvidenceAttempt("transfer", true), 0.12);
  assert.equal(confidenceDeltaFromEvidenceAttempt("recognition", false), -0.08);
  assert.equal(confidenceDeltaFromEvidenceAttempt("generation", false), -0.12);
  assert.equal(confidenceDeltaFromEvidenceAttempt("transfer", false), -0.16);
  assert.ok(
    Math.abs(confidenceFromEvidenceAttempt(0.5, "generation", true) - 0.58) <
      0.001,
  );
  assert.ok(
    Math.abs(confidenceFromEvidenceAttempt(0.5, "transfer", false) - 0.34) <
      0.001,
  );
  assert.equal(confidenceFromEvidenceAttempt(0.98, "transfer", true), 1);
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
      metadata: {
        proposedMastery: 0.9,
        acceptedMastery: 0.2,
        proposedConfidence: 0.9,
        acceptedConfidence: 0.2,
        confidenceGate: "model_summary_no_confidence_increase",
      },
    },
    123,
  );

  assert.equal(event.evidenceType, "model_summary");
  assert.equal(event.verified, false);
  assert.equal(event.conceptId, "bayes");
  assert.equal(event.confidence, 0.7);
  assert.equal(
    event.metadata.confidenceGate,
    "model_summary_no_confidence_increase",
  );
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
      metadata: {
        confidenceSource: "validated_recall_attempt",
        previousConfidence: 0.3,
        nextConfidence: 0.38,
        confidenceDelta: 0.08,
      },
    },
    456,
  );

  assert.equal(event.verified, true);
  assert.equal(delta.evidenceEventId, event.id);
  assert.equal(delta.evidenceType, "generation");
  assert.ok(Math.abs(delta.delta - 0.61) < 0.001);
  assert.equal(event.metadata.confidenceSource, "validated_recall_attempt");
  assert.equal(event.metadata.nextConfidence, 0.38);
});
