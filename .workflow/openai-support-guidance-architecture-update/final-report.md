# OpenAI Support Guidance Architecture Addendum

Date: 2026-05-31
Repo: `/Users/mfuad16/Documents/LearningAI`

## 1. Beta Scope And Non-Goals

This addendum incorporates three OpenAI Support emails into the LearningAI
architecture. The emails are treated as private guidance, not public
documentation.

Support guidance distilled:

- Fine-tuning is useful for stable tutoring behavior, style, methods, and
  frameworks, but not as the first mechanism for evolving per-learner memory.
- Learner adaptation should primarily use structured learner-state summaries,
  retrieval, conversation summarization, and system/developer instructions.
- GPT is useful beyond chat for extraction, summarization, content generation,
  recommendations, and quality evaluation.
- Traditional algorithms should remain the source of truth for weakness
  detection, mastery scores, and knowledge tracking.
- Separate API calls for response generation, learner-state updates,
  summarization, and evaluation are acceptable; API requests are independent
  across customers.
- Voice architecture should balance naturalness, multilingual quality, latency,
  and cost; GPT-4o mini remains a reasonable cost/performance baseline, while
  higher voice-capability models may improve naturalness.

Before beta, do not rebuild the full model/provider architecture. Ship risk
reducers: evals, source-grounding checks, model-routing observability, privacy
language, learner-state auditability, and voice instrumentation.

Non-goals before beta:

- Continuous fine-tuning on beta traffic.
- Replacing deterministic mastery with LLM-only learner modeling.
- Blind migration to the latest OpenAI model.
- Full Responses API rewrite unless current API constraints block beta.
- Full OpenAI Realtime replacement of the existing voice path.

## 2. Integrated Team Outputs

### Team 1: Model Strategy

Decision: use OpenAI as a layered tutoring intelligence stack.

Recommended layers:

- Responses API as the target reference path for tutor turns, tool workflows,
  structured outputs, and future migration.
- Retrieval/file search/vector stores for books, notes, PDFs, and source
  grounding.
- Structured Outputs for concept extraction, learner-state deltas, flashcards,
  graph updates, and eval traces.
- Evals/graders before prompt/model/fine-tune changes.
- Batch for offline evaluation, summarization, embedding, and dataset labeling.
- Fine-tuning only later for stable, repeated behavior or style failures after
  evals show prompt/RAG/schema work is insufficient.

Public documentation basis:

