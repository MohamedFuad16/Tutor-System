import {
  db,
  type ArtifactRecord,
  type CitationState,
  type CorrectionEvent,
  type EvidenceEvent,
  type MasteryDelta,
  type MemoryEvent,
  type ModelRun,
  type PersistentConcept,
  type RetrievalEvent,
  type ToolJob,
} from "./longterm.memory";
import { clamp01 } from "./evidence.mastery";

type CorrectionEventStatusInput =
  | CorrectionEvent["status"]
  | "pending"
  | "completed"
  | "complete"
  | "failed"
  | "error";

type CorrectionEventActionInput =
  | CorrectionEvent["action"]
  | "wrong"
  | "delete"
  | "remove"
  | "correct";

type CorrectionEventTargetInput =
  | CorrectionEvent["targetType"]
  | "memory"
  | "retrieval"
  | "evidence"
  | "mastery"
  | "model"
  | "tool"
  | "book";

export type CorrectionEventInput = {
  id?: string;
  timestamp?: number;
  status?: CorrectionEventStatusInput;
  action?: CorrectionEventActionInput;
  targetType?: CorrectionEventTargetInput;
  targetId?: unknown;
  targetSummary?: unknown;
  reason?: unknown;
  source?: string;
  requestedBy?: CorrectionEvent["requestedBy"];
  bookId?: string | null;
  conversationId?: string | null;
  conceptId?: string | null;
  relatedEventIds?: unknown[];
  metadata?: Record<string, unknown>;
};

export type CorrectionPropagationTable =
  | "concepts"
  | "memoryEvents"
  | "retrievalEvents"
  | "evidenceEvents"
  | "masteryDeltas"
  | "artifactRecords"
  | "citationStates"
  | "toolJobs"
  | "modelRuns";

export type CorrectionPropagationEffect =
  | "review_requested"
  | "marked_wrong"
  | "deletion_requested"
  | "superseded";

export type CorrectionPropagationUpdate = {
  table: CorrectionPropagationTable;
  id: string;
  effect: CorrectionPropagationEffect;
};

export type CorrectionPropagationSummary = {
  correctionEventId: string;
  status: CorrectionEvent["status"];
  impactedRows: number;
  countsByTable: Partial<Record<CorrectionPropagationTable, number>>;
  updates: CorrectionPropagationUpdate[];
};

const compact = (value: unknown, fallback = "") => {
  const text =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? ""
        : JSON.stringify(value);
  return (text || fallback).replace(/\s+/g, " ").trim().slice(0, 500);
};

const optionalCompact = (value: unknown) => {
  const text = compact(value);
  return text || undefined;
};

const cleanList = (values: unknown[] | undefined, limit = 16) =>
  Array.from(
    new Set((values || []).map((value) => compact(value)).filter(Boolean)),
  ).slice(0, limit);

export const normalizeCorrectionEventStatus = (
  status: CorrectionEventStatusInput | undefined,
): CorrectionEvent["status"] => {
  if (status === "pending") return "open";
  if (status === "completed" || status === "complete") return "applied";
  if (status === "failed" || status === "error") return "blocked";
  if (
    status === "open" ||
    status === "applied" ||
    status === "blocked" ||
    status === "dismissed"
  ) {
    return status;
  }
  return "open";
};

export const normalizeCorrectionEventAction = (
  action: CorrectionEventActionInput | undefined,
): CorrectionEvent["action"] => {
  if (action === "wrong" || action === "correct") return "mark_wrong";
  if (action === "delete" || action === "remove") return "delete_request";
  if (
    action === "mark_wrong" ||
    action === "delete_request" ||
    action === "supersede" ||
    action === "review"
  ) {
    return action;
  }
  return "review";
};

