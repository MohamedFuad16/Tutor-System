import { db, type EvidenceEvent, type MasteryDelta } from "./longterm.memory";
import {
  clamp01,
  isDirectRecallEvidence,
  type MasteryEvidenceType,
} from "./evidence.mastery";

type ModelSummaryEvidenceInput = {
  conceptId?: string;
  bookId?: string;
  conversationId?: string;
  sourceId?: string;
  source: string;
  summary: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

type MasteryDeltaInput = {
  attemptId?: string;
  conceptId: string;
  evidenceType: Exclude<MasteryEvidenceType, "model_summary">;
  correct: boolean;
  previousMastery: number;
  nextMastery: number;
  previousPLearn: number;
  nextPLearn: number;
  source: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

const createLedgerId = (prefix: string, timestamp = Date.now()) =>
  `${prefix}:${timestamp}:${Math.random().toString(36).slice(2, 10)}`;

const compactSummary = (summary: string) =>
  summary.replace(/\s+/g, " ").trim().slice(0, 500);

const warnLedgerFailure = (action: string, error: unknown) => {
  console.warn(`[EvidenceLedger] ${action} failed`, error);
};

export const createModelSummaryEvidenceRecord = (
  input: ModelSummaryEvidenceInput,
  timestamp = Date.now(),
): EvidenceEvent => ({
  id: createLedgerId("evidence", timestamp),
  timestamp,
  source: input.source,
  evidenceType: "model_summary",
  verified: false,
  conceptId: input.conceptId,
  bookId: input.bookId,
  conversationId: input.conversationId,
  sourceId: input.sourceId,
  summary: compactSummary(input.summary),
  confidence:
    input.confidence === undefined ? undefined : clamp01(input.confidence, 0),
  metadata: input.metadata,
});

export const createMasteryDeltaRecords = (
  input: MasteryDeltaInput,
  timestamp = Date.now(),
) => {
  const verified = isDirectRecallEvidence(input.evidenceType);
  const attemptId = input.attemptId?.replace(/\s+/g, " ").trim().slice(0, 500);
  const event: EvidenceEvent = {
    id: attemptId
      ? `evidence:mastery-attempt:${attemptId}`
      : createLedgerId("evidence", timestamp),
    timestamp,
    attemptId,
    source: input.source,
    evidenceType: input.evidenceType,
    verified,
    conceptId: input.conceptId,
    summary: compactSummary(input.summary),
    correct: input.correct,
    metadata: {
      ...input.metadata,
      attemptId,
      masteryMutationAllowed: true,
    },
  };
  const delta: MasteryDelta = {
    id: attemptId
      ? `mastery-delta:${attemptId}`
      : createLedgerId("mastery-delta", timestamp),
    timestamp,
    attemptId,
    conceptId: input.conceptId,
    evidenceEventId: event.id,
    evidenceType: input.evidenceType,
    verified,
    previousMastery: clamp01(input.previousMastery, 0),
    nextMastery: clamp01(input.nextMastery, 0),
    previousPLearn: clamp01(input.previousPLearn, 0),
    nextPLearn: clamp01(input.nextPLearn, 0),
    delta: clamp01(input.nextMastery, 0) - clamp01(input.previousMastery, 0),
    correct: input.correct,
    reason: compactSummary(input.summary),
  };

  return { event, delta };
};

export const recordModelSummaryEvidence = async (
  input: ModelSummaryEvidenceInput,
) => {
  const event = createModelSummaryEvidenceRecord(input);

  try {
    await db.evidenceEvents.add(event);
  } catch (error) {
    warnLedgerFailure("model summary evidence write", error);
  }

  return event;
};
