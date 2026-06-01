# Packet R: Beta diagnostics and local export

## Objective

Add a local-only beta diagnostics surface that summarizes user-brain runtime readiness and exports a capped JSON diagnostic snapshot for review.

## Scope

- Add a pure diagnostics builder for local beta readiness gates.
- Add an Admin `Beta Diagnostics` tab with readiness gates, row counts, runtime context, and out-of-scope boundaries.
- Add a local JSON export path that packages currently loaded Admin ledger samples without syncing to cloud.
- Keep AWS/cloud, tenant-scoped persistence, automated deletion propagation, and automatic citation verification out of scope.

## Write Scope

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- `package.json`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` only through explicit Graphify regeneration

## Status

Completed implementation; verification pending.
