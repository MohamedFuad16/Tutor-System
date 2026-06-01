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

# brain architecture implementation program: phase 6 report

## Scope

Phase 6 makes generated flashcards more useful to the evidence-gated learner brain by attaching them to real concepts when there is a strong local signal. It keeps the safety invariant from phase 5: ambiguous flashcards remain `general` and cannot change mastery.

## Graphify Context

- Graphify routed this slice through `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/memory/memory.orchestrator.ts`, `src/memory/revision.evidence.ts`, and `server.ts`.
- The relevant write paths were manual assistant-message flashcard generation and streamed `flashcardsUpdates` from the chat tool loop.

## Integration Decisions

- Added `src/memory/flashcard.concepts.ts` for generated-card concept resolution.
- Explicit non-placeholder concept IDs are preserved.
- Cards without explicit IDs only link to active learning-book concepts when the concept name appears in the card text.
- Matched learning-book concepts are mirrored into `db.concepts` with BKT defaults so Revision flashcard reviews can create verified mastery deltas.
- Server flashcard schemas accept optional `conceptId`; clients still validate and conservatively resolve before storage.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 24 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: app loaded, Study/Revision/Admin navigation controls were reachable, Admin Evidence controls were present, and browser console had 0 warnings/errors. Screenshot capture timed out in the in-app browser, so this phase records DOM/log smoke evidence only.
- Graphify regenerated from a stable temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke: 547 nodes, 905 edges, no temp-path markers in checked graph artifacts, and `graphify query "flashcard.concepts createFlashcardForStorage chooseFlashcardConcept persistentConceptFromLearningBookConcept ChatPanel" --budget 1800 --graph graphify-out/graph.json` returned `flashcard.concepts.ts`, `createFlashcardForStorage()`, `chooseFlashcardConcept()`, `persistentConceptFromLearningBookConcept()`, and `ChatPanel.tsx`.

## Remaining Work

- Add richer source-aware concept matching once there is enough beta data to tune false positives.
- Unify `learningBookConcepts` and BKT concepts more deeply if the local mirror proves useful.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 7 report

## Scope

Phase 7 adds local runtime tuning for the learner-brain architecture. It turns Admin from an observability-only surface into a local beta control plane for source-vs-web behavior, tool loop budget, memory context size, and activity polling. AWS/cloud remains deferred.

## Graphify Context

- Graphify routed the slice through `src/views/AdminView.tsx`, `src/store/index.ts`, `src/components/ChatPanel.tsx`, `server.ts`, `server/web-search.ts`, and the existing evidence/tool observability surfaces.
- Sidecar Boyle audited the proposed tuning slice read-only and identified tool-loop, manual-search, Admin refresh, and formatting-coverage risks.

## Integration Decisions

- Added `src/lib/brainRuntimeSettings.ts` for shared runtime defaults, bounds, policy types, and normalization.
- Persisted `brain_runtime_settings` in Zustand/localStorage with partial updates and reset-to-defaults.
- Added Admin `Runtime Tuning` tab with policy buttons, bounded sliders, current local setting meters, model behavior context, and local-only contract notes.
- Wired ChatPanel to send normalized runtime settings and the explicit Web Search UI flag in `/api/chat` requests.
- Server now normalizes runtime settings, records them in system activity metadata, applies `toolIterationLimit`, suppresses automatic freshness search in `manual_only`, and aligns model instructions with the active policy.
- Activity polling now uses the configured refresh interval and avoids overlapping fetches.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 27 tests.
- `npm run build`: passed.
- Browser QA on `http://localhost:3001`: Admin Activity loaded; Runtime Tuning rendered; Manual Only updated the visible policy summary; Reset defaults restored Source First and disabled the reset button; mobile viewport showed the Tuning tab and runtime controls; browser warning/error logs were 0.
- Browser screenshot was emitted during QA. Saving the screenshot artifact from the browser runtime to `.workflow/.../results/` was blocked by the browser runtime filesystem permissions.
- Graphify regenerated from a clean temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke after rebase: 566 nodes, 943 edges, no temp-path markers in checked graph artifacts, and query smoke returned `brainRuntimeSettings.ts`, `normalizeBrainRuntimeSettings()`, `AdminView()`, `ChatPanel.tsx`, and store/runtime-setting nodes.

