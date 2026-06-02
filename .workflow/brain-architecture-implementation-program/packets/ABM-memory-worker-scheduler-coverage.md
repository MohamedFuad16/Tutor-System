# Packet ABM: Memory Worker Scheduler Coverage

## Objective

Expand the local background-job ledger from interaction-memory capture to the
other already-local memory worker paths that run behind a chat, voice, or
document turn.

## Context

Packet ABL added `BackgroundJob` records, retry/dead-letter handling, Admin
visibility, and Beta Diagnostics blocking for interaction-memory capture. The
next useful local slice is to run learning-book updates and graph-concept
updates through the same ledger without introducing cloud queues, hooks, or
watch mode.

## Graphify Route

- `graphify query "BackgroundJob runBackgroundJob recordBackgroundJobEvent MemoryOrchestrator updateLearningBookFromConversation trackInteraction backgroundJobs AdminView beta diagnostics"`
- `graphify path "runBackgroundJob()" "MemoryOrchestrator"`
- `graphify path "updateLearningBookFromConversation()" "runBackgroundJob()"`
- `graphify query "learning book update concept update graph update memory.orchestrator background model summary recordModelSummaryEvidence model observation gate dead_letter background job"`

## Ownership

- Code: `src/memory/memory.orchestrator.ts`,
  `src/views/AdminView.tsx`, `tests/background-jobs.test.mjs`
- Docs/workflow: `README.md`, `TUTOR_ARCHITECTURE.md`,
  `src/lib/userBrainArchitectureBook.ts`, `src/lib/tutorBook.json`,
  `src/views/RevisionView.tsx`, workflow state/results
- Generated Graphify artifacts only after verification and explicit refresh

## Do

- Wrap `MemoryOrchestrator.updateLearningBookFromConversation()` with
  `runBackgroundJob()` while preserving its awaited caller behavior.
- Wrap `MemoryOrchestrator.addOrUpdateConcept()` with `runBackgroundJob()` for
  graph-concept update state.
- Keep model-summary mastery/confidence rows audit-only.
- Surface the job-name mix in Admin's Background Job Ledger.
- Update docs to say the local ledger covers interaction-memory, learning-book,
  and graph-concept memory workers.

## Do Not

- Add cloud queue infrastructure.
- Add background hooks or Graphify watch mode.
- Turn the background job table into a full append-only execution history.
- Revert unrelated workflow folders or the preserved StudyView PDF chip work.

## Expected Output

A local-only scheduler slice where Admin can see whether behind-the-scenes
interaction, learning-book, and graph-concept memory jobs are queued, running,
completed, retrying, or dead-lettered.

## Verification

- `npm run test`
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Beta/Background Job Ledger at desktop and mobile sizes
- Graphify refresh and smoke queries
