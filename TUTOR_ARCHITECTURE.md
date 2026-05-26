# Tutor System Architecture

Updated: 2026-05-26

This is the human-readable architecture document for the Tutor system. The generated `/brain` artifacts remain the executable source of truth for graph, route, state, contract, retrieval, runtime, and verification data. This document explains the product, the cognitive system, the LLM model map, the user-facing features, and the current implementation boundaries.

## 1. System Purpose

Tutor is a React, Vite, TypeScript learning interface for reading papers, textbooks, and technical material with an AI tutor beside the document. The product combines a PDF study surface, streaming chat, voice tutoring, live web search, a persistent learner memory, a 3D virtual brain map, a revision library, and an agent-facing `/brain` architecture layer.

The visual language is "Cosmic Obsidian": near-black surfaces, neon blue/violet/orange accents, glass overlays, motion-heavy controls, and a contrasting paper notebook aesthetic inside the revision and admin reading spaces.

The current application is a single-page app without URL routing. `src/App.tsx` renders the active view from `src/store/index.ts` through the `ViewState` union:

- `study`
- `brain`
- `analytics`
- `revision`
- `admin`

Top-level feature boundaries are intentionally strict:

- `PdfViewer`
- `ChatPanel`
- `BrainView`
- `RevisionView`

## 2. Runtime Stack

Frontend:

- React 19
- Vite 6
- TypeScript
- Tailwind CSS 4
- `motion/react`
- Zustand
- Dexie and `dexie-react-hooks`
- `react-pdf`
- `react-force-graph-3d` and Three.js
- React Markdown, Remark GFM, Mermaid, Shiki, Recharts, Lucide icons

Backend:

- Node.js and Express
- OpenAI SDK pointed at OpenRouter
- WebSockets through `ws`
- Server-Sent Events from `/api/chat`
- Deepgram HTTP TTS and Deepgram Voice Agent proxying
- Serper web search and news search

Persistence:

- Browser IndexedDB through Dexie database `NeuralNestBrain`
- Zustand persisted state in local storage
- Local usage analytics stored under `usage_analytics_v1`

Architecture cognition:

- `/brain` generated architecture graph, retrieval index, route map, state flow, API contracts, runtime maps, impact analysis, drift checks, self-audit reports, and task memory.

## 3. Model Inventory

All cloud LLM calls are brokered by `server.ts`. User-provided OpenRouter keys are read from Settings and sent as Bearer tokens. Server environment fallbacks use `OPENROUTER_API_KEY`, `DEEPGRAM_API_KEY`, and `SERPER_API_KEY`.

| Capability | Provider | Model or service | Source |
| --- | --- | --- | --- |
| Default chat | OpenRouter | `deepseek/deepseek-chat` | Zustand default `aiModel` |
| User-selectable chat | OpenRouter | `anthropic/claude-3.5-sonnet`, `google/gemini-1.5-pro`, `deepseek/deepseek-chat` | Settings model selector |
| Chat fallback chain | OpenRouter | `google/gemini-2.5-flash`, `anthropic/claude-3.5-haiku`, `openai/gpt-4o-mini`, `meta-llama/llama-4-maverick` | `/api/chat` retry path |
| PDF title extraction | OpenRouter | `qwen/qwen2.5-vl-72b-instruct` | `/api/title` |
| Persona prompt generation | OpenRouter | `anthropic/claude-3.5-sonnet` | `/api/generate-persona` |
| Trace explanation | OpenRouter | `deepseek/deepseek-chat` | `/api/trace` |
| Learning book update agent | OpenRouter | `deepseek/deepseek-chat` | `/api/learning-book-update` |
| Flashcard extraction | OpenRouter | `deepseek/deepseek-chat` | `/api/generate-flashcards` |
| Page vision tool inside chat | OpenRouter | `openai/gpt-4o-mini` | `look_at_current_page` tool |
| Voice listen | Deepgram Voice Agent | `flux-general-en` | `/api/voice-agent` settings |
| Voice think | Deepgram Voice Agent via OpenAI-compatible provider | `gpt-4o-mini` | `/api/voice-agent` settings |
| Voice speak | Deepgram Voice Agent | `aura-asteria-en` | `/api/voice-agent` settings |
| Chat read-aloud TTS | Deepgram Speak API | default `aura-asteria-en`, any valid `aura-*-en` voice from Settings | `/api/tts` |
| Semantic memory embeddings | Xenova Transformers | `Xenova/all-MiniLM-L6-v2` | browser memory embeddings |
| `/brain` retrieval embeddings | Xenova Transformers | 384-dimensional MiniLM vector index | `brain:embed` |
| Live search | Serper | Google Search and Google News endpoints | `server/web-search.ts` |

