# Learner Brain Re-Architecture

## Goal

Separate the repository architecture brain from the learner brain, then make learner data user-scoped and durable on the local server while keeping IndexedDB as a browser cache.

## Success Criteria

- A local user profile id is generated, stored, selectable in app state, and sent to chat, voice, document, and learner-store requests.
- Durable learner records are written under `data/users/<userId>/`, with SQLite as the metadata ledger and per-user files for uploaded PDFs and extracted text.
- Browser Dexie records no longer need to own durable PDF blobs or full extracted text; those move through the server learner-store APIs.
- Chat and voice context packets carry user/book/document metadata and can retrieve server-side document excerpts.
- Background work has a typed task lifecycle shared by chat and voice: queued, running, completed, failed, and inserted.
- Validated mastery evidence remains the only path that can raise BKT/mastery state.
- Unused-code cleanup is represented by an auditable manifest; files are deleted only when proven unused.

## Constraints

- Follow Graphify-first navigation and do not manually edit `graphify-out`.
- Preserve unrelated dirty/untracked files unless the manifest explicitly proves deletion.
- No production auth or cloud storage in this phase.
- Existing learner data migration must be non-destructive.
- Keep provider keys secret-safe and opt-in.

## Verification

- Focused unit tests for user profiles, local learner store, context packets, background tasks, and deletion manifest rules.
- Full gates: `npm run lint`, `npm run test`, `npm run build`, `npm run brain:postchange -- --reason learner-brain-rearchitecture`, and `npm run format:check` for touched formatted files.
- Browser QA for PDF upload, typed chat context, voice context/auth, Revision/Analytics user scoping, and Admin evidence visibility.
