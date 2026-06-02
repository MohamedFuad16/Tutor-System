# Packet SS: Request-Correlated Brain Context

## Objective

Make typed chat and live voice memory-context injection auditable as part of the
same Admin request timeline used for model runs, tool jobs, and server activity.

## Context

Graphify routed this slice through `ChatPanel.tsx`,
`memory.orchestrator.ts`, `retrieval.events.ts`, `longterm.memory.ts`,
`AdminView.tsx`, `server.ts`, `README.md`, `src/lib/tutorBook.json`,
`src/lib/userBrainArchitectureBook.ts`, and `RevisionView.tsx`.

## Ownership

- `server.ts`
- `src/components/ChatPanel.tsx`
- `src/memory/memory.orchestrator.ts`
- `src/memory/retrieval.events.ts`
- `src/memory/longterm.memory.ts`
- `src/views/AdminView.tsx`
- `tests/retrieval-events.test.mjs`
- architecture/design book docs and workflow artifacts
- regenerated `graphify-out/*`

## Do

- Give typed chat a browser request id before memory retrieval starts.
- Pass request ids into `MemoryOrchestrator.getRelevantContext()`.
- Store request ids on retrieval event rows.
- Let `/api/chat` adopt validated browser request ids for SSE/model/tool/system
  activity.
- Include retrieval rows in Admin request timelines.
- Update docs/books to describe request-correlated brain context injection.

## Do Not

- Implement AWS/cloud synchronization.
- Claim private model internals beyond saved rows.
- Change Dexie indexed schema unless needed for this local grouping.

## Verification

- `npm run format`
- `npm run lint`
- `npm run format:check`
- `npm run test`
- `npm run build`
- Headless Chrome CDP smoke for Study desktop/mobile, Admin System Activity
  request timelines, Retrieval tab, and Model Runs tab.
- Regenerate Graphify and run a smoke query for the new correlation route.
