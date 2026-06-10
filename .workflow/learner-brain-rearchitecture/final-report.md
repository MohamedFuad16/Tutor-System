# Learner Brain Re-Architecture Final Report

## What Changed

- Added a local learner profile layer with `activeUserId` in app state and a default local profile bridge for future auth.
- Added a server-side learner store backed by per-user folders under `data/users/<userId>/` and a per-user SQLite database.
- Routed user identity through learner HTTP APIs, document ingest, chat requests, and voice websocket auth/context metadata.
- Added Dexie v15 indexes for forward `userId` scoping on learning books, entries, documents, and background jobs.
- Stamped generated learning books and learning entries with `userId` from Study, chat, and voice learning-book updates.
- Moved uploaded PDF durability toward the server store: document ingest now returns user-scoped `fileUrl` and `textUrl`; IndexedDB keeps cache-friendly previews and legacy rows are copied non-destructively.
- Extended `BrainContextPacket` with explicit user scope and scope metadata so chat and voice share the same context envelope.
- Added a shared background-task persistence contract for chat/voice task lifecycle rows.
- Scoped Analytics and Revision to the active local learner when user-scoped learning books exist, with a legacy fallback for older unscoped rows.
- Surfaced the active local `userId` in Admin's learner overview.
- Added focused tests for the learner store, migration bridge behavior, context user scope, and build/test bundling.
- Created a deletion manifest and performed no source deletion because no file was proven unused under the approved cleanup policy.

## Why The Old Architecture Felt Fuzzy

The app had strong pieces, but they were blurred together:

- Browser IndexedDB acted like both cache and durable database.
- Chat and voice each carried context in their own shape.
- Background jobs existed, but the durable request/task ledger was not clearly user-scoped.
- The learner brain and repo architecture brain could be confused conceptually, even though Graphify is only for code architecture.
- User identity was mostly implicit, so future cloud migration would have required retrofitting `userId` across storage, context, and jobs.

## New Boundaries

- Repo brain: Graphify artifacts in `graphify-out/`; not manually edited and not mixed with learner data.
- Learner brain: local profile plus server-side user folder, SQLite records, PDFs, extracted text, artifacts, migration snapshots, and background jobs.
- Browser cache: IndexedDB remains useful for UI state, previews, and non-destructive migration staging, but it is no longer the intended durable PDF/text owner for new uploads.

## Verification

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 281 node tests and 592 DOM tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason learner-brain-rearchitecture`: passed.
- Browser smoke at `http://localhost:3000`: desktop and 390x844 mobile loaded without console warnings/errors; final Analytics DOM smoke showed the active learner scope chip with no console warnings/errors.
- Document ingest smoke with `X-LearningAI-User-Id: smoke-user`: returned a user-scoped server document with file/text URLs and extracted text preview.

## Cleanup Result

No files were deleted. Explorer A hit a subagent execution limit before it could prove deletion candidates, and the approved policy was "delete only proven unused files." The manifest remains intentionally empty instead of guessing.

## Concept Glossary

- IndexedDB: the browser's local database. In this app it should behave like cache and offline fallback, not the only durable home for a learner's PDFs.
- SQLite: a small file-based database on the server. Here each local learner gets their own `brain.sqlite`.
- BKT: Bayesian Knowledge Tracing, the model that estimates concept mastery from validated learner evidence.
- Embeddings: numeric representations of text used for semantic search and memory retrieval.
- Context packet: the structured bundle sent to the tutor containing user, book, PDF, page, memory, mastery, and pending-work context.
- Background task: slow work delegated away from the live tutor response, such as tool calls, document work, or artifact generation, with a stored lifecycle.
