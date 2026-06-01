# Packet Z: Learning-note Integrity Verifier

## Scope

Add a local generated learning-note provenance verifier so Admin can move notes
past unsupported/not-checked when their local ledger links are coherent.

## Write Scope

- `src/memory/artifact.records.ts`
- `src/views/AdminView.tsx`
- `tests/artifact-records.test.mjs`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `src/views/RevisionView.tsx`
- `TUTOR_ARCHITECTURE.md`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` only by explicit Graphify regeneration

## Constraints

- Use Graphify before source inspection.
- Do not claim factual/source-span verification for generated notes.
- Keep the verifier local-only and avoid external fetches.
- Do not change Dexie schema or AWS/cloud surfaces in this slice.

## Acceptance

- Source-card checks keep existing behavior.
- Generated notes can be locally verified only when entry id, citation link,
  source ids, book or conversation anchor, local-only metadata, no external
  fetch, and saved summary preview are coherent.
- Admin exposes Run local check for generated note artifacts/citations.
- Tests cover verified, conflicting, and unavailable generated-note outcomes.
- Architecture docs/books describe provenance verification separately from
  future source-span claim matching.
