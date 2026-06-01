# Packet Q Result: Artifact and citation state ledger

## Summary

Phase 12 adds durable local artifact and citation-state records. Web-search source cards now persist as source-card artifacts with linked citation states, and source failures/no-source completions persist unavailable citation states.

## Integration Notes

- Added Dexie schema version 13 with `artifactRecords` and `citationStates`.
- Added `src/memory/artifact.records.ts` with conservative normalization, stable IDs, compact fields, source-card capture, and unavailable citation recording.
- ChatPanel records source artifacts from `web_result`, `web_sources_complete`, and final `done` sources. It records unavailable citation states when a web-search completion has no sources or an error.
- Source cards now display a compact `citation checking` state chip to avoid implying verification.
- Admin adds `Source Artifacts` / `Artifacts & Citations` with artifact meters, citation-state meters, recent rows, metadata expansion, and review actions that feed the correction ledger.

## Out of Scope

- No AWS/cloud synchronization.
- No automated citation verification worker.
- No destructive correction propagation.

## Verification

- `npm run lint`: passed.
- `npm run test`: passed, 48 tests.
- `npm run build`: passed.
- `npm run format:check`: expected failure only on pre-existing `src/views/RevisionView.tsx` formatting.
- Browser QA on `http://127.0.0.1:3100`: Admin `Artifacts & Citations` rendered on desktop and mobile, boundary copy was visible, document width matched viewport width, and browser warning/error logs were 0.
- Browser screenshot saving to `.workflow/.../results/admin-source-artifacts-smoke.png` was blocked by browser runtime filesystem permissions (`EPERM`), so this packet records DOM/log QA evidence.
- `graphify update . --force`: regenerated the code architecture graph with 688 nodes, 1158 edges, and 47 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or phase stash markers in checked graph artifacts.
- Graphify query smoke returned `artifact.records.ts`, `ArtifactRecord`, `CitationState`, `recordWebSourceArtifact()`, `recordUnavailableCitationState()`, `AdminView()`, and `ChatPanel()`.
