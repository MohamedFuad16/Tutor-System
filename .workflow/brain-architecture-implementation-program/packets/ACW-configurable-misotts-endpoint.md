# Packet ACW: Configurable MisoTTS Endpoint

## Objective

Make the MisoTTS 8B read-aloud path ready for either the local Vast SSH tunnel
or any compatible API/cloud endpoint without adding AWS deployment work.

## Scope

- `server.ts`
- `src/store/index.ts`
- `src/components/SettingsModal.tsx`
- `src/components/ChatPanel.tsx`
- `src/views/AdminView.tsx`
- `tests/tts-provider-routing.test.mjs`
- `tests/system-activity.test.mjs`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*`

## Out Of Scope

- AWS/cloud deployment.
- Claiming live MisoTTS 8B audio proof before the remote model is loaded.
- Replacing realtime Deepgram live voice with MisoTTS.

## Acceptance

- Settings exposes a configurable MisoTTS API URL with a local tunnel default.
- Chat read-aloud requests forward the browser-selected endpoint to `/api/tts`.
- Admin System Activity probes the browser-selected endpoint.
- Server-side MisoTTS health and speech routes accept a validated HTTP/HTTPS
  endpoint override while preserving the `MISO_TTS_API_URL` fallback.
- Focused tests, format, lint, build, browser QA, and Graphify refresh pass
  before commit.
