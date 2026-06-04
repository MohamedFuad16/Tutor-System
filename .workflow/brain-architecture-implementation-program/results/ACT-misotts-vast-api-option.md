# Packet ACT Result: MisoTTS Vast API Option

## Accepted

- Added `miso-tts-8b` as a selectable TTS voice in Settings with operational
  copy explaining the localhost:8080 tunnel or `MISO_TTS_API_URL`.
- Added server-side routing for `/api/tts?voice=miso-tts-8b` to proxy audio
  from a local MisoTTS API at `/v1/audio/speech`.
- Added local usage headers for the MisoTTS branch:
  `X-Usage-Provider: misotts`, `X-Usage-Model: miso-tts-8b`, zero estimated
  cost, and character count.
- Added `scripts/misotts_api_server.py` as a FastAPI wrapper for a cloned
  MisoTTS repository on the Vast host.
- Added `tests/tts-provider-routing.test.mjs` with a local MisoTTS stub to
  verify Settings copy and the `/api/tts` proxy contract.

## Rejected

- No AWS/cloud deployment was added.
- No automatic read-aloud/provider traffic was triggered from Admin.
- No voice cloning or prompt-audio upload UI was added.
- No existing Deepgram/OpenAI route behavior was removed.

## Remote Access Status

- Attempted:
  `ssh -p 31651 root@120.238.149.205 -L 8080:localhost:8080`
- Verbose retry established TCP but failed before key exchange:
  `kex_exchange_identification: Connection closed by remote host`.
- Result: remote MisoTTS install and live API launch remain pending a working
  Vast SSH endpoint or host-side fix.

## Verification So Far

- `npm run format -- server.ts src/components/SettingsModal.tsx
tests/tts-provider-routing.test.mjs src/components/ChatPanel.tsx
tests/live-proof-prompt-handoff.test.mjs`: passed.
- Python syntax parse for `scripts/misotts_api_server.py`: passed.
- `npm run test -- tests/tts-provider-routing.test.mjs
tests/live-proof-prompt-handoff.test.mjs
tests/voice-proof-attempt-latch.test.mjs`: passed through the project runner,
  173 tests.

## Remaining For Final Gates

- Desktop/mobile browser QA for the Settings option: passed via
  `phase76-misotts-settings-qa.mjs`.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 173 tests.
- Graphify regeneration and smoke query/path checks: passed with 1171 nodes,
  2027 edges, 67 communities, and a scratch-clean graph artifact grep.
- Commit and push without staging unrelated `.workflow/*` directories: pending.
