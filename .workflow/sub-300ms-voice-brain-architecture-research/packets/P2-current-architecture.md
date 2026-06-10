# P2 Current LearningAI Architecture

## Objective
Map the current voice architecture through Graphify before source inspection.

## Graphify Context
Graphify query found the relevant cluster:
- server.ts
- src/components/ChatPanel.tsx
- src/lib/voiceAgentTools.ts
- src/lib/chatAgentTools.ts
- src/memory/brain.context.ts
- src/memory/brain.rehearsal.ts
- scripts/misotts_api_server.py
- src/memory/beta.diagnostics.ts
- src/views/AdminView.tsx

## Source Findings
- `server.ts` attaches `/api/voice-agent` as a WebSocket and currently proxies to `wss://agent.deepgram.com/v1/agent/converse`.
- The current Deepgram Voice Agent config sets listen provider to Deepgram Flux, think provider to `gpt-4o-mini`, and speak provider to Deepgram Aura.
- `ChatPanel.tsx` opens microphone capture, converts browser audio to PCM16, buffers frames until voice auth is accepted, sends frames over `/api/voice-agent`, plays returned PCM, and handles barge-in by stopping active audio buffer nodes.
- `ChatPanel.tsx` also handles `FunctionCallRequest` by executing client/local tools and sending `FunctionCallResponse` back through the socket.
- `src/lib/voiceAgentTools.ts` already defines the voice tool surface we need for the background layer: study context, graph updates, flashcards, answer evaluation, current page vision, diagram rendering, and web search.
- `scripts/misotts_api_server.py` is already a FastAPI wrapper for MisoTTS 8B but uses a lock and returns a generated WAV after `gen.generate(...)`, so it is not yet live-streaming or multi-session friendly.
- `/api/tts` can route to `miso-tts-8b` with `x-miso-tts-api-url`, but this is suitable for read-aloud/chat TTS, not true realtime voice yet.

## Decision
Do not bolt Miso into the current Deepgram Voice Agent config. Replace the provider-owned `/api/voice-agent` loop with a Tutor-owned broker while preserving the browser voice UI, local tool functions, and diagnostics/event ledger shape.
