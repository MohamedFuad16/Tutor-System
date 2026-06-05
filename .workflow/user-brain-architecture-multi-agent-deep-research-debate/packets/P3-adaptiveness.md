# Packet P3: Adaptiveness

## Objective
Evaluate which adaptive learning strategy best fits LearningAI without
continuous model drift or unsafe personalization.

## Source Focus
- BKT, logistic KT, DKT, AKT, LPKT, language-model LKT, LLM-KT, CIKT, RAG-KT.
- Recommendation/bandit approaches for next activity selection.
- Interaction-model adaptation: foreground timing, background tools, and
  validated mastery updates.

## Expected Output
- Best beta strategy for adaptation.
- Which models belong in research/eval lanes.
- How to combine KT, retrieval, interaction state, and tool calls.
- Evaluation metrics and datasets needed.
- Debate-ready summary with URLs/citations.

## Rules
- Newest is not automatically best.
- Prioritize auditability and calibration for beta.
- Nested subagents: use at most one if available; otherwise split notes into
  KT papers, interaction adaptation, and product strategy subsections.
