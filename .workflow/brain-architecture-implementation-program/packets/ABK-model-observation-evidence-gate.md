# Packet ABK: Model-Observation Evidence Gate

## Objective

Tighten the local learner-brain evidence boundary so background model-summary
memory writes are explicitly audit-only observations and cannot be confused with
verified mastery evidence.

## Context

- Graphify routed this slice through `memory.orchestrator.ts`,
  `evidence.mastery.ts`, `beta.diagnostics.ts`, `brain.rehearsal.ts`,
  `AdminView.tsx`, and the existing evidence/diagnostics tests.
- The user asked for regular brain-architecture completion status and simpler
  Admin Center copy.
- AWS/cloud remains out of scope.

## Ownership

- Local implementation: main agent.
- Read-only sidecars: evidence-gating gap audit and chat/voice/Admin
  observability audit.

## Do

- Centralize model-observation gate metadata.
- Stamp background learning-book, concept, and graph memory rows with the
  contract.
- Extend Beta Diagnostics so full local brain-flow readiness requires the
  model-observation gate.
- Show the evidence-gate status in Admin request-timeline memory rows.
- Simplify the Admin Center preface copy.
- Update docs/books and workflow evidence.

## Do Not

- Do not mutate Dexie schema for metadata-only changes.
- Do not implement AWS/cloud persistence.
- Do not treat synthetic rehearsal rows as live beta evidence.
- Do not stage unrelated `.workflow/*` folders.

## Verification

- Focused tests for evidence metadata and beta diagnostics.
- Full `npm run test`.
- Final gates: format check, lint, build, browser QA for Admin, and Graphify
  regeneration/smoke checks before commit.
