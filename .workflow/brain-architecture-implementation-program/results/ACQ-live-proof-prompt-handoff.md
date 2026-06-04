# Packet ACQ Result: Live Proof Prompt Handoff

## Status

Completed through focused source gates, full local test suite, build,
desktop/mobile browser QA, and clean Graphify regeneration/smoke checks.

## Changes

- Admin Beta Diagnostics now exposes `Load in chat` on the typed-chat proof
  prompt after a proof attempt is active.
- The button uses the existing `askTutorQuery` store channel and switches the
  user to Study, avoiding a new schema or provider call.
- StudyView opens ChatPanel when Admin queues a tutor prompt.
- ChatPanel inserts the queued proof prompt, focuses the textarea on the next
  frame, and marks the proof HUD with `Proof prompt loaded`.
- Added `tests/live-proof-prompt-handoff.test.mjs` to lock the Admin,
  StudyView, and ChatPanel handoff contract.
- Added `phase74-live-proof-prompt-handoff-qa.mjs`, which clicks Admin -> Beta
  Diagnostics -> Start proof attempt -> Load in chat, then verifies the real
  Study/Chat surface.

## Verification

- `npm run format -- src/components/ChatPanel.tsx src/views/AdminView.tsx
src/views/StudyView.tsx tests/live-proof-prompt-handoff.test.mjs
tests/voice-proof-attempt-latch.test.mjs`: passed.
- `npm run test -- tests/live-proof-prompt-handoff.test.mjs
tests/voice-proof-attempt-latch.test.mjs`: passed through the project runner,
  171 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `APP_URL=http://127.0.0.1:3001 node
.workflow/brain-architecture-implementation-program/packets/phase74-live-proof-prompt-handoff-qa.mjs`:
  passed. Desktop and mobile clicked Admin, opened Beta Diagnostics, started a
  proof attempt, loaded the typed proof prompt into ChatPanel, and confirmed the
  live proof HUD, active attempt, active book, ready PDFs 2, provider key
  states, `Proof prompt loaded`, focused textarea, no horizontal overflow, and
  zero console logs.
- Browser screenshots were saved as
  `ACQ-live-proof-prompt-handoff-desktop.png` and
  `ACQ-live-proof-prompt-handoff-mobile.png`; JSON evidence was saved as
  `phase74-live-proof-prompt-handoff-qa.json`.
- `graphify update . --force` and `npm run graphify:tree`: passed,
  regenerating code architecture artifacts with 1157 nodes, 2012 edges, 64
  communities, and `GRAPH_TREE.html` at 84.4 KB.
- Graphify smoke query confirmed `ChatPanel()`, `StudyView()`,
  `AdminView.tsx`, `StudyView.tsx`, `ChatPanel.tsx`, `index.ts`, and connected
  store/Admin/Study/Chat nodes remain queryable.
- Graphify path checks connected `AdminView()` to `ChatPanel()` through
  `useStore`, and `AdminView()` to `StudyView()` through
  `useMotionPreference()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, `/private/tmp`, or
  `codex-runtimes` scratch references.

## Remaining Gap

This handoff prepares the typed-chat provider proof turn and makes it hard to
run against the wrong book or missing attempt. It still does not send the real
OpenRouter request or run the Deepgram live-voice turn. Final beta proof still
requires a real typed-chat and live-voice run whose receipt becomes
`sourceKind: local_live_ledger`, `sourceReadyForBeta: true`, and
`betaProofReady: true`.
