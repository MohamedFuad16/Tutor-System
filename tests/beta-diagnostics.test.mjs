import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildBetaDiagnosticsExport,
  buildBetaDiagnosticsSnapshot,
  buildBrainFlowCoverageFromLedgers,
} = await import("../.tmp-test/beta.diagnostics.mjs");
const { modelObservationGateMetadata } =
  await import("../.tmp-test/evidence.mastery.mjs");

const completeBrainFlow = buildBrainFlowCoverageFromLedgers({
  memoryEvents: [
    {
      eventType: "brain_context_injected",
      status: "completed",
      timestamp: 1,
      metadata: {
        agentLayer: "chat_stream",
        requestId: "chat-req-1",
      },
    },
    {
      eventType: "brain_context_injected",
      status: "completed",
      timestamp: 2,
      metadata: {
        agentLayer: "voice_realtime",
        requestId: "voice-req-1",
      },
    },
    {
      eventType: "interaction_recorded",
      status: "completed",
      timestamp: 3,
      metadata: {
        requestId: "chat-req-1",
      },
    },
    {
      eventType: "learning_book_updated",
      status: "completed",
      timestamp: 4,
      metadata: modelObservationGateMetadata({
        requestId: "chat-req-1",
        mode: "chat",
        agentLayer: "chat_stream",
      }),
    },
    {
      eventType: "learning_book_updated",
      status: "completed",
      timestamp: 5,
      metadata: modelObservationGateMetadata({
        requestId: "voice-req-1",
        mode: "voice",
        agentLayer: "voice_realtime",
      }),
    },
  ],
  retrievalEvents: [
    {
      status: "completed",
      requestId: "chat-req-1",
      timestamp: 5,
    },
    {
      status: "completed",
      requestId: "voice-req-1",
      timestamp: 6,
    },
  ],
  modelRuns: [
    {
      status: "completed",
      source: "chat_stream",
      requestId: "chat-req-1",
      timestamp: 7,
    },
    {
      status: "completed",
      source: "voice_agent",
      requestId: "voice-req-1",
      timestamp: 8,
    },
  ],
  toolJobs: [
    {
      status: "completed",
      source: "chat_stream",
      requestId: "chat-req-1",
      timestamp: 9,
    },
    {
      status: "completed",
      source: "voice_agent",
      requestId: "voice-req-1",
      timestamp: 10,
    },
  ],
  evidenceEvents: [
    {
      evidenceType: "generation",
      verified: true,
      timestamp: 11,
      metadata: {
        requestId: "chat-req-1",
        evidenceContract: "evaluated_answer_v1",
        agentLayer: "chat_stream",
        mode: "chat",
      },
    },
    {
      evidenceType: "generation",
      verified: true,
      timestamp: 12,
      metadata: {
        requestId: "voice-req-1",
        evidenceContract: "evaluated_answer_v1",
        agentLayer: "voice_realtime",
        mode: "voice",
      },
    },
  ],
});

test("beta diagnostics mark clean local ledgers as export-ready while cloud stays deferred", () => {
  const snapshot = buildBetaDiagnosticsSnapshot(
    {
      learningBooks: 2,
      mappedConcepts: 8,
      memoryEvents: 6,
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
      brainFlow: completeBrainFlow,
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
  assert.equal(snapshot.brainFlow.status, "ready");
  assert.match(
    snapshot.items.find((item) => item.id === "correction_control")?.summary ||
      "",
    /2 local rows/,
  );
});

test("brain flow coverage requires chat, voice, request ids, tools, mastery evidence, and background memory", () => {
  assert.equal(completeBrainFlow.status, "ready");
  assert.equal(completeBrainFlow.coveragePercent, 100);
  assert.deepEqual(completeBrainFlow.missingSignals, []);
  assert.equal(
    completeBrainFlow.signals.find((signal) => signal.id === "chat_context")
      ?.ready,
    true,
  );
  assert.equal(
    completeBrainFlow.signals.find((signal) => signal.id === "voice_context")
      ?.ready,
    true,
  );
  assert.equal(completeBrainFlow.chatBackgroundMemoryEvents, 1);
  assert.equal(completeBrainFlow.voiceBackgroundMemoryEvents, 1);
  assert.equal(completeBrainFlow.requestCorrelatedBackgroundMemoryEvents, 3);
  assert.equal(completeBrainFlow.chatForegroundToolJobs, 1);
  assert.equal(completeBrainFlow.voiceForegroundToolJobs, 1);
  assert.equal(completeBrainFlow.requestCorrelatedMasteryEvidenceEvents, 2);
  assert.equal(completeBrainFlow.modelObservedBackgroundMemoryEvents, 2);
  assert.equal(completeBrainFlow.ungatedBackgroundMemoryEvents, 0);
  assert.equal(completeBrainFlow.chatRequestCorrelatedMasteryEvidenceEvents, 1);
  assert.equal(
    completeBrainFlow.voiceRequestCorrelatedMasteryEvidenceEvents,
    1,
  );
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "chat_foreground_tools",
    )?.ready,
    true,
  );
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "voice_foreground_tools",
    )?.ready,
    true,
  );
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "evidence_gate_contract",
    )?.ready,
    true,
  );
});

