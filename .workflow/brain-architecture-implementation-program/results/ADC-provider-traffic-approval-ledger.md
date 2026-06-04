# Packet ADC: Provider Traffic Approval Ledger

## Status

Completed through source updates, diagnostics and memory-event tests, full
verification, desktop/mobile Browser QA, and regenerated Graphify
code-architecture artifacts.

Current conservative brain-architecture completion estimate: 99%.

## Scope

- Record the Admin provider-traffic approval decision as durable local evidence
  rather than only transient UI/store state.
- Keep the approval attempt-scoped and local.
- Require a durable approval lifecycle row before final coherent
  provider-key proof can pass.
- Keep OpenRouter, Deepgram, microphone, AWS, and cloud deployment traffic out
  of scope for this slice.

## Implementation

- `src/memory/longterm.memory.ts` now preserves
  `beta_provider_traffic_approved` and
  `beta_provider_traffic_approval_cleared` event types.
- `src/views/AdminView.tsx` records approval and approval-cleared lifecycle rows
  against the active proof attempt, then renders compact approval event chips in
  the External provider traffic panel.
- `src/memory/beta.diagnostics.ts` exposes
  `providerTrafficApprovalEventIds` in live proof preflight and attempt audit,
  lets matching durable approval rows satisfy active-attempt approval evidence,
  and requires `Provider traffic approval recorded` for coherent local-live
  provider-key proof.
- `tests/beta-diagnostics.test.mjs` verifies approval-ledger success and the
  missing-approval failure path.
- `tests/memory-events.test.mjs` verifies the new approval lifecycle event
  types are preserved.

## Verification Evidence

- `npm run brain:postchange -- --reason skill-preflight`: failed because
  `package.json` has no `brain:postchange` script.
- `npm run test -- tests/beta-diagnostics.test.mjs
  tests/memory-events.test.mjs`: passed through the project runner with 187
  tests.
- `npm run format:check`: initially found touched-file formatting; narrow
  Prettier write fixed it.
- `npm run format:check`: passed after formatting.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test`: passed after formatting, 187 tests.
- Browser desktop Admin QA: proof attempt started, provider traffic approved,
  `approval event memory-event:beta_provider_traffic_approved...` appeared, and
  desktop width stayed at `1280`.
- Browser mobile Admin QA at `390x844`: approved state and approval event chip
  appeared with no horizontal overflow (`scrollWidth` 390).
- Screenshots:
  - `ADC-admin-approval-ledger-desktop.png`
  - `ADC-admin-approval-ledger-mobile.png`
- `graphify update . --force`: passed, regenerating 1215 nodes, 2082 edges, and
  78 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`87.8 KB`).
- Graph artifact grep found no `server.mjs`, `.tmp-test`,
  `node_modules/.cache`, `/private/tmp`, or `codex-runtimes` references.
- Graphify query routed the approval-ledger proof through `AdminView.tsx`,
  `beta.diagnostics.ts`, `tests/beta-diagnostics.test.mjs`, and connected
  proof/store/Admin/Chat surfaces.

## Remaining Work

- Run the real approved provider-key typed-chat prompt and live Deepgram voice
  script under one Admin proof attempt.
- Confirm selected OpenRouter and Deepgram provider captures are real
  local-live rows, not fallback, mock, QA-seeded, or synthetic rows.
- Confirm the final bundle shares proof attempt, book, thread, and multiple PDF
  context ids.
- AWS/cloud synchronization remains deferred until after beta testing.