## Remaining Work

- Extend `memoryConceptLimit` beyond the active-book concept list if beta behavior shows broader semantic-memory retrieval needs explicit bounding.
- Add full fake streaming model/tool-call policy tests when the chat loop has a lighter test harness.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 8 report

## Scope

Phase 8 makes chat model behavior durable and inspectable. It adds a local model-run ledger for blocked requests, starts, fallbacks, completions, failures, usage, runtime settings, and request metadata, then exposes that ledger in Admin.

## Graphify Context

- Graphify routed the main slice through `server.ts`, `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/memory/tool.jobs.ts`, `src/views/AdminView.tsx`, and `src/store/index.ts`.
- A follow-up graph query routed the mobile QA visibility issue through `src/App.tsx`, `GsapRouteFrame()`, and `AdminView()`.

## Integration Decisions

- Added Dexie schema version 9 with `modelRuns` as an append-only local observability table.
- Added `src/memory/model.runs.ts`, mirroring the durable tool-job helper style for status normalization, stable IDs, compact errors, and numeric clamping.
- Added `model_run` SSE events for `/api/chat` blocked, started, fallback, completed, and failed states.
- Persisted `model_run` events in `ChatPanel` so Admin can query them locally through IndexedDB.
- Added an Admin `Model Runs` tab for durable run counts, blocked/failed/fallback meters, recent run cards, runtime settings, and metadata details.
- Added route/Admin animation visibility fallbacks after browser QA found that mobile reloads could leave mounted Admin content hidden at `autoAlpha: 0`.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 31 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Activity loaded, Model Runs empty state rendered, a real blocked chat request through `ChatPanel` persisted one durable blocked model run, and the Model Runs tab displayed request id, provider, model, error, timing, and runtime metadata affordance.
- Mobile browser QA at 390x844: Admin and Model Runs rendered without horizontal overflow after the route/Admin animation guard.
- Browser screenshot capture timed out through the in-app browser CDP path, so this phase records DOM/viewport evidence rather than screenshot artifacts.
- `graphify update . --force`: regenerated the code architecture graph with 609 nodes, 998 links, and 38 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits, then regenerated again after rebasing over the remote Graphify refresh.
- `npm run graphify:tree`: passed and regenerated `graphify-out/GRAPH_TREE.html`.
- Graphify artifact smoke: no `/private/tmp` or phase temp path markers, and query smoke returned `model.runs.ts`, `createModelRunRecord()`, `recordModelRunEvent()`, `ModelRun`, `AdminView()`, and `ChatPanel()`.

## Remaining Work

- Add completed/fallback model-run integration tests with a fake streaming model harness.
- Decide whether server-side model-run persistence is needed once there is a local worker or queue.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 9 report

## Scope

Phase 9 adds durable local memory events for the learner-brain runtime. It makes session starts, saved interactions, learning-book writes, learning-concept writes, and graph concept updates inspectable from Admin without introducing AWS/cloud synchronization.

## Graphify Context

- Graphify routed the slice through `src/memory/longterm.memory.ts`, `src/memory/memory.orchestrator.ts`, `src/memory/evidence.ledger.ts`, `src/views/AdminView.tsx`, and existing model/tool/evidence observability helpers.
- Follow-up Graphify smoke after regeneration returned `memory.events.ts`, `MemoryEvent`, `createMemoryEventRecord()`, `recordMemoryEvent()`, `MemoryOrchestrator`, and `AdminView()`.

## Integration Decisions

