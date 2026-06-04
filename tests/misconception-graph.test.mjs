import test from "node:test";
import assert from "node:assert/strict";

import {
  createMisconceptionCandidateRecord,
  mergeMisconceptionCandidateRecord,
} from "../.tmp-test/misconception.graph.mjs";

const candidateInput = {
  conceptId: "book:bayes:concept:likelihood",
  description:
    'Possible misconception revealed by an incorrect evaluated answer to "What does likelihood measure?".',
  evidence:
    'Learner answered "It is the probability the hypothesis is true." for "What does likelihood measure?" and evaluated incorrect.',
  fingerprint:
    "evaluated-answer:book:bayes:concept:likelihood:what does likelihood measure?",
  bookId: "book:bayes",
  conversationId: "conversation-1",
  requestId: "request-1",
  sourceId: "quiz-1",
  source: "chat_tool_evaluate_answer",
  evaluator: "model_rubric",
  evidenceType: "generation",
  metadata: {
    evidenceContract: "evaluated_answer_v1",
  },
};

test("misconception candidate records are auditable and cannot mutate mastery", () => {
  const candidate = createMisconceptionCandidateRecord(
    candidateInput,
    100,
    "misconception-1",
  );

  assert.equal(candidate.id, "misconception-1");
  assert.equal(candidate.concept_id, candidateInput.conceptId);
  assert.equal(
    candidate.candidateContract,
    "evaluated_answer_misconception_candidate_v1",
  );
  assert.equal(candidate.bookId, "book:bayes");
  assert.equal(candidate.requestId, "request-1");
  assert.deepEqual(candidate.evidence, [candidateInput.evidence]);
  assert.equal(candidate.metadata.candidateOnly, true);
  assert.equal(candidate.metadata.masteryMutationAllowed, false);
});

test("misconception candidate merges consolidate new evidence conservatively", () => {
  const existing = createMisconceptionCandidateRecord(
    candidateInput,
    100,
    "misconception-1",
  );
  const merged = mergeMisconceptionCandidateRecord(
    existing,
    {
      ...candidateInput,
      evidence:
        'Learner answered "Likelihood is the prior." for "What does likelihood measure?" and scored 20% below the 70% threshold.',
      requestId: "request-2",
      sourceId: "quiz-2",
      scoreRatio: 0.2,
    },
    200,
  );

  assert.equal(merged.id, existing.id);
  assert.equal(merged.createdAt, existing.createdAt);
  assert.equal(merged.updatedAt, 200);
  assert.equal(merged.evidence.length, 2);
  assert.equal(merged.confidence, 0.65);
  assert.equal(merged.requestId, "request-2");
  assert.equal(merged.sourceId, "quiz-2");
  assert.equal(merged.scoreRatio, 0.2);
  assert.equal(merged.metadata.masteryMutationAllowed, false);
});

test("duplicate misconception evidence does not raise confidence", () => {
  const existing = createMisconceptionCandidateRecord(
    candidateInput,
    100,
    "misconception-1",
  );
  const merged = mergeMisconceptionCandidateRecord(
    existing,
    candidateInput,
    200,
  );

  assert.equal(merged.evidence.length, 1);
  assert.equal(merged.confidence, existing.confidence);
});
