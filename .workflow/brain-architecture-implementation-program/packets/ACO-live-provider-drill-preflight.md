# Packet ACO: Live Provider Drill Preflight

## Objective

Add a local-only preflight gate for the real provider-key beta drill. The Admin
surface should show whether the user can now run the deliberate OpenRouter
typed-chat and Deepgram live-voice proof flow, without calling providers,
displaying keys, or treating seeded browser rows as final beta proof.

## Graphify Route

- `graphify query "provider-key beta drill preflight real OpenRouter Deepgram
sourceReadyForBeta betaProofReady Admin proof attempt active book multiple PDFs
chat voice live proof" --budget 14000 --graph graphify-out/graph.json`
- `graphify query "buildLiveBetaProofDrillPacket liveProofDrillPacket canRun
setupChecklist activeMultiPdfBookRequired activeAttemptRequired AdminView
provider-key" --budget 14000 --graph graphify-out/graph.json`
- `graphify path "buildLiveBetaProofDrillPacket" "AdminView" --graph
graphify-out/graph.json`

## Write Scope

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- `.workflow/brain-architecture-implementation-program/packets/phase72-browser-qa.mjs`
- Workflow docs/results/state
- Regenerated `graphify-out/*`

## Acceptance Criteria

- Diagnostics expose a `LiveBetaProofPreflight` result that checks provider-key
  readiness, active proof attempt, active learning book, at least two ready PDFs
  in that book, and absence of hard live blockers.
- Admin Beta Diagnostics renders a `Live drill preflight` panel with ready
  checks, missing checks, active book/proof attempt IDs, and ready PDF IDs.
- The preflight marks `canRun` only when local setup is ready and final
  `betaProofReady` is still false.
- Diagnostics export metadata includes the preflight object and learning
  document ledger rows needed to audit it locally.
- Browser QA confirms desktop/mobile Admin renders the ready-to-call-providers
  preflight state with no horizontal overflow and clean console logs.
- No provider calls, key exposure, AWS/cloud work, or Dexie schema change.
