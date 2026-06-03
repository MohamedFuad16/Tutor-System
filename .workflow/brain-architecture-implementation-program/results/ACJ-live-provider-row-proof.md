# Packet ACJ: Live Provider Row Proof

## Status

Completed through local verification gates.

## Summary

This packet makes coherent provider-key proof stricter about what counts as a
real provider row. Completed model rows remain visible, but the proof now needs
separate provider-ready evidence:

- Typed chat must have a completed OpenRouter-backed model row for the selected
  request.
- Live voice must have a server-side Deepgram `Voice provider ready` activity
  row for the selected voice request.
- The local `Mock voice provider ready` activity row remains visible in Admin
  system activity but does not satisfy provider-key proof.

## Implementation Notes

- Added `providerRows` to coherent live proof request bundles.
- Fed Admin system-activity rows into `buildCoherentLiveProofFromLedgers()`.
- Added the `Real voice provider ready` coherent proof check.
- Added Admin bundle-detail row metrics for provider evidence.
- Added regression coverage for completed/fallback model rows and mock voice
  readiness rows.
- Updated README, Tutor System Architecture, User Brain Architecture, and App
  Design Language copy.

## Verification Evidence

- `npm run format`: passed.
- `npm run test -- tests/beta-diagnostics.test.mjs`: passed via the project
  test runner, 165 tests.
- `npm run test`: passed, 165 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed after the ledger input type was kept honest: provider
  fields are optional input, and only matching real provider fields satisfy the
  provider-ready check.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason skill-preflight`: unavailable because
  `package.json` has no `brain:postchange` script.
- `npm run brain:retrieve -- remaining provider-key live beta proof real
  provider rows chat voice stored injected tool calling both agent layers`:
  unavailable because `package.json` has no `brain:retrieve` script.
- `npm run brain:impact -- src/memory/beta.diagnostics.ts`: unavailable
  because `package.json` has no `brain:impact` script.
- In-app Browser desktop Admin Beta Diagnostics QA confirmed the Provider
  bundle metric, `Provider-ready row` missing-row detail, `Real voice provider
  ready` check, no horizontal overflow at 1280px, and zero warning/error logs.
- In-app Browser mobile Admin Beta Diagnostics QA confirmed the same provider
  proof copy at 390px, no horizontal overflow, and zero warning/error logs.
- In-app Browser App Design Language QA confirmed the `Provider-ready proof`
  Local Beta Control Patterns card at 390px and 1280px, no horizontal overflow,
  and zero warning/error logs.
- Browser screenshot capture timed out in this session, so QA evidence is
  recorded as DOM/copy/overflow/log checks rather than screenshot files.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1129 nodes, 1970 edges, and 63 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`82.7 KB`).
- Graphify smoke query found `isRealVoiceProviderReadyEvent()`,
  `isProviderBackedChatModelRun()`, `buildCoherentLiveProofFromLedgers()`,
  `buildCoherentRequestBundle()`, `AdminView()`, and connected Admin/Revision
  nodes.
- Graphify path `buildCoherentLiveProofFromLedgers()` to `AdminView()` found
  the expected one-hop call edge.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch references.

## Remaining Work

- Run full format/lint/build/browser/Graphify verification.
- Run deliberate provider-key typed chat plus live voice traffic during beta
  with real provider keys.
- Keep AWS/cloud synchronization deferred until after local beta proof.
