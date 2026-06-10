# Orchestration

## Work Packets

- Explorer A: Graphify-guided dead-file inventory and deletion manifest.
- Worker B: local profiles and server learner store.
- Worker C: Dexie migration/cache boundary and no-data-loss checks.
- Worker D: user-scoped chat/voice context packet path.
- Worker E: shared background task contract for chat and voice.
- Worker F: docs, Admin visibility, final explanation, and verification.

## Integration Policy

- Main agent owns cross-cutting source edits and final integration.
- Subagents may report findings and proposed changes, but deletion and schema changes are integrated only after main-agent review.
- No worker may edit `graphify-out` or revert unrelated local changes.

## Deletion Policy

Every cleanup candidate must be classified as:

- `keep`: referenced by imports, package scripts, routes, static assets, docs that are product-owned, or Graphify paths.
- `delete`: no references, no script usage, build/test safe, and not user/workflow generated.
- `needs manual decision`: ambiguous ownership, generated artifact, historical workflow, or external usage cannot be ruled out.

Only `delete` candidates may be removed.
