# System Architecture: Tutor AI

This file is a compact human orientation layer for agents. Generated operational source of truth lives in:

- `brain/knowledge/graph.json`
- `brain/contracts/api-contracts.json`
- `brain/flows/route-map.json`
- `brain/flows/state-flow.json`
- `brain/flows/render-graph.json`
- `brain/impact/impact-analysis.json`
- `brain/retrieval/vector-index.json`
- `brain/runtime/runtime-impact-map.json`

When this file conflicts with generated artifacts, the generated artifacts win.

## Stack

- Frontend: React 19, Vite 6, TypeScript, Tailwind CSS 4
- State: Zustand in `src/store/index.ts`
- Persistence: Dexie IndexedDB database `NeuralNestBrain` in `src/memory/longterm.memory.ts`
- Backend: Express in `server.ts`
- Streaming chat: Server-Sent Events from `POST /api/chat`
- Voice: Deepgram HTTP TTS at `GET /api/tts` and Voice Agent WebSocket at `/api/voice-agent`
- Search: Serper Google Search and News through `server/web-search.ts`
- Graph UI: `react-force-graph-3d` and `three` in `src/views/BrainView.tsx`
- Runtime telemetry: `src/brain-runtime/*` instruments fetch, WebSocket, Zustand, Dexie, routes, renders, and web search

## Top-Level Product Surfaces

The app does not use URL routing. `src/App.tsx` renders views from the Zustand `activeView` field:

- `study`: PDF upload, PDF reading, annotation, usage strip, and `ChatPanel`.
- `brain`: 3D learner/book/concept map.
- `analytics`: Dexie-backed concept, interaction, and session charts.
- `revision`: paper-style library, built-in Tutor System Architecture book, generated learning books, and flashcards.
- `admin`: DeepSeek trace logs, learning book inspection, and `/ws/debug` server console.

New top-level features must update `ViewState`, `App` rendering, and `Navigation` together.

## Model Map

- Default chat model: `deepseek/deepseek-chat`.
- Settings chat options: `anthropic/claude-3.5-sonnet`, `google/gemini-1.5-pro`, `deepseek/deepseek-chat`.
- Chat fallback chain: `google/gemini-2.5-flash`, `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`, `meta-llama/llama-4-maverick`.
- PDF title vision: `qwen/qwen2.5-vl-72b-instruct`.
- Chat page vision tool: `openai/gpt-4o-mini`.
- Persona prompt generation: `anthropic/claude-3.5-sonnet`.
- Trace, learning book updates, and flashcard generation: `deepseek/deepseek-chat`.
- Voice agent: Deepgram listen `flux-general-en`, OpenAI-compatible think `gpt-4o-mini`, Deepgram speak `aura-asteria-en`.
- Read-aloud TTS: Deepgram `aura-*-en`, default `aura-asteria-en`.
- Browser memory embeddings: `Xenova/all-MiniLM-L6-v2`.

## State And Data Model

Global UI and usage state lives in `src/store/index.ts`. It owns API keys, learner name, active project, active learning book id, PDF state, annotations, chat messages, selected text context, voice state, model selection, custom prompt, web source cache, and usage analytics.

Dexie stores live in `src/memory/longterm.memory.ts`. Version 6 stores:

- `concepts`
- `misconceptions`
- `sessions`
- `interactions`
- `flashcards`
- `traceLogs`
- `learningBooks`
- `learningBookConcepts`
- `learningEntries`

Dexie schema changes are high risk and require explicit migration intent. Documentation-only work may describe these stores but should not edit the schema.

## Learning Memory

`MemoryOrchestrator` starts a browser session, clears generated learning-library records for that session, preserves the built-in Tutor System Architecture concept, creates a General Study learning book, and announces the active book through local storage plus a `learning-book-updated` event.

After chat or voice responses, it stores embedded interactions, asks `/api/learning-book-update` to produce book/chapter/concept summaries, merges those records into Dexie, writes `learningEntries`, updates active context, and optionally logs traces through `/api/trace`.

The Phase 5 learner model combines:

- Bayesian Knowledge Tracing
- ZPD zones
- scaffolding levels
- misconception graph
- prerequisite DAG
- illusion-of-knowing detection
- cognitive-load monitoring
- productive-failure classification

## Backend Contracts

Server contracts are generated from `server.ts` into `brain/contracts/api-contracts.json`. Do not hand-maintain endpoint lists.

Important current endpoints:

- `GET /api/pricing`
- `POST /api/title`
- `POST /api/generate-persona`
- `POST /api/trace`
- `POST /api/learning-book-update`
- `POST /api/generate-flashcards`
- `GET /api/tts`
- `POST /api/chat`
- WebSocket `/api/voice-agent`
- WebSocket `/ws/debug`

SSE events from `/api/chat` must remain `data: <json>\n\n`.

## `/brain` Workflow

Use graph-aware navigation before broad repository reads:

- `npm run brain:drift-check`
- `npm run brain:generate`
- `npm run brain:embed`
- `npm run brain:retrieve -- "<task>"`
- `npm run brain:impact -- "<file-or-symbol>"`
- `npm run brain:verify`
- `npm run brain:runtime-benchmark`
- `npm run brain:self-audit`
- `npm run brain:memory -- append ...`

After documentation changes that affect retrieval corpus, regenerate and re-embed before claiming the brain is current.
