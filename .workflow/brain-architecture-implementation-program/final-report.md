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
