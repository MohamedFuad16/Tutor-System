# Orchestration: User Brain Architecture Validation Expansion

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules

## Packet Prompts

## Completion Audit
# Orchestration

## Sequence
1. Use Graphify to identify connected files before reading code.
2. Spawn five read-only research/validation agents.
3. Main agent reads only the connected implementation files and current book.
4. Main agent researches unstable sources directly where needed and updates the book plus link rendering.
5. Integrate subagent results into `results/` and `final-report.md`.
6. Run lint, build, workflow verification, and browser smoke tests.

## Agents
- P1 citation verifier: source URLs, clickable citation strategy, article references.
- P2 interaction architect: continuous tutor agent, background tool agents, voice pauses, media/code/chart/web outputs.
- P3 cloud architect: AWS brain migration using EC2/compute, Neptune, Postgres/pgvector, S3.
- P4 learning-model researcher: BKT, DKT, LKT, LLM-KT, CIKT, RAG/KG KT recommendations.
- P5 reader editor: simplify structure for non-expert readers while preserving technical depth.

## Branching Rules
- If a research source is not primary or stable, use it only as context and prefer arXiv/official docs.
- If agents disagree, prefer the primary source and local source evidence.
- If browser cannot open external links due client blocking, verify URL presence in DOM and use web/curl where possible.
