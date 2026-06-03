# Packet ABT: Provider-Key Live Proof Checklist

## Objective

Move the brain architecture program one step closer to real beta proof by adding
a local Admin checklist for deliberate provider-key chat and voice runs.

The slice must not call providers automatically and must not treat synthetic
rehearsal rows as live beta evidence.

## Graphify Routing

- Graphify routed the next live-proof corridor through `ChatPanel.tsx`,
  `server.ts`, `AdminView.tsx`, `brain.rehearsal.ts`,
  `beta.diagnostics.ts`, and the chat/voice tool tests.
- Direct source inspection stayed scoped to those routed files and connected
  diagnostics tests.

## Write Scope

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` after explicit regeneration

## Implementation Notes

- Add `buildProviderKeyProofChecklist()` as a pure local diagnostic helper.
- Treat chat-model and realtime-voice key presence as booleans only; never
  expose key values.
- Derive live-proof checklist rows from the existing brain-flow ledger signals.
- Keep `canAttemptProviderKeyRun` separate from `proofComplete`.
- Render the checklist in Admin Beta Diagnostics alongside live coverage and
  synthetic rehearsal.
- Rename the synthetic rehearsal badge from provider-key ready to preflight
  ready so the UI does not imply live provider traffic has happened.

## Out Of Scope

- No AWS/cloud synchronization.
- No automatic live provider calls.
- No mutation of live ledger coverage from synthetic rehearsal.
