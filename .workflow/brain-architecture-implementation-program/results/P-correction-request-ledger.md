# Packet P: Correction Request Ledger

## Scope

Implement the first local memory-control slice: an append-only correction/deletion request ledger and Admin controls that let beta users mark learner-brain records wrong or request deletion review. This phase records intent and auditability only; destructive propagation remains deferred to later local slices.

## Graphify Routing

- `graphify query "userBrainArchitectureBook implementation milestones remaining durable observability memory retrieval correction deletion propagation privacy export local beta diagnostics Admin" --budget 5000 --graph graphify-out/graph.json`
- `graphify query "correction deletion delete remove mark wrong supersede memory control MemoryEvent PersistentConcept ConversationInteraction LearningBookConcept AdminView" --budget 4500 --graph graphify-out/graph.json`
- `graphify path "AdminView()" "MemoryEvent" --graph graphify-out/graph.json`
- `graphify path "AdminView()" "db" --graph graphify-out/graph.json`

The MCP graph looked stale, so the local `graphify-out/graph.json` CLI was used as the authoritative repository graph.

## Sidecar Notes

- Kuhn recommended durable source artifact and citation states as a strong next slice.
- Anscombe recommended a non-destructive Beta Diagnostics/export tab as a safe next slice.
- This phase accepted the correction/deletion path because the architecture book explicitly treats memory correction/deletion propagation as a launch gate. Artifact/citation state and beta diagnostics remain good follow-up candidates.

## Implementation

- Added Dexie schema version 12 with append-only `correctionEvents`.
- Added `src/memory/correction.events.ts` for status/action/target normalization, stable IDs, compact fields, related-id dedupe, and non-blocking IndexedDB writes.
- Added Admin `Correction Requests` navigation and mobile tab entry.
- Added memory-event row actions: `Mark wrong` and `Request deletion`, both writing durable correction requests.
- Added a manual Admin request form for any local learner-brain target id.
- Added correction meters, recent request cards, target mix, and boundary copy that explicitly says this phase does not destructively delete learner data.

## Verification

- `npm run lint`: passed.
- `npm run test`: passed, 43 tests.
- `npm run build`: passed.
- Browser QA on `http://127.0.0.1:3100`: Memory Events quick action recorded a correction request; the Corrections tab displayed it; the manual form recorded another local request.
- Desktop viewport 1280x900: document width matched viewport width and browser warning/error logs were 0.
- Mobile viewport 390x844: Correction Requests rendered with document width matching viewport width and browser warning/error logs were 0.
- `npm run format:check`: expected to keep failing only on pre-existing `src/views/RevisionView.tsx`.

## Remaining Work

- Propagate correction/deletion state into derived summaries, embeddings, graph facts, mastery deltas, tutor preferences, and exports where practical.
- Add artifact/citation state ledgers and beta diagnostics/export as follow-up slices.
- AWS/cloud synchronization remains out of scope until beta testing.
