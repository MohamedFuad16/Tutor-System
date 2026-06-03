# Packet ACC Result: Live Proof Freshness Window

## Accepted

- Added `COHERENT_LIVE_PROOF_MAX_WINDOW_MS` and
  `COHERENT_LIVE_PROOF_MAX_AGE_MS` as local proof-quality limits.
- `buildCoherentLiveProofFromLedgers()` now reports proof-window duration,
  proof age, oldest/latest selected proof timestamps, `proofWindowReady`, and
  `proofFresh`.
- Coherent live proof now includes a `Fresh live proof window` check, so
  complete old rows or rows spread outside one local run stay on watch.
- Admin Beta Diagnostics now passes the diagnostic snapshot time into coherent
  proof and renders proof fresh/stale plus proof-window chips.
- Focused tests prove complete fresh rows pass, stale rows fail freshness,
  wide chat/voice windows fail, and provider-key proof stays incomplete when
  the coherent bundle is stale.

## Rejected

- Running live OpenRouter, Deepgram, or other provider traffic automatically.
- Treating historical local rows as current beta proof.
- Adding AWS/cloud synchronization.
- Adding Dexie schema churn for derived proof metadata.

## Verification

- `npm run format`: passed.
- `npm run test`: passed, 155 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase65-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin Beta
  Diagnostics rendered the deliberate beta-run checklist, Fresh live proof
  window check, stale proof state, stale proof summary, QA chat/voice request
  ids, proof-window chip, no horizontal overflow, and zero console logs.
- Browser screenshots saved as `ACC-admin-proof-freshness-desktop.png` and
  `ACC-admin-proof-freshness-mobile.png`; JSON evidence saved as
  `phase65-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1099 nodes, 1934 edges, and 57 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`80.9 KB`).
- Graphify smoke query found `buildCoherentLiveProofFromLedgers()`,
  `timestampsFromAnchors()`, `proofWindowSummary()`,
  `formatDurationMinutes()`, `buildProviderKeyProofChecklist()`, and
  `AdminView()`.
- Graphify path `proofWindowSummary()` to `AdminView()` found a two-hop route
  through `buildCoherentLiveProofFromLedgers()`.
- Graphify path `buildCoherentLiveProofFromLedgers()` to `AdminView()` found a
  direct call route.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes after regeneration.

## Remaining Risk

- The deliberate provider-key typed-chat and live-voice beta run still needs to
  be executed when live provider traffic is in scope. This packet prevents old
  ledger rows from making that final run look complete before it actually
  happens.
