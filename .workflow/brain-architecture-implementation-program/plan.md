# brain architecture implementation program

## Goal

Build the user-brain architecture one local, GitHub-pushable implementation slice at a time. The first coherent phase adds local observability foundations so Admin can track behind-the-scenes system activity, tool calling clarity, model behavior, memory/retrieval events, errors, and tuning-relevant meters without implementing AWS/cloud parts.

## Success Criteria

- Graphify-first navigation is documented before source edits.
- Sidecar lanes produce bounded, non-overlapping findings.
- Local telemetry captures system activity events with clear contracts for model, tool, retrieval, memory, and error states.
- Admin exposes useful local tabs/meters for the first observability slice.
- AWS/cloud work is explicitly deferred.
- Graphify code-architecture artifacts are regenerated only because this phase explicitly requests it.
- `npm run lint`, `npm run test`, `npm run build`, browser QA, and Graphify usability checks are recorded.
- Related changes are committed and pushed without staging unrelated user/agent work.

## Current Context

- Repo: `/Users/mfuad16/Documents/LearningAI`
- Branch: `main`
- Previous completed main commit: `c7f8092a6537ac4618d886567a7b71b341a57d44`
- Known dirty worktree item to preserve: `src/views/StudyView.tsx` PDF chip UI tweak.
- Known unrelated untracked workflow folders exist under `.workflow/`; they must not be staged or modified.
- Graphify CLI identified first-phase source surfaces: `src/views/AdminView.tsx`, `src/components/ChatPanel.tsx`, `src/store/index.ts`, `server.ts`, `src/memory/memory.orchestrator.ts`, `src/memory/longterm.memory.ts`, `src/memory/bkt.engine.ts`, `src/memory/memory.embeddings.ts`, `src/App.tsx`, and Graphify scripts/artifacts.

## Constraints

- Follow `AGENTS.md`: Graphify-first before large source reads, inspect only connected files, verify important graph claims against source.
- Preserve unrelated dirty worktree changes; do not revert user/other-agent edits.
- Do not manually edit `graphify-out`; regenerate with Graphify when updating graph artifacts.
- Do not install hooks or use Graphify watch mode.
- Defer AWS/cloud/deployment implementation until after beta testing.
- Keep the first phase coherent and local rather than attempting the entire architecture.

## Risks

- Admin/server/debug changes touch route/API contracts.
- Memory runtime changes can affect Dexie schema and durable local state.
- Chat streaming/parser changes can regress source-aware tutor output.
- Graphify artifacts can be stale or include unrelated historical nodes until regenerated.
- Browser QA can reveal layout or runtime issues that static gates miss.

## Approval Required

- No user approval needed for local, non-destructive source edits, local tests, local Graphify regeneration requested by the user, commit, and push.
- Ask before deleting/mass-renaming, force-pushing, deploying, touching secrets, or implementing AWS/cloud parts.

## Work Packets

- A: Architecture decomposition lane, read-only sidecar.
- B: Runtime telemetry/tool-call lane, local critical-path implementation.
- C: Admin observability UI lane, local critical-path implementation.
- D: Memory/brain runtime lane, read-only sidecar.
- E: Graphify freshness lane, read-only sidecar then local regeneration.
- F: QA/docs/git lane, read-only sidecar plus local verification/reporting.

## Integration Policy

- Sidecar lanes may read but not write.
- Local integration owns product-code writes for this phase.
- If sidecar findings conflict, verify against current source and choose the smallest change that advances observability without schema churn.
- Keep workflow results in `.workflow/brain-architecture-implementation-program/results/`.

## Verification

- Focused checks while editing.
- `npm run lint`
- `npm run test`
- `npm run build`
- Browser QA for Admin and affected Study/Chat/Revision surfaces.
- `npm run graphify:update` and `npm run graphify:tree` for code architecture graph artifacts.
- Graphify query smoke test after regeneration.
- `git diff`/`git status` review before staging.

## Reusable Artifacts

- `.workflow/brain-architecture-implementation-program/orchestration.md`
- `.workflow/brain-architecture-implementation-program/packets/*.md`
- `.workflow/brain-architecture-implementation-program/results/*.md`
- `.workflow/brain-architecture-implementation-program/final-report.md`

## Current Slice

- AAI: Generated-note preview lexical support. Add a conservative local
  summary-preview to source-preview matcher, surface coverage in Admin, refresh
  affected architecture/design guides, regenerate affected stored audio, verify,
  commit, and push.
- ABJ: Active-book PDF manifest context. Make shared typed-chat and live-voice
  packets include an inspectable active-book PDF manifest, ready/excerpted/
  pending/failed/omitted counts, server activity metadata, and Admin request
  timeline chips so multiple PDFs stay visible beyond the PDF on screen.
- ABK: Model-observation evidence gate. Make background learner-memory rows
  explicitly audit-only when they come from model summaries, surface the gate in
  Admin request timelines, and extend Beta Diagnostics from the eight-signal
  flow verifier to a nine-signal verifier that also checks model-observation
  gates.
- ABL: Durable background job ledger. Add a local IndexedDB background-job
  ledger for interaction-memory capture, record queued/running/completed/
  retry-scheduled/dead-letter states, surface the queue in Admin and Beta
  Diagnostics, and keep broader cloud/worker scheduling out of scope.
- ABM: Memory worker scheduler coverage. Route learning-book updates and
  graph-concept updates through the existing local background-job ledger,
  surface job-name mix in Admin, and document that cloud worker scheduling
  remains out of scope.
