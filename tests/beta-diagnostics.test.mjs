import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildBetaDiagnosticsExport,
  buildBetaDiagnosticsSnapshot,
  buildBrainFlowCoverageFromLedgers,
  buildCoherentLiveProofFromLedgers,
  buildLiveBetaProofPreflight,
  buildProviderKeyProofChecklist,
} = await import("../.tmp-test/beta.diagnostics.mjs");
const { modelObservationGateMetadata } =
  await import("../.tmp-test/evidence.mastery.mjs");

const PROOF_ATTEMPT_ID = "beta-proof-attempt-1";

const multiPdfContextMetadata = (agentLayer, requestId) => ({
  agentLayer,
  requestId,
  proofAttemptId: PROOF_ATTEMPT_ID,
  documentCount: 2,
  readyDocumentCount: 2,
  documentIds: ["doc-active", "doc-companion"],
  readyDocumentIds: ["doc-active", "doc-companion"],
  contextDocumentIds: ["doc-active", "doc-companion"],
});

const PROOF_BASE_TS = Date.parse("2026-06-01T00:00:00.000Z");

const timestampedCompleteLedgers = ({
  chatOffsetMs = 0,
  voiceOffsetMs = 0,
} = {}) => {
  const requestOffset = (requestId) =>
    requestId === "voice-req-1" ? voiceOffsetMs : chatOffsetMs;
  const metadataRequestId = (row) => row.metadata?.requestId;
  const timestampFor = (row, index) =>
    PROOF_BASE_TS +
    requestOffset(metadataRequestId(row) || row.requestId) +
    index;

  return {
    memoryEvents: completeBrainFlowLedgers.memoryEvents.map((row, index) => ({
      ...row,
      timestamp: timestampFor(row, index),
    })),
    retrievalEvents: completeBrainFlowLedgers.retrievalEvents.map(
      (row, index) => ({
        ...row,
        timestamp: timestampFor(row, index),
      }),
    ),
    modelRuns: completeBrainFlowLedgers.modelRuns.map((row, index) => ({
      ...row,
      timestamp: timestampFor(row, index),
    })),
    toolJobs: completeBrainFlowLedgers.toolJobs.map((row, index) => ({
      ...row,
      timestamp: timestampFor(row, index),
    })),
    evidenceEvents: completeBrainFlowLedgers.evidenceEvents.map(
      (row, index) => ({
        ...row,
        timestamp: timestampFor(row, index),
      }),
    ),
    systemActivityEvents: completeBrainFlowLedgers.systemActivityEvents.map(
      (row, index) => ({
        ...row,
        timestamp: timestampFor(row, index),
      }),
    ),
  };
};

