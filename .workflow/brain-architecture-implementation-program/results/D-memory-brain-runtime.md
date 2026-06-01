# Packet D Result: Memory/Brain Runtime

Status: completed, read-only.

The sidecar used the repo-pinned CLI graph after MCP lookup appeared stale for this workspace. Relevant graph labels included `memory.orchestrator.ts`, `MemoryOrchestrator`, `.updateLearningBookFromConversation()`, `.trackInteraction()`, `.getRelevantContext()`, `.logTrace()`, `longterm.memory.ts`, `bkt.engine.ts`, `learner.model.ts`, `ChatPanel.tsx`, `StudyView.tsx`, `RevisionView.tsx`, `index.ts`, and `server.ts`.

Current capabilities:

- Durable local memory exists through Dexie schema v7.
- Active book context persists through Zustand/localStorage and is shared by Chat, Study, and Revision surfaces.
- Retrieval is local-first through stored interactions, embeddings, active book context, and learner-model guidance.
- BKT has evidence-type caps, but it is not fully wired into inspected runtime paths.

Risks:

- Adding new evidence tables would need a careful Dexie migration.
- `traceLogs` only persist when model explanation succeeds with an API key.
- Learning book, interaction, concept, and entry writes are separate async operations.

Recommendation accepted for phase 1:

- Avoid Dexie schema churn in this slice.
- Add a local server/Admin activity ledger first.
- Keep evidence-gated mastery and durable event tables as the next implementation slice.
