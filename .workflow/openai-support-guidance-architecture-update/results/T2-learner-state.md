# Team 2 Result: Learner State and Adaptive Learning

## Accepted
- GPT is a proposal/semantic engine, not the learner-state ledger.
- Deterministic KT owns mastery, weakness, promotion/demotion, prerequisite
  gates, review timing, ZPD, and confidence calibration.
- GPT owns summarization, concept extraction, misconception hypotheses,
  generated notes/flashcards/quizzes, recommendation wording, and quality
  review.
- Separate GPT observations from authoritative state:
  `LearnerObservation`, `ConceptCandidate`, `LearningEvidence`,
  `ConceptMastery`, `StylePreferenceSignal`, `MemorySummary`,
  and generated `ContextPacket`.
- Prompt injection strategy:
  stable tutor contract first, then deterministic learner snapshot, retrieved
  memory/book context, current page/user task, and guardrails.
- All learner-state retrieval must be scoped by `{userId, activeBookId}` with
  provenance/source IDs.
- Evals needed: KT prediction, calibration, adaptation correctness, memory
  grounding, cross-user leakage, style preference, and algorithm agreement.

## Key URLs
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/prompt-caching
- https://developers.openai.com/api/docs/guides/retrieval
- https://developers.openai.com/api/docs/guides/conversation-state
- https://developers.openai.com/api/docs/guides/evaluation-best-practices
- https://developers.openai.com/api/docs/guides/graders
- https://developers.openai.com/api/docs/guides/safety-best-practices
- https://doi.org/10.1007/BF01099821
- https://papers.nips.cc/paper/5654-deep-knowledge-tracing
- https://ies.ed.gov/ncee/WWC/PracticeGuide/1

## Integration Notes
- Current repo has the right bones: BKT fields in `longterm.memory.ts`,
  learner composition in `learner.model.ts`, and context injection in
  `ChatPanel.tsx`/`server.ts`.
- Current `LearningBookConcept.mastery/confidence` should be reframed as GPT
  estimate/semantic confidence unless validated by KT evidence.
