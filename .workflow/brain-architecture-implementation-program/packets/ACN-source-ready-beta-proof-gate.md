# Packet ACN: Source-Ready Beta Proof Gate

## Objective

Make Provider-Key Live Proof status distinguish structurally complete local
ledger rows from final beta-ready proof. Seeded, synthetic, or mixed provider
capture sources may prove UI/test wiring, but they must not mark the overall
provider-key beta proof as ready.

## Graphify Route

- `graphify query "buildLiveBetaProofReceipt buildProviderKeyProofChecklist
buildCoherentLiveProofFromLedgers buildLiveBetaProofDrillPacket sourceKind
sourceReadyForBeta AdminView" --budget 14000 --graph graphify-out/graph.json`
- `graphify path "buildLiveBetaProofReceipt" "AdminView" --graph
graphify-out/graph.json`
- `graphify path "buildCoherentLiveProofFromLedgers" "AdminView" --graph
graphify-out/graph.json`

## Write Scope

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- `.workflow/brain-architecture-implementation-program/packets/phase72-browser-qa.mjs`
- Workflow docs/results/state
- Regenerated `graphify-out/*`

## Acceptance Criteria

- `ProviderKeyProofChecklist` exposes final beta readiness separately from
  structural ledger completeness.
- Admin shows `source proof pending` for structurally complete seeded/mixed
  rows.
- Local-live proof remains ready when both provider captures are unseeded real
  local ledger evidence.
- Seeded and mixed proof sources remain visible but do not satisfy final beta
  readiness.
- Browser QA confirms desktop/mobile Admin renders the pending-source state with
  no horizontal overflow and clean console logs.
- No provider calls, key exposure, AWS/cloud work, or Dexie schema change.
