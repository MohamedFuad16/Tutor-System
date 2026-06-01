# Packet M - Durable model runs

## Scope

Phase 8 adds a durable local model-run ledger for chat model behavior. It records starts, blocked API-key checks, fallbacks, completions, and failures as local IndexedDB rows that Admin can inspect alongside runtime tuning context.

## Graphify Context

- Graphify routed this slice through `server.ts`, `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/memory/tool.jobs.ts`, `src/views/AdminView.tsx`, and `src/store/index.ts`.
- A follow-up graph query routed the mobile Admin visibility issue through `src/App.tsx`, `GsapRouteFrame()`, and `AdminView()`.

## Implementation

- Added `ModelRun` and `db.modelRuns` in Dexie schema version 9.
- Added `src/memory/model.runs.ts` for model-run ID generation, status normalization, numeric clamping, and safe persistence.
- Added `model_run` SSE events from `/api/chat` for blocked, started, fallback, completed, and failed model states.
- Wired `ChatPanel` to persist streamed `model_run` events into IndexedDB.
- Added Admin `Model Runs` tab with durable run counts, blocked/failed/fallback meters, recent run rows, runtime settings, and metadata details.
- Added a route/Admin animation visibility fallback discovered during mobile QA so local route or tab animations cannot strand Admin content at `autoAlpha: 0`.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 31 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Activity loaded, the Model Runs tab rendered its empty state, a real blocked chat request through `ChatPanel` persisted one durable blocked model run, and the Model Runs tab displayed the request id, provider, model, error, timing, and runtime metadata affordance.
- Mobile browser QA at 390x844: Admin and Model Runs rendered without horizontal overflow after the route/Admin animation guard.
- Browser screenshot capture timed out through the in-app browser CDP path, so this phase records DOM/viewport evidence rather than screenshot artifacts.
- `graphify update . --force`: regenerated the code architecture graph with 609 nodes, 998 links, and 38 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits, then regenerated again after rebasing over the remote Graphify refresh.
- `npm run graphify:tree`: passed and regenerated `graphify-out/GRAPH_TREE.html`.
- Graphify artifact smoke: no `/private/tmp` or phase temp path markers, and query smoke returned `model.runs.ts`, `createModelRunRecord()`, `recordModelRunEvent()`, `ModelRun`, `AdminView()`, and `ChatPanel()`.

## Remaining Work

- Add completed/fallback model-run integration tests with a fake streaming model harness.
- Decide whether server-side model-run persistence is needed once there is a local worker or queue.
- AWS/cloud synchronization remains out of scope until beta testing.