- Added Dexie schema version 10 with an append-only `memoryEvents` table.
- Added `src/memory/memory.events.ts` for event normalization, compact records, confidence clamping, deduped source IDs, and non-blocking IndexedDB writes.
- Wired `MemoryOrchestrator` to record memory events for session start, interaction persistence, learning-book updates, learning-book concept updates, and chat graph concept writes.
- Added Admin `Memory Events` with durable counts, event mix, recent writes, latest context, source/metadata expansion, and clear user-brain-vs-Graphify boundary copy.
- Kept cloud sync, background queues, and AWS worker behavior out of scope for beta.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 35 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Memory rendered on desktop and mobile, displayed a real `session started` memory event from IndexedDB, had no horizontal overflow at 1280x900 or 390x844, and browser warning/error logs were 0.
- Browser screenshot save to `.workflow/.../results/admin-memory-events-smoke.png` was blocked by browser runtime filesystem permissions (`EPERM`), so this phase records DOM/log QA evidence instead.
- `graphify update . --force`: regenerated the code architecture graph with 624 nodes, 1029 edges, and 44 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke: no `/private/tmp` or phase stash markers were found in checked graph artifacts.

## Remaining Work

- Add retrieval-context memory events once broader semantic retrieval tuning lands.
- Decide during beta whether memory events need local retry/dead-letter handling.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 10 report

## Scope

Phase 10 adds durable local retrieval events for semantic memory context selection. It closes the Admin gap between "memory writes happened" and "which memory context was selected for a chat request" while keeping AWS/cloud synchronization out of scope.

## Graphify Context

- Graphify routed the slice through `src/memory/memory.orchestrator.ts`, `src/memory/longterm.memory.ts`, `src/views/AdminView.tsx`, `src/components/ChatPanel.tsx`, and `src/memory/learner.model.ts`.
- Path checks confirmed Admin reaches retrieval data through Dexie storage and ChatPanel reaches retrieval through `MemoryOrchestrator.getRelevantContext()`.

## Integration Decisions

- Added Dexie schema version 11 with an append-only `retrievalEvents` table.
- Added `src/memory/retrieval.events.ts` for local event normalization, stable IDs, compact fields, selected ID/name dedupe, score bounds, and non-blocking persistence.
- Instrumented `MemoryOrchestrator.getRelevantContext()` to record completed and failed retrievals with query summary, active-book/page filters, candidates, selections, scores, context size, tutor-instruction size, latency, and metadata.
- Added Admin `Retrieval Events` with durable counts, recent retrieval cards, selected concept chips, metadata details, and local-only semantic-memory boundary copy.
- Fixed a live Admin shell horizontal overflow found during browser QA.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 39 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: a real ChatPanel prompt created a completed retrieval event before the no-key chat request was blocked; Admin Retrieval displayed the query, completed status, context chars, selection counts, and boundary copy.
- Desktop browser QA at 1280x900: Retrieval tab rendered with document width matching viewport width and browser warning/error logs were 0.
- Mobile browser QA at 390x844: Retrieval tab and ledger rendered with document width matching viewport width and browser warning/error logs were 0.
- Browser screenshot emission worked during QA; saving screenshot files to `.workflow/.../results/` was blocked by browser runtime filesystem permissions (`EPERM`).

## Remaining Work

- Add richer retrieval ranking diagnostics after beta usage clarifies which scores are worth tuning.
- Decide whether retrieval failures need local retry/dead-letter states.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 11 report

## Scope

Phase 11 adds the first local memory-control path: durable correction and deletion-review requests. It makes "this memory is wrong" and "review this for deletion" visible and auditable before any destructive propagation is automated.

## Graphify Context

- Local Graphify routed the slice through `src/lib/userBrainArchitectureBook.ts`, `src/memory/longterm.memory.ts`, `src/memory/memory.events.ts`, and `src/views/AdminView.tsx`.
- Path checks confirmed Admin reaches `MemoryEvent` and `db` directly through `AdminView.tsx`.
- The MCP graph looked stale for this checkout, so the local `graphify-out/graph.json` CLI was used for source routing.

## Sidecar Results

- Kuhn recommended durable artifact/citation state as a high-value next slice.
- Anscombe recommended a non-destructive Beta Diagnostics/export tab as a safe Admin data-management slice.
- This phase chose correction requests because the architecture book explicitly calls memory correction/deletion a launch gate. Artifact/citation state and beta diagnostics remain follow-up candidates.

