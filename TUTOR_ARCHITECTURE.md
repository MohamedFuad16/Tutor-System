# Tutor System Architecture

This is the short, source-facing architecture guide for Tutor. It explains what
the app owns, what the learner brain means, what Admin can prove, and which
claims are still local-beta only. The repository code graph is Graphify and
lives in `graphify-out/`; it is separate from the learner brain shown in the
product.

## 1. Product Shape

Tutor helps a learner read PDFs, ask a source-aware tutor questions, speak with
a realtime voice tutor, save useful learning material, and review it later. The
main product surfaces are:

- `StudyView`: PDF reading, multi-PDF book context, annotations, and the tutor
  chat rail.
- `ChatPanel`: streaming tutor chat, voice mode, local tools, source cards,
  read-aloud, and proof-capture HUDs.
- `RevisionView`: saved learning books, built-in architecture books,
  flashcards, active recall, and stored chapter audio.
- `AnalyticsView`: learner progress summaries from local records.
- `AdminView`: diagnostics for models, tools, memory, retrieval, voice, evidence,
  corrections, artifacts, background jobs, and local beta readiness.

The current product phase is local beta. AWS/cloud synchronization, production
multi-tenant operations, cloud backups, and cloud monitoring are deferred until
the local flow is proven.

## 2. Runtime Stack

Frontend:

- React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4.
- Zustand for live cross-screen state.
- Dexie/IndexedDB for local learner and diagnostics records.
- `react-pdf` for document rendering.
- GSAP for route and control motion.
- Mermaid, Shiki, KaTeX, React Markdown, and Recharts for rich tutor output and
  analytics.

Backend:

- Express API in `server.ts`.
- Server-Sent Events for `/api/chat`.
- WebSocket log broadcaster at `/ws/debug`.
- OpenAI SDK against OpenRouter-compatible routes.
- Deepgram realtime voice and speech routes.
- Optional MisoTTS read-aloud through `/api/tts`, `MISO_TTS_API_URL`, the
  Settings endpoint field, or a local Vast tunnel at `http://127.0.0.1:8080`.
- Serper web search for explicit external/freshness questions.
- Python document classifier/extractor at `scripts/classify_and_extract.py`.

## 3. Provider Boundaries

Providers are adapters behind app contracts. The app should be clear about what
each adapter proves.

| Job                       | Local-beta route                                                         | Boundary                                                                |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Tutor and background text | OpenRouter-compatible chat routes                                        | Model output is a proposal until grounded, verified, or validated.      |
| PDF title and page vision | OpenRouter-compatible vision routes                                      | Uses uploaded or rendered study material.                               |
| Live voice                | Deepgram voice-agent websocket                                           | Speech and transcripts are interaction traces, not mastery evidence.    |
| Assistant Read Aloud      | `/api/tts`, Deepgram/OpenAI-compatible speech, or optional `miso-tts-8b` | Reads existing assistant text; it does not replace live voice.          |
| Web search                | Serper route                                                             | Used for explicit web/freshness requests, not current-source questions. |
| Stored chapter audio      | Checked-in MP3 assets                                                    | Playback is local and does not call live TTS.                           |

The server supports a deployment OpenRouter fallback only when
`ALLOW_SERVER_OPENROUTER_FALLBACK=true`. BYOK support means the UI can accept a
browser key; it is not proof that a runtime key is configured.

## 4. Local Data Model

Zustand stores immediate UI state in `src/store/index.ts`: navigation, active
book, active PDF, selected text, provider keys, proof attempts, voice settings,
and usage controls.

Dexie stores durable local state in `src/memory/longterm.memory.ts`. The main
record families are:

- learning books, entries, concepts, documents, and book-scoped chat threads;
- evidence events, mastery deltas, answer evidence, flashcards, and BKT state;
- model runs, tool jobs, memory events, retrieval events, correction events, and
  background jobs;
- artifacts, citation states, trace logs, misconceptions, and sessions.

Each learning book owns exactly one persistent chat thread. Study can store more
than one PDF per book. Switching books changes the chat, active PDF, injected
book context, visible document rail, and revision context together.

## 5. Learner Brain Contract

The learner brain is the local ledger and orchestration around learner state. It
is not hidden model memory and it is not Graphify.

The durable rule is simple:

