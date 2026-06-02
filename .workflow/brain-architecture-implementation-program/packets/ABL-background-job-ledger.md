# Packet ABL: Durable Background Job Ledger

## Objective

Close the local beta gap where interaction-memory capture ran as a fire-and-forget timer. Add a durable local ledger for background memory work with retry and dead-letter states that Admin can inspect and export.

## Graphify Context

- `graphify query "background queue retry dead letter MemoryOrchestrator setTimeout learning book update Admin diagnostics memory events background jobs" --budget 6000 --graph graphify-out/graph.json`
- `graphify query "longterm.memory Dexie toolJobs modelRuns memoryEvents retry status queued running failed blocked AdminView beta diagnostics" --budget 6000 --graph graphify-out/graph.json`
- `graphify path "MemoryOrchestrator" "AdminView()" --graph graphify-out/graph.json`
- `graphify path "recordMemoryEvent()" "buildBetaDiagnosticsSnapshot()" --graph graphify-out/graph.json`

## Scope

- Add a local Dexie `backgroundJobs` ledger.
- Add helper contracts for status normalization, id generation, retry routing, and job execution.
- Wrap `MemoryOrchestrator.trackInteraction()` interaction capture in the local job ledger.
- Surface background job status in Admin Activity timelines, meters, Beta Diagnostics, and diagnostics export.
- Update README, Tutor System Architecture, User Brain Architecture, Tutor Architecture Library JSON, App Design Language copy, and workflow evidence.

## Out Of Scope

- AWS/cloud queues, workers, tenants, or sync.
- Graphify watch mode or hooks.
- A general scheduler for every background task beyond this interaction-memory queue.

## Verification Plan

- `npm run test`
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Activity/Beta and affected book surfaces at desktop and mobile widths.
- Explicit Graphify regeneration and query/path smoke checks.
