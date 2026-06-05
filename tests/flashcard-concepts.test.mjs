import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseFlashcardConcept,
  createFlashcardForStorage,
  ensurePersistentConceptForLearningBookConceptId,
  normalizeGeneratedConceptId,
  persistentConceptFromLearningBookConcept,
} from "../.tmp-test/flashcard.concepts.mjs";

const concept = {
  id: "book:one:concept:bayes-rule",
  bookId: "book:one",
  name: "Bayes rule",
  summary: "A rule for updating belief after evidence.",
  mastery: 0.9,
  confidence: 0.75,
  parentConcepts: ["probability"],
  childConcepts: ["posterior odds"],
  evidence: ["discussed in chat"],
  firstSeenAt: 111,
  updatedAt: 222,
};

test("generated flashcard concept ids reject placeholders", () => {
  assert.equal(normalizeGeneratedConceptId("general"), null);
  assert.equal(normalizeGeneratedConceptId(" unknown "), null);
  assert.equal(
    normalizeGeneratedConceptId("book:one:concept:bayes-rule"),
    "book:one:concept:bayes-rule",
  );
});

test("explicit learning-book concept ids are preserved and linked", () => {
  const resolution = chooseFlashcardConcept(
    {
      front: "What does this rule do?",
      back: "It updates belief.",
      conceptId: "book:one:concept:bayes-rule",
    },
    [concept],
  );

  assert.equal(resolution.conceptId, concept.id);
  assert.equal(resolution.reason, "explicit_learning_book");
  assert.equal(resolution.linkedConcept.id, concept.id);
});

test("flashcards link to mapped concepts only when the concept name appears", () => {
  const resolution = chooseFlashcardConcept(
    {
      front: "What does Bayes rule update?",
      back: "Belief after evidence.",
    },
    [concept],
  );

  assert.equal(resolution.conceptId, concept.id);
  assert.equal(resolution.reason, "matched_learning_book");
});

test("flashcards prefer the most specific learning-book concept phrase", () => {
  const broadConcept = {
    ...concept,
    id: "book:one:concept:knowledge-tracing",
    name: "Knowledge Tracing",
  };
  const specificConcept = {
    ...concept,
    id: "book:one:concept:bayesian-knowledge-tracing",
    name: "Bayesian Knowledge Tracing",
  };

  const resolution = chooseFlashcardConcept(
    {
      front: "How does Bayesian Knowledge Tracing update p_learn?",
      back: "It uses observed active-recall evidence.",
    },
    [broadConcept, specificConcept],
  );

  assert.equal(resolution.conceptId, specificConcept.id);
  assert.equal(resolution.reason, "matched_learning_book");
  assert.equal(resolution.linkedConcept.id, specificConcept.id);
});

test("ambiguous flashcards stay general instead of fabricating mastery links", () => {
  const resolution = chooseFlashcardConcept(
    {
      front: "What is the main takeaway?",
      back: "Remember the idea.",
    },
    [concept],
  );

  assert.equal(resolution.conceptId, "general");
  assert.equal(resolution.reason, "unresolved");
  assert.equal(resolution.linkedConcept, undefined);
});

test("flashcard storage keeps unresolved cards book-scoped without concept links", async () => {
  const { flashcard, resolution } = await createFlashcardForStorage(
    {
      front: "  What is the main takeaway?  ",
      back: " Explain it in your own words. ",
      conceptId: "unknown",
    },
    {
      id: "card-general-1",
      bookId: "book:one",
      bookTitle: "Bayes Notes",
      nextReviewAt: 444,
      learningBookConcepts: [concept],
    },
  );

  assert.equal(resolution.conceptId, "general");
  assert.equal(resolution.reason, "unresolved");
  assert.equal(resolution.linkedConcept, undefined);
  assert.equal(flashcard.id, "card-general-1");
  assert.equal(flashcard.conceptId, "general");
  assert.equal(flashcard.bookId, "book:one");
  assert.equal(flashcard.bookTitle, "Bayes Notes");
  assert.equal(flashcard.front, "What is the main takeaway?");
  assert.equal(flashcard.back, "Explain it in your own words.");
  assert.equal(flashcard.nextReviewAt, 444);
});

test("learning-book concepts promote into BKT-safe persistent concepts", () => {
  const persistent = persistentConceptFromLearningBookConcept(concept, 333);

  assert.equal(persistent.id, concept.id);
  assert.equal(persistent.name, concept.name);
  assert.equal(persistent.mastery, 0);
  assert.equal(persistent.confidence, 0.75);
  assert.equal(persistent.p_learn, 0.2);
  assert.deepEqual(persistent.attempt_history, []);
  assert.deepEqual(persistent.prerequisites, ["probability"]);
  assert.deepEqual(persistent.relatedConcepts, ["posterior odds"]);
  assert.equal(persistent.firstLearnedAt, 111);
});

test("learning-book concept id promotion ignores placeholders", async () => {
  assert.equal(
    await ensurePersistentConceptForLearningBookConceptId("general"),
    null,
  );
});
