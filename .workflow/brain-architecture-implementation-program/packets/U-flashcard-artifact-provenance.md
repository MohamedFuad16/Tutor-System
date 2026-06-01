# Packet U: Flashcard artifact provenance

## Objective

Persist generated flashcard batches into the local artifact/citation trust
ledger so Admin and beta diagnostics can audit study-card generation without
claiming external factual verification.

## Context

Graphify routed this slice through:

- `src/memory/artifact.records.ts`
- `src/components/ChatPanel.tsx`
- `src/views/AdminView.tsx`
- `tests/artifact-records.test.mjs`
- `src/lib/tutorBook.json`
- `src/lib/userBrainArchitectureBook.ts`
- `src/views/RevisionView.tsx`
- `TUTOR_ARCHITECTURE.md`

## Ownership

Main agent owns implementation and integration. Final-check sidecar should stay
read-only unless a blocking issue needs a targeted patch in a disjoint follow-up
scope.

## Do

- Add a reusable generated-flashcard artifact record helper.
- Record manual and streamed flashcard batches from `ChatPanel`.
- Keep generated flashcard provenance `not_checked` until a broader verifier
  exists.
- Make Admin copy describe both source cards and generated artifacts.
- Update system architecture, user-brain architecture, and app design books.
- Add focused tests for generated flashcard artifact provenance.

## Do Not

- Do not claim generated flashcards are externally verified.
- Do not fetch external pages or implement cloud/AWS persistence.
- Do not broaden this slice to charts/code/notes yet.
- Do not stage unrelated old workflow directories.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run format:check`
- Browser QA for Admin Source Artifacts and updated built-in books.
- Graphify regeneration and smoke query because this phase changes code
  architecture artifacts.
