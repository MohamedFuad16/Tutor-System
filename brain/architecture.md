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
- Local embeddings: `Xenova/all-MiniLM-L6-v2`.
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

Per target, it:

- retrieves context and impact,
- maps official docs evidence,
- runs format/lint/build checks,
- applies deterministic auto-fixes with hash checks and backups,
- runs post-change brain refresh,
- records findings, changes, docs evidence, and verification,
- appends the debug memory graph.

Run artifacts live in `brain/debug/runs/<run-id>/`; cross-run machine memory lives in `brain/debug/memory-graph.json`.

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
