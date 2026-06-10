# Integration Result

## Accepted
- Use a Tutor-owned realtime voice broker with a foreground GPT-4o-mini learner loop and a GPT-5.5 background tool/reasoning loop.
- Preserve current `/api/voice-agent` as fallback while adding the new broker path.
- Treat MisoTTS as TTS-only and implement duplex behavior through always-on STT, cancellation, playback flushing, and background-result insertion.
- Use RTX 4090 24GB or RTX 3090 24GB as the minimal first Vast.ai machine.

## Rejected
- Do not claim MisoTTS is multi-duplex/full-duplex.
- Do not promise full semantic answer audio under 300ms as a guaranteed end-to-end target with cloud STT plus cloud LLM.
- Do not put GPT-5.5 in the critical foreground response path.

## Conflicts
- Thinking Machines' native interaction model can handle continuous audio/video internally; our stack is cascaded. Resolution: mimic the interaction shape with a persistent broker and measurement, while being honest about latency.

## Decisions
- Foreground: browser AudioWorklet -> broker -> Deepgram STT -> OpenRouter GPT-4o-mini -> MisoTTS -> browser.
- Background: broker -> GPT-5.5/tool runner -> result queue -> natural insertion into foreground speech.
- Verification must measure p50/p95/p99 by stage after the GPU is available.

## Remaining Risks
- Miso streaming/cancellation may require generator-level changes.
- Region/network latency can dominate.
- Live provider API behavior needs key-backed validation.
