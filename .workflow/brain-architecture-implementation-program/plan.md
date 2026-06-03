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
- ABN: Chat/voice thread persistence observability. Emit durable local memory
  evidence when book-scoped typed-chat and voice transcript threads are saved,
  surface saved thread rows in Admin Memory and diagnostics export, and extend
  Beta Diagnostics to require both chat and voice transcript-persistence proof.
- ABO: Request-correlated transcript persistence. Stamp typed-chat and
  live-voice transcript messages with request/session IDs, include those IDs in
  `book_chat_thread_saved` memory rows, make Beta Diagnostics require
  request-correlated transcript persistence, and surface saved-transcript rows
  in Admin request timelines.
- ABP: Rehearsal live-gap proof surface. Make the Admin synthetic wiring
  rehearsal compare its in-memory eleven-signal pass against live local ledger
  coverage, expose provider-key readiness, and show the rehearsed chat/voice
  request IDs, multi-PDF context IDs, and tool contracts.
- ABQ: Live multi-PDF beta proof gate. Extend Beta Diagnostics to require
  request-correlated typed-chat and live-voice context rows whose active-book
  prompt context included excerpts from more than one ready PDF, update Admin
  and architecture/design copy to the thirteen-signal contract, and keep
  provider-key traffic out of scope.
- ABR: Live brain-flow signal anchors. Make each Beta Diagnostics brain-flow
  signal expose compact live request ids, row sources, latest timestamps, and
  context PDF ids so Admin can prove which ledger rows satisfied each gate
  without exposing raw prompt context.
- ABS: Dual-agent tool contract and playback clarity. Strengthen the synthetic
  brain wiring rehearsal from shared tool-name parity to shared required-schema
  parity, expose the result in Admin, simplify the Admin activity paragraph,
  and keep audio overview retry/fallback behavior hidden inside the single
  visible player.
- ABT: Provider-key live proof checklist. Add a local Admin checklist that
  separates provider-key setup, live-run availability, and complete
  request-correlated chat/voice ledger proof without calling providers or
  treating synthetic rehearsal rows as beta evidence.
- ABU: Stored audio duration evidence. Store measured audio guide seconds in the
  manifest, dry-run output, artifact provenance, local verifier, tests, and
  architecture books so the 3-4 minute guide promise is locally checkable.
- ABV: Coherent live proof bundle. Require provider-key proof to show one
  complete typed-chat request and one complete live-voice request sharing the
  same local book/thread and multi-PDF context, so scattered green rows cannot
  masquerade as one working beta flow.
- ABW: Active-book PDF retrieval hint. Make the shared chat/voice brain-context
  path add active and companion PDF hints to semantic retrieval, simplify Admin
  preface copy, and lock stored audio overview fallback inside one visible
  player with browser QA evidence.
- ABX: Live beta proof runbook. Derive an ordered manual runbook from the
  provider-key proof checklist, render next-step blockers/evidence in Admin,
  include it in the local diagnostics export metadata, and verify desktop/mobile
  Admin Beta Diagnostics without running provider traffic.
- ABY: Beta diagnostics provider-meter freshness. Keep local system-activity
  provider meters warm while Beta Diagnostics is active, render provider-meter
  freshness beside the Provider-Key Live Proof chips, and verify desktop/mobile
  Admin continues polling the local debug endpoint after entering Diagnostics.
- ABZ: Provider-key fallback guard. Require completed model rows, not fallback
  rows, for the coherent provider-key chat/voice proof bundle while preserving
  fallback rows in aggregate local diagnostics and verifying the Admin proof
  warning on desktop/mobile.
- ACA: Coherent request bundle row detail. Expose selected typed-chat and
  live-voice request row counts for context, retrieval, completed model, tool,
  mastery, transcript, and background memory evidence so the live beta run can
  reveal the exact missing stage.
- ACB: Model run phase ledger IDs. Preserve started, fallback, completed,
  blocked, and failed model-run rows separately for one request/model so Admin
  proof detail can diagnose provider fallbacks without overwriting completed
  rows.
- ACC: Live proof freshness window. Require coherent chat+voice beta proof rows
  to fit one local proof window and stay fresh relative to the Admin diagnostics
  snapshot, so old local ledger history cannot pass as a current provider-key
  run.
- ACG: Provider-key live proof drill packet. Convert the provider-key runbook
  into exact local typed-chat and live-voice proof prompts, expected ledger rows,
  blockers, setup/run/export instructions, Admin UI, diagnostics export
  metadata, browser QA, and regenerated Graphify artifacts without auto-calling
  providers or starting AWS/cloud work.
- ACH: Voice proof-attempt system activity. Preserve the deliberate
  provider-key proof attempt id in server-side voice websocket system-activity
  rows for auth, context injection, provider readiness, tool requests, tool
  completions, and close events so Admin can correlate the voice proof timeline
  without provider/cloud automation.
- ACI: Latched voice proof-attempt metadata. Latch the selected provider-key
  proof attempt id when live voice starts, then reuse that session identity for
  voice context, websocket auth, model rows, tool rows, transcript turns, and
  background learner-memory writes so a mid-session Admin selection change
  cannot split the coherent voice proof bundle.
- ACJ: Live provider row proof. Make coherent provider-key proof distinguish
  completed model rows from real provider-ready evidence: typed chat requires a
  completed OpenRouter-backed row, live voice requires the server-side Deepgram
  `Voice provider ready` row, and local mock voice provider rows stay visible
  without satisfying provider-key proof.
- ACK: Provider proof capture details. Add compact selected-provider capture
  details to coherent proof bundles and Admin Beta Diagnostics so local beta
  export/review can see the exact OpenRouter or Deepgram evidence row without
  showing keys, auto-calling providers, or counting fallback/mock rows.
- ACL: Live provider proof receipt. Package the coherent chat+voice
  provider-key proof into a local Admin/export receipt with selected request
  ids, proof attempt ids, provider capture details, freshness/window state, and
  local-only warnings, without calling providers or starting AWS/cloud work.
