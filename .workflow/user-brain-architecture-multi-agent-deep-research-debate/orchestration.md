# Orchestration: User Brain Architecture Multi Agent Deep Research Debate

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules
- If an agent finds a claim unsupported by high-trust sources, mark it as
  rejected or research-track only.
- If agents disagree, resolve by source strength first, then by product risk,
  then by implementation cost.
- If source drift is possible, preserve the URL and note the verification date.
- If nested subagents are unavailable inside a child thread, the agent must
  simulate level-two work by separating source notes into "academic",
  "industry", and "open-source" subsections.

## Packet Prompts
### P1 Cognitive Modeling Fit
Evaluate whether the User Brain Architecture fits learner cognition. Focus on
BKT, ACT-R style knowledge tracing roots, retrieval practice, misconception
repair, metacognition, cognitive load, spacing, transfer, and tutor timing.
Use academic papers first, then practical tutoring-system references. Challenge
the current architecture if it overclaims cognitive inference from pauses,
confidence language, or generated artifacts.

### P2 Scalability
Evaluate whether the architecture can scale technically. Focus on AWS/Aurora,
Postgres row-level security, pgvector, Neptune, S3, queues, EventBridge/SQS,
OpenTelemetry/CloudWatch, multi-tenant vector isolation, and open-source RAG or
agent systems. Challenge hidden bottlenecks and over-engineering.

### P3 Adaptiveness
Evaluate adaptive learning strategy. Compare BKT, logistic KT, DKT, AKT, LPKT,
language-model LKT, LLM-KT, CIKT, RAG-KT, bandits/recommendation, and runtime
interaction-state adaptation. Decide what belongs in beta versus research.

### P4 Long-Term Memory Formation
Evaluate how the tutor should form durable memory. Focus on episodic,
semantic, procedural, and reflective learner memory; summarization; retrieval;
forgetting; consolidation; privacy; and auditability. Compare AI memory
frameworks and open-source implementations where relevant.

### Debate Pass
After individual results, cross-feed summaries to all agents. Each agent must
respond with:

- one agreement;
- one disagreement;
- one architecture gap the others missed;
- one concrete recommendation to accept;
- one overclaim to reject.

## Completion Audit
- Four individual result files saved under `results/`.
- Debate responses saved under `results/debate-*.md`.
- Final synthesis saved in `final-report.md`.
- Workflow verification script passes.
