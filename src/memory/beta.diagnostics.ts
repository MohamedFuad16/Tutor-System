import type {
  BackgroundJob,
  EvidenceEvent,
  MemoryEvent,
  ModelRun,
  RetrievalEvent,
  ToolJob,
} from "./longterm.memory";
import { MODEL_OBSERVATION_EVIDENCE_CONTRACT } from "./evidence.mastery";

export type BetaDiagnosticStatus = "ready" | "watch" | "blocked" | "deferred";

export type BetaDiagnosticOverallStatus = "ready" | "needs_review" | "blocked";

export type BetaDiagnosticItem = {
  id: string;
  title: string;
  status: BetaDiagnosticStatus;
  summary: string;
  detail?: string;
  count?: number;
  action?: string;
};

export type BetaDiagnosticsInput = {
  learningBooks?: number;
  mappedConcepts?: number;
  bookChatThreads?: number;
  memoryEvents?: number;
  retrievalEvents?: number;
  failedRetrievalEvents?: number;
  modelRuns?: number;
  blockedOrFailedModelRuns?: number;
  fallbackModelRuns?: number;
  toolJobs?: number;
  backgroundJobs?: number;
  runningBackgroundJobs?: number;
  retryScheduledBackgroundJobs?: number;
  deadLetterBackgroundJobs?: number;
  artifactRecords?: number;
  citationStates?: number;
  checkingCitationStates?: number;
  unavailableCitationStates?: number;
  verifiedCitationStates?: number;
  conflictingCitationStates?: number;
  unsupportedCitationStates?: number;
  notCheckedCitationStates?: number;
  correctionEvents?: number;
  openCorrectionEvents?: number;
  appliedCorrectionEvents?: number;
  propagatedCorrectionRows?: number;
  evidenceEvents?: number;
  masteryDeltas?: number;
  traceEvents?: number;
  webSearches?: number;
  brainFlow?: BetaBrainFlowCoverage;
  coherentLiveProof?: CoherentLiveProofBundle;
  runtimeSettings?: unknown;
  generatedAt?: string;
};

export type BetaBrainFlowSignal = {
  id: string;
  title: string;
  ready: boolean;
  count: number;
  detail: string;
  evidence: BetaBrainFlowSignalEvidence;
};

export type BetaBrainFlowSignalEvidence = {
  requestIds: string[];
  sources: string[];
  documentIds: string[];
  proofAttemptIds?: string[];
  latestTimestamp?: number;
};

export type BetaBrainFlowCoverage = {
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  coveragePercent: number;
  readySignals: number;
  totalSignals: number;
  failedRows: number;
  chatContextInjections: number;
  voiceContextInjections: number;
  chatMultiPdfContextInjections: number;
  voiceMultiPdfContextInjections: number;
  requestCorrelatedContextInjections: number;
  requestCorrelatedRetrievalEvents: number;
  requestCorrelatedModelRuns: number;
  foregroundToolJobs: number;
  chatForegroundToolJobs: number;
  voiceForegroundToolJobs: number;
  requestCorrelatedMasteryEvidenceEvents: number;
  chatRequestCorrelatedMasteryEvidenceEvents: number;
  voiceRequestCorrelatedMasteryEvidenceEvents: number;
  threadPersistenceEvents: number;
  requestCorrelatedThreadPersistenceEvents: number;
  chatThreadPersistenceEvents: number;
  voiceThreadPersistenceEvents: number;
  backgroundMemoryEvents: number;
  chatBackgroundMemoryEvents: number;
  voiceBackgroundMemoryEvents: number;
  requestCorrelatedBackgroundMemoryEvents: number;
  modelObservedBackgroundMemoryEvents: number;
  ungatedBackgroundMemoryEvents: number;
  summary: string;
  missingSignals: string[];
  signals: BetaBrainFlowSignal[];
};

export type ProviderKeyProofProviderState = {
  chatModelKeyConfigured?: boolean;
  voiceRealtimeKeyConfigured?: boolean;
};

export const COHERENT_LIVE_PROOF_MAX_WINDOW_MS = 30 * 60 * 1000;
export const COHERENT_LIVE_PROOF_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type ProviderKeyProofCheck = {
  id: string;
  title: string;
  scope: "provider_key" | "live_ledger";
  ready: boolean;
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  count: number;
  signalIds: string[];
  summary: string;
  action: string;
  evidence: BetaBrainFlowSignalEvidence;
};

export type LiveBetaProofRunbookStep = {
  id: string;
  title: string;
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  summary: string;
  action: string;
  evidenceNeeded: string[];
  blockingChecks: string[];
  evidence: BetaBrainFlowSignalEvidence;
};

export type LiveBetaProofRunbook = {
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  canStart: boolean;
  readySteps: number;
  totalSteps: number;
  nextStepId?: string;
  summary: string;
  steps: LiveBetaProofRunbookStep[];
};

export type LiveBetaProofDrillPrompt = {
  id: string;
  layer: "chat" | "voice";
  title: string;
  prompt: string;
  expectedRows: string[];
  toolExpectation: string;
  evidenceGoal: string;
};

export type LiveBetaProofDrillPacket = {
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  canRun: boolean;
  localOnly: true;
  activeAttemptRequired: boolean;
  activeMultiPdfBookRequired: boolean;
  summary: string;
  setupChecklist: string[];
  runSequence: string[];
  blockingChecks: string[];
  exportInstructions: string[];
  prompts: LiveBetaProofDrillPrompt[];
};

export type ProviderKeyProofChecklist = {
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  completionPercent: number;
  liveCoveragePercent: number;
  readyChecks: number;
  totalChecks: number;
  failedRows: number;
  chatModelKeyConfigured: boolean;
  voiceRealtimeKeyConfigured: boolean;
  canAttemptProviderKeyRun: boolean;
  proofComplete: boolean;
  coherentLiveProof: CoherentLiveProofBundle;
  liveProofRunbook: LiveBetaProofRunbook;
  liveProofDrillPacket: LiveBetaProofDrillPacket;
  summary: string;
  missingChecks: string[];
  checks: ProviderKeyProofCheck[];
};

export type ProviderKeyProofInput = {
  brainFlow: BetaBrainFlowCoverage;
  coherentLiveProof?: CoherentLiveProofBundle;
  providerKeys?: ProviderKeyProofProviderState;
};

export type CoherentLiveProofCheck = {
  id: string;
  title: string;
  ready: boolean;
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  summary: string;
  evidence: BetaBrainFlowSignalEvidence;
};

export type CoherentLiveProofProviderCapture = {
  layer: "chat" | "voice";
  title: string;
  source: "provider_model_run" | "voice_provider_ready";
  provider: string;
  requestId?: string;
  requestedModel?: string;
  usedModel?: string;
  phase?: string;
  timestamp?: number;
  proofAttemptIds: string[];
  evidence: BetaBrainFlowSignalEvidence;
};

export type CoherentLiveProofRequestBundle = {
  layer: "chat" | "voice";
  title: string;
  requestId?: string;
  complete: boolean;
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  contextRows: number;
  retrievalRows: number;
  completedModelRows: number;
  providerRows: number;
  toolRows: number;
  evidenceRows: number;
  transcriptRows: number;
  backgroundRows: number;
  documentIds: string[];
  bookIds: string[];
  conversationIds: string[];
  proofAttemptIds: string[];
  latestTimestamp?: number;
  missingRows: string[];
  providerCaptures: CoherentLiveProofProviderCapture[];
  evidence: BetaBrainFlowSignalEvidence;
};

export type CoherentLiveProofBundle = {
  status: Exclude<BetaDiagnosticStatus, "deferred">;
  ready: boolean;
  completionPercent: number;
  readyChecks: number;
  totalChecks: number;
  failedRows: number;
  maxProofWindowMs: number;
  maxProofAgeMs: number;
  proofWindowReady: boolean;
  proofFresh: boolean;
  oldestTimestamp?: number;
  chatRequestId?: string;
  voiceRequestId?: string;
  sharedBookIds: string[];
  sharedConversationIds: string[];
  sharedDocumentIds: string[];
  sharedProofAttemptIds: string[];
  proofAttemptLifecycleEventIds: string[];
  latestTimestamp?: number;
  proofWindowMs?: number;
  proofAgeMs?: number;
  summary: string;
  missingChecks: string[];
  requestBundles: CoherentLiveProofRequestBundle[];
  checks: CoherentLiveProofCheck[];
};

type BetaMemoryEventLedgerRow = Pick<
  MemoryEvent,
  | "eventType"
  | "status"
  | "bookId"
  | "conversationId"
  | "metadata"
  | "timestamp"
> &
  Partial<Pick<MemoryEvent, "id">>;

type BetaModelRunLedgerRow = Pick<
  ModelRun,
  "status" | "requestId" | "source" | "timestamp" | "metadata"
> &
  Partial<
    Pick<ModelRun, "provider" | "requestedModel" | "usedModel" | "estimated">
  >;

type BetaSystemActivityLedgerRow = {
  kind?: string;
  status?: string;
  title?: string;
  requestId?: string;
  phase?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
};

export type BetaBrainFlowLedgerInput = {
  memoryEvents?: BetaMemoryEventLedgerRow[];
  retrievalEvents?: Pick<
    RetrievalEvent,
    "status" | "requestId" | "timestamp" | "metadata"
  >[];
  modelRuns?: BetaModelRunLedgerRow[];
  toolJobs?: Pick<
    ToolJob,
    "status" | "requestId" | "source" | "timestamp" | "metadata"
  >[];
  backgroundJobs?: Pick<
    BackgroundJob,
    "status" | "requestId" | "source" | "timestamp" | "metadata"
  >[];
  evidenceEvents?: Pick<
    EvidenceEvent,
    "evidenceType" | "verified" | "metadata" | "timestamp"
  >[];
  systemActivityEvents?: BetaSystemActivityLedgerRow[];
};

type CoherentLiveProofOptions = {
  nowMs?: number;
  maxProofWindowMs?: number;
  maxProofAgeMs?: number;
};

export type BetaDiagnosticsSnapshot = {
  generatedAt: string;
  localOnly: true;
  overallStatus: BetaDiagnosticOverallStatus;
  summary: {
    totalRows: number;
    ready: number;
    watch: number;
    blocked: number;
    deferred: number;
  };
  counts: Required<
    Omit<
      BetaDiagnosticsInput,
      "brainFlow" | "coherentLiveProof" | "runtimeSettings" | "generatedAt"
    >
  >;
  brainFlow: BetaBrainFlowCoverage;
  coherentLiveProof: CoherentLiveProofBundle;
  runtimeSettings?: unknown;
  items: BetaDiagnosticItem[];
  outOfScope: string[];
};

export type BetaDiagnosticsExportInput = {
  snapshot: BetaDiagnosticsSnapshot;
  ledgers: Record<string, unknown[]>;
  metadata?: Record<string, unknown>;
};

const numberOrZero = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;

const requiredCounts = (
  input: BetaDiagnosticsInput,
): BetaDiagnosticsSnapshot["counts"] => ({
  learningBooks: numberOrZero(input.learningBooks),
  mappedConcepts: numberOrZero(input.mappedConcepts),
  bookChatThreads: numberOrZero(input.bookChatThreads),
  memoryEvents: numberOrZero(input.memoryEvents),
  retrievalEvents: numberOrZero(input.retrievalEvents),
  failedRetrievalEvents: numberOrZero(input.failedRetrievalEvents),
  modelRuns: numberOrZero(input.modelRuns),
  blockedOrFailedModelRuns: numberOrZero(input.blockedOrFailedModelRuns),
  fallbackModelRuns: numberOrZero(input.fallbackModelRuns),
  toolJobs: numberOrZero(input.toolJobs),
  backgroundJobs: numberOrZero(input.backgroundJobs),
  runningBackgroundJobs: numberOrZero(input.runningBackgroundJobs),
  retryScheduledBackgroundJobs: numberOrZero(
    input.retryScheduledBackgroundJobs,
  ),
  deadLetterBackgroundJobs: numberOrZero(input.deadLetterBackgroundJobs),
  artifactRecords: numberOrZero(input.artifactRecords),
  citationStates: numberOrZero(input.citationStates),
  checkingCitationStates: numberOrZero(input.checkingCitationStates),
  unavailableCitationStates: numberOrZero(input.unavailableCitationStates),
  verifiedCitationStates: numberOrZero(input.verifiedCitationStates),
  conflictingCitationStates: numberOrZero(input.conflictingCitationStates),
  unsupportedCitationStates: numberOrZero(input.unsupportedCitationStates),
  notCheckedCitationStates: numberOrZero(input.notCheckedCitationStates),
  correctionEvents: numberOrZero(input.correctionEvents),
  openCorrectionEvents: numberOrZero(input.openCorrectionEvents),
  appliedCorrectionEvents: numberOrZero(input.appliedCorrectionEvents),
  propagatedCorrectionRows: numberOrZero(input.propagatedCorrectionRows),
  evidenceEvents: numberOrZero(input.evidenceEvents),
  masteryDeltas: numberOrZero(input.masteryDeltas),
  traceEvents: numberOrZero(input.traceEvents),
  webSearches: numberOrZero(input.webSearches),
});

