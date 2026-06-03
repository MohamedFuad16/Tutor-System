# Packet ACD Result: Live Proof Attempt Identity

## Accepted

- Added a local `activeBetaProofAttemptId` store contract with direct
  localStorage persistence under `active_beta_proof_attempt_id`.
- Admin Beta Diagnostics can now start, restart, clear, display, export, and
  compare a deliberate proof-attempt id.
- Shared chat and voice brain-context packets carry `proofAttemptId` through
  memory events, semantic retrieval metadata, model rows, tool jobs, transcript
  saves, evaluated-answer evidence, flashcard artifacts, graph updates, and
  learning-book update records.
- `buildCoherentLiveProofFromLedgers()` now selects proof rows with shared
  proof-attempt ids and adds a required `Shared deliberate proof attempt`
  coherent-proof check.
- Coherent provider-key proof stays incomplete when typed-chat and live-voice
  rows are otherwise complete but do not share the same deliberate attempt id.
- Admin Beta Diagnostics now renders active and shared attempt chips in the
  provider-key live proof panel, runbook, selected request bundles, and export
  metadata.

## Rejected

- Running live provider-key traffic automatically.
- Treating old complete rows from separate browser sessions as one beta proof.
- Adding AWS/cloud synchronization or remote attempt storage.
- Adding Dexie schema changes for this derived proof-attempt metadata.

## Verification

- `npm run format`: passed.
- `npm run test -- tests/beta-diagnostics.test.mjs tests/brain-context.test.mjs`:
  passed via the project test runner, 156 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase66-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin Beta
  Diagnostics rendered the deliberate beta-run checklist, Start proof attempt
  control, shared attempt chip, Shared deliberate proof attempt check, fresh
  proof state, QA chat/voice request ids, no horizontal overflow, and zero
  console logs.
- Browser screenshots saved as `ACD-admin-proof-attempt-desktop.png` and
  `ACD-admin-proof-attempt-mobile.png`; JSON evidence saved as
  `phase66-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1103 nodes, 1939 edges, and 64 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`81.2 KB`).
- Graphify smoke query found `AdminView()`, `ChatPanel()`,
  `buildCoherentLiveProofFromLedgers()`, `buildCoherentRequestBundle()`,
  `buildBrainFlowCoverageFromLedgers()`, `buildBetaDiagnosticsSnapshot()`,
  `brainOrchestrator`, `beta.diagnostics.ts`, `ChatPanel.tsx`, and
  `AdminView.tsx`.
- Graphify path `buildCoherentLiveProofFromLedgers()` to `AdminView()` found a
  direct call route.
- Graphify path `buildBrainContextPacket()` to `ChatPanel()` found the expected
  two-hop route through `ChatPanel.tsx`.
- Graphify path `brainOrchestrator` to `ChatPanel()` found the expected
  two-hop route through `ChatPanel.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes after regeneration.

## Remaining Risk

- The deliberate provider-key typed-chat and live-voice beta run still needs to
  be executed when live provider traffic is in scope. This packet gives that
  future run a shared attempt identity, but does not call providers itself.
