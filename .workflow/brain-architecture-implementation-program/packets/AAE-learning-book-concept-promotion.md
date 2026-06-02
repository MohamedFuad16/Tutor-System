# Packet AAE: Learning-Book Concept Promotion For Evaluated Answers

## Objective

Close the local brain-runtime gap where chat or voice `evaluate_answer` payloads
could carry active learning-book concept ids while BKT could only update rows
already present in the persistent `concepts` table.

## Context

Graphify routed this slice through `recordEvaluatedAnswerEvidence()`,
`answer.evidence.ts`, `flashcard.concepts.ts`,
`ensurePersistentConceptForLearningBookConcept()`, `LearningBookConcept`, and
the answer/flashcard evidence tests.

## Ownership

- Write scope: `src/memory/answer.evidence.ts`,
  `src/memory/flashcard.concepts.ts`, targeted tests, connected architecture
  docs/books, workflow artifacts, and explicitly regenerated `graphify-out/*`.
- Do not touch AWS/cloud implementation.
- Do not fabricate concept rows from a raw string.

## Do

- Resolve a concept id through existing local tables before BKT writes.
- Promote a stored `LearningBookConcept` into a BKT-safe `PersistentConcept`
  only when that stored book concept exists.
- Preserve `missing_concept` when promotion cannot resolve a real row.
- Record promotion status in evidence metadata for Admin/debug inspection.
- Cover successful promotion and unresolved promotion in tests.

## Verification

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- In-app Browser QA for the updated reader/book copy at desktop and mobile.
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path for the new answer-evidence to concept-promotion
  route.
