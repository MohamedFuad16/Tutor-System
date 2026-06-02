import test from "node:test";
import assert from "node:assert/strict";

import { buildBKTConfidenceUpdate } from "../.tmp-test/bkt.engine.mjs";

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
