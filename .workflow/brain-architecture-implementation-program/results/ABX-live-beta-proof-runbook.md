# Packet ABX Result: Live Beta Proof Runbook

## Accepted

- Added `LiveBetaProofRunbook` and `buildLiveBetaProofRunbook()` in
  `src/memory/beta.diagnostics.ts`.
- `ProviderKeyProofChecklist` now carries a runbook derived from the same proof
  checks as the existing Admin Provider-Key Live Proof panel.
- Admin Beta Diagnostics now renders a six-step manual runbook:
  provider-key setup, one multi-PDF active book, typed-chat proof, live-voice
  proof, background memory/gates, and coherent bundle export.
- Each runbook step shows status, action, evidence needed, missing proof
  blockers, and request/PDF anchors when present.
- Diagnostics export metadata now includes provider-key proof status and the
  runbook, but no provider key values.
- Focused tests cover missing-key setup, complete proof readiness, and scattered
  aggregate rows that still fail at the coherent bundle step.

## Rejected

- Running provider-key chat/voice traffic automatically. This packet creates
  the manual runbook and proof surface only.
- Adding AWS/cloud synchronization. It remains deferred until after local beta.

## Verification

- `npm run format`: passed.
- Direct `node --test tests/beta-diagnostics.test.mjs`: unavailable because the
  project test harness must first generate `.tmp-test/*`.
- `npm run test`: passed, 151 tests.
- `npm run format:check`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser desktop QA on `http://localhost:3100` confirmed Admin Beta
  Diagnostics renders the live beta runbook, all six ordered steps, setup/next
  status, local-only chip, no horizontal overflow, and zero console logs.
- `node .workflow/brain-architecture-implementation-program/packets/phase60-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin rendered
  Local Beta Readiness, Live beta runbook, manual/setup status, all six runbook
  steps, local-only copy, no horizontal overflow, and zero console logs.
- Browser screenshots saved as `ABX-admin-runbook-desktop.png` and
  `ABX-admin-runbook-mobile.png`; JSON evidence saved as
  `phase60-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1075 nodes, 1899 edges, and 55 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.6 KB`).
- Graphify smoke query found `buildLiveBetaProofRunbook()`,
  `LiveBetaProofRunbook`, `ProviderKeyProofChecklist`,
  `buildProviderKeyProofChecklist()`, `beta.diagnostics.ts`, and
  `AdminView.tsx`.
- Graphify path `buildLiveBetaProofRunbook()` to `AdminView()` found a
  connected route through `beta.diagnostics.ts` and Admin's beta diagnostics
  calls.
- Graphify path `buildLiveBetaProofRunbook()` to
  `buildProviderKeyProofChecklist()` found the expected one-hop connection.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Risk

- This runbook is a local operational guide and proof surface. The remaining
  live beta step is still to run deliberate provider-key typed-chat and
  live-voice turns, then verify that real request-correlated ledger rows satisfy
  the runbook and coherent bundle.
