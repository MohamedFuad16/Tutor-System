import { db, Misconception } from "./longterm.memory";
import { v4 as uuidv4 } from "uuid";

const MAX_EVIDENCE_ROWS = 12;

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const bounded = (value: string, limit: number) =>
  compact(value).slice(0, limit);

const normalizedFingerprint = (
  conceptId: string,
  fingerprint: string | undefined,
  description: string,
) =>
  bounded(
    fingerprint ||
      `${conceptId}:${description.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    320,
  );

const uniqueEvidence = (rows: string[]) =>
  Array.from(new Set(rows.map((row) => bounded(row, 800)).filter(Boolean))).slice(
    -MAX_EVIDENCE_ROWS,
  );

export type MisconceptionCandidateInput = {
  conceptId: string;
  description: string;
  evidence: string;
  confidence?: number;
  fingerprint?: string;
  bookId?: string;
  conversationId?: string;
  requestId?: string;
  sourceId?: string;
  source?: string;
  evaluator?: Misconception["evaluator"];
  evidenceType?: Misconception["evidenceType"];
  scoreRatio?: number;
  metadata?: Record<string, unknown>;
};

export const createMisconceptionCandidateRecord = (
  input: MisconceptionCandidateInput,
  now = Date.now(),
  id = uuidv4(),
): Misconception => {
  const conceptId = bounded(input.conceptId, 240);
  const description = bounded(input.description, 480);

  return {
    id,
    concept_id: conceptId,
    description,
    evidence: uniqueEvidence([input.evidence]),
    confidence: Math.max(0, Math.min(1, input.confidence ?? 0.6)),
    attempts_to_resolve: 0,
    resolved: false,
    createdAt: now,
    updatedAt: now,
    candidateContract: "evaluated_answer_misconception_candidate_v1",
    fingerprint: normalizedFingerprint(
      conceptId,
      input.fingerprint,
      description,
    ),
    bookId: input.bookId,
    conversationId: input.conversationId,
    requestId: input.requestId,
    sourceId: input.sourceId,
    source: input.source,
    evaluator: input.evaluator,
    evidenceType: input.evidenceType,
    scoreRatio: input.scoreRatio,
    metadata: {
      ...input.metadata,
      candidateOnly: true,
      masteryMutationAllowed: false,
    },
  };
};

export const mergeMisconceptionCandidateRecord = (
  existing: Misconception,
  input: MisconceptionCandidateInput,
  now = Date.now(),
): Misconception => {
  const evidence = uniqueEvidence([...existing.evidence, input.evidence]);
  const evidenceAdded = evidence.length > existing.evidence.length;

  return {
    ...existing,
    description: bounded(input.description || existing.description, 480),
    evidence,
    confidence: Math.min(
      0.9,
      Math.max(existing.confidence, input.confidence ?? 0.6) +
        (evidenceAdded ? 0.05 : 0),
    ),
    updatedAt: now,
    candidateContract: "evaluated_answer_misconception_candidate_v1",
    fingerprint: normalizedFingerprint(
      existing.concept_id,
      input.fingerprint || existing.fingerprint,
      input.description || existing.description,
    ),
    bookId: input.bookId || existing.bookId,
    conversationId: input.conversationId || existing.conversationId,
    requestId: input.requestId || existing.requestId,
    sourceId: input.sourceId || existing.sourceId,
    source: input.source || existing.source,
    evaluator: input.evaluator || existing.evaluator,
    evidenceType: input.evidenceType || existing.evidenceType,
    scoreRatio: input.scoreRatio ?? existing.scoreRatio,
    metadata: {
      ...existing.metadata,
      ...input.metadata,
      candidateOnly: true,
      masteryMutationAllowed: false,
    },
  };
};

export class MisconceptionGraph {
  public async addMisconception(
    conceptId: string,
    description: string,
    initialEvidence: string,
  ): Promise<Misconception> {
    const misconception: Misconception = {
      id: uuidv4(),
      concept_id: conceptId,
      description,
      evidence: [initialEvidence],
      confidence: 0.6, // Initial confidence
      attempts_to_resolve: 0,
      resolved: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.misconceptions.add(misconception);
    return misconception;
  }

  public async upsertMisconceptionCandidate(
    input: MisconceptionCandidateInput,
  ): Promise<Misconception> {
    const candidate = createMisconceptionCandidateRecord(input);
    const existing = (await this.getForConcept(candidate.concept_id)).find(
      (row) => !row.resolved && row.fingerprint === candidate.fingerprint,
    );
    const next = existing
      ? mergeMisconceptionCandidateRecord(existing, input)
      : candidate;
    await db.misconceptions.put(next);
    return next;
  }

  public async getActiveMisconceptions(
    bookId?: string,
  ): Promise<Misconception[]> {
    return await db.misconceptions
      .filter(
        (misconception) =>
          !misconception.resolved &&
          (!bookId ||
            !misconception.bookId ||
            misconception.bookId === bookId),
      )
      .toArray();
  }

  public async getForConcept(conceptId: string): Promise<Misconception[]> {
    return await db.misconceptions
      .where("concept_id")
      .equals(conceptId)
      .toArray();
  }

  public async resolveMisconception(id: string, strategy: string) {
    const m = await db.misconceptions.get(id);
    if (!m) return;

    m.resolved = true;
    m.resolution_strategy = strategy;
    await db.misconceptions.put(m);
  }

  public async incrementAttempts(id: string) {
    const m = await db.misconceptions.get(id);
    if (m) {
      m.attempts_to_resolve += 1;
      await db.misconceptions.put(m);
    }
  }
}

export const misconceptionGraph = new MisconceptionGraph();
