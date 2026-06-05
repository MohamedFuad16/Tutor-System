# P1 Fact Check Result

Status: completed by subagent Locke.

## Accepted Findings

- The OpenAI-support final report is factually sound overall.
- Fine-tuning guidance is accurate: use it later for stable tutoring behavior, style, or frameworks; do not use it as first-line learner memory.
- Learner-state architecture is accurate: GPT should summarize, extract, and propose while deterministic KT owns mastery, weakness detection, and knowledge tracking.
- Beta-readiness guidance is directionally accurate but should be described as release gates, not completed guarantees.

## Required Wording Changes

- Separate OpenAI provider isolation from LearningAI app isolation. OpenAI API requests are independently processed, but LearningAI must still enforce local user/book/session scoping and test cross-user leakage.
- Keep the OpenAI TTS model-label mismatch visible. The store reports `gpt-4o-mini-tts`, while one server path executes `tts-1`; cost/quality conclusions should wait until requested, executed, and reported model fields match.
- Describe Realtime/WebRTC as an architecture recommendation supported by voice-quality goals, not as a direct statement from the support emails.

## Evidence

- User support email 1: fine-tuning is useful for stable tutoring behavior/frameworks; retrieval, learner-state summaries, conversation summaries, and system instructions are recommended first for evolving learner state.
- User support email 2: GPT beyond chatbot is useful for extraction, summarization, content generation, recommendation support, and evaluation; traditional algorithms are generally more reliable for weakness detection, scores, and knowledge tracking.
- User support email 3: separate requests do not inherently leak context; use dynamic learner-state injection rather than continuous fine-tuning; voice quality may improve with higher-capability voice models.
- Local source caveat: `LearningBook` does not include `userId`, so local app scoping must be handled carefully.
