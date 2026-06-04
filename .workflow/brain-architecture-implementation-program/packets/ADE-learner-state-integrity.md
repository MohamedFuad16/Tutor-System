# Packet ADE: Learner-state integrity and misconception loop

## Objective

Close two graph-identified learner-brain gaps before any renewed 99% claim:

1. Incorrect validated answers must create auditable, active-book
   misconception candidates without mutating mastery.
2. A mastery mutation must commit atomically with its verified evidence event
   and linked mastery delta, or not commit at all.

## Graph Route

- `answer.evidence.ts` -> `misconception.graph.ts` -> `learner.model.ts` ->
  `memory.orchestrator.ts`
- `answer.evidence.ts` / `revision.evidence.ts` -> `bkt.engine.ts` ->
  `evidence.ledger.ts` / `longterm.memory.ts` -> `beta.diagnostics.ts` ->
  `AdminView.tsx`

## Write Scope

- `src/memory/answer.evidence.ts`
- `src/memory/misconception.graph.ts`
- `src/memory/learner.model.ts`
- `src/memory/memory.orchestrator.ts`
- `src/memory/bkt.engine.ts`
- `src/memory/evidence.ledger.ts`
- `src/memory/beta.diagnostics.ts`
- `src/memory/longterm.memory.ts`
- `src/memory/revision.evidence.ts`
- `src/views/AdminView.tsx`
- focused tests and architecture/workflow docs
- regenerated `graphify-out/*`

## Acceptance Contract

- Validated incorrect answers create or consolidate bounded source-linked
  misconception candidates only after a real concept update.
- Candidates are active-book-aware, visible in Admin Evidence, and explicitly
  forbidden from mutating mastery.
- Validated mastery attempts require a recognized evidence contract and stable
  audit id.
- Concept, evidence event, and mastery delta commit in one Dexie transaction.
- Ledger failure rolls back the attempt; duplicate replay does not mutate
  twice.
- Admin and top-level readiness detect missing/orphan/mismatched mastery audit
  links and block 99/100 when integrity is not proven.
- AWS/cloud, real provider calls, and microphone use remain out of scope.
