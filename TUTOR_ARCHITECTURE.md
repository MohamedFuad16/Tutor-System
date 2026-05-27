# Tutor System Architecture

This document is the human-readable architecture book for Tutor. The generated `/brain` artifacts remain the executable source of truth for graph, route, state, API, retrieval, runtime, and verification data.

## 1. Product Purpose

Tutor is an AI-powered learning interface for reading academic papers and textbooks, asking a streaming tutor questions, building a personal learning library, and reviewing knowledge over time. The product combines a PDF study surface, AI chat, voice tutoring, web search, a 3D learner brain, revision notebooks, analytics, admin diagnostics, and the `/brain` architecture cognition layer.

The design language is **Cosmic Obsidian** for the main app: near-black surfaces, neon violet/blue/orange accents, glass panels, motion-heavy transitions, and liquid AI details. Revision and Admin intentionally use a `#faf9f6` paper style to make review and diagnostics feel like a readable notebook.

## 2. Runtime Stack

The frontend uses React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Zustand, `motion/react`, Dexie, `react-pdf`, `react-force-graph-3d`, Three.js, Recharts, React Markdown, Remark GFM, Mermaid, Shiki, and Lucide icons. Heavy routes and renderers are split by Vite chunks: Brain/Admin/Analytics/Revision load on demand, while Mermaid, Shiki, and the 3D graph stack are lazy-loaded only when their surfaces render.

The backend is `server.ts`, an Express server with API routes, SSE chat streaming, WebSocket debug logs, a Deepgram Voice Agent proxy, Deepgram TTS, Serper web/news search, and the OpenAI SDK pointed at OpenRouter or OpenAI-compatible providers.

The app has no URL router. `src/App.tsx` renders from `activeView` in `src/store/index.ts`: `study`, `brain`, `analytics`, `revision`, and `admin`.

## 3. Model Inventory

All cloud LLM calls are brokered by `server.ts`. The browser sends the user OpenRouter key from Settings as a bearer token, with `OPENROUTER_API_KEY`, `DEEPGRAM_API_KEY`, and `SERPER_API_KEY` as environment fallbacks.

| Use                                      | Provider                   | Model                                                                                                        |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Default tutor chat                       | OpenRouter                 | `deepseek/deepseek-chat`                                                                                     |
| Settings chat options                    | OpenRouter                 | `anthropic/claude-3.5-sonnet`, `google/gemini-1.5-pro`, `deepseek/deepseek-chat`                             |
| Chat fallback chain                      | OpenRouter                 | `google/gemini-2.5-flash`, `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`, `meta-llama/llama-4-maverick` |
| PDF title extraction                     | OpenRouter                 | `qwen/qwen2.5-vl-72b-instruct`                                                                               |
| Persona prompt generation                | OpenRouter                 | `anthropic/claude-3.5-sonnet`                                                                                |
| Trace explanation                        | OpenRouter                 | `deepseek/deepseek-chat`                                                                                     |
| Learning book updates                    | OpenRouter                 | `deepseek/deepseek-chat`                                                                                     |
| Flashcard extraction                     | OpenRouter                 | `deepseek/deepseek-chat`                                                                                     |
| Page vision tool                         | OpenRouter                 | `openai/gpt-4o-mini`                                                                                         |
| Voice Agent listen                       | Deepgram                   | `flux-general-en`                                                                                            |
| Voice Agent think                        | Deepgram/OpenAI-compatible | `gpt-4o-mini`                                                                                                |
| Voice Agent speak                        | Deepgram                   | `aura-asteria-en`                                                                                            |
| Read-aloud TTS                           | Deepgram                   | `aura-asteria-en` by default                                                                                 |
| Browser memory embeddings                | Local deterministic        | 384-dimensional hashed text vectors, no browser `onnxruntime-web` bundle                                     |
| `/brain` retrieval embeddings            | Local Xenova               | MiniLM 384-dimensional chunks                                                                                |
| Brain debug auto-fix model, when enabled | OpenAI/OpenRouter          | `BRAIN_DEBUG_MODEL`, then `BRAIN_EXECUTOR_MODEL`, then `gpt-4o-mini`/`openai/gpt-4o-mini`                    |

`GET /api/pricing` fetches live OpenRouter pricing and caches it for six hours. Deepgram pricing constants are maintained in `server.ts`.

## 4. User Features

