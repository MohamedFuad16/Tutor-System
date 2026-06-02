import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluatedAnswerConceptId,
  evaluatedAnswerOutcome,
  evaluatedAnswerSummary,
  recordEvaluatedAnswerEvidence,
} from "../.tmp-test/answer.evidence.mjs";

const createEngine = (concept = { id: "bayes" }) => {
  const calls = [];
  return {
    calls,
    async updateConceptAttempt(...args) {
      calls.push(args);
      return concept;
    },
  };
};

test("evaluated answer evidence skips placeholder concept ids", () => {
  assert.equal(evaluatedAnswerConceptId({ conceptId: "" }), null);
  assert.equal(evaluatedAnswerConceptId({ conceptId: " general " }), null);
  assert.equal(evaluatedAnswerConceptId({ conceptId: " bayes " }), "bayes");
});

test("evaluated answer outcome requires a clear evaluation", () => {
  assert.equal(evaluatedAnswerOutcome({}), null);
  assert.deepEqual(
    evaluatedAnswerOutcome({
      score: 4,
      maxScore: 5,
      threshold: 0.75,
      evidenceType: "transfer",
    }),
    {
      correct: true,
      evidenceType: "transfer",
      scoreRatio: 0.8,
      threshold: 0.75,
    },
  );
  assert.deepEqual(evaluatedAnswerOutcome({ correct: false }), {
    correct: false,
    evidenceType: "generation",
    scoreRatio: undefined,
    threshold: 0.7,
  });
});

test("evaluated answer summary keeps the learner question visible", () => {
  assert.equal(
    evaluatedAnswerSummary({
      question: "Explain Bayes rule in your own words.",
      score: 3,
      maxScore: 5,
    }),
    'Evaluated answer scored 3/5 for "Explain Bayes rule in your own words."',
  );
});

test("evaluated answer evidence refuses unevaluated answers", async () => {
  const engine = createEngine();
  const result = await recordEvaluatedAnswerEvidence(
    {
      conceptId: "bayes",
      question: "What does posterior mean?",
      learnerAnswer: "It is the updated belief.",
    },
    engine,
  );

  assert.equal(result.status, "skipped_unevaluated");
  assert.equal(result.conceptId, "bayes");
  assert.equal(engine.calls.length, 0);
});

test("evaluated answer evidence records scored attempts through BKT", async () => {
  const engine = createEngine();
  const result = await recordEvaluatedAnswerEvidence(
    {
      conceptId: "bayes",
      question: "Use Bayes rule in a new diagnostic example.",
      learnerAnswer: "I update the prior using the likelihood.",
      score: 4,
      maxScore: 5,
      threshold: 0.75,
      evidenceType: "transfer",
      rubric: ["Uses prior", "Uses likelihood", "Explains posterior"],
      bookId: "book:bayes",
      bookTitle: "Bayes Notes",
      conversationId: "conversation-1",
      requestId: "request-1",
      sourceId: "quiz-1",
      evaluator: "model_rubric",
    },
    engine,
  );

  assert.equal(result.status, "recorded");
  assert.equal(result.correct, true);
  assert.equal(result.evidenceType, "transfer");
  assert.equal(result.scoreRatio, 0.8);
  assert.equal(engine.calls.length, 1);

  const [conceptId, isCorrect, evidenceType, options] = engine.calls[0];
  assert.equal(conceptId, "bayes");
  assert.equal(isCorrect, true);
  assert.equal(evidenceType, "transfer");
  assert.equal(options.source, "evaluated_answer");
  assert.match(options.summary, /Evaluated answer scored 4\/5/);
  assert.equal(options.metadata.evidenceContract, "evaluated_answer_v1");
  assert.equal(options.metadata.scoreRatio, 0.8);
  assert.equal(options.metadata.evaluationThreshold, 0.75);
  assert.equal(options.metadata.evaluator, "model_rubric");
  assert.equal(options.metadata.requestId, "request-1");
  assert.deepEqual(options.metadata.rubric, [
    "Uses prior",
    "Uses likelihood",
    "Explains posterior",
  ]);
});

test("evaluated answer evidence reports missing concepts without faking mastery", async () => {
  const engine = createEngine(null);
  const result = await recordEvaluatedAnswerEvidence(
    {
      conceptId: "bayes",
      question: "Define posterior.",
      correct: true,
    },
    engine,
  );

  assert.equal(result.status, "missing_concept");
  assert.equal(engine.calls.length, 1);
});