## Integration Decisions

- Added Dexie schema version 12 with append-only `correctionEvents`.
- Added `src/memory/correction.events.ts` for local correction event normalization, stable IDs, compact fields, related event IDs, and non-blocking persistence.
- Added Admin `Correction Requests` navigation, meters, recent request cards, manual request form, target mix, and local-only boundary copy.
- Added quick actions to Memory Events rows for `Mark wrong` and `Request deletion`.
- Kept this phase non-destructive: it records correction/deletion intent but does not yet invalidate derived summaries, embeddings, graph facts, or mastery deltas.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 43 tests.
- `npm run build`: passed.
- Browser QA on `http://127.0.0.1:3100`: a Memory Events quick action wrote a correction request, the Corrections tab displayed it, and the manual request form wrote a second request.
- Desktop browser QA at 1280x900: Correction Requests rendered with document width matching viewport width and browser warning/error logs were 0.
- Mobile browser QA at 390x844: Correction Requests rendered with document width matching viewport width and browser warning/error logs were 0.
- `npm run format:check`: expected to keep failing only on pre-existing `src/views/RevisionView.tsx`.

## Remaining Work

- Propagate correction/deletion state into derived memories, embeddings, graph facts, mastery deltas, tutor preferences, and exports where practical.
- Add source artifact/citation state ledgers.
- Add non-destructive beta diagnostics/export.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 12 report

## Scope

Phase 12 adds durable local source artifact and citation-state tracking. It turns streamed web-search source cards and source failures into inspectable local records without claiming that captured sources are verified.

## Graphify Context

- Graphify routed the slice through `src/lib/userBrainArchitectureBook.ts`, `src/components/ChatPanel.tsx`, `src/views/AdminView.tsx`, `src/memory/longterm.memory.ts`, and prior tool/model/retrieval ledgers.
- The architecture book calls out `ArtifactRecord`, `CitationState`, `artifact.ready`, and `citation.verified` as required runtime contracts. This phase implements the local record layer while keeping actual verification as a future explicit state transition.

## Integration Decisions

- Added Dexie schema version 13 with `artifactRecords` and `citationStates`.
- Added `src/memory/artifact.records.ts` for stable source-card artifact IDs, linked citation-state IDs, conservative state normalization, compact metadata, and non-blocking IndexedDB writes.
- Wired ChatPanel web-search streams to persist source cards as ready artifacts with `checking` citation states and to persist unavailable citation states when a search returns no sources or errors.
- Added compact `citation checking` chips to source cards.
- Added Admin `Source Artifacts` / `Artifacts & Citations` with meters, recent source artifacts, citation states, state mix, artifact mix, boundary copy, and review actions into the correction-request ledger.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 48 tests.
- `npm run build`: passed.
- `npm run format:check`: expected failure only on pre-existing `src/views/RevisionView.tsx` formatting.
- Browser QA on `http://127.0.0.1:3100`: Admin `Artifacts & Citations` rendered on desktop and mobile, boundary copy was visible, document width matched viewport width, and browser warning/error logs were 0.
- Browser screenshot saving to `.workflow/.../results/admin-source-artifacts-smoke.png` was blocked by browser runtime filesystem permissions (`EPERM`), so this phase records DOM/log QA evidence.
- `graphify update . --force`: regenerated the code architecture graph with 688 nodes, 1158 edges, and 47 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or phase stash markers in checked graph artifacts.
- Graphify query smoke returned `artifact.records.ts`, `ArtifactRecord`, `CitationState`, `recordWebSourceArtifact()`, `recordUnavailableCitationState()`, `AdminView()`, and `ChatPanel()`.

## Remaining Work

- Add an explicit local citation verifier before any source can move from `checking` to `verified`.
- Link generated notes, charts, code, flashcards, and other artifacts into the same `ArtifactRecord` table.
- Add non-destructive beta diagnostics/export.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 13 report

