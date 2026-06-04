import test from "node:test";
import assert from "node:assert/strict";

import {
  flashcardEvidenceConceptId,
  flashcardReviewOutcome,
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
