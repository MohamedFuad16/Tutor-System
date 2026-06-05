# User Brain Architecture Multi Agent Deep Research Debate

## Goal
Run a nested-capable, parallel multi-agent research workflow that evaluates the
User Brain Architecture strategy, Thinking Machines interaction-model strategy,
and knowledge-tracing options from four different angles:

- cognitive modeling fit;
- scalability;
- adaptiveness;
- long-term memory formation.

The workflow must use different source families across agents: academic papers,
industry documentation/case studies, and open-source implementation patterns.
Agents will research individually, debate the findings, and synthesize a final
strategy recommendation.

## Success Criteria
- Codex config confirms multi-agent mode, max nesting depth 2, and parallel
  thread capacity.
- Four specialist agents run in parallel with disjoint research mandates.
- Each agent cites primary or high-trust sources and flags weak/speculative
  claims.
- Debate round cross-feeds findings so agents can challenge each other's
  assumptions.
- Final synthesis identifies accepted recommendations, rejected overclaims,
  unresolved risks, and concrete refinements for `src/lib/userBrainArchitectureBook.ts`.
- Workflow artifacts contain packet prompts, agent outputs, debate notes, and
  final conclusion.

## Current Context
- Repo: `/Users/mfuad16/Documents/LearningAI`.
- Current book: `src/lib/userBrainArchitectureBook.ts`.
- Relevant app areas from Graphify: `src/memory/longterm.memory.ts`,
  `src/memory/memory.orchestrator.ts`, `src/components/ChatPanel.tsx`,
  `src/views/RevisionView.tsx`, and `src/lib/interactionModel.ts`.
- Config verified:
  - `features.multi_agent = true`
  - `agents.max_depth = 2`
  - `agents.max_threads = 16`
  - `agents.job_max_runtime_seconds = 3600`
- Graphify was queried before source reads, as required by `AGENTS.md`.

## Constraints
- No destructive repo history operations.
- No production data, credentials, deployment, or external writes.
- Prefer primary sources: papers, official docs, mature open-source repos, and
  credible industry architecture case studies.
- Treat newest KT papers as candidates, not production truth, until evaluated on
  LearningAI data.
- Subagents may use nested subagents only if their environment exposes that
  capability; otherwise they must simulate the second level with isolated notes.

## Risks
- Fast-moving model/platform docs can drift.
- Academic KT claims may not transfer to LearningAI's learner population.
- Open-source implementations may demonstrate patterns but not prove product fit.
- Too much architecture can slow beta unless tied to a concrete implementation
  gate.

## Approval Required
No approval required for read-only research and local workflow artifacts. Ask
before code edits beyond documentation/book refinements.

## Work Packets
- P1 Cognitive Modeling Fit: Does the architecture match how learner knowledge,
  misconception repair, retrieval practice, and cognitive state evolve?
- P2 Scalability: Can the architecture scale across cloud storage, queues,
  vector retrieval, graph traversal, observability, and tenant isolation?
- P3 Adaptiveness: Which KT models and interaction strategies best support
  real-time adaptation without unsafe model drift?
- P4 Long-Term Memory Formation: How should episodic, semantic, procedural, and
  reflective learner memory form over time?

## Integration Policy
Accept claims only when supported by source evidence and practical LearningAI
constraints. Reject claims that conflate model fine-tuning with learner memory,
vector retrieval with truth, or background agents with unlimited authority.

## Verification
- Workflow verification script.
- Source-link and citation sanity check.
- If book edits are made: `npm run lint`, `npm run build`, and browser smoke.

## Reusable Artifacts
- Multi-agent debate workflow structure for future architecture evaluations.
- Final recommendation table for User Brain Architecture refinement.
