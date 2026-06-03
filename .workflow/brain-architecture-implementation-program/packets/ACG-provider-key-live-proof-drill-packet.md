Packet ID: ACG
Objective: Make the provider-key live beta proof run executable from Admin without auto-calling providers.
Status: completed

## Context

Graphify routed this slice through `buildProviderKeyProofChecklist()`,
`buildLiveBetaProofRunbook()`, `buildCoherentLiveProofFromLedgers()`,
`AdminView()`, and `tests/beta-diagnostics.test.mjs`. The previous slices
already separated provider-key setup from complete live proof and exposed an
ordered runbook, but the operator still had to infer the exact typed-chat and
live-voice prompts plus the ledger rows each turn should create.

## Changes

- Added `LiveBetaProofDrillPacket` and prompt-level drill metadata to
  `src/memory/beta.diagnostics.ts`.
- The provider-key checklist now returns a local-only drill packet with setup
  checklist, run sequence, blockers, export instructions, and exact typed-chat
  plus live-voice proof prompts.
- The drill packet remains manual: it does not call the chat model, start voice,
  or touch AWS/cloud.
- Admin Beta Diagnostics now renders a "Live proof drill packet" panel between
  the ordered runbook and coherent bundle evidence.
- The local diagnostics export metadata now includes the same drill packet so
  beta evidence reviewers see the prompts and expected rows used for the run.
- Diagnostics tests now assert missing keys block the packet, complete proof
  exposes chat/voice prompts and expected rows, and blocked ledger rows keep the
  drill blocked.

## Verification

- `graphify query "provider-key live proof drill packet AdminView beta diagnostics runbook chat voice prompt expected rows" --budget 5000 --graph graphify-out/graph.json`: routed the slice to `src/memory/beta.diagnostics.ts`, `src/views/AdminView.tsx`, and `tests/beta-diagnostics.test.mjs`.
- `npm run format`: passed.
- `npm run test`: passed, 161 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase69-browser-qa.mjs`: passed with local Chrome CDP approval after the sandboxed first attempt could not connect to `127.0.0.1:9342`. Desktop and mobile Admin rendered the drill packet, exact chat/voice prompts, expected rows, local-only/cloud boundary, and export instructions with no horizontal overflow and zero warning/error logs. Desktop and mobile App Design Language rendered the new provider-key drill packet control pattern with no horizontal overflow and zero warning/error logs.
- Browser QA screenshots saved as `ACG-admin-drill-packet-desktop.png`, `ACG-admin-drill-packet-mobile.png`, `ACG-app-design-drill-packet-desktop.png`, and `ACG-app-design-drill-packet-mobile.png`; JSON evidence saved as `phase69-browser-qa.json`.
- `graphify update . --force`: regenerated code architecture artifacts with 1114 nodes, 1953 edges, and 66 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html` at 81.8 KB.
- Graphify smoke query found `LiveBetaProofDrillPacket`, `buildLiveBetaProofDrillPacket()`, `buildProviderKeyProofChecklist()`, `AdminView()`, and connected diagnostics nodes.
- Graphify path `buildLiveBetaProofDrillPacket()` to `AdminView()` found a three-hop route through `buildProviderKeyProofChecklist()` and `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp` scratch nodes.

## Remaining Work

- Real deliberate provider-key typed-chat plus live-voice beta traffic remains
  the largest unproven local gap; AWS/cloud synchronization stays deferred.
