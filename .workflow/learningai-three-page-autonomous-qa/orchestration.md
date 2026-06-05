# Orchestration: LearningAI Three Page Autonomous QA

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.
- Every agent must follow AGENTS.md: Graphify-first, then read only directly connected files.
- Agents are not alone in the codebase. They must not revert unrelated edits and must adapt to concurrent changes.
- Nested subagents are allowed up to one level inside each page lane if the tool is available, but nested work must stay inside the lane.

## Branching Rules
- If a page agent finds no safe fix, it writes a detailed result with evidence and residual risks.
- If a page agent needs shared-file changes, it should report the proposed patch instead of editing the shared file unless the change is truly page-specific and low-risk.
- If visual QA finds overflow or overlap, prioritize a small responsive/layout fix over aesthetic redesign.
- If performance QA finds only speculative risk, report it as a recommendation rather than changing code.

## Packet Prompts
- STUDY: Audit and fix Study page runtime, UI, animation, performance, and code quality. Write scope: `src/views/StudyView.tsx` plus Study-only components if graph-confirmed.
- ANALYTICS: Audit and fix Analytics page runtime, charts, responsiveness, performance, and code quality. Write scope: `src/views/AnalyticsView.tsx` plus Analytics-only components if graph-confirmed.
- REVISION: Audit and fix Revision page reader/library/runtime, charts, responsiveness, performance, animation, and code quality. Write scope: `src/views/RevisionView.tsx` plus Revision-only helpers if graph-confirmed.

## Completion Audit
- Collect page-agent results under `results/`.
- Inspect diffs for ownership conflicts.
- Run lint/build.
- Run browser smoke across all three pages and mobile widths.
- Update `final-report.md` and `state.json`.
- Run workflow verifier.
