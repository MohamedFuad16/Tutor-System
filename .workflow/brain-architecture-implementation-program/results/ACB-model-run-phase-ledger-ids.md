# Packet ACB Result: Model Run Phase Ledger IDs

## Accepted

- Added phase-aware durable model-run ids so a single request can retain
  separate `started`, `fallback`, `completed`, `blocked`, and `failed` rows.
- `modelRunIdFor()` now includes normalized status and used/requested model
  identity while keeping compact fallback values for missing fields.
- Server chat-stream model_run events now emit phase-aware ids based on status
  and model, preventing fallback and completed phases from colliding in the
  local ledger.
- Focused model-run tests now assert stable completed ids and separate fallback
  plus completed ids for one request.
- Admin browser QA seeded one request with started, fallback, and completed rows
  and verified all three are visible on desktop and mobile Model Runs.

## Rejected

- Changing provider-key proof semantics. Completed model rows still satisfy
  coherent proof; fallback rows remain diagnostic only.
- Running live OpenRouter, Deepgram, or other provider traffic automatically.
- Adding AWS/cloud synchronization.
- Adding Dexie schema churn for this identity-only ledger fix.

## Verification

- `npm run format`: passed.
- `npm run test`: passed, 153 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase64-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin Model Runs
  rendered one QA request with started, fallback, and completed rows, model run
  phase copy, no horizontal overflow, and zero console logs.
- Browser screenshots saved as `ACB-admin-model-runs-desktop.png` and
  `ACB-admin-model-runs-mobile.png`; JSON evidence saved as
  `phase64-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1087 nodes, 1918 edges, and 59 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`80.2 KB`).
- Graphify smoke query found `modelRunIdFor()`, `recordModelRunEvent()`,
  `idPart()`, `normalizeModelRunStatus()`, `createModelRunRecord()`, and
  connected memory/Admin nodes.
- Graphify path `modelRunIdFor()` to `AdminView()` found a four-hop route
  through `model.runs.ts`, `ChatPanel.tsx`, and `useStore`.
- Graphify path `modelRunIdFor()` to `recordModelRunEvent()` found a two-hop
  route through `model.runs.ts`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes after regeneration.

## Remaining Risk

- The deliberate provider-key typed-chat and live-voice beta run still needs to
  be executed when live provider traffic is in scope. This packet ensures that
  run can show fallback and completed phases separately instead of hiding one
  behind the other.
