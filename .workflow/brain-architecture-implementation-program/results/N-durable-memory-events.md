# Packet N - Durable Memory Events

## Scope

Add a local, durable, append-only memory-event audit trail for the user-facing learner brain runtime. This slice closes another gap between the architecture book's memory-worker direction and the current local implementation without adding AWS/cloud synchronization.

## Graphify Route

- `graphify query "MemoryOrchestrator durable memory events AdminView memory observability longterm.memory Dexie schema model runs evidence ledger tool jobs" --budget 3000 --graph graphify-out/graph.json`
- `graphify path "AdminView()" "MemoryOrchestrator" --graph graphify-out/graph.json`
- `graphify path "ChatPanel()" "MemoryOrchestrator" --graph graphify-out/graph.json`

The connected files for this phase were `src/memory/longterm.memory.ts`, `src/memory/memory.orchestrator.ts`, existing ledger helpers, `src/views/AdminView.tsx`, and focused tests.

## Implementation

- Added Dexie schema version 10 with a `memoryEvents` table and `MemoryEvent` type.
- Added `src/memory/memory.events.ts` for event status normalization, compact record creation, confidence clamping, source-id cleanup, and robust local writes.
- Recorded memory events from `MemoryOrchestrator` for local session starts, saved interactions, learning-book updates, learning-book concept updates, and graph concept writes.
- Added an Admin `Memory Events` tab with durable event counts, type mix, latest context, recent memory-write rows, source/metadata details, and explicit learner-brain-vs-Graphify boundary notes.
- Added `tests/memory-events.test.mjs` and bundled the helper in `npm run test`.

## Verification

- `npm run lint`: passed.
- `npm run test`: passed, 35 tests.
- `npm run build`: passed.
- `npm run format:check`: failed only on the known pre-existing `src/views/RevisionView.tsx` formatting warning.
- Browser QA on `http://127.0.0.1:3100`: Admin Memory tab rendered on desktop and mobile, showed a real `session started` memory event from IndexedDB, had no horizontal overflow at 1280x900 or 390x844, and browser warning/error logs were 0.
- Screenshot saving to `.workflow/.../results/admin-memory-events-smoke.png` was attempted but blocked by the browser runtime with `EPERM`; DOM/log evidence was retained instead.
- `graphify update . --force`: regenerated the code architecture graph with 624 nodes, 1029 edges, and 44 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke: no `/private/tmp` or phase stash markers were found; query smoke returned `memory.events.ts`, `MemoryEvent`, `createMemoryEventRecord()`, `recordMemoryEvent()`, `MemoryOrchestrator`, and `AdminView()`.

## Remaining Work

- Add retrieval-context event rows when semantic memory selection is tuned beyond the current interaction/concept write paths.
- Decide whether a local background worker needs retry/dead-letter handling for memory events during beta.
- AWS/cloud synchronization remains out of scope until after beta testing.