export const normalizeCorrectionEventTargetType = (
  targetType: CorrectionEventTargetInput | undefined,
): CorrectionEvent["targetType"] => {
  if (targetType === "memory") return "memory_event";
  if (targetType === "retrieval") return "retrieval_event";
  if (targetType === "evidence") return "evidence_event";
  if (targetType === "mastery") return "mastery_delta";
  if (targetType === "model") return "model_run";
  if (targetType === "tool") return "tool_job";
  if (targetType === "book") return "learning_book";
  if (
    targetType === "memory_event" ||
    targetType === "retrieval_event" ||
    targetType === "evidence_event" ||
    targetType === "mastery_delta" ||
    targetType === "model_run" ||
    targetType === "tool_job" ||
    targetType === "concept" ||
    targetType === "interaction" ||
    targetType === "learning_book" ||
    targetType === "other"
  ) {
    return targetType;
  }
  return "other";
};

export const correctionEventIdFor = (
  input: CorrectionEventInput,
  timestamp = Date.now(),
) => {
  const action = normalizeCorrectionEventAction(input.action);
  const targetType = normalizeCorrectionEventTargetType(input.targetType);
  const targetId = compact(input.targetId, "local");
  const suffix = Math.random().toString(36).slice(2, 10);
  return ["correction-event", action, targetType, targetId, timestamp, suffix]
    .filter(Boolean)
    .join(":");
};

export const createCorrectionEventRecord = (
  input: CorrectionEventInput,
  timestamp = Date.now(),
): CorrectionEvent => {
  const recordTimestamp = input.timestamp || timestamp;
  const action = normalizeCorrectionEventAction(input.action);
  const targetType = normalizeCorrectionEventTargetType(input.targetType);
  const targetId = compact(input.targetId, "unscoped-target");
  const source = compact(input.source, "admin_correction");

  return {
    id: input.id || correctionEventIdFor(input, recordTimestamp),
    timestamp: recordTimestamp,
    status: normalizeCorrectionEventStatus(input.status),
    action,
    targetType,
    targetId,
    targetSummary: optionalCompact(input.targetSummary),
    reason: compact(input.reason, "Correction review requested."),
    source,
    requestedBy: input.requestedBy === "system" ? "system" : "admin",
    bookId: optionalCompact(input.bookId),
    conversationId: optionalCompact(input.conversationId),
    conceptId: optionalCompact(input.conceptId),
    relatedEventIds: cleanList(input.relatedEventIds),
    metadata: input.metadata,
  };
};

const targetTableByType: Partial<
  Record<CorrectionEvent["targetType"], CorrectionPropagationTable>
> = {
  concept: "concepts",
  memory_event: "memoryEvents",
  retrieval_event: "retrievalEvents",
  evidence_event: "evidenceEvents",
  mastery_delta: "masteryDeltas",
  model_run: "modelRuns",
  tool_job: "toolJobs",
  artifact_record: "artifactRecords",
  citation_state: "citationStates",
};

const effectForAction = (
  action: CorrectionEvent["action"],
): CorrectionPropagationEffect => {
  if (action === "mark_wrong") return "marked_wrong";
  if (action === "delete_request") return "deletion_requested";
  if (action === "supersede") return "superseded";
  return "review_requested";
};

const guessTablesForId = (id: string): CorrectionPropagationTable[] => {
  const normalized = id.toLowerCase();
  const guesses: CorrectionPropagationTable[] = [];
  if (normalized.includes("memory")) guesses.push("memoryEvents");
  if (normalized.includes("retrieval")) guesses.push("retrievalEvents");
  if (normalized.includes("evidence")) guesses.push("evidenceEvents");
  if (normalized.includes("mastery")) guesses.push("masteryDeltas");
  if (normalized.includes("artifact")) guesses.push("artifactRecords");
  if (normalized.includes("citation")) guesses.push("citationStates");
  if (normalized.includes("tool")) guesses.push("toolJobs");
  if (normalized.includes("model")) guesses.push("modelRuns");
  return guesses;
};

const metadataRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};

export const buildCorrectionPropagationMetadata = (
  event: CorrectionEvent,
  table: CorrectionPropagationTable,
  timestamp = Date.now(),
  existingMetadata?: Record<string, unknown>,
) => ({
  ...metadataRecord(existingMetadata),
  correction: {
    eventId: event.id,
    action: event.action,
    effect: effectForAction(event.action),
    targetType: event.targetType,
    targetId: event.targetId,
    reason: event.reason,
    source: event.source,
    appliedAt: timestamp,
    table,
  },
});

