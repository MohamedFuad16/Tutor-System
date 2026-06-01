# Orchestration: brain architecture implementation program

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.
- Preserve the existing `src/views/StudyView.tsx` dirty PDF chip tweak unless the first-phase code must directly integrate it.
- Defer AWS/cloud implementation; record it as future work only.

## Branching Rules

- If Graphify lookup misses a symbol, inspect `graphify-out/graph.json` or `GRAPH_REPORT.md` for labels, then read only identified files.
- If a proposed telemetry field needs Dexie schema changes, prefer an append-only local API/file or in-memory contract for phase one unless durable client storage is necessary.
- If server endpoints change, add or update Node tests before final gates.
- If Admin UI changes, run browser QA at desktop and mobile viewports before claiming done.
- If Graphify regeneration changes artifacts, review the diff and query smoke-test the updated graph.

## Packet Prompts

- Packet A: See `packets/A-architecture-decomposition.md`.
- Packet B: See `packets/B-runtime-telemetry-tool-calls.md`.
- Packet C: See `packets/C-admin-observability-ui.md`.
- Packet D: See `packets/D-memory-brain-runtime.md`.
- Packet E: See `packets/E-graphify-freshness.md`.
- Packet F: See `packets/F-qa-docs-git.md`.

## Completion Audit

- Workflow state updated.
- Sidecar results saved.
- Accepted/rejected integration decisions recorded.
- Code changes are source-backed and scoped.
- Required gates pass or failures are plainly documented.
- Browser QA evidence recorded.
- Graphify artifacts regenerated and queryable.
- Commit and push complete, with unrelated work excluded.
