import test from "node:test";
import assert from "node:assert/strict";

import {
  flashcardEvidenceConceptId,
  flashcardReviewOutcome,
  flashcardReviewSummary,
  recordFlashcardReviewEvidence,
} from "../.tmp-test/revision.evidence.mjs";

test("flashcard evidence only uses real concept ids", () => {
  assert.equal(flashcardEvidenceConceptId({ conceptId: undefined }), null);
  assert.equal(flashcardEvidenceConceptId({ conceptId: "general" }), null);
  assert.equal(
    flashcardEvidenceConceptId({ conceptId: " bayes-rule " }),
    "bayes-rule",
  );
});

test("flashcard review quality maps to generation correctness", () => {
  assert.deepEqual(flashcardReviewOutcome(0), {
    correct: false,
    evidenceType: "generation",
  });
  assert.deepEqual(flashcardReviewOutcome(4), {
    correct: true,
    evidenceType: "generation",
  });
});

test("flashcard review summaries stay compact and bounded", () => {
  const summary = flashcardReviewSummary(
    {
      front: `  ${"Explain active recall evidence ".repeat(12)}  `,
    },
    3,
  );

  assert.match(summary, /^Flashcard review scored 3\/5 for "/);
  assert.equal(summary.includes("  "), false);
  assert.ok(summary.length <= 200);
});

test("flashcard review records BKT evidence with source metadata", async () => {
  const calls = [];
  const engine = {
    async updateConceptAttempt(...args) {
      calls.push(args);
      return { id: args[0] };
    },
  };
  const card = {
    id: "card-1",
    conceptId: "bayes-rule",
    bookId: "book-1",
    bookTitle: "Bayes Notes",
    front: "What does Bayes rule update?",
    back: "Belief after evidence.",
    nextReviewAt: 0,
  };

  const result = await recordFlashcardReviewEvidence(card, 5, engine);

  assert.equal(result.status, "recorded");
  assert.equal(result.conceptId, "bayes-rule");
  assert.equal(result.correct, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 3), ["bayes-rule", true, "generation"]);
  assert.equal(calls[0][3].source, "revision_flashcard");
  assert.equal(calls[0][3].evidenceContract, "flashcard_review_v1");
  assert.match(calls[0][3].attemptId, /^flashcard-review:card-1:/);
  assert.equal(calls[0][3].metadata.flashcardId, "card-1");
  assert.equal(calls[0][3].metadata.quality, 5);
});

test("flashcard review fails closed when the concept is missing", async () => {
  const calls = [];
  const engine = {
    async updateConceptAttempt(...args) {
      calls.push(args);
      return null;
    },
  };
  const card = {
    id: "card-missing",
    conceptId: "missing-concept",
    bookId: "book-1",
    bookTitle: "Bayes Notes",
    front: "What does active recall prove?",
    back: "Only learner attempts can move mastery.",
    nextReviewAt: 0,
  };

  const result = await recordFlashcardReviewEvidence(card, 3, engine);

  assert.equal(result.status, "missing_concept");
  assert.equal(result.conceptId, "missing-concept");
  assert.equal(result.correct, false);
  assert.equal(result.evidenceType, "generation");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 3), [
    "missing-concept",
    false,
    "generation",
  ]);
  assert.equal(calls[0][3].evidenceContract, "flashcard_review_v1");
  assert.equal(calls[0][3].metadata.bookId, "book-1");
  assert.equal(calls[0][3].metadata.bookTitle, "Bayes Notes");
  assert.equal(calls[0][3].metadata.quality, 3);
});

test("flashcard review skips BKT when the card has no concept id", async () => {
  let called = false;
  const result = await recordFlashcardReviewEvidence(
    {
      id: "card-2",
      conceptId: "general",
      front: "General card",
      back: "General answer",
      nextReviewAt: 0,
    },
    2,
    {
      async updateConceptAttempt() {
        called = true;
        return null;
      },
    },
  );

  assert.equal(called, false);
  assert.equal(result.status, "skipped_no_concept");
  assert.equal(result.correct, false);
});