export const buildConceptCorrectionPatch = (
  event: CorrectionEvent,
  timestamp = Date.now(),
  existingConcept?: Partial<PersistentConcept>,
): Partial<PersistentConcept> => {
  const effect = effectForAction(event.action);
  const previousConfidence = clamp01(existingConcept?.confidence, 0);
  const previousMastery = clamp01(existingConcept?.mastery, 0);
  const previousPLearn = clamp01(existingConcept?.p_learn, 0);
  const isReviewOnly = effect === "review_requested";

  const nextConfidence = isReviewOnly ? previousConfidence : 0;
  const nextMastery = isReviewOnly
    ? previousMastery
    : Math.min(previousMastery, 0.2);
  const nextPLearn = isReviewOnly
    ? previousPLearn
    : Math.min(previousPLearn, 0.2);

  return {
    ...(isReviewOnly
      ? {}
      : {
          confidence: nextConfidence,
          mastery: nextMastery,
          p_learn: nextPLearn,
          lastReviewedAt: timestamp,
        }),
    correctionState: {
      status: isReviewOnly ? "review_requested" : "quarantined",
      eventId: event.id,
      action: event.action,
      effect,
      reason: event.reason,
      source: event.source,
      appliedAt: timestamp,
      nonDestructive: true,
      previousConfidence,
      nextConfidence,
      previousMastery,
      nextMastery,
      previousPLearn,
      nextPLearn,
    },
  };
};

export const buildCorrectionPropagationPatch = (
  event: CorrectionEvent,
  table: CorrectionPropagationTable,
  timestamp = Date.now(),
  existingMetadata?: Record<string, unknown>,
): Record<string, unknown> => {
  if (table === "concepts") {
    return buildConceptCorrectionPatch(
      event,
      timestamp,
      existingMetadata as Partial<PersistentConcept>,
    ) as Record<string, unknown>;
  }

  const metadata = buildCorrectionPropagationMetadata(
    event,
    table,
    timestamp,
    existingMetadata,
  );
  const effect = effectForAction(event.action);

  if (table === "evidenceEvents" || table === "masteryDeltas") {
    return { verified: false, metadata };
  }

  if (table === "memoryEvents" || table === "retrievalEvents") {
    return effect === "review_requested"
      ? { metadata }
      : { status: "skipped", metadata };
  }

  if (table === "artifactRecords") {
    return {
      status: effect === "review_requested" ? "stale" : "stale",
      verificationState:
        effect === "deletion_requested" ? "unavailable" : "conflicting",
      metadata,
    };
  }

  if (table === "citationStates") {
    return {
      state: effect === "review_requested" ? "conflicting" : "unsupported",
      failureReason: compact(
        `Correction ${event.action.replace(/_/g, " ")}: ${event.reason}`,
      ),
      metadata,
    };
  }

  return { metadata };
};

const addTarget = (
  targets: Map<CorrectionPropagationTable, Set<string>>,
  table: CorrectionPropagationTable | undefined,
  id: string | undefined,
) => {
  const targetId = compact(id);
  if (!table || !targetId) return;
  const tableTargets = targets.get(table) || new Set<string>();
  tableTargets.add(targetId);
  targets.set(table, tableTargets);
};

const addRows = <T extends { id: string }>(
  targets: Map<CorrectionPropagationTable, Set<string>>,
  table: CorrectionPropagationTable,
  rows: T[],
) => rows.forEach((row) => addTarget(targets, table, row.id));

