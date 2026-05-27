# System Architecture: Tutor AI

`/brain` is the executable architecture cognition layer for Tutor. This file is concise by design; generated JSON artifacts hold the detailed graph, route, state, render, contract, runtime, retrieval, and verification data.

## Stack

- Frontend: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Zustand, Motion, Dexie, React PDF, Three.js, react-force-graph-3d, Recharts, Markdown/Mermaid/Shiki.
- Backend: Express in `server.ts`, SSE chat streaming, WebSocket debug logs, Deepgram TTS/Voice Agent proxying, Serper search, OpenAI SDK against OpenRouter.
- Storage: Dexie `NeuralNestBrain` for learner memory, library books, concepts, sessions, interactions, flashcards, traces, and learning entries.

## Product Surfaces

- Study: PDF reading, annotation, selected text, usage analytics, chat.
- Chat: SSE tutor, web search, page vision, graph updates, flashcards, TTS, voice, code rendering.
- Brain: 3D concept graph rooted at learner and learning books.
- Revision: built-in architecture book, generated learning books, concepts, notes, flashcards.
- Analytics: mastery, confidence, sessions, interactions.
- Admin: DeepSeek traces, server console, Debug Runs version tracker.

## Model Map

- Default chat, trace, learning-book updates, flashcards: `deepseek/deepseek-chat`.
- Settings chat options: `anthropic/claude-3.5-sonnet`, `google/gemini-1.5-pro`, `deepseek/deepseek-chat`.
- Chat fallback: `google/gemini-2.5-flash`, `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`, `meta-llama/llama-4-maverick`.
- PDF title: `qwen/qwen2.5-vl-72b-instruct`.
- Persona generation: `anthropic/claude-3.5-sonnet`.
- Page vision tool: `openai/gpt-4o-mini`.
- Voice: Deepgram `flux-general-en`, `gpt-4o-mini`, and `aura-asteria-en`.
- Browser memory embeddings: local deterministic 384-dimensional hashed vectors.
- `/brain` retrieval embeddings: `Xenova/all-MiniLM-L6-v2`.
- Debug executor, when model-backed fixing is enabled: `BRAIN_DEBUG_MODEL`, `BRAIN_EXECUTOR_MODEL`, then `gpt-4o-mini` or `openai/gpt-4o-mini`.

## `/brain` Workflow

Agents must use graph-aware navigation and the mandatory pipeline:

```text
LOAD -> RETRIEVE -> IMPACT ANALYSIS -> VERIFY RULES -> PLAN -> MODIFY -> VERIFY -> REGENERATE -> UPDATE MEMORY
```

Core commands are `brain:generate`, `brain:embed`, `brain:retrieve`, `brain:impact`, `brain:verify`, `brain:drift-check`, `brain:runtime-benchmark`, `brain:self-audit`, and `brain:memory`.

## Brain Autonomy

The autonomous freshness layer fixes stale brain drift:

- `brain:postchange`: refreshes after a completed source change.
- `brain:auto`: watches source-scoped files and runs debounced post-change refreshes.
- `brain/autonomy/status.json`: records watcher state, freshness, failures, timestamps, and regeneration targets.

The watcher ignores generated artifacts, debug run logs, backups, reference docs, `dist`, `node_modules`, caches, snapshots, hidden files, and temporary files.

## Debug Orchestrator

`brain:debug` is the long-horizon debugging and refactoring tool. It is invoked through the `tutor-debug` skill and uses `/brain` context plus official docs packs.

By default `brain:debug -- --mode fix --scope all` audits every source-scoped target: files, UI components, stores, services, hooks, contexts, routes, utilities, server/API files, scripts, and `/brain` TypeScript tooling. The target list is merged from the generated graph and tracked source files so stale or missing graph nodes do not hide code from the pass.

Per target, it runs this fixed process:

- parses architecture,
- understands purpose,
- retrieves context and impact,
- detects anti-patterns, performance issues, stale state, render problems, memory leaks, async issues, typing issues, animation issues, API issues, and accessibility issues,
- captures before/after runtime benchmark signals when runtime benchmarking is enabled,
- runs responsive and animation-smoothness regression probes with `brain:ui-regression`,
- compares against best-practice evidence from official docs packs,
- searches documentation patterns,
- generates improvement strategy,
- maps official docs evidence,
- runs format/lint/build checks,
- applies deterministic auto-fixes with hash checks and backups,
- runs post-change brain refresh,
- records findings, changes, reasons, improvements, docs evidence, validation, and regressions,
- refreshes live `run.json` and `summary.json` after each completed component,
- appends the debug memory graph.

Run artifacts live in `brain/debug/runs/<run-id>/`; cross-run machine memory lives in `brain/debug/memory-graph.json`. Admin reads the live summary and event stream so component audits appear before the full long-horizon run finishes.

## Official Docs

`brain:docs:sync` downloads curated official docs into `brain/reference-docs`. The debugger treats these as primary evidence and records secondary web-search evidence separately.

Docs packs cover TypeScript, React, Vite, Tailwind, Motion/Framer, Dexie, Zustand, Playwright, Three.js/react-force-graph, react-pdf, Express, Node, and Python when relevant.

## Admin Contracts

Admin reads debug history through:

- `GET /api/debug/runs`
- `GET /api/debug/runs/:id`
- `GET /api/debug/runs/:id/events`
- `POST /api/debug/run`
- `POST /api/debug/runs/:id/cancel`

Existing contracts remain: `/api/chat` SSE events must stay `data: <json>\n\n`; WebSocket paths must stay synchronized between server and browser.

The Version Tracker presents component name, file, target kind, what changed, why it changed, improvement summary, official-doc evidence, verification, and benchmark/regression status. Component cards are collapsed by default for readability, while Live Audit Events remain available for the streaming raw timeline while each long-horizon run is still active.
