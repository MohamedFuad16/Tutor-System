# Packet ADJ: Voice Input Sample-Rate and Live Visual Stage

## Scope

Fix the current local voice-mode failure report without starting AWS/cloud work:

- Make browser microphone PCM and Deepgram Voice Agent input settings agree.
- Show truthful Deepgram readiness in ChatPanel when the local server fallback key is configured.
- Render voice-generated Mermaid diagrams and web image/source results inside the live voice overlay, with the voice blob minimized to the top-left while the visual stage is active.
- Keep the Mermaid focus tour visible through the spoken explanation and return the blob to center only after `AgentFinishedSpeaking`.

## Implementation Notes

- `ChatPanel.startVoice()` now measures the actual `AudioContext.sampleRate`, records a local microphone-open event, includes that rate in mic-signal evidence, and sends `inputSampleRate` in `voice_auth`.
- `server.ts` now normalizes the client voice input sample rate, uses it in Deepgram `audio.input.sample_rate`, and reports it in system activity and input-audio usage math.
- `ChatPanel` now reads the existing `/api/debug/system-activity` Deepgram provider meter and shows `Deepgram server fallback` instead of `Deepgram key missing` when the server has a usable key.
- `VoiceUniverse` now accepts an active `VoiceVisualFocus` and renders a live `VoiceVisualStage` for Mermaid diagrams, current-page focus, and web image/source cards.
- The voice blob smoothly relocates to the top-left while the stage is active. The stage return is tied to `AgentFinishedSpeaking` plus a short grace period instead of a generic listening timer.
- `Mermaid` now has an inline mode and a stage mode; both preserve the active node focus tour.

## Verification

- Repo-local Graphify queries routed this slice through `ChatPanel.tsx`, `server.ts`, `voiceAgentTools.ts`, store/settings/Admin-connected provider meters, and voice/system-activity tests before source edits.
- `npm run lint`: passed.
- `npm run test`: passed, 203 tests.
- `npm run build`: passed.
- First `npm run brain:postchange -- --reason voice-input-visual-stage --full`
  found formatting drift in `server.ts`; a narrow Prettier pass fixed it.
- Rerun `npm run brain:postchange -- --reason voice-input-visual-stage --full`:
  passed, including format check, typecheck, production build, full test suite,
  diff whitespace check, and graphify-out scratch scan.
- In-app Browser QA on `http://localhost:3001/` verified the ChatPanel live-proof HUD now shows:
  - `Voice capture ready`
  - `OpenRouter server fallback`
  - `Deepgram server fallback`
- Live local system-activity evidence during Browser QA showed real Deepgram Voice Agent sessions reached `Welcome` and `SettingsApplied`, streamed nonzero input bytes and output bytes, and received a `render_diagram` voice tool call. This was treated as local runtime evidence, not as completion of the separate coherent provider-proof drill.
- Browser-visible Mermaid evidence remained present in the chat surface with `data-mermaid-focus-tour` and active Mermaid focus nodes.
- After reload, the in-app Browser automation could open ChatPanel but did not reliably activate the nested mic button for a fresh captured overlay screenshot. The DOM showed the mic button enabled and visible; the earlier local activity ledger proved voice sessions had started and reached Deepgram before that browser-control limitation.

## Out of Scope

- No AWS/cloud work.
- No Graphify artifact regeneration in this packet.
- No claim that the full provider drill is complete; the one coherent proof attempt requirement remains separate.
