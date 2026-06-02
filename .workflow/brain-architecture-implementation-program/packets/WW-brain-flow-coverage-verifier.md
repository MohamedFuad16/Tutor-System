# Packet WW: Brain Flow Coverage Verifier

## Objective

Add a local beta diagnostic that verifies the complete brain-flow story across
chat mode, voice mode, foreground tool calls, request correlation, and the
background learner-memory agent.

## Context

Phase 43 unified chat and voice context injection through
`src/memory/brain.context.ts`. Admin request timelines can now show packet
injection rows beside retrieval, model, and tool rows, but Beta Diagnostics did
not yet have a single readiness gate that proves these ledgers connect into one
working local flow.

## Ownership

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- Built-in architecture/design documentation
- Workflow evidence files
- `graphify-out/*` after explicit Graphify regeneration

## Do

- Use Graphify before file inspection.
- Keep the verifier local-only and ledger-based.
- Treat missing evidence as `watch` and failed/blocked rows as `blocked`.
- Show the signal checklist in Admin Beta Diagnostics.
- Document AWS/cloud synchronization as deferred.

## Do Not

- Add cloud persistence or AWS workers.
- Claim hidden model internals are verified.
- Edit unrelated workflow folders.
- Manually edit `graphify-out`; regenerate it after the source change.

## Expected Output

- A pure brain-flow coverage helper for synthetic tests and Admin runtime input.
- A Beta Diagnostics readiness item for the full chat/voice/tool/memory flow.
- Admin UI showing signal counts and missing evidence.
- Tests covering ready and blocked brain-flow coverage.
- Updated docs, books, workflow result, verification, commit, and push.