const item = (entry: BetaDiagnosticItem): BetaDiagnosticItem => entry;

const objectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const metadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : "";
};

const metadataBoolean = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : undefined;
};

const metadataNumber = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const metadataArrayLength = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.length : 0;
};

const metadataStringArray = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0,
      )
    : [];
};

const compactUnique = (values: unknown[], limit = 5) => {
  const seen = new Set<string>();
  const unique: string[] = [];
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    unique.push(trimmed);
  });
  return unique.slice(0, limit);
};

const sharedStrings = (left: string[], right: string[], limit = 5) => {
  const rightSet = new Set(right);
  return compactUnique(
    left.filter((value) => rightSet.has(value)),
    limit,
  );
};

const hasRequestId = (requestId: unknown) =>
  typeof requestId === "string" && requestId.trim().length > 0;

const requestIdValue = (requestId: unknown) =>
  typeof requestId === "string" && requestId.trim().length > 0
    ? requestId.trim()
    : "";

type SignalEvidenceAnchor = {
  metadata?: Record<string, unknown>;
  proofAttemptId?: unknown;
  requestId?: unknown;
  source?: unknown;
  timestamp?: number;
};

const metadataProofAttemptId = (
  metadata: Record<string, unknown> | undefined,
) =>
  metadataString(metadata, "proofAttemptId") ||
  metadataString(metadata, "betaProofAttemptId") ||
  metadataString(metadata, "liveProofAttemptId");

const buildSignalEvidence = (
  anchors: SignalEvidenceAnchor[],
): BetaBrainFlowSignalEvidence => {
  const timestamps = anchors
    .map((anchor) => anchor.timestamp)
    .filter(
      (timestamp): timestamp is number =>
        typeof timestamp === "number" && Number.isFinite(timestamp),
    );
  const latestTimestamp =
    timestamps.length > 0 ? Math.max(...timestamps) : undefined;
  const proofAttemptIds = compactUnique(
    anchors.map(
      (anchor) =>
        anchor.proofAttemptId ?? metadataProofAttemptId(anchor.metadata),
    ),
    8,
  );
  return {
    requestIds: compactUnique(
      anchors.map((anchor) => anchor.requestId ?? anchor.metadata?.requestId),
    ),
    sources: compactUnique(anchors.map((anchor) => anchor.source)),
    documentIds: compactUnique(
      anchors.flatMap((anchor) =>
        metadataStringArray(anchor.metadata, "contextDocumentIds"),
      ),
    ),
    ...(proofAttemptIds.length > 0 ? { proofAttemptIds } : {}),
    ...(latestTimestamp ? { latestTimestamp } : {}),
  };
};

const mergeAnchors = (
  anchors: SignalEvidenceAnchor[],
): BetaBrainFlowSignalEvidence => buildSignalEvidence(anchors);

const isChatLayer = (metadata: Record<string, unknown> | undefined) => {
  const agentLayer = metadataString(metadata, "agentLayer");
  const mode = metadataString(metadata, "mode");
  return agentLayer === "chat_stream" || mode === "chat";
};

const isVoiceLayer = (metadata: Record<string, unknown> | undefined) => {
  const agentLayer = metadataString(metadata, "agentLayer");
  const mode = metadataString(metadata, "mode");
  return agentLayer === "voice_realtime" || mode === "voice";
};

const isMultiPdfContextInjection = (
  metadata: Record<string, unknown> | undefined,
) =>
  hasRequestId(metadata?.requestId) &&
  metadataNumber(metadata, "documentCount") > 1 &&
  metadataArrayLength(metadata, "contextDocumentIds") > 1;

const isChatThreadPersistence = (
  metadata: Record<string, unknown> | undefined,
) => {
  const mode = metadataString(metadata, "mode");
  return (
    mode === "chat" ||
    mode === "mixed" ||
    metadataBoolean(metadata, "hasTypedChat") === true
  );
};

const isVoiceThreadPersistence = (
  metadata: Record<string, unknown> | undefined,
) => {
  const mode = metadataString(metadata, "mode");
  return (
    mode === "voice" ||
    mode === "mixed" ||
    metadataBoolean(metadata, "hasVoiceSession") === true ||
    metadataNumber(metadata, "voiceSessionCount") > 0 ||
    metadataNumber(metadata, "voiceTurnCount") > 0
  );
};

const MODEL_OBSERVATION_MEMORY_EVENTS = new Set<MemoryEvent["eventType"]>([
  "learning_book_updated",
  "learning_concept_updated",
  "graph_concept_updated",
]);

const hasModelObservationGate = (
  metadata: Record<string, unknown> | undefined,
) =>
  metadataString(metadata, "evidenceContract") ===
    MODEL_OBSERVATION_EVIDENCE_CONTRACT &&
  metadataString(metadata, "evidenceRole") === "model_observation" &&
  metadataString(metadata, "evidenceType") === "model_summary" &&
  metadataBoolean(metadata, "evidenceVerified") === false &&
  metadataBoolean(metadata, "masteryMutationAllowed") === false &&
  metadataBoolean(metadata, "confidenceMutationAllowed") === false;

