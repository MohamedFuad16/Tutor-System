import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildBetaDiagnosticsExport,
  buildBetaDiagnosticsSnapshot,
  buildBrainFlowCoverageFromLedgers,
  buildCoherentLiveProofFromLedgers,
  buildProviderKeyProofChecklist,
} = await import("../.tmp-test/beta.diagnostics.mjs");
const { modelObservationGateMetadata } =
  await import("../.tmp-test/evidence.mastery.mjs");

const multiPdfContextMetadata = (agentLayer, requestId) => ({
  agentLayer,
  requestId,
  documentCount: 2,
  readyDocumentCount: 2,
  documentIds: ["doc-active", "doc-companion"],
  readyDocumentIds: ["doc-active", "doc-companion"],
  contextDocumentIds: ["doc-active", "doc-companion"],
});

const completeBrainFlowLedgers = {
  memoryEvents: [
    {
      eventType: "brain_context_injected",
      status: "completed",
      timestamp: 1,
      metadata: multiPdfContextMetadata("chat_stream", "chat-req-1"),
    },
    {
      eventType: "brain_context_injected",
      status: "completed",
      timestamp: 2,
      metadata: multiPdfContextMetadata("voice_realtime", "voice-req-1"),
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
    {
      eventType: "book_chat_thread_saved",
      status: "completed",
      timestamp: 6,
      bookId: "book-1",
      conversationId: "thread:book-1",
      metadata: {
        mode: "chat",
        requestId: "chat-req-1",
        requestIds: ["chat-req-1"],
        requestCorrelated: true,
        hasTypedChat: true,
        hasVoiceSession: false,
      },
    },
    {
      eventType: "book_chat_thread_saved",
      status: "completed",
      timestamp: 7,
      bookId: "book-1",
      conversationId: "thread:book-1",
      metadata: {
        mode: "voice",
        requestId: "voice-req-1",
        requestIds: ["voice-req-1"],
        requestCorrelated: true,
        hasTypedChat: false,
        hasVoiceSession: true,
        voiceSessionCount: 1,
        voiceTurnCount: 2,
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
};
const completeBrainFlow = buildBrainFlowCoverageFromLedgers(
  completeBrainFlowLedgers,
);
const completeCoherentLiveProof = buildCoherentLiveProofFromLedgers(
  completeBrainFlowLedgers,
);

test("beta diagnostics mark clean local ledgers as export-ready while cloud stays deferred", () => {
  const snapshot = buildBetaDiagnosticsSnapshot(
    {
      learningBooks: 2,
      mappedConcepts: 8,
      bookChatThreads: 1,
      memoryEvents: 7,
      retrievalEvents: 3,
      modelRuns: 4,
      toolJobs: 1,
      backgroundJobs: 2,
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
      coherentLiveProof: completeCoherentLiveProof,
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
  assert.equal(snapshot.counts.backgroundJobs, 2);
  assert.equal(snapshot.counts.bookChatThreads, 1);
  assert.equal(snapshot.brainFlow.status, "ready");
  assert.equal(snapshot.coherentLiveProof.status, "ready");
  assert.equal(
    snapshot.items.find((item) => item.id === "coherent_live_proof")?.status,
    "ready",
  );
  assert.equal(
    snapshot.items.find((item) => item.id === "background_jobs")?.status,
    "ready",
  );
  assert.match(
    snapshot.items.find((item) => item.id === "correction_control")?.summary ||
      "",
    /2 local rows/,
  );
});

test("provider-key proof checklist separates key readiness from live proof", () => {
  const emptyFlow = buildBrainFlowCoverageFromLedgers();
  const checklist = buildProviderKeyProofChecklist({
    brainFlow: emptyFlow,
    providerKeys: {
      chatModelKeyConfigured: false,
      voiceRealtimeKeyConfigured: false,
    },
  });

  assert.equal(checklist.status, "watch");
  assert.equal(checklist.canAttemptProviderKeyRun, false);
  assert.equal(checklist.proofComplete, false);
  assert.equal(checklist.readyChecks, 0);
  assert.equal(checklist.totalChecks, 16);
  assert.equal(checklist.completionPercent, 0);
  assert.equal(checklist.chatModelKeyConfigured, false);
  assert.equal(checklist.voiceRealtimeKeyConfigured, false);
  assert.ok(checklist.missingChecks.includes("Chat model provider key"));
  assert.ok(checklist.missingChecks.includes("Typed chat context proof"));
  assert.equal(checklist.liveProofRunbook.status, "watch");
  assert.equal(checklist.liveProofRunbook.canStart, false);
  assert.equal(checklist.liveProofRunbook.readySteps, 0);
  assert.equal(checklist.liveProofRunbook.nextStepId, "provider_keys");
  assert.deepEqual(
    checklist.liveProofRunbook.steps.find((step) => step.id === "provider_keys")
      ?.blockingChecks,
    ["Chat model provider key", "Voice realtime provider key"],
  );
});

test("provider-key proof checklist requires keys and complete live ledger anchors", () => {
  const missingVoiceKey = buildProviderKeyProofChecklist({
    brainFlow: completeBrainFlow,
    coherentLiveProof: completeCoherentLiveProof,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: false,
    },
  });

  assert.equal(missingVoiceKey.status, "watch");
  assert.equal(missingVoiceKey.canAttemptProviderKeyRun, false);
  assert.equal(missingVoiceKey.proofComplete, false);
  assert.equal(missingVoiceKey.readyChecks, 15);
  assert.ok(
    missingVoiceKey.missingChecks.includes("Voice realtime provider key"),
  );

  const readyChecklist = buildProviderKeyProofChecklist({
    brainFlow: completeBrainFlow,
    coherentLiveProof: completeCoherentLiveProof,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });
  const typedChatMultiPdfProof = readyChecklist.checks.find(
    (check) => check.id === "typed_chat_multi_pdf_proof",
  );

  assert.equal(readyChecklist.status, "ready");
  assert.equal(readyChecklist.canAttemptProviderKeyRun, true);
  assert.equal(readyChecklist.proofComplete, true);
  assert.equal(readyChecklist.completionPercent, 100);
  assert.equal(readyChecklist.missingChecks.length, 0);
  assert.equal(readyChecklist.liveProofRunbook.status, "ready");
  assert.equal(readyChecklist.liveProofRunbook.canStart, true);
  assert.equal(readyChecklist.liveProofRunbook.readySteps, 6);
  assert.equal(readyChecklist.liveProofRunbook.nextStepId, undefined);
  assert.equal(
    readyChecklist.liveProofRunbook.steps.find(
      (step) => step.id === "coherent_bundle_export",
    )?.status,
    "ready",
  );
  assert.equal(readyChecklist.coherentLiveProof.status, "ready");
  assert.deepEqual(readyChecklist.coherentLiveProof.sharedDocumentIds, [
    "doc-active",
    "doc-companion",
  ]);
  assert.deepEqual(readyChecklist.coherentLiveProof.sharedBookIds, ["book-1"]);
  assert.deepEqual(readyChecklist.coherentLiveProof.sharedConversationIds, [
    "thread:book-1",
  ]);
  assert.equal(
    readyChecklist.checks.find(
      (check) => check.id === "coherent_chat_voice_beta_bundle",
    )?.ready,
    true,
  );
  assert.deepEqual(typedChatMultiPdfProof?.evidence.requestIds, ["chat-req-1"]);
  assert.deepEqual(typedChatMultiPdfProof?.evidence.documentIds, [
    "doc-active",
    "doc-companion",
  ]);
});

test("provider-key proof checklist blocks live runs when ledger rows fail", () => {
  const blockedFlow = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "failed",
        timestamp: 1,
        metadata: {
          agentLayer: "chat_stream",
          requestId: "chat-req-1",
        },
      },
    ],
  });
  const checklist = buildProviderKeyProofChecklist({
    brainFlow: blockedFlow,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });

  assert.equal(checklist.status, "blocked");
  assert.equal(checklist.canAttemptProviderKeyRun, false);
  assert.equal(checklist.proofComplete, false);
  assert.equal(checklist.failedRows, 1);
  assert.match(checklist.summary, /failed or blocked live rows/);
});

test("beta diagnostics block when background jobs reach dead-letter", () => {
  const snapshot = buildBetaDiagnosticsSnapshot(
    {
      learningBooks: 1,
      mappedConcepts: 1,
      memoryEvents: 1,
      backgroundJobs: 3,
      deadLetterBackgroundJobs: 1,
      brainFlow: completeBrainFlow,
    },
    new Date("2026-06-01T00:00:00.000Z"),
  );

  assert.equal(snapshot.overallStatus, "blocked");
  assert.equal(snapshot.summary.blocked, 1);
  assert.equal(
    snapshot.items.find((item) => item.id === "background_jobs")?.status,
    "blocked",
  );
});

test("brain flow coverage requires chat, voice, request ids, tools, mastery evidence, transcript persistence, and background memory", () => {
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
  assert.equal(completeBrainFlow.chatMultiPdfContextInjections, 1);
  assert.equal(completeBrainFlow.voiceMultiPdfContextInjections, 1);
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "chat_multi_pdf_context",
    )?.ready,
    true,
  );
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "voice_multi_pdf_context",
    )?.ready,
    true,
  );
  assert.equal(completeBrainFlow.chatBackgroundMemoryEvents, 1);
  assert.equal(completeBrainFlow.voiceBackgroundMemoryEvents, 1);
  assert.equal(completeBrainFlow.requestCorrelatedThreadPersistenceEvents, 2);
  assert.equal(completeBrainFlow.chatThreadPersistenceEvents, 1);
  assert.equal(completeBrainFlow.voiceThreadPersistenceEvents, 1);
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
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "chat_thread_persistence",
    )?.ready,
    true,
  );
  assert.equal(
    completeBrainFlow.signals.find(
      (signal) => signal.id === "voice_thread_persistence",
    )?.ready,
    true,
  );
  const chatMultiPdfSignal = completeBrainFlow.signals.find(
    (signal) => signal.id === "chat_multi_pdf_context",
  );
  assert.deepEqual(chatMultiPdfSignal?.evidence.requestIds, ["chat-req-1"]);
  assert.deepEqual(chatMultiPdfSignal?.evidence.documentIds, [
    "doc-active",
    "doc-companion",
  ]);
  assert.deepEqual(chatMultiPdfSignal?.evidence.sources, [
    "brain_context_injected",
  ]);
  assert.equal(chatMultiPdfSignal?.evidence.latestTimestamp, 1);

  const requestCorrelationSignal = completeBrainFlow.signals.find(
    (signal) => signal.id === "request_correlation",
  );
  assert.deepEqual(requestCorrelationSignal?.evidence.requestIds, [
    "chat-req-1",
    "voice-req-1",
  ]);
  assert.deepEqual(requestCorrelationSignal?.evidence.sources, [
    "brain_context_injected",
    "retrieval_event",
    "chat_stream",
    "voice_agent",
    "book_chat_thread_saved",
  ]);
  assert.equal(requestCorrelationSignal?.evidence.latestTimestamp, 8);
});

