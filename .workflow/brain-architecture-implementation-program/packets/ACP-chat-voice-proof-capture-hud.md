# Packet ACP: Chat/Voice Proof Capture HUD

## Objective

Add a local ChatPanel proof-capture HUD for deliberate provider-key beta proof
attempts. When Admin has an active proof attempt selected, the chat/voice
surface should make the active attempt, active book, ready PDF context, chat
capture, voice capture, and local provider-key readiness visible before the user
runs real OpenRouter or Deepgram traffic.

## Graphify Route

- `graphify query "ChatPanel activeBetaProofAttemptId provider-key proof
capture OpenRouter Deepgram ready PDFs voice capture Admin beta diagnostics"
--budget 14000 --graph graphify-out/graph.json`
- `graphify query "voice proof attempt latch ChatPanel active learning book
documents apiKey deepgramApiKey activeBetaProofAttemptId" --budget 14000
--graph graphify-out/graph.json`
- `graphify path "buildLiveBetaProofPreflight" "ChatPanel" --graph
graphify-out/graph.json`
- `graphify path "buildProviderKeyProofChecklist" "ChatPanel" --graph
graphify-out/graph.json`
- `graphify path "server.ts" "recordModelRunEvent" --graph
graphify-out/graph.json`

## Write Scope

- `src/components/ChatPanel.tsx`
- `tests/voice-proof-attempt-latch.test.mjs`
- `.workflow/brain-architecture-implementation-program/packets/phase73-chat-proof-hud-qa.mjs`
- Workflow docs/results/state
- Regenerated `graphify-out/*`

## Acceptance Criteria

- ChatPanel renders a `Live proof capture` HUD only when
  `activeBetaProofAttemptId` is set.
- The HUD displays the active proof attempt, active learning book/project, ready
  PDF count, chat capture state, voice capture state, local OpenRouter key
  state, and local Deepgram key state.
- The HUD is local-only and does not call providers, display secrets, change
  Dexie schema, or mark final beta proof as complete.
- Source regression coverage guards the active-attempt gate and HUD copy.
- Browser QA confirms the HUD on desktop and mobile with no horizontal overflow
  and clean console logs.
