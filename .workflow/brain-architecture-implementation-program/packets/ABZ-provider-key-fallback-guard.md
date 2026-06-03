Packet ID: ABZ

Objective: Prevent fallback/offline model rows from completing the
provider-key coherent live proof while preserving their visibility in aggregate
local diagnostics.

Context:

- Packet ABT added the Provider-Key Live Proof checklist.
- Packet ABV added the coherent typed-chat + live-voice proof bundle.
- Packet ABX added the ordered manual beta runbook.
- Packet ABY kept provider/system meters fresh while Beta Diagnostics is open.
- A remaining integrity gap was that fallback model rows could be treated as
  request-correlated model evidence inside the coherent provider-key bundle.

Ownership:

- `src/memory/beta.diagnostics.ts`
- `tests/beta-diagnostics.test.mjs`
- Workflow QA script/results for this packet.
- Regenerated `graphify-out/*`.

Do:

- Require completed model rows, not fallback rows, for coherent provider-key
  chat/voice request bundles.
- Keep aggregate brain-flow diagnostics able to display fallback model rows so
  offline/local rehearsal context remains observable.
- Update provider-key runbook copy to ask for a completed model run.
- Add focused regression coverage proving fallback model rows keep aggregate
  coverage green but fail coherent provider-key proof.
- Verify desktop and mobile Admin Beta Diagnostics with no console errors or
  horizontal overflow.

Do not:

- Run live provider traffic automatically.
- Treat provider-meter presence or fallback rows as completed provider-key
  proof.
- Change stored provider-key handling or expose secrets.
- Add AWS/cloud synchronization.
- Manually edit Graphify artifacts outside the explicit regeneration step.

Expected output:

- Source patch, focused test, browser QA evidence, Graphify refresh, commit, and
  push.

Verification:

- `npm run format`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `node .workflow/brain-architecture-implementation-program/packets/phase62-browser-qa.mjs`
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
