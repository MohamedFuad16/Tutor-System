# Team 3 Result: Voice, STT, TTS, Realtime

## Accepted
- Use a hybrid fallback voice architecture.
- Keep the existing chained STT + LLM + TTS path as Standard Voice/default.
- Add OpenAI-native STT + Responses + TTS as the stable OpenAI baseline.
- Pilot OpenAI Realtime speech-to-speech behind a feature flag for premium/live
  tutor mode.
- Browser Realtime should prefer WebRTC; server media pipelines can use
  WebSocket.
- Keep learner-state updates async after completed voice turns; do not block
  spoken response on summarization/evaluation.
- Add English/Japanese eval scripts for pronunciation, mixed-language CS
  tutoring, code-symbol dictation, long pauses, noisy audio, corrections, and
  exact term capture.
- Main repo caveat: current OpenAI TTS usage reporting appears misleading:
  user-facing/default name is `gpt-4o-mini-tts`, while the actual OpenAI call
  uses `tts-1`.

## Key URLs
- https://developers.openai.com/api/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/voice-agents
- https://developers.openai.com/api/docs/guides/realtime-webrtc
- https://developers.openai.com/api/docs/guides/realtime-websocket
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/guides/realtime-transcription
- https://developers.openai.com/api/docs/guides/text-to-speech
- https://developers.openai.com/api/docs/models/gpt-realtime-2
- https://developers.openai.com/api/docs/models/gpt-realtime-mini
- https://developers.openai.com/api/docs/models/gpt-realtime-whisper
- https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- https://developers.openai.com/api/docs/pricing
- https://developers.deepgram.com/docs/deploy-voice-agent
- https://developers.deepgram.com/docs/voice-agent-settings-configuration
- https://developers.deepgram.com/docs/text-to-speech

## Integration Notes
- Pricing and model names are volatile; cite access date.
- Do not assume live WebSocket voice works on Vercel/serverless; use a realtime
  host or WebRTC client flow.
