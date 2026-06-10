# Final Report: Sub 300ms Voice Brain Architecture Research

## Outcome
Use a Tutor-owned realtime voice broker. Do not keep relying on Deepgram Voice Agent as the whole agent runtime, and do not treat MisoTTS as duplex. The new design should be:

Browser AudioWorklet -> Tutor broker WebSocket -> Deepgram STT -> GPT-4o-mini learner stream -> MisoTTS streaming/cancellable audio -> browser playback

In parallel:

Tutor broker -> GPT-5.5 background agent/tool queue -> web/search/PDF/code/tool results -> foreground insertion queue

## Accepted Results
- Thinking Machines' article supports the architecture split the user wants: a real-time interaction model stays present while a background model handles deeper reasoning/tool use and streams results back into the conversation.
- Their technical direction uses 200ms micro-turns and persistent streaming sessions. We should copy the interaction pattern, not pretend a cascaded provider stack has the same native architecture.
- Miso Labs claims 110ms realtime latency and local/on-prem deployment, but the public MisoTTS card identifies it as an 8B text-to-speech model based on Sesame CSM. It is the voice renderer, not the whole interaction model.
- Deepgram's own latency docs place streaming transcription at 150-300ms and total transcript latency at 200-500ms. This makes full user-speech-to-semantic-answer under 300ms unrealistic as a guaranteed system target with cloud STT plus cloud LLM.
- OpenRouter supports `openai/gpt-4o-mini` through an OpenAI-compatible API, making it suitable for the small foreground learner LLM.
- OpenAI's GPT-5.5 docs show streaming, function calling, structured outputs, and Responses API tools such as web search, file search, code interpreter, hosted shell, apply patch, MCP, and tool search. That fits the async background layer.
- Current LearningAI already has useful primitives: `/api/voice-agent`, browser microphone/audio playback, barge-in stopping, voice tools, `/api/tts`, and `scripts/misotts_api_server.py`.

## Rejected Results
- Rejected "Miso solves duplex." MisoTTS is TTS-only in the public model card; duplex must be implemented in the broker.
- Rejected "all output under 300ms" as a hard guarantee. The source-backed target should separate local cancellation/reaction latency from full semantic answer latency.
- Rejected a big-bang replacement. Keep the current Deepgram Voice Agent path as fallback until the new broker is proven.

## Conflicts Resolved
- The user's desired Thinking Machines-style full-duplex feel conflicts with Miso's half-duplex TTS nature. Resolution: use Miso only for audio rendering and keep STT open during playback; cancel/flush TTS on barge-in.
- The current code delegates the whole voice loop to Deepgram Voice Agent. Resolution: add a Tutor-owned `/api/voice-broker` beside it, then migrate after measured proof.

## Verification Evidence
- Graphify query routed the current voice architecture to `server.ts`, `src/components/ChatPanel.tsx`, `src/lib/voiceAgentTools.ts`, `src/lib/chatAgentTools.ts`, `src/memory/brain.context.ts`, `src/memory/brain.rehearsal.ts`, `scripts/misotts_api_server.py`, `src/memory/beta.diagnostics.ts`, and `src/views/AdminView.tsx`.
- Targeted source inspection confirmed `server.ts` proxies `/api/voice-agent` to Deepgram Voice Agent, configures Deepgram listen, GPT-4o-mini think, and Deepgram speak providers, and has `/api/tts` routing to MisoTTS.
- Targeted source inspection confirmed `ChatPanel.tsx` streams PCM16, plays binary PCM, stops active audio on barge-in, and handles voice tool callbacks.
- Targeted source inspection confirmed `scripts/misotts_api_server.py` currently generates full WAV responses under a lock.

## Remaining Risks
- Actual Miso whole-utterance output is verified on the Vast.ai machine, but it
  is not yet a realtime streaming path. Cold load was 87.77s; warm whole-request
  tunnel latency was 6.13s for a very short utterance.
- OpenRouter GPT-4o-mini TTFT and GPT-5.5 background latency must be measured in the chosen region.
- True Miso streaming may require modifying the Miso generator internals; a phrase-chunked bridge is the fallback.
- The current browser microphone path uses ScriptProcessor, which should be replaced by AudioWorklet for stable low-latency frames.
- Provider keys, GPU deployment, and live traffic are still pending user input.

## Reusable Follow-up
Implementation order:
1. Done locally: add `VITE_VOICE_BROKER_MODE=custom` and `/api/voice-broker` beside the current path.
2. Done locally: stage brain-context, previous-memory, active-book/document metadata, foreground model, MisoTTS, and GPT-5.5 background queue events without provider traffic.
3. Next after GPU/keys: add AudioWorklet 20ms capture for the new broker.
4. Next after keys: implement STT-only Deepgram WebSocket client with interim/final transcript events.
5. Next after keys: stream GPT-4o-mini from OpenRouter with short voice prompts and no foreground blocking tools.
6. Next after GPU: upgrade Miso service to stream/cancel audio; begin with phrase chunking because the verified wrapper is whole-utterance WAV output.
7. Next after GPT-5.5 key: replace the staged background queue with real GPT-5.5 tool execution and result insertion.
8. Add Admin diagnostics for p50/p95/p99 stage timings.

Minimal Vast.ai machine:
- 1x RTX 4090 24GB preferred, or RTX 3090 24GB if cheaper.
- 8 vCPU minimum, 12-16 preferred.
- 32GB RAM minimum, 64GB preferred.
- 100GB NVMe minimum.
- Ubuntu + CUDA 12.x + PyTorch-compatible image.

Safer but not necessary for first beta: L40S 48GB or A100 40GB.
