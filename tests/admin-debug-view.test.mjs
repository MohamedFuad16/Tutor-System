import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminViewSource = readFileSync(
  new URL("../src/views/AdminView.tsx", import.meta.url),
  "utf8",
);

test("Admin keeps four primary operator views and advanced debug routes wired", () => {
  for (const tab of [
    { id: "learners", label: "Learners" },
    { id: "activity", label: "Activity" },
    { id: "evidence", label: "Evidence" },
    { id: "diagnostics", label: "Readiness" },
  ]) {
    assert.match(
      adminViewSource,
      new RegExp(`\\{ id: "${tab.id}", label: "${tab.label}"`),
    );
  }

  assert.match(adminViewSource, /System Activity/);
  assert.match(adminViewSource, /Beta Diagnostics/);
  assert.match(adminViewSource, /Advanced debugging/);
  assert.match(adminViewSource, /DeepSeek Trace/);
  assert.match(adminViewSource, /Server Console/);
  assert.match(adminViewSource, /Activity Events/);
  assert.match(adminViewSource, /Server console is offline/);
});

test("Admin activity views fetch the local debug ledger with token-aware headers", () => {
  assert.match(
    adminViewSource,
    /activeTab === "learners" \|\|\s+activeTab === "brain" \|\|\s+activeTab === "activity" \|\|\s+activeTab === "diagnostics"/,
  );
  assert.match(
    adminViewSource,
    /serverApiUrl\("\/api\/debug\/system-activity"\)/,
  );
  assert.match(adminViewSource, /readDebugToken\(\)/);
  assert.match(adminViewSource, /"X-Debug-Token": debugToken/);
  assert.match(adminViewSource, /tutor_debug_token/);
  assert.match(adminViewSource, /serverWsUrl\(\).*\/ws\/debug/s);
});

test("Admin beta diagnostics are built from the same local activity rows shown in debug views", () => {
  assert.match(adminViewSource, /buildBrainFlowCoverageFromLedgers\(\{/);
  assert.match(adminViewSource, /buildCoherentLiveProofFromLedgers\(/);
  assert.match(
    adminViewSource,
    /systemActivityEvents: activityPayload\?\.events \|\| \[\]/,
  );
  assert.match(adminViewSource, /buildBetaDiagnosticsSnapshot\(\{/);
  assert.match(adminViewSource, /buildBetaDiagnosticsExport\(\{/);
  assert.match(adminViewSource, /sourceReadyForBeta/);
  assert.match(
    adminViewSource,
    /Graphify remains the separate code architecture/,
  );
});

test("Admin learner brain overview exposes the local selector and proof path", () => {
  assert.match(adminViewSource, /admin-brain-control-room/);
  assert.match(adminViewSource, /admin-learner-algorithm-selector/);
  assert.match(adminViewSource, /admin-brain-proof-path/);
  assert.match(adminViewSource, /Automatic local selector is active/);
  assert.match(adminViewSource, /learnerAlgorithmDetailsFromMetadata/);
  assert.match(adminViewSource, /conservative_threshold/);
  assert.match(adminViewSource, /bayesian_knowledge_tracing/);
  assert.match(adminViewSource, /decay_sensitive_bkt/);
  assert.match(adminViewSource, /Typed chat - book memory - retrieval/);
  assert.doesNotMatch(
    adminViewSource,
    /automatic model choice is not yet active/i,
  );
});
