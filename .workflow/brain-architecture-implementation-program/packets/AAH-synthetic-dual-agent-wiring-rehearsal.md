# Packet AAH: Synthetic Dual-Agent Wiring Rehearsal

## Objective

Add a deterministic Admin-only rehearsal for the local chat and voice brain
contracts without allowing synthetic rows to count as live beta evidence.

## Graphify Context

- `buildBrainFlowCoverageFromLedgers()` -> `AdminView()` is a direct call edge.
- `buildBrainContextPacket()` -> `ChatPanel()` is a two-hop import/contains
  path.
- Graphify routed tool parity through `server.ts`, `voiceAgentTools.ts`,
  `brain.context.ts`, `beta.diagnostics.ts`, and their focused tests.

## Ownership

- `src/lib/chatAgentTools.ts`
- `src/memory/brain.rehearsal.ts`
- `server.ts`
- `src/views/AdminView.tsx`
- `tests/brain-rehearsal.test.mjs`
- architecture books and workflow evidence
- regenerated `graphify-out/*`

## Do

- Extract the typed-chat tool definitions into one pure shared module.
- Reuse shared context helpers and the existing eight-signal verifier.
- Keep the rehearsal deterministic, local-only, in-memory, provider-free, and
  excluded from Dexie, exports, request timelines, and live readiness counts.
- Add a clearly labeled Admin Beta Diagnostics panel.

## Do Not

- Do not write synthetic rows into Dexie.
- Do not call providers.
- Do not weaken live beta readiness.
- Do not implement AWS/cloud persistence.

## Verification

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- Browser QA for Admin Beta desktop, tablet, and mobile rehearsal interaction
- explicit Graphify regeneration and graph smoke queries
