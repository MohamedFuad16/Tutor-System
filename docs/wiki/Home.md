# Tutor System Architecture Wiki

Welcome to the Tutor System Architecture wiki. This page summarizes the product surfaces, runtime architecture, data model, and server/API contracts based on the current codebase.

## Product Overview
Tutor is an AI-powered learning interface for reading PDFs, asking a tutor questions, building a persistent learning library, and reviewing knowledge over time. The main surfaces are:

- **Study View**: PDF upload, reader, annotations, and chat workspace.
- **Chat Panel**: Streaming SSE tutor responses with Markdown, Mermaid, code highlighting, web search, flashcard generation, and TTS.
- **Revision View**: A paper-style library with learning books, concepts, notes, and flashcards.
- **Analytics View**: Dexie-backed charts for mastery, sessions, and interactions.
- **Admin View**: Trace logs, server console, and debug runs.

Design language: **Cosmic Obsidian** (dark, neon accents) for study/analytics, with **paper-style** surfaces for Revision and Admin.

## Runtime Architecture (At a Glance)

**Frontend**
- React 19 + Vite 6 + TypeScript 5.8
- Tailwind CSS 4 + motion/react for animation
- Zustand store in `src/store/index.ts` (view routing, settings, usage analytics)
- No URL router. `src/App.tsx` renders views based on `activeView`.

**Backend**
- Express server (`server.ts`) bundled via esbuild
- SSE streaming for chat at `/api/chat`
- WebSocket debug console at `/ws/debug`
- OpenRouter and Deepgram integrations for LLM and voice
- Serper web/news search via `server/web-search.ts`

**Memory & Learner Modeling**
- Dexie database `NeuralNestBrain` (`src/memory/longterm.memory.ts`)
- `MemoryOrchestrator` orchestrates sessions, learning books, concepts, and trace logs
- Phase 5 learner model with BKT, ZPD, scaffolding, misconception tracking, and prerequisite DAG

**/brain Architecture Cognition**
- Generated architecture artifacts and tooling under `/brain`
- Provides retrieval, impact analysis, verification, self-audit, and runtime benchmarking

## Core User Flow

1. **Upload PDF** in Study View.
2. **Read & Annotate** (highlights, notes, strikethroughs).
3. **Ask Tutor** using the chat panel (SSE streaming, optional web search).
4. **Learning Book Updates** post-chat create learning book entries, concepts, and flashcards.
5. **Revision** view surfaces learning books, concepts, notes, and spaced-review flashcards.
6. **Analytics** aggregates mastery/confidence and session interaction metrics.

## Key Data Model (Dexie)

Database: `NeuralNestBrain` with Version 6 schema:

- `concepts` (PersistentConcept)
- `misconceptions`
- `sessions`
- `interactions`
- `flashcards`
- `traceLogs`
- `learningBooks`
- `learningBookConcepts`
- `learningEntries`

The memory orchestrator clears generated learning library records per session, seeds a session learning book, and merges updates from `/api/learning-book-update`.

## Server API (Primary Endpoints)

**Core**
- `POST /api/chat` — SSE streaming tutor responses, web search, graph updates, flashcards, and TTS.
- `GET /api/pricing` — OpenRouter + Deepgram pricing cache.
- `POST /api/title` — PDF title extraction from page image.
- `POST /api/generate-persona` — Generate a persona system prompt.
- `POST /api/trace` — Trace explanation for actions.
- `POST /api/learning-book-update` — Update book/chapters/concepts after chat.
- `POST /api/generate-flashcards` — Generate flashcards from text.
- `GET /api/tts` — Deepgram TTS (MP3).

**Debug/Admin**
- `GET /api/debug/runs` — List debug runs.
- `GET /api/debug/runs/:id` — Debug run summary.
- `GET /api/debug/runs/:id/events` — Debug run events.
- `POST /api/debug/run` — Start debug run.
- `POST /api/debug/runs/:id/cancel` — Cancel active run.

**WebSocket**
- `GET ws://.../ws/debug` — Server console log broadcaster.

## Key Directories

```
src/
  components/        UI building blocks (PDF, chat, settings, nav)
  views/             Study, Analytics, Revision, Admin
  memory/            Learner model + Dexie persistence
  brain-runtime/     Runtime telemetry instrumentation
  lib/               Audio utilities, embedded tutor book content
server/              Server helpers (web search)
brain/               Generated architecture cognition artifacts
```

## Configuration

Environment variables (BYOK model):

- `OPENROUTER_API_KEY`
- `DEEPGRAM_API_KEY`
- `SERPER_API_KEY` (web search)

You can also set OpenRouter and Serper keys in the app settings UI (stored in local storage).

## Scripts (Package.json)

- `npm run dev` — Dev server (Vite + bundled Express)
- `npm run build` — Production build (Vite + server bundle)
- `npm run start` — Start production server
- `npm run lint` — TypeScript noEmit checks
- `/brain` tooling: `brain:generate`, `brain:verify`, `brain:drift-check`, `brain:embed`, `brain:retrieve`, `brain:impact`, `brain:self-audit`, `brain:runtime-benchmark`

## Operational Notes

- Lazy-loaded views: Analytics, Revision, Admin.
- Chat panel supports Markdown, Mermaid, code blocks, and runnable snippets.
- Web search is auto-detected for freshness queries (news/search).
- Voice mode uses Deepgram for TTS and voice-agent functionality.
- Admin exposes trace logs and debug-run artifacts produced by `/brain` tooling.

## Suggested Wiki Extensions

If you add more pages to the GitHub Wiki, consider:

- **Data Model** (Dexie schema + learning book lifecycle)
- **API Reference** (full request/response samples)
- **Brain Tooling** (commands, invariants, drift handling)
- **Design System** (Cosmic Obsidian + paper style tokens)

