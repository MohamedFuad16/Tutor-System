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

# brain architecture implementation program: phase 3 report

## Scope

Phase 3 adds a local durable evidence ledger for learner-state changes. It preserves the phase 2 rule that model summaries do not raise mastery, while making those summaries inspectable as evidence records and recording BKT mastery deltas from explicit recall attempts.

## Graphify Context

- Graphify routed the slice through `src/memory/longterm.memory.ts`, `src/memory/evidence.mastery.ts`, `src/memory/bkt.engine.ts`, `src/memory/memory.orchestrator.ts`, and `src/views/AdminView.tsx`.
- Revision and Chat were inspected only for connected recall/tool surfaces. Revision flashcard review currently updates scheduling, not BKT concept attempts.

## Integration Decisions

- Added Dexie v8 tables for `evidenceEvents`, `masteryDeltas`, and `toolJobs`.
- Added `src/memory/evidence.ledger.ts` for local evidence event and mastery-delta records.
- `MemoryOrchestrator` writes durable model-summary evidence for learning-book concept updates and chat graph updates.
- `BKTEngine` writes durable recall evidence plus mastery deltas after explicit BKT attempts.
- Admin now includes an `Evidence Ledger` tab for durable evidence counts, recent evidence events, BKT mastery deltas, and the local tool-job table.
- Durable `ToolJob` writes are deferred; the table is present and surfaced, while runtime tool calls continue to use the phase 1 in-memory system activity ledger.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 12 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin opened, `Evidence` tab rendered, evidence/mastery/tool-job sections appeared, and no visible Dexie/runtime errors were present.
- Graphify regenerated from clean committed source in a temporary worktree; query smoke found `evidence.ledger.ts`, `EvidenceEvent`, `MasteryDelta`, `ToolJob`, `AdminView`, and `BKTEngine`.

## Remaining Work

- Wire Revision flashcard/review controls to BKT attempts where concept IDs are available.
- Persist runtime tool execution into `toolJobs` with retry/dead-letter states.
- Add correction/deletion propagation over evidence and mastery deltas.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 4 report

## Scope

Phase 4 makes tool-call observability durable in the local beta store. The server still owns the live in-memory activity ledger, but chat streams now emit structured `tool_job` events and ChatPanel persists them into Dexie so Admin can inspect tool execution history after the stream finishes.

## Graphify Context

- Graphify routed this slice through `server.ts`, `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/views/AdminView.tsx`, and `src/memory/evidence.ledger.ts`.
- The directly relevant server paths were `/api/chat` tool-call execution branches for `look_at_current_page`, `web_search`, `update_graph`, `generate_flashcards`, and unsupported tools.

## Integration Decisions

- Added compact `tool_job` SSE events for tool execution running/completed/failed/blocked states.
- Added `src/memory/tool.jobs.ts` to normalize statuses, create stable local IDs, compact summaries, and upsert tool jobs into Dexie.
- ChatPanel now records `tool_job` stream events into `db.toolJobs`.
- Admin Evidence Ledger now presents Tool Jobs as active durable records instead of a future placeholder.
- Raw tool arguments are not stored; the server sends compact summaries and redacted metadata.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 15 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin Evidence tab rendered the durable Tool Jobs section and empty state; browser console had 0 warnings/errors; smoke screenshot saved at `results/admin-tool-jobs-smoke.png`.
- Graphify regenerated from a stable temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke: 516 nodes, 847 edges, no temp-path markers in checked graph artifacts, and `graphify query "recordToolJobEvent createToolJobRecord tool.jobs ToolJobEventInput" --budget 1600 --graph graphify-out/graph.json` returned `tool.jobs.ts`, `recordToolJobEvent()`, `createToolJobRecord()`, `normalizeToolJobStatus()`, and `ToolJobEventInput`.

## Remaining Work

- Add durable retry queues and dead-letter review states.
- Persist server-side worker execution when a real local/remote queue exists.
- Wire Revision flashcard/review controls to BKT attempts where concept IDs are available.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 5 report

## Scope

Phase 5 wires Revision flashcard self-grading into verified local learner evidence where a flashcard has a real persisted concept ID. It keeps current scheduling behavior intact and deliberately skips placeholder `general` cards so model-generated flashcards do not fabricate mastery changes.

## Graphify Context

- Graphify routed this slice through `src/views/RevisionView.tsx`, `src/memory/bkt.engine.ts`, `src/memory/evidence.ledger.ts`, `src/memory/longterm.memory.ts`, `src/components/ChatPanel.tsx`, and `src/memory/memory.orchestrator.ts`.
- Read-only sidecar Peirce confirmed `FlashcardUI` sends quality scores, `handleReview` only scheduled cards before this phase, BKT requires `db.concepts`, and most current generated cards default to `general`.

## Integration Decisions

- Added `src/memory/revision.evidence.ts` to gate flashcard evidence before BKT.
- Flashcard reviews are treated as generation evidence because the learner recalls before self-grading.
- `quality >= 4` is correct; `0` and `2` are incorrect.
- `general` or missing concept IDs skip mastery evidence but still allow normal flashcard scheduling.
- `BKTEngine.updateConceptAttempt` now accepts optional evidence source, summary, and metadata so Admin evidence can distinguish `revision_flashcard` from generic BKT attempts.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 19 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001/revision`: Revision loaded the active General Study learning book; Admin Evidence tab still rendered; browser console had 0 warnings/errors; smoke screenshot saved at `results/revision-flashcard-evidence-smoke.png`.
- Graphify regenerated from a stable temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke: 530 nodes, 871 edges, no temp-path markers in checked graph artifacts, and `graphify query "revision.evidence recordFlashcardReviewEvidence flashcardReviewOutcome bktEngine updateConceptAttempt" --budget 1800 --graph graphify-out/graph.json` returned `revision.evidence.ts`, `recordFlashcardReviewEvidence()`, `flashcardReviewOutcome()`, `RevisionView.tsx`, and `bkt.engine.ts`.

## Remaining Work

- Improve flashcard generation so cards attach real concept IDs where possible.
- Bridge `learningBookConcepts` to BKT-capable persisted concepts or define a separate mastery path.
- AWS/cloud synchronization remains out of scope until beta testing.
