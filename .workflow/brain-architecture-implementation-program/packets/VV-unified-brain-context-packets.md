# Packet VV: Unified Brain Context Packets

## Scope

Implement one local brain-context packet contract for typed chat and live voice.
The packet must gather semantic memory, active-book context, ready document
excerpts, and interaction timing state before either foreground agent answers.

## Write Scope

- `src/memory/brain.context.ts`
- `src/components/ChatPanel.tsx`
- `src/memory/longterm.memory.ts`
- `src/views/AdminView.tsx`
- `tests/brain-context.test.mjs`
- `tests/memory-events.test.mjs`
- `README.md`
- `TUTOR_ARCHITECTURE.md`
- `src/lib/tutorBook.json`
- `src/lib/userBrainArchitectureBook.ts`
- `src/views/RevisionView.tsx`
- Workflow evidence files
- Generated Graphify artifacts after verification

## Out Of Scope

- AWS/cloud synchronization.
- Live key-spending provider success-path QA.
- Dexie schema version changes.
- User-facing learner graph visual redesign.

## Acceptance

- Typed chat and live voice call the same context packet builder.
- Packet injection records a durable `brain_context_injected` memory event.
- Admin request timelines include memory context injection rows next to
  retrieval, model, and tool rows.
- Tests cover packet compaction, document filtering, active-book context, and
  memory-event projection.
- Standard local gates and browser QA are recorded in the results.
