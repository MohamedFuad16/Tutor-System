# Packet A Result: Architecture Decomposition

Status: completed, read-only.

Graphify-first commands used by the sidecar included queries and paths around `MemoryOrchestrator`, `LearningBook`, `PersistentConcept`, `BKTEngine`, `server.ts`, `ChatPanel.tsx`, and `RevisionView.tsx`. The named `src/lib/userBrainArchitectureBook.ts` file was not present as a graph node, so the sidecar read it only after graph traversal identified the neighboring implementation runtime.

Already present locally:

- The architecture book is exposed as a built-in Revision book.
- Dexie local persistence exists for concepts, misconceptions, sessions, interactions, flashcards, trace logs, learning books, book concepts, entries, documents, and chat threads.
- `ChatPanel` calls `trackInteraction()` and `updateLearningBookFromConversation()` after assistant completion.
- BKT and learner-model helpers exist, but they are not yet the sole mastery write path.

Drift:

- Runtime contracts such as `MemoryEvent`, `EvidenceEvent`, `ToolJob`, `CitationState`, and `MasteryDelta` are not implemented as durable schemas yet.
- Mastery is not evidence-gated; agent/fallback summaries can still influence mastery/confidence projections.
- There is no durable local tool/job ledger yet.
- Citation state is visual, not authoritative.

Recommendation accepted for phase 1:

- Start with local observability rather than a Dexie schema migration.
- Defer AWS/cloud infrastructure until after beta.