Pricing is tracked by `/api/pricing`. OpenRouter model pricing is fetched live from `https://openrouter.ai/api/v1/models` and cached for six hours. Deepgram prices are maintained as fallback constants in `server.ts`.

## 4. Main User Features

Study View:

- Upload or replace a PDF.
- Read in a dark, glass-framed study layout.
- Navigate pages with buttons and arrow keys.
- Fit-width and zoom controls.
- Keep the chat panel beside the document.
- Use the usage strip to see chat, voice, and search activity.

PDF Viewer:

- Renders documents with `react-pdf`.
- Creates normalized page annotations so highlights survive resizing.
- Supports highlight, underline, strikethrough, and sticky-note annotations.
- Captures selected text into `selectedTextContext` for direct "Ask Tutor" prompts.
- Captures the rendered page canvas when a query likely needs visual context.
- Calls `/api/title` after page render to rename the active project and session learning book from the document.

Chat Panel:

- Streams chat over `/api/chat` using SSE events.
- Shows live phases such as retrieving, thinking, web search, synthesizing, and complete.
- Streams markdown, Mermaid, code blocks, source cards, and final answer content.
- Supports an explicit Web Search skill plus automatic freshness detection.
- Can call server tools for graph updates, flashcard creation, live web search, and page vision.
- Injects persistent memory context, active learning book context, selected PDF text, custom system prompt, learner name, active project, and current page image when available.
- Writes completed interactions back to the memory orchestrator and learning book system.

Voice:

- Browser microphone audio is converted to PCM16 at 48 kHz and streamed to `/api/voice-agent`.
- The server proxies audio to Deepgram Voice Agent.
- Deepgram handles listen, think, and speak stages.
- Voice transcript messages are written into the same chat and learning book memory flow.
- Read-aloud TTS calls `/api/tts` and streams MP3 audio from Deepgram.

Brain View:

- Shows the learner as the root node.
- Shows current session learning books as book nodes.
- Shows extracted learning concepts as concept nodes.
- Links learner to books, books to concepts, and concept parent/child relationships.
- Falls back to legacy `concepts` records if no learning books exist.
- Uses cached Three.js geometries, materials, textures, and sprite materials to avoid WebGL leaks.

Revision View:

- Presents the Tutor System Architecture as the built-in system book.
- Shows generated learning books, chapters, mapped concepts, recent learning notes, and flashcards.
- Uses a paper notebook aesthetic with serif typography and texture.
- Supports long-press deletion for the built-in system book card.
- Uses flashcard self-rating buttons: Again, Hard, Good, Easy.
- Reschedules flashcards with a simple quality-based interval.

Analytics View:

- Reads concepts, interactions, and sessions from Dexie.
- Visualizes mastery and confidence with Recharts bar and pie charts.
- Shows total concepts, interactions, and study sessions.

Admin View:

- Shows DeepSeek trace logs from Dexie.
- Shows learning books, chapters, concepts, confidence, and latest entries.
- Connects to `/ws/debug` for live server console logs.
- Uses the same paper reading language as the revision system.

## 5. Learning Memory And Library

The persistent browser database is `NeuralNestBrain` in `src/memory/longterm.memory.ts`. Version 6 contains these stores:

