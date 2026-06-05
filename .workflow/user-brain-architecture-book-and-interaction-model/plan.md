# User Brain Architecture Book And Interaction Model

## Goal
Verify the existing OpenAI-support architecture report with exactly three subagents, research Thinking Machines' interaction-model architecture, implement the same strategy in LearningAI at the interaction layer, and publish a clean multi-chapter in-app book named **User Brain Architecture**.

## Success Criteria
- Exactly three subagents are launched and mapped to fact check, source verification, and interaction-model logic.
- Findings from the prior final report, orchestration, team lead notes, support emails, and Thinking Machines article are consolidated into a cited multi-chapter report.
- The report is available as a built-in readable book in Revision/Library named "User Brain Architecture".
- The app gains an interaction-model layer that tracks micro-turn-like learner state and packages it for tutor responses without changing cross-user isolation.
- Workflow artifacts, lint, and build are verified or failures are documented.

## Current Context
- Prior architecture reports live under `.workflow/adaptive-learning-brain-architecture/` and `.workflow/openai-support-guidance-architecture-update/`.
- The target report for verification is `.workflow/openai-support-guidance-architecture-update/final-report.md`.
- The app already supports built-in Revision books via `src/views/RevisionView.tsx` and JSON chapter files in `src/lib/`.
- Graphify identified `RevisionView.tsx`, `src/lib/tutorBook.json`, `ChatPanel.tsx`, `src/store/index.ts`, and memory orchestrator files as the nearest relevant nodes.
- Thinking Machines' article argues for time-aligned micro-turn interaction models plus an asynchronous background model, which maps naturally to a lightweight tutor interaction layer plus existing background learner-memory updates.

## Constraints
- Follow `AGENTS.md`: use Graphify before broad reads and avoid editing `graphify-out`.
- Use exactly three subagents for the requested verification/research lanes.
- Keep code edits scoped to the smallest connected surface.
- Do not rewrite learner-memory schemas or server APIs unless necessary.
- Use proper citations and avoid long verbatim excerpts from web sources.

## Risks
- OpenAI model docs are date-sensitive; current docs must be treated as the source of truth where cited.
- The Thinking Machines article describes a native model architecture, not a drop-in app harness; implementation must adapt the strategy without overclaiming parity.
- `ChatPanel.tsx` is high-risk because it contains streaming parser and tool handling.
- Static in-app book content can become stale; include a dated citation appendix.

## Approval Required
No external writes, destructive commands, deployments, billing, credentials, or production data changes are planned. No approval gate is required for local source edits, subagent research, lint, build, or local workflow artifacts.

## Work Packets
- P1 Fact Check: Verify claims in the OpenAI-support final report against the support emails, prior architecture report, and app source where relevant.
- P2 Source Verification: Verify URLs/citations in the prior report and new book, including OpenAI docs and Thinking Machines article.
- P3 Interaction Logic: Deeply analyze Thinking Machines' interaction-model strategy and map it to LearningAI implementation choices.

## Integration Policy
Accept only claims supported by cited sources, local artifacts, or live source. Treat unsupported or ambiguous claims as caveats in the book. The main agent owns all final code edits and resolves packet conflicts by checking authoritative source.

## Verification
- Dynamic workflow artifact check with `verify_workflow.py`.
- `npm run lint`.
- `npm run build`.
- Browser smoke test for the in-app book when the dev server is available.

## Reusable Artifacts
The completed workflow directory should remain as a repeatable recipe for future architecture-report-to-in-app-book conversions.
