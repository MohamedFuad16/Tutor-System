# Packet ACT: MisoTTS Vast API Option

## Objective

Add MisoTTS 8B as a local read-aloud provider option for Tutor while keeping
the existing Chat, Revision, and read-aloud UX intact. The model should run on a
Vast-hosted local API behind an SSH tunnel, not in AWS/cloud infrastructure.

## Scope

- Inspect Graphify-routed TTS/read-aloud surfaces only.
- Add a `miso-tts-8b` voice option to Settings.
- Route `/api/tts?voice=miso-tts-8b` to a local tunneled MisoTTS API.
- Provide a small FastAPI wrapper script that can run from the cloned
  MisoTTS repository on the Vast machine.
- Add focused tests for provider routing and settings discoverability.
- Document the remote access blocker honestly.

## Out Of Scope

- AWS/cloud deployment.
- Automatic provider traffic from Admin.
- Voice cloning UI or prompt-audio upload.
- Replacing existing Deepgram/OpenAI TTS options.

## Graphify Routing

- `graphify query "TTS read aloud /api/tts Deepgram speech voice provider
Settings ChatPanel RevisionView audio overview MisoTTS remote API"` found the
  relevant TTS/read-aloud surfaces.
- `graphify query "voice mode options Deepgram TTS settings tts provider speech
synthesis SettingsModal ChatPanel server api tts"` connected the Settings
  voice selection to server TTS routing.
- Direct source inspection stayed scoped to `server.ts`,
  `src/components/SettingsModal.tsx`, `src/components/ChatPanel.tsx`,
  `src/lib/audio.ts`, `src/views/RevisionView.tsx`, and focused tests.

## Implementation Plan

- Add a server-side Miso voice id constant and validated `MISO_TTS_API_URL`
  resolver.
- Branch `/api/tts` before OpenAI/Deepgram handling when the selected voice is
  `miso-tts-8b`.
- POST `{ text, speaker, max_audio_length_ms }` to
  `/v1/audio/speech` on the local MisoTTS API and stream the returned audio to
  the browser.
- Add the Settings option and short operational copy.
- Add `scripts/misotts_api_server.py` for the Vast machine.
- Add a Node test with a local MisoTTS stub.

## Verification Plan

- Focused format and tests.
- Python syntax parse for the FastAPI wrapper.
- Desktop/mobile browser QA for Settings option visibility and persistence.
- Final format, lint, build, test, Graphify regeneration, and graph smoke
  checks before commit/push.
