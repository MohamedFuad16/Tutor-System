# Packet YY: Request-Correlated Background Memory

## Outcome

Completed.

Background learner-memory writes now carry request metadata from the foreground
chat or live voice request. Admin request timelines can group the foreground
context/model/tool rows with MemoryOrchestrator interaction, learning-book, and
graph update rows.

## Implementation

- Added request tracing fields to `LearningBookUpdateInput`,
  `trackInteraction()` context, `ConversationInteraction`, and graph concept
  update context.
- Typed chat now passes `chatRequestId`, `mode: "chat"`, and
  `agentLayer: "chat_stream"` into interaction, learning-book, and graph update
  writes.
- Live voice now passes the voice session id, `mode: "voice"`, and
  `agentLayer: "voice_realtime"` into interaction, learning-book, and
  `update_graph` tool writes.
- `MemoryOrchestrator` writes request trace metadata into memory events,
  model-summary evidence metadata, generated-note artifact metadata, and stored
  interaction rows.
- Beta Diagnostics now requires request-correlated chat and voice background
  memory rows before the background memory signal is ready.
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and the App Design Language book copy now describe
  the request-correlated memory boundary.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- Targeted workflow Prettier check: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 103 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA:
  - Desktop Admin Beta rendered request-correlated memory copy with
    `scrollWidth` 1440.
  - Mobile Admin Beta rendered request-correlated memory copy with
    `scrollWidth` 390.
  - Desktop App Design book rendered the request-correlated memory pattern with
    `scrollWidth` 1440.
  - Screenshots saved as `YY-cdp-admin-beta-request-memory-desktop.png`,
    `YY-cdp-admin-beta-request-memory-mobile.png`, and
    `YY-cdp-app-design-request-memory.png`.
- `graphify update . --force`: regenerated code architecture artifacts with
  891 nodes, 1535 edges, and 57 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `MemoryOrchestrator`, `ChatPanel()`,
  `memoryTraceMetadata()`, `buildBrainFlowCoverageFromLedgers()`,
  `AdminView()`, and request-correlation ledger types.
- `graphify path "buildBrainFlowCoverageFromLedgers()" "AdminView()"` found a
  direct call edge.
- `graphify path "memoryTraceMetadata()" "ChatPanel()"` found a three-hop path
  through `memory.orchestrator.ts` and `StudyView.tsx`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Notes

- Read-only sidecar Peirce did not return before integration and no sidecar
  changes were merged.
- AWS/cloud synchronization remains out of scope until beta testing.
