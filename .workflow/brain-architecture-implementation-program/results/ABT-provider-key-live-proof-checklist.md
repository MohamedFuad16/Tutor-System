# Result ABT: Provider-Key Live Proof Checklist

## Summary

Packet ABT adds a local provider-key live proof checklist to Admin Beta
Diagnostics. The checklist tells the beta operator whether chat and voice keys
are configured, whether a live run can be attempted, and which request-correlated
chat/voice ledger proofs are still missing.

The slice keeps provider keys redacted and does not call any external provider.
Live proof remains separate from synthetic local rehearsal.

## Implemented

- Added `ProviderKeyProofChecklist` and `buildProviderKeyProofChecklist()` in
  `src/memory/beta.diagnostics.ts`.
- Added 15 proof checks: two provider-key setup checks and thirteen live ledger
  checks mapped to existing brain-flow signals.
- Added focused tests for empty ledgers, complete ledgers, missing keys, and
  blocked live rows.
- Added an Admin Beta Diagnostics section with proof percent, key/setup badges,
  live coverage percent, missing proof list, and per-check action text.
- Changed the synthetic rehearsal live-gap badge from `provider-key ready` to
  `preflight ready`.

## Verification

- `npm run format`: passed.
- `npm run test`: passed, 146 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at `1440x1000` confirmed the Provider-Key Live Proof panel,
  deliberate beta-run checklist copy, no-provider-call copy, key/setup status,
  typed-chat multi-PDF proof, live-voice transcript proof, missing proof list,
  and `scrollWidth: 1440`.
- In-app Browser QA at `390x844` confirmed the same provider-key proof panel and
  missing-proof checklist with `scrollWidth: 390`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with `1050` nodes, `1855` edges, and `59` communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`78.0 KB`).
- Graphify smoke query found `buildProviderKeyProofChecklist()`,
  `ProviderKeyProofChecklist`, `beta.diagnostics.ts`, `AdminView.tsx`, and
  `beta-diagnostics.test.mjs`.
- Graphify path `buildProviderKeyProofChecklist()` to `AdminView()` found a
  two-hop route through `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.
- Screenshots:
  - `results/ABT-iab-admin-provider-key-desktop.png`
  - `results/ABT-iab-admin-provider-key-mobile.png`

## Remaining Work

- Run deliberate provider-key chat and voice turns only when live provider
  traffic is in scope.
- Use the checklist to confirm real ledger rows satisfy all chat, voice, tool,
  mastery, transcript, background-memory, and evidence-gate proof checks.
- AWS/cloud synchronization remains deferred until after beta testing.