- `concepts`: legacy and BKT-backed concepts.
- `misconceptions`: unresolved and resolved misconception records.
- `sessions`: study session metadata.
- `interactions`: user and assistant message history with optional embeddings.
- `flashcards`: active recall cards with next review timestamps.
- `traceLogs`: LLM explanations of internal system actions.
- `learningBooks`: current session learning books.
- `learningBookConcepts`: concepts extracted into a learning book.
- `learningEntries`: conversation-level summaries, risks, and confidence.

`MemoryOrchestrator` is the central browser-side coordinator. On startup it creates a new session, clears generated session learning library records while preserving the built-in Tutor System Architecture concept, creates a General Study session book, and announces that book through local storage plus the `learning-book-updated` browser event.

After a completed chat or voice exchange, the orchestrator:

1. Stores an embedded `ConversationInteraction`.
2. Calls `/api/learning-book-update`.
3. Merges the returned book title, overview, knowledge summary, chapter, concepts, evidence, risks, and confidence into Dexie.
4. Updates the active book id and active project.
5. Writes a `LearningEntry`.
6. Sends an optional trace log through `/api/trace`.

The learning library is session-scoped by design. Refreshing starts a clean generated learning book set for the new session, while the built-in Tutor System Architecture book remains available unless the user hides it.

## 6. Learner Model

The cognitive model is implemented in `src/memory/` and injected into chat prompts by `MemoryOrchestrator.getRelevantContext()`.

Bayesian Knowledge Tracing:

- Default `P(L0)` is `0.2`.
- `P(T)` is `0.1`.
- `P(S)` is `0.1`.
- `P(G)` is `0.2`.
- Correct and incorrect attempts update `p_learn` through Bayes' theorem.
- Recognition tasks cap mastery at `0.70`.
- Generation tasks cap mastery at `0.85`.
- Transfer tasks can rise toward `0.95`.

Zone of Proximal Development:

- Independent zone: `p_learn >= 0.90`.
- ZPD zone: `0.40 <= p_learn < 0.90`.
- Not-yet zone: `p_learn < 0.40`.
- A ZPD candidate is only ready if prerequisites exceed the configured threshold.

Scaffolding:

- Level 5: full worked example.
- Level 4: worked example with one blank.
- Level 3: partial hint and Socratic question.
- Level 2: Socratic question only.
- Level 1: minimal intervention.
- Level 0: independent work.

Additional cognitive subsystems:

- Misconception graph: tracks active misconceptions and resolution strategy.
- Prerequisite DAG: checks weak prerequisites before advancing.
- Illusion detector: flags confidence that exceeds measured performance by more than `0.30`.
- Cognitive load monitor: uses latency, retries, and duration to recommend challenge, continuation, simplification, or break.
- Productive failure engine: separates productive struggle from destructive frustration.

## 7. Chat, Search, And Tool Contracts

`/api/chat` is an SSE endpoint. Every event is data-prefixed and double-newline terminated. The client expects event types such as:

- `status`
- `chunk`
- `reasoning_summary`
- `info`
- `web_search_started`
- `web_search_progress`
- `web_result`
- `web_sources_complete`
- `done`
- `error`

Server-side chat tools:

- `update_graph`: emits concept updates for the memory graph.
- `generate_flashcards`: returns flashcards for Dexie storage.
- `web_search`: queries Serper search or news.
- `look_at_current_page`: uses `openai/gpt-4o-mini` on the current PDF page image when supplied.

Search behavior:

- Explicit web/search/browse requests trigger search.
- Freshness-sensitive words such as latest, current, recent, today, price, release, ranking, score, election, and weather trigger search.
- Serper results are normalized with stable ids, canonical URLs, domain names, snippets, optional dates, favicons, and positions.
- Search results are cached for 10 minutes in the server process.

## 8. `/brain` Architecture Cognition

The `/brain` directory is the generated architecture cognition layer for agents. It is decision support, not hand-authored application logic.

Core commands:

- `npm run brain:generate`
- `npm run brain:embed`
- `npm run brain:retrieve -- "<task>"`
- `npm run brain:impact -- "<file-or-symbol>"`
- `npm run brain:verify`
- `npm run brain:drift-check`
- `npm run brain:runtime-benchmark`
- `npm run brain:self-audit`
- `npm run brain:memory -- append ...`

