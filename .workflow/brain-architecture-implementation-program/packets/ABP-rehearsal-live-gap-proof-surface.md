# Packet ABP: Rehearsal Live-Gap Proof Surface

## Objective

Make the Admin synthetic wiring rehearsal useful as a beta-readiness handoff:
after it passes in memory, Admin should show what the synthetic contracts prove,
what the live local ledger still lacks, and whether the app is ready for
deliberate provider-key chat and voice turns.

## Graphify Context

- `graphify query "remaining brain architecture gaps after request-correlated
transcript persistence live provider-key chat voice end-to-end proof stored
injected tool calling both agent layers Admin Beta Diagnostics
runLocalBrainWiringRehearsal local verifier" --budget 8000 --graph
graphify-out/graph.json`
- `graphify query "Admin Diagnostics run local brain wiring rehearsal button
synthetic verifier live ledger proof chat voice request correlated tools
memory retrieval model runs source files" --budget 8000 --graph
graphify-out/graph.json`

These routes selected `src/memory/brain.rehearsal.ts`,
`src/views/AdminView.tsx`, `src/memory/beta.diagnostics.ts`,
`src/memory/brain.context.ts`, `src/lib/chatAgentTools.ts`,
`src/lib/voiceAgentTools.ts`, and `tests/brain-rehearsal.test.mjs`.

## Scope

- Add a reusable live-vs-synthetic gap summary for brain wiring rehearsal.
- Keep synthetic rehearsal excluded from live beta readiness and durable rows.
- Show Admin users the provider-key readiness state after rehearsal.
- Show the rehearsed chat/voice request IDs, context PDF IDs, and chat/voice
  tool contracts.
- Correct the Admin rehearsal copy from nine-signal to eleven-signal coverage.
- Keep AWS/cloud and provider-call spending out of scope.

## Verification Requirements

- `npm run format`
- `npm run lint`
- `npm run test`
- `npm run build`
- Browser QA: Admin Diagnostics at mobile and desktop, click local rehearsal,
  verify live-gap copy, provider-key state, request IDs, context PDFs, tool
  chips, and no overflow.
- Graphify regeneration, tree rebuild, smoke query, path check, and scratch grep.
