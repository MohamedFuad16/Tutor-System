# Packet ADF Result: Local postchange preflight

## Decision

The checkout repeatedly treated `brain:postchange` as a required gate while the
script did not exist. Packet ADF makes that gate real without resurrecting the
removed custom architecture runtime: Graphify remains the code architecture
graph, and the wrapper only runs local checks.

## Implemented

- Added `scripts/brain-postchange.mjs`.
- Added `npm run brain:postchange`.
- Included the new script in `format` and `format:check`.
- The preflight runs format check, TypeScript lint, production build,
  `git diff --check`, and a Graphify artifact scratch-reference scan.
- `--full` additionally runs the full test suite.

## Verification

- `npm run brain:postchange -- --reason skill-preflight`: passed.
- `npm run brain:postchange -- --reason final-gate --full`: passed, including
  all 202 tests.
- `npm run brain:postchange -- --reason post-graphify-refresh`: passed after
  Graphify regeneration.
- `npm run format:check`: passed through the new preflight.
- `npm run lint`: passed through the new preflight.
- `npm run build`: passed through the new preflight.
- `git diff --check`: passed through the new preflight.
- `graphify update . --force`: passed, regenerating 1257 nodes, 2149 edges,
  and 63 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`90.3 KB`).
- Repo-local Graphify smoke query found `brain-postchange.mjs`,
  `checkGraphifyScratchRefs()`, `textFilesIn()`, and `scratchPatterns`.
- Graphify scratch-reference scan passed through the new preflight.
- No provider traffic, microphone action, AWS/cloud work, or implicit Graphify
  regeneration occurred.

## Follow-up

The broader brain-architecture program remains active. This slice only closes
the missing local postchange gate; it does not run the real OpenRouter plus
Deepgram provider proof drill or change the deferred AWS/cloud boundary.
