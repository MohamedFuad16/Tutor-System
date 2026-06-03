# Packet ACA Result: Coherent Request Bundle Row Detail

## Accepted

- Added `CoherentLiveProofRequestBundle` and
  `buildCoherentRequestBundle()` so coherent live proof now exposes selected
  typed-chat and live-voice bundle internals.
- Each selected request bundle reports row counts for multi-PDF context,
  retrieval, completed model, foreground tool, evaluated mastery, saved
  transcript, and background memory evidence.
- Admin Beta Diagnostics now renders side-by-side selected request row cards
  for typed chat and live voice, including request id, status, PDF/book/thread
  chips, timestamps, and missing-row labels.
- Focused diagnostics tests now assert complete bundle row counts, scattered
  bundle missing rows, and fallback-model missing completed-model rows.

## Rejected

- Changing provider-key proof semantics. The proof still requires the same
  live ledger checks and coherent bundle rules.
- Running live OpenRouter, Deepgram, or other provider traffic automatically.
- Treating fallback/offline rows as completed provider-key evidence.
- Adding AWS/cloud synchronization.

## Verification

- `npm run format`: passed.
- `npm run test`: passed, 152 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase63-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin Beta
  Diagnostics rendered two selected request-row cards, typed-chat and live-voice
  bundle labels, completed-model, transcript, and background row metrics,
  missing-row copy, no horizontal overflow, and zero console logs.
- Browser screenshots saved as `ACA-admin-bundle-rows-desktop.png` and
  `ACA-admin-bundle-rows-mobile.png`; JSON evidence saved as
  `phase63-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1083 nodes, 1911 edges, and 57 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`80.0 KB`).
- Graphify smoke query found `CoherentLiveProofRequestBundle`,
  `buildCoherentRequestBundle()`, `buildCoherentLiveProofFromLedgers()`,
  `AdminView()`, and connected beta diagnostics nodes.
- Graphify path `buildCoherentRequestBundle()` to `AdminView()` found a two-hop
  route through `buildCoherentLiveProofFromLedgers()`.
- Graphify path `CoherentLiveProofRequestBundle` to
  `buildCoherentLiveProofFromLedgers()` found a two-hop route through
  `beta.diagnostics.ts`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes after regeneration.

## Remaining Risk

- This packet makes live proof failures easier to diagnose, but the deliberate
  provider-key typed-chat and live-voice beta run still needs to be executed
  when live provider traffic is in scope.