export const buildBrainFlowCoverageFromLedgers = ({
  memoryEvents = [],
  retrievalEvents = [],
  modelRuns = [],
  toolJobs = [],
  evidenceEvents = [],
}: BetaBrainFlowLedgerInput = {}): BetaBrainFlowCoverage => {
  const completedContextEvents = memoryEvents.filter(
    (event) =>
      event.eventType === "brain_context_injected" &&
      event.status === "completed",
  );
  const chatContextRows = completedContextEvents.filter((event) =>
    isChatLayer(event.metadata),
  );
  const voiceContextRows = completedContextEvents.filter((event) =>
    isVoiceLayer(event.metadata),
  );
  const chatMultiPdfContextRows = chatContextRows.filter((event) =>
    isMultiPdfContextInjection(event.metadata),
  );
  const voiceMultiPdfContextRows = voiceContextRows.filter((event) =>
    isMultiPdfContextInjection(event.metadata),
  );
  const requestCorrelatedContextRows = completedContextEvents.filter((event) =>
    hasRequestId(event.metadata?.requestId),
  );
  const requestCorrelatedRetrievalRows = retrievalEvents.filter(
    (event) => event.status === "completed" && hasRequestId(event.requestId),
  );
  const requestCorrelatedModelRows = modelRuns.filter(
    (run) =>
      (run.status === "completed" || run.status === "fallback") &&
      hasRequestId(run.requestId),
  );
  const foregroundToolJobRows = toolJobs.filter(
    (job) =>
      job.status === "completed" &&
      hasRequestId(job.requestId) &&
      ["chat_stream", "voice_agent"].includes(job.source || ""),
  );
  const chatForegroundToolJobRows = foregroundToolJobRows.filter(
    (job) => job.source === "chat_stream",
  );
  const voiceForegroundToolJobRows = foregroundToolJobRows.filter(
    (job) => job.source === "voice_agent",
  );
  const requestCorrelatedMasteryEvidenceRows = evidenceEvents.filter(
    (event) =>
      event.verified &&
      event.evidenceType !== "model_summary" &&
      hasRequestId(event.metadata?.requestId),
  );
  const requestCorrelatedMasteryEvidenceEvents =
    requestCorrelatedMasteryEvidenceRows.length;
  const chatRequestCorrelatedMasteryEvidenceRows =
    requestCorrelatedMasteryEvidenceRows.filter((event) =>
      isChatLayer(event.metadata),
    );
  const voiceRequestCorrelatedMasteryEvidenceRows =
    requestCorrelatedMasteryEvidenceRows.filter((event) =>
      isVoiceLayer(event.metadata),
    );
  const completedThreadPersistenceEvents = memoryEvents.filter(
    (event) =>
      event.eventType === "book_chat_thread_saved" &&
      event.status === "completed" &&
      hasRequestId(event.bookId) &&
      hasRequestId(event.conversationId),
  );
  const requestCorrelatedThreadPersistenceRows =
    completedThreadPersistenceEvents.filter((event) =>
      hasRequestId(event.metadata?.requestId),
    );
  const chatThreadPersistenceRows =
    requestCorrelatedThreadPersistenceRows.filter((event) =>
      isChatThreadPersistence(event.metadata),
    );
  const voiceThreadPersistenceRows =
    requestCorrelatedThreadPersistenceRows.filter((event) =>
      isVoiceThreadPersistence(event.metadata),
    );
  const backgroundMemoryEvents = memoryEvents.filter(
    (event) =>
      event.status === "completed" &&
      [
        "interaction_recorded",
        "learning_book_updated",
        "learning_concept_updated",
        "graph_concept_updated",
      ].includes(event.eventType),
  );
  const modelObservationBackgroundRows = backgroundMemoryEvents.filter(
    (event) => MODEL_OBSERVATION_MEMORY_EVENTS.has(event.eventType),
  );
  const modelObservedBackgroundRows = modelObservationBackgroundRows.filter(
    (event) => hasModelObservationGate(event.metadata),
  );
  const ungatedBackgroundRows = modelObservationBackgroundRows.filter(
    (event) => !hasModelObservationGate(event.metadata),
  );
  const requestCorrelatedBackgroundMemoryEvents = backgroundMemoryEvents.filter(
    (event) => hasRequestId(event.metadata?.requestId),
  );
  const chatBackgroundMemoryRows =
    requestCorrelatedBackgroundMemoryEvents.filter((event) => {
      return isChatLayer(event.metadata);
    });
  const voiceBackgroundMemoryRows =
    requestCorrelatedBackgroundMemoryEvents.filter((event) => {
      return isVoiceLayer(event.metadata);
    });
  const failedRows =
    memoryEvents.filter((event) => event.status === "failed").length +
    retrievalEvents.filter((event) => event.status === "failed").length +
    modelRuns.filter((run) => ["blocked", "failed"].includes(run.status))
      .length +
    toolJobs.filter((job) => ["blocked", "failed"].includes(job.status)).length;

  const chatContextInjections = chatContextRows.length;
  const voiceContextInjections = voiceContextRows.length;
  const chatMultiPdfContextInjections = chatMultiPdfContextRows.length;
  const voiceMultiPdfContextInjections = voiceMultiPdfContextRows.length;
  const requestCorrelatedContextInjections =
    requestCorrelatedContextRows.length;
  const requestCorrelatedRetrievalEvents =
    requestCorrelatedRetrievalRows.length;
  const requestCorrelatedModelRuns = requestCorrelatedModelRows.length;
  const foregroundToolJobs = foregroundToolJobRows.length;
  const chatForegroundToolJobs = chatForegroundToolJobRows.length;
  const voiceForegroundToolJobs = voiceForegroundToolJobRows.length;
  const chatRequestCorrelatedMasteryEvidenceEvents =
    chatRequestCorrelatedMasteryEvidenceRows.length;
  const voiceRequestCorrelatedMasteryEvidenceEvents =
    voiceRequestCorrelatedMasteryEvidenceRows.length;
  const chatThreadPersistenceEvents = chatThreadPersistenceRows.length;
  const voiceThreadPersistenceEvents = voiceThreadPersistenceRows.length;
  const chatBackgroundMemoryEvents = chatBackgroundMemoryRows.length;
  const voiceBackgroundMemoryEvents = voiceBackgroundMemoryRows.length;

  const memoryEventAnchors = (
    events: typeof completedContextEvents,
  ): SignalEvidenceAnchor[] =>
    events.map((event) => ({
      metadata: event.metadata,
      requestId: event.metadata?.requestId,
      source: event.eventType,
      timestamp: event.timestamp,
    }));
  const retrievalAnchors = (
    events: typeof requestCorrelatedRetrievalRows,
  ): SignalEvidenceAnchor[] =>
    events.map((event) => ({
      requestId: event.requestId,
      source: "retrieval_event",
      timestamp: event.timestamp,
    }));
  const modelRunAnchors = (
    events: typeof requestCorrelatedModelRows,
  ): SignalEvidenceAnchor[] =>
    events.map((run) => ({
      requestId: run.requestId,
      source: run.source || "model_run",
      timestamp: run.timestamp,
    }));
  const toolJobAnchors = (
    jobs: typeof foregroundToolJobRows,
  ): SignalEvidenceAnchor[] =>
    jobs.map((job) => ({
      requestId: job.requestId,
      source: job.source || "tool_job",
      timestamp: job.timestamp,
    }));
  const evidenceAnchors = (
    events: typeof requestCorrelatedMasteryEvidenceRows,
  ): SignalEvidenceAnchor[] =>
    events.map((event) => ({
      metadata: event.metadata,
      requestId: event.metadata?.requestId,
      source: event.evidenceType,
      timestamp: event.timestamp,
    }));

  const signals: BetaBrainFlowSignal[] = [
    {
      id: "chat_context",
      title: "Chat context injected",
      ready: chatContextInjections > 0,
      count: chatContextInjections,
      detail:
        "Typed chat has at least one durable brain_context_injected row from the shared context packet builder.",
      evidence: buildSignalEvidence(memoryEventAnchors(chatContextRows)),
    },
    {
      id: "voice_context",
      title: "Voice context injected",
      ready: voiceContextInjections > 0,
      count: voiceContextInjections,
      detail:
        "Live voice has at least one durable brain_context_injected row from the same packet boundary.",
      evidence: buildSignalEvidence(memoryEventAnchors(voiceContextRows)),
    },
    {
      id: "chat_multi_pdf_context",
      title: "Chat multi-PDF context",
      ready: chatMultiPdfContextInjections > 0,
      count: chatMultiPdfContextInjections,
      detail:
        "Typed chat has a request-correlated context row whose prompt included excerpts from more than one ready PDF in the active book.",
      evidence: buildSignalEvidence(
        memoryEventAnchors(chatMultiPdfContextRows),
      ),
    },
    {
      id: "voice_multi_pdf_context",
      title: "Voice multi-PDF context",
      ready: voiceMultiPdfContextInjections > 0,
      count: voiceMultiPdfContextInjections,
      detail:
        "Live voice has a request-correlated context row whose prompt included excerpts from more than one ready PDF in the active book.",
      evidence: buildSignalEvidence(
        memoryEventAnchors(voiceMultiPdfContextRows),
      ),
    },
    {
      id: "request_correlation",
      title: "Request correlation",
      ready:
        requestCorrelatedContextInjections > 0 &&
        requestCorrelatedRetrievalEvents > 0 &&
        requestCorrelatedModelRuns > 0,
      count:
        requestCorrelatedContextInjections +
        requestCorrelatedRetrievalEvents +
        requestCorrelatedModelRuns +
        requestCorrelatedThreadPersistenceRows.length,
      detail:
        "Context injection, retrieval, model-run, and transcript-save rows share request ids for Admin request timelines.",
      evidence: buildSignalEvidence([
        ...memoryEventAnchors(requestCorrelatedContextRows),
        ...retrievalAnchors(requestCorrelatedRetrievalRows),
        ...modelRunAnchors(requestCorrelatedModelRows),
        ...memoryEventAnchors(requestCorrelatedThreadPersistenceRows),
      ]),
    },
    {
      id: "chat_foreground_tools",
      title: "Chat tool calls",
      ready: chatForegroundToolJobs > 0,
      count: chatForegroundToolJobs,
      detail:
        "Typed chat has completed at least one request-correlated foreground tool job.",
      evidence: buildSignalEvidence(toolJobAnchors(chatForegroundToolJobRows)),
    },
    {
      id: "voice_foreground_tools",
      title: "Voice tool calls",
      ready: voiceForegroundToolJobs > 0,
      count: voiceForegroundToolJobs,
      detail:
        "Live voice has completed at least one request-correlated foreground tool job.",
      evidence: buildSignalEvidence(toolJobAnchors(voiceForegroundToolJobRows)),
    },
    {
      id: "chat_evaluated_mastery",
      title: "Chat evaluated mastery",
      ready: chatRequestCorrelatedMasteryEvidenceEvents > 0,
      count: chatRequestCorrelatedMasteryEvidenceEvents,
      detail:
        "Typed chat has verified non-model mastery evidence with a request id.",
      evidence: buildSignalEvidence(
        evidenceAnchors(chatRequestCorrelatedMasteryEvidenceRows),
      ),
    },
    {
      id: "voice_evaluated_mastery",
      title: "Voice evaluated mastery",
      ready: voiceRequestCorrelatedMasteryEvidenceEvents > 0,
      count: voiceRequestCorrelatedMasteryEvidenceEvents,
      detail:
        "Live voice has verified non-model mastery evidence with a request id.",
      evidence: buildSignalEvidence(
        evidenceAnchors(voiceRequestCorrelatedMasteryEvidenceRows),
      ),
    },
    {
      id: "chat_thread_persistence",
      title: "Chat thread saved",
      ready: chatThreadPersistenceEvents > 0,
      count: chatThreadPersistenceEvents,
      detail:
        "Typed chat has a durable book_chat_thread_saved row tied to a local book thread and request id.",
      evidence: buildSignalEvidence(
        memoryEventAnchors(chatThreadPersistenceRows),
      ),
    },
    {
      id: "voice_thread_persistence",
      title: "Voice thread saved",
      ready: voiceThreadPersistenceEvents > 0,
      count: voiceThreadPersistenceEvents,
      detail:
        "Live voice has a durable book_chat_thread_saved row with voice-session transcript evidence and a request id.",
      evidence: buildSignalEvidence(
        memoryEventAnchors(voiceThreadPersistenceRows),
      ),
    },
    {
      id: "background_memory",
      title: "Background memory agent",
      ready: chatBackgroundMemoryEvents > 0 && voiceBackgroundMemoryEvents > 0,
      count: requestCorrelatedBackgroundMemoryEvents.length,
      detail:
        "Typed chat and live voice both have request-correlated background learner-memory rows.",
      evidence: buildSignalEvidence(
        memoryEventAnchors([
          ...chatBackgroundMemoryRows,
          ...voiceBackgroundMemoryRows,
        ]),
      ),
    },
    {
      id: "evidence_gate_contract",
      title: "Evidence gate contract",
      ready:
        modelObservedBackgroundRows.length > 0 &&
        ungatedBackgroundRows.length === 0,
      count: modelObservedBackgroundRows.length,
      detail:
        "Model-derived learner-memory rows declare they are non-verified observations and cannot mutate mastery or confidence.",
      evidence: buildSignalEvidence(
        memoryEventAnchors(modelObservedBackgroundRows),
      ),
    },
  ];
  const readySignals = signals.filter((signal) => signal.ready).length;
  const totalSignals = signals.length;
  const missingSignals = signals
    .filter((signal) => !signal.ready)
    .map((signal) => signal.title);
  const status =
    failedRows > 0
      ? "blocked"
      : readySignals === totalSignals
        ? "ready"
        : "watch";

  return {
    status,
    coveragePercent: Math.round((readySignals / totalSignals) * 100),
    readySignals,
    totalSignals,
    failedRows,
    chatContextInjections,
    voiceContextInjections,
    chatMultiPdfContextInjections,
    voiceMultiPdfContextInjections,
    requestCorrelatedContextInjections,
    requestCorrelatedRetrievalEvents,
    requestCorrelatedModelRuns,
    foregroundToolJobs,
    chatForegroundToolJobs,
    voiceForegroundToolJobs,
    requestCorrelatedMasteryEvidenceEvents,
    chatRequestCorrelatedMasteryEvidenceEvents,
    voiceRequestCorrelatedMasteryEvidenceEvents,
    threadPersistenceEvents: completedThreadPersistenceEvents.length,
    requestCorrelatedThreadPersistenceEvents:
      requestCorrelatedThreadPersistenceRows.length,
    chatThreadPersistenceEvents,
    voiceThreadPersistenceEvents,
    backgroundMemoryEvents: backgroundMemoryEvents.length,
    chatBackgroundMemoryEvents,
    voiceBackgroundMemoryEvents,
    requestCorrelatedBackgroundMemoryEvents:
      requestCorrelatedBackgroundMemoryEvents.length,
    modelObservedBackgroundMemoryEvents: modelObservedBackgroundRows.length,
    ungatedBackgroundMemoryEvents: ungatedBackgroundRows.length,
    summary:
      status === "ready"
        ? "Chat, voice, multi-PDF context, retrieval, model, both foreground tool layers, both evaluated mastery layers, transcript persistence, background memory, and model-observation gates all have local evidence."
        : status === "blocked"
          ? `${failedRows} failed or blocked brain-flow rows need review before beta.`
          : `Missing local evidence for ${missingSignals.join(", ")}.`,
    missingSignals,
    signals,
  };
};

type CoherentModelRunRow = BetaModelRunLedgerRow;

type CoherentRequestFacts = {
  requestId: string;
  contextRows: Pick<MemoryEvent, "metadata" | "timestamp" | "bookId">[];
  retrievalRows: Pick<
    RetrievalEvent,
    "status" | "requestId" | "timestamp" | "metadata"
  >[];
  modelRows: CoherentModelRunRow[];
  providerRows: Array<CoherentModelRunRow | BetaSystemActivityLedgerRow>;
  toolRows: Pick<
    ToolJob,
    "status" | "requestId" | "source" | "timestamp" | "metadata"
  >[];
  evidenceRows: Pick<
    EvidenceEvent,
    "evidenceType" | "verified" | "metadata" | "timestamp"
  >[];
  threadRows: Pick<
    MemoryEvent,
    "metadata" | "timestamp" | "bookId" | "conversationId"
  >[];
  backgroundRows: Pick<
    MemoryEvent,
    "eventType" | "metadata" | "timestamp" | "bookId" | "conversationId"
  >[];
  documentIds: string[];
  bookIds: string[];
  conversationIds: string[];
  proofAttemptIds: string[];
  anchors: SignalEvidenceAnchor[];
  complete: boolean;
};

const coherentBundleRowLabels = [
  {
    key: "contextRows",
    label: "Multi-PDF context",
  },
  {
    key: "retrievalRows",
    label: "Retrieval row",
  },
  {
    key: "modelRows",
    label: "Completed model row",
  },
  {
    key: "providerRows",
    label: "Provider-ready row",
  },
  {
    key: "toolRows",
    label: "Foreground tool job",
  },
  {
    key: "evidenceRows",
    label: "Evaluated mastery evidence",
  },
  {
    key: "threadRows",
    label: "Saved transcript",
  },
  {
    key: "backgroundRows",
    label: "Background memory row",
  },
] as const;

const buildProviderCapture = (
  layer: "chat" | "voice",
  row: CoherentModelRunRow | BetaSystemActivityLedgerRow,
  fallbackRequestId: string,
): CoherentLiveProofProviderCapture => {
  const modelRow = row as Partial<CoherentModelRunRow>;
  const activityRow = row as Partial<BetaSystemActivityLedgerRow>;
  const source =
    layer === "chat" ? "provider_model_run" : "voice_provider_ready";
  const provider =
    layer === "chat"
      ? requestIdValue(modelRow.provider) || "openrouter"
      : "deepgram";
  const requestedModel = requestIdValue(modelRow.requestedModel);
  const usedModel = requestIdValue(modelRow.usedModel);
  const requestId = requestIdValue(row.requestId) || fallbackRequestId;
  const proofAttemptIds = compactUnique(
    [metadataProofAttemptId(row.metadata)],
    5,
  );
  const timestamp =
    typeof row.timestamp === "number" && Number.isFinite(row.timestamp)
      ? row.timestamp
      : undefined;
  const phase = requestIdValue(activityRow.phase);
  const title =
    layer === "chat"
      ? `${provider} ${usedModel || requestedModel || "model"} completed`
      : "Deepgram voice provider ready";

  return {
    layer,
    title,
    source,
    provider,
    ...(requestId ? { requestId } : {}),
    ...(requestedModel ? { requestedModel } : {}),
    ...(usedModel ? { usedModel } : {}),
    ...(phase ? { phase } : {}),
    ...(typeof timestamp === "number" ? { timestamp } : {}),
    proofAttemptIds,
    evidence: buildSignalEvidence([
      {
        metadata: row.metadata,
        proofAttemptId: proofAttemptIds[0],
        requestId,
        source,
        timestamp,
      },
    ]),
  };
};