test("coherent live proof requires one complete chat request and one complete voice request sharing book and multi-PDF context", () => {
  assert.equal(completeCoherentLiveProof.status, "ready");
  assert.equal(completeCoherentLiveProof.ready, true);
  assert.equal(completeCoherentLiveProof.completionPercent, 100);
  assert.equal(completeCoherentLiveProof.chatRequestId, "chat-req-1");
  assert.equal(completeCoherentLiveProof.voiceRequestId, "voice-req-1");
  assert.deepEqual(completeCoherentLiveProof.sharedDocumentIds, [
    "doc-active",
    "doc-companion",
  ]);
  assert.deepEqual(completeCoherentLiveProof.sharedBookIds, ["book-1"]);
  assert.deepEqual(completeCoherentLiveProof.sharedConversationIds, [
    "thread:book-1",
  ]);
  assert.equal(
    completeCoherentLiveProof.checks.find(
      (check) => check.id === "typed_chat_request_bundle",
    )?.ready,
    true,
  );
  assert.equal(
    completeCoherentLiveProof.checks.find(
      (check) => check.id === "live_voice_request_bundle",
    )?.ready,
    true,
  );
});

test("coherent live proof rejects scattered rows even when aggregate brain-flow signals pass", () => {
  const scatteredLedgers = {
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 1,
        bookId: "book-1",
        metadata: multiPdfContextMetadata("chat_stream", "chat-context"),
      },
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 2,
        bookId: "book-1",
        metadata: multiPdfContextMetadata("voice_realtime", "voice-context"),
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 3,
        bookId: "book-1",
        metadata: modelObservationGateMetadata({
          requestId: "chat-background",
          mode: "chat",
          agentLayer: "chat_stream",
        }),
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 4,
        bookId: "book-1",
        metadata: modelObservationGateMetadata({
          requestId: "voice-background",
          mode: "voice",
          agentLayer: "voice_realtime",
        }),
      },
      {
        eventType: "book_chat_thread_saved",
        status: "completed",
        timestamp: 5,
        bookId: "book-1",
        conversationId: "thread:book-1",
        metadata: {
          mode: "chat",
          requestId: "chat-thread",
          hasTypedChat: true,
        },
      },
      {
        eventType: "book_chat_thread_saved",
        status: "completed",
        timestamp: 6,
        bookId: "book-1",
        conversationId: "thread:book-1",
        metadata: {
          mode: "voice",
          requestId: "voice-thread",
          hasVoiceSession: true,
          voiceSessionCount: 1,
          voiceTurnCount: 2,
        },
      },
    ],
    retrievalEvents: [
      { status: "completed", requestId: "chat-retrieval", timestamp: 7 },
      { status: "completed", requestId: "voice-retrieval", timestamp: 8 },
    ],
    modelRuns: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-model",
        timestamp: 9,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-model",
        timestamp: 10,
      },
    ],
    toolJobs: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-tool",
        timestamp: 11,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-tool",
        timestamp: 12,
      },
    ],
    evidenceEvents: [
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 13,
        metadata: {
          requestId: "chat-evidence",
          evidenceContract: "evaluated_answer_v1",
          agentLayer: "chat_stream",
          mode: "chat",
        },
      },
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 14,
        metadata: {
          requestId: "voice-evidence",
          evidenceContract: "evaluated_answer_v1",
          agentLayer: "voice_realtime",
          mode: "voice",
        },
      },
    ],
  };
  const aggregateFlow = buildBrainFlowCoverageFromLedgers(scatteredLedgers);
  const coherentProof = buildCoherentLiveProofFromLedgers(scatteredLedgers);
  const checklist = buildProviderKeyProofChecklist({
    brainFlow: aggregateFlow,
    coherentLiveProof: coherentProof,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });

  assert.equal(aggregateFlow.status, "ready");
  assert.equal(aggregateFlow.coveragePercent, 100);
  assert.equal(coherentProof.status, "watch");
  assert.equal(coherentProof.ready, false);
  assert.ok(coherentProof.missingChecks.includes("Typed chat request bundle"));
  assert.ok(coherentProof.missingChecks.includes("Live voice request bundle"));
  assert.equal(checklist.status, "watch");
  assert.equal(checklist.proofComplete, false);
  assert.ok(
    checklist.missingChecks.includes("Coherent chat + voice beta bundle"),
  );
  assert.equal(checklist.liveProofRunbook.status, "watch");
  assert.equal(checklist.liveProofRunbook.canStart, true);
  assert.equal(
    checklist.liveProofRunbook.steps.find(
      (step) => step.id === "typed_chat_turn",
    )?.status,
    "ready",
  );
  assert.equal(
    checklist.liveProofRunbook.steps.find(
      (step) => step.id === "coherent_bundle_export",
    )?.status,
    "watch",
  );
  assert.equal(checklist.liveProofRunbook.nextStepId, "coherent_bundle_export");
});

