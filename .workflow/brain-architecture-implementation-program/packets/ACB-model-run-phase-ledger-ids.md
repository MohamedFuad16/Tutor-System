Packet ID: ACB

Objective: Preserve started, fallback, completed, blocked, and failed model-run
phases as separate durable rows so Admin can diagnose live provider-key proof
without one phase overwriting another.

Context:

- Packet ABZ made provider-key proof require completed model rows while keeping
  fallback rows visible in aggregate diagnostics.
- Packet ACA exposed selected typed-chat and live-voice request row details in
  the coherent live proof panel.
- The remaining local ledger gap was model-run identity: repeated model_run
  phases for one request could collapse into one durable row if they shared the
  same id.

Ownership:

- `src/memory/model.runs.ts`
- `server.ts`
- `tests/model-runs.test.mjs`
- Workflow QA script/results for this packet.
- Regenerated `graphify-out/*`.

Do:

- Include normalized phase/status and model in durable model-run ids.
- Make server-sent chat model_run events use phase-aware ids.
- Preserve fallback and completed model rows for one request in tests.
- Verify Admin Model Runs on desktop and mobile with seeded started, fallback,
  and completed rows.

Do not:

- Change coherent provider-key proof semantics.
- Treat fallback/offline rows as completed provider-key evidence.
- Run live provider traffic automatically.
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
- `node .workflow/brain-architecture-implementation-program/packets/phase64-browser-qa.mjs`
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
