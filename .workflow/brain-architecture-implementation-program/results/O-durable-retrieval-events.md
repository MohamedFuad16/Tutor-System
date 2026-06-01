# Packet O: Durable Retrieval Events

## Scope

Implement local durable retrieval observability for semantic memory context selection. This is a local beta slice only; AWS/cloud synchronization remains deferred.

## Graphify Routing

- `graphify query "getRelevantContext retrieval context memory retrieval AdminView longterm.memory Dexie ChatPanel activeBookId pageNumber scoredInteractions scoredConcepts learnerModel context chars retrieval observability" --budget 3500 --graph graphify-out/graph.json`
- `graphify path "AdminView()" ".getRelevantContext()" --graph graphify-out/graph.json`
- `graphify path "ChatPanel()" ".getRelevantContext()" --graph graphify-out/graph.json`

Graphify identified `src/memory/memory.orchestrator.ts`, `src/memory/longterm.memory.ts`, `src/views/AdminView.tsx`, `src/components/ChatPanel.tsx`, and `src/memory/learner.model.ts` as the connected surfaces. Implementation reads stayed within those retrieval/Admin/storage boundaries.

## Implementation

- Added Dexie schema version 11 with append-only `retrievalEvents`.
- Added `src/memory/retrieval.events.ts` for status normalization, stable event IDs, compact query/error fields, deduped selected IDs, numeric clamping, and non-blocking IndexedDB writes.
- Instrumented `MemoryOrchestrator.getRelevantContext()` to record completed and failed retrievals with query summary, active-book/page filters, candidate counts, selected concepts/interactions, scores, context size, latency, and metadata.
- Added Admin `Retrieval Events` navigation, meters, recent retrieval cards, metadata details, and local-only boundary copy.
- Fixed Admin shell horizontal overflow discovered during live browser QA by constraining the main flex container and hiding shell-level x overflow.

## Verification

- `npm run lint`: passed before workflow evidence updates.
- `npm run test`: passed, 39 tests before workflow evidence updates.
- `npm run build`: passed before workflow evidence updates.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: a real ChatPanel prompt without an OpenRouter key still created a completed retrieval event before the blocked model request.
- Admin Retrieval displayed the real query `QA retrieval check: which local memory context would you use?`, completed status, selected/candidate counts, context chars, and retrieval boundary copy.
- Desktop viewport 1280x900: document width matched viewport width after the overflow fix; browser warning/error logs were 0.
- Mobile viewport 390x844: Retrieval tab and ledger rendered, document width matched viewport width, and browser warning/error logs were 0.
- Browser screenshots were emitted during QA. Saving screenshot files into `.workflow/.../results/` was blocked by browser runtime filesystem permissions (`EPERM`).

## Remaining Work

- Add richer retrieval ranking diagnostics once beta usage shows which scores help tune behavior.
- Decide whether failed retrievals need retry/dead-letter state after local beta evidence.
- AWS/cloud synchronization remains out of scope until beta testing.
