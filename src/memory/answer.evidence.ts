import { bktEngine } from "./bkt.engine";
import type { MasteryEvidenceType } from "./evidence.mastery";
import type { PersistentConcept } from "./longterm.memory";

type AnswerEvidenceType = Exclude<MasteryEvidenceType, "model_summary">;

export type AnswerEvidenceEngine = {
  updateConceptAttempt: (
    conceptId: string,
    isCorrect: boolean,
    type: AnswerEvidenceType,
    options?: {
      source?: string;
      summary?: string;
      metadata?: Record<string, unknown>;
    },
  ) => Promise<PersistentConcept | null>;
};

export type EvaluatedAnswerEvidenceInput = {
  conceptId?: string;
  question: string;
  learnerAnswer?: string;
  correct?: boolean;
  score?: number;
  maxScore?: number;
  threshold?: number;
  evidenceType?: AnswerEvidenceType;
  rubric?: string[];
  bookId?: string;
  bookTitle?: string;
  conversationId?: string;
  requestId?: string;
  sourceId?: string;
  evaluator?: "local_rubric" | "model_rubric" | "human_review";
  source?: string;
  metadata?: Record<string, unknown>;
};

export type EvaluatedAnswerEvidenceContext = Pick<
  EvaluatedAnswerEvidenceInput,
  | "bookId"
  | "bookTitle"
  | "conversationId"
  | "requestId"
  | "sourceId"
  | "source"
  | "evaluator"
> & {
  metadata?: Record<string, unknown>;
};

export type EvaluatedAnswerEvidenceResult = {
  status:
    | "recorded"
    | "skipped_no_concept"
    | "skipped_unevaluated"
    | "missing_concept";
  conceptId?: string;
  correct?: boolean;
  evidenceType?: AnswerEvidenceType;
  scoreRatio?: number;
};

const DEFAULT_THRESHOLD = 0.7;
const MAX_METADATA_TEXT = 800;
const MAX_SUMMARY_TEXT = 160;

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const boundedText = (value: string | undefined, limit = MAX_METADATA_TEXT) =>
  compact(value || "").slice(0, limit);

const clamp01 = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
};

const finitePositive = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringValue = (value: unknown) =>
  typeof value === "string" ? compact(value) : "";

const optionalString = (value: unknown) => {
  const text = stringValue(value);
  return text || undefined;
};

const optionalNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const optionalBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "correct", "yes", "pass", "passed"].includes(normalized)) {
    return true;
  }
  if (["false", "incorrect", "no", "fail", "failed"].includes(normalized)) {
    return false;
  }
  return undefined;
};

const evidenceTypeValue = (value: unknown): AnswerEvidenceType | undefined => {
  if (value === "recognition" || value === "generation" || value === "transfer")
    return value;
  return undefined;
};

const evaluatorValue = (
  value: unknown,
): EvaluatedAnswerEvidenceInput["evaluator"] | undefined => {
  if (
    value === "local_rubric" ||
    value === "model_rubric" ||
    value === "human_review"
  ) {
    return value;
  }
  return undefined;
};

const rubricValue = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => stringValue(item))
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

export const evaluatedAnswerConceptId = (
  input: Pick<EvaluatedAnswerEvidenceInput, "conceptId">,
) => {
  const conceptId = compact(input.conceptId || "");
  if (!conceptId || conceptId === "general") return null;
  return conceptId;
};

export const evaluatedAnswerOutcome = (
  input: Pick<
    EvaluatedAnswerEvidenceInput,
    "correct" | "score" | "maxScore" | "threshold" | "evidenceType"
  >,
) => {
  const evidenceType = input.evidenceType || "generation";
  const maxScore = finitePositive(input.maxScore);
  const score = Number(input.score);
  const scoreRatio =
    maxScore && Number.isFinite(score)
      ? clamp01(score / maxScore, 0)
      : undefined;
  const threshold = clamp01(input.threshold, DEFAULT_THRESHOLD);

  if (typeof input.correct === "boolean") {
    return {
      correct: input.correct,
      evidenceType,
      scoreRatio,
      threshold,
    };
  }

  if (scoreRatio === undefined) {
    return null;
  }

  return {
    correct: scoreRatio >= threshold,
    evidenceType,
    scoreRatio,
    threshold,
  };
};

