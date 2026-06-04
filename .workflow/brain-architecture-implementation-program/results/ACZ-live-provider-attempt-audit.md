# ACZ - Live Provider Attempt Audit

## Scope

Added a local-only Admin/diagnostics audit for the final provider-key drill. It
does not call providers and does not move AWS/cloud work forward.

## Changes

- Added `LiveBetaProofAttemptAudit` to `src/memory/beta.diagnostics.ts`.
- Attached the audit to `buildLiveBetaProofPreflight()` so the same object can
  report both good states:
  - ready to call providers for the real drill;
  - receipt-ready after real local-live provider rows exist.
- Added the audit to Admin Beta Diagnostics and diagnostics export metadata.
- Added tests for final live proof readiness, seeded QA evidence that can rerun
  provider traffic, and blocked multi-PDF preflight.

## Verification

- `npm run test -- tests/beta-diagnostics.test.mjs`: passed through the project
  runner with 185 tests.
- `npm run format:check`: passed.
- `git diff --check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser desktop QA on `http://localhost:3001`: Admin Beta Diagnostics
  opened, Provider-Key Live Proof rendered, and DOM contained `Attempt audit`
  plus `Live drill preflight`.
- In-app Browser mobile QA at `390x844`: Admin Beta Diagnostics opened through
  the mobile `Beta` tab, DOM contained `Attempt audit` plus `Live drill
  preflight`, and measured horizontal overflow was false
  (`scrollWidth=390`, `innerWidth=390`).
- Mobile screenshot capture timed out in the browser backend, so the mobile
  evidence is DOM/overflow based rather than screenshot based for this packet.
- `graphify update . --force`: passed with 1244 nodes, 2119 edges, and 72
  communities.
- `npm run graphify:tree`: passed and wrote `GRAPH_TREE.html` at `89.1 KB`.
- Graphify query for `LiveBetaProofAttemptAudit Admin attempt audit
  provider-key preflight` found the new audit types plus `AdminView()` and
  `beta.diagnostics.ts`.
- Contamination grep over touched source files found no banned animal/creature
  words.

## Status

Current conservative local-beta brain architecture completion estimate remains
99%.

Remaining hard gap: run the real provider-key typed-chat turn plus live Deepgram
voice drill with OpenRouter and Deepgram traffic under one Admin proof attempt,
then confirm the selected provider captures are real local-live rows bound to
that proof attempt.