## Scope

Phase 13 adds local beta diagnostics and a capped JSON export path. It turns the Admin observability ledgers into reviewable readiness gates for local beta work without introducing AWS/cloud synchronization.

## Graphify Context

- Graphify routed the slice through `AdminView()`, `src/views/AdminView.tsx`, `src/memory/longterm.memory.ts`, `src/memory/artifact.records.ts`, correction events, model runs, retrieval events, and runtime settings.
- The architecture book calls out beta gates, artifact verification state, correction/export propagation, and cloud boundaries. This phase implements a local diagnostic snapshot and explicitly keeps cloud sync deferred.

## Integration Decisions

- Added `src/memory/beta.diagnostics.ts` for pure readiness snapshot and export payload building.
- Added Admin `Beta Diagnostics` with overall status, gate cards, export contents, runtime context, and out-of-scope boundaries.
- Added a local browser JSON export that packages currently loaded Admin ledger samples with `localOnly` metadata.
- Kept the export non-destructive and local-only. It is not a backup, cloud migration, or production-readiness certificate.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 51 tests.
- `npm run build`: passed.
- `npm run format:check`: expected failure only on pre-existing `src/views/RevisionView.tsx` formatting.
- Browser QA on `http://127.0.0.1:3100`: Admin `Beta Diagnostics` rendered on desktop and mobile, export feedback appeared after clicking `Export diagnostics JSON`, document width matched viewport width, and browser warning/error logs were 0.
- `graphify update . --force`: regenerated the code architecture graph with 703 nodes, 1179 edges, and 55 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or phase stash markers in checked graph artifacts.
- Graphify query smoke returned `beta.diagnostics.ts`, `buildBetaDiagnosticsSnapshot()`, `buildBetaDiagnosticsExport()`, and `AdminView()`.

## Remaining Work

- Add an explicit local citation verifier before any source can move from `checking` to `verified`.
- Link generated notes, charts, code, flashcards, and other artifacts into the same `ArtifactRecord` table.
- Propagate correction/deletion state into derived memories, embeddings, graph facts, mastery deltas, tutor preferences, and exports where practical.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 14 report

## Scope

Phase 14 adds a local non-destructive correction propagation layer, Admin request
timelines, the existing Study/Pdf PDF chip UI fixes, and in-app architecture book
updates. It keeps AWS/cloud synchronization and hard deletion out of scope.

## Graphify Context

- Graphify routed the correction slice through `CorrectionEvent`,
  `src/memory/correction.events.ts`, `src/memory/longterm.memory.ts`,
  `src/memory/beta.diagnostics.ts`, and `src/views/AdminView.tsx`.
- Graphify routed the book/design updates through `src/lib/tutorBook.json`,
  `src/lib/userBrainArchitectureBook.ts`, and `RevisionView` built-in books.
- Sidecar Curie recommended local correction propagation overlays as the next
  highest-value trust slice after beta diagnostics.
- Sidecar Confucius recommended Admin request timelines to group system events,
  model runs, and tool jobs by request id.

## Integration Decisions

- Added propagation helpers that resolve correction targets across local Dexie
  ledgers and apply conservative metadata overlays instead of hard deletion.
- Correction requests now mark affected evidence/mastery rows unverified,
  memory/retrieval rows skipped, artifacts stale/conflicting, and citation
  states unsupported/conflicting where practical.
- Admin correction requests can be applied, dismissed, or blocked, and manual or
  quick actions attempt overlay application immediately.
- Beta Diagnostics now counts propagated correction rows and includes a
  `correctionOverlay` export section.
- Admin System Activity now renders request timelines grouped by `requestId`.
- The Study PDF chip rail and reduced PDF top padding are included in this
  pushed phase.
- Tutor System Architecture, User Brain Architecture, and App Design Language
  built-in books were updated to describe the current local beta architecture.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 53 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Admin request timelines rendered,
  Memory quick action applied a non-destructive correction overlay, Corrections
  showed overlay counts and applied state, Beta Diagnostics export feedback
  appeared, Study rendered the compact PDF chip rail, and App Design Language
  opened the new Local Beta Control Patterns chapter.
