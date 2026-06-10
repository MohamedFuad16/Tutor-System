# LearningAI architecture books admin brain and revision cleanup

## Goal

Turn the Revision library, architecture books, Admin dashboard, fullscreen chat,
and generated learning books into one coherent product that a motivated
teenager can understand without reducing the technical depth.

## Success Criteria

- Tutor System Architecture chapters are reorganized and rewritten in clear
  language, with an explicit current-state/completion chapter.
- User Brain Architecture chapters are renamed and rewritten around the actual
  learner model, evidence boundaries, goals, and implementation status.
- App Design Language component maps have readable spacing, linked citations,
  a complete glossary, and a clear explanation or removal of local beta
  controls.
- Admin shows only decision-useful views and explains what each view means.
- Admin can select a learner and inspect that learner's knowledge graph,
  mastery, misconceptions, and learning patterns.
- Chat can become fullscreen even when no PDF is loaded.
- Generated learning books read like revision material with explanations,
  examples, diagrams, and code where the studied subject needs them.
- Cleanup removes only verified dead/obsolete code or files and preserves all
  unrelated user changes.
- Focused tests, typecheck, build, postchange, and rendered UI checks pass.

## Current Context

- The worktree is already dirty from voice architecture work and other user
  changes; unrelated edits must be preserved.
- Graphify MCP is attached to the wrong project. Local
  `graphify-out/graph.json` is the architecture authority.
- The connected in-app browser blocks both `localhost:3001` and
  `127.0.0.1:3001` with `ERR_BLOCKED_BY_CLIENT`; rendered validation must use
  the repo's Playwright/test fallback unless browser access recovers.
- `brain:postchange` exists and passes. The older `brain:debug` and
  `brain:ui-regression` scripts referenced by the generic debug skill are not
  present in this checkout.

## Constraints

- Follow AGENTS.md: Graphify first, then directly connected files only.
- Do not regenerate or manually edit `graphify-out`.
- Keep architecture graph concepts separate from the learner-facing brain.
- Keep Admin operational and scannable rather than turning it into a marketing
  page.
- Do not delete files without evidence that they are unused or generated.

## Risks

- Architecture books may describe contracts the runtime does not yet enforce.
- AdminView and RevisionView are large shared surfaces with broad tests.
- Learning-book schema and Dexie migrations are high-risk boundaries.
- Fullscreen chat must not break PDF study mode or mobile layout.
- Broad cleanup could accidentally remove user-owned worktree changes.

## Approval Required

- No external writes or deployment.
- Destructive file deletion is gated by an evidence-backed cleanup report. No
  ambiguous files will be deleted automatically.

## Work Packets

1. Architecture books and citations:
   `src/lib/tutorBook.json`, `src/lib/userBrainArchitectureBook.ts`,
   `src/views/RevisionView.tsx`, architecture readiness tests.
2. Design language and component map:
   `src/views/RevisionView.tsx` and directly connected design components.
3. Admin simplification and per-user brain:
   `src/views/AdminView.tsx`, learner-memory read APIs, navigation tests.
4. Fullscreen chat:
   `src/views/StudyView.tsx`, `src/components/ChatPanel.tsx`, store/types and
   rendered study-flow tests.
5. Generated revision books:
   `src/memory/memory.orchestrator.ts`, learning-book types, Revision rendering,
   and focused memory tests.
6. Cleanup and verification:
   changed-work audit, dead-code evidence, tests, build, postchange, and
   Playwright fallback.

## Integration Policy

Prefer existing schemas, state, components, and visual language. Keep edits
inside established ownership boundaries. Integrate only changes that are
supported by live source and focused tests.

## Verification

- Focused source-contract and rendered tests per packet.
- `npm run test:node`
- relevant Vitest DOM tests
- `npm run lint`
- `npm run build`
- `npm run brain:postchange -- --reason architecture-admin-revision-cleanup`
- rendered desktop/mobile Playwright checks with console and overflow evidence.

## Reusable Artifacts

- This workflow directory.
- A concise final report with accepted changes, cleanup evidence, and remaining
  implementation gaps.
