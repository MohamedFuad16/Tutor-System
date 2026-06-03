# Packet ACL: Live Provider Proof Receipt

## Status

Completed through local verification gates before Graphify regeneration.

## Summary

This packet adds an export-ready local receipt for the selected coherent
provider-key proof. The receipt summarizes whether the chat+voice proof is ready
and preserves the exact local evidence anchors needed for beta review.

The packet does not call providers, expose key values, count fallback/mock rows,
or start AWS/cloud work.

## Implementation Notes

- Added `LiveBetaProofReceipt` and `buildLiveBetaProofReceipt()`.
- `ProviderKeyProofChecklist` now carries `liveProofReceipt` beside the runbook
  and drill packet.
- Admin Beta Diagnostics now renders a `Local proof receipt` card with receipt
  status, provider capture count, selected chat/voice request ids, proof attempt
  ids, freshness/window state, provider capture mini-cards, and local-only
  warnings.
- Diagnostics export metadata now includes `liveProofReceipt`.
- `tests/beta-diagnostics.test.mjs` now verifies pending and ready receipt
  states, selected request ids, provider captures, proof-complete state, and the
  local-only warning.

## Verification Evidence

- `npm run test -- tests/beta-diagnostics.test.mjs`: passed via the project
  test runner, 165 tests.
- `npm run format`: passed.
- `node --check .workflow/brain-architecture-implementation-program/packets/phase72-browser-qa.mjs`:
  passed.
- `npm run test`: passed, 165 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- The first `phase72-browser-qa.mjs` run under the sandbox could not launch
  system Chrome; the same command was rerun with browser-launch approval.
- The seeded browser fixture initially stayed pending because it used stale
  fixed timestamps and older background-memory gate metadata. The fixture was
  corrected to seed fresh rows and the strict `model_observation_v1` gate
  fields used by the live diagnostics contract.
- Headless Chrome QA via `phase72-browser-qa.mjs` seeded a local-only provider
  proof dataset and confirmed desktop and mobile Admin Beta Diagnostics rendered
  the ready local proof receipt, provider captures count `2`, selected chat and
  voice request ids, proof attempt id, OpenRouter and Deepgram capture cards,
  fresh/window chips, local-only cloud boundary warning, no horizontal overflow,
  and zero warning/error logs.
- Browser QA screenshots saved as `ACL-admin-proof-receipt-desktop.png` and
  `ACL-admin-proof-receipt-mobile.png`; JSON evidence saved as
  `phase72-browser-qa.json`.

## Remaining Work

- Run the deliberate live provider-key beta drill with real OpenRouter and
  Deepgram traffic to record non-seeded provider rows.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- Keep AWS/cloud synchronization deferred until after local beta proof.