- Mobile browser QA at 390x844: Admin rendered without horizontal overflow and
  browser warning/error logs were 0.
- Screenshot file writes to `.workflow/.../results/` were blocked by browser
  runtime filesystem permissions (`EPERM`), so this phase records emitted
  browser screenshots plus DOM/log evidence.
- `graphify update . --force`: regenerated the code architecture graph with 736
  nodes, 1247 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or
  temp-test markers in checked graph artifacts.
- Graphify query smoke returned `correction.events.ts`,
  `buildCorrectionPropagationPatch()`, `applyCorrectionPropagation()`,
  `buildBetaDiagnosticsExport()`, `AdminRequestTimeline`, and `AdminView()`.
- Final-check sidecar found one zero-row overlay display issue; Admin now only
  shows the green overlay-applied card when propagated rows are greater than 0.

## Remaining Work

- Final review agent, commit, and push remain for this phase.
- Full correction replay over embeddings, graph facts, generated summaries, and
  tutor preferences remains a future implementation slice.
- Add an explicit local citation verifier before any source can move from
  `checking` to `verified`.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 15 report

## Scope

Phase 15 adds the first explicit local citation-state transition layer. It lets
Admin run a source-card integrity check that can move citation rows from
`checking` to `verified`, `unavailable`, `conflicting`, or `unsupported` while
staying clear that this is local source-card integrity, not external factual
proof.

## Graphify Context

- Graphify routed the slice through `src/memory/artifact.records.ts`,
  `CitationState`, `ArtifactRecord`, `src/memory/beta.diagnostics.ts`, and
  `AdminView()`.
- The architecture books routed through `src/lib/tutorBook.json`,
  `src/lib/userBrainArchitectureBook.ts`, and the built-in App Design book in
  `RevisionView`.
- Sidecar Lagrange recommended keeping this as a local citation-state transition
  layer rather than a truth oracle.

## Integration Decisions

- Added `verifyLocalCitationIntegrity()` and Dexie wrappers for artifact-level
  and citation-level local checks.
- The verifier checks artifact/citation linkage, URL shape, domain consistency,
  explicit source refs/source ids/search ids, and saved source-card structure.
- It records `localOnly: true` and `externalContentFetched: false` in verifier
  metadata.
- Placeholder source refs, citation ids, claim ids, and artifact ids do not count
  as source evidence.
- URL query strings and hashes participate in the local URL comparison, so
  query-identified sources cannot be silently treated as the same row.
- Artifact `ready` remains distinct from citation `verified`.
- Beta Diagnostics now counts and summarizes `conflicting`, `unsupported`, and
  `not_checked` citation states.
- Admin Source Artifacts now shows a `Run local check` control, verifier feedback,
  and a `Not checked` meter.
- Tutor System Architecture, User Brain Architecture, and App Design Language
  books were updated to describe the local verifier boundary.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 61 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Source Artifacts rendered with the
  local-verifier boundary, `Not checked` meter, no horizontal overflow, and zero
  browser warning/error logs. Beta Diagnostics rendered source-grounding watch
  copy. User Brain and App Design books rendered the updated local verifier
  content.
- Clean Graphify regeneration after removing the generated `server.mjs`: rebuilt
  the code architecture graph with 725 nodes, 1263 edges, and 53 communities.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or phase-stash markers in checked graph artifacts.
- Graphify query smoke returned `verifyLocalCitationIntegrity()`,
  `isPlaceholderSourceRef()`, `verifyArtifactCitationIntegrity()`,
  `verifyCitationStateIntegrity()`, `buildBetaDiagnosticsSnapshot()`, and
  `AdminView()`.
- Final-check sidecar Descartes found one placeholder-source over-claim and two
  clarity issues. The phase now includes regression tests for placeholder refs
  and query/hash URL conflicts, plus visible `not_checked` diagnostics.
- Final recheck sidecar Hume found no must-fix remaining.

## Remaining Work

