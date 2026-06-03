# Packet ACP Result: Chat/Voice Proof Capture HUD

## Status

Completed through focused source gates, full local test suite, build,
desktop/mobile browser QA, and clean Graphify regeneration/smoke checks.

## Changes

- Added a `readyProofDocuments` memo in `ChatPanel` so the active book's ready,
  extracted PDFs can be counted in the chat/voice proof surface.
- Added a `Live proof capture` HUD above the selected-text chip when
  `activeBetaProofAttemptId` is present.
- The HUD shows the active attempt, active book/project, ready PDF count, chat
  capture, voice capture, OpenRouter local key state, and Deepgram local key
  state.
- Added static regression coverage in
  `tests/voice-proof-attempt-latch.test.mjs` for the HUD gate and proof-capture
  labels.
- Added `phase73-chat-proof-hud-qa.mjs`, which seeds a local active book, two
  ready PDFs, an active proof attempt, and local provider keys, then verifies
  ChatPanel on desktop and mobile.

## Verification

- `npm run format -- src/components/ChatPanel.tsx
tests/voice-proof-attempt-latch.test.mjs`: passed.
- `npm run test -- tests/voice-proof-attempt-latch.test.mjs`: passed through
  the project runner, 168 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 168 tests.
- `APP_URL=http://127.0.0.1:3001 node
.workflow/brain-architecture-implementation-program/packets/phase73-chat-proof-hud-qa.mjs`:
  passed. Desktop and mobile ChatPanel rendered `Live proof capture`, the active
  attempt, active book, ready PDFs, chat capture, voice capture, OpenRouter key
  state, Deepgram key state, no horizontal overflow, and zero console logs after
  filtering Vite dev-server connection noise.
- Browser screenshots were saved as `ACP-chat-proof-hud-desktop.png` and
  `ACP-chat-proof-hud-mobile.png`; JSON evidence was saved as
  `phase73-chat-proof-hud-qa.json`.
- `graphify update . --force` and `npm run graphify:tree`: passed,
  regenerating code architecture artifacts with 1152 nodes, 2008 edges, 72
  communities, and `GRAPH_TREE.html` at 84.1 KB.
- Graphify smoke query confirmed `ChatPanel()`, `ChatPanel.tsx`,
  `AdminView.tsx`, `index.ts`, `beta-diagnostics.test.mjs`, and connected
  proof/store/Admin nodes remain queryable.
- Graphify path checks connected `ChatPanel()` to `recordModelRunEvent()` and
  `buildBrainContextPacket()` through `ChatPanel.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, `/private/tmp`, or
  `codex-runtimes` scratch references.

## Remaining Gap

The HUD proves the live proof run is visibly latched from Admin into Chat/Voice.
It still does not call OpenRouter or Deepgram. Final beta proof still requires a
real typed-chat and live-voice run whose receipt becomes
`sourceKind: local_live_ledger`, `sourceReadyForBeta: true`, and
`betaProofReady: true`.
