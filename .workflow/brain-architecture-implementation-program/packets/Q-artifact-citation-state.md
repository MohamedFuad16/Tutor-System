# Packet Q: Artifact and citation state ledger

## Objective

Implement the next local-only user-brain architecture slice: durable artifact records and citation states for source-grounded outputs.

## Scope

- Add `ArtifactRecord` and `CitationState` IndexedDB contracts.
- Capture chat web-search source cards and unavailable source states without blocking the chat stream.
- Add Admin observability for source artifacts, citation states, state mix, artifact mix, and local-only boundaries.
- Keep citation language conservative: `checking` is not `verified`.
- Keep AWS/cloud synchronization out of scope.

## Write Scope

- `src/memory/longterm.memory.ts`
- `src/memory/artifact.records.ts`
- `src/components/ChatPanel.tsx`
- `src/views/AdminView.tsx`
- `tests/artifact-records.test.mjs`
- `package.json`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` only through explicit Graphify regeneration

## Status

Completed implementation; verification pending.