- Phase 15 was committed and pushed before phase 16 began.
- Generated notes, charts, code, flashcards, and other artifacts still need to be
  fully linked into the same `ArtifactRecord` verification path.
- External content verification and source-span claim matching remain future
  slices.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 16 report

## Scope

Phase 16 links generated flashcard batches into the local artifact/citation trust
ledger. It keeps the source-card verifier boundary intact: generated flashcard
provenance is visible and reviewable, but stays `not_checked` until a broader
generated-artifact verifier exists.

## Graphify Context

- Graphify routed the slice through `src/memory/artifact.records.ts`,
  `src/components/ChatPanel.tsx`, `AdminView()`, `CitationState`,
  `ArtifactRecord`, and the in-app architecture books.
- Final Graphify regeneration produced 730 nodes, 1280 edges, and 43
  communities. Query smoke returned `supportsLocalCitationIntegrityArtifact()`,
  `createGeneratedFlashcardsArtifactRecords()`,
  `recordGeneratedFlashcardsArtifact()`, `ChatPanel()`, and `AdminView()`.

## Integration Decisions

- Added generated-flashcard artifact record construction and persistence helpers.
- Manual message flashcard generation and streamed chat-tool flashcard batches
  now write local `flashcards` `ArtifactRecord` rows.
- Each generated flashcard batch also writes a `not_checked` citation-state row
  with local provenance metadata: batch id, source message id, card ids, concept
  ids, unresolved-card count, and book context where available.
- Admin now avoids running the source-card local verifier against generated
  flashcard artifacts and shows `No local verifier yet` instead.
- The Dexie verifier wrappers also avoid persisting unsupported verifier
  transitions for non-source-card artifacts, preserving `not_checked`
  provenance until a real verifier exists.
- Tutor System Architecture, User Brain Architecture, and App Design Language
  were updated to describe flashcard artifact provenance and the `not_checked`
  boundary.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 63 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Admin Source Artifacts rendered
  generated-artifact provenance copy, `Not checked`, no horizontal overflow, and
  zero warning/error logs. User Brain, Tutor System Architecture, and App Design
  Language rendered the updated book copy.
- `graphify update . --force`: passed after removing generated dev/test files.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or generated `server.mjs` paths.
- Final-check sidecar Plato found a P1 where Admin could mutate flashcard
  provenance out of `not_checked`; this was fixed with a verifier support guard
  and regression coverage.

## Remaining Work

- Link generated charts, code snippets, images, websites, and other artifacts
  into the same reviewable provenance path.
- Add real generated-artifact verification beyond source-card, flashcard, and
  learning-note provenance rows.
- Source-span claim matching and external content verification remain future
  slices.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 18: Book Reader And Stored Audio Overview

Phase 18 starts the updated Library/readability objective. It turns the User
Brain Architecture book from a sprawling 18-chapter research memo into a shorter
8-chapter reader path, then adds a stored audio-overview player for built-in
chapters.

## Graphify Context

- Graphify routed the slice through `RevisionView()`, `builtInBooks`,
  `userBrainArchitectureBook.ts`, `tutorBook.json`, `TUTOR_ARCHITECTURE.md`,
  `audio.ts`, and server voice/TTS routes.
- OpenAI docs confirmed that GPT audio output is available through audio
  modalities, but this local environment did not expose `OPENAI_API_KEY`.

## Integration Decisions

- Added typed chapter audio overview metadata in
  `src/lib/chapterAudioOverviews.ts`.
- Added a stored audio overview card to `RevisionView` with play, pause,
  progress, transcript, and 1x / 1.25x / 1.5x playback controls.
- Stored the opening User Brain Architecture overview asset under
  `public/audio-overviews/user-brain-runtime-overview.mp3`.
- The Library player uses the stored static asset. It does not call the live
  `/api/tts` route when the learner presses play.
- Added the user-brain book source and audio-overview metadata to the repo
  formatting gate.
- Tutor System Architecture, Tutor book, and App Design Language now describe
  shorter book reading and stored audio overviews.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 64 tests.
