# Packet UU: voice current-page vision parity

## Objective

Close the local voice-vs-typed-chat parity gap for current-page, screen,
visible-diagram, chart, and reading-context questions without adding AWS/cloud
behavior.

## Scope

- Use Graphify-first navigation and inspect only connected voice/chat/PDF
  surfaces.
- Add a shared voice `look_at_current_page` tool definition.
- Reuse the rendered PDF canvas capture path already used by typed chat.
- Add a local `/api/voice-current-page` bridge that sends the current page image
  to the existing OpenRouter vision model path and records Admin/system
  activity.
- Return the text vision result to the Deepgram voice-agent tool loop.
- Keep web search source-material boundaries intact.
- Update workflow and architecture books; regenerate Graphify code architecture
  artifacts after verification.

## Out Of Scope

- AWS/cloud synchronization or hosted vision workers.
- Live Deepgram provider success-path QA.
- Live OpenRouter vision success-path QA without explicit key-backed test
  scope.
