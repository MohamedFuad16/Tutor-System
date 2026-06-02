# Result AAI: Generated-Note Preview Lexical Support

## Status

Completed.

## Integration Notes

- Read-only sidecar Ramanujan confirmed the smallest truthful verifier is a
  no-fetch token-overlap report nested under existing citation metadata. It
  recommended leaving top-level state unions unchanged, mapping insufficient
  overlap to `unavailable`, and preserving no-document notes as provenance-only.
- Read-only sidecar Carson mapped the next queue phase: keep foreground tool
  telemetry intact, then add a local-only durable background queue with retries
  and dead-letter review for generated-note matching work.
- Added `createGeneratedNoteClaimSpanCoverage()` with compact sentence claims,
  normalized meaningful terms, best-span overlap, matched/partial/missing state,
  matched counts, coverage percent, and explicit no-entailment/no-factual-truth
  flags.
- Required-span notes now need saved count, ids, preview identities, and local
  lexical support to agree. Identity drift is `conflicting`; insufficient local
  support is `unavailable`.
- `MemoryOrchestrator` records the claim-span policy on generated learning-note
  artifacts.
- Admin Source Artifacts renders preview lexical-support state, matched claims,
  and percentage while stating that overlap is not entailment or fact proof.
- Admin rows prefer the latest recomputed citation-integrity coverage report
  after a local rerun, falling back to the write-time snapshot before reruns.
- Updated Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and App Design Language copy.
- Refreshed the affected stored audio guides for User Brain Ledger,
  Retrieval/Artifacts, and App Design Local Beta Controls at 3-4 minute length.

## Remaining Local Beta Work

- Add stronger semantic and document-wide grounding checks beyond compact saved
  previews.
- Add generated-artifact verifiers for charts, code snippets, images, websites,
  previews, and other unsupported kinds.
- Add audio-content transcript matching beyond manifest integrity.
- Add the scoped durable local background queue with retries and dead-letter
  review.

## Verification

- Focused `artifact-records.test.mjs`: passed, 34 tests.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: sandbox run reached 121 passing tests and failed only on the
  known local socket-binding restriction; approved rerun passed, 129 tests.
- `npm run build`: passed.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing assets.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the checkout has no `brain:postchange` script.
- Browser QA confirmed desktop Admin Sources at `1440x1000` and mobile Admin
  Sources at `390x844` rendered the lexical-support and honest-boundary copy
  with no horizontal overflow and no browser warnings or errors. The seeded
  browser database had audio manifests but no generated-note rows, so matched,
  partial, unavailable, and identity-drift rows remain covered by focused tests.
- Browser QA confirmed User Brain Architecture / Learner Brain Ledger and
  Retrieval, Artifacts, And Citations; App Design Language / Local Beta Control
  Patterns; and Tutor System Architecture / Memory, Dexie, And The Library
  rendered the updated copy with one visible player, no native media controls,
  no horizontal overflow, and no browser warnings or errors.
- Refreshed MP3s measured about `3:30`, `3:14`, and `3:44`.
- Browser screenshots: `AAI-iab-admin-sources-desktop.png`,
  `AAI-iab-admin-sources-mobile.png`, `AAI-iab-user-brain-ledger-mobile.png`,
  `AAI-iab-app-design-controls-mobile.png`, and
  `AAI-iab-tutor-memory-mobile.png`.
- `graphify update . --force`: passed, `968` nodes, `1692` edges, `54`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `createGeneratedNoteClaimSpanCoverage()`,
  `generatedNoteClaimsFromSummary()`, `generatedNoteSourceSpansFromMetadata()`,
  `verifyLocalCitationIntegrity()`, `createGeneratedNotesArtifactRecords()`,
  and `AdminView()`.
- `graphify path "createGeneratedNoteClaimSpanCoverage()" "AdminView()"`:
  found a three-hop path through `artifact.records.ts` and `AdminView.tsx`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
