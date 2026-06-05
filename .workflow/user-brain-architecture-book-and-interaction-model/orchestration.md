# Orchestration: User Brain Architecture Book And Interaction Model

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
1. Read current Graphify context and only the connected source files needed for the requested implementation.
2. Launch exactly three subagents:
   - P1: fact check the OpenAI-support report.
   - P2: verify sources and citation health.
   - P3: research/adapt the Thinking Machines interaction-model strategy.
3. While subagents run, implement the in-app book surface and a minimal interaction-model layer locally.
4. Wait for subagents, integrate accepted findings, and write result summaries under `results/`.
5. Consolidate the previous architecture reports, support guidance, orchestration findings, and article research into `src/lib/userBrainArchitectureBook.json`.
6. Run workflow, lint, build, and browser checks.

## Branching Rules
- If a source URL is unavailable but the claim is non-critical, keep the claim with a caveat and avoid using it as a decision gate.
- If OpenAI docs conflict with support-email language, prefer current official docs and record the conflict.
- If the Thinking Machines article describes model-native behavior that cannot be implemented in this app, adapt it as an interaction-layer pattern and label it as an approximation.
- If lint/build fails from unrelated pre-existing code, document the failure and isolate touched-file errors before deciding whether to fix.

## Packet Prompts
Packet prompts are saved in `packets/`. Workers must not edit source files unless explicitly instructed; they should return concise, source-grounded findings for integration.
