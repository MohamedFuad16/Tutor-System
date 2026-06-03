Packet ID: ACA

Objective: Make the coherent provider-key live proof show the selected typed
chat and live-voice request row details so a beta run can identify the exact
missing pipeline stage.

Context:

- Packet ABV added the coherent chat + voice proof bundle.
- Packet ABX added the ordered live beta runbook.
- Packet ABZ prevented fallback model rows from completing provider-key proof.
- The remaining operator gap was inspectability: Admin showed whether the
  coherent bundle passed, but not the selected chat/voice row counts for
  context, retrieval, completed model, tool, mastery, transcript, and background
  memory evidence.

Ownership:

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- Workflow QA script/results for this packet.
- Regenerated `graphify-out/*`.

Do:

- Add compact selected-request bundle summaries to coherent live proof output.
- Show row counts for the selected typed-chat and live-voice request in Admin
  Beta Diagnostics.
- Show missing row labels when no selected request or an incomplete selected
  request lacks required proof rows.
- Keep provider-key proof semantics unchanged.
- Verify desktop and mobile Admin Beta Diagnostics with no console errors or
  horizontal overflow.

Do not:

- Run provider traffic automatically.
- Treat synthetic or fallback rows as live provider-key proof.
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
- `node .workflow/brain-architecture-implementation-program/packets/phase63-browser-qa.mjs`
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
