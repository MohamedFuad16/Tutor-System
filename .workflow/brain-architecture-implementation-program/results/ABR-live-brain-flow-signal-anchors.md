# Result ABR: Live Brain-Flow Signal Anchors

## Summary

Packet ABR adds live evidence anchors to the thirteen-signal Brain Flow Coverage
contract. Each signal now carries compact request ids, row sources, context PDF
ids, and latest timestamps when the live ledger has proof, and Admin renders
those anchors directly inside the Beta Diagnostics signal cards.

## Accepted Changes

- Added `BetaBrainFlowSignalEvidence` to `beta.diagnostics.ts`.
- Added signal-level evidence collection for context, multi-PDF context,
  request correlation, chat/voice tools, chat/voice evaluated mastery,
  chat/voice transcript persistence, background memory, and model-observation
  gates.
- Updated Admin Brain Flow cards to render live request, source, context-PDF,
  and latest-time chips.
- Updated focused tests so the complete brain-flow fixture proves request ids,
  PDF ids, row sources, and latest timestamps for representative signals.
- Updated User Brain Architecture, Tutor System Architecture, Tutor Architecture
  Library JSON, App Design Language, and README copy to describe live signal
  anchors.

## Verification So Far

- `npm run brain:postchange -- --reason skill-preflight`: unavailable because
  current `package.json` has no `brain:postchange` script.
- Focused beta diagnostics bundle: passed, 12 tests.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 143 tests.
- `npm run build`: passed.
- In-app Browser QA at `1440x1000` confirmed Admin Beta Diagnostics renders
  all 13 `Live anchors` blocks, all 13 empty-live-ledger messages, and the
  chat/voice multi-PDF context signals.
- In-app Browser QA at `390x844` confirmed the same 13 anchor blocks and
  empty-live-ledger messages with `scrollWidth: 390`, `bodyScrollWidth: 390`,
  and no horizontal overflow.
- In-app Browser QA opened Revision > App Design Language > Local Beta Control
  Patterns and confirmed the live request, row-source, timestamp, and
  context-PDF anchor copy with no mobile overflow.
- In-app Browser QA opened Revision > Tutor System Architecture > Analytics
  And Admin and confirmed the live request id, context PDF id, and beta-signal
  proof question copy with no mobile overflow.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because current `package.json` has no `brain:postchange` script.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with `1032` nodes, `1829` edges, and `67` communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`76.9 KB`).
- Graphify smoke query found `BetaBrainFlowSignalEvidence`,
  `buildSignalEvidence()`, `buildBrainFlowCoverageFromLedgers()`,
  `AdminView()`, and connected Beta Diagnostics nodes.
- Graphify path `buildSignalEvidence()` to `AdminView()` found a two-hop route
  through `buildBrainFlowCoverageFromLedgers()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.
