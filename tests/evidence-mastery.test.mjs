import test from "node:test";
import assert from "node:assert/strict";

import {
  confidenceFromUnderstandingDelta,
  gateModelSummaryMastery,
  isVerifiedMasteryEvidence,
  masteryFromEvidenceAttempt,
} from "../.tmp-test/evidence.mastery.mjs";

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
  assert.equal(isVerifiedMasteryEvidence("recognition"), true);
  assert.equal(masteryFromEvidenceAttempt("recognition", 0.9), 0.7);
  assert.equal(masteryFromEvidenceAttempt("generation", 0.9), 0.85);
  assert.equal(masteryFromEvidenceAttempt("transfer", 0.9), 0.9);
});
