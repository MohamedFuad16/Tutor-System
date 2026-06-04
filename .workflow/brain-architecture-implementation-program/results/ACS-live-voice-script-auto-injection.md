# Packet ACS Result: Live Voice Script Auto-Injection

## Accepted

- Added `pendingVoiceProofScriptRef` in `ChatPanel`.
- When the loaded voice proof script is submitted while voice is idle, ChatPanel
  queues the current text and starts voice.
- After websocket auth sends the voice session id, proof attempt id, provider
  keys, and multi-PDF study context, ChatPanel flushes the queued script through
  `sendVoiceText(...)` and clears the composer.
- Existing voice proof attempt latching remains intact; the queued script uses
  the same voice session and proof attempt identity.

## Rejected

- No automatic provider calls were added from Admin.
- No mock or seeded row was promoted to beta proof.
- No AWS/cloud behavior was added.

## Verification So Far

- `npm run format -- src/components/ChatPanel.tsx
tests/live-proof-prompt-handoff.test.mjs`: passed.
- `npm run test -- tests/live-proof-prompt-handoff.test.mjs
tests/voice-proof-attempt-latch.test.mjs`: passed through the project runner,
  171 tests.

## Remaining For Final Gates

- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser smoke of the Admin-to-Chat proof surface.
- Graphify regeneration and smoke query/path checks.

## Progress

Conservative brain architecture completion remains about 99%. This slice makes
the real local-live voice drill easier to execute correctly, but the final proof
still requires real OpenRouter typed chat plus Deepgram live voice rows that
produce `sourceKind: local_live_ledger`, `sourceReadyForBeta: true`, and
`betaProofReady: true`.
