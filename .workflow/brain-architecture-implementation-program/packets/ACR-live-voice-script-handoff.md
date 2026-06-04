# Packet ACR: Live Voice Script Handoff

## Objective

Make the live-voice side of the provider-key drill executable from Admin. The
user should be able to start a proof attempt, load the exact live-voice proof
script into Study/Chat, and see that the script is staged for voice mode before
any real Deepgram traffic runs.

## Graphify Route

- `graphify query "live voice proof script Load in chat provider-key voice
proof turn ChatPanel voiceState sendVoiceText startVoice
activeBetaProofAttemptId Admin drill packet" --budget 14000 --graph
graphify-out/graph.json`
- `graphify query "askTutorQuery setAskTutorQuery StudyView ChatPanel proof
prompt loaded voice script loaded live_voice_provider_key_script" --budget
14000 --graph graphify-out/graph.json`
- `graphify path "AdminView()" "ChatPanel()" --graph graphify-out/graph.json`
- `graphify path "ChatPanel()" "sendVoiceText" --graph
graphify-out/graph.json`

## Write Scope

- `src/views/AdminView.tsx`
- `src/components/ChatPanel.tsx`
- `tests/live-proof-prompt-handoff.test.mjs`
- `.workflow/brain-architecture-implementation-program/packets/phase75-live-voice-script-handoff-qa.mjs`
- Workflow docs/results/state
- Regenerated `graphify-out/*`

## Acceptance Criteria

- Admin renders a `Load voice script` action for the live-voice provider proof
  prompt.
- The action is disabled until there is an active proof attempt.
- Clicking the action queues the exact live-voice proof script and navigates to
  Study.
- ChatPanel inserts and focuses the queued voice script, while the live proof
  HUD shows the active attempt, active book, ready PDFs, provider-key states,
  `Voice script loaded`, and `Start voice first`.
- If the voice script is staged and voice is still idle, pressing send starts
  voice instead of submitting the voice proof script as typed chat.
- Browser QA confirms the Admin-to-Chat voice-script handoff on desktop and
  mobile with no horizontal overflow and clean console logs.
- No provider calls, key exposure, AWS/cloud work, or Dexie schema change.
