# Packet AAA: Concept Correction Quarantine

## Objective

Make Admin correction propagation protect durable learner-state scores when a
concept or concept-linked local row is marked wrong, superseded, or requested
for deletion review.

## Context

Graphify routed this slice through `CorrectionEvent`,
`applyCorrectionPropagation()`, `correction.events.ts`, `PersistentConcept`,
`longterm.memory.ts`, `AdminView()`, and `tests/correction-events.test.mjs`.
The source confirmed correction propagation marked related ledger rows but did
not update the `concepts` table, so a corrected concept could keep stale
confidence/mastery.

## Ownership

- `src/memory/correction.events.ts`
- `src/memory/longterm.memory.ts`
- `tests/correction-events.test.mjs`
- Admin and architecture/book copy that explains correction behavior
- Workflow evidence and `graphify-out/*` after explicit Graphify regeneration

## Do

- Add `concepts` as a correction propagation target.
- Keep correction behavior non-destructive.
- For mark-wrong, deletion-review, and supersede corrections, clear durable
  concept confidence and cap mastery/BKT knowledge while preserving previous and
  next values on the concept row.
- Keep review-only corrections as review markers without lowering scores.
- Update docs and workflow evidence.

## Do Not

- Delete concept rows.
- Add AWS/cloud synchronization.
- Treat correction overlays as proof that a replacement concept is correct.
- Touch unrelated workflow directories or user/other-agent changes.

## Expected Output

- Concept corrections quarantine stale learner scores locally.
- Correction tests cover concept quarantine and review-only behavior.
- Admin/book copy makes the boundary visible.
- Tests, browser QA, Graphify refresh, commit, and push.