const buildCoherentRequestBundle = (
  layer: "chat" | "voice",
  facts?: CoherentRequestFacts,
): CoherentLiveProofRequestBundle => {
  const anchors = facts?.anchors || [];
  const latestTimestamp = latestTimestampFromAnchors(anchors);
  const providerCaptures = facts
    ? facts.providerRows
        .map((row) => buildProviderCapture(layer, row, facts.requestId))
        .slice(0, 6)
    : [];
  const rowCount = (key: (typeof coherentBundleRowLabels)[number]["key"]) =>
    facts?.[key].length || 0;
  const missingRows = coherentBundleRowLabels
    .filter((entry) => rowCount(entry.key) === 0)
    .map((entry) => entry.label);
  const title = layer === "chat" ? "Typed chat bundle" : "Live voice bundle";

  return {
    layer,
    title,
    ...(facts?.requestId ? { requestId: facts.requestId } : {}),
    complete: facts?.complete === true,
    status: facts?.complete === true ? "ready" : "watch",
    contextRows: rowCount("contextRows"),
    retrievalRows: rowCount("retrievalRows"),
    completedModelRows: rowCount("modelRows"),
    providerRows: rowCount("providerRows"),
    toolRows: rowCount("toolRows"),
    evidenceRows: rowCount("evidenceRows"),
    transcriptRows: rowCount("threadRows"),
    backgroundRows: rowCount("backgroundRows"),
    documentIds: facts?.documentIds || [],
    bookIds: facts?.bookIds || [],
    conversationIds: facts?.conversationIds || [],
    proofAttemptIds: facts?.proofAttemptIds || [],
    ...(latestTimestamp ? { latestTimestamp } : {}),
    missingRows,
    providerCaptures,
    evidence: facts ? mergeAnchors(anchors) : emptySignalEvidence(),
  };
};

const memoryEventBookId = (event: Pick<MemoryEvent, "bookId" | "metadata">) =>
  requestIdValue(event.bookId) ||
  metadataString(event.metadata, "bookId") ||
  metadataString(event.metadata, "activeBookId") ||
  metadataString(event.metadata, "activeLearningBookId");

const memoryEventConversationId = (
  event: Pick<MemoryEvent, "conversationId" | "metadata">,
) =>
  requestIdValue(event.conversationId) ||
  metadataString(event.metadata, "conversationId") ||
  metadataString(event.metadata, "threadId");

const normalizedText = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isProviderBackedChatModelRun = (run: CoherentModelRunRow) =>
  run.status === "completed" &&
  run.source === "chat_stream" &&
  normalizedText(run.provider) === "openrouter" &&
  Boolean(requestIdValue(run.usedModel) || requestIdValue(run.requestedModel));

const isRealVoiceProviderReadyEvent = (event: BetaSystemActivityLedgerRow) =>
  normalizedText(event.kind) === "voice" &&
  normalizedText(event.status) === "completed" &&
  normalizedText(event.phase) === "settings" &&
  normalizedText(event.title) === "voice provider ready" &&
  !normalizedText(event.title).includes("mock");

const timestampsFromAnchors = (anchors: SignalEvidenceAnchor[]) =>
  anchors
    .map((anchor) => anchor.timestamp)
    .filter(
      (timestamp): timestamp is number =>
        typeof timestamp === "number" && Number.isFinite(timestamp),
    );

const latestTimestampFromAnchors = (anchors: SignalEvidenceAnchor[]) => {
  const timestamps = timestampsFromAnchors(anchors);
  return timestamps.length > 0 ? Math.max(...timestamps) : undefined;
};

const proofWindowSummary = ({
  proofWindowMs,
  maxProofWindowMs,
  proofAgeMs,
  maxProofAgeMs,
}: {
  proofWindowMs?: number;
  maxProofWindowMs: number;
  proofAgeMs?: number;
  maxProofAgeMs: number;
}) => {
  const maxWindowMinutes = Math.round(maxProofWindowMs / 60000);
  const maxAgeMinutes = Math.round(maxProofAgeMs / 60000);

  if (typeof proofWindowMs !== "number") {
    return "No selected live proof timestamps are available yet.";
  }

  if (proofWindowMs > maxProofWindowMs) {
    return `Selected chat and voice rows span ${Math.round(proofWindowMs / 60000)} minutes; the local proof window is ${maxWindowMinutes} minutes.`;
  }

  if (typeof proofAgeMs === "number" && proofAgeMs > maxProofAgeMs) {
    return `Latest selected proof row is ${Math.round(proofAgeMs / 60000)} minutes old; rerun chat and voice within ${maxAgeMinutes} minutes of export.`;
  }

  return `Selected chat and voice rows fit the ${maxWindowMinutes}-minute proof window and the latest row is fresh.`;
};

