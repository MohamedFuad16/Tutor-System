# A1 Result: Knowledge Tracing and Learning Engine

Sources cited by agent include BKT/EDM/JEDM, DKT, LLM-KT, CLST, CIKT,
response-time modeling, AED-KT, adaptive forgetting curves, and cold-start KT.

## Accepted Points
- Use an interpretable hybrid for v1: BKT-style per-concept mastery is the
  source of truth, enriched with response quality, time, hints, problem-solving
  process, and revision evidence.
- Use LLMs for semantic grading, misconception labels, response quality, and
  cold-start profiling, not as the only mastery store.
- Defer DKT/transformer KT until the app has enough clean interaction data.
- Current repo already has a lightweight BKT path in
  `src/memory/bkt.engine.ts`, concept state in `src/memory/longterm.memory.ts`,
  and learning-model surfaces in `src/memory/learner.model.ts`.
- Six-signal treatment:
  correctness is primary observation; quality is rubric/LLM score;
  time is log-normal/standardized; problem solving scores steps and transfer;
  hint usage reduces confidence in correct answers; revision improves
  retention only when active recall is involved.
- Formula shape:
  retention half-life decays prior mastery, evidence updates logit mastery,
  hint units penalize bottom-out hints more than scaffold hints, and recognition/
  generation/transfer caps prevent shallow evidence from overstating mastery.
- Cold-start diagnostic uses self-rating, prerequisite check, recognition MCQ,
  own-words definition, worked-example completion, error diagnosis, transfer,
  and confidence ratings.

## Integration Notes
- Final schema should use `user_id` consistently rather than `learner_id`.
- Merge `knowledge_events` with the broader event/episodic memory model, or
  keep both with clear ownership.
- Keep cold-start priors conservative and label accuracy as an open risk.
