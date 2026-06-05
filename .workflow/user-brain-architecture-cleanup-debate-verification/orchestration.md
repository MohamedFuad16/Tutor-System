# Orchestration: User Brain Architecture Cleanup Debate Verification

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules
- If P2 finds a broken or weak source, replace the claim/source or remove the
  claim.
- If P3/P4 disagree, forward each agent's strongest argument to the other for
  rebuttal, then send both arguments and rebuttals to P5.
- If a chart is accurate but visually dense, prefer simplifying the chart over
  adding another explanation layer.
- If a source is valid but not primary enough, prefer the primary source in the
  book and record the secondary source in the workflow notes only.

## Packet Prompts
- P1: Audit the current book's chapter order, plain-English explanation quality,
  Mermaid diagrams, image usage, and reader polish. Return actionable edits.
- P2: Verify citations and claims against primary or high-quality sources:
  Thinking Machines interaction models, OpenAI docs, AWS docs, and KT research.
- P3: Defend a stronger continuous two-layer runtime for the tutor. Bring
  sources and implementation contracts.
- P4: Defend a simpler reliability-first runtime. Bring sources and failure
  modes.
- P5: Produce the final evaluation: accepted ideas, rejected ideas, required
  wording changes, and remaining risks.

## Completion Audit
- All five packet results captured under `results/`.
- Debate exchange captured, not just independent notes.
- Accepted edits integrated into source.
- Verification checks recorded in `final-report.md`.
