import assert from "node:assert/strict";
import { test } from "node:test";

const { buildBetaDiagnosticsExport, buildBetaDiagnosticsSnapshot } =
  await import("../.tmp-test/beta.diagnostics.mjs");

test("beta diagnostics mark clean local ledgers as export-ready while cloud stays deferred", () => {
  const snapshot = buildBetaDiagnosticsSnapshot(
    {
      learningBooks: 2,
      mappedConcepts: 8,
      memoryEvents: 5,
      retrievalEvents: 3,
      modelRuns: 4,
      toolJobs: 1,
      artifactRecords: 2,
      citationStates: 2,
      verifiedCitationStates: 2,
      correctionEvents: 1,
      appliedCorrectionEvents: 1,
      propagatedCorrectionRows: 2,
      evidenceEvents: 3,
      masteryDeltas: 1,
      traceEvents: 2,
      runtimeSettings: { webSearchPolicy: "source_first" },
    },
    new Date("2026-06-01T00:00:00.000Z"),
  );

  assert.equal(snapshot.generatedAt, "2026-06-01T00:00:00.000Z");
  assert.equal(snapshot.localOnly, true);
  assert.equal(snapshot.overallStatus, "ready");
  assert.equal(snapshot.summary.blocked, 0);
  assert.equal(snapshot.summary.deferred, 1);
  assert.equal(
    snapshot.items.find((item) => item.id === "cloud_sync")?.status,
    "deferred",
  );
  assert.deepEqual(snapshot.runtimeSettings, {
    webSearchPolicy: "source_first",
  });
  assert.equal(snapshot.counts.propagatedCorrectionRows, 2);
  assert.match(
    snapshot.items.find((item) => item.id === "correction_control")?.summary ||
      "",
    /2 local rows/,
  );
});

test("beta diagnostics escalate failed model and retrieval rows", () => {
  const snapshot = buildBetaDiagnosticsSnapshot({
    memoryEvents: 1,
    learningBooks: 1,
    modelRuns: 2,
    blockedOrFailedModelRuns: 1,
    retrievalEvents: 2,
    failedRetrievalEvents: 1,
    artifactRecords: 1,
    citationStates: 1,
    checkingCitationStates: 1,
  });

  assert.equal(snapshot.overallStatus, "blocked");
  assert.equal(snapshot.summary.blocked, 2);
  assert.equal(
    snapshot.items.find((item) => item.id === "model_behavior")?.status,
    "blocked",
  );
  assert.equal(
    snapshot.items.find((item) => item.id === "semantic_retrieval")?.status,
    "blocked",
  );
  assert.equal(
    snapshot.items.find((item) => item.id === "source_grounding")?.status,
    "watch",
  );
});

test("beta diagnostics keep source grounding on watch for non-verified citation states", () => {
  for (const counts of [
    { checkingCitationStates: 1 },
    { unavailableCitationStates: 1 },
    { conflictingCitationStates: 1 },
    { unsupportedCitationStates: 1 },
    { notCheckedCitationStates: 1 },
  ]) {
    const snapshot = buildBetaDiagnosticsSnapshot({
      memoryEvents: 1,
      learningBooks: 1,
      artifactRecords: 1,
      citationStates: 1,
      ...counts,
    });

    assert.equal(
      snapshot.items.find((item) => item.id === "source_grounding")?.status,
      "watch",
    );
    assert.match(
      snapshot.items.find((item) => item.id === "source_grounding")?.summary ||
        "",
      /artifacts/,
    );
  }

  const notCheckedSnapshot = buildBetaDiagnosticsSnapshot({
    memoryEvents: 1,
    learningBooks: 1,
    artifactRecords: 1,
    citationStates: 1,
    notCheckedCitationStates: 1,
  });
  assert.match(
    notCheckedSnapshot.items.find((item) => item.id === "source_grounding")
      ?.summary || "",
    /1 not checked/,
  );
});

test("beta diagnostics export preserves local-only scope and ledger samples", () => {
  const snapshot = buildBetaDiagnosticsSnapshot(
    {
      memoryEvents: 1,
      learningBooks: 1,
    },
    new Date("2026-06-01T00:00:00.000Z"),
  );
  const payload = buildBetaDiagnosticsExport({
    snapshot,
    metadata: { activeBook: "book:general-study" },
    ledgers: {
      memoryEvents: [
        {
          id: "memory-1",
          metadata: {
            correction: {
              eventId: "correction-1",
              effect: "marked_wrong",
            },
          },
        },
      ],
      modelRuns: [],
    },
  });

  assert.equal(payload.schema, "tutor.beta-diagnostics.v1");
  assert.equal(payload.localOnly, true);
  assert.equal(payload.exportScope, "local-indexeddb-sample");
  assert.deepEqual(payload.metadata, { activeBook: "book:general-study" });
  assert.deepEqual(payload.correctionOverlay, {
    memoryEvents: [
      {
        id: "memory-1",
        correction: {
          eventId: "correction-1",
          effect: "marked_wrong",
        },
      },
    ],
  });
  assert.equal(payload.ledgers.memoryEvents[0].id, "memory-1");
  assert.ok(payload.outOfScope.includes("AWS/cloud synchronization"));
});
