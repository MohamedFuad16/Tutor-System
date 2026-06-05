# Codex Multi-Agent UI Test Plan (Extended)

Goal:
Verify Tutor system architecture end to end across UI, state, data, animation, API stubs, build/type safety, and Graphify architecture evidence.

Success criteria:
- Page coverage exists for Study, Analytics, Revision, and Admin.
- Component and element coverage is tracked for reusable components in `src/components`.
- State coverage includes Zustand routes, PDF state, settings, messages, usage, and provider-proof signals.
- Data coverage includes Dexie persistence for concepts, flashcards, learning books, documents, events, and trace-like ledgers.
- API coverage includes Express endpoints, SSE/chat streaming shapes, voice websocket/mock paths, OpenAI/Deepgram blocking or mock behavior, and web search stubs.
- Build/type coverage includes `npm run lint`, `npm run build`, and repo-native `npm test`.
- Visual coverage includes live browser checks for impacted screens at desktop and mobile viewports when UI behavior changes.
- No surface is marked complete until its tests are green or its gap is explicitly recorded with a next action.

Current context:
- Repo: `/Users/mfuad16/Documents/LearningAI`
- Graphify MCP appears stale for this checkout; it returned anime-provider nodes.
- Repo-local Graphify CLI with `graphify-out/graph.json` identified the relevant Tutor cluster.
- Current test runner is Node `node:test`, with esbuild pre-bundling in `npm test`.
- There is no current Vitest, jsdom, Testing Library, or Playwright package wiring in `package.json`.

Graphify-routed source cluster:
- Routes and shell: `src/App.tsx`, `src/components/Navigation.tsx`, `src/components/SettingsModal.tsx`
- Study: `src/views/StudyView.tsx`, `src/components/PdfViewer.tsx`, `src/components/ChatPanel.tsx`
- Analytics: `src/views/AnalyticsView.tsx`, `src/store/index.ts`
- Revision: `src/views/RevisionView.tsx`, `src/memory/revision.evidence.ts`, `src/memory/longterm.memory.ts`
- Admin: `src/views/AdminView.tsx`, `src/memory/beta.diagnostics.ts`, `server.ts`
- Shared UI: `src/components/PatternCard.tsx`, `src/components/PatternSVGs.tsx`, `src/components/SiriLiquidGlass.tsx`, `src/components/FloatingSkillsMenu.tsx`
- State/data: `src/store/index.ts`, `src/memory/longterm.memory.ts`, `src/memory/memory.orchestrator.ts`
- API/stubs: `server.ts`, `server/web-search.ts`, `src/lib/chatAgentTools.ts`, `src/lib/voiceAgentTools.ts`

Constraints:
- Use Graphify before broad repository reads.
- Do not manually edit `graphify-out` artifacts.
- Preserve local-only beta proof boundaries.
- Keep test additions compatible with the current repo unless a deliberate test-stack migration is approved.
- Avoid external provider calls in tests; mock or assert blocked/local behavior.

Risks:
- The user's requested 40-50 tests per component is larger than the current test infrastructure can absorb in one safe edit.
- UI runtime tests need additional dependencies or a browser harness; adding them changes project dependencies.
- Source-text assertions can guard architecture invariants but do not replace rendered component tests.
- Graphify MCP staleness is itself a workflow risk and must be reported separately from repo-local Graphify evidence.

Approval required:
- Adding new test dependencies such as Vitest, Testing Library, jsdom, or Playwright.
- Spawning a very large number of agents beyond the bounded lead-agent pass.
- Running destructive cleanup beyond existing package scripts.
- Any live provider test that would consume OpenAI, Deepgram, SerpAPI/Serper, or other external credits.

Work packets:
- P01 Study lead: upload, PDF viewer, annotations, tutor chat, React-PDF bounds.
- P02 Analytics lead: progress views, settings, usage and provider signals.
- P03 Revision lead: learning books, flashcards, artifact generation, paper UX invariants.
- P04 Admin/API lead: server logs, trace/debug views, SSE, websocket, provider stubs.
- P05 Component/element lead: reusable components, keyboard/ARIA/source-level coverage matrix.
- P06 Data/state lead: Zustand, Dexie schema/hooks, persistence/update coverage.
- P07 Build/Graphify lead: Vite build parity, TypeScript strictness gaps, Graphify local evidence.

Integration policy:
- Prefer repo-native `node:test` coverage for the first slice.
- Keep generated tests focused and stable.
- If a packet needs a new dependency, record it as a blocked extension unless approved.
- Integrate disjoint test files first, then update this plan and `final-report.md`.

Verification:
- `npm test`
- `npm run lint`
- `npm run build`
- Browser smoke only if UI source changes or a runnable browser harness is added.
- `graphify query ... --graph graphify-out/graph.json` for architecture routing evidence.

Reusable artifacts:
- Packet notes in `results/`
- Final evidence in `final-report.md`