const collectCorrectionPropagationTargets = async (event: CorrectionEvent) => {
  const targets = new Map<CorrectionPropagationTable, Set<string>>();
  const directTable = targetTableByType[event.targetType];
  addTarget(targets, directTable, event.targetId);

  event.relatedEventIds?.forEach((id) => {
    addTarget(targets, directTable, id);
    guessTablesForId(id).forEach((table) => addTarget(targets, table, id));
  });

  if (event.conceptId) {
    addTarget(targets, "concepts", event.conceptId);
  }

  if (event.targetType === "evidence_event") {
    const evidence = await db.evidenceEvents.get(event.targetId);
    if (evidence?.conceptId) {
      addTarget(targets, "concepts", evidence.conceptId);
    }

    addRows(
      targets,
      "masteryDeltas",
      await db.masteryDeltas
        .where("evidenceEventId")
        .equals(event.targetId)
        .toArray(),
    );
  }

  if (event.targetType === "artifact_record") {
    addRows(
      targets,
      "citationStates",
      await db.citationStates
        .where("artifactId")
        .equals(event.targetId)
        .toArray(),
    );
  }

  if (event.targetType === "citation_state") {
    addRows(
      targets,
      "artifactRecords",
      await db.artifactRecords
        .filter((record) => record.citationStateIds.includes(event.targetId))
        .toArray(),
    );
  }

  if (event.targetType === "concept") {
    const conceptId = event.conceptId || event.targetId;
    addTarget(targets, "concepts", conceptId);
    addRows(
      targets,
      "memoryEvents",
      await db.memoryEvents.where("conceptId").equals(conceptId).toArray(),
    );
    addRows(
      targets,
      "evidenceEvents",
      await db.evidenceEvents.where("conceptId").equals(conceptId).toArray(),
    );
    addRows(
      targets,
      "masteryDeltas",
      await db.masteryDeltas.where("conceptId").equals(conceptId).toArray(),
    );
    addRows(
      targets,
      "artifactRecords",
      await db.artifactRecords.where("conceptId").equals(conceptId).toArray(),
    );
    addRows(
      targets,
      "retrievalEvents",
      await db.retrievalEvents
        .filter((record) => record.selectedConceptIds.includes(conceptId))
        .toArray(),
    );
  }

  if (event.targetType === "learning_book") {
    const bookId = event.bookId || event.targetId;
    addRows(
      targets,
      "memoryEvents",
      await db.memoryEvents.where("bookId").equals(bookId).toArray(),
    );
    addRows(
      targets,
      "evidenceEvents",
      await db.evidenceEvents.where("bookId").equals(bookId).toArray(),
    );
    addRows(
      targets,
      "artifactRecords",
      await db.artifactRecords.where("bookId").equals(bookId).toArray(),
    );
    addRows(
      targets,
      "retrievalEvents",
      await db.retrievalEvents.where("activeBookId").equals(bookId).toArray(),
    );
  }

  if (event.targetType === "interaction") {
    const conversationId = event.conversationId || event.targetId;
    addRows(
      targets,
      "memoryEvents",
      await db.memoryEvents
        .where("conversationId")
        .equals(conversationId)
        .toArray(),
    );
    addRows(
      targets,
      "evidenceEvents",
      await db.evidenceEvents
        .where("conversationId")
        .equals(conversationId)
        .toArray(),
    );
    addRows(
      targets,
      "artifactRecords",
      await db.artifactRecords
        .filter((record) => record.conversationId === conversationId)
        .toArray(),
    );
  }

  return targets;
};

type PropagationRow =
  | PersistentConcept
  | ArtifactRecord
  | CitationState
  | EvidenceEvent
  | MasteryDelta
  | MemoryEvent
  | ModelRun
  | RetrievalEvent
  | ToolJob;

const getPropagationRow = async (
  table: CorrectionPropagationTable,
  id: string,
): Promise<PropagationRow | undefined> => {
  if (table === "concepts") return db.concepts.get(id);
  if (table === "memoryEvents") return db.memoryEvents.get(id);
  if (table === "retrievalEvents") return db.retrievalEvents.get(id);
  if (table === "evidenceEvents") return db.evidenceEvents.get(id);
  if (table === "masteryDeltas") return db.masteryDeltas.get(id);
  if (table === "artifactRecords") return db.artifactRecords.get(id);
  if (table === "citationStates") return db.citationStates.get(id);
  if (table === "toolJobs") return db.toolJobs.get(id);
  return db.modelRuns.get(id);
};

