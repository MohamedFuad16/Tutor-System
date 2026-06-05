# P3 Debate: Interaction Maximalist

## Position
LearningAI needs a richer two-layer runtime: a visible tutor loop plus
asynchronous background retrieval, tool, evaluation, artifact, and learner-state
work.

## Strong Points
- A tutor should not be limited to one request-response turn.
- Existing models can approximate the interaction-model strategy through
  orchestration, not training.
- Background workers let sources, artifacts, and evaluation finish without
  freezing the learner-facing tutor.
- Multimodal tutoring should feel natural: charts, images, runnable code,
  websites, source cards, quizzes, and recall artifacts are ordinary tutor moves.

## Rebuttal Convergence
P3 accepted P4's limits: call it continuous tutor orchestration, prevent direct
background truth mutation, use canonical KT/scoring services, require tool
contracts, preserve hot-path fallbacks, and make privacy a core architecture
layer.
