# Packet ACM: Proof Source Provenance Guard

## Status

Completed through local source, test, build, and browser gates before Graphify
regeneration.

## Summary

The provider-key proof receipt now distinguishes structurally complete local
proof rows from rows marked as seeded QA or synthetic evidence. This preserves
the seeded browser fixture for repeatable Admin QA while preventing it from
being treated as final live beta proof.

## Implementation Notes

- Added `sourceKind`, `sourceReadyForBeta`, and `sourceSummary` to
  `LiveBetaProofReceipt`.
- Added `runSource`, `seeded`, and `synthetic` markers to
  `CoherentLiveProofProviderCapture`.
- `buildProviderCapture()` derives source markers from metadata fields such as
  `proofSource`, `evidenceSource`, `runSource`, `fixtureSource`,
  `sourceKind`, `qaSeeded`, `seeded`, and `synthetic`.
- `buildLiveBetaProofReceipt()` keeps structurally complete seeded proof rows
  `ready`, but sets `sourceReadyForBeta` to `false` unless the evidence is from
  the local live ledger.
- Admin Beta Diagnostics now shows the source kind chip, a source summary, and
  seeded/synthetic capture tags.
- The seeded browser QA packet now marks provider rows with
  `proofSource: local_qa_seed` and asserts the UI says the receipt is not final
  live beta proof.

## Verification Evidence

- `npm run test -- tests/beta-diagnostics.test.mjs`: passed via the project
  test runner, 166 tests.
- `npm run format`: passed.
- `node --check .workflow/brain-architecture-implementation-program/packets/phase72-browser-qa.mjs`:
  passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test`: passed, 166 tests.
- Headless Chrome QA via `phase72-browser-qa.mjs` seeded a local-only provider
  proof dataset and confirmed desktop/mobile Admin Beta Diagnostics rendered the
  ready receipt as `QA seeded`, displayed the "not final live beta proof"
  boundary, showed seeded provider capture tags, retained selected request ids
  and provider capture count `2`, had no horizontal overflow, and captured zero
  warning/error logs.
- Browser QA screenshots updated as `ACL-admin-proof-receipt-desktop.png` and
  `ACL-admin-proof-receipt-mobile.png`; JSON evidence updated as
  `phase72-browser-qa.json`.

## Remaining Work

- Run the deliberate real provider-key drill with OpenRouter and Deepgram rows
  from the actual app, then confirm the receipt source becomes
  `local_live_ledger` with `sourceReadyForBeta: true`.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- Keep AWS/cloud synchronization deferred until after local beta proof.