const updatePropagationRow = async (
  table: CorrectionPropagationTable,
  id: string,
  patch: Record<string, unknown>,
) => {
  if (table === "concepts")
    return db.concepts.update(id, patch as Partial<PersistentConcept>);
  if (table === "memoryEvents")
    return db.memoryEvents.update(id, patch as Partial<MemoryEvent>);
  if (table === "retrievalEvents")
    return db.retrievalEvents.update(id, patch as Partial<RetrievalEvent>);
  if (table === "evidenceEvents")
    return db.evidenceEvents.update(id, patch as Partial<EvidenceEvent>);
  if (table === "masteryDeltas")
    return db.masteryDeltas.update(id, patch as Partial<MasteryDelta>);
  if (table === "artifactRecords")
    return db.artifactRecords.update(id, patch as Partial<ArtifactRecord>);
  if (table === "citationStates")
    return db.citationStates.update(id, patch as Partial<CitationState>);
  if (table === "toolJobs")
    return db.toolJobs.update(id, patch as Partial<ToolJob>);
  return db.modelRuns.update(id, patch as Partial<ModelRun>);
};

const updateCorrectionEventPropagationStatus = async (
  event: CorrectionEvent,
  summary: CorrectionPropagationSummary,
) => {
  const metadata = {
    ...metadataRecord(event.metadata),
    propagation: {
      status: summary.status,
      impactedRows: summary.impactedRows,
      countsByTable: summary.countsByTable,
      appliedAt: Date.now(),
      nonDestructive: true,
    },
  };
  await db.correctionEvents.update(event.id, {
    status: summary.status,
    metadata,
  });
};

export const applyCorrectionPropagation = async (
  event: CorrectionEvent,
): Promise<CorrectionPropagationSummary> => {
  const targets = await collectCorrectionPropagationTargets(event);
  const updates: CorrectionPropagationUpdate[] = [];
  const countsByTable: Partial<Record<CorrectionPropagationTable, number>> = {};
  const timestamp = Date.now();

  for (const [table, ids] of targets.entries()) {
    for (const id of ids) {
      const row = await getPropagationRow(table, id);
      if (!row) continue;
      const patch = buildCorrectionPropagationPatch(
        event,
        table,
        timestamp,
        table === "concepts"
          ? (row as unknown as Record<string, unknown>)
          : metadataRecord("metadata" in row ? row.metadata : undefined),
      );
      const updated = await updatePropagationRow(table, id, patch);
      if (updated) {
        const effect = effectForAction(event.action);
        updates.push({ table, id, effect });
        countsByTable[table] = (countsByTable[table] || 0) + 1;
      }
    }
  }

  const summary: CorrectionPropagationSummary = {
    correctionEventId: event.id,
    status: updates.length > 0 ? "applied" : "open",
    impactedRows: updates.length,
    countsByTable,
    updates,
  };

  await updateCorrectionEventPropagationStatus(event, summary);
  return summary;
};

export const updateCorrectionEventReviewStatus = async (
  event: CorrectionEvent,
  status: Extract<CorrectionEvent["status"], "blocked" | "dismissed">,
  reason?: string,
) => {
  const metadata = {
    ...metadataRecord(event.metadata),
    review: {
      status,
      reason: compact(reason, `Admin marked correction ${status}.`),
      updatedAt: Date.now(),
    },
  };
  await db.correctionEvents.update(event.id, { status, metadata });
};

export const recordCorrectionEvent = async (input: CorrectionEventInput) => {
  const record = createCorrectionEventRecord(input);

  try {
    await db.correctionEvents.add(record);
  } catch (error) {
    console.warn("[CorrectionEvents] write failed", error);
  }

  return record;
};

export const recordAndApplyCorrectionEvent = async (
  input: CorrectionEventInput,
) => {
  const record = await recordCorrectionEvent(input);
  const propagation = await applyCorrectionPropagation(record);
  return { record: { ...record, status: propagation.status }, propagation };
};
