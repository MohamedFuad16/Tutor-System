Packet ID: ACC

Objective: Prevent stale or time-spread local ledger rows from passing as a
current provider-key chat+voice beta proof.

Context:

- Packet ABV added the coherent chat + voice proof bundle.
- Packet ACA exposed selected chat/voice request row details.
- Packet ACB preserved model-run phases so fallback and completed rows no
  longer overwrite each other.
- The remaining proof-quality gap was freshness: a coherent-looking bundle
  could be assembled from old local rows or from chat/voice rows too far apart
  to represent one deliberate beta run.

Ownership:

- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `tests/beta-diagnostics.test.mjs`
- Workflow QA script/results for this packet.
- Regenerated `graphify-out/*`.

Do:

- Add a local proof-window freshness check to coherent live proof.
- Treat selected chat/voice rows outside the shared proof window as watch, not
  ready.
- Treat selected proof rows older than the Admin diagnostics snapshot freshness
  window as stale.
- Surface proof freshness and proof-window chips in Admin Beta Diagnostics.
- Verify desktop and mobile Admin with a complete but stale seeded local proof.

Do not:

- Run provider traffic automatically.
- Treat synthetic rehearsal rows as live beta proof.
- Add AWS/cloud synchronization.
- Add a Dexie schema migration.
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
- `node .workflow/brain-architecture-implementation-program/packets/phase65-browser-qa.mjs`
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