- `npm run build`: passed.
- `npm run format:check`: passed after adding
  `src/lib/userBrainArchitectureBook.ts` and
  `src/lib/chapterAudioOverviews.ts` to the format gate.
- Browser QA on `http://127.0.0.1:3100`: User Brain Architecture rendered as 8
  unique chapters, the stored MP3 loaded from
  `/audio-overviews/user-brain-runtime-overview.mp3` with a 38.79 second
  duration, the overview card showed transcript and speed controls, the 1.5x
  button set the audio element playback rate to 1.5, and the page had no
  horizontal overflow or warning/error console logs.
- Browser automation could load and control the media element but could not
  start audible playback under the in-app browser's autoplay/automation guard.
- `graphify update . --force`: regenerated the code architecture graph with 738
  nodes, 1301 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query returned `StoredAudioOverview()`,
  `chapterAudioOverviews.ts`, `userBrainChapterAudioOverviews`, and
  `RevisionView()`.
- Final-check sidecar Peirce found no TypeScript/runtime blockers and confirmed
  the Library path does not call `/api/tts`; it flagged stale workflow evidence,
  which was updated before commit.

## Remaining Work

- Generate and store chapter-specific audio overview assets for the remaining
  built-in book chapters.
- Add Admin provenance rows for stored overview generation metadata.
- Continue generated-artifact verification for charts, code snippets, images,
  websites, and richer note source spans.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 17: Learning-note Artifact Provenance

Phase 17 links generated learning-book entries into the local artifact/citation
trust ledger. It keeps the same conservative boundary as generated flashcards:
generated notes are visible and reviewable, but remain `not_checked` until a
real notes/source-span verifier exists.

## Graphify Context

- Graphify routed the slice through `MemoryOrchestrator`,
  `src/memory/memory.orchestrator.ts`, `src/memory/artifact.records.ts`,
  `ArtifactRecord`, `CitationState`, `AdminView()`, and the in-app architecture
  books.
- Read-only sidecar Kierkegaard confirmed the safest insertion point was the
  `db.learningEntries.add()` block inside
  `MemoryOrchestrator.updateLearningBookFromConversation()`.

## Integration Decisions

- Added generated learning-note artifact construction and persistence helpers.
- `MemoryOrchestrator.updateLearningBookFromConversation()` now creates a
  stable learning-entry id, persists the entry, and writes a sibling `notes`
  `ArtifactRecord` plus `not_checked` citation-state row.
- The learning-entry id is the artifact/citation source reference so multiple
  entries in one conversation do not overwrite each other.
- Metadata records local-only generated provenance, `externalContentFetched:
false`, book/chapter/conversation/document context, concept ids, model, and
  confidence.
- Admin and the built-in books now describe generated learning-note provenance
  without implying source verification.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 64 tests.
- `npm run build`: passed.
- `npm run format:check`: passed after formatting `AdminView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Source Artifacts rendered the
  `chat, memory, and tool streams` copy, generated learning-note empty-state
  copy, `Not checked` meter, no horizontal overflow, and zero warning/error
  logs at mobile and desktop widths. Tutor System Architecture, User Brain
  Architecture, and App Design Language rendered the updated note-provenance
  copy.
- `graphify update . --force`: regenerated the code architecture graph with 733
  nodes, 1293 edges, and 50 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query returned `createGeneratedNotesArtifactRecords()`,
  `recordGeneratedNotesArtifact()`,
  `.updateLearningBookFromConversation()`, `MemoryOrchestrator`, and
  `AdminView()`.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or generated `server.mjs` paths.
- Final-check sidecar Galileo found no code blockers. It flagged stale workflow
  closeout fields, which were updated before commit.

## Remaining Work

- Link generated charts, code snippets, images, websites, and other artifacts
  into the same reviewable provenance path.
- Add real generated-artifact verification beyond source-card, flashcard, and
  learning-note provenance rows.
- Source-span claim matching and external content verification remain future
  slices.
- AWS/cloud synchronization remains out of scope until beta testing.
