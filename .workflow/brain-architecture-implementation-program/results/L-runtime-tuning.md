# Packet L: Local runtime tuning

## Scope

Add a local, beta-safe tuning surface for the learner-brain runtime. This phase does not implement AWS/cloud behavior.

## Graphify Context

- Graphify routed the slice through `AdminView`, `server.ts`, `ChatPanel`, `SettingsModal`, `src/store/index.ts`, `memory.orchestrator.ts`, and the evidence/tool-job surfaces.
- The directly relevant runtime path is Admin local state -> ChatPanel request body -> `/api/chat` normalized runtime settings -> system activity metadata and chat execution policy.

## Sidecar Audit

- Boyle flagged the risk that a tool iteration limit of `1` could leave a tool call without a final synthesis turn. The implementation clamps the minimum to `2`.
- Boyle flagged that manual-only web search should align model instructions, not only block the tool after the fact. The server now adds per-request runtime tuning instructions.
- Boyle flagged that Admin should distinguish current local settings from server defaults/ranges. The Runtime Tuning tab shows local values; System Activity still shows backend capability metadata.

## Integration Decisions

- Added `src/lib/brainRuntimeSettings.ts` as the shared local settings contract with defaults and normalization.
- Added Zustand/localStorage persistence for `brain_runtime_settings`.
- Added Admin `Runtime Tuning` tab with web policy controls, bounded sliders for tool loops, memory concept limit, activity refresh, reset-to-defaults, and local-only contract notes.
- ChatPanel sends runtime settings and the explicit web-search UI flag with `/api/chat`.
- Server normalizes runtime settings, records the normalized snapshot in system activity metadata, applies the tool iteration budget, and respects manual-only web-search policy.
- Activity polling now uses the configured refresh interval and skips overlapping fetches.

## Verification

- `npm run lint`: passed.
- `npm run test`: passed, 27 tests.
- `npm run build`: passed.
- Browser QA on `http://localhost:3001`: Admin Activity loaded, Runtime Tuning tab rendered, Manual Only policy updated the visible summary, Reset defaults restored the default state, mobile viewport exposed the Tuning tab/content, and browser console warnings/errors were 0.
- Browser screenshot was emitted during QA; saving it to the workflow directory from the browser runtime was blocked by that runtime's filesystem permissions.
- Graphify regenerated from a clean temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke after rebase: 566 nodes, 943 edges, no temp-path markers in checked graph artifacts, and `graphify query "brainRuntimeSettings normalizeBrainRuntimeSettings Runtime Tuning AdminView ChatPanel runtimeSettings toolIterationLimit webSearchPolicy" --budget 1800 --graph graphify-out/graph.json` returned `brainRuntimeSettings.ts`, `normalizeBrainRuntimeSettings()`, `AdminView()`, `ChatPanel.tsx`, and store/runtime-setting nodes.

## Remaining Risks

- `memoryConceptLimit` currently controls active-book concept rows added by ChatPanel, not the broader semantic-memory retrieval performed by `brainOrchestrator`.
- Policy tests do not mock a full streaming model/tool call; current coverage verifies normalization, debug metadata, and blocked-chat propagation without live model calls.
- AWS/cloud synchronization remains deferred until beta testing.
