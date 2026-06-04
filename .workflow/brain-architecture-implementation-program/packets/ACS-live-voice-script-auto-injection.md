# Packet ACS: Live Voice Script Auto-Injection

## Objective

Remove the remaining double-send friction from the local provider-key voice
proof drill. When Admin loads the live-voice proof script into ChatPanel and the
user presses send while voice is idle, the script should start voice and become
the first injected voice user turn after websocket auth.

## Graphify Routing

- `graphify query "remaining live provider beta proof gap sourceReadyForBeta
betaProofReady local_live_ledger OpenRouter Deepgram ChatPanel AdminView beta
diagnostics proof receipt typed chat voice" --budget 16000 --graph
graphify-out/graph.json`
- `graphify query "recordModelRun recordToolJob recordMemoryEvent
activeBetaProofAttemptId sourceKind local_live_ledger provider-key proof
receipt" --budget 16000 --graph graphify-out/graph.json`
- `graphify query "voice provider ready systemActivityEvents Voice provider
ready recordSystemActivityEvent /api/voice-agent Deepgram websocket server"
--budget 16000 --graph graphify-out/graph.json`
- `graphify query "model_run provider backed chat OpenRouter
recordModelRunEvent server api chat source chat_stream proofAttemptId
requestId" --budget 16000 --graph graphify-out/graph.json`

The graph routed this slice through `ChatPanel.tsx`,
`tests/live-proof-prompt-handoff.test.mjs`,
`tests/voice-proof-attempt-latch.test.mjs`, `beta.diagnostics.ts`,
`AdminView.tsx`, and the server voice-provider readiness path.

## Scope

- Edit `src/components/ChatPanel.tsx`.
- Extend `tests/live-proof-prompt-handoff.test.mjs`.
- Do not call OpenRouter or Deepgram.
- Do not change `server.ts` or beta diagnostic readiness rules.
- Do not start AWS/cloud work.

## Expected Behavior

- A staged `Provider-key voice proof turn` still starts voice instead of sending
  as typed chat while voice is idle.
- The staged script is queued locally.
- After websocket auth is sent, ChatPanel injects the queued script through
  `sendVoiceText(...)`, which records the voice user turn and sends
  `InjectUserMessage`.
- The composer clears only after the queued script is flushed to voice.

## Verification

- `npm run format -- src/components/ChatPanel.tsx
tests/live-proof-prompt-handoff.test.mjs`
- `npm run test -- tests/live-proof-prompt-handoff.test.mjs
tests/voice-proof-attempt-latch.test.mjs`
- Later phase gates: format check, lint, build, browser smoke, Graphify
  regeneration and smoke queries.