Generated or maintained artifacts include:

- `brain/knowledge/graph.json`: typed architecture graph.
- `brain/contracts/api-contracts.json`: Express and WebSocket contracts.
- `brain/flows/route-map.json`: active view to component mapping.
- `brain/flows/state-flow.json`: Zustand readers and writers.
- `brain/flows/render-graph.json`: React render relationships.
- `brain/impact/impact-analysis.json`: static impact map.
- `brain/retrieval/vector-index.json`: semantic retrieval index.
- `brain/runtime/runtime-impact-map.json`: observed runtime event map.
- `brain/snapshots/file-hashes.json`: drift baseline.
- `brain/tasks/task-memory.json`: task history and decision continuity.

Runtime telemetry is installed through `src/brain-runtime/installBrainRuntime.ts` when `VITE_BRAIN_RUNTIME=true` or local storage `brain_runtime=1`. It instruments fetch, WebSocket, Zustand, Dexie, route changes, render profiling, and web search events. The runtime benchmark currently captures route render, pricing fetch, state, and navigation events across study, brain, analytics, and revision surfaces.

The required agent workflow is:

1. Load instructions.
2. Run drift check.
3. Regenerate if stale.
4. Retrieve focused context.
5. Run impact analysis on mutation targets.
6. Verify rules.
7. Plan.
8. Modify only source or hand-maintained docs.
9. Verify.
10. Regenerate brain artifacts after source or retrieval-corpus changes.
11. Update task memory.

## 9. Current Audit Findings

This audit was performed from the generated graph, retrieval packs, impact analysis, and directly connected source files.

Confirmed current behavior:

- The package stack is React 19, not React 18.
- `/api/chat` streams with SSE and has a model fallback chain.
- The default chat and learning agents use `deepseek/deepseek-chat`.
- PDF title extraction uses Qwen vision.
- The in-chat page vision tool uses `openai/gpt-4o-mini`.
- Voice Agent listen/speak uses Deepgram `flux-general-en` and `aura-asteria-en`, with `gpt-4o-mini` as the voice thinking model.
- The Library is now based on session-scoped `learningBooks`, `learningBookConcepts`, and `learningEntries`.
- Brain View uses learning books first and legacy concepts only as fallback.
- The `/brain` system includes graph generation, vector retrieval, runtime benchmarking, verification, self-audit, drift check, and task memory.

Known risks:

- Retrieval benchmark recall is strong, but confidence calibration remains low in self-audit.
- Live OpenRouter, Deepgram, and Serper paths depend on user or environment API keys.
- Chat usage can begin as estimated during streaming and is corrected when provider usage arrives.
- Learning-book quality depends on OpenRouter availability; local fallback is intentionally simpler.
- The built-in `brain:execute --mode plan` safety gate can over-block broad documentation tasks that mention generated brain artifacts.

## 10. Maintenance Boundaries

Safe documentation update targets:

- `TUTOR_ARCHITECTURE.md`
- `src/lib/tutorBook.json`
- `brain/architecture.md`
- `brain/context.md`

Generated artifacts must not be edited by hand. Regenerate them with the relevant brain commands.

High-risk mutation boundaries:

- `src/memory/longterm.memory.ts`: Dexie schema and migrations.
- `server.ts`: API, SSE, and WebSocket contracts.
- `src/store/index.ts`: app-wide Zustand state.
- `src/components/ChatPanel.tsx`: SSE, tool parsing, usage, voice, learning memory.
- `src/views/BrainView.tsx`: WebGL objects and Dexie learning graph.
- `src/views/RevisionView.tsx`: Dexie-backed library, built-in Tutor book, and deletion flow.

Final documentation verification should include:

- `npm run brain:generate`
- `npm run brain:embed`
- `npm run brain:runtime-benchmark`
- `npm run brain:verify`
- `npm run brain:drift-check`
- `npm run brain:self-audit`
- `npm run lint`
- `npm run build`
