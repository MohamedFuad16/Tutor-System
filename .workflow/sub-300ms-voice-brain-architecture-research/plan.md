# Sub 300ms Voice Brain Architecture Research

## Goal
Design an implementation-ready voice brain architecture for Tutor/LearningAI that mimics the Thinking Machines interaction-model split: a low-latency foreground learner dialogue loop plus an asynchronous background reasoning/tool layer.

## Success Criteria
- Source-backed understanding of Thinking Machines' interaction/background split.
- Source-backed constraints for Deepgram STT, MisoTTS, OpenRouter GPT-4o-mini, and GPT-5.5.
- Graphify-first map of the current LearningAI voice architecture and the narrow files likely to change.
- Proposed socket/message architecture that can support barge-in, cancellation, streaming STT, streaming text, streaming TTS, and background tool result insertion.
- Latency budget with honest feasibility notes for the user's sub-300ms target.
- Minimal Vast.ai GPU recommendation for MisoTTS with a safer headroom option.
- Clear implementation slices to start once the user provides the GPU endpoint and API keys.

## Current Context
- Repo: /Users/mfuad16/Documents/LearningAI.
- Required navigation: Graphify first, then targeted source reads.
- Existing Graphify query routed voice work through server.ts, src/components/ChatPanel.tsx, src/lib/voiceAgentTools.ts, src/lib/chatAgentTools.ts, src/memory/brain.context.ts, src/memory/brain.rehearsal.ts, and scripts/misotts_api_server.py.
- Current implementation proxies browser PCM to Deepgram Voice Agent at /api/voice-agent. Deepgram currently owns STT, the GPT-4o-mini "think" provider, and Deepgram TTS.
- Current code already has /api/tts support for a local MisoTTS HTTP server and a scripts/misotts_api_server.py wrapper, but it returns complete WAV responses rather than a true incremental audio stream.
- Current voice tools already include look_at_study_context, update_graph, generate_flashcards, evaluate_answer, look_at_current_page, render_diagram, and web_search.

## Constraints
- MisoTTS is TTS-only and half-duplex; duplex behavior must be implemented by our broker, not assumed from the TTS model.
- Deepgram STT latency alone can be 150-300ms processing plus network, so "full semantic answer under 300ms" is not realistic for every utterance; the achievable target is first reaction/backchannel under 300ms and first meaningful audio chunk as low as possible.
- Browser-to-cloud geography matters. Place the broker, Miso GPU, and external API egress in the closest feasible region to the user and Deepgram/OpenRouter edge.
- Avoid sending OpenRouter GPT-5.5 into the foreground voice loop. It belongs in async jobs whose results are woven into future foreground turns.
- Do not refresh graphify-out unless explicitly requested.

## Risks
- Sub-300ms end-to-end is likely impossible for full STT -> LLM -> TTS answer when using cloud STT and a cloud LLM; design must measure p50/p95 and separate acknowledgement latency from answer latency.
- Current browser ScriptProcessor uses 4096-frame chunks, which is roughly 85ms at 48kHz before network; AudioWorklet with 20ms frames is needed for tighter latency.
- Current Miso wrapper serializes a full WAV before response; streaming Mimi/audio chunks and cancellation must be added before it can serve live voice well.
- GPT-5.5 API/tool availability, rate limits, and pricing should be verified again at implementation time.
- Voice cloning and prompt-audio continuation need consent, safety, and storage boundaries.

## Approval Required
- User approval/API keys before live external provider traffic.
- User purchase/selection of a Vast.ai GPU before remote deployment work.
- Approval before broad rewrites of ChatPanel/server voice code or moving voice orchestration into a new FastAPI service.

## Work Packets
- P1 external research: Thinking Machines, MisoTTS, Deepgram STT, OpenRouter/GPT models, latency.
- P2 current architecture: Graphify-routed inspection of current voice/socket/tool files.
- P3 target architecture: broker protocol, task delegation, caching, latency budget, failure handling.
- P4 implementation readiness: GPU spec, env vars, staged code plan, verification gates.

## Integration Policy
Accept source-backed facts from official/vendor docs first. Treat marketing latency claims as targets until measured locally. Keep implementation choices compatible with the current LearningAI browser voice UI, local memory/tool ledgers, and beta diagnostics.

## Verification
- Graphify query performed before source reads.
- Targeted source inspection only.
- Source links recorded in final report.
- Workflow completeness check before handoff.
- No runtime code changes in this research/prep pass.

## Reusable Artifacts
- final-report.md: architecture decision and implementation-ready plan.
- results/*.md: packet notes for future implementation.