```mermaid
flowchart LR
  action["Learner action"] --> row["Local record"]
  row --> gate{"Evidence gate"}
  gate -->|validated| mastery["Mastery delta"]
  gate -->|not validated| audit["Audit-only trace"]
  mastery --> admin["Admin review"]
  audit --> admin
```

Only validated learner evidence can increase mastery. Flashcard reviews and
evaluated answers may pass that gate when they are linked to a real concept and
carry an explicit outcome. Model summaries, generated artifacts, tool traces,
misconception candidates, voice transcripts, and web sources may help teaching
or review, but they cannot raise mastery by themselves.

Mastery writes are fail-closed: the concept mutation, verified evidence event,
and mastery delta are committed together. Duplicate attempts are idempotent, and
broken audit links block readiness claims.

## 6. Context And Tools

`src/memory/brain.context.ts` builds the shared local context packet for typed
chat and live voice. It combines:

- active learning-book summary;
- active-book PDF manifest;
- balanced excerpts from ready PDFs in that book;
- selected text, current page context, interaction timing, and semantic memory;
- request id and proof-attempt metadata for Admin correlation.

Tools follow source boundaries:

- current page, selected text, active document, active book, and uploaded PDFs
  are local-source questions first;
- web search is only for explicit external or freshness-sensitive requests;
- `look_at_current_page` uses the rendered PDF page image through a local bridge;
- generated flashcards, notes, source cards, and audio guides are artifact rows
  with scoped provenance, not automatic factual truth;
- `evaluate_answer` can write BKT evidence only when the local evidence contract
  accepts the concept id and outcome.

## 7. Admin And Local Beta Readiness

Admin is the inspection surface for local beta. It answers:

- Which request id produced this model/tool/memory/retrieval row?
- Which book, thread, PDFs, and proof attempt were active?
- Did a tool call run, complete, fail, or dead-letter?
- Did validated evidence change mastery?
- Which generated artifact has provenance, which verifier ran, and what remains
  unverified?
- Which correction quarantined or superseded a row?

Beta Diagnostics keeps two proof layers separate:

- Synthetic rehearsal checks wiring in memory only. It does not call providers,
  write durable proof rows, export data, or raise live beta coverage.
- Coherent provider-key proof requires one deliberate proof attempt that ties a
  real OpenRouter typed-chat row and a real Deepgram live-voice row to the same
  active book, thread, multi-PDF context, durable approval row, fresh proof
  window, and local ledgers. The ADQ local-live run satisfies this contract with
  a ready `local_live_ledger` receipt; fallback, mock, seeded, or stale rows
  still do not count.

The readiness percentage is conservative. It can reach 100% only when local-live
coherent proof and mastery-ledger integrity are both ready. AWS/cloud readiness
remains deferred.

## 8. Graphify Code Architecture

Graphify is the repository architecture navigation layer for agents and
maintainers. Generated files live in:

- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/GRAPH_TREE.html`

Useful commands:

```bash
graphify query "your question" --budget 2000 --graph graphify-out/graph.json
graphify path "SourceSymbol" "TargetSymbol" --graph graphify-out/graph.json
npm run graphify:tree
```

Policy:

- Use Graphify traversal before broad source reads.
- Do not edit `graphify-out` by hand.
- Refresh Graphify only when graph maintenance is explicitly in scope.
- Do not install hooks or watch-mode rebuilds for this repo.
- After a refresh, run `npm run graphify:tree` and scan artifacts for scratch
  references such as `server.mjs`, `.tmp-test`, `node_modules/.cache`,
  `/private/tmp`, or `codex-runtimes`.

## 9. Safe Change Checklist

High-risk files:

- Dexie schema: `src/memory/longterm.memory.ts`
- Store state: `src/store/index.ts`
- Chat and voice orchestration: `src/components/ChatPanel.tsx`
- Server routes, SSE, and websocket contracts: `server.ts`
- Brain context/readiness: `src/memory/brain.context.ts`,
  `src/memory/beta.diagnostics.ts`, `src/memory/memory.orchestrator.ts`
- PDF ingestion and extraction scripts
- Generated Graphify artifacts

Before reporting architecture work done, use the checks that match the change:

```bash
npm run brain:postchange -- --reason <reason>
npm run test
npm run build
```

For UI or workflow changes, add live browser verification on desktop and mobile.
