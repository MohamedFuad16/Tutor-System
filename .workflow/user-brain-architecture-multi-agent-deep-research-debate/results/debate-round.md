# Debate Round

## P1 Cognitive Modeling Fit
- Agreement: durable learner state must be a typed, auditable evidence ledger,
  with Postgres as authority and LLMs only proposing/extracting signals.
- Disagreement: BKT + logistic KT is incomplete unless delayed retrieval,
  calibration, misconception repair, and transfer evidence are first-class event
  types.
- Missed gap: cognitive load should control teaching mode in real time: worked
  example, faded scaffold, recall prompt, transfer challenge, or pause.
- Accept: implement MemoryEvent / EvidenceEvent / MasteryDelta contracts before
  expanding neural KT or cloud projections.
- Reject: learner memory improves automatically when more chat history is stored.
- Synthesis: use a cognitive-tutor architecture with an LLM interaction layer,
  bounded async workers, and a durable learner brain that only changes through
  typed evidence.

## P2 Scalability
- Agreement: beta should use an auditable evidence ledger with BKT/logistic KT
  and LLMs as semantic helpers.
- Disagreement: shipping every mastery dimension as first-class production score
  too early risks sparse data, noisy calibration, and expensive recomputation.
- Missed gap: projection consistency across Postgres, pgvector, Neptune, S3,
  queues, and caches under duplicate jobs, stale retries, partial failures, and
  replay.
- Accept: Aurora Postgres source-of-truth evidence ledger; derive mastery,
  memory summaries, vector rows, graph edges, and artifacts from typed,
  replayable events.
- Reject: LLM memory or background-agent judgment as durable learner truth
  without evidence contracts, tenant scope, idempotency, and audit trails.
- Synthesis: cognitive tutor product plus interaction-model runtime, scaled like
  a serious event system.

## P3 Adaptiveness
- Agreement: durable learner state must be evidence-led, not
  model-impression-led.
- Disagreement: mastery dimensions should begin as evidence facets feeding a
  simpler calibrated KT ledger, not all as authoritative beta scores.
- Missed gap: adaptive recommendations need logged propensities,
  counterfactual evaluation, and exploration guardrails.
- Accept: typed MemoryEvent / EvidenceEvent is the only write path into Postgres
  mastery and learner memory.
- Reject: LLM can infer mastery from fluent conversation.
- Synthesis: ship beta with cognitive-tutor-shaped LLM interface, Postgres
  authority, BKT/logistic KT, delayed retests, misconception lifecycle, and
  user-visible correction controls.

## P4 Long-Term Memory Formation
- Agreement: Postgres evidence ledger plus BKT/LKT/PFA-style auditable updates
  should be authority, while graph/vector/S3 remain projections.
- Disagreement: transfer-skill split should not become separate permanent memory
  types too early; store one evidence event and derive transfer/calibration
  views.
- Missed gap: memory deletion and correction propagation must invalidate derived
  summaries, graph facts, embeddings, mastery deltas, and tutor preferences.
- Accept: typed MemoryEvent -> LearnerMemory -> RetrievalContext pipeline with
  provenance, confidence, source refs, tenant scope, and rollback.
- Reject: "the tutor remembers the learner" unless every durable remembered fact
  can explain why it exists and how to remove it.
- Synthesis: local-first, cloud-authoritative later, with user-visible memory
  controls, delayed retests, misconception lifecycle, tenant isolation,
  idempotent queues, and deletion propagation as launch requirements.
