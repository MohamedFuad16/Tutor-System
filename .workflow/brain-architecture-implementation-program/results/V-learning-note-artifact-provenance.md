# Packet V Result: Learning-note artifact provenance

Status: completed.

## Accepted

- Added generated learning-note artifact helpers in
  `src/memory/artifact.records.ts`.
- `MemoryOrchestrator.updateLearningBookFromConversation()` now assigns a stable
  learning-entry id before persistence and records a sibling `notes`
  `ArtifactRecord` plus linked `not_checked` citation state.
- The note artifact uses the learning-entry id as its source reference and
  stores local-only generated-artifact metadata with
  `externalContentFetched: false`.
- Admin, Tutor System Architecture, User Brain Architecture, and App Design
  Language book copy now describe generated learning-note provenance.
- Added a focused pure helper test for generated learning-note provenance.

## Rejected

- AWS/cloud synchronization remains deferred.
- Note artifact provenance is not source-span verification.
- Generated note rows are not used as verified mastery evidence.
- Charts, code snippets, images, and websites remain future artifact slices.

## Verification

- `npm run lint`: passed.
- `npm run test`: passed, 64 tests.
- `npm run build`: passed.
- `npm run format:check`: passed after formatting `AdminView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Source Artifacts rendered the
  `chat, memory, and tool streams` copy, generated learning-note empty-state
  copy, `Not checked` meter, no horizontal overflow, and zero warning/error
  logs at mobile and desktop widths. Tutor System Architecture, User Brain
  Architecture, and App Design Language rendered the updated note-provenance
  copy.
- `graphify update . --force`: regenerated the code architecture graph with 733
  nodes, 1293 edges, and 50 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query returned `createGeneratedNotesArtifactRecords()`,
  `recordGeneratedNotesArtifact()`,
  `.updateLearningBookFromConversation()`, `MemoryOrchestrator`, and
  `AdminView()`.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or generated `server.mjs` paths.
- Final-check sidecar Galileo found no code blockers. It flagged stale workflow
  closeout fields, which were updated before commit.
