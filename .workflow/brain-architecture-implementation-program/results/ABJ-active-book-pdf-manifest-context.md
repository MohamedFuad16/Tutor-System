# Packet ABJ: Active-Book PDF Manifest Context

Status: Completed

## Graphify Context

- `graphify query "ChatPanel multi PDF document context voice memory orchestrator active book source materials" --budget 5000 --graph graphify-out/graph.json` routed the slice through `ChatPanel.tsx`, `StudyView.tsx`, `memory.orchestrator.ts`, `brain.context.ts`, `longterm.memory.ts`, store, and tests.
- `graphify query "AudioOverviewPlayer fallback local audio overview play button RevisionView tutor book chapter audio" --budget 4000 --graph graphify-out/graph.json` routed the audio-overview check through `RevisionView.tsx`, `StoredAudioOverview()`, `chapterAudioOverviews.ts`, and `audio.ts`.
- `graphify path "buildBrainDocumentContext()" "ChatPanel()" --graph graphify-out/graph.json` found a three-hop path through `brain.context.ts` and `ChatPanel.tsx`.

## Implementation Notes

- The shared packet builder now emits an active-book PDF manifest plus ready
  excerpts, instead of making non-ready PDFs disappear from context.
- Packet metadata now records added, ready, excerpted, pending/failed, and
  omitted ready PDF counts.
- Typed chat sends that metadata to `/api/chat`; live voice sends it through
  websocket auth.
- Server activity rows preserve the metadata without raw context text.
- Admin request timelines render compact PDF-count chips for
  `brain_context_injected` memory events.
- Stored audio-overview playback was inspected in the connected `StoredAudioOverview()`
  component; it still uses one visible player with a hidden `<audio>` element
  and bounded background retry rather than a second play button.

## Verification

- `npm run format`: passed.
- Workflow verifier: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 131 tests.
- `npm run build`: passed.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing assets.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- Browser QA confirmed Admin request timelines at `1440x1000` and `390x844`
  render with no horizontal overflow. The in-app Browser read-only evaluation
  context did not expose IndexedDB, so the live multi-PDF row itself remains
  covered by focused tests rather than a browser-seeded row.
- Browser QA confirmed App Design Language / Local Beta Control Patterns at
  `390x844` and `1440x1000` renders the PDF manifest copy with one visible
  `Play` button, one hidden audio element, zero native audio controls, and no
  horizontal overflow.
- Screenshots saved:
  - `ABJ-iab-admin-desktop.png`
  - `ABJ-iab-admin-mobile.png`
  - `ABJ-iab-app-design-desktop.png`
- `graphify update . --force`: passed, `978` nodes, `1707` edges, `63`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `buildBrainDocumentContextReport()`,
  `buildBrainContextPacket()`, `ChatPanel()`, `AdminRequestTimeline`, and
  `AdminView()`.
- `graphify path "buildBrainDocumentContextReport()" "AdminView()"` found a
  four-hop path through `brain.context.ts`, `ChatPanel.tsx`, and `useStore`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Risk

- Focused tests prove local packet/server contracts, not real provider-key chat
  or real Deepgram voice behavior.