export const evaluatedAnswerSummary = (
  input: Pick<
    EvaluatedAnswerEvidenceInput,
    "question" | "score" | "maxScore" | "correct"
  >,
) => {
  const question = boundedText(input.question || "Untitled recall check", 160);
  const hasScore =
    Number.isFinite(Number(input.score)) &&
    Number.isFinite(Number(input.maxScore));

  if (hasScore) {
    return `Evaluated answer scored ${input.score}/${input.maxScore} for "${question}"`;
  }

  if (typeof input.correct === "boolean") {
    return `Evaluated answer marked ${input.correct ? "correct" : "incorrect"} for "${question}"`;
  }

  return `Evaluated answer received for "${question}"`;
};

export const evaluatedAnswerMetadata = (
  input: EvaluatedAnswerEvidenceInput,
  outcome: NonNullable<ReturnType<typeof evaluatedAnswerOutcome>>,
) => ({
  ...input.metadata,
  evidenceContract: "evaluated_answer_v1",
  question: boundedText(input.question),
  learnerAnswerPreview: boundedText(input.learnerAnswer),
  score: input.score,
  maxScore: input.maxScore,
  scoreRatio: outcome.scoreRatio,
  evaluationThreshold: outcome.threshold,
  rubric: input.rubric?.map((item) => boundedText(item, 240)),
  evaluator: input.evaluator || "local_rubric",
  bookId: input.bookId,
  bookTitle: input.bookTitle,
  conversationId: input.conversationId,
  requestId: input.requestId,
  sourceId: input.sourceId,
});

export const normalizeEvaluatedAnswerEvidenceInput = (
  payload: unknown,
  context: EvaluatedAnswerEvidenceContext = {},
): EvaluatedAnswerEvidenceInput | null => {
  const record = asRecord(payload);
  if (!record) return null;
  const question = stringValue(record.question);
  if (!question) return null;

  const metadata = asRecord(record.metadata);

  return {
    conceptId: optionalString(record.conceptId),
    question,
    learnerAnswer: optionalString(record.learnerAnswer || record.answer),
    correct: optionalBoolean(record.correct),
    score: optionalNumber(record.score),
    maxScore: optionalNumber(record.maxScore),
    threshold: optionalNumber(record.threshold),
    evidenceType: evidenceTypeValue(record.evidenceType),
    rubric: rubricValue(record.rubric),
    bookId: optionalString(record.bookId) || context.bookId,
    bookTitle: optionalString(record.bookTitle) || context.bookTitle,
    conversationId:
      optionalString(record.conversationId) || context.conversationId,
    requestId: optionalString(record.requestId) || context.requestId,
    sourceId: optionalString(record.sourceId) || context.sourceId,
    evaluator: evaluatorValue(record.evaluator) || context.evaluator,
    source: optionalString(record.source) || context.source,
    metadata: {
      ...context.metadata,
      ...(metadata || {}),
    },
  };
};

export const recordEvaluatedAnswerEvidence = async (
  input: EvaluatedAnswerEvidenceInput,
  engine: AnswerEvidenceEngine = bktEngine,
): Promise<EvaluatedAnswerEvidenceResult> => {
  const conceptId = evaluatedAnswerConceptId(input);
  const outcome = evaluatedAnswerOutcome(input);

  if (!conceptId) {
    return {
      status: "skipped_no_concept",
      correct: outcome?.correct,
      evidenceType: outcome?.evidenceType,
      scoreRatio: outcome?.scoreRatio,
    };
  }

  if (!outcome) {
    return {
      status: "skipped_unevaluated",
      conceptId,
    };
  }

  const updatedConcept = await engine.updateConceptAttempt(
    conceptId,
    outcome.correct,
    outcome.evidenceType,
    {
      source: input.source || "evaluated_answer",
      summary: evaluatedAnswerSummary(input).slice(0, MAX_SUMMARY_TEXT + 80),
      metadata: evaluatedAnswerMetadata(input, outcome),
    },
  );

  return {
    status: updatedConcept ? "recorded" : "missing_concept",
    conceptId,
    correct: outcome.correct,
    evidenceType: outcome.evidenceType,
    scoreRatio: outcome.scoreRatio,
  };
};

export const recordEvaluatedAnswerEvidenceBatch = async (
  payloads: unknown[],
  context: EvaluatedAnswerEvidenceContext = {},
  engine: AnswerEvidenceEngine = bktEngine,
): Promise<EvaluatedAnswerEvidenceResult[]> => {
  const results: EvaluatedAnswerEvidenceResult[] = [];

  for (const payload of payloads) {
    const input = normalizeEvaluatedAnswerEvidenceInput(payload, context);
    if (!input) continue;
    results.push(await recordEvaluatedAnswerEvidence(input, engine));
  }

  return results;
};
