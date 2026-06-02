# Result ABM: Memory Worker Scheduler Coverage

## Accepted

- `updateLearningBookFromConversation()` now runs the existing learning-book
  writer through `runBackgroundJob()` with a stable `learning_book_update` job
  id derived from request/book/conversation/message context.
- `addOrUpdateConcept()` now runs graph concept writes through
  `runBackgroundJob()` with a stable `graph_concept_update` job id.
- Both paths preserve local-only behavior and keep model-summary evidence gates
  intact.
- Admin's Background Job Ledger now shows the observed job-name mix so beta
  tuning can distinguish interaction, learning-book, and graph-concept work.
- README, Tutor System Architecture, User Brain Architecture, Tutor Library
  JSON, and App Design Language copy now describe the broader local
  memory-worker coverage.

## Rejected

- No cloud queue, AWS worker, webhook, or Graphify watch/hook implementation was
  added in this slice.
- No append-only transition history was added; the local ledger still stores the
  current durable state for each stable job id.

## Verification

- `npm run test`: passed, 139 tests.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at 599x822: Admin Beta rendered the interaction,
  learning-book, and graph-concept scheduler copy, no horizontal overflow, and
  no browser warning/error logs.
- Headless Chrome QA at 1440x1000 and 390x844: Admin Beta rendered the
  Background Job Ledger copy, empty state, local-only cloud boundary, no
  horizontal overflow, and no console warning/error logs.
- Browser QA artifacts:
  `results/ABM-admin-beta-desktop.png`,
  `results/ABM-admin-beta-mobile.png`, and
  `results/ABM-admin-beta-browser-qa.json`.
- `graphify update . --force`: passed, 1008 nodes, 1805 edges, and 62
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `runBackgroundJob()`,
  `.updateLearningBookFromConversation()`, `.addOrUpdateConcept()`,
  `.writeLearningBookFromConversation()`, `.writeGraphConceptUpdate()`,
  `AdminView()`, and `buildBetaDiagnosticsSnapshot()`.
- `graphify path "writeLearningBookFromConversation()" "AdminView()"`: found a
  four-hop path through generated note artifact records.
- `graphify path "writeGraphConceptUpdate()" "runBackgroundJob()"`: found a
  three-hop path through memory trace/update wrappers.
- Graph artifact scratch grep found no `server.mjs`, `.tmp-test`, or
  `/private/tmp` nodes.
- `npm run audio:overview:dry-run`: passed with 25 present and 0 missing stored
  guide assets.

## Remaining Risk

- Live provider-key chat/voice beta traffic still needs a fuller end-to-end
  proof after more scheduler and Admin tuning slices.
- Background job rows expose local state; they do not yet provide a production
  worker dashboard or cloud queue semantics.
