# Packet ZZ: Validated Recall Confidence Movement

## Objective

Make durable learner confidence move from validated local recall evidence,
while preserving the previous model-summary gate that keeps summaries
observational.

## Context

Graphify routed the next slice through `recordFlashcardReviewEvidence()`,
`BKTEngine.updateConceptAttempt()`, `masteryFromEvidenceAttempt()`,
`confidenceFromUnderstandingDelta()`, `revision.evidence.ts`,
`bkt.engine.ts`, and `evidence.mastery.ts`. The source confirmed flashcard
reviews currently update BKT mastery but do not update durable concept
confidence.

## Ownership

- `src/memory/evidence.mastery.ts`
- `src/memory/bkt.engine.ts`
- `tests/evidence-mastery.test.mjs`
- `tests/bkt-engine.test.mjs`
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, App Design Language copy, and workflow evidence
- `graphify-out/*` after explicit Graphify regeneration

## Do

- Add conservative confidence deltas for recognition, generation, and transfer
  attempts.
- Apply those deltas only through BKT-backed validated recall attempts.
- Preserve the model-summary rule: summaries can propose confidence, but cannot
  raise durable learner confidence.
- Store confidence before/after values in evidence metadata for Admin/audit
  readers.

## Do Not

- Add AWS/cloud synchronization.
- Treat generated flashcards as factual proof by themselves.
- Change Dexie schemas unless the runtime requires it.
- Touch unrelated workflow directories or user/other-agent changes.

## Expected Output

- Flashcard review evidence linked to a real concept moves BKT mastery and
  durable learner confidence together.
- Evidence events carry traceable confidence metadata.
- Tests, docs, workflow evidence, Graphify refresh, commit, and push.
