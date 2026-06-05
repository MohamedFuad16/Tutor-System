# P3 Adaptiveness Result

## Summary
Ship an evidence-first adaptive tutor:

1. Use BKT plus Logistic KT/PFA-style features as the beta mastery ledger.
2. Let the foreground tutor adapt pacing, explanation style, hints, and tool
   timing from interaction state.
3. Let background tools extract evidence, retrieve sources, generate artifacts,
   and propose updates.
4. Commit mastery only from typed learner evidence: attempts, recall answers,
   transfer tasks, confidence, hints, latency, spacing, and difficulty.
5. Use bandits only for low-risk next-activity ranking, not autonomous
   curriculum control.

## Research Track
Keep DKT, AKT/SAKT, LPKT, language-model LKT, LLM-KT, CIKT, and RAG-KT out of
the beta source of truth until offline evals prove lift on LearningAI data.

## Architecture Gap
Current local memory still has legacy direct mastery mutation around
`src/memory/memory.orchestrator.ts:589`. Beta needs a hard evidence-event gate
before any production mastery write.

## Metrics
- KT prediction: AUC, log loss, Brier score, calibration curve, per-concept lift.
- Learning outcomes: delayed recall, transfer-question success, spaced-review retention.
- Adaptiveness: time-to-help, interruption recovery, hint usefulness, activity acceptance.
- Safety: false mastery updates, unsupported concept claims, source mismatch rate.
- Runtime: first response latency, background job completion time, queue depth, tool failure rate.

## Rejected Overclaims
- Newest KT model is best.
- LLM confidence equals mastery.
- LoRA/fine-tuning can store learner memory.
- Bandits can pick the whole curriculum immediately.
- Background agents can write learner state if prompted well.

## Sources
- Thinking Machines interaction models: https://thinkingmachines.ai/blog/interaction-models/
- Knowledge Tracing survey: https://arxiv.org/abs/2201.06953
- BKT / Corbett and Anderson DOI: https://doi.org/10.1007/BF01099821
- Logistic Knowledge Tracing: https://arxiv.org/abs/2005.00869
- Deep Knowledge Tracing: https://arxiv.org/abs/1506.05908
- AKT: https://arxiv.org/abs/2007.12324
- LPKT DOI: https://doi.org/10.1145/3447548.3467237
- Language-model LKT: https://arxiv.org/abs/2406.02893
- LLM-KT: https://arxiv.org/abs/2502.02945
- CIKT: https://arxiv.org/abs/2505.17705
- RAG-KT: https://arxiv.org/abs/2604.10960
- pyBKT: https://github.com/CAHLR/pyBKT
- pyKT toolkit: https://github.com/pykt-team/pykt-toolkit
- Vowpal Wabbit contextual bandits: https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/python_Contextual_bandits_and_Vowpal_Wabbit.html
- Retrieval practice study: https://pubmed.ncbi.nlm.nih.gov/16507066/
- Spacing effect meta-analysis: https://www.semanticscholar.org/paper/Distributed-practice-in-verbal-recall-tasks%3A-A-and-Cepeda-Pashler/634293f80f8e661dc259e4902bca99821bec3014

## Debate Position
BKT/logistic KT should be the auditable beta core, LLMs should be semantic
helpers, interaction state should be the personalization layer, and neural/LLM
KT should remain offline research challengers.
