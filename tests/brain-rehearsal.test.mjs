import assert from "node:assert/strict";
import test from "node:test";

import {
  runLocalBrainWiringRehearsal,
  summarizeBrainWiringRehearsalGap,
} from "../.tmp-test/brain.rehearsal.mjs";
import { buildBetaDiagnosticsSnapshot } from "../.tmp-test/beta.diagnostics.mjs";

test("local brain wiring rehearsal proves shared contracts without persisting beta traffic", () => {
  const rehearsal = runLocalBrainWiringRehearsal(
    new Date("2026-06-03T00:00:00.000Z"),
  );

  assert.equal(rehearsal.generatedAt, "2026-06-03T00:00:00.000Z");
  assert.equal(rehearsal.localOnly, true);
  assert.equal(rehearsal.synthetic, true);
  assert.equal(rehearsal.evidenceSource, "synthetic_local_rehearsal");
  assert.equal(rehearsal.countsTowardBetaReadiness, false);
  assert.equal(rehearsal.persisted, false);
  assert.equal(rehearsal.liveCoverageMutated, false);
  assert.equal(rehearsal.status, "ready");
  assert.equal(rehearsal.coverage.status, "ready");
  assert.equal(rehearsal.coverage.coveragePercent, 100);
  assert.deepEqual(rehearsal.coverage.missingSignals, []);
  assert.equal(
    rehearsal.checks.every((check) => check.ready),
    true,
  );
  assert.deepEqual(rehearsal.documentIds, [
    "rehearsal-doc-active",
    "rehearsal-doc-companion",
  ]);
  assert.equal(rehearsal.chatRequestId, "rehearsal-chat-request");
  assert.equal(rehearsal.voiceRequestId, "rehearsal-voice-request");
  assert.equal(
    rehearsal.toolContracts.every((contract) => contract.ready),
    true,
  );
});

test("synthetic rehearsal cannot raise an empty live beta snapshot", () => {
  const rehearsal = runLocalBrainWiringRehearsal();
  const liveSnapshot = buildBetaDiagnosticsSnapshot({});

  assert.equal(rehearsal.status, "ready");
  assert.equal(rehearsal.countsTowardBetaReadiness, false);
  assert.equal(liveSnapshot.brainFlow.coveragePercent, 0);
  assert.equal(liveSnapshot.brainFlow.status, "watch");
  assert.equal(liveSnapshot.overallStatus, "needs_review");
});

test("local brain wiring rehearsal checks the shared typed-chat and voice tool contracts", () => {
  const rehearsal = runLocalBrainWiringRehearsal();

  for (const toolName of [
    "update_graph",
    "generate_flashcards",
    "evaluate_answer",
    "look_at_current_page",
    "web_search",
  ]) {
    assert.ok(rehearsal.chatToolNames.includes(toolName), toolName);
    assert.ok(rehearsal.voiceToolNames.includes(toolName), toolName);
  }
  assert.equal(
    rehearsal.checks.find((check) => check.id === "dual_agent_tools")?.ready,
    true,
  );
  assert.equal(
    rehearsal.checks.find((check) => check.id === "tool_schema_contracts")
      ?.ready,
    true,
  );
  assert.deepEqual(
    rehearsal.toolContracts.find(
      (contract) => contract.toolName === "update_graph",
    )?.sharedRequiredParameters,
    ["description", "name", "understandingDelta"],
  );
  assert.deepEqual(
    rehearsal.toolContracts.find(
      (contract) => contract.toolName === "evaluate_answer",
    )?.sharedRequiredParameters,
    ["conceptId", "learnerAnswer", "question"],
  );
});

test("local brain wiring rehearsal gap distinguishes synthetic and live proof", () => {
  const rehearsal = runLocalBrainWiringRehearsal();
  const liveSnapshot = buildBetaDiagnosticsSnapshot({});
  const gap = summarizeBrainWiringRehearsalGap(
    rehearsal,
    liveSnapshot.brainFlow,
  );

  assert.equal(gap.syntheticCoveragePercent, 100);
  assert.equal(gap.syntheticStatus, "ready");
  assert.equal(gap.liveCoveragePercent, 0);
  assert.equal(gap.liveStatus, "watch");
  assert.equal(gap.readyForProviderKeyRun, true);
  assert.ok(gap.liveMissingSignals.includes("Chat context injected"));
  assert.match(gap.summary, /live beta still needs/);
});
