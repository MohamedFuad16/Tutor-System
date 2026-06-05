# Orchestration: OpenAI Support Guidance Architecture Update

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules
- Launch all 12 agents in parallel because the user explicitly requested the
  swarm and the lanes are disjoint.
- Leaders synthesize within their team topic.
- Researchers dig into technical evidence and practical architecture choices.
- Verifiers focus on URL validity, citations, and contradiction checks.
- Parent orchestrator integrates all results and resolves conflicts.
- If OpenAI docs MCP is unavailable in-agent, use official OpenAI web docs as
  fallback for OpenAI-specific claims.

## Packet Prompts
- T1-L: model/fine-tuning/RAG/Evals leader.
- T1-R: model/fine-tuning/RAG/Evals researcher.
- T1-V: model/fine-tuning/RAG/Evals citation verifier.
- T2-L: learner-state/adaptive learning leader.
- T2-R: learner-state/adaptive learning researcher.
- T2-V: learner-state/adaptive learning citation verifier.
- T3-L: voice/realtime leader.
- T3-R: voice/realtime researcher.
- T3-V: voice/realtime citation verifier.
- T4-L: beta/integration leader.
- T4-R: beta/integration researcher.
- T4-V: beta/integration citation verifier.

## Completion Audit
- 12 agents launched.
- All team outputs collected.
- Public URLs validated or flagged.
- Support-email guidance reflected accurately.
- Final report states accepted/rejected/deferred decisions.
- Final workflow verification passes.
