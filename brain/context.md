# Brain Context Overview

`/brain` is the executable architecture cognition layer for this repository.

It is generated from source code by `generate-brain.ts` and is meant to be queried by agents before changes, not trusted as static prose.

## Operational Artifacts

- `knowledge/graph.json`: typed architecture graph.
- `knowledge/query-engine.ts`: graph query CLI.
- `contracts/api-contracts.json`: server/client API and WebSocket contracts generated from source.
- `flows/route-map.json`: `activeView` route/view mapping.
- `flows/state-flow.json`: Zustand selector and writer map.
- `flows/render-graph.json`: React render/wrap relationships.
- `impact/impact-analysis.json`: semantic impact and coupling scores.
- `retrieval/context-packs/*.json`: dependency-aware task context packs.
- `embeddings/chunks.json`: deterministic sparse token vectors for local retrieval.
- `compressed-context/subsystems.json`: source-linked subsystem summaries.
- `snapshots/file-hashes.json`: drift baseline.

## Required Workflow

1. Run `npm run brain:retrieve -- <task>`.
2. Run `npm run brain:impact -- <file-or-symbol>` for target files.
3. Run `npm run brain:verify` before finalizing.
4. Run `npm run brain:drift-check`; if stale, run `npm run brain:generate`.
5. Append task memory with `npm run brain:memory -- append ...` for completed architecture work.
