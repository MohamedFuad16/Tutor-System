# Packet ACJ: Live Provider Row Proof

## Objective

Prevent coherent provider-key proof from passing on completed or mock-looking
rows alone. The selected typed-chat request must have a real provider-backed
model row, and the selected live-voice request must have the server-side
Deepgram provider-ready system-activity row.

## Scope

- Source scope:
  - `src/memory/beta.diagnostics.ts`
  - `src/views/AdminView.tsx`
  - `tests/beta-diagnostics.test.mjs`
  - `README.md`
  - `TUTOR_ARCHITECTURE.md`
  - `src/lib/userBrainArchitectureBook.ts`
  - `src/views/RevisionView.tsx`
- Workflow scope:
  - `.workflow/brain-architecture-implementation-program/*`
  - `graphify-out/*` after explicit Graphify regeneration
- Out of scope:
  - AWS/cloud sync.
  - Automatic provider-key calls from Admin.
  - Treating the local mock voice provider as live provider proof.
  - New Dexie schema fields.

## Graphify Routing

- `graphify query "remaining provider-key live beta proof real provider rows
chat voice stored injected tool calling transcript background memory Admin
blockers complete flow next implementation slice" --budget 9000 --graph
graphify-out/graph.json`
- `graphify query "Admin Beta Diagnostics provider-key proof blockers proof
attempt live voice typed chat complete proof missing evidence export runbook
coherent bundle" --budget 8000 --graph graphify-out/graph.json`
- `graphify query "ChatPanel activeBetaProofAttemptId sendMessage voice tool
proof attempt real provider completed model rows fallback proof coherent bundle"
--budget 8000 --graph graphify-out/graph.json`
- `graphify query "ModelRun provider estimated fallback completed provider key
source metadata chat_stream voice_agent recordModelRunEvent server ChatPanel"
--budget 8000 --graph graphify-out/graph.json`

## Integration Plan

1. Extend coherent live proof request bundles with a provider-ready row count.
2. Require provider-backed chat rows to be completed OpenRouter rows with a real
   requested or used model name.
3. Require voice provider proof to use the server-side `Voice provider ready`
   system-activity row for the selected voice request.
4. Exclude `Mock voice provider ready` rows from provider-key proof while still
   leaving them visible in Admin activity.
5. Surface provider-ready row counts in Admin bundle detail.
6. Add regression tests for fallback rows and mock voice provider rows.
7. Update local architecture/design copy and workflow evidence.

## Verification Plan

- `npm run format`
- `npm run test -- tests/beta-diagnostics.test.mjs`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Beta Diagnostics and App Design Local Beta Control
  Patterns.
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path for coherent provider-ready proof nodes.
