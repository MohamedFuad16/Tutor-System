# ADA - Graphify Scratch Contamination Guard

## Scope

Cleaned the code architecture graph after Graphify routed provider-proof queries
to generated `server.mjs` output. This is Graphify/code-architecture work, not a
user-facing learner-brain change.

## Changes

- Moved `npm run dev` output from repo-root `server.mjs` to
  `node_modules/.cache/learningai/server.mjs` so Node module resolution still
  works while Graphify ignores the bundle.
- Updated `npm run clean` to remove `server.mjs`, `.tmp-test`, and the dev
  cache bundle.
- Added `.tmp-test/` to `.gitignore`.
- Removed the existing generated root `server.mjs`.
- Rebuilt `graphify-out` from scratch after moving the stale generated graph
  aside to `/private/tmp/LearningAI-graphify-stale.HL5ius/graphify-out`.

## Verification

- `PORT=3001 npm run dev`: passed and served from
  `node_modules/.cache/learningai/server.mjs`.
- Confirmed root `server.mjs` and `.tmp-test` were absent after cleanup.
- `graphify update . --force`: passed from a clean graph directory with 1208
  nodes, 2075 edges, and 77 communities.
- `npm run graphify:tree`: passed and wrote `GRAPH_TREE.html` at `87.4 KB`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`,
  `node_modules/.cache`, `/private/tmp`, or `codex-runtimes` references.
- Provider-proof Graphify query now routes through source files such as
  `ChatPanel.tsx`, `AdminView.tsx`, `beta-diagnostics.test.mjs`,
  `longterm.memory.ts`, `memory.orchestrator.ts`, and `StudyView.tsx`; it no
  longer routes to generated `server.mjs`.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 185/185.
- `git diff --check`: passed.

## Status

Current conservative local-beta brain architecture completion estimate remains
99%.

This packet improves the repository architecture brain agents use, reducing
token waste and false routing before the remaining real provider-key drill.
