# Packet ABP Result: Rehearsal Live-Gap Proof Surface

## Summary

Packet ABP turns the existing local brain wiring rehearsal into an actionable
Admin proof surface. The rehearsal still writes no durable rows and does not
raise live beta readiness, but after it runs Admin now shows the live ledger gap,
provider-key readiness, rehearsed request IDs, multi-PDF context IDs, and chat
versus voice tool contracts.

## Implemented

- Added `BrainWiringRehearsalGap` and
  `summarizeBrainWiringRehearsalGap()` in `brain.rehearsal.ts`.
- Added `chatRequestId` and `voiceRequestId` to rehearsal results.
- Added a test proving synthetic coverage and live ledger coverage stay
  separate.
- Updated Admin Diagnostics rehearsal copy from nine-signal to eleven-signal.
- Added an Admin `Live beta gap` panel after rehearsal, including synthetic
  coverage, live coverage, provider-key readiness, and missing live signals.
- Added an Admin `Rehearsed contracts` panel with chat/voice request IDs,
  context PDFs, and chat/voice tool chips.

## Verification

- `npm run format`: passed.
- `npm run lint`: passed.
- Focused `node --test tests/brain-rehearsal.test.mjs`: passed, 4 tests.
- `npm run test`: passed, 142 tests.
- `npm run build`: passed.
- Browser QA at `390x844` clicked Admin Diagnostics `Run local rehearsal` and
  confirmed live beta gap, provider-key ready, rehearsed contracts, chat tools,
  voice tools, request IDs, context PDF IDs, eleven-signal copy, and
  `horizontalOverflow: 0`.
- Browser QA at `1440x900` confirmed the same Admin Diagnostics rehearsal
  surface with `horizontalOverflow: 0`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1021 nodes, 1813 edges, and 63 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `summarizeBrainWiringRehearsalGap()`,
  `BrainWiringRehearsalGap`, `runLocalBrainWiringRehearsal()`, and
  `AdminView()`.
- `graphify path "summarizeBrainWiringRehearsalGap()" "AdminView()"` found a
  two-hop route through `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when live provider spend is
  in scope.
- Use the new Admin live-gap panel to confirm real chat/voice traffic fills the
  remaining live ledger signals.
- AWS/cloud synchronization remains deferred until local beta proof is stronger.
