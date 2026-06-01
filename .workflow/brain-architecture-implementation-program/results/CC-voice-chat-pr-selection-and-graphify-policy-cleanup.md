# Packet CC Result: voice chat PR selection and Graphify policy cleanup

## Result

Accepted for the local first-phase program.

The open PR #4 by MegaaDev was inspected selectively. This branch ports the
voice-chat pieces that fit the Tutor architecture while leaving unrelated PR
features out of scope: no image-search endpoint, no generated-Mermaid endpoint,
no voice visual tool-calling functions, and no unrelated multi-PDF changes.

## Integrated Work

- Switched live Voice Agent speech to Deepgram Aura (`aura-asteria-en`) instead
  of advertising OpenAI TTS inside the Deepgram agent settings.
- Added Deepgram Voice Agent KeepAlive and frame-preserving proxy writes so text
  control frames and binary PCM frames keep their intended type.
- Added voice session grouping in chat: one collapsible `Voice conversation`
  card stores the turn transcript and duration instead of scattering many loose
  voice messages.
- Added a PR-inspired voice active UI with a dark audio-reactive stage, rolling
  captions, typed-voice placeholder, and local barge-in handling.
- Defaulted local TTS/voice usage to Deepgram Aura for consistency with the
  configured voice path.
- Deleted `.github/workflows/graphify-refresh.yml` and updated docs/scripts so
  Graphify refresh is explicit local maintenance, not GitHub push automation.

## Verification Evidence

- `npm run format:check`: passed after removing the deleted workflow path from
  the Prettier scripts.
- `npm run lint`: passed.
- `npm run test`: passed, 77 tests.
- `npm run build`: passed.
- Browser QA on `http://localhost:3100`:
  - Admin Source Artifacts exposed `Run local check`, manifest-integrity copy,
    and no `No local verifier yet` badge for audio rows.
  - Revision opened the User Brain Architecture built-in book and loaded
    `/audio-overviews/user-brain-runtime-overview.mp3` with `audio/mpeg`, a
    32.688s duration, and no media error. Headless Chrome did not advance
    playback time, but the asset loaded and the UI showed no playback error
    after the trusted click path.
  - Study voice mode exposed the mic control, `Listening` voice stage,
    audio-reactive blob SVG, `Type to talk to Aria...` placeholder, and voice
    session card with no horizontal overflow.
- `curl -I /audio-overviews/user-brain-runtime-overview.mp3`: returned `200 OK`,
  `Content-Type: audio/mpeg`, and `Content-Length: 196128`.
- `graphify update . --force`: regenerated the architecture graph with 840
  nodes, 1421 edges, and 58 communities after rebasing over the remote
  Graphify auto-refresh commit.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `VoiceUniverse()` and `MorphBlob()` in
  `src/components/ChatPanel.tsx`.

## Remaining Work

- Live Deepgram Voice Agent end-to-end behavior still needs real API-key,
  microphone, and speaker validation outside headless Chrome.
- Audio-content transcript matching remains future verifier work.
- AWS/cloud synchronization remains out of scope until beta testing.
