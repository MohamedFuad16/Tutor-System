# Final Report: User Brain Architecture Multi-Agent Deep Research Debate

## Outcome
The nested-capable multi-agent research workflow completed with four parallel
specialist lanes and a debate pass. The strongest shared conclusion:

LearningAI should be a cognitive tutor with an LLM interaction layer. The
foreground tutor should feel natural and responsive, but the learner brain must
remain a typed, temporal, replayable evidence ledger. BKT/logistic KT is the
auditable beta core; LLMs extract, explain, retrieve, generate, and propose;
Postgres is the authority; vectors, graph, S3, Dexie, and summaries are
projections or caches.

## Accepted Results
- App-native Thinking Machines pattern: foreground interaction tutor plus
  asynchronous background worker layer, not native interaction-model training.
- Evidence-first learner brain: no mastery update without EvidenceEvent,
  MasteryDelta, source/audit trace, and tenant scope.
- BKT/logistic KT for beta; DKT, AKT, LPKT, language-model LKT, LLM-KT, CIKT,
  and RAG-KT remain research/eval challengers.
- MemoryEvent -> LearnerMemory -> RetrievalContext pipeline with provenance,
  confidence, source refs, validity windows, correction, deletion, and rollback.
- Evidence facets for recall, explanation, procedure, near transfer, far
  transfer, confidence, calibration, latency, hints, and delayed retests.
- Postgres authority with projection consistency for pgvector, Neptune, S3,
  Dexie, caches, summaries, and graph edges.
- Cognitive load should actively choose teaching mode: worked example, faded
  scaffold, recall prompt, transfer challenge, or pause.
- Adaptive recommenders/bandits require propensities, alternatives, outcome
  labels, counterfactual evaluation, and exploration guardrails.

## Rejected Results
- Vector DB equals learner brain.
- LoRA/fine-tuning stores per-learner memory.
- LLM confidence, fluency, or generated summaries prove mastery.
- Background workers can safely write durable state if prompted well.
- Neptune or graph traversal is required for beta before a ledger exists.
- More chat history automatically creates better learner memory.
- Deleting a chat deletes all derived learner memory without explicit
  propagation.

## Conflicts Resolved
- P1 wanted separate mastery dimensions; P2/P3 warned about sparse beta data.
  Decision: store rich evidence facets now, but expose a simpler calibrated KT
  ledger until data supports separate authoritative scores.
- P4 wanted durable memory taxonomy; P2 warned about dual-write truth.
  Decision: Postgres event ledger is authority; memory summaries, graph facts,
  vectors, and artifacts are derived projections.
- P3 supported low-risk bandits; all agents warned about reward hacking.
  Decision: recommendation optimization is research/guarded beta only after
  logging propensities and outcomes.

## Verification Evidence
- Codex config verified:
  - `features.multi_agent = true`
  - `agents.max_depth = 2`
  - `agents.max_threads = 16`
  - `agents.job_max_runtime_seconds = 3600`
- Graphify query ran before repository reads.
- Four agents completed:
  - P1 Cognitive Modeling Fit: Mendel.
  - P2 Scalability: Meitner.
  - P3 Adaptiveness: Averroes.
  - P4 Long-Term Memory Formation: Hegel.
- Debate pass completed and saved to `results/debate-round.md`.
- Architecture book updated with accepted refinements in
  `src/lib/userBrainArchitectureBook.ts`.

## Remaining Risks
- Source docs and recent papers can drift; refresh before release decisions.
- The KT strategy still needs LearningAI-specific logs and calibration.
- Deletion propagation across backups and logs needs precise product/legal
  policy.
- Recommendation experiments can optimize easy wins unless outcome labels
  include delayed recall and transfer.
- Current code may still have direct mastery mutation paths; implementation
  should add hard evidence-event gates before cloud beta.

## Reusable Follow-up
- Implement runtime schemas: MemoryEvent, EvidenceEvent, LearnerMemory, ToolJob,
  ArtifactRecord, CitationState, MasteryDelta.
- Add durable queue semantics: idempotency, stale-result handling, DLQ, redrive,
  trace IDs, and projection replay.
- Add Memory UI controls: why remembered, edit, delete, mark wrong.
- Add source-grounding, KT calibration, cross-tenant, queue chaos, and deletion
  propagation tests.
