# Packet ADE Result: Learner-state integrity and misconception loop

## Decision

Two independent read-only audits rejected the prior claim that only the final
provider drill remained. Both found the same P0: `BKTEngine` could persist a
concept mutation before a best-effort evidence-ledger write, leaving mastery
without required audit rows while callers still reported success.

The graph/book audit also found that the architecture promised source-linked
misconception candidates, but evaluated-answer paths never created them.

## Implemented

- Incorrect validated evaluated answers now create or consolidate bounded
  misconception candidates after a real concept update.
- Candidates carry book/conversation/request/source/evaluator context, scope to
  the active book in learner-model retrieval, and cannot mutate mastery.
- Admin Evidence now exposes candidate counts, evidence trails, and the
  candidate-only boundary.
- Validated mastery attempts require a stable attempt id plus
  `evaluated_answer_v1` or `flashcard_review_v1`.
- `commitValidatedMasteryAttempt()` commits the concept, verified evidence
  event, and linked mastery delta in one Dexie transaction.
- New concept attempts persist exact attempt/evidence/delta/contract links.
- Duplicate attempt replay is idempotent only when the complete linked audit
  rows still match; incomplete or conflicting replay fails closed.
- Ledger failure propagates and rolls back all three rows.
- `buildMasteryLedgerIntegrity()` joins concept attempt history, verified
  recall evidence, and mastery deltas to detect missing, orphan, mismatched, or
  unverified links.
- Admin Evidence and Beta Diagnostics show mastery-integrity status, and
  architecture readiness cannot reach 99/100 unless integrity is ready.
- Diagnostics export now includes full persistent-concept, evidence, mastery,
  and misconception ledgers.

## Verification

- Required repo-local Graphify traversal identified the connected runtime,
  learner-model, Admin, and diagnostics files before edits.
- `npm run brain:postchange -- --reason skill-preflight`: unavailable because
  `package.json` has no `brain:postchange` script.
- Focused misconception/mastery/diagnostics tests passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 202 tests.
- `npm run build`: passed.
- `git diff --check`: passed.
- In-app Browser desktop Admin Evidence QA showed the mastery-integrity meter,
  misconception empty state, and candidate-only copy.
- In-app Browser desktop Beta Diagnostics QA showed the mandatory
  `mastery integrity ready` readiness chip.
- In-app Browser mobile QA at `390x844` showed Evidence and integrity surfaces
  with `scrollWidth === clientWidth === 390`.
- Browser warning/error logs were empty.
- No provider traffic or microphone action occurred.

## Graphify

- Initial ordinary regeneration exposed a stale removed
  `recordMasteryDelta()` symbol in CLI query results.
- A clean rebuild preserved the prior graph under
  `/private/tmp/LearningAI-graphify-ADE.v2iyDM/graphify-out`.
- Clean `graphify update . --force`: 1247 nodes, 2139 edges, 69 communities.
- `npm run graphify:tree`: passed, writing `GRAPH_TREE.html` at 89.8 KB.
- Artifact grep found no removed `recordMasteryDelta`, `server.mjs`,
  `.tmp-test`, `node_modules/.cache`, `/private/tmp`, or `codex-runtimes`
  references.
- Graphify path connected `commitValidatedMasteryAttempt()` to
  `buildMasteryLedgerIntegrity()` in four hops and `MisconceptionGraph` to
  `LearnerModel` in two hops.

## Honest Readiness

The prior workflow 99% estimate is lowered to 98%. Packet ADE closes the
identified P0 and misconception loop, but the program remains active until a
fresh post-ADE completion audit and the real approved provider-key typed-chat
plus live-voice drill prove the remaining local architecture. AWS/cloud stays
deferred.
