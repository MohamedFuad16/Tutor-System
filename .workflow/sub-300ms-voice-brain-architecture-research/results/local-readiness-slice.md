# Local Readiness Slice

## Accepted
- Added `/api/voice-broker` beside the existing `/api/voice-agent` path.
- Kept the current Deepgram voice-agent path as fallback.
- Added `VITE_VOICE_BROKER_MODE=custom` as the browser opt-in for the new broker.
- Staged broker metadata for Deepgram STT, OpenRouter GPT-4o-mini foreground teaching, MisoTTS speech, and GPT-5.5 background jobs without requiring provider keys.
- Preserved local brain context handoff through the existing `buildBrainContextPacket` flow.

## Verification Target
- Local broker accepts `voice_auth`.
- Local broker records active book, previous memory, document context, and proof metadata.
- Local broker handles typed voice injection and stages a GPT-5.5 background job when the user asks for fresh/current/tool work.
- Provider traffic remains deferred until the user supplies keys and the GPU instance.

## Files Touched
- `server.ts`
- `src/components/ChatPanel.tsx`
- `src/store/index.ts`
- `tests/system-activity.test.mjs`
- `TUTOR_ARCHITECTURE.md`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
