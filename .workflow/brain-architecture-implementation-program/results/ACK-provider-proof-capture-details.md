# Packet ACK: Provider Proof Capture Details

## Status

Completed through local verification gates.

## Summary

This packet extends coherent live proof request bundles with compact provider
capture details. The new data explains which real provider row satisfied the
selected request bundle:

- typed chat captures the OpenRouter provider/model row;
- live voice captures the Deepgram `Voice provider ready` server activity row.

The packet does not call providers, store key values, or treat fallback/mock
rows as provider-key proof.

## Implementation Notes

- Added `CoherentLiveProofProviderCapture`.
- Added `providerCaptures` to coherent request bundles.
- Admin Beta Diagnostics now renders provider capture chips with provider,
  model/phase, request id, timestamp, proof attempt id, and capture source.
- `tests/beta-diagnostics.test.mjs` now verifies ready captures, fallback chat
  rejection, and mock voice-provider rejection.

## Verification Evidence

- `npm run format`: passed, no extra formatting changes.
- `npm run test -- tests/beta-diagnostics.test.mjs`: passed via the project
  test runner, 165 tests.
- `npm run test`: passed, 165 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `node --check .workflow/brain-architecture-implementation-program/packets/phase71-browser-qa.mjs`:
  passed.
- In-app Browser desktop Admin QA confirmed Beta Diagnostics rendered the
  Provider-Key Live Proof section, Provider rows, Missing rows, Real voice
  provider ready copy, no horizontal overflow at 1280px, and zero warning/error
  logs. This existing local database did not contain provider rows, so capture
  cards correctly did not render there.
- Headless Chrome CDP QA via `phase71-browser-qa.mjs` seeded a local-only
  provider proof dataset and confirmed desktop and mobile Admin Beta
  Diagnostics rendered the OpenRouter model capture, Deepgram voice provider
  ready capture, provider capture source chips, selected chat/voice request ids,
  proof attempt id, ready 100% bundle state, no horizontal overflow, and zero
  warning/error logs.
- Browser QA screenshots saved as `ACK-admin-provider-captures-desktop.png` and
  `ACK-admin-provider-captures-mobile.png`; JSON evidence saved as
  `phase71-browser-qa.json`.
- `npm run brain:postchange -- --reason skill-preflight`: unavailable because
  `package.json` has no `brain:postchange` script.
- `npm run brain:retrieve -- remaining provider-key live beta proof real
  provider rows chat voice stored injected tool calling both agent layers`:
  unavailable because `package.json` has no `brain:retrieve` script.
- `npm run brain:impact -- src/memory/beta.diagnostics.ts`: unavailable
  because `package.json` has no `brain:impact` script.
- `graphify update . --force`: initially regenerated after browser QA, but the
  temporary dev server had produced `server.mjs`; scratch grep caught it.
- Removed generated `server.mjs` and `.tmp-test`, moved stale `graphify-out`
  aside, and reran `graphify update . --force`: passed, regenerating clean
  code architecture artifacts with 1132 nodes, 1975 edges, and 68 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`82.9 KB`).
- Graphify smoke query found `CoherentLiveProofProviderCapture`,
  `buildProviderCapture()`, `buildCoherentRequestBundle()`,
  `buildCoherentLiveProofFromLedgers()`, `AdminView()`, and connected
  diagnostics/Admin nodes.
- Graphify path `buildProviderCapture` to `AdminView` found a three-hop route
  through `beta.diagnostics.ts` and `buildCoherentLiveProofFromLedgers()`.
- Graphify path `buildCoherentLiveProofFromLedgers` to `AdminView` found the
  expected one-hop call route.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch references after the clean rebuild.

## Remaining Work

- Run the deliberate live provider-key beta drill with real OpenRouter and
  Deepgram traffic to record non-seeded provider rows.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- Keep AWS/cloud synchronization deferred until after local beta proof.
