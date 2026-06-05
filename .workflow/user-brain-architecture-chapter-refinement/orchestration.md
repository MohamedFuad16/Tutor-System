# Orchestration: User Brain Architecture Chapter Refinement

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules
- Run agents in batches because config allows 16 parallel threads and the book
  has 18 chapters.
- Agents return suggestions or replacement markdown only; parent integrates.
- If two chapter suggestions conflict on terminology, prefer the wording used by
  Chapter 16 Final Deep Evaluation.
- If a chapter is already clear, agent should still improve headings,
  transitions, or examples where useful.

## Packet Prompts
- Each packet receives one chapter assignment and the source line range.
- Each packet must produce:
  - clarity score before/after;
  - audience notes;
  - proposed replacement markdown for that chapter;
  - any caveat that must be preserved;
  - one sentence explaining the chapter in plain English.

## Completion Audit
- All 18 chapter result files exist.
- Final book source updated and verified.
- Workflow final report records accepted/refused patterns.
