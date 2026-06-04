# Packet ACV: Chat Read-Aloud Miso Surface

## Objective

Make the selected MisoTTS 8B read-aloud voice visible and reachable from the
Tutor chat surface itself, then push the existing StudyView mobile UI fix as a
verified local slice.

## Scope

- `src/components/ChatPanel.tsx`
- `src/views/StudyView.tsx`
- `tests/tts-provider-routing.test.mjs`
- `tests/study-view-upload.test.mjs`
- `graphify-out/*`

## Out Of Scope

- AWS/cloud deployment.
- Replacing realtime Deepgram voice mode with MisoTTS.
- Claiming live MisoTTS 8B audio proof before the Vast host has enough
  executable disk for the model weights.

## Acceptance

- Assistant message Read Aloud controls expose the selected voice label.
- MisoTTS 8B is clearly shown on the existing Read Aloud button when selected.
- Tooltip copy clarifies that MisoTTS is local HTTP read-aloud while Live Voice
  remains Deepgram.
- Mobile StudyView can scroll enough for the chat action row and composer to be
  reachable.
- Focused tests, full test runner, lint, build, browser QA, and Graphify refresh
  pass before commit.
