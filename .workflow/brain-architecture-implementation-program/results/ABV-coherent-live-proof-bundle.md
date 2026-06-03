# Packet ABV Result: Coherent Live Proof Bundle

## Summary

Packet ABV adds a stricter local beta proof contract. The existing brain-flow
coverage still reports signal coverage, but provider-key proof now also requires
a coherent bundle: one complete typed-chat request and one complete live-voice
request sharing the same local book/thread and multi-PDF context anchors.

Current conservative brain-architecture completion estimate after this slice:
about 88%.

## Implementation

- Added `buildCoherentLiveProofFromLedgers()` in `beta.diagnostics.ts`.
- Added `CoherentLiveProofBundle` and check types.
- Added coherent proof to `BetaDiagnosticsSnapshot`.
- Added coherent proof as a required final live-ledger check in
  `ProviderKeyProofChecklist`.
- Admin Beta Diagnostics now renders a “Coherent live proof bundle” panel with
  chat request, voice request, shared book/thread, shared PDF chips, percent,
  status, and per-check summaries.
- Focused tests now prove both the passing coherent case and the scattered-row
  failure case where aggregate brain-flow coverage is 100% but coherent proof is
  still `watch`.

## Verification

- `npm run format`: passed.
- `npm run test`: passed, 150 tests.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable,
  because `package.json` has no `brain:postchange` script.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at desktop width confirmed Admin Beta Diagnostics renders
  the coherent live proof bundle, same-book/thread copy, missing coherent proof
  state, no-single-chat-request state, no console errors, and no horizontal
  overflow.
- In-app Browser QA at `390x844` confirmed the same coherent proof panel and
  missing-proof state render with no console errors and no horizontal overflow.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1067 nodes, 1886 edges, and 67 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.1 KB`).
- Graphify smoke query found `buildCoherentLiveProofFromLedgers()`,
  `CoherentLiveProofBundle`, `ProviderKeyProofChecklist`, `AdminView()`,
  `buildBetaDiagnosticsSnapshot()`, and `buildProviderKeyProofChecklist()`.
- `graphify path "buildCoherentLiveProofFromLedgers()" "AdminView()"` found a
  one-hop route through `AdminView()`.
- Graphify path from `buildCoherentLiveProofFromLedgers()` to
  `buildProviderKeyProofChecklist()` found a connected route through shared
  beta diagnostics helpers.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed chat and live voice turns when live provider
  traffic is in scope.
- Use the provider-key checklist plus coherent proof bundle to confirm real
  request-correlated chat/voice rows satisfy the complete local beta flow.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains deferred until after beta testing.