export const buildCoherentLiveProofFromLedgers = (
  {
    memoryEvents = [],
    retrievalEvents = [],
    modelRuns = [],
    toolJobs = [],
    evidenceEvents = [],
    systemActivityEvents = [],
  }: BetaBrainFlowLedgerInput = {},
  {
    nowMs,
    maxProofWindowMs = COHERENT_LIVE_PROOF_MAX_WINDOW_MS,
    maxProofAgeMs = COHERENT_LIVE_PROOF_MAX_AGE_MS,
  }: CoherentLiveProofOptions = {},
): CoherentLiveProofBundle => {
  const completedContextEvents = memoryEvents.filter(
    (event) =>
      event.eventType === "brain_context_injected" &&
      event.status === "completed",
  );
  const chatMultiPdfContextRows = completedContextEvents
    .filter((event) => isChatLayer(event.metadata))
    .filter((event) => isMultiPdfContextInjection(event.metadata));
  const voiceMultiPdfContextRows = completedContextEvents
    .filter((event) => isVoiceLayer(event.metadata))
    .filter((event) => isMultiPdfContextInjection(event.metadata));
  const requestCorrelatedRetrievalRows = retrievalEvents.filter(
    (event) => event.status === "completed" && hasRequestId(event.requestId),
  );
  const requestCorrelatedModelRows = modelRuns.filter(
    (run) => run.status === "completed" && hasRequestId(run.requestId),
  );
  const realVoiceProviderReadyRows = systemActivityEvents.filter(
    (event) =>
      isRealVoiceProviderReadyEvent(event) && hasRequestId(event.requestId),
  );
  const foregroundToolJobRows = toolJobs.filter(
    (job) =>
      job.status === "completed" &&
      hasRequestId(job.requestId) &&
      ["chat_stream", "voice_agent"].includes(job.source || ""),
  );
  const requestCorrelatedMasteryEvidenceRows = evidenceEvents.filter(
    (event) =>
      event.verified &&
      event.evidenceType !== "model_summary" &&
      hasRequestId(event.metadata?.requestId),
  );
  const requestCorrelatedThreadRows = memoryEvents.filter(
    (event) =>
      event.eventType === "book_chat_thread_saved" &&
      event.status === "completed" &&
      hasRequestId(event.bookId) &&
      hasRequestId(event.conversationId) &&
      hasRequestId(event.metadata?.requestId),
  );
  const chatThreadRows = requestCorrelatedThreadRows.filter((event) =>
    isChatThreadPersistence(event.metadata),
  );
  const voiceThreadRows = requestCorrelatedThreadRows.filter((event) =>
    isVoiceThreadPersistence(event.metadata),
  );
  const proofAttemptStartedRows = memoryEvents.filter(
    (event) =>
      event.eventType === "beta_proof_attempt_started" &&
      event.status === "completed" &&
      Boolean(metadataProofAttemptId(event.metadata)),
  );
  const backgroundRows = memoryEvents.filter(
    (event) =>
      event.status === "completed" &&
      [
        "interaction_recorded",
        "learning_book_updated",
        "learning_concept_updated",
        "graph_concept_updated",
      ].includes(event.eventType) &&
      hasRequestId(event.metadata?.requestId),
  );
  const chatBackgroundRows = backgroundRows.filter((event) =>
    isChatLayer(event.metadata),
  );
  const voiceBackgroundRows = backgroundRows.filter((event) =>
    isVoiceLayer(event.metadata),
  );
  const failedRows =
    memoryEvents.filter((event) => event.status === "failed").length +
    retrievalEvents.filter((event) => event.status === "failed").length +
    modelRuns.filter((run) => ["blocked", "failed"].includes(run.status))
      .length +
    toolJobs.filter((job) => ["blocked", "failed"].includes(job.status)).length;

  const buildFacts = (
    requestId: string,
    layer: "chat" | "voice",
  ): CoherentRequestFacts => {
    const contextRows =
      layer === "chat" ? chatMultiPdfContextRows : voiceMultiPdfContextRows;
    const threadRows = layer === "chat" ? chatThreadRows : voiceThreadRows;
    const toolRows =
      layer === "chat"
        ? foregroundToolJobRows.filter((job) => job.source === "chat_stream")
        : foregroundToolJobRows.filter((job) => job.source === "voice_agent");
    const evidenceRows = requestCorrelatedMasteryEvidenceRows.filter((event) =>
      layer === "chat"
        ? isChatLayer(event.metadata)
        : isVoiceLayer(event.metadata),
    );
    const backgroundRowsForLayer =
      layer === "chat" ? chatBackgroundRows : voiceBackgroundRows;

    const matchingContextRows = contextRows.filter(
      (event) => metadataString(event.metadata, "requestId") === requestId,
    );
    const matchingThreadRows = threadRows.filter(
      (event) => metadataString(event.metadata, "requestId") === requestId,
    );
    const matchingBackgroundRows = backgroundRowsForLayer.filter(
      (event) => metadataString(event.metadata, "requestId") === requestId,
    );
    const matchingRetrievalRows = requestCorrelatedRetrievalRows.filter(
      (event) => event.requestId === requestId,
    );
    const matchingModelRows = requestCorrelatedModelRows.filter(
      (run) => run.requestId === requestId,
    );
    const matchingProviderRows =
      layer === "chat"
        ? matchingModelRows.filter(isProviderBackedChatModelRun)
        : realVoiceProviderReadyRows.filter(
            (event) => event.requestId === requestId,
          );
    const matchingToolRows = toolRows.filter(
      (job) => job.requestId === requestId,
    );
    const matchingEvidenceRows = evidenceRows.filter(
      (event) => metadataString(event.metadata, "requestId") === requestId,
    );
    const anchors: SignalEvidenceAnchor[] = [
      ...matchingContextRows.map((event) => ({
        metadata: event.metadata,
        requestId,
        source: "brain_context_injected",
        timestamp: event.timestamp,
      })),
      ...matchingRetrievalRows.map((event) => ({
        metadata: event.metadata,
        requestId,
        source: "retrieval_event",
        timestamp: event.timestamp,
      })),
      ...matchingModelRows.map((run) => ({
        metadata: run.metadata,
        requestId,
        source: run.source || "model_run",
        timestamp: run.timestamp,
      })),
      ...matchingProviderRows.map((row) => ({
        metadata: row.metadata,
        requestId,
        source:
          layer === "chat" ? "provider_model_run" : "voice_provider_ready",
        timestamp: row.timestamp,
      })),
      ...matchingToolRows.map((job) => ({
        metadata: job.metadata,
        requestId,
        source: job.source || "tool_job",
        timestamp: job.timestamp,
      })),
      ...matchingEvidenceRows.map((event) => ({
        metadata: event.metadata,
        requestId,
        source: event.evidenceType,
        timestamp: event.timestamp,
      })),
      ...matchingThreadRows.map((event) => ({
        metadata: event.metadata,
        requestId,
        source: "book_chat_thread_saved",
        timestamp: event.timestamp,
      })),
      ...matchingBackgroundRows.map((event) => ({
        metadata: event.metadata,
        requestId,
        source: event.eventType,
        timestamp: event.timestamp,
      })),
    ];

    const documentIds = compactUnique(
      matchingContextRows.flatMap((event) =>
        metadataStringArray(event.metadata, "contextDocumentIds"),
      ),
      8,
    );
    const bookIds = compactUnique(
      [
        ...matchingContextRows.map(memoryEventBookId),
        ...matchingThreadRows.map(memoryEventBookId),
        ...matchingBackgroundRows.map(memoryEventBookId),
      ],
      5,
    );
    const conversationIds = compactUnique(
      [
        ...matchingThreadRows.map(memoryEventConversationId),
        ...matchingBackgroundRows.map(memoryEventConversationId),
      ],
      5,
    );
    const proofAttemptIds = compactUnique(
      anchors.map(
        (anchor) =>
          anchor.proofAttemptId ?? metadataProofAttemptId(anchor.metadata),
      ),
      5,
    );

    return {
      requestId,
      contextRows: matchingContextRows,
      retrievalRows: matchingRetrievalRows,
      modelRows: matchingModelRows,
      providerRows: matchingProviderRows,
      toolRows: matchingToolRows,
      evidenceRows: matchingEvidenceRows,
      threadRows: matchingThreadRows,
      backgroundRows: matchingBackgroundRows,
      documentIds,
      bookIds,
      conversationIds,
      proofAttemptIds,
      anchors,
      complete:
        matchingContextRows.length > 0 &&
        matchingRetrievalRows.length > 0 &&
        matchingModelRows.length > 0 &&
        matchingProviderRows.length > 0 &&
        matchingToolRows.length > 0 &&
        matchingEvidenceRows.length > 0 &&
        matchingThreadRows.length > 0 &&
        matchingBackgroundRows.length > 0,
    };
  };

  const chatRequestIds = compactUnique(
    chatMultiPdfContextRows.map((event) =>
      metadataString(event.metadata, "requestId"),
    ),
    12,
  );
  const voiceRequestIds = compactUnique(
    voiceMultiPdfContextRows.map((event) =>
      metadataString(event.metadata, "requestId"),
    ),
    12,
  );
  const chatFacts = chatRequestIds.map((requestId) =>
    buildFacts(requestId, "chat"),
  );
  const voiceFacts = voiceRequestIds.map((requestId) =>
    buildFacts(requestId, "voice"),
  );
  const candidatePairs = chatFacts.flatMap((chat) =>
    voiceFacts.map((voice) => {
      const sharedDocumentIds = sharedStrings(
        chat.documentIds,
        voice.documentIds,
        8,
      );
      const sharedBookIds = sharedStrings(chat.bookIds, voice.bookIds);
      const sharedConversationIds = sharedStrings(
        chat.conversationIds,
        voice.conversationIds,
      );
      const sharedProofAttemptIds = sharedStrings(
        chat.proofAttemptIds,
        voice.proofAttemptIds,
      );
      const score =
        (chat.complete ? 1 : 0) +
        (voice.complete ? 1 : 0) +
        (sharedProofAttemptIds.length > 0 ? 1 : 0) +
        (sharedDocumentIds.length > 1 ? 1 : 0) +
        (sharedBookIds.length > 0 && sharedConversationIds.length > 0 ? 1 : 0) +
        (failedRows === 0 ? 1 : 0);
      return {
        chat,
        voice,
        sharedBookIds,
        sharedConversationIds,
        sharedDocumentIds,
        sharedProofAttemptIds,
        score,
      };
    }),
  );
  const selectedPair = candidatePairs.sort((a, b) => b.score - a.score)[0];
  const selectedChat = selectedPair?.chat;
  const selectedVoice = selectedPair?.voice;
  const sharedBookIds = selectedPair?.sharedBookIds || [];
  const sharedConversationIds = selectedPair?.sharedConversationIds || [];
  const sharedDocumentIds = selectedPair?.sharedDocumentIds || [];
  const sharedProofAttemptIds = selectedPair?.sharedProofAttemptIds || [];
  const sharedProofAttemptLifecycleRows = proofAttemptStartedRows.filter(
    (event) => {
      const proofAttemptId = metadataProofAttemptId(event.metadata);
      return Boolean(
        proofAttemptId && sharedProofAttemptIds.includes(proofAttemptId),
      );
    },
  );
  const proofAttemptLifecycleEventIds = compactUnique(
    sharedProofAttemptLifecycleRows.map((event) => event.id),
    8,
  );
  const allAnchors = [
    ...(selectedChat?.anchors || []),
    ...(selectedVoice?.anchors || []),
    ...sharedProofAttemptLifecycleRows.map((event) => ({
      metadata: event.metadata,
      proofAttemptId: metadataProofAttemptId(event.metadata),
      source: event.eventType,
      timestamp: event.timestamp,
    })),
  ];
  const proofTimestamps = timestampsFromAnchors(allAnchors);
  const latestTimestamp =
    proofTimestamps.length > 0 ? Math.max(...proofTimestamps) : undefined;
  const oldestTimestamp =
    proofTimestamps.length > 0 ? Math.min(...proofTimestamps) : undefined;
  const proofWindowMs =
    typeof latestTimestamp === "number" && typeof oldestTimestamp === "number"
      ? Math.max(0, latestTimestamp - oldestTimestamp)
      : undefined;
  const proofAgeMs =
    typeof nowMs === "number" &&
    Number.isFinite(nowMs) &&
    typeof latestTimestamp === "number"
      ? Math.max(0, nowMs - latestTimestamp)
      : undefined;
  const proofWindowReady =
    typeof proofWindowMs === "number" && proofWindowMs <= maxProofWindowMs;
  const proofFresh =
    typeof proofAgeMs === "number"
      ? proofAgeMs <= maxProofAgeMs
      : typeof latestTimestamp === "number";
  const sharedEvidence = mergeAnchors(allAnchors);
  const requestBundles = [
    buildCoherentRequestBundle("chat", selectedChat),
    buildCoherentRequestBundle("voice", selectedVoice),
  ];

  const checks: CoherentLiveProofCheck[] = [
    {
      id: "typed_chat_request_bundle",
      title: "Typed chat request bundle",
      ready: selectedChat?.complete === true,
      status: selectedChat?.complete === true ? "ready" : "watch",
      summary:
        selectedChat?.complete === true
          ? "One typed-chat request contains context, retrieval, completed model, tool, evaluated mastery, transcript, and background-memory evidence."
          : "No single typed-chat request contains every required live proof row yet; fallback model rows do not count for provider-key proof.",
      evidence: selectedChat
        ? mergeAnchors(selectedChat.anchors)
        : emptySignalEvidence(),
    },
    {
      id: "live_voice_request_bundle",
      title: "Live voice request bundle",
      ready: selectedVoice?.complete === true,
      status: selectedVoice?.complete === true ? "ready" : "watch",
      summary:
        selectedVoice?.complete === true
          ? "One live-voice request contains context, retrieval, completed model, tool, evaluated mastery, transcript, and background-memory evidence."
          : "No single live-voice request contains every required live proof row yet; fallback model rows do not count for provider-key proof.",
      evidence: selectedVoice
        ? mergeAnchors(selectedVoice.anchors)
        : emptySignalEvidence(),
    },
    {
      id: "shared_proof_attempt",
      title: "Shared deliberate proof attempt",
      ready: sharedProofAttemptIds.length > 0,
      status: sharedProofAttemptIds.length > 0 ? "ready" : "watch",
      summary:
        sharedProofAttemptIds.length > 0
          ? "The selected chat and voice rows carry the same Admin-started proof attempt id."
          : "Start a live proof attempt in Admin before running chat and voice so both rows share a deliberate run id.",
      evidence: {
        requestIds: compactUnique(
          [selectedChat?.requestId, selectedVoice?.requestId],
          4,
        ),
        sources: ["proof_attempt_id"],
        documentIds: [],
        proofAttemptIds: sharedProofAttemptIds,
        ...(latestTimestamp ? { latestTimestamp } : {}),
      },
    },
    {
      id: "proof_attempt_lifecycle",
      title: "Proof attempt lifecycle recorded",
      ready: proofAttemptLifecycleEventIds.length > 0,
      status: proofAttemptLifecycleEventIds.length > 0 ? "ready" : "watch",
      summary:
        proofAttemptLifecycleEventIds.length > 0
          ? "A local Admin start event anchors the selected proof attempt in the memory ledger."
          : "Start the proof attempt from Admin so the shared attempt id has a durable local lifecycle row.",
      evidence: {
        requestIds: compactUnique(
          [selectedChat?.requestId, selectedVoice?.requestId],
          4,
        ),
        sources: ["beta_proof_attempt_started"],
        documentIds: [],
        proofAttemptIds: sharedProofAttemptIds,
        ...(latestTimestamp ? { latestTimestamp } : {}),
      },
    },
    {
      id: "shared_multi_pdf_context",
      title: "Shared multi-PDF context",
      ready: sharedDocumentIds.length > 1,
      status: sharedDocumentIds.length > 1 ? "ready" : "watch",
      summary:
        sharedDocumentIds.length > 1
          ? "The selected chat and voice requests share the same multi-PDF context evidence."
          : "The selected chat and voice requests do not yet share more than one PDF context id.",
      evidence: {
        requestIds: compactUnique(
          [selectedChat?.requestId, selectedVoice?.requestId],
          4,
        ),
        sources: ["brain_context_injected"],
        documentIds: sharedDocumentIds,
        ...(latestTimestamp ? { latestTimestamp } : {}),
      },
    },
    {
      id: "shared_book_thread",
      title: "Shared local book thread",
      ready: sharedBookIds.length > 0 && sharedConversationIds.length > 0,
      status:
        sharedBookIds.length > 0 && sharedConversationIds.length > 0
          ? "ready"
          : "watch",
      summary:
        sharedBookIds.length > 0 && sharedConversationIds.length > 0
          ? "The selected chat and voice requests save into the same local book thread."
          : "The selected chat and voice requests do not yet share a saved local book/thread anchor.",
      evidence: {
        requestIds: compactUnique(
          [selectedChat?.requestId, selectedVoice?.requestId],
          4,
        ),
        sources: ["book_chat_thread_saved"],
        documentIds: [],
        ...(latestTimestamp ? { latestTimestamp } : {}),
      },
    },
    {
      id: "no_failed_live_rows",
      title: "No failed live rows",
      ready: failedRows === 0,
      status: failedRows === 0 ? "ready" : "blocked",
      summary:
        failedRows === 0
          ? "No failed or blocked local brain-flow rows are present in the proof window."
          : `${failedRows} failed or blocked rows must be resolved before the coherent proof can pass.`,
      evidence: sharedEvidence,
    },
    {
      id: "real_voice_provider_ready",
      title: "Real voice provider ready",
      ready: (selectedVoice?.providerRows.length || 0) > 0,
      status: (selectedVoice?.providerRows.length || 0) > 0 ? "ready" : "watch",
      summary:
        (selectedVoice?.providerRows.length || 0) > 0
          ? "The selected voice request includes a server-side Deepgram provider-ready row; local mock provider rows do not count."
          : "Run live voice with a real Deepgram provider connection until the server records Voice provider ready; mock voice provider rows do not count for provider-key proof.",
      evidence: selectedVoice
        ? mergeAnchors(
            selectedVoice.anchors.filter(
              (anchor) => anchor.source === "voice_provider_ready",
            ),
          )
        : emptySignalEvidence(),
    },
    {
      id: "fresh_live_proof_window",
      title: "Fresh live proof window",
      ready: proofWindowReady && proofFresh,
      status: proofWindowReady && proofFresh ? "ready" : "watch",
      summary: proofWindowSummary({
        proofWindowMs,
        maxProofWindowMs,
        proofAgeMs,
        maxProofAgeMs,
      }),
      evidence: sharedEvidence,
    },
  ];
  const readyChecks = checks.filter((check) => check.ready).length;
  const totalChecks = checks.length;
  const missingChecks = checks
    .filter((check) => !check.ready)
    .map((check) => check.title);
  const ready = readyChecks === totalChecks;
  const status: Exclude<BetaDiagnosticStatus, "deferred"> =
    failedRows > 0 ? "blocked" : ready ? "ready" : "watch";
  const completionPercent =
    totalChecks > 0 ? Math.round((readyChecks / totalChecks) * 100) : 0;

  return {
    status,
    ready,
    completionPercent,
    readyChecks,
    totalChecks,
    failedRows,
    maxProofWindowMs,
    maxProofAgeMs,
    proofWindowReady,
    proofFresh,
    ...(oldestTimestamp ? { oldestTimestamp } : {}),
    ...(selectedChat ? { chatRequestId: selectedChat.requestId } : {}),
    ...(selectedVoice ? { voiceRequestId: selectedVoice.requestId } : {}),
    sharedBookIds,
    sharedConversationIds,
    sharedDocumentIds,
    sharedProofAttemptIds,
    proofAttemptLifecycleEventIds,
    ...(latestTimestamp ? { latestTimestamp } : {}),
    ...(proofWindowMs !== undefined ? { proofWindowMs } : {}),
    ...(proofAgeMs !== undefined ? { proofAgeMs } : {}),
    summary:
      status === "ready"
        ? "One typed-chat request and one live-voice request form a coherent local beta proof bundle with an Admin-started attempt id plus shared book, thread, and multi-PDF context anchors."
        : status === "blocked"
          ? `${failedRows} failed or blocked rows prevent a coherent chat+voice proof bundle.`
          : `Missing coherent live proof for ${missingChecks.join(", ")}.`,
    missingChecks,
    requestBundles,
    checks,
  };
};

