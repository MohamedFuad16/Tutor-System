# Packet ACL: Live Provider Proof Receipt

## Objective

Turn the selected coherent provider-key chat+voice proof into a compact local
receipt that Admin can show and the beta diagnostics export can carry.

## Graphify Route

- `graphify query` routed the next provider-proof gap through
  `src/memory/beta.diagnostics.ts`, `src/views/AdminView.tsx`, and
  `tests/beta-diagnostics.test.mjs`.
- `graphify path buildProviderKeyProofChecklist AdminView` confirmed the
  Admin route for checklist-derived proof metadata.
- Direct source inspection stayed scoped to those connected diagnostics, Admin,
  test, and workflow files.

## Scope

- Add a `LiveBetaProofReceipt` derived from the existing provider-key checklist
  and coherent live proof bundle.
- Include provider captures, selected chat/voice request ids, proof attempt ids,
  freshness/window state, local-only warnings, and missing checks.
- Render the receipt in Admin Beta Diagnostics and include it in the local
  diagnostics export metadata.
- Preserve the hard proof boundary: no provider calls, no provider key values,
  no AWS/cloud sync, and no fallback/mock rows counted as provider-key proof.

## Verification Plan

- `npm run format`
- `npm run test -- tests/beta-diagnostics.test.mjs`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Beta Diagnostics desktop/mobile.
- Regenerate and smoke-test Graphify code architecture artifacts.
