# Packet ADB: Provider Traffic Approval Gate

## Status

Completed through source updates, diagnostics contract tests, full verification,
desktop/mobile Browser QA, and regenerated Graphify code-architecture
artifacts.

Current conservative brain-architecture completion estimate: 99%.

## Scope

- Added a local, attempt-scoped approval gate before the final real
  provider-key typed-chat plus live Deepgram voice drill.
- Kept AWS/cloud deployment and real provider traffic out of scope.
- Preserved the final proof requirement: 100% still needs real OpenRouter and
  Deepgram rows bound to one approved proof attempt.

## Implementation

- `src/store/index.ts` now stores `betaProofTrafficApproval` with an attempt id
  and timestamp, and clears it when the proof attempt changes or is cleared.
- `src/memory/beta.diagnostics.ts` now includes `Provider traffic approved` in
  live proof preflight and attempt audit readiness.
- `src/views/AdminView.tsx` renders External provider traffic approval,
  exports approval metadata, and keeps exact proof-prompt handoff disabled until
  approved preflight is ready.
- `src/components/ChatPanel.tsx` shows the approval state in the live proof HUD
  and blocks provider-backed proof chat/voice calls while an active attempt has
  no approval.
- `tests/beta-diagnostics.test.mjs` and
  `tests/voice-proof-attempt-latch.test.mjs` cover the new contract.

## Verification Evidence

- `npm run brain:postchange -- --reason skill-preflight`: failed because
  `package.json` has no `brain:postchange` script.
- `npm run test`: passed, 185 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser desktop Admin QA: proof attempt started, traffic gate moved from
  locked to approved, no horizontal overflow at `1280x720`.
- Browser desktop Chat QA: proof HUD showed `Provider traffic approved`.
- Browser mobile Chat QA at `390x844`: proof HUD showed
  `Provider traffic approved`, no horizontal overflow.
- Browser mobile Admin QA at `390x844`: mobile `Beta` tab showed External
  provider traffic, `traffic approved`, `Revoke approval`, no horizontal
  overflow.
- Screenshots saved under `/private/tmp/learningai-provider-traffic-*.png`.
- `graphify update . --force`: passed, regenerating 1212 nodes, 2079 edges, and
  69 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`87.6 KB`).
- Graph artifact grep found no `server.mjs`, `.tmp-test`,
  `node_modules/.cache`, `/private/tmp`, or `codex-runtimes` references.

## Remaining Work

- Run the real provider-key typed-chat prompt and live Deepgram voice script
  under one approved Admin proof attempt.
- Confirm selected OpenRouter and Deepgram provider captures are real
  local-live rows, not fallback, mock, QA-seeded, or synthetic rows.
- Confirm the final bundle shares proof attempt, book, thread, and multiple PDF
  context ids.
- AWS/cloud synchronization remains deferred until after beta testing.
