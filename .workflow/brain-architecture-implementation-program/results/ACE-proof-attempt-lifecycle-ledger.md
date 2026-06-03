# Packet ACE Result: Proof Attempt Lifecycle Ledger

## Accepted

- Added durable local memory-event types for `beta_proof_attempt_started` and
  `beta_proof_attempt_cleared`.
- Admin Beta Diagnostics now records lifecycle rows whenever the user starts,
  restarts, or clears a local proof attempt.
- Coherent live proof now requires both a shared chat/voice proof-attempt id and
  a matching local Admin start event in the memory ledger.
- Admin Provider-Key Live Proof now shows an `attempt start recorded/missing`
  chip beside active/shared attempt state.
- Docs and built-in book copy now describe proof attempts as durable lifecycle
  rows plus propagated chat/voice metadata, not only localStorage state.

## Rejected

- Calling live model or voice providers automatically.
- Adding AWS/cloud proof-attempt storage.
- Adding Dexie schema churn; lifecycle events reuse the existing `memoryEvents`
  table.
- Treating a matching arbitrary proof-attempt string as complete proof when no
  Admin start row exists.

## Verification

- `npm run format`: passed.
- `npm run test -- tests/beta-diagnostics.test.mjs tests/memory-events.test.mjs`:
  passed via the project test runner, 158 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase67-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin Beta
  Diagnostics clicked Start proof attempt and Clear attempt, verified matching
  `beta_proof_attempt_started` and `beta_proof_attempt_cleared` IndexedDB
  memory rows for the active id, rendered the checklist without horizontal
  overflow, and emitted zero console logs.
- Browser screenshots saved as `ACE-admin-proof-lifecycle-desktop.png` and
  `ACE-admin-proof-lifecycle-mobile.png`; JSON evidence saved as
  `phase67-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1105 nodes, 1943 edges, and 58 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`81.3 KB`).
- Graphify smoke query found `AdminView()`, `recordMemoryEvent()`,
  `memory.events.ts`, `buildCoherentLiveProofFromLedgers()`,
  `buildBetaDiagnosticsSnapshot()`, `buildBrainFlowCoverageFromLedgers()`,
  `AdminView.tsx`, `beta.diagnostics.ts`, and `longterm.memory.ts`.
- Graphify path `AdminView()` to `recordMemoryEvent()` found the expected route
  through `AdminView.tsx`.
- Graphify path `buildCoherentLiveProofFromLedgers()` to `AdminView()` found a
  direct call route.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes after regeneration.

## Remaining Risk

- The deliberate provider-key typed-chat and live-voice beta run still needs to
  be executed when live provider traffic is in scope. This packet gives that
  run a durable local start/clear trail, but does not call providers itself.
