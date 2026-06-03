# Packet ACM: Proof Source Provenance Guard

## Objective

Prevent seeded QA or synthetic proof rows from being mistaken for the final
real local provider-key beta proof.

## Graphify Route

- `graphify query` routed the slice through `src/memory/beta.diagnostics.ts`,
  `src/views/AdminView.tsx`, `tests/beta-diagnostics.test.mjs`, and the existing
  `buildLiveBetaProofReceipt()` / `buildProviderKeyProofChecklist()` path.
- `graphify path buildLiveBetaProofReceipt AdminView` confirmed the receipt
  builder reaches the Admin surface through the provider-key checklist.

## Scope

- Add source provenance fields to provider captures and proof receipts.
- Classify receipt evidence as local live ledger, QA-seeded, synthetic, or mixed.
- Keep complete seeded rows structurally ready while marking them as not final
  live beta proof.
- Render the source status in Admin and keep diagnostics export metadata honest.
- Update the seeded browser QA fixture to expect the source guard.

## Verification Plan

- `npm run format`
- `npm run test -- tests/beta-diagnostics.test.mjs`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Beta Diagnostics desktop/mobile.
- Regenerate and smoke-test Graphify code architecture artifacts.
