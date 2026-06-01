# Packet I Result: Durable Tool Jobs

Status: completed, verified local implementation.

Graphify routing used:

- `graphify query "ToolJob tool execution ChatPanel SSE tool_call tool_execution server.ts /api/chat generate_flashcards update_graph Admin tool jobs"`

Accepted implementation:

- `/api/chat` now emits compact `tool_job` SSE events for tool execution start, completion, failure, and blocked states.
- ChatPanel now persists `tool_job` events into Dexie `toolJobs` through `src/memory/tool.jobs.ts`.
- Tool job IDs are stable per request, tool name, and tool-call ID, so a running row is updated when the final status arrives.
- Admin Evidence Ledger now treats Tool Jobs as active persisted records instead of a placeholder schema.
- Added focused Node tests for tool-job status normalization, stable IDs, and record creation.

Verification evidence:

- `npm run lint`: passed.
- `npm run test`: passed, 15 tests.
- `npm run build`: passed.
- `npm run format:check`: failed only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin Evidence tab rendered the durable Tool Jobs section and empty state without console warnings/errors. Screenshot: `results/admin-tool-jobs-smoke.png`.
- Graphify regenerated from a stable temporary worktree with this phase's source files copied in; checked artifacts show 516 nodes, 847 edges, no temp-path leaks, and `tool.jobs.ts` query smoke returned `recordToolJobEvent()`, `createToolJobRecord()`, and `ToolJobEventInput`.

Deferred:

- Durable retry queues and dead-letter review.
- Server-side durable tool persistence; this phase keeps persistence local in the browser beta store.
- AWS/cloud worker infrastructure remains out of scope until beta testing.
