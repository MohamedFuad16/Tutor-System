# Packet ADK: Voice Stage Layout and Page Focus

## Scope

User confirmed the microphone path was now working in the real app, then
requested a narrower visual fix:

- Move the voice blob properly into the top-left/left while voice visuals are
  shown.
- Center diagrams in the voice screen with no extra diagram card/background.
- Remove labels such as "focusing chart diagram surface" from the voice visual
  stage.
- Keep semantic Mermaid highlighting, but do not show focus-tour controls in
  the voice stage.
- For current-page questions, do not show a voice visual card. Highlight the
  actual PDF page with a border outline only.
- Run multiple subagents for the visual diagnosis.

AWS/cloud work remained out of scope. The separate real provider drill remains
open.

## Subagents

- Hubble diagnosed the voice input path and identified Deepgram readiness and
  provider-transcript evidence gaps.
- Ohm diagnosed the blob/stage layout: the blob was too conservatively placed,
  the diagram stage was cramped, and the stage had duplicate chrome.
- Turing diagnosed the current-page focus path: `PdfViewer` already listened for
  voice focus events, but `ChatPanel` was also promoting current-page focus into
  a voice-stage card.
- Darwin did not return before implementation finished; no changes were taken
  from that lane.

## Implementation

- `VoiceVisualStage` now treats current-page focus as non-renderable in the
  voice overlay.
- Diagram stage rendering is transparent and centered, without status/header
  chips, focused-target copy, or a nested card frame.
- `VoiceUniverse` filters current-page visual focuses, hides the listening label
  while a visual stage is active, and moves the blob farther to the top-left.
- The stage Mermaid variant uses transparent chrome, larger height limits, app
  matched dark node styling, and semantic active-node highlighting without the
  inline `Next box` controls.
- `VoiceVisualFocusPanel` filters current-page events so page inspection does
  not create a chat card.
- `PdfViewer` now handles only `voice_look_at_current_page` focus events and
  renders a border-only overlay on the actual PDF page.
- The voice server now waits for Deepgram `SettingsApplied` before flushing
  buffered mic audio, records the first voice-input byte event, and captures
  sanitized provider transcript/status events.

## Verification

- Graphify-first routing identified `ChatPanel.tsx`, `PdfViewer.tsx`,
  `server.ts`, and voice tool/test surfaces before source inspection.
- `npm run lint`: passed.
- `npm run test`: passed, 203 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason voice-stage-visual-reliability --full`:
  passed, including format check, typecheck, production build, all 203 tests,
  diff whitespace check, and graphify-out scratch scan.
- In-app Browser QA on `http://localhost:3001/` confirmed the chat Mermaid
  surface still renders with an inline focus tour and no forbidden voice-stage
  copy in visible text.
- The in-app Browser security policy blocked synthetic JavaScript injection, so
  no automated fake microphone/WebSocket voice-stage screenshot was captured in
  this packet. This is a browser automation limitation, not a source/test gate
  failure.

## Out of Scope

- No AWS/cloud work.
- No Graphify artifact regeneration.
- No claim that the coherent real provider drill is complete.
