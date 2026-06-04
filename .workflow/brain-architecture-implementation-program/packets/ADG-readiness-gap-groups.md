# Packet ADG: Readiness gap groups

## Objective

Make the remaining local brain-architecture proof gaps inspectable by category
instead of hiding them behind one completion percentage or a single "next gap"
line.

## Context

- Graphify routed the next brain-architecture gap through
  `buildBrainArchitectureReadiness()`, `buildBetaDiagnosticsSnapshot()`,
  `buildProviderKeyProofChecklist()`, `AdminView.tsx`, and
  `tests/beta-diagnostics.test.mjs`.
- The real provider-key typed-chat and live Deepgram voice drill is still the
  hard remaining local beta proof gap.
- This packet must not call OpenRouter, Deepgram, microphone, or AWS/cloud
  systems.

## Do

- Add a typed readiness gap-group contract to diagnostics.
- Categorize open gaps into brain-flow ledger, coherent live proof, mastery
  integrity, and provider drill buckets.
- Render the full categorized gap list plus next action in Admin Beta
  Diagnostics.
- Add focused tests that protect the ready state and provider-drill-pending
  state.

## Do Not

- Do not change provider traffic gates.
- Do not run live provider calls.
- Do not mark the full brain-architecture program complete.

## Verification

- `npm run test -- tests/beta-diagnostics.test.mjs`
- In-app Browser desktop/mobile Admin Beta Diagnostics QA.
- `npm run brain:postchange -- --reason final-doc-check`
- Graphify regeneration for the changed diagnostics/Admin architecture.
