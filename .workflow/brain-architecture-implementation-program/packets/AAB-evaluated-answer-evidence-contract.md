# Packet AAB: Evaluated Answer Evidence Contract

## Objective

Add a local, reusable evidence contract for learner answers that have been
explicitly evaluated, so future quiz, chat, voice, or revision callers can move
BKT mastery without treating unevaluated model impressions as durable proof.

## Context

Graphify routed this slice through `answer.evidence.ts` candidates,
`evidence.mastery.ts`, `bkt.engine.ts`, `revision.evidence.ts`,
`PersistentConcept`, `recordFlashcardReviewEvidence()`, and
`tests/evidence-mastery.test.mjs`. Source inspection showed flashcards already
had a validated BKT path, but learner answers outside flashcards did not have a
shared contract that required concept linkage plus a score or correct/incorrect
evaluation.

## Ownership

- `src/memory/answer.evidence.ts`
- `tests/answer-evidence.test.mjs`
- `package.json` test/format script coverage
- Admin and built-in book copy that explains evaluated-answer evidence
- Workflow evidence and `graphify-out/*` after explicit Graphify regeneration

## Do

- Require a real concept id before evaluated answers can call BKT.
- Require either an explicit `correct` boolean or a numeric score/max-score
  evaluation before BKT can move.
- Preserve rubric, score, evaluator, request, book, conversation, and source
  metadata in the BKT evidence write.
- Keep unevaluated answers as skipped results, not mastery evidence.
- Update Admin and book copy to describe the local-only boundary.

## Do Not

- Add a full quiz UI in this slice.
- Call live models or grade answers in this helper.
- Treat model summaries as durable learner mastery evidence.
- Add AWS/cloud synchronization.
- Touch unrelated workflow directories or user/other-agent changes.

## Expected Output

- A tested local helper that future answer-evaluation callers can reuse.
- Admin Evidence copy names evaluated answers as a validated recall source.
- Built-in books document the boundary without over-claiming rubric quality.
- Tests, browser QA, clean Graphify refresh, commit, and push.