const completeBrainFlowLedgers = {
  memoryEvents: [
    {
      id: "proof-attempt-started-1",
      eventType: "beta_proof_attempt_started",
      status: "completed",
      source: "admin_beta_diagnostics",
      sessionId: PROOF_ATTEMPT_ID,
      timestamp: 0,
      metadata: {
        proofAttemptId: PROOF_ATTEMPT_ID,
        mode: "admin",
      },
    },
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
      provider: "openrouter",
      source: "chat_stream",
      requestId: "chat-req-1",
      requestedModel: "openai/gpt-4.1-mini",
      usedModel: "openai/gpt-4.1-mini",
      timestamp: 7,
      metadata: {
        proofAttemptId: PROOF_ATTEMPT_ID,
        mode: "chat",
        agentLayer: "chat_stream",
      },
    },
    {
      status: "completed",
      provider: "deepgram",
      source: "voice_agent",
      requestId: "voice-req-1",
      requestedModel: "Deepgram Voice Agent",
      usedModel: "Deepgram Voice Agent",
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
  systemActivityEvents: [
    {
      kind: "voice",
      status: "completed",
      title: "Voice provider ready",
      requestId: "voice-req-1",
      phase: "settings",
      timestamp: 13,
      metadata: {
        proofAttemptId: PROOF_ATTEMPT_ID,
        mode: "voice",
        agentLayer: "voice_realtime",
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
      memoryEvents: 8,
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

test("beta diagnostics expose MisoTTS read-aloud readiness without hiding the disk/API blocker", () => {
  const blockedSnapshot = buildBetaDiagnosticsSnapshot({
    learningBooks: 1,
    memoryEvents: 1,
    runtimeSettings: {
      ttsVoice: "miso-tts-8b",
      providerMeters: { misoTts: false },
    },
  });
  const blockedItem = blockedSnapshot.items.find(
    (item) => item.id === "read_aloud_voice_provider",
  );

  assert.equal(blockedSnapshot.overallStatus, "blocked");
  assert.equal(blockedItem?.status, "blocked");
  assert.match(blockedItem?.summary || "", /MisoTTS 8B is selected/);
  assert.match(blockedItem?.action || "", /confirm \/health/);

  const readySnapshot = buildBetaDiagnosticsSnapshot({
    learningBooks: 1,
    memoryEvents: 1,
    runtimeSettings: {
      ttsVoice: "miso-tts-8b",
      providerMeters: { misoTts: true },
    },
  });
  const readyItem = readySnapshot.items.find(
    (item) => item.id === "read_aloud_voice_provider",
  );

  assert.equal(readyItem?.status, "ready");
  assert.match(readyItem?.summary || "", /health meter is reachable/);
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
  assert.equal(checklist.liveProofDrillPacket.status, "watch");
  assert.equal(checklist.liveProofDrillPacket.canRun, false);
  assert.equal(checklist.liveProofDrillPacket.localOnly, true);
  assert.equal(checklist.liveProofReceipt.status, "watch");
  assert.equal(checklist.liveProofReceipt.ready, false);
  assert.equal(checklist.liveProofReceipt.localOnly, true);
  assert.equal(checklist.liveProofReceipt.providerCaptureCount, 0);
  assert.ok(
    checklist.liveProofDrillPacket.blockingChecks.includes(
      "Chat model provider key",
    ),
  );
  assert.match(
    checklist.liveProofDrillPacket.summary,
    /Complete provider-key setup/,
  );
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
  assert.equal(missingVoiceKey.betaProofReady, false);
  assert.equal(missingVoiceKey.sourceReadyForBeta, false);
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
  assert.equal(readyChecklist.betaProofReady, true);
  assert.equal(readyChecklist.sourceReadyForBeta, true);
  assert.equal(readyChecklist.completionPercent, 100);
  assert.equal(readyChecklist.missingChecks.length, 0);
  assert.equal(readyChecklist.liveProofRunbook.status, "ready");
  assert.equal(readyChecklist.liveProofRunbook.canStart, true);
  assert.equal(readyChecklist.liveProofRunbook.readySteps, 6);
  assert.equal(readyChecklist.liveProofRunbook.nextStepId, undefined);
  assert.equal(readyChecklist.liveProofDrillPacket.status, "ready");
  assert.equal(readyChecklist.liveProofDrillPacket.canRun, true);
  assert.equal(readyChecklist.liveProofDrillPacket.prompts.length, 2);
  assert.equal(
    readyChecklist.liveProofReceipt.schema,
    "tutor.live-provider-proof-receipt.v1",
  );
  assert.equal(readyChecklist.liveProofReceipt.status, "ready");
  assert.equal(readyChecklist.liveProofReceipt.ready, true);
  assert.equal(readyChecklist.liveProofReceipt.sourceKind, "local_live_ledger");
  assert.equal(readyChecklist.liveProofReceipt.sourceReadyForBeta, true);
  assert.equal(readyChecklist.liveProofReceipt.proofComplete, true);
  assert.equal(readyChecklist.liveProofReceipt.providerCaptureCount, 2);
  assert.deepEqual(readyChecklist.liveProofReceipt.selectedRequestIds, [
    "chat-req-1",
    "voice-req-1",
  ]);
  assert.deepEqual(readyChecklist.liveProofReceipt.sharedProofAttemptIds, [
    PROOF_ATTEMPT_ID,
  ]);
  assert.deepEqual(
    readyChecklist.liveProofReceipt.providerCaptures.map(
      (capture) => capture.provider,
    ),
    ["openrouter", "deepgram"],
  );
  assert.ok(
    readyChecklist.liveProofReceipt.warnings.some((warning) =>
      warning.includes("not a cloud sync"),
    ),
  );
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
  assert.deepEqual(readyChecklist.coherentLiveProof.sharedProofAttemptIds, [
    PROOF_ATTEMPT_ID,
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
  const chatPrompt = readyChecklist.liveProofDrillPacket.prompts.find(
    (prompt) => prompt.layer === "chat",
  );
  const voicePrompt = readyChecklist.liveProofDrillPacket.prompts.find(
    (prompt) => prompt.layer === "voice",
  );
  assert.match(chatPrompt?.prompt || "", /all ready PDFs/);
  assert.ok(chatPrompt?.expectedRows.includes("chat foreground tool job"));
  assert.ok(
    chatPrompt?.expectedRows.includes("chat evaluated mastery evidence"),
  );
  assert.match(voicePrompt?.prompt || "", /same active book/);
  assert.ok(voicePrompt?.expectedRows.includes("voice-agent tool job"));
  assert.ok(voicePrompt?.expectedRows.includes("voice book_chat_thread_saved"));
  assert.ok(
    readyChecklist.liveProofDrillPacket.exportInstructions.some((instruction) =>
      instruction.includes("chat-req-1 and voice-req-1"),
    ),
  );
});

test("live beta proof preflight requires active attempt and multiple ready PDFs before provider traffic", () => {
  const seededLedgers = {
    ...completeBrainFlowLedgers,
    modelRuns: completeBrainFlowLedgers.modelRuns.map((row) =>
      row.requestId === "chat-req-1"
        ? {
            ...row,
            metadata: {
              ...row.metadata,
              proofSource: "local_qa_seed",
              qaSeeded: true,
            },
          }
        : row,
    ),
  };
  const seededChecklist = buildProviderKeyProofChecklist({
    brainFlow: buildBrainFlowCoverageFromLedgers(seededLedgers),
    coherentLiveProof: buildCoherentLiveProofFromLedgers(seededLedgers),
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });

  assert.equal(seededChecklist.proofComplete, true);
  assert.equal(seededChecklist.betaProofReady, false);

  const readyPreflight = buildLiveBetaProofPreflight({
    providerKeyProof: seededChecklist,
    activeLearningBookId: "book-1",
    activeBetaProofAttemptId: PROOF_ATTEMPT_ID,
    documents: [
      {
        id: "doc-active",
        bookId: "book-1",
        title: "Active PDF",
        mimeType: "application/pdf",
        size: 1024,
        extractedText: "Active source text.",
        processingStatus: "ready",
        createdAt: PROOF_BASE_TS,
        updatedAt: PROOF_BASE_TS,
      },
      {
        id: "doc-companion",
        bookId: "book-1",
        title: "Companion PDF",
        mimeType: "application/pdf",
        size: 2048,
        extractedText: "Companion source text.",
        processingStatus: "ready",
        createdAt: PROOF_BASE_TS,
        updatedAt: PROOF_BASE_TS,
      },
    ],
  });

  assert.equal(readyPreflight.status, "ready");
  assert.equal(readyPreflight.canRun, true);
  assert.equal(readyPreflight.needsProviderTraffic, true);
  assert.equal(readyPreflight.readyChecks, readyPreflight.totalChecks);
  assert.equal(readyPreflight.readyDocumentCount, 2);
  assert.deepEqual(readyPreflight.readyDocumentIds, [
    "doc-active",
    "doc-companion",
  ]);
  assert.match(readyPreflight.summary, /run the real provider-key/);

  const blockedPreflight = buildLiveBetaProofPreflight({
    providerKeyProof: seededChecklist,
    activeLearningBookId: "book-1",
    activeBetaProofAttemptId: PROOF_ATTEMPT_ID,
    documents: [
      {
        id: "doc-active",
        bookId: "book-1",
        title: "Active PDF",
        mimeType: "application/pdf",
        size: 1024,
        extractedText: "Active source text.",
        processingStatus: "ready",
        createdAt: PROOF_BASE_TS,
        updatedAt: PROOF_BASE_TS,
      },
      {
        id: "doc-processing",
        bookId: "book-1",
        title: "Processing PDF",
        mimeType: "application/pdf",
        size: 2048,
        extractedText: "",
        processingStatus: "processing",
        createdAt: PROOF_BASE_TS,
        updatedAt: PROOF_BASE_TS,
      },
    ],
  });

  assert.equal(blockedPreflight.status, "watch");
  assert.equal(blockedPreflight.canRun, false);
  assert.equal(blockedPreflight.readyDocumentCount, 1);
  assert.ok(
    blockedPreflight.missingChecks.includes(
      "Active book has multiple ready PDFs",
    ),
  );
});

test("provider-key proof receipt distinguishes seeded QA evidence from real local drill proof", () => {
  const seededLedgers = {
    ...completeBrainFlowLedgers,
    modelRuns: completeBrainFlowLedgers.modelRuns.map((row) =>
      row.requestId === "chat-req-1"
        ? {
            ...row,
            metadata: {
              ...row.metadata,
              proofSource: "local_qa_seed",
              qaSeeded: true,
            },
          }
        : row,
    ),
    systemActivityEvents: completeBrainFlowLedgers.systemActivityEvents.map(
      (row) =>
        row.requestId === "voice-req-1"
          ? {
              ...row,
              metadata: {
                ...row.metadata,
                proofSource: "local_qa_seed",
                qaSeeded: true,
              },
            }
          : row,
    ),
  };
  const seededBrainFlow = buildBrainFlowCoverageFromLedgers(seededLedgers);
  const seededCoherentProof = buildCoherentLiveProofFromLedgers(seededLedgers);
  const seededChecklist = buildProviderKeyProofChecklist({
    brainFlow: seededBrainFlow,
    coherentLiveProof: seededCoherentProof,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });

  assert.equal(seededChecklist.status, "watch");
  assert.equal(seededChecklist.proofComplete, true);
  assert.equal(seededChecklist.betaProofReady, false);
  assert.equal(seededChecklist.sourceReadyForBeta, false);
  assert.equal(seededChecklist.completionPercent, 100);
  assert.equal(seededChecklist.liveProofRunbook.status, "watch");
  assert.equal(seededChecklist.liveProofDrillPacket.status, "watch");
  assert.equal(seededChecklist.liveProofReceipt.ready, true);
  assert.equal(seededChecklist.liveProofReceipt.sourceKind, "qa_seeded");
  assert.equal(seededChecklist.liveProofReceipt.sourceReadyForBeta, false);
  assert.equal(seededChecklist.liveProofReceipt.providerCaptureCount, 2);
  assert.deepEqual(
    seededChecklist.liveProofReceipt.providerCaptures.map(
      (capture) => capture.runSource,
    ),
    ["local_qa_seed", "local_qa_seed"],
  );
  assert.deepEqual(
    seededChecklist.liveProofReceipt.providerCaptures.map(
      (capture) => capture.seeded,
    ),
    [true, true],
  );
  assert.ok(
    seededChecklist.liveProofReceipt.sourceSummary.includes("seeded QA data"),
  );
  assert.ok(
    seededChecklist.liveProofReceipt.summary.includes(
      "not final live beta proof",
    ),
  );
  assert.ok(
    seededChecklist.liveProofReceipt.warnings.some((warning) =>
      warning.includes("not a real local live drill"),
    ),
  );

  const mixedLedgers = {
    ...completeBrainFlowLedgers,
    modelRuns: completeBrainFlowLedgers.modelRuns.map((row) =>
      row.requestId === "chat-req-1"
        ? {
            ...row,
            metadata: {
              ...row.metadata,
              proofSource: "local_qa_seed",
              qaSeeded: true,
            },
          }
        : row,
    ),
  };
  const mixedBrainFlow = buildBrainFlowCoverageFromLedgers(mixedLedgers);
  const mixedCoherentProof = buildCoherentLiveProofFromLedgers(mixedLedgers);
  const mixedChecklist = buildProviderKeyProofChecklist({
    brainFlow: mixedBrainFlow,
    coherentLiveProof: mixedCoherentProof,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });

  assert.equal(mixedChecklist.liveProofReceipt.ready, true);
  assert.equal(mixedChecklist.status, "watch");
  assert.equal(mixedChecklist.proofComplete, true);
  assert.equal(mixedChecklist.betaProofReady, false);
  assert.equal(mixedChecklist.sourceReadyForBeta, false);
  assert.equal(mixedChecklist.liveProofReceipt.sourceKind, "mixed");
  assert.equal(mixedChecklist.liveProofReceipt.sourceReadyForBeta, false);
  assert.ok(mixedChecklist.liveProofReceipt.sourceSummary.includes("mixes"));
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
  assert.equal(checklist.liveProofDrillPacket.status, "blocked");
  assert.equal(checklist.liveProofDrillPacket.canRun, false);
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
  assert.equal(completeCoherentLiveProof.readyChecks, 10);
  assert.equal(completeCoherentLiveProof.totalChecks, 10);
  assert.equal(completeCoherentLiveProof.proofWindowReady, true);
  assert.equal(completeCoherentLiveProof.proofFresh, true);
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
  assert.deepEqual(completeCoherentLiveProof.sharedProofAttemptIds, [
    PROOF_ATTEMPT_ID,
  ]);
  assert.deepEqual(completeCoherentLiveProof.proofAttemptLifecycleEventIds, [
    "proof-attempt-started-1",
  ]);
  assert.equal(
    completeCoherentLiveProof.checks.find(
      (check) => check.id === "shared_proof_attempt",
    )?.ready,
    true,
  );
  assert.equal(
    completeCoherentLiveProof.checks.find(
      (check) => check.id === "proof_attempt_lifecycle",
    )?.ready,
    true,
  );
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
  assert.equal(
    completeCoherentLiveProof.checks.find(
      (check) => check.id === "real_voice_provider_ready",
    )?.ready,
    true,
  );
  assert.equal(
    completeCoherentLiveProof.checks.find(
      (check) => check.id === "provider_evidence_attempt_bound",
    )?.ready,
    true,
  );
  assert.equal(completeCoherentLiveProof.requestBundles.length, 2);
  const chatBundle = completeCoherentLiveProof.requestBundles.find(
    (bundle) => bundle.layer === "chat",
  );
  const voiceBundle = completeCoherentLiveProof.requestBundles.find(
    (bundle) => bundle.layer === "voice",
  );
  assert.equal(chatBundle?.requestId, "chat-req-1");
  assert.equal(chatBundle?.completedModelRows, 1);
  assert.equal(chatBundle?.providerRows, 1);
  assert.equal(chatBundle?.transcriptRows, 1);
  assert.equal(chatBundle?.backgroundRows, 1);
  assert.deepEqual(chatBundle?.proofAttemptIds, [PROOF_ATTEMPT_ID]);
  assert.deepEqual(chatBundle?.missingRows, []);
  assert.equal(chatBundle?.providerCaptures.length, 1);
  assert.equal(chatBundle?.providerCaptures[0]?.provider, "openrouter");
  assert.equal(
    chatBundle?.providerCaptures[0]?.usedModel,
    "openai/gpt-4.1-mini",
  );
  assert.deepEqual(chatBundle?.providerCaptures[0]?.proofAttemptIds, [
    PROOF_ATTEMPT_ID,
  ]);
  assert.deepEqual(chatBundle?.providerCaptures[0]?.evidence.sources, [
    "provider_model_run",
  ]);
  assert.equal(voiceBundle?.requestId, "voice-req-1");
  assert.equal(voiceBundle?.completedModelRows, 1);
  assert.equal(voiceBundle?.providerRows, 1);
  assert.equal(voiceBundle?.transcriptRows, 1);
  assert.equal(voiceBundle?.backgroundRows, 1);
  assert.deepEqual(voiceBundle?.proofAttemptIds, [PROOF_ATTEMPT_ID]);
  assert.deepEqual(voiceBundle?.missingRows, []);
  assert.equal(voiceBundle?.providerCaptures.length, 1);
  assert.equal(voiceBundle?.providerCaptures[0]?.provider, "deepgram");
  assert.equal(voiceBundle?.providerCaptures[0]?.phase, "settings");
  assert.deepEqual(voiceBundle?.providerCaptures[0]?.proofAttemptIds, [
    PROOF_ATTEMPT_ID,
  ]);
  assert.deepEqual(voiceBundle?.providerCaptures[0]?.evidence.sources, [
    "voice_provider_ready",
  ]);
});

test("coherent live proof requires a shared deliberate proof attempt id", () => {
  const withoutProofAttemptMetadata = (row) => ({
    ...row,
    metadata: row.metadata
      ? Object.fromEntries(
          Object.entries(row.metadata).filter(
            ([key]) => key !== "proofAttemptId",
          ),
        )
      : row.metadata,
  });
  const ledgersWithoutAttempt = {
    ...completeBrainFlowLedgers,
    memoryEvents: completeBrainFlowLedgers.memoryEvents.map(
      withoutProofAttemptMetadata,
    ),
    modelRuns: completeBrainFlowLedgers.modelRuns.map(
      withoutProofAttemptMetadata,
    ),
    systemActivityEvents: completeBrainFlowLedgers.systemActivityEvents.map(
      withoutProofAttemptMetadata,
    ),
  };
  const proof = buildCoherentLiveProofFromLedgers(ledgersWithoutAttempt);

  assert.equal(proof.status, "watch");
  assert.equal(proof.ready, false);
  assert.deepEqual(proof.sharedProofAttemptIds, []);
  assert.ok(proof.missingChecks.includes("Shared deliberate proof attempt"));
  assert.equal(
    proof.checks.find((check) => check.id === "shared_proof_attempt")?.ready,
    false,
  );
});

test("coherent live proof requires a durable proof attempt lifecycle row", () => {
  const ledgersWithoutLifecycle = {
    ...completeBrainFlowLedgers,
    memoryEvents: completeBrainFlowLedgers.memoryEvents.filter(
      (row) => row.eventType !== "beta_proof_attempt_started",
    ),
  };
  const proof = buildCoherentLiveProofFromLedgers(ledgersWithoutLifecycle);

  assert.equal(proof.status, "watch");
  assert.equal(proof.ready, false);
  assert.deepEqual(proof.sharedProofAttemptIds, [PROOF_ATTEMPT_ID]);
  assert.deepEqual(proof.proofAttemptLifecycleEventIds, []);
  assert.ok(proof.missingChecks.includes("Proof attempt lifecycle recorded"));
  assert.equal(
    proof.checks.find((check) => check.id === "proof_attempt_lifecycle")?.ready,
    false,
  );
});

test("coherent live proof requires provider rows to carry the shared proof attempt id", () => {
  const withoutProofAttemptMetadata = (row) => ({
    ...row,
    metadata: row.metadata
      ? Object.fromEntries(
          Object.entries(row.metadata).filter(
            ([key]) => key !== "proofAttemptId",
          ),
        )
      : row.metadata,
  });
  const ledgersWithoutProviderAttempt = {
    ...completeBrainFlowLedgers,
    modelRuns: completeBrainFlowLedgers.modelRuns.map((row) =>
      row.source === "chat_stream" ? withoutProofAttemptMetadata(row) : row,
    ),
    systemActivityEvents: completeBrainFlowLedgers.systemActivityEvents.map(
      withoutProofAttemptMetadata,
    ),
  };
  const proof = buildCoherentLiveProofFromLedgers(
    ledgersWithoutProviderAttempt,
  );

  assert.equal(proof.status, "watch");
  assert.equal(proof.ready, false);
  assert.equal(proof.readyChecks, 9);
  assert.equal(proof.totalChecks, 10);
  assert.deepEqual(proof.sharedProofAttemptIds, [PROOF_ATTEMPT_ID]);
  assert.ok(
    proof.missingChecks.includes("Provider evidence shares proof attempt"),
  );
  assert.equal(
    proof.checks.find((check) => check.id === "typed_chat_request_bundle")
      ?.ready,
    true,
  );
  assert.equal(
    proof.checks.find((check) => check.id === "live_voice_request_bundle")
      ?.ready,
    true,
  );
  assert.equal(
    proof.checks.find((check) => check.id === "real_voice_provider_ready")
      ?.ready,
    true,
  );
  assert.equal(
    proof.checks.find((check) => check.id === "provider_evidence_attempt_bound")
      ?.ready,
    false,
  );
  for (const bundle of proof.requestBundles) {
    assert.equal(bundle.complete, true);
    assert.deepEqual(bundle.missingRows, []);
    assert.equal(bundle.providerCaptures[0]?.proofAttemptIds.length, 0);
  }
});

test("coherent live proof rejects stale selected rows when diagnostic time is provided", () => {
  const freshLedgers = timestampedCompleteLedgers();
  const freshProof = buildCoherentLiveProofFromLedgers(freshLedgers, {
    nowMs: PROOF_BASE_TS + 60 * 1000,
  });
  const staleProof = buildCoherentLiveProofFromLedgers(freshLedgers, {
    nowMs: PROOF_BASE_TS + 3 * 60 * 60 * 1000,
  });
  const staleChecklist = buildProviderKeyProofChecklist({
    brainFlow: buildBrainFlowCoverageFromLedgers(freshLedgers),
    coherentLiveProof: staleProof,
    providerKeys: {
      chatModelKeyConfigured: true,
      voiceRealtimeKeyConfigured: true,
    },
  });

  assert.equal(freshProof.status, "ready");
  assert.equal(freshProof.proofFresh, true);
  assert.equal(freshProof.proofWindowReady, true);
  assert.equal(staleProof.status, "watch");
  assert.equal(staleProof.ready, false);
  assert.equal(staleProof.proofFresh, false);
  assert.equal(staleProof.proofWindowReady, true);
  assert.ok(staleProof.proofAgeMs > staleProof.maxProofAgeMs);
  assert.ok(staleProof.missingChecks.includes("Fresh live proof window"));
  assert.equal(
    staleProof.checks.find((check) => check.id === "fresh_live_proof_window")
      ?.ready,
    false,
  );
  assert.equal(staleChecklist.status, "watch");
  assert.equal(staleChecklist.proofComplete, false);
  assert.ok(
    staleChecklist.missingChecks.includes("Coherent chat + voice beta bundle"),
  );
});

test("coherent live proof rejects chat and voice evidence outside one local proof window", () => {
  const wideLedgers = timestampedCompleteLedgers({
    voiceOffsetMs: 45 * 60 * 1000,
  });
  const wideProof = buildCoherentLiveProofFromLedgers(wideLedgers, {
    nowMs: PROOF_BASE_TS + 46 * 60 * 1000,
  });

  assert.equal(wideProof.status, "watch");
  assert.equal(wideProof.ready, false);
  assert.equal(wideProof.proofFresh, true);
  assert.equal(wideProof.proofWindowReady, false);
  assert.ok(wideProof.proofWindowMs > wideProof.maxProofWindowMs);
  assert.ok(wideProof.missingChecks.includes("Fresh live proof window"));
  assert.equal(
    wideProof.checks.find((check) => check.id === "fresh_live_proof_window")
      ?.status,
    "watch",
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
  assert.deepEqual(
    coherentProof.requestBundles.find((bundle) => bundle.layer === "chat")
      ?.missingRows,
    [
      "Retrieval row",
      "Completed model row",
      "Provider-ready row",
      "Foreground tool job",
      "Evaluated mastery evidence",
      "Saved transcript",
      "Background memory row",
    ],
  );
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

test("coherent live proof rejects fallback model rows for provider-key proof", () => {
  const fallbackModelLedgers = {
    ...completeBrainFlowLedgers,
    modelRuns: completeBrainFlowLedgers.modelRuns.map((run) => ({
      ...run,
      status: "fallback",
    })),
  };
  const aggregateFlow = buildBrainFlowCoverageFromLedgers(fallbackModelLedgers);
  const coherentProof = buildCoherentLiveProofFromLedgers(fallbackModelLedgers);
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
  const fallbackChatBundle = coherentProof.requestBundles.find(
    (bundle) => bundle.layer === "chat",
  );
  const fallbackVoiceBundle = coherentProof.requestBundles.find(
    (bundle) => bundle.layer === "voice",
  );
  assert.equal(fallbackChatBundle?.requestId, "chat-req-1");
  assert.equal(fallbackChatBundle?.completedModelRows, 0);
  assert.equal(fallbackChatBundle?.providerRows, 0);
  assert.equal(fallbackChatBundle?.providerCaptures.length, 0);
  assert.ok(fallbackChatBundle?.missingRows.includes("Provider-ready row"));
  assert.ok(fallbackChatBundle?.missingRows.includes("Completed model row"));
  assert.equal(fallbackVoiceBundle?.requestId, "voice-req-1");
  assert.equal(fallbackVoiceBundle?.completedModelRows, 0);
  assert.equal(fallbackVoiceBundle?.providerRows, 1);
  assert.equal(fallbackVoiceBundle?.providerCaptures.length, 1);
  assert.ok(fallbackVoiceBundle?.missingRows.includes("Completed model row"));
  assert.equal(checklist.status, "watch");
  assert.equal(checklist.canAttemptProviderKeyRun, true);
  assert.equal(checklist.proofComplete, false);
  assert.ok(
    checklist.missingChecks.includes("Coherent chat + voice beta bundle"),
  );
  assert.equal(checklist.liveProofRunbook.status, "watch");
  assert.equal(checklist.liveProofRunbook.nextStepId, "coherent_bundle_export");
});

test("coherent live proof requires real voice provider readiness, not mock voice readiness", () => {
  const mockProviderLedgers = {
    ...completeBrainFlowLedgers,
    systemActivityEvents: [
      {
        ...completeBrainFlowLedgers.systemActivityEvents[0],
        title: "Mock voice provider ready",
      },
    ],
  };
  const proof = buildCoherentLiveProofFromLedgers(mockProviderLedgers);
  const voiceBundle = proof.requestBundles.find(
    (bundle) => bundle.layer === "voice",
  );

  assert.equal(proof.status, "watch");
  assert.equal(proof.ready, false);
  assert.ok(proof.missingChecks.includes("Live voice request bundle"));
  assert.ok(proof.missingChecks.includes("Real voice provider ready"));
  assert.equal(
    proof.checks.find((check) => check.id === "real_voice_provider_ready")
      ?.ready,
    false,
  );
  assert.equal(voiceBundle?.requestId, "voice-req-1");
  assert.equal(voiceBundle?.providerRows, 0);
  assert.equal(voiceBundle?.providerCaptures.length, 0);
  assert.ok(voiceBundle?.missingRows.includes("Provider-ready row"));
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