test("brain flow coverage requires chat and voice multi-PDF context evidence", () => {
  const singlePdfContextFlow = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 1,
        metadata: {
          agentLayer: "chat_stream",
          requestId: "chat-req-1",
          documentCount: 2,
          contextDocumentIds: ["doc-active"],
        },
      },
      {
        eventType: "brain_context_injected",
        status: "completed",
        timestamp: 2,
        metadata: {
          agentLayer: "voice_realtime",
          requestId: "voice-req-1",
          documentCount: 2,
          contextDocumentIds: ["doc-active"],
        },
      },
    ],
  });

  assert.equal(singlePdfContextFlow.chatContextInjections, 1);
  assert.equal(singlePdfContextFlow.voiceContextInjections, 1);
  assert.equal(singlePdfContextFlow.chatMultiPdfContextInjections, 0);
  assert.equal(singlePdfContextFlow.voiceMultiPdfContextInjections, 0);
  assert.ok(
    singlePdfContextFlow.missingSignals.includes("Chat multi-PDF context"),
  );
  assert.ok(
    singlePdfContextFlow.missingSignals.includes("Voice multi-PDF context"),
  );
});

test("brain flow coverage requires request-correlated thread persistence", () => {
  const uncorrelatedThreadFlow = buildBrainFlowCoverageFromLedgers({
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
      {
        eventType: "book_chat_thread_saved",
        status: "completed",
        timestamp: 5,
        bookId: "book-1",
        conversationId: "thread:book-1",
        metadata: {
          mode: "chat",
          hasTypedChat: true,
        },
      },
      {
        eventType: "book_chat_thread_saved",
        status: "completed",
        timestamp: 6,
        bookId: "book-1",
        conversationId: "thread:book-1",
        metadata: {
          mode: "voice",
          hasVoiceSession: true,
          voiceSessionCount: 1,
          voiceTurnCount: 2,
        },
      },
    ],
    retrievalEvents: [
      { status: "completed", requestId: "chat-req-1", timestamp: 7 },
      { status: "completed", requestId: "voice-req-1", timestamp: 8 },
    ],
    modelRuns: [
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
    toolJobs: [
      {
        status: "completed",
        source: "chat_stream",
        requestId: "chat-req-1",
        timestamp: 11,
      },
      {
        status: "completed",
        source: "voice_agent",
        requestId: "voice-req-1",
        timestamp: 12,
      },
    ],
    evidenceEvents: [
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 13,
        metadata: {
          requestId: "chat-req-1",
          agentLayer: "chat_stream",
          mode: "chat",
        },
      },
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 14,
        metadata: {
          requestId: "voice-req-1",
          agentLayer: "voice_realtime",
          mode: "voice",
        },
      },
    ],
  });

  assert.equal(uncorrelatedThreadFlow.status, "watch");
  assert.equal(uncorrelatedThreadFlow.threadPersistenceEvents, 2);
  assert.equal(
    uncorrelatedThreadFlow.requestCorrelatedThreadPersistenceEvents,
    0,
  );
  assert.equal(uncorrelatedThreadFlow.chatThreadPersistenceEvents, 0);
  assert.equal(uncorrelatedThreadFlow.voiceThreadPersistenceEvents, 0);
  assert.ok(
    uncorrelatedThreadFlow.missingSignals.includes("Chat thread saved"),
  );
  assert.ok(
    uncorrelatedThreadFlow.missingSignals.includes("Voice thread saved"),
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
