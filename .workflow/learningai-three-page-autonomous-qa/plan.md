# LearningAI Three Page Autonomous QA

## Goal
Run a Graphify-first, multi-agent QA and fix workflow over the three primary app pages: Study, Analytics, and Revision.

Each page-owner agent audits its page for functional bugs, mobile/desktop UI issues, animation/performance risks, code-quality/refactor opportunities, and screenshot/grid visual problems. Agents may spawn nested subagents inside their own lane when available, but must keep ownership scoped to their assigned page.

## Success Criteria
- Study, Analytics, and Revision each receive an autonomous page audit.
- Each page agent uses Graphify before broad source reads.
- Each page agent performs live browser QA with desktop and mobile screenshots or equivalent viewport evidence.
- Any safe, high-confidence fixes are implemented directly in disjoint file ownership.
- Findings, screenshots, decisions, and residual risks are saved under this workflow.
- Final integration runs lint, build, browser smoke, and workflow verification.

## Current Context
- CWD: `/Users/mfuad16/Documents/LearningAI`.
- The app is running at `http://127.0.0.1:3100/`.
- The worktree is dirty from current in-progress LearningAI changes; agents must not revert unrelated edits.
- AGENTS.md requires Graphify-first navigation and avoiding broad repository reads before graph retrieval.

## Constraints
- Do not edit `graphify-out` artifacts.
- Keep page write scopes disjoint unless the main integrator explicitly reconciles a shared file.
- Do not make destructive git or filesystem changes.
- Do not deploy, publish, or touch external services.
- Preserve existing app product intent and visual language.
- For UI work, verify actual runtime behavior in browser at desktop and mobile widths.

## Risks
- Multiple agents may propose conflicting edits in shared files such as `App.tsx`, `Navigation.tsx`, `SettingsModal.tsx`, or global CSS.
- Broad refactors could destabilize the app; prefer small targeted fixes.
- Browser screenshots can reveal layout issues that are not obvious from source.
- Performance claims need evidence; do not overstate without timing, profiler, or concrete code reasoning.

## Approval Required
No extra approval required for local, non-destructive code edits and browser QA. Approval would be required for destructive git operations, deploys, dependency installation, external writes, or production data access.

## Work Packets
- `STUDY`: Owner for `src/views/StudyView.tsx` and directly connected Study-only components.
- `ANALYTICS`: Owner for `src/views/AnalyticsView.tsx` and directly connected Analytics-only components.
- `REVISION`: Owner for `src/views/RevisionView.tsx` and directly connected Revision-only components.
- `INTEGRATION`: Main agent reconciles results, resolves shared-file conflicts, and runs final verification.

## Integration Policy
Accept small, verified fixes that reduce bugs, overflow, jank, inaccessible controls, stale state, or obvious code risk. Reject speculative redesigns, broad rewrites, and changes that duplicate another lane. If two agents need the same shared module, the main integrator inspects and applies a single merged change.

## Verification
- `npm run lint`
- `npm run build`
- Browser smoke for Study, Analytics, Revision on desktop.
- Browser smoke for Study, Analytics, Revision at mobile width.
- Console error/warning check after navigation.
- `.workflow` completeness check.

## Reusable Artifacts
Save packet prompts, agent summaries, screenshots or screenshot paths, accepted/rejected changes, and final verification evidence in `.workflow/learningai-three-page-autonomous-qa`.
