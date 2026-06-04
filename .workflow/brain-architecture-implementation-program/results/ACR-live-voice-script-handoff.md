# Packet ACR Result: Live Voice Script Handoff

## Status

Completed through focused source gates, full local test suite, build,
desktop/mobile browser QA, and clean Graphify regeneration/smoke checks.

## Changes

- Admin Beta Diagnostics now exposes `Load voice script` on the live-voice proof
  script after a proof attempt is active.
- The button uses the existing `askTutorQuery` store channel and switches the
  user to Study, matching the typed-chat proof handoff without adding schema.
- ChatPanel recognizes the staged live-voice script, focuses the textarea, and
  marks the proof HUD with `Voice script loaded` and `Start voice first`.
- ChatPanel prevents accidental typed-chat submission of the voice proof script:
  if the script is staged while voice is idle, pressing send starts voice and
  leaves the script in place.
- Extended `tests/live-proof-prompt-handoff.test.mjs` to lock the Admin and
  ChatPanel voice-script handoff contract.
- Added `phase75-live-voice-script-handoff-qa.mjs`, which clicks Admin -> Beta
  Diagnostics -> Start proof attempt -> Load voice script, then verifies the
  real Study/Chat surface.

## Verification

- `npm run format -- src/views/AdminView.tsx src/components/ChatPanel.tsx
tests/live-proof-prompt-handoff.test.mjs tests/voice-proof-attempt-latch.test.mjs`:
  passed.
- `npm run test -- tests/live-proof-prompt-handoff.test.mjs
tests/voice-proof-attempt-latch.test.mjs`: passed through the project runner,
  171 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `APP_URL=http://127.0.0.1:3001 node
.workflow/brain-architecture-implementation-program/packets/phase75-live-voice-script-handoff-qa.mjs`:
  passed. Desktop and mobile clicked Admin, opened Beta Diagnostics, started a
  proof attempt, loaded the live-voice proof script into ChatPanel, and
  confirmed the live proof HUD, active attempt, active book, ready PDFs 2,
  provider key states, `Voice script loaded`, `Start voice first`, focused
  textarea, no horizontal overflow, and zero console logs.
- Browser screenshots were saved as `ACR-live-voice-script-handoff-desktop.png`
  and `ACR-live-voice-script-handoff-mobile.png`; JSON evidence was saved as
  `phase75-live-voice-script-handoff-qa.json`.
- `graphify update . --force` and `npm run graphify:tree`: passed,
  regenerating code architecture artifacts with 1157 nodes, 2012 edges, 64
  communities, and `GRAPH_TREE.html` at 84.4 KB.
- Graphify smoke query confirmed `AdminView()`, `ChatPanel()`,
  `ChatPanel.tsx`, `AdminView.tsx`, `beta.diagnostics.ts`, `index.ts`, and
  connected proof/store/Admin/Chat nodes remain queryable.
- Graphify path checks connected `AdminView()` to `ChatPanel()` through
  `useStore`, and `ChatPanel()` directly to `useStore`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, `/private/tmp`, or
  `codex-runtimes` scratch references.

## Remaining Gap

This handoff prepares the Deepgram live-voice proof script and prevents it from
being accidentally sent through typed chat. It still does not start the real
Deepgram websocket run or send the OpenRouter typed-chat request. Final beta
proof still requires a real typed-chat and live-voice run whose receipt becomes
`sourceKind: local_live_ledger`, `sourceReadyForBeta: true`, and
`betaProofReady: true`.
