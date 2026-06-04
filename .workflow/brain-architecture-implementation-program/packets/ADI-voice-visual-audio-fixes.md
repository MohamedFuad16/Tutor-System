# ADI Voice Visual Audio Fixes

## Scope

User pivoted from the provider drill to concrete product bugs:

- Voice mode did not appear to hear microphone input.
- Chat/voice needed internet image display when requested.
- Chat/voice needed Mermaid diagram rendering.
- Diagram explanations needed a cinematic focus/zoom path through boxes.
- Library chapter audio cards needed normal click/tap playback behavior instead
  of a long-press-like interaction.

AWS/cloud work remained out of scope. Graphify-first navigation was used before
file inspection.

## Implementation

- `ChatPanel` voice transcript handling now accepts tolerant transcript event
  shapes instead of only exact `ConversationText` payloads.
- Voice input now records a one-time `mic_signal` event when browser microphone
  frames reach the voice websocket, making permission/silence/parser failures
  easier to distinguish in Admin.
- Voice agent tools now include `render_diagram`, a local Mermaid-rendering
  function surfaced inside the voice visual focus panel.
- Mermaid rendering now caps to the chat rail, uses a dark contrast panel,
  identifies real Mermaid node groups, and runs a focus tour with transform
  spotlight movement through rendered boxes.
- Voice visual focus entries support `diagram` alongside current-page and
  web-search focus rows.
- Web-search source normalization/rendering keeps image metadata and shows image
  thumbnails in source cards when Serper image results are present.
- The live voice proof script now requires Mermaid flowchart focus-tour evidence
  in addition to current-page visual focus and web image/source display.
- `StoredAudioOverview` no longer starts playback on `pointerdown`; the Play
  button uses a normal click/tap path. If browser playback is blocked, it now
  shows an explicit local MP3 guide link instead of staying stuck on
  "Preparing audio guide".

## Browser QA

- Revision library audio guide opened in the browser and the Play button was
  clickable with no long-press requirement. The in-app browser blocked actual
  audio playback, so the UI showed `Open audio guide` plus the local MP3 link.
- Chat Mermaid prompt rendered a Mermaid diagram through the local OpenRouter
  fallback after restarting the local dev server with
  `ALLOW_SERVER_OPENROUTER_FALLBACK=true`.
- DOM QA confirmed the Mermaid focus tour rendered 12 real diagram nodes,
  auto-advanced, and applied a live SVG transform spotlight to the active node.
- Browser CDP screenshot capture timed out after the large animated Mermaid
  surface. Earlier emitted screenshots captured the chat proof HUD and Mermaid
  focus controls, but final visual proof relied on DOM/geometry checks.
- Live Deepgram voice QA was blocked in this browser state because the UI showed
  `Deepgram key missing`. No live microphone/provider proof is claimed in ADI.
- Web image behavior was covered by source-level tests; browser automation for
  the web-search prompt became unreliable after the Mermaid CDP timeout.

## Verification

- `npm run test`: passed, 203 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason voice-visual-audio-fixes --full`:
  passed, including format check, typecheck, production build, full test suite,
  and graphify-out scratch scan.

## Remaining Gap

ADI fixes the local UI/runtime bugs requested here, but it does not complete the
previous provider-drill acceptance bar. The real live Deepgram microphone proof
still requires a usable Deepgram key in the browser/app state, real microphone
permission, and a coherent provider proof attempt.
