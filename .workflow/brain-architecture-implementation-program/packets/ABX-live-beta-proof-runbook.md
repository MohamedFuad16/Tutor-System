Packet ID: ABX

Objective: Turn the provider-key live proof checklist into an ordered local
runbook so Admin tells the user exactly what manual beta proof step is next,
without calling providers automatically or implementing cloud/AWS behavior.

Context:
- Packet ABT separated provider-key setup from live ledger proof.
- Packet ABV added the coherent chat + voice proof bundle so scattered green
  rows cannot count as one working beta flow.
- The remaining usability gap was operational: Admin had proof checks, but not
  a concise ordered runbook for a human beta run.

Ownership:
- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- Workflow QA script/results for this packet.
- Regenerated `graphify-out/*`.

Do:
- Add a typed helper that derives the runbook from the same provider-key proof
  checks Admin already uses.
- Surface ordered steps for provider keys, active multi-PDF book selection,
  typed-chat proof, live-voice proof, background memory/gates, and coherent
  bundle export.
- Show next-step status, missing blockers, evidence needed, and compact live
  anchors where available.
- Include the runbook in the local diagnostics export metadata without exposing
  key values.
- Add focused tests for missing-key setup, complete proof, and scattered-row
  coherent-bundle failure.
- Verify Admin Beta Diagnostics at desktop and mobile viewports.

Do not:
- Run live provider-key traffic automatically.
- Treat synthetic rehearsal, unit tests, or aggregate rows as real beta proof.
- Add AWS/cloud synchronization.
- Manually edit Graphify artifacts outside the explicit regeneration step.

Expected output:
- Source patch, focused tests, browser QA evidence, Graphify refresh, commit,
  and push.

Verification:
- `npm run format`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA at desktop and mobile viewports for Admin Beta Diagnostics.
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