const emptySignalEvidence = (): BetaBrainFlowSignalEvidence => ({
  requestIds: [],
  sources: [],
  documentIds: [],
  proofAttemptIds: [],
});

const mergeSignalEvidence = (
  signals: BetaBrainFlowSignal[],
): BetaBrainFlowSignalEvidence => {
  const latestTimestamps = signals
    .map((signal) => signal.evidence.latestTimestamp)
    .filter(
      (timestamp): timestamp is number =>
        typeof timestamp === "number" && Number.isFinite(timestamp),
    );
  const latestTimestamp =
    latestTimestamps.length > 0 ? Math.max(...latestTimestamps) : undefined;

  return {
    requestIds: compactUnique(
      signals.flatMap((signal) => signal.evidence.requestIds),
      8,
    ),
    sources: compactUnique(
      signals.flatMap((signal) => signal.evidence.sources),
      8,
    ),
    documentIds: compactUnique(
      signals.flatMap((signal) => signal.evidence.documentIds),
      8,
    ),
    proofAttemptIds: compactUnique(
      signals.flatMap((signal) => signal.evidence.proofAttemptIds || []),
      8,
    ),
    ...(latestTimestamp ? { latestTimestamp } : {}),
  };
};

const mergeCheckEvidence = (
  checks: ProviderKeyProofCheck[],
): BetaBrainFlowSignalEvidence => {
  const latestTimestamps = checks
    .map((check) => check.evidence.latestTimestamp)
    .filter(
      (timestamp): timestamp is number =>
        typeof timestamp === "number" && Number.isFinite(timestamp),
    );
  const latestTimestamp =
    latestTimestamps.length > 0 ? Math.max(...latestTimestamps) : undefined;

  return {
    requestIds: compactUnique(
      checks.flatMap((check) => check.evidence.requestIds),
      8,
    ),
    sources: compactUnique(
      checks.flatMap((check) => check.evidence.sources),
      8,
    ),
    documentIds: compactUnique(
      checks.flatMap((check) => check.evidence.documentIds),
      8,
    ),
    proofAttemptIds: compactUnique(
      checks.flatMap((check) => check.evidence.proofAttemptIds || []),
      8,
    ),
    ...(latestTimestamp ? { latestTimestamp } : {}),
  };
};

const providerKeyProofSignalChecks = [
  {
    id: "typed_chat_context_proof",
    title: "Typed chat context proof",
    signalIds: ["chat_context"],
    summary:
      "A provider-key typed chat turn injected a brain context packet into the local ledger.",
    action:
      "Run one typed chat turn with an active learning book and inspect its request timeline.",
  },
  {
    id: "live_voice_context_proof",
    title: "Live voice context proof",
    signalIds: ["voice_context"],
    summary:
      "A provider-key voice turn injected the same brain context packet boundary into the local ledger.",
    action:
      "Run one live voice turn and confirm the voice realtime request id appears in Admin.",
  },
  {
    id: "typed_chat_multi_pdf_proof",
    title: "Typed chat multi-PDF proof",
    signalIds: ["chat_multi_pdf_context"],
    summary:
      "Typed chat context included excerpts from more than one ready PDF in the active book.",
    action:
      "Select a book with multiple ready PDFs before the provider-key typed chat turn.",
  },
  {
    id: "live_voice_multi_pdf_proof",
    title: "Live voice multi-PDF proof",
    signalIds: ["voice_multi_pdf_context"],
    summary:
      "Live voice context included excerpts from more than one ready PDF in the active book.",
    action:
      "Use the same multi-PDF active book during the provider-key voice turn.",
  },
  {
    id: "request_timeline_proof",
    title: "Request timeline proof",
    signalIds: ["request_correlation"],
    summary:
      "Context, retrieval, model-run, and transcript rows share request ids for Admin timelines.",
    action:
      "Open the request timeline and confirm chat and voice rows stay request-correlated.",
  },
  {
    id: "typed_chat_tool_proof",
    title: "Typed chat tool proof",
    signalIds: ["chat_foreground_tools"],
    summary: "Typed chat completed a foreground tool job with a request id.",
    action:
      "Ask typed chat to use a visible tool such as flashcards, answer evaluation, current-page lookup, or web search.",
  },
  {
    id: "live_voice_tool_proof",
    title: "Live voice tool proof",
    signalIds: ["voice_foreground_tools"],
    summary: "Live voice completed a foreground tool job with a request id.",
    action:
      "Ask voice to use a visible tool and confirm the voice-agent tool row completes.",
  },
  {
    id: "typed_chat_mastery_proof",
    title: "Typed chat mastery proof",
    signalIds: ["chat_evaluated_mastery"],
    summary:
      "Typed chat produced verified non-model mastery evidence tied to a request id.",
    action:
      "Run an answer-evaluation turn through typed chat and inspect evaluated mastery evidence.",
  },
  {
    id: "live_voice_mastery_proof",
    title: "Live voice mastery proof",
    signalIds: ["voice_evaluated_mastery"],
    summary:
      "Live voice produced verified non-model mastery evidence tied to a request id.",
    action:
      "Run an answer-evaluation turn by voice and inspect evaluated mastery evidence.",
  },
  {
    id: "typed_chat_transcript_proof",
    title: "Typed chat transcript proof",
    signalIds: ["chat_thread_persistence"],
    summary:
      "Typed chat saved a durable book thread row tied to the provider-key request.",
    action:
      "Reload the book thread after the typed chat turn and inspect the saved transcript row.",
  },
  {
    id: "live_voice_transcript_proof",
    title: "Live voice transcript proof",
    signalIds: ["voice_thread_persistence"],
    summary:
      "Live voice saved a durable book thread row with voice transcript evidence.",
    action:
      "End the voice session and confirm the voice transcript appears in the saved book thread.",
  },
  {
    id: "background_memory_proof",
    title: "Background memory proof",
    signalIds: ["background_memory"],
    summary:
      "Chat and voice both produced request-correlated background learner-memory rows.",
    action:
      "Wait for local memory workers to finish after chat and voice turns, then inspect background rows.",
  },
  {
    id: "model_observation_gate_proof",
    title: "Model observation gate proof",
    signalIds: ["evidence_gate_contract"],
    summary:
      "Model-derived memory rows are marked as unverified observations that cannot mutate mastery or confidence.",
    action:
      "Inspect learning-book or graph-concept rows and confirm the model-observation evidence contract is present.",
  },
] as const;

export const buildLiveBetaProofRunbook = ({
  checks,
  canAttemptProviderKeyRun,
  proofComplete,
  failedRows,
}: {
  checks: ProviderKeyProofCheck[];
  canAttemptProviderKeyRun: boolean;
  proofComplete: boolean;
  failedRows: number;
}): LiveBetaProofRunbook => {
  const checkById = new Map(checks.map((check) => [check.id, check]));

  const step = ({
    id,
    title,
    checkIds,
    readySummary,
    pendingSummary,
    action,
    evidenceNeeded,
  }: {
    id: string;
    title: string;
    checkIds: string[];
    readySummary: string;
    pendingSummary: string;
    action: string;
    evidenceNeeded: string[];
  }): LiveBetaProofRunbookStep => {
    const stepChecks = checkIds
      .map((checkId) => checkById.get(checkId))
      .filter((check): check is ProviderKeyProofCheck => Boolean(check));
    const blockingChecks = stepChecks
      .filter((check) => !check.ready)
      .map((check) => check.title);
    const blocked =
      failedRows > 0 || stepChecks.some((check) => check.status === "blocked");
    const ready = stepChecks.length > 0 && blockingChecks.length === 0;
    const status: Exclude<BetaDiagnosticStatus, "deferred"> = ready
      ? "ready"
      : blocked
        ? "blocked"
        : "watch";

    return {
      id,
      title,
      status,
      summary: ready ? readySummary : pendingSummary,
      action,
      evidenceNeeded,
      blockingChecks,
      evidence: mergeCheckEvidence(stepChecks),
    };
  };

  const steps: LiveBetaProofRunbookStep[] = [
    step({
      id: "provider_keys",
      title: "Confirm local provider keys",
      checkIds: ["chat_model_provider_key", "voice_realtime_provider_key"],
      readySummary:
        "Chat model and realtime voice keys are visible through local settings or server fallback meters.",
      pendingSummary:
        "The deliberate run cannot start until both local provider-key meters are visible.",
      action:
        "Configure OpenRouter and Deepgram locally, then reopen Admin to confirm both meters read as seen.",
      evidenceNeeded: ["chat model key meter", "voice realtime key meter"],
    }),
    step({
      id: "active_multi_pdf_book",
      title: "Use one multi-PDF active book",
      checkIds: ["typed_chat_multi_pdf_proof", "live_voice_multi_pdf_proof"],
      readySummary:
        "Typed chat and live voice both used more than one ready PDF from the same active book.",
      pendingSummary:
        "Choose an active book with multiple ready PDFs before running both proof turns.",
      action:
        "Open the target learning book, make sure at least two PDFs are ready, and keep that book active for the chat and voice turns.",
      evidenceNeeded: [
        "chat contextDocumentIds",
        "voice contextDocumentIds",
        "more than one shared PDF id",
      ],
    }),
    step({
      id: "typed_chat_turn",
      title: "Run the typed-chat proof turn",
      checkIds: [
        "typed_chat_context_proof",
        "request_timeline_proof",
        "typed_chat_tool_proof",
        "typed_chat_mastery_proof",
        "typed_chat_transcript_proof",
      ],
      readySummary:
        "A single typed-chat request has context, request timeline, tool, evaluated mastery, and transcript evidence.",
      pendingSummary:
        "Typed chat still needs a request-correlated turn with tool, mastery, and saved transcript rows.",
      action:
        "Start or keep one Admin proof attempt active, ask typed chat a source-grounded active-recall question that uses a visible tool, then check the request timeline.",
      evidenceNeeded: [
        "brain_context_injected",
        "retrieval row",
        "completed model run",
        "foreground tool job",
        "evaluated mastery evidence",
        "book_chat_thread_saved",
      ],
    }),
    step({
      id: "live_voice_turn",
      title: "Run the live-voice proof turn",
      checkIds: [
        "live_voice_context_proof",
        "live_voice_tool_proof",
        "live_voice_mastery_proof",
        "live_voice_transcript_proof",
      ],
      readySummary:
        "A single live-voice request has context, tool, evaluated mastery, and saved transcript evidence.",
      pendingSummary:
        "Live voice still needs request-correlated context, tool, mastery, and transcript rows.",
      action:
        "Keep the same Admin proof attempt active, start a voice session on the same book, ask for an evaluated answer/tool action, then end the session so the transcript saves.",
      evidenceNeeded: [
        "voice brain_context_injected",
        "voice-agent tool job",
        "voice evaluated mastery evidence",
        "voice book_chat_thread_saved",
      ],
    }),
    step({
      id: "background_memory_gate",
      title: "Wait for memory workers and gates",
      checkIds: ["background_memory_proof", "model_observation_gate_proof"],
      readySummary:
        "Background memory rows are present and model-derived rows keep the observation-only gate.",
      pendingSummary:
        "Background learner-memory evidence or model-observation gate rows are still missing.",
      action:
        "Wait for local memory jobs to complete, then inspect background rows for chat and voice request ids.",
      evidenceNeeded: [
        "request-correlated background rows",
        "model-observation evidence contract",
        "mastery mutation disabled on model summaries",
      ],
    }),
    step({
      id: "coherent_bundle_export",
      title: "Confirm coherent bundle and export",
      checkIds: ["coherent_chat_voice_beta_bundle"],
      readySummary:
        "The selected chat and voice request ids share one deliberate attempt, one book, one thread, and multi-PDF context anchors.",
      pendingSummary:
        "The proof rows exist only when chat and voice form one shared local attempt plus book/thread bundle.",
      action:
        "Use the coherent bundle panel to compare attempt id and request ids, then export the diagnostics JSON for beta review.",
      evidenceNeeded: [
        "shared proof attempt id",
        "proof attempt start memory event",
        "chat request id",
        "voice request id",
        "shared book id",
        "shared thread id",
        "shared PDF ids",
      ],
    }),
  ];

  const readySteps = steps.filter((entry) => entry.status === "ready").length;
  const blockedSteps = steps.filter(
    (entry) => entry.status === "blocked",
  ).length;
  const nextStepId = steps.find((entry) => entry.status !== "ready")?.id;
  const status: Exclude<BetaDiagnosticStatus, "deferred"> =
    blockedSteps > 0 ? "blocked" : proofComplete ? "ready" : "watch";

  return {
    status,
    canStart: canAttemptProviderKeyRun,
    readySteps,
    totalSteps: steps.length,
    ...(nextStepId ? { nextStepId } : {}),
    summary:
      status === "ready"
        ? "The local provider-key chat and voice proof runbook is complete."
        : status === "blocked"
          ? `${failedRows} failed or blocked live rows must be resolved before continuing the proof runbook.`
          : canAttemptProviderKeyRun
            ? "Provider keys are present. Run the ordered chat and voice proof turns, then export the local diagnostics."
            : "Complete local provider-key setup before attempting the deliberate live proof run.",
    steps,
  };
};

