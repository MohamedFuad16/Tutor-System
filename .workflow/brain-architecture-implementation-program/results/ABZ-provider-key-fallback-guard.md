# Packet ABZ Result: Provider-Key Fallback Guard

## Accepted

- `buildCoherentLiveProofFromLedgers()` now requires request-correlated
  `completed` model rows for the coherent provider-key chat and voice bundles.
- Aggregate `buildBrainFlowCoverageFromLedgers()` still accepts fallback model
  rows for general local observability, so offline/fallback behavior remains
  visible without being mistaken for provider-key beta proof.
- Coherent proof summaries now say completed model rows are required and warn
  that fallback model rows do not count for provider-key proof.
- The live beta runbook now asks for a `completed model run` in the typed-chat
  and live-voice proof steps.
- Added a regression test proving fallback model rows can leave aggregate
  brain-flow coverage ready while coherent/provider-key proof remains on watch.

## Rejected

- Treating fallback/offline model rows as proof that provider-key chat or voice
  actually completed.
- Running live OpenRouter, Deepgram, or other provider traffic automatically.
- Changing provider-key storage, exposure, or setup semantics.
- Adding AWS/cloud synchronization.

## Verification

- `npm run format`: passed.
- First `npm run test`: failed because the aggregate coverage helper had been
  tightened accidentally; the patch was corrected so only coherent provider-key
  proof excludes fallback rows.
- Second `npm run format`: passed.
- `npm run test`: passed, 152 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase62-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin Beta
  Diagnostics rendered Local Beta Readiness, Provider-Key Live Proof, Coherent
  Live Proof Bundle, typed-chat and voice bundle labels, the fallback warning,
  no horizontal overflow, and zero console logs.
- Browser screenshots saved as `ABZ-admin-fallback-proof-desktop.png` and
  `ABZ-admin-fallback-proof-mobile.png`; JSON evidence saved as
  `phase62-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1076 nodes, 1900 edges, and 70 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.6 KB`).
- Graphify smoke query found `ProviderKeyProofChecklist`,
  `CoherentLiveProofBundle`, `AdminView()`,
  `buildCoherentLiveProofFromLedgers()`, `buildBetaDiagnosticsSnapshot()`,
  `buildBrainFlowCoverageFromLedgers()`, and `beta.diagnostics.ts`.
- Graphify path `buildCoherentLiveProofFromLedgers()` to
  `buildProviderKeyProofChecklist()` found a two-hop route through
  `beta.diagnostics.ts`.
- Graphify path `buildCoherentLiveProofFromLedgers()` to `AdminView()` found a
  direct call route through `AdminView()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes after regeneration.

## Remaining Risk

- The deliberate provider-key typed-chat and live-voice beta run still needs to
  be executed when live provider traffic is in scope. This packet prevents a
  false green proof before that run.
