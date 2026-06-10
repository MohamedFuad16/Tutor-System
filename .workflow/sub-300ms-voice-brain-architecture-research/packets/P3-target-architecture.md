# P3 Target Architecture

## Objective
Define the brokered, low-latency architecture.

## Components
- Browser voice client: AudioWorklet microphone capture, 20ms PCM16 frames, jitter buffer for playback, barge-in/cancel messages, visual voice state.
- Tutor Voice Broker: FastAPI or Node WebSocket service responsible for session state, cancellation, latency metrics, STT stream, learner LLM stream, TTS stream, and background job queue.
- Deepgram STT client: persistent WebSocket using interim results, VAD events, and tuned endpoint/utterance settings.
- Learner LLM: OpenRouter `openai/gpt-4o-mini`, streaming, short prompt, no long tools in the first pass.
- MisoTTS service: local GPU service with warmed model, streaming/cancellable synthesis, phrase-level chunks, and audio-frame output.
- Background agent: GPT-5.5 tool runner for web search, code/file analysis, PDF creation, and long reasoning, writing results into a session event queue.

## Message Shape
- client.audio_frame: binary PCM16 frame plus sequence/timestamp metadata where needed.
- client.cancel_audio: sent on barge-in.
- broker.transcript_partial / broker.transcript_final: Deepgram STT events normalized for UI and LLM.
- broker.assistant_text_delta: foreground GPT-4o-mini deltas.
- broker.audio_chunk: Miso PCM/Opus chunks.
- broker.background_job_started / broker.background_result_delta / broker.background_result_final.
- broker.metric: stage timings for audio capture, STT partial/final, LLM first token, TTS first audio, playback start, cancellation.

## Duplex Strategy
Miso is half-duplex, so simulate duplex at the broker layer:
- Always keep STT open, even while TTS is playing.
- On user speech above barge-in threshold, send client.cancel_audio, abort current GPT stream if appropriate, cancel Miso generation, flush playback queue, and resume listening.
- Allow foreground model to issue short acknowledgements while background work runs.
- Never wait for background GPT-5.5 before first spoken answer.

## Example Flow
User says: "Tell me about Pikachu, and also look up Nvidia prices."
- STT partial detects topic and current-data request.
- Foreground GPT-4o-mini starts: "Sure. Pikachu is an Electric-type Pokemon..."
- Broker starts background job: `web_search` or stock-price lookup for Nvidia.
- Miso streams the foreground explanation.
- Background result arrives with cited/latest Nvidia price.
- Foreground insertion policy waits for a natural clause boundary, then says: "Quick update on Nvidia: ..."

## Latency Budget
- Browser frame: 20ms target.
- Browser -> broker: 20-80ms depending geography.
- Deepgram interim STT: aim for first useful partial under 150-300ms, but vendor docs show total transcript can be 200-500ms.
- GPT-4o-mini TTFT through OpenRouter: must be measured; target under 150ms p50 with warmed connection and short prompts, but do not budget it as guaranteed.
- Miso first audio: vendor target 110ms; must be measured after replacing full-WAV generation with streaming.
- Playback jitter buffer: 40-80ms.

## Honest Target
Sub-300ms full semantic answer is not reliable with cascaded cloud STT + cloud LLM + local TTS. The realistic target is:
- p50 barge-in/cancel under 100ms after speech energy detection.
- p50 first acknowledgement audio around 300-600ms after end/commit, depending STT and LLM TTFT.
- background tool results inserted asynchronously without blocking the foreground tutor.