export const buildLiveBetaProofDrillPacket = ({
  liveProofRunbook,
  coherentLiveProof,
  canAttemptProviderKeyRun,
  proofComplete,
  failedRows,
}: {
  liveProofRunbook: LiveBetaProofRunbook;
  coherentLiveProof: CoherentLiveProofBundle;
  canAttemptProviderKeyRun: boolean;
  proofComplete: boolean;
  failedRows: number;
}): LiveBetaProofDrillPacket => {
  const blockingChecks = compactUnique(
    liveProofRunbook.steps.flatMap((step) => step.blockingChecks),
    16,
  );
  const selectedRequestIds = compactUnique(
    [coherentLiveProof.chatRequestId, coherentLiveProof.voiceRequestId],
    2,
  );
  const status: Exclude<BetaDiagnosticStatus, "deferred"> =
    failedRows > 0 || liveProofRunbook.status === "blocked"
      ? "blocked"
      : proofComplete
        ? "ready"
        : "watch";
  const canRun = canAttemptProviderKeyRun && status !== "blocked";

  return {
    status,
    canRun,
    localOnly: true,
    activeAttemptRequired: true,
    activeMultiPdfBookRequired: true,
    summary:
      status === "ready"
        ? "The local chat and voice drill has enough coherent ledger rows. Export diagnostics instead of rerunning unless you want a fresh beta proof."
        : canRun
          ? "Use this local-only drill to produce one typed-chat request and one live-voice request against the same active multi-PDF book."
          : "Complete provider-key setup and clear blocked ledger rows before running the local chat and voice drill.",
    setupChecklist: [
      "Open one learning book with at least two ready PDFs.",
      "Start or restart one Admin provider-key proof attempt.",
      "Keep the same book, thread, and proof attempt active for typed chat and live voice.",
      "Confirm chat model and realtime voice provider-key meters are visible before running the drill.",
      "Do not start cloud/AWS deployment work for this beta proof.",
    ],
    runSequence: [
      "Run the typed-chat proof prompt in the active book chat.",
      "Run the live-voice proof script in the same active book and proof attempt.",
      "End the voice session so the transcript can save locally.",
      "Wait for local background memory workers to finish.",
      "Return to Admin Diagnostics and confirm the coherent bundle selects one chat request and one voice request.",
    ],
    blockingChecks,
    exportInstructions: [
      selectedRequestIds.length === 2
        ? `Confirm selected request ids ${selectedRequestIds.join(" and ")} remain in the coherent bundle.`
        : "Confirm the coherent bundle has one selected chat request id and one selected voice request id.",
      "Confirm shared proof attempt, shared book, shared thread, and more than one shared PDF id.",
      "Use Export diagnostics only after the packet status is ready or after you intentionally want to inspect remaining gaps.",
      "Keep the exported JSON local; it is a beta diagnostics artifact, not a cloud sync artifact.",
    ],
    prompts: [
      {
        id: "typed_chat_provider_key_prompt",
        layer: "chat",
        title: "Typed-chat proof prompt",
        prompt:
          'Provider-key proof turn. Use the active learning book and all ready PDFs, not only the visible page. Compare one concept that appears across at least two PDFs, cite the source/page anchors you used, run a visible tutor tool if available, and evaluate this supplied answer for mastery: "The concept connects the two readings through shared evidence; correct me if that is wrong." Keep the response short and make the tool/evidence step visible.',
        expectedRows: [
          "chat brain_context_injected",
          "chat retrieval row",
          "chat completed model run",
          "chat foreground tool job",
          "chat evaluated mastery evidence",
          "chat book_chat_thread_saved",
          "chat request-correlated background memory row",
        ],
        toolExpectation:
          "A typed-chat foreground tool row should complete with the same request id as the context, model, mastery, and transcript rows.",
        evidenceGoal:
          "Typed chat proves multi-PDF context, provider model execution, visible tool use, non-model mastery evidence, transcript persistence, and background memory.",
      },
      {
        id: "live_voice_provider_key_script",
        layer: "voice",
        title: "Live-voice proof script",
        prompt:
          "Provider-key voice proof turn. On this same active book and proof attempt, use all ready PDFs in context. Ask me one short active-recall question that connects two PDFs, then evaluate my spoken answer and use a visible voice tool/source lookup if available. End the session after the evaluation so the transcript saves locally.",
        expectedRows: [
          "voice brain_context_injected",
          "voice retrieval row",
          "voice completed model run",
          "voice-agent tool job",
          "voice evaluated mastery evidence",
          "voice book_chat_thread_saved",
          "voice request-correlated background memory row",
        ],
        toolExpectation:
          "A voice-agent tool row should complete with the same realtime request id as the voice context, model, mastery, and transcript rows.",
        evidenceGoal:
          "Live voice proves the realtime agent layer receives the same multi-PDF book context and stores tool, mastery, transcript, and memory evidence locally.",
      },
    ],
  };
};

export const buildProviderKeyProofChecklist = ({
  brainFlow,
  coherentLiveProof = buildCoherentLiveProofFromLedgers(),
  providerKeys = {},
}: ProviderKeyProofInput): ProviderKeyProofChecklist => {
  const chatModelKeyConfigured = providerKeys.chatModelKeyConfigured === true;
  const voiceRealtimeKeyConfigured =
    providerKeys.voiceRealtimeKeyConfigured === true;
  const signalById = new Map(
    brainFlow.signals.map((signal) => [signal.id, signal]),
  );
  const liveBlocked = brainFlow.status === "blocked";

  const keyChecks: ProviderKeyProofCheck[] = [
    {
      id: "chat_model_provider_key",
      title: "Chat model provider key",
      scope: "provider_key",
      ready: chatModelKeyConfigured,
      status: chatModelKeyConfigured ? "ready" : "watch",
      count: chatModelKeyConfigured ? 1 : 0,
      signalIds: [],
      summary: chatModelKeyConfigured
        ? "A chat model provider key is available through browser settings or local server fallback."
        : "No chat model provider key is visible in browser settings or the local server meter.",
      action:
        "Configure an OpenRouter key in settings or expose a local server fallback before the provider-key run.",
      evidence: emptySignalEvidence(),
    },
    {
      id: "voice_realtime_provider_key",
      title: "Voice realtime provider key",
      scope: "provider_key",
      ready: voiceRealtimeKeyConfigured,
      status: voiceRealtimeKeyConfigured ? "ready" : "watch",
      count: voiceRealtimeKeyConfigured ? 1 : 0,
      signalIds: [],
      summary: voiceRealtimeKeyConfigured
        ? "A realtime voice provider key is available through browser settings or local server fallback."
        : "No realtime voice provider key is visible in browser settings or the local server meter.",
      action:
        "Configure a Deepgram key in settings or expose a local server fallback before the provider-key run.",
      evidence: emptySignalEvidence(),
    },
  ];

  const liveChecks: ProviderKeyProofCheck[] = providerKeyProofSignalChecks.map(
    (definition) => {
      const signals = definition.signalIds
        .map((signalId) => signalById.get(signalId))
        .filter((signal): signal is BetaBrainFlowSignal => Boolean(signal));
      const ready =
        definition.signalIds.length > 0 &&
        definition.signalIds.every(
          (signalId) => signalById.get(signalId)?.ready === true,
        );
      return {
        id: definition.id,
        title: definition.title,
        scope: "live_ledger",
        ready,
        status: ready ? "ready" : liveBlocked ? "blocked" : "watch",
        count: signals.reduce((sum, signal) => sum + signal.count, 0),
        signalIds: [...definition.signalIds],
        summary: ready
          ? definition.summary
          : `Missing live evidence for ${definition.title.toLowerCase()}.`,
        action: definition.action,
        evidence: mergeSignalEvidence(signals),
      };
    },
  );

  const coherentLiveCheck: ProviderKeyProofCheck = {
    id: "coherent_chat_voice_beta_bundle",
    title: "Coherent chat + voice beta bundle",
    scope: "live_ledger",
    ready: coherentLiveProof.ready,
    status: coherentLiveProof.status,
    count: coherentLiveProof.readyChecks,
    signalIds: [],
    summary: coherentLiveProof.ready
      ? coherentLiveProof.summary
      : `Missing coherent live proof for ${coherentLiveProof.missingChecks.join(", ")}.`,
    action:
      "Start a live proof attempt in Admin, run typed chat and live voice against the same active book with multiple ready PDFs, then verify both request ids share the saved local book thread.",
    evidence: {
      requestIds: compactUnique(
        [coherentLiveProof.chatRequestId, coherentLiveProof.voiceRequestId],
        4,
      ),
      sources: ["coherent_live_proof"],
      documentIds: coherentLiveProof.sharedDocumentIds,
      proofAttemptIds: coherentLiveProof.sharedProofAttemptIds,
      ...(coherentLiveProof.latestTimestamp
        ? { latestTimestamp: coherentLiveProof.latestTimestamp }
        : {}),
    },
  };

  const checks = [...keyChecks, ...liveChecks, coherentLiveCheck];
  const readyChecks = checks.filter((check) => check.ready).length;
  const totalChecks = checks.length;
  const missingChecks = checks
    .filter((check) => !check.ready)
    .map((check) => check.title);
  const providerKeysReady =
    chatModelKeyConfigured && voiceRealtimeKeyConfigured;
  const canAttemptProviderKeyRun = providerKeysReady && !liveBlocked;
  const proofComplete = checks.every((check) => check.ready);
  const status: Exclude<BetaDiagnosticStatus, "deferred"> = liveBlocked
    ? "blocked"
    : proofComplete
      ? "ready"
      : "watch";
  const completionPercent =
    totalChecks > 0 ? Math.round((readyChecks / totalChecks) * 100) : 0;
  const summary = liveBlocked
    ? `${brainFlow.failedRows} failed or blocked live rows must be fixed before provider-key proof.`
    : !providerKeysReady
      ? "Provider-key proof needs both chat model and realtime voice keys before a deliberate live run."
      : proofComplete
        ? "Provider-key chat and voice proof is complete in the local ledger."
        : `${readyChecks}/${totalChecks} provider-key proof checks are ready; run deliberate chat and voice beta turns to fill the remaining live evidence.`;
  const liveProofRunbook = buildLiveBetaProofRunbook({
    checks,
    canAttemptProviderKeyRun,
    proofComplete,
    failedRows: brainFlow.failedRows,
  });
  const liveProofDrillPacket = buildLiveBetaProofDrillPacket({
    liveProofRunbook,
    coherentLiveProof,
    canAttemptProviderKeyRun,
    proofComplete,
    failedRows: brainFlow.failedRows,
  });

  return {
    status,
    completionPercent,
    liveCoveragePercent: brainFlow.coveragePercent,
    readyChecks,
    totalChecks,
    failedRows: brainFlow.failedRows,
    chatModelKeyConfigured,
    voiceRealtimeKeyConfigured,
    canAttemptProviderKeyRun,
    proofComplete,
    coherentLiveProof,
    liveProofRunbook,
    liveProofDrillPacket,
    summary,
    missingChecks,
    checks,
  };
};

