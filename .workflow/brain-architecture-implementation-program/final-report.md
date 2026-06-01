# Final Report: brain architecture implementation program

## Outcome

## Accepted Results

## Rejected Results

## Conflicts Resolved

## Verification Evidence

## Remaining Risks

## Reusable Follow-up

# brain architecture implementation program: phase 1 report

## Scope

Phase 1 implements local Admin observability foundations for the user-brain architecture program. AWS/cloud work is deferred.

## Graphify Context

- MCP graph stats: 756 nodes, 1351 edges, 51 communities.
- MCP label lookup missed several LearningAI brain labels, so Graphify CLI and generated graph artifacts were used for source routing.
- CLI queries identified Admin, Chat, server, store, memory orchestrator, longterm memory, BKT, embeddings, and Graphify scripts as first-phase surfaces.

## Sidecar Results

- A architecture decomposition: local observability accepted as the first safe slice; Dexie schema migrations and evidence-gated mastery are next slices.
- D memory runtime: avoid schema churn in phase 1; add traceability before durable evidence tables.
- E Graphify freshness: checked-in graph was stale; local regeneration was explicitly warranted by the user request.
- F QA/docs/git: verify Admin, debug API, chat blocked-event recording, Graphify smoke, and preserve unrelated dirty files.

## Integration Decisions

- Implemented an in-memory local system activity ledger in `server.ts` with 250-event retention, secret-key redaction, request IDs, status/kind summaries, and debug authorization.
- Added `/api/debug/system-activity` plus local debug CORS support for localhost/null-origin development reads.
- Instrumented `/api/chat`, `/api/trace`, `/api/learning-book-update`, `/api/generate-flashcards`, web search, model fallback, and tool execution paths.
- Added Admin `System Activity` tab with live event stream, event mix, tuning snapshot, usage/memory meters, mobile tab controls, empty/error states, and auto-refresh.
- Added `tests/system-activity.test.mjs` for debug endpoint metadata and blocked chat event capture without live model calls.
- Deferred Dexie evidence tables, mastery gating, durable tool jobs, AWS/cloud, and citation enforcement to future slices.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 7 tests.
- `npm run build`: passed.
- `npm run format:check`: failed on pre-existing `src/views/RevisionView.tsx`; touched files were formatted with Prettier.
- Browser QA: Admin Activity rendered live at `http://localhost:3001`; after a local no-key chat request, the event stream showed `Chat request blocked`, `model`, `blocked`, request ID, and event mix counts.
- API smoke: `/api/debug/system-activity` returned `localOnly: true`, retention limit 250, Graphify/learner-brain meters, and events.
- Graphify: `npm run graphify:update` and `npm run graphify:tree` completed. Final artifacts were regenerated again during rebase to resolve the remote Graphify refresh conflict without hand-merging generated files. `graphify-out/graph.json` has 507 nodes, 793 edges, `built_at_commit` equal to the remote Graphify refresh base (`9a5da7ee7287cc1c10ad2fef3d191e43e309ea24`), and query smoke returned Admin/system-activity nodes.

## Remaining Work

- Evidence-gated mastery adapter and tests: no evidence, no mastery increase.
- Durable local event tables such as `EvidenceEvent`, `MasteryDelta`, and `ToolJob` after a careful Dexie migration.
- Citation-state enforcement for external claims.
- Correction/deletion propagation across derived memories.
- AWS/cloud architecture is still deferred until beta evidence is available.

# brain architecture implementation program: phase 2 report

## Scope

Phase 2 implements the first local evidence-gating slice for mastery. It keeps model summaries useful for notes and confidence while preventing them from raising learner mastery without verified recall evidence.

## Graphify Context

- Initial Graphify traversal identified `src/memory/memory.orchestrator.ts`, `src/memory/bkt.engine.ts`, `src/memory/longterm.memory.ts`, and `src/components/ChatPanel.tsx` as the directly connected surfaces.
- Follow-up Graphify query after regeneration found `src/memory/evidence.mastery.ts`, `gateModelSummaryMastery()`, `masteryFromEvidenceAttempt()`, `MemoryOrchestrator`, and `BKTEngine`.

## Integration Decisions

- Added a pure local evidence policy adapter in `src/memory/evidence.mastery.ts`.
- Model-summary learning-book updates preserve existing mastery instead of accepting model-proposed mastery.
- Chat-derived `addOrUpdateConcept` writes now keep mastery gated and move confidence separately.
- New model-summary concepts start at `mastery: 0` and BKT prior `p_learn: 0.2`.
- BKT attempts now update both `p_learn` and `mastery` through recognition, generation, and transfer caps.
- Added `tests/evidence-mastery.test.mjs` and included the helper in the test bundle.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: initial sandbox run failed on local socket binding; escalated rerun passed, 10 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin Activity, Study/Chat, and Revision surfaces loaded without visible errors.
- Graphify regenerated from a clean temporary worktree with this phase's source files copied in, old graph artifacts outside the scan root, and source paths in `graph.json` verified as relative.
- Graphify query smoke found the new evidence-mastery helper and memory/BKT neighbors.

## Remaining Work

- Add durable local evidence and mastery-delta tables after a Dexie migration plan.
- Surface evidence events in Admin beyond the current activity ledger.
- Wire active recall/revision submissions into explicit BKT evidence paths where the UI does not already do so.
- AWS/cloud synchronization remains out of scope until beta testing.
