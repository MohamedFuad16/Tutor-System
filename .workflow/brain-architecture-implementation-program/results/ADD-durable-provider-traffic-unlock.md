# Packet ADD: Durable Provider Traffic Unlock

## Status

Completed through source updates, focused and full tests, desktop/mobile
Browser QA, and regenerated Graphify code-architecture artifacts.

Current conservative brain-architecture completion estimate: 99%.

## Scope

- Require the current attempt-scoped approval state and its durable approval
  event together before real provider-backed proof traffic can unlock.
- Keep the approval local, active-attempt scoped, and visible in Admin and the
  ChatPanel proof HUD.
- Keep OpenRouter, Deepgram, microphone, AWS, and cloud deployment traffic out
  of scope for this slice.

## Implementation

- `src/memory/beta.diagnostics.ts` now requires current active-attempt approval
  plus a matching persisted `beta_provider_traffic_approved` event before live
  proof preflight or the attempt audit can unlock provider traffic.
- `src/components/ChatPanel.tsx` watches durable approval rows and blocks
  provider-backed chat or voice proof traffic until the active attempt's row is
  visible, while showing `Approval ledger pending` during the write window.
- `src/views/AdminView.tsx` distinguishes approved, approval saving, approval
  event pending, and locked states. Exact proof prompt handoff remains disabled
  until the durable gate is ready.
- Focused regression tests cover transient approval state, Admin prompt
  disablement, and ChatPanel durable-approval/HUD behavior.

## Verification Evidence

- `npm run brain:postchange -- --reason skill-preflight`: failed because
  `package.json` has no `brain:postchange` script.
- Focused proof tests passed through the project runner, which executed all 187
  tests.
- `npm run format:check`: passed after a narrow Prettier fix.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 187 tests.
- In-app Browser desktop Admin QA showed a fresh active attempt, `traffic
  approved`, and the matching durable `approval event
  memory-event:beta_provider_traffic_approved...` row. Proof handoff stayed
  disabled because required provider-key and multi-PDF evidence was missing.
- Desktop Admin revoke QA immediately changed the gate to `traffic locked`
  while historical approval rows remained visible; both proof handoff buttons
  stayed disabled. Re-approval returned to `traffic approved` after the new
  durable row appeared.
- In-app Browser desktop and mobile Chat QA showed the live proof HUD with
  provider traffic approved and no prompt send or microphone start.
- In-app Browser mobile Admin QA at `390x844` showed the durable approval event,
  disabled chat/voice handoff buttons, and no horizontal overflow
  (`scrollWidth` 390).
- Screenshots:
  - `ADD-durable-approval-admin-desktop.png`
  - `ADD-durable-approval-admin-mobile.png`
  - `ADD-durable-approval-chat-hud-desktop.png`
  - `ADD-durable-approval-chat-hud-mobile.png`
- `graphify update . --force`: passed, regenerating 1217 nodes, 2085 edges, and
  69 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`87.9 KB`).
- Graph artifact grep found no `server.mjs`, `.tmp-test`,
  `node_modules/.cache`, `/private/tmp`, or `codex-runtimes` references.
- Repo-local Graphify CLI query routed the durable approval gate through
  `ChatPanel.tsx`, `AdminView.tsx`, `beta-diagnostics.test.mjs`,
  `live-proof-prompt-handoff.test.mjs`, and connected store/proof surfaces.
- The global Graphify MCP connection remained bound to another repository, so
  the refreshed repo-local CLI graph is the authoritative graph evidence.

## Remaining Work

- Run the real approved OpenRouter typed-chat prompt and live Deepgram voice
  script under one Admin proof attempt.
- Confirm selected OpenRouter and Deepgram captures are real local-live rows,
  not fallback, mock, QA-seeded, or synthetic rows.
- Confirm the final bundle shares proof attempt, book, thread, and multiple PDF
  context ids.
- AWS/cloud synchronization remains deferred until after beta testing.