export const buildBetaDiagnosticsSnapshot = (
  input: BetaDiagnosticsInput,
  fallbackNow = new Date(),
): BetaDiagnosticsSnapshot => {
  const counts = requiredCounts(input);
  const brainFlow =
    input.brainFlow || buildBrainFlowCoverageFromLedgers({ memoryEvents: [] });
  const coherentLiveProof =
    input.coherentLiveProof || buildCoherentLiveProofFromLedgers();
  const totalRows =
    counts.learningBooks +
    counts.mappedConcepts +
    counts.bookChatThreads +
    counts.memoryEvents +
    counts.retrievalEvents +
    counts.modelRuns +
    counts.toolJobs +
    counts.backgroundJobs +
    counts.artifactRecords +
    counts.citationStates +
    counts.correctionEvents +
    counts.evidenceEvents +
    counts.masteryDeltas +
    counts.traceEvents;

  const sourceGroundingStatus: BetaDiagnosticStatus =
    counts.unavailableCitationStates > 0 ||
    counts.checkingCitationStates > 0 ||
    counts.conflictingCitationStates > 0 ||
    counts.unsupportedCitationStates > 0 ||
    counts.notCheckedCitationStates > 0 ||
    (counts.artifactRecords > 0 && counts.verifiedCitationStates === 0)
      ? "watch"
      : counts.artifactRecords > 0
        ? "ready"
        : "watch";

  const items = [
    item({
      id: "local_memory",
      title: "Local memory ledger",
      status:
        counts.memoryEvents > 0 && counts.learningBooks > 0 ? "ready" : "watch",
      summary:
        counts.memoryEvents > 0
          ? `${counts.memoryEvents} memory events, ${counts.learningBooks} learning books, and ${counts.bookChatThreads} saved book chat threads are visible.`
          : "No durable memory events have been observed yet.",
      count: counts.memoryEvents,
      action:
        counts.memoryEvents > 0
          ? "Keep watching for failed writes during beta."
          : "Complete a chat or learning-book update to create memory evidence.",
    }),
    item({
      id: "conversation_persistence",
      title: "Conversation persistence",
      status: counts.bookChatThreads > 0 ? "ready" : "watch",
      summary:
        counts.bookChatThreads > 0
          ? `${counts.bookChatThreads} local book chat thread rows can be reloaded.`
          : "No book chat thread rows have been saved yet.",
      count: counts.bookChatThreads,
      action:
        counts.bookChatThreads > 0
          ? "Confirm typed chat and voice-session saves both appear in Brain Flow Coverage before beta."
          : "Send a typed chat or voice turn with an active learning book to persist a local thread.",
    }),
    item({
      id: "model_behavior",
      title: "Model behavior",
      status:
        counts.blockedOrFailedModelRuns > 0
          ? "blocked"
          : counts.fallbackModelRuns > 0
            ? "watch"
            : counts.modelRuns > 0
              ? "ready"
              : "watch",
      summary:
        counts.blockedOrFailedModelRuns > 0
          ? `${counts.blockedOrFailedModelRuns} blocked or failed model runs need review.`
          : `${counts.modelRuns} model runs recorded locally.`,
      count: counts.modelRuns,
      action:
        counts.blockedOrFailedModelRuns > 0
          ? "Review model-run errors before beta expansion."
          : "Compare runtime settings against model-run outcomes.",
    }),
    item({
      id: "semantic_retrieval",
      title: "Semantic retrieval",
      status:
        counts.failedRetrievalEvents > 0
          ? "blocked"
          : counts.retrievalEvents > 0
            ? "ready"
            : "watch",
      summary:
        counts.failedRetrievalEvents > 0
          ? `${counts.failedRetrievalEvents} retrieval failures are present.`
          : `${counts.retrievalEvents} retrieval selections are available for audit.`,
      count: counts.retrievalEvents,
      action:
        counts.failedRetrievalEvents > 0
          ? "Inspect failed retrieval rows and active-book filters."
          : "Use retrieval rows to tune context size during beta.",
    }),
    item({
      id: "background_jobs",
      title: "Background jobs",
      status:
        counts.deadLetterBackgroundJobs > 0
          ? "blocked"
          : counts.retryScheduledBackgroundJobs > 0 ||
              counts.runningBackgroundJobs > 0
            ? "watch"
            : counts.backgroundJobs > 0
              ? "ready"
              : "watch",
      summary:
        counts.deadLetterBackgroundJobs > 0
          ? `${counts.deadLetterBackgroundJobs} local background jobs reached dead-letter.`
          : counts.backgroundJobs > 0
            ? `${counts.backgroundJobs} background job rows; ${counts.runningBackgroundJobs} running and ${counts.retryScheduledBackgroundJobs} retry scheduled.`
            : "No durable background job rows have been observed yet.",
      count: counts.backgroundJobs,
      action:
        counts.deadLetterBackgroundJobs > 0
          ? "Open Admin activity timelines and inspect the dead-letter job error before beta expansion."
          : counts.backgroundJobs > 0
            ? "Use background job rows to confirm memory capture finishes after chat and voice turns."
            : "Complete a chat or voice turn to create local background memory job evidence.",
    }),
    item({
      id: "source_grounding",
      title: "Source grounding",
      status: sourceGroundingStatus,
      summary:
        counts.artifactRecords > 0
          ? `${counts.artifactRecords} artifacts, ${counts.verifiedCitationStates} verified, ${counts.checkingCitationStates} checking, ${counts.unavailableCitationStates} unavailable, ${counts.conflictingCitationStates} conflicting, ${counts.unsupportedCitationStates} unsupported, ${counts.notCheckedCitationStates} not checked citations.`
          : "No source artifacts have been captured yet.",
      count: counts.artifactRecords,
      action:
        counts.verifiedCitationStates > 0
          ? "Keep local citation-state transitions reviewable and do not treat them as external content proof."
          : "Run a local verifier before claiming a citation-state row is verified.",
    }),
    item({
      id: "correction_control",
      title: "Correction control",
      status: counts.openCorrectionEvents > 0 ? "watch" : "ready",
      summary:
        counts.openCorrectionEvents > 0
          ? `${counts.openCorrectionEvents} open correction requests need human review.`
          : counts.propagatedCorrectionRows > 0
            ? `${counts.appliedCorrectionEvents} applied correction requests marked ${counts.propagatedCorrectionRows} local rows.`
            : "No open correction requests are waiting.",
      count: counts.correctionEvents,
      action:
        counts.openCorrectionEvents > 0
          ? "Resolve or supersede open requests before export-based review."
          : counts.propagatedCorrectionRows > 0
            ? "Review correction overlays before destructive deletion is considered."
            : "Use Admin correction controls to mark wrong or stale learner-brain rows.",
    }),
    item({
      id: "evidence_mastery",
      title: "Evidence and mastery",
      status:
        counts.evidenceEvents > 0 || counts.masteryDeltas > 0
          ? "ready"
          : "watch",
      summary: `${counts.evidenceEvents} evidence events and ${counts.masteryDeltas} mastery deltas are visible.`,
      count: counts.evidenceEvents + counts.masteryDeltas,
      action:
        counts.masteryDeltas > 0
          ? "Confirm mastery movement comes only from explicit recall evidence."
          : "Run active recall to populate mastery audit evidence.",
    }),
    item({
      id: "brain_flow_coverage",
      title: "Brain flow coverage",
      status: brainFlow.status,
      summary: `${brainFlow.coveragePercent}% local coverage: ${brainFlow.summary}`,
      detail: brainFlow.missingSignals.join(", "),
      count:
        brainFlow.chatContextInjections +
        brainFlow.voiceContextInjections +
        brainFlow.requestCorrelatedThreadPersistenceEvents +
        brainFlow.requestCorrelatedRetrievalEvents +
        brainFlow.requestCorrelatedModelRuns +
        brainFlow.foregroundToolJobs +
        brainFlow.requestCorrelatedMasteryEvidenceEvents +
        brainFlow.backgroundMemoryEvents,
      action:
        brainFlow.status === "ready"
          ? "Use this as the local beta smoke contract for chat, voice, transcript persistence, both foreground tool layers, both evaluated mastery layers, and the background memory agent."
          : brainFlow.status === "blocked"
            ? "Open System Activity and request timelines, then fix failed context, retrieval, model, tool, or memory rows."
            : "Run one typed chat turn, one voice turn, one tool action, and one learning-book update to complete local flow evidence.",
    }),
    item({
      id: "coherent_live_proof",
      title: "Coherent live proof bundle",
      status: coherentLiveProof.status,
      summary: `${coherentLiveProof.completionPercent}% coherent proof: ${coherentLiveProof.summary}`,
      detail: coherentLiveProof.missingChecks.join(", "),
      count: coherentLiveProof.readyChecks,
      action:
        coherentLiveProof.status === "ready"
          ? "Use this bundle as the local beta proof that chat and voice share one book/thread/multi-PDF context."
          : coherentLiveProof.status === "blocked"
            ? "Fix failed live rows before treating chat and voice as one coherent beta proof."
            : "Run typed chat and live voice against the same multi-PDF active book, then inspect the shared request bundle.",
    }),
    item({
      id: "diagnostic_export",
      title: "Diagnostic export",
      status: totalRows > 0 ? "ready" : "watch",
      summary: `${totalRows} local rows are available for a capped diagnostic export.`,
      count: totalRows,
      action: "Export JSON for beta review without syncing to cloud.",
    }),
    item({
      id: "cloud_sync",
      title: "AWS/cloud sync",
      status: "deferred",
      summary:
        "Cloud persistence, tenant isolation, and AWS workers remain out of scope for local beta.",
      action: "Do not treat local diagnostics as production cloud readiness.",
    }),
  ];

  const blocked = items.filter((entry) => entry.status === "blocked").length;
  const watch = items.filter((entry) => entry.status === "watch").length;
  const deferred = items.filter((entry) => entry.status === "deferred").length;
  const ready = items.filter((entry) => entry.status === "ready").length;

  return {
    generatedAt: input.generatedAt || fallbackNow.toISOString(),
    localOnly: true,
    overallStatus:
      blocked > 0 ? "blocked" : watch > 0 ? "needs_review" : "ready",
    summary: {
      totalRows,
      ready,
      watch,
      blocked,
      deferred,
    },
    counts,
    brainFlow,
    coherentLiveProof,
    runtimeSettings: input.runtimeSettings,
    items,
    outOfScope: [
      "AWS/cloud synchronization",
      "tenant-scoped server persistence",
      "destructive deletion propagation",
      "automatic citation verification",
    ],
  };
};

const correctionOverlayForRow = (row: unknown) => {
  const record = objectRecord(row);
  const metadata = objectRecord(record?.metadata);
  const correction = objectRecord(metadata?.correction);
  if (!record || !correction) return null;
  return {
    id: record.id,
    correction,
  };
};

const buildCorrectionOverlay = (ledgers: Record<string, unknown[]>) =>
  Object.fromEntries(
    Object.entries(ledgers)
      .map(([ledgerName, rows]) => [
        ledgerName,
        rows.map(correctionOverlayForRow).filter(Boolean),
      ])
      .filter(([, rows]) => (rows as unknown[]).length > 0),
  );

export const buildBetaDiagnosticsExport = ({
  snapshot,
  ledgers,
  metadata,
}: BetaDiagnosticsExportInput) => {
  const correctionOverlay = buildCorrectionOverlay(ledgers);

  return {
    schema: "tutor.beta-diagnostics.v1",
    generatedAt: snapshot.generatedAt,
    localOnly: true,
    exportScope: "local-indexeddb-sample",
    note: "This export is for local beta diagnostics. It is not a cloud sync artifact.",
    outOfScope: snapshot.outOfScope,
    metadata: metadata || {},
    snapshot,
    correctionOverlay,
    ledgers,
  };
};
