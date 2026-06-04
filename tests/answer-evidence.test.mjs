import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluatedAnswerConceptId,
  evaluatedAnswerMisconceptionCandidate,
  evaluatedAnswerOutcome,
  evaluatedAnswerSummary,
  normalizeEvaluatedAnswerEvidenceInput,
  recordEvaluatedAnswerEvidenceBatch,
  recordEvaluatedAnswerEvidence,
} from "../.tmp-test/answer.evidence.mjs";

const createEngine = (concept = { id: "bayes" }, ensureConcept = undefined) => {
  const calls = [];
  const ensureCalls = [];
  const misconceptionCalls = [];
  const engine = {
    calls,
    ensureCalls,
    misconceptionCalls,
    async updateConceptAttempt(...args) {
      calls.push(args);
      return concept;
    },
    async upsertMisconceptionCandidate(input) {
      misconceptionCalls.push(input);
      return {
        id: `misconception-${misconceptionCalls.length}`,
        concept_id: input.conceptId,
        description: input.description,
        evidence: [input.evidence],
        confidence: input.confidence,
        attempts_to_resolve: 0,
        resolved: false,
        createdAt: Date.now(),
      };
    },
  };

  if (ensureConcept) {
    engine.ensureConceptForAttempt = async (conceptId) => {
      ensureCalls.push(conceptId);
      return ensureConcept(conceptId);
    };
  }

  return engine;
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

test("incorrect evaluated answers create conservative misconception candidates", () => {
  const candidate = evaluatedAnswerMisconceptionCandidate(
    {
      conceptId: "book:bayes:concept:likelihood",
      question: "What does likelihood measure?",
      learnerAnswer: "It is the probability the hypothesis is true.",
      score: 1,
      maxScore: 4,
      threshold: 0.7,
      bookId: "book:bayes",
      conversationId: "conversation-1",
      requestId: "request-1",
      sourceId: "quiz-1",
      source: "chat_tool_evaluate_answer",
      evaluator: "model_rubric",
    },
    {
      correct: false,
      evidenceType: "generation",
      scoreRatio: 0.25,
      threshold: 0.7,
    },
  );

  assert.equal(candidate.conceptId, "book:bayes:concept:likelihood");
  assert.match(candidate.description, /Possible misconception/);
  assert.match(candidate.evidence, /scored 25% below the 70% threshold/);
  assert.equal(candidate.bookId, "book:bayes");
  assert.equal(candidate.requestId, "request-1");
  assert.equal(candidate.source, "chat_tool_evaluate_answer");
  assert.equal(candidate.evaluator, "model_rubric");
  assert.equal(candidate.metadata.candidateOnly, true);
  assert.equal(candidate.metadata.masteryMutationAllowed, false);
});

test("correct or conceptless answers do not create misconception candidates", () => {
  assert.equal(
    evaluatedAnswerMisconceptionCandidate(
      {
        conceptId: "bayes",
        question: "Define posterior.",
        correct: true,
      },
      {
        correct: true,
        evidenceType: "generation",
        scoreRatio: undefined,
        threshold: 0.7,
      },
    ),
    null,
  );
  assert.equal(
    evaluatedAnswerMisconceptionCandidate(
      {
        question: "Define posterior.",
        correct: false,
      },
      {
        correct: false,
        evidenceType: "generation",
        scoreRatio: undefined,
        threshold: 0.7,
      },
    ),
    null,
  );
});

test("evaluated answer payloads normalize chat and voice tool metadata", () => {
  const input = normalizeEvaluatedAnswerEvidenceInput(
    {
      conceptId: " concept:bayes ",
      question: "Explain posterior probability.",
      answer: "It is the updated probability after evidence.",
      correct: "correct",
      evidenceType: "transfer",
      rubric: ["Uses prior", "", "Uses evidence"],
      metadata: { toolCallId: "tool-1" },
    },
    {
      bookId: "book:bayes",
      requestId: "chat-1",
      source: "chat_tool_evaluate_answer",
      evaluator: "model_rubric",
      metadata: { agentLayer: "chat_stream" },
    },
  );

  assert.equal(input.conceptId, "concept:bayes");
  assert.equal(
    input.learnerAnswer,
    "It is the updated probability after evidence.",
  );
  assert.equal(input.correct, true);
  assert.equal(input.evidenceType, "transfer");
  assert.equal(input.bookId, "book:bayes");
  assert.equal(input.requestId, "chat-1");
  assert.equal(input.source, "chat_tool_evaluate_answer");
  assert.equal(input.evaluator, "model_rubric");
  assert.deepEqual(input.rubric, ["Uses prior", "Uses evidence"]);
  assert.deepEqual(input.metadata, {
    agentLayer: "chat_stream",
    toolCallId: "tool-1",
  });
});

test("evaluated answer payload normalization drops invalid tool payloads", () => {
  assert.equal(normalizeEvaluatedAnswerEvidenceInput(null), null);
  assert.equal(
    normalizeEvaluatedAnswerEvidenceInput({ conceptId: "bayes" }),
    null,
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

test("evaluated answer evidence batch records only normalized payloads", async () => {
  const engine = createEngine();
  const results = await recordEvaluatedAnswerEvidenceBatch(
    [
      {
        conceptId: "bayes",
        question: "Define likelihood.",
        correct: true,
      },
      {
        conceptId: "bayes",
      },
    ],
    {
      requestId: "voice-1",
      source: "voice_tool_evaluate_answer",
    },
    engine,
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].status, "recorded");
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0][3].source, "voice_tool_evaluate_answer");
  assert.equal(engine.calls[0][3].metadata.requestId, "voice-1");
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
  assert.equal(options.evidenceContract, "evaluated_answer_v1");
  assert.match(options.attemptId, /^evaluated-answer:request-1:bayes:/);
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
  assert.equal(engine.misconceptionCalls.length, 0);
});

test("incorrect evaluated answers record candidates only after real concept updates", async () => {
  const engine = createEngine({ id: "book:bayes:concept:likelihood" });
  const result = await recordEvaluatedAnswerEvidence(
    {
      conceptId: "book:bayes:concept:likelihood",
      question: "What does likelihood measure?",
      learnerAnswer: "It is the probability the hypothesis is true.",
      correct: false,
      evidenceType: "generation",
      bookId: "book:bayes",
      conversationId: "conversation-1",
      requestId: "request-1",
      sourceId: "quiz-1",
      source: "chat_tool_evaluate_answer",
      evaluator: "model_rubric",
    },
    engine,
  );

  assert.equal(result.status, "recorded");
  assert.equal(result.misconceptionCandidateStatus, "recorded");
  assert.equal(result.misconceptionCandidateId, "misconception-1");
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.misconceptionCalls.length, 1);

  const candidate = engine.misconceptionCalls[0];
  assert.equal(candidate.bookId, "book:bayes");
  assert.equal(candidate.requestId, "request-1");
  assert.equal(candidate.sourceId, "quiz-1");
  assert.equal(candidate.source, "chat_tool_evaluate_answer");
  assert.equal(candidate.evaluator, "model_rubric");
  assert.equal(candidate.metadata.candidateOnly, true);
  assert.equal(candidate.metadata.masteryMutationAllowed, false);
});