- [Model selection](https://developers.openai.com/api/docs/guides/model-selection)
- [Latest model guide](https://developers.openai.com/api/docs/guides/latest-model)
- [Models](https://developers.openai.com/api/docs/models)
- [Model optimization](https://developers.openai.com/api/docs/guides/model-optimization)
- [Supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning)
- [Retrieval](https://developers.openai.com/api/docs/guides/retrieval)
- [File search](https://developers.openai.com/api/docs/guides/tools-file-search)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Evals](https://developers.openai.com/api/docs/guides/evals)
- [Graders](https://developers.openai.com/api/docs/guides/graders)

### Team 2: Learner State

Decision: GPT is a semantic/proposal engine, not the learner-state ledger.

GPT should:

- Summarize sessions.
- Extract concepts and evidence.
- Propose misconception hypotheses.
- Generate notes, flashcards, quizzes, and revision prompts.
- Translate deterministic learner state into humane tutoring.
- Review output quality with rubrics.

Deterministic/KT systems should:

- Own mastery, weakness, promotion/demotion, prerequisite gates, ZPD,
  confidence calibration, and review timing.
- Accept or reject GPT evidence through auditable rules.
- Keep `userId`, `bookId`, `sessionId`, source IDs, confidence, decay/expiry,
  and review status on learner-state updates.

Recommended objects:

- `LearnerObservation`
- `ConceptCandidate`
- `LearningEvidence`
- `ConceptMastery`
- `StylePreferenceSignal`
- `MemorySummary`
- generated `ContextPacket`

Current local anchors identified by Graphify/subagents:

- `src/memory/longterm.memory.ts` has BKT-style concept fields.
- `src/memory/learner.model.ts` composes ZPD, misconceptions, scaffolding,
  prerequisites, weak concepts, cognitive load, and illusion flags.
- `ChatPanel.tsx` and `server.ts` already inject learner/book context into chat.

Architecture correction: any GPT-produced `mastery` or `confidence` in
learning-book updates should be treated as `gptEstimatedMastery` or semantic
confidence until validated by deterministic evidence.

### Team 3: Voice And Realtime

Decision: ship a hybrid voice stack.

Standard Voice:

```text
Browser mic
  -> STT provider
  -> transcript
  -> text tutor model / Responses target
  -> async learner-state update
  -> TTS
```

Live Tutor Beta:

```text
Browser WebRTC
  -> OpenAI Realtime session
  -> speech-to-speech response and tool events
  -> async learner-state update after turn completion
```

Use chained STT + LLM + TTS for source-grounded paper tutoring, read-aloud,
revision prompts, budget-sensitive sessions, Vercel-compatible flows, and
auditable reasoning. Use Realtime for natural voice tutoring, interruption,
barge-in, pronunciation drills, Japanese/English conversation practice, and
rapid back-and-forth sessions.

Keep Deepgram as the current production fallback/default where it already
works. Add OpenAI Realtime behind a feature flag, not as a wholesale
replacement.

Voice red flag from verifier:

- The current app appears to label/report OpenAI TTS as `gpt-4o-mini-tts`, but
  one checked server path calls `tts-1`. Fix the reporting/API mismatch before
  using voice cost/quality metrics for beta decisions.

Core docs:

- [Realtime](https://developers.openai.com/api/docs/guides/realtime)
- [Voice agents](https://developers.openai.com/api/docs/guides/voice-agents)
- [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech)
- [GPT-4o mini TTS](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts)
- [Deepgram Voice Agent](https://developers.deepgram.com/docs/deploy-voice-agent)

### Team 4: Beta Integration

Decision: turn research into gates, dashboards, and release policy.

Before beta:

- Add beta readiness checklist.
- Freeze model routing unless evals justify changes.
- Add explicit source-grounding and web-search guardrails.
- Formalize cost/latency telemetry.
- Add beta privacy language and controls.
- Run `npm run lint`, `npm run build`, and live smoke tests.

After beta:

- Full Responses API migration.
- Primary model switch to latest OpenAI family.
- Structured-output contract refactor for learning-book JSON.
- Persistent remote conversation state and hosted tools.
- Fine-grained per-user budget enforcement.

## 3. Provider And Model Routing

Beta routing policy:

| Task | Default route | Notes |
|---|---|---|
| Normal tutoring | current eval-passing default | Do not switch blindly before beta. |
| Hard reasoning/source synthesis | best eval-passing premium model | Candidate: current flagship OpenAI model via Responses. |
| Fast extraction/tags/summaries | mini/nano tier after eval parity | Use Structured Outputs. |
| Book/PDF knowledge | local retrieval or OpenAI file search | Prefer source IDs and metadata filters. |
| Learner-state updates | GPT extraction + deterministic updater | GPT proposes; KT ledger decides. |
| Evals/graders | OpenAI Evals/graders or local scripts | Keep out of live path. |
| Standard voice | chained STT + LLM + TTS | Reliable, inspectable, cheaper. |
| Live voice beta | OpenAI Realtime via WebRTC | Feature-flagged; instrument heavily. |

Do not route by novelty. Route by eval score, latency, cost, privacy, and
fallback behavior.

## 4. Guardrails And Safety Gates

Minimum guardrails:

- Source-material questions must use selected text, page, library context, or
  retrieved source IDs.
- Fresh/current/latest questions must trigger retrieval/search or explicit
  uncertainty.
- Web search should be disabled unless the user asks for freshness or outside
  source material.
- Learner-state updates must include evidence, source turn, confidence,
  expiry/decay, review status, and student-visible summary.
- Persistent learner traits require either repeated evidence or human/admin
  review.
- Use moderation/safety checks for user-visible chat, summaries, generated
  study material, and prompt-injection surfaces.
- Add user reporting and human escalation for beta incidents.
- Do not present inferred learner traits as certain diagnoses.

Docs:

- [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

## 5. Privacy And Data Handling

Beta privacy statement must distinguish:

- Browser-local persisted data: learner profile, provider keys, usage telemetry,
  PDF state, learning books, concepts, interactions, traces, and revisions.
- Provider-transmitted data: chat messages, selected/page context, document
  images for vision/OCR, voice/TTS audio/text, and web-search queries.
- OpenAI API data controls: do not claim "OpenAI never stores API data"; cite
  data controls and describe endpoint/application-state retention carefully.
- Support emails: private guidance, not public policy.

Beta trace policy:

- Opt-in.
- Revocable.
- Minimized.
- Redacted by default.
- Full trace sharing only through explicit debug consent.
- Delete/export request path documented.

Avoid these claims:

- "Zero Data Retention is available to everyone."
- "ZDR covers every endpoint/tool."
- "OpenAI never stores API data."
- "Public OpenAI privacy policy governs all API customer content."
- "Pricing and model availability are stable."

Docs:

- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI security and privacy](https://openai.com/security-and-privacy/)
- [Enterprise privacy](https://openai.com/enterprise-privacy/)

## 6. Cost, Latency, And Usage Observability

Dashboard metrics before beta:

- Requested model vs used model.
- Route reason.
- Fallback count.
- Input/output tokens.
- Estimated vs billed cost when known.
- Pricing source and staleness flag.
- Time to first token.
- Total stream time.
- Tool-call time.
- Retrieval/web-search/page-vision latency.
- Learning-book update latency.
- Voice first-audio latency.
- Turn-end latency.
- Voice session seconds.
- TTS characters/tokens.
- Provider error/fallback rate.

Release thresholds should include p50/p95 latency, fallback rate, estimated cost
per successful turn, silent-failure count, and stale-pricing count.

Docs:

- [Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)
- [Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)
- [Cost optimization](https://developers.openai.com/api/docs/guides/cost-optimization)
- [Pricing](https://developers.openai.com/api/docs/pricing)

## 7. Eval Suite And Release Gates

Minimum eval suite:

| Gate | Pass Bar |
|---|---|
| Grounded tutoring | 95% of source-material answers use selected/library context without unwanted web search. |
| Freshness routing | 95% of recent/latest questions trigger search/retrieval or explicit uncertainty. |
| Tool correctness | Flashcard, graph, page-vision, and web-search requests call the right tool path. |
| Citation behavior | Web-backed factual claims cite sources; source-material answers do not invent external citations. |
| Learner-state mutation | GPT observations do not overwrite KT mastery directly. |
| Memory grounding | Personalized claims cite `LearningEvidence` or `MemorySummary` IDs. |
| Cross-user leakage | seeded User A facts never appear for User B. |
| Voice | English/Japanese pronunciation, long pause, barge-in, noise, and code-symbol tests pass. |
| Safety | moderation/red-team suite blocks or redirects unsafe and high-risk content. |
| Cost/latency | admin dashboard exposes p50/p95 latency, token/cost, fallback rate. |

Docs:

- [Evals](https://developers.openai.com/api/docs/guides/evals)
- [Graders](https://developers.openai.com/api/docs/guides/graders)
- [Trace grading](https://developers.openai.com/api/docs/guides/trace-grading)

## 8. Operational Runbook

1. Freeze current beta model routing.
2. Add trace envelope for each tutor turn:
   user/session hash, prompt version, model, route reason, retrieval inputs,
   cited sources, output, safety result, learner-state diff, latency, token
   usage, cache info, user rating, human-review flag.
3. Add learner-state mutation audit:
   `evidence`, `sourceTurnId`, `confidence`, `expiry`, `reviewStatus`.
4. Build offline golden evals.
5. Run nightly beta trace evals.
6. Review weekly failures by bucket:
   prompt, retrieval, learner state, KT scoring, model reasoning, voice, UX,
   safety, cost.
7. Update prompts/retrieval/state schemas first.
8. Consider fine-tuning only after a curated eval-backed dataset exists.
9. Recheck model/pricing docs immediately before any launch decision.

## 9. Known Deferred Work

- Full Responses API migration.
- Full OpenAI Realtime production migration.
- Fine-tuning, RFT, or DPO.
- Hosted OpenAI vector stores for all books if local retrieval is sufficient.
- Remote persistent conversation state.
- Organization-wide ZDR/MAM assumptions.
- Full compliance posture for minors/schools.
- DKT/transformer KT.

## 10. Citation Appendix

OpenAI:

- https://developers.openai.com/api/docs/guides/model-selection
- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/model-optimization
- https://developers.openai.com/api/docs/guides/supervised-fine-tuning
- https://developers.openai.com/api/docs/guides/fine-tuning-best-practices
- https://developers.openai.com/api/docs/guides/retrieval
- https://developers.openai.com/api/docs/guides/tools-file-search
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/conversation-state
- https://developers.openai.com/api/docs/guides/prompt-engineering
- https://developers.openai.com/api/docs/guides/prompt-caching
- https://developers.openai.com/api/docs/guides/evals
- https://developers.openai.com/api/docs/guides/evaluation-best-practices
- https://developers.openai.com/api/docs/guides/graders
- https://developers.openai.com/api/docs/guides/safety-best-practices
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/guides/realtime
- https://developers.openai.com/api/docs/guides/voice-agents
- https://developers.openai.com/api/docs/guides/realtime-webrtc
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/guides/realtime-transcription
- https://developers.openai.com/api/docs/guides/text-to-speech

External:

- https://doi.org/10.1007/BF01099821
- https://papers.nips.cc/paper/5654-deep-knowledge-tracing
- https://ies.ed.gov/ncee/WWC/PracticeGuide/1
- https://developers.deepgram.com/docs/deploy-voice-agent
- https://developers.deepgram.com/docs/voice-agent-settings-configuration
- https://developers.deepgram.com/docs/text-to-speech
- https://deepgram.com/pricing

## Verification Evidence

- Dynamic workflow created at `.workflow/openai-support-guidance-architecture-update`.
- 12 agents launched across two waves due active-agent runner limit.
- Four teams completed: model strategy, learner state, voice/realtime, beta
  integration.
- OpenAI-specific public claims were checked against official OpenAI docs.
- Graphify-first local architecture navigation was used before repo-specific
  checks.
- No application source files were edited.
- `npm run lint` and `npm run build` were not run because this was a research
  and architecture-document workflow.
