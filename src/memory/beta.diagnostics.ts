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
  memoryEvents?: number;
  retrievalEvents?: number;
  failedRetrievalEvents?: number;
  modelRuns?: number;
  blockedOrFailedModelRuns?: number;
  fallbackModelRuns?: number;
  toolJobs?: number;
  artifactRecords?: number;
  citationStates?: number;
  checkingCitationStates?: number;
  unavailableCitationStates?: number;
  verifiedCitationStates?: number;
  correctionEvents?: number;
  openCorrectionEvents?: number;
  appliedCorrectionEvents?: number;
  propagatedCorrectionRows?: number;
  evidenceEvents?: number;
  masteryDeltas?: number;
  traceEvents?: number;
  webSearches?: number;
  runtimeSettings?: unknown;
  generatedAt?: string;
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
    Omit<BetaDiagnosticsInput, "runtimeSettings" | "generatedAt">
  >;
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
  memoryEvents: numberOrZero(input.memoryEvents),
  retrievalEvents: numberOrZero(input.retrievalEvents),
  failedRetrievalEvents: numberOrZero(input.failedRetrievalEvents),
  modelRuns: numberOrZero(input.modelRuns),
  blockedOrFailedModelRuns: numberOrZero(input.blockedOrFailedModelRuns),
  fallbackModelRuns: numberOrZero(input.fallbackModelRuns),
  toolJobs: numberOrZero(input.toolJobs),
  artifactRecords: numberOrZero(input.artifactRecords),
  citationStates: numberOrZero(input.citationStates),
  checkingCitationStates: numberOrZero(input.checkingCitationStates),
  unavailableCitationStates: numberOrZero(input.unavailableCitationStates),
  verifiedCitationStates: numberOrZero(input.verifiedCitationStates),
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

export const buildBetaDiagnosticsSnapshot = (
  input: BetaDiagnosticsInput,
  fallbackNow = new Date(),
): BetaDiagnosticsSnapshot => {
  const counts = requiredCounts(input);
  const totalRows =
    counts.learningBooks +
    counts.mappedConcepts +
    counts.memoryEvents +
    counts.retrievalEvents +
    counts.modelRuns +
    counts.toolJobs +
    counts.artifactRecords +
    counts.citationStates +
    counts.correctionEvents +
    counts.evidenceEvents +
    counts.masteryDeltas +
    counts.traceEvents;

  const sourceGroundingStatus: BetaDiagnosticStatus =
    counts.unavailableCitationStates > 0 ||
    counts.checkingCitationStates > 0 ||
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
          ? `${counts.memoryEvents} memory events and ${counts.learningBooks} learning books are visible.`
          : "No durable memory events have been observed yet.",
      count: counts.memoryEvents,
      action:
        counts.memoryEvents > 0
          ? "Keep watching for failed writes during beta."
          : "Complete a chat or learning-book update to create memory evidence.",
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
      id: "source_grounding",
      title: "Source grounding",
      status: sourceGroundingStatus,
      summary:
        counts.artifactRecords > 0
          ? `${counts.artifactRecords} artifacts, ${counts.checkingCitationStates} checking citations, ${counts.unavailableCitationStates} unavailable citations.`
          : "No source artifacts have been captured yet.",
      count: counts.artifactRecords,
      action:
        counts.verifiedCitationStates > 0
          ? "Keep citation-state transitions reviewable."
          : "Do not claim citations are verified until a verifier writes that state.",
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

const objectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

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