test("evaluated answer evidence promotes learning-book concepts before BKT", async () => {
  const order = [];
  const engine = createEngine(
    { id: "book:bayes:concept:posterior" },
    async (conceptId) => {
      order.push(`ensure:${conceptId}`);
      return { id: conceptId };
    },
  );
  const result = await recordEvaluatedAnswerEvidence(
    {
      conceptId: "book:bayes:concept:posterior",
      question: "Explain posterior probability.",
      correct: true,
      source: "chat_tool_evaluate_answer",
    },
    engine,
  );

  order.push(`update:${engine.calls[0][0]}`);

  assert.equal(result.status, "recorded");
  assert.deepEqual(engine.ensureCalls, ["book:bayes:concept:posterior"]);
  assert.deepEqual(order, [
    "ensure:book:bayes:concept:posterior",
    "update:book:bayes:concept:posterior",
  ]);
  assert.equal(engine.calls[0][3].metadata.conceptPromotionStatus, "ready");
  assert.equal(engine.calls[0][3].evidenceContract, "evaluated_answer_v1");
});

test("evaluated answer evidence does not fake mastery when promotion misses", async () => {
  const engine = createEngine(null, async () => null);
  const result = await recordEvaluatedAnswerEvidence(
    {
      conceptId: "book:bayes:concept:posterior",
      question: "Explain posterior probability.",
      correct: true,
    },
    engine,
  );

  assert.equal(result.status, "missing_concept");
  assert.equal(
    engine.calls[0][3].metadata.conceptPromotionStatus,
    "unresolved",
  );
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
  assert.equal(engine.misconceptionCalls.length, 0);
});
