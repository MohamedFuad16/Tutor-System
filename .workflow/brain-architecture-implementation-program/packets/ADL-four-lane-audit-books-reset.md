# Packet ADL: Four-Lane App Audit, Books, and Clean Brain Reset

## Objective

Run a four-agent implementation program after the voice-stage fix:

1. Audit Study view behavior, UI, PDF flow, and directly connected backend/state.
2. Audit Revision view behavior, book reader, flashcards, stored audio, and directly connected backend/state.
3. Audit Analytics view behavior, charts, responsive states, and directly connected backend/state.
4. Deep-audit brain architecture, two-agent orchestration, memory/context injection, built-in books, audio overview generation, and the safe reset path for local user history.

The user requested first three agents by page and a fourth deep brain lane. The
same message also mentioned extra book-rewrite and cleanup agents; this packet
keeps the hard cap at four primary agents and folds those responsibilities into
lane 4 plus main-agent integration.

## Constraints

- Follow AGENTS.md: Graphify-first before source inspection, inspect directly
  connected files only, and do not edit `graphify-out` by hand.
- Do not start AWS/cloud work.
- Preserve unrelated untracked `.workflow/*` directories.
- Do not wipe local user history until after verification. Data cleanup is a
  destructive end-of-run action and must remain explicitly scoped to local app
  data.
- Subagents may spawn up to two child subagents if their runtime exposes that
  ability, but they must preserve their assigned write scopes and report any
  child outputs clearly.

## Primary Lanes

### ADL-1 Study View

- Owner: subagent worker.
- Write scope: `src/views/StudyView.tsx`, `src/components/PdfViewer.tsx`, and
  focused tests only if needed.
- Must audit upload, multi-PDF, PDF page focus, chat side effects, responsive
  layout, keyboard/click paths, errors, and directly connected store/memory
  contracts.
- Must not edit Revision, Analytics, books, or memory architecture.

### ADL-2 Revision View

- Owner: subagent worker.
- Write scope: `src/views/RevisionView.tsx`, `src/lib/chapterAudioOverviews.ts`,
  revision/audio focused tests only if needed.
- Must audit built-in book cards, reader navigation, flashcards, stored audio
  playback controls, empty/error states, responsive layout, and directly
  connected persistence.
- Must not rewrite book source content in this lane; book rewrite is lane 4.

### ADL-3 Analytics View

- Owner: subagent worker.
- Write scope: `src/views/AnalyticsView.tsx` and analytics focused tests only if
  needed.
- Must audit chart rendering, Dexie concept data states, empty/loading/error
  states, responsive layout, accessibility, and direct connected helpers.
- Must not edit Study, Revision, Chat, Admin, or memory architecture.

### ADL-4 Brain, Books, Audio, Reset

- Owner: subagent worker.
- Write scope: initially read-only for audit; safe fixes may target
  `src/memory/*`, `src/lib/userBrainArchitectureBook.ts`,
  `src/lib/tutorBook.json`, `src/lib/chapterAudioOverviews*`,
  `scripts/*audio*`, focused tests, and workflow evidence.
- Must inspect whether chat/voice have a tutor layer plus background
  tool-calling/memory layer, whether local memory is stored and injected into
  chat/voice, whether built-in books explain the current app implementation
  accurately, and how to safely reset local user history after verification.
- Must not perform the destructive data wipe itself.

## Main Agent Responsibilities

- Keep critical-path integration local.
- Resolve cross-lane conflicts.
- Run final verification gates after integrated fixes.
- Generate Deepgram audio overviews only if required credentials and disk space
  are available; never print raw provider keys.
- After verification, perform the local app-data reset only if the wipe target
  is explicit and limited to user history/brain data.

## Verification Target

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run brain:postchange -- --reason four-lane-audit-books-reset --full`
- Browser QA for Study, Revision, Analytics, and relevant Chat/Voice/Admin
  surfaces.
- Workflow final report updated with accepted fixes, rejected findings,
  verification evidence, and reset evidence.