test("brain flow coverage requires both chat and voice evaluated mastery", () => {
  const voiceOnlyEvidenceFlow = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 1,
        metadata: {
          agentLayer: "chat_stream",
          requestId: "chat-req-1",
        },
      },
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 2,
        metadata: {
          agentLayer: "voice_realtime",
          requestId: "voice-req-1",
        },
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 3,
        metadata: modelObservationGateMetadata({
          requestId: "chat-req-1",
          mode: "chat",
          agentLayer: "chat_stream",
        }),
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 4,
        metadata: modelObservationGateMetadata({
          requestId: "voice-req-1",
          mode: "voice",
          agentLayer: "voice_realtime",
        }),
      },
    ],
    retrievalEvents: [
      {
        status: "completed",
        requestId: "chat-req-1",
        timestamp: 5,
      },
      {
        status: "completed",
        requestId: "voice-req-1",
        timestamp: 6,
      },
    ],
    modelRuns: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 7,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 8,
      },
    ],
    toolJobs: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 9,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 10,
      },
    ],
    evidenceEvents: [
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 11,
        metadata: {
          requestId: "voice-req-1",
          evidenceContract: "evaluated_answer_v1",
          agentLayer: "voice_realtime",
          mode: "voice",
        },
      },
    ],
  });

  assert.equal(voiceOnlyEvidenceFlow.status, "watch");
  assert.equal(
    voiceOnlyEvidenceFlow.chatRequestCorrelatedMasteryEvidenceEvents,
    0,
  );
  assert.equal(
    voiceOnlyEvidenceFlow.voiceRequestCorrelatedMasteryEvidenceEvents,
    1,
  );
  assert.ok(
    voiceOnlyEvidenceFlow.missingSignals.includes("Chat evaluated mastery"),
  );
});

test("brain flow coverage requires request-correlated voice memory evidence", () => {
  const chatOnlyMemoryFlow = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 1,
        metadata: {
          agentLayer: "chat_stream",
          requestId: "chat-req-1",
        },
      },
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 2,
        metadata: {
          agentLayer: "voice_realtime",
          requestId: "voice-req-1",
        },
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 3,
        metadata: modelObservationGateMetadata({
          requestId: "chat-req-1",
          mode: "chat",
          agentLayer: "chat_stream",
        }),
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 4,
        metadata: {
          mode: "voice",
          agentLayer: "voice_realtime",
        },
      },
    ],
    retrievalEvents: [
      {
        status: "completed",
        requestId: "chat-req-1",
        timestamp: 5,
      },
      {
        status: "completed",
        requestId: "voice-req-1",
        timestamp: 6,
      },
    ],
    modelRuns: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 7,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 8,
      },
    ],
    toolJobs: [
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 9,
      },
    ],
  });

  assert.equal(chatOnlyMemoryFlow.status, "watch");
  assert.equal(chatOnlyMemoryFlow.chatBackgroundMemoryEvents, 1);
  assert.equal(chatOnlyMemoryFlow.voiceBackgroundMemoryEvents, 0);
  assert.ok(
    chatOnlyMemoryFlow.missingSignals.includes("Background memory agent"),
  );
});

test("brain flow coverage requires model-observation gates on background memory", () => {
  const ungatedFlow = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 1,
        metadata: {
          agentLayer: "chat_stream",
          requestId: "chat-req-1",
        },
      },
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 2,
        metadata: {
          agentLayer: "voice_realtime",
          requestId: "voice-req-1",
        },
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 3,
        metadata: modelObservationGateMetadata({
          requestId: "chat-req-1",
          mode: "chat",
          agentLayer: "chat_stream",
        }),
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 4,
        metadata: {
          requestId: "voice-req-1",
          mode: "voice",
          agentLayer: "voice_realtime",
        },
      },
    ],
    retrievalEvents: [
      { status: "completed", requestId: "chat-req-1", timestamp: 5 },
      { status: "completed", requestId: "voice-req-1", timestamp: 6 },
    ],
    modelRuns: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 7,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 8,
      },
    ],
    toolJobs: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 9,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 10,
      },
    ],
    evidenceEvents: [
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 11,
        metadata: {
          requestId: "chat-req-1",
          agentLayer: "chat_stream",
          mode: "chat",
        },
      },
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 12,
        metadata: {
          requestId: "voice-req-1",
          agentLayer: "voice_realtime",
          mode: "voice",
        },
      },
    ],
  });

  assert.equal(ungatedFlow.status, "watch");
  assert.equal(ungatedFlow.modelObservedBackgroundMemoryEvents, 1);
  assert.equal(ungatedFlow.ungatedBackgroundMemoryEvents, 1);
  assert.ok(ungatedFlow.missingSignals.includes("Evidence gate contract"));
});

test("brain flow coverage stays blocked when local flow rows fail", () => {
  const coverage = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 1,
        metadata: {
          agentLayer: "chat_stream",
          requestId: "chat-req-1",
        },
      },
      {
        eventType: "memory_error",
        status: "failed",
        timestamp: 2,
        metadata: {
          requestId: "chat-req-1",
        },
      },
    ],
    retrievalEvents: [
      {
        status: "failed",
        requestId: "chat-req-1",
        timestamp: 3,
      },
    ],
    modelRuns: [
      {
        status: "blocked",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 4,
      },
    ],
    toolJobs: [
      {
        status: "blocked",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 5,
      },
    ],
  });

  assert.equal(coverage.status, "blocked");
  assert.equal(coverage.failedRows, 4);
  assert.ok(coverage.missingSignals.includes("Voice context injected"));
  assert.ok(coverage.coveragePercent < 100);

  const snapshot = buildBetaDiagnosticsSnapshot({
    memoryEvents: 2,
    retrievalEvents: 1,
    failedRetrievalEvents: 1,
    modelRuns: 1,
    blockedOrFailedModelRuns: 1,
    toolJobs: 1,
    brainFlow: coverage,
  });

  const flowItem = snapshot.items.find(
    (item) => item.id === "brain_flow_coverage",
  );
  assert.equal(flowItem?.status, "blocked");
  assert.match(flowItem?.summary || "", /failed or blocked/);
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
