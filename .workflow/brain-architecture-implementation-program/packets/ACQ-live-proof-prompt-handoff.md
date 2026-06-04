# Packet ACQ: Live Proof Prompt Handoff

## Objective

Turn the Admin provider-key drill packet into an executable local handoff for
typed chat. Admin should start a proof attempt, load the exact typed-chat proof
prompt into the Study chat composer, and preserve the active multi-PDF book,
ready PDF count, provider-key state, and proof-attempt HUD before the user sends
real OpenRouter traffic.

## Graphify Route

- `graphify query "remaining provider-key live beta proof local_live_ledger
sourceReadyForBeta betaProofReady OpenRouter Deepgram ChatPanel Admin voice
typed chat proof attempt" --budget 14000 --graph graphify-out/graph.json`
- `graphify query "buildProviderKeyProofChecklist
buildLiveBetaProofReceipt buildCoherentLiveProofFromLedgers ChatPanel
activeBetaProofAttemptId provider proof drill Admin diagnostics" --budget
14000 --graph graphify-out/graph.json`
- `graphify path "buildProviderKeyProofChecklist()" "ChatPanel()" --graph
graphify-out/graph.json`
- `graphify path "buildLiveBetaProofReceipt()" "ChatPanel()" --graph
graphify-out/graph.json`

## Write Scope

- `src/views/AdminView.tsx`
- `src/views/StudyView.tsx`
- `src/components/ChatPanel.tsx`
- `tests/live-proof-prompt-handoff.test.mjs`
- `.workflow/brain-architecture-implementation-program/packets/phase74-live-proof-prompt-handoff-qa.mjs`
- Workflow docs/results/state
- Regenerated `graphify-out/*`

## Acceptance Criteria

- Admin renders a `Load in chat` action for the typed-chat provider proof
  prompt.
- The action is disabled until there is an active proof attempt.
- Clicking the action queues the exact typed-chat proof prompt and navigates to
  Study.
- StudyView opens ChatPanel when a queued tutor prompt exists.
- ChatPanel inserts and focuses the queued proof prompt, while the live proof
  HUD shows the active attempt, active book, ready PDFs, provider-key states,
  and `Proof prompt loaded`.
- Browser QA confirms the Admin-to-Chat handoff on desktop and mobile with no
  horizontal overflow and clean console logs.
- No provider calls, key exposure, AWS/cloud work, or Dexie schema change.
