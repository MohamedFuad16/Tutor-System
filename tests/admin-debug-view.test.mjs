import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminViewSource = readFileSync(
  new URL("../src/views/AdminView.tsx", import.meta.url),
  "utf8",
);

test("Admin debug tabs keep system activity, beta diagnostics, traces, and console routes wired", () => {
  for (const tab of [
    { id: "activity", label: "Activity" },
    { id: "diagnostics", label: "Beta" },
    { id: "traces", label: "Traces" },
    { id: "console", label: "Console" },
  ]) {
    assert.match(
      adminViewSource,
      new RegExp(`\\{ id: "${tab.id}", label: "${tab.label}"`),
    );
  }

  assert.match(adminViewSource, /System Activity/);
  assert.match(adminViewSource, /Beta Diagnostics/);
  assert.match(adminViewSource, /Activity Events/);
  assert.match(adminViewSource, /Server console is offline/);
});

test("Admin activity views fetch the local debug ledger with token-aware headers", () => {
  assert.match(
    adminViewSource,
    /activeTab === "activity" \|\| activeTab === "diagnostics"/,
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
