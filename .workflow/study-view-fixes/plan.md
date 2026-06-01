# study view fixes

## Goal
Implement a cohesive Study, Revision, and Chat synchronization upgrade:
book-scoped persistent chat threads, library-driven chat context, refresh
restoration, multi-PDF book contexts, clean UI switching/removal, README
documentation, verification, commit, and push.

## Success Criteria
- Each learning book, including General Study, has exactly one persistent chat
  conversation loaded whenever that book is active.
- Switching books updates visible messages and injected context without leaking
  previous chats from other books.
- Refresh restores the last active book, its selected conversation, and its
  selected PDF.
- Books support multiple PDF documents with add, select, view, and remove flows.
- Chat, memory orchestration, and document context injection receive all active
  PDFs for the current book in parallel where the runtime supports context.
- Revision/library opening and title/context changes keep the same book identity
  as Study and Chat.
- README documents the new book-scoped chat and multi-PDF workflow.
- `npm run lint`, `npm run build`, focused persistence checks, and browser QA
  for desktop/mobile Study, Revision, and Chat flows are recorded.
- The final code is committed and pushed after verification.

## Current Context
- Repo: `/Users/mfuad16/Documents/LearningAI`.
- User provided AGENTS.md rules: Graphify-first before broad reads, inspect only
  connected files, do not edit `graphify-out`, and preserve unrelated dirty
  worktree changes.
- Initial Graphify query routed the work through:
  `src/components/ChatPanel.tsx`, `src/views/StudyView.tsx`,
  `src/views/RevisionView.tsx`, `src/components/PdfViewer.tsx`,
  `src/store/index.ts`, `src/memory/longterm.memory.ts`, and
  `src/memory/memory.orchestrator.ts`.
- Worktree was already dirty before this workflow started. Existing edits in
  Study, Revision, Chat, Analytics, index.html, and user brain files must be
  preserved unless directly necessary to integrate.

## Constraints
- Use Graphify as decision support before broad repository reads.
- Read only directly connected files needed for the current lane.
- Do not manually edit `graphify-out`.
- Avoid destructive git operations and do not revert user or other-agent edits.
- Keep Dexie migrations, Zustand state, SSE/chat parser behavior, and server API
  contracts conservative.
- Prefer stable IDs over titles for book, PDF, and conversation identity.

## Risks
- Dexie schema changes can break persisted user data if migrations are loose.
- Chat streaming save/load behavior is high risk because visible messages,
  memory updates, and tutor prompt injection share this surface.
- Existing dirty edits may already contain partial book or architecture work.
- Multi-PDF context can become expensive or noisy if all text is injected without
  limits.
- Browser QA can be flaky if dev server state or IndexedDB old data conflicts
  with migration paths.

## Approval Required
- No extra approval is required for local source edits, verification, commit, or
  normal push because the user explicitly requested them.
- Stop and report if the current branch/remote/auth state would require a branch
  choice, force push, destructive reset, credential change, or non-standard GitHub
  action.

## Work Packets
- A: Data model and persistence. Owns Dexie schema/migrations, book/PDF/chat
  linking, refresh restoration contracts, and focused persistence tests.
- B: Chat/runtime. Owns chat load/save behavior, book-scoped conversation
  selection, prompt/context injection, memory orchestrator calls, and smooth
  transitions.
- C: Study/PDF. Owns multi-PDF add/select/remove UI, active PDF state, viewer
  wiring, and document context extraction.
- D: Revision/library. Owns book selector/opening behavior, library identity
  sync, generated artifact/book IDs, and title/context updates.
- E: QA/docs/git. Owns README update, verification evidence, browser screenshots,
  final report, commit, and push.

## Integration Policy
- Main agent integrates all code after packet findings to avoid overlapping
  writes across the high-risk Chat/Store/Dexie surfaces.
- Subagents may perform read-only or clearly disjoint work. Any worker edits must
  list changed files and avoid reverting concurrent changes.
- Conflicts are resolved against live source and product requirements, not older
  memory or generated artifacts.

## Verification
- Graphify query/path has already identified the initial connected files.
- Run focused static checks or tests for persistence and migration behavior when
  practical.
- Run `npm run lint` and `npm run build`.
- Run LearningAI brain freshness checks required by the repo workflow if source
  changes touch memory/Revision surfaces.
- Start or reuse the local app and perform desktop/mobile browser QA at
  `http://127.0.0.1:3100` for Study, Revision, Chat, refresh restoration,
  book switching, and multi-PDF add/select/remove.
- Record screenshot paths and console observations in `final-report.md`.

## Reusable Artifacts
- Keep lane packets and final report under `.workflow/study-view-fixes/` for
  future book-context synchronization work.