**Study View** is the main workspace. It contains PDF upload, reading, annotation, selected-text context, usage analytics, and the chat panel.

**PDF Viewer** uses `react-pdf`. It supports zoom, fit-width, page navigation, highlights, underlines, strikethrough, sticky notes, selected text capture, and normalized annotation rectangles. Page images can be passed to Qwen for title extraction and to `openai/gpt-4o-mini` for visual page questions.

**Chat Panel** streams `/api/chat` via SSE. It supports memory context, active book context, selected PDF text, current page image context, web search, graph updates, flashcard generation, Markdown, Mermaid, code highlighting, runnable JavaScript/Python snippets, TTS, and voice mode.

**Brain View** renders a Three.js concept graph with `react-force-graph-3d`. It roots the learner, links to learning books, links books to concepts, and falls back to legacy concepts when needed.

**Revision View** is the library and active recall surface. It shows the built-in Tutor System Architecture book, generated learning books, concepts, notes, and flashcards in a paper-style notebook.

**Analytics View** reads Dexie concepts, interactions, and sessions and renders mastery, confidence, session, and distribution charts with Recharts.

**Admin View** now has three diagnostics surfaces: DeepSeek Trace, Server Console, and Debug Runs.

## 5. Learning Memory And Library

The persistent database is Dexie database `NeuralNestBrain` in `src/memory/longterm.memory.ts`. Version 6 contains `concepts`, `misconceptions`, `sessions`, `interactions`, `flashcards`, `traceLogs`, `learningBooks`, `learningBookConcepts`, and `learningEntries`.

`MemoryOrchestrator` creates a browser session, clears generated session learning records, preserves the built-in Tutor System Architecture concept, creates a General Study learning book, and announces the active book through local storage plus a `learning-book-updated` event.

After chat or voice responses, it stores locally embedded interactions, asks `/api/learning-book-update` for book/chapter/concept summaries, merges those records into Dexie, writes `learningEntries`, updates active context, and optionally logs trace explanations through `/api/trace`. Browser embeddings use deterministic 384-dimensional hashed vectors so memory retrieval stays local without loading `onnxruntime-web`.

## 6. Learner Model

The Phase 5 learner model lives under `src/memory/` and is injected into chat prompts by `MemoryOrchestrator.getRelevantContext()`.

Core subsystems:

- Bayesian Knowledge Tracing through `BKTEngine`.
- ZPD zones through `ZPDCalculator`.
- Adaptive scaffolding through `ScaffoldingEngine`.
- Misconception tracking through `MisconceptionGraph`.
- Prerequisite analysis through `PrerequisiteDAG`.
- Illusion-of-knowing detection.
- Cognitive-load monitoring.
- Productive-failure classification.

The resulting tutor directives tell the model when to correct misconceptions, reinforce prerequisites, test transfer, reduce load, interleave weak concepts, or raise difficulty.

## 7. `/brain` Architecture Cognition

`/brain` is a generated architecture cognition layer for coding agents. It contains source-scoped architecture graphs, semantic retrieval indexes, runtime impact telemetry, route/state/render/API/WebSocket/database maps, architecture rules, mutation boundaries, drift checks, self-audit reports, and task memory.

Required agent flow:

```text
LOAD -> RETRIEVE -> IMPACT ANALYSIS -> VERIFY RULES -> PLAN -> MODIFY -> VERIFY -> REGENERATE -> UPDATE MEMORY
```

Core commands:

- `npm run brain:generate`
- `npm run brain:embed`
- `npm run brain:retrieve -- "<task>"`
- `npm run brain:impact -- "<file-or-symbol>"`
- `npm run brain:verify`
- `npm run brain:drift-check`
- `npm run brain:runtime-benchmark`
- `npm run brain:self-audit`
- `npm run brain:memory`

## 8. Brain Autonomy

The stale-brain issue is handled by a deliberate autonomous refresh layer:

- `npm run brain:postchange` runs after completed source changes.
- `npm run brain:auto` starts a debounced watcher for source-scoped files.
- `brain/autonomy/status.json` records freshness, timestamps, failures, source hashes, regeneration targets, and watcher state.

`brain:postchange` runs `brain:drift-check`; if stale, it regenerates the brain and embeddings, then runs verification and self-audit. The watcher ignores generated artifacts, docs packs, debug run logs, backups, `dist`, `node_modules`, caches, snapshots, hidden files, and temporary files.

