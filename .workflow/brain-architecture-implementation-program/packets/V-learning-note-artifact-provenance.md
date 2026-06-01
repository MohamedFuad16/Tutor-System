# Packet V: Learning-note artifact provenance

## Objective

Persist generated learning-book entries into the local artifact/citation trust
ledger so Admin can audit generated study notes without treating them as
source-verified facts.

## Context

Graphify and the read-only sidecar routed this slice through:

- `src/memory/memory.orchestrator.ts`
- `src/memory/artifact.records.ts`
- `src/memory/longterm.memory.ts`
- `src/views/AdminView.tsx`
- `tests/artifact-records.test.mjs`
- `src/lib/tutorBook.json`
- `src/lib/userBrainArchitectureBook.ts`
- `src/views/RevisionView.tsx`
- `TUTOR_ARCHITECTURE.md`

## Ownership

Main agent owns implementation and integration. Final-check sidecar should stay
read-only and verify the provenance boundary before commit.

## Do

- Add reusable generated learning-note artifact record helpers.
- Record one `notes` `ArtifactRecord` after each generated `LearningEntry`.
- Use the learning entry id as the source reference to avoid overwriting entries
  from the same conversation.
- Keep generated note provenance `not_checked` until a real notes verifier
  exists.
- Update Admin copy and the system/brain/app design books.
- Add focused tests for generated learning-note artifact provenance.

## Do Not

- Do not claim generated learning notes are externally verified.
- Do not feed generated note provenance into mastery as verified evidence.
- Do not fetch external pages or implement cloud/AWS persistence.
- Do not broaden this slice to charts, code snippets, images, or websites.
- Do not stage unrelated old workflow directories.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run format:check`
- Browser QA for Admin Source Artifacts and updated built-in books.
- Graphify regeneration and smoke query because this phase changes code
  architecture artifacts.
