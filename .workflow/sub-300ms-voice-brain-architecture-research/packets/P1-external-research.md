# P1 External Research

## Objective
Research Thinking Machines' interaction-model architecture and the provider constraints for the proposed Tutor voice stack.

## Sources
- Thinking Machines Lab, "Interaction Models: A Scalable Approach to Human-AI Collaboration", May 11, 2026.
- Miso Labs product page and MisoLabs/MisoTTS Hugging Face model card.
- Deepgram streaming STT latency and live audio documentation.
- OpenRouter GPT-4o-mini and server-side web search docs.
- OpenAI GPT-5.5 model and release docs.

## Findings
- Thinking Machines' core split is exactly the product direction we want: a real-time interaction model stays present while an asynchronous background model performs longer reasoning, browsing, and tool calls, then streams results back into the live conversation when appropriate.
- Their native model uses 200ms micro-turns and persistent streaming sessions in GPU memory. We cannot reproduce that with a cascaded STT -> text LLM -> TTS stack, but we can mimic the behavior with a persistent broker, short audio frames, speculative acknowledgement, cancellable TTS, and async background jobs.
- MisoTTS is an 8B text-to-speech model based on Sesame CSM. It is not a full-duplex interaction model; it should be treated as the audio renderer for foreground text, not the conversational brain.
- Miso's 110ms claim is a vendor claim and should be measured locally after deployment. Current LearningAI wrapper returns a full WAV, so local code must be upgraded before we can test first-audio latency.
- Deepgram docs describe streaming latency as a combination of network, model processing, buffer size, and client processing. Their stated typical ranges put transcription latency at 150-300ms and total transcript latency at 200-500ms, with Flux EOT at 100-500ms.
- OpenRouter supports `openai/gpt-4o-mini` through an OpenAI-compatible API. This is a reasonable foreground learner LLM if we stream tokens and keep prompts short.
- GPT-5.5 is suitable for the background agent/tool layer, especially for web search, file/code analysis, PDF generation, and long-running reasoning. It should not be in the foreground first-audio path.

## Decision
Build a two-layer broker:
- Foreground voice interaction loop: browser audio frames -> Tutor voice broker -> Deepgram STT partial/final -> GPT-4o-mini streaming -> MisoTTS streaming/cancellable audio -> browser.
- Background agent loop: intent detector/tool router -> GPT-5.5 or OpenRouter tool-enabled model -> web/search/PDF/code tools -> result packets -> foreground loop insertion queue.

## Verification Notes
All provider claims must be benchmarked on the final GPU/region with p50/p95/p99 timings.