The debug tool calls `brain:postchange` after applied component patches so future agents do not use stale `/brain` artifacts.

## 9. Debug Skill And Orchestrator

The long-horizon debugging tool is separate from the tutor chat. It is invoked through the `tutor-debug` skill copied into:

- `skills/tutor-debug/SKILL.md`
- `/Users/mfuad16/.codex/skills/tutor-debug/SKILL.md`
- `/Users/mfuad16/antigravity-skills/skills/tutor-debug/SKILL.md`
- `/Users/mfuad16/.gemini/config/skills/tutor-debug/SKILL.md`

The repo-side tool is under `brain/debug/` and is invoked with:

```bash
npm run brain:debug -- --mode fix --scope all
```

By default `--scope all` audits every source-scoped app target: files, UI components, stores, services, hooks, contexts, routes, utilities, server/API files, scripts, and `/brain` TypeScript tooling. The queue is built from both the `/brain` graph and the tracked source file list so graph omissions do not hide files from the long-horizon pass.

Every target follows the same ordered debug process:

1. Parse architecture.
2. Understand purpose.
3. Analyze dependencies.
4. Detect anti-patterns.
5. Detect performance issues and capture a before benchmark when runtime benchmarking is enabled.
6. Detect stale state.
7. Detect render problems.
8. Detect memory leaks.
9. Detect async issues.
10. Detect typing issues.
11. Detect animation issues.
12. Detect API issues.
13. Detect accessibility issues.
14. Compare against best practices.
15. Search documentation patterns.
16. Generate improvements.
17. Apply guarded patches when justified.
18. Run validation.
19. Run regression tests, responsiveness probes, animation smoothness sampling, and after benchmarks.
20. Persist findings into `/brain`.

The operational loop is: scan, understand, audit, benchmark, detect bugs, search best practices, compare implementations, patch issues, rerun tests, validate fixes, measure regressions, persist findings into brain, then repeat until the last target is completed.

It retrieves context, runs impact analysis, maps official documentation evidence, checks format/lint/build gates, compares source to local official docs packs, applies deterministic fixes with source-hash checks and backups, runs post-change brain refresh after patches, records findings, and appends a machine-readable debug memory graph. The regression stage also runs `brain:ui-regression`, a Playwright probe that checks mobile/tablet/desktop overflow, sampled frame smoothness, opaque Tutor headers, and reasoning-dropdown interaction.

Run artifacts are append-only under `brain/debug/runs/<run-id>/`. `run.json` and `summary.json` are written when the run starts and refreshed after each completed component so Admin can show the audit immediately during long runs. The memory graph is `brain/debug/memory-graph.json`.

## 10. Official Docs Packs

`npm run brain:docs:sync` downloads curated official documentation into `brain/reference-docs/`. Official docs are primary evidence; live web search is allowed only as secondary best-practice evidence and must be recorded separately.

Current docs packs include TypeScript, React, Vite, Tailwind, Motion/Framer, Dexie, Zustand, Playwright, Three.js, react-force-graph/react-pdf related sources, Express, Node, and Python for future Python audits.

## 11. Admin Debug Runs

Admin now exposes a Debug Runs page. It reads server-backed debug artifacts through:

- `GET /api/debug/runs`
- `GET /api/debug/runs/:id`
- `GET /api/debug/runs/:id/events`
- `POST /api/debug/run`
- `POST /api/debug/runs/:id/cancel`

The UI shows run history, status, active target, active phase, live event flow, component queue progress, component name, changed files, what changed, why it changed, improvement summaries, bugs/findings, how the code should behave, official-doc evidence, component command results, benchmark/regression results, and final verification gates while the run is still active. Component cards are collapsed by default so the ledger stays readable during long all-target runs.

## 12. Maintenance Boundaries

High-risk mutation boundaries remain Dexie schema, server API/SSE/WebSocket contracts, Zustand store shape, routing, shared layout primitives, ChatPanel stream parsing, and generated `/brain` artifacts.

Generated graph, flow, contract, vector, impact, runtime, snapshot, and verification outputs must be regenerated by commands rather than manually edited.

Before reporting architecture work done, run:

```bash
npm run brain:generate
npm run brain:embed
npm run brain:runtime-benchmark
npm run brain:verify
npm run brain:drift-check
npm run brain:self-audit
npm run format:check
npm run lint
npm run build
```
