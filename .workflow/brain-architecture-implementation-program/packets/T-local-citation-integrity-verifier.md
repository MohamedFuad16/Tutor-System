# Packet T: Local citation integrity verifier

## Objective

Add an explicit local-only verifier before source-card citation rows can move
from `checking` to `verified`, and surface that transition in Admin and beta
diagnostics without claiming external page truth.

## Context

Graphify routed this slice through:

- `src/memory/artifact.records.ts`
- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/artifact-records.test.mjs`
- `tests/beta-diagnostics.test.mjs`
- `src/lib/tutorBook.json`
- `src/lib/userBrainArchitectureBook.ts`
- `src/views/RevisionView.tsx`

## Ownership

Main agent owns integration. Sidecars remain read-only and are used for final
verification or targeted audit only.

## Do

- Add a pure local citation-integrity verifier for source-card citation rows.
- Persist verifier transitions through Dexie helpers for citation and artifact
  records.
- Keep artifact `ready` distinct from citation `verified`.
- Count conflicting, unsupported, and not-checked citation states in beta
  diagnostics.
- Add Admin controls and copy for running the local check.
- Update the System Architecture, User Brain Architecture, and App Design books.
- Regenerate Graphify because the phase explicitly changes code architecture
  artifacts and the user asked to keep the code architecture graph current.

## Do Not

- Do not fetch external pages from the browser verifier.
- Do not claim global factual correctness or cloud beta readiness.
- Do not implement AWS/cloud persistence.
- Do not stage unrelated old workflow directories.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run format:check`
- Browser QA for Admin Source Artifacts, Beta Diagnostics, and built-in books.
- Graphify regeneration and smoke query.
