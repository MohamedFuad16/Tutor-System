# Result AAH: Synthetic Dual-Agent Wiring Rehearsal

## Status

Completed.

## Integration Notes

- Read-only sidecar Lagrange recommended a separate synthetic result contract
  that delegates to the existing live coverage evaluator but cannot enter
  snapshot readiness.
- Read-only sidecar Socrates recommended keeping the result ephemeral in React
  state and avoiding synthetic rows in Dexie or diagnostics exports.
- The main implementation uses shared packet helpers and shared typed-chat and
  live-voice tool-definition modules, then feeds in-memory rehearsal rows into
  the existing eight-signal evaluator.
- `server.ts` now consumes `buildChatAgentToolDefinitions()` so the typed-chat
  provider path and rehearsal inspect the same tool definitions.
- Admin renders the rehearsal as synthetic, no-durable-rows, excluded-from-live
  coverage state, while showing the authoritative live coverage meter beside
  the synthetic contract result.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 126 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the checkout has no `brain:postchange` script.
- Browser QA on Admin Beta Diagnostics at `1440x1000`, `768x1024`, and
  `390x844`: rehearsal rendered `synthetic ready`, synthetic contract `100%`,
  authoritative live coverage stayed `0% watch`, local rows stayed `92`, no
  horizontal overflow appeared, and browser error logs stayed empty.
- Desktop keyboard QA: focused `Run rehearsal again` and activated it with
  Enter; live coverage and local rows stayed unchanged.
- Reader QA: App Design Language / Local Beta Control Patterns, Tutor System
  Architecture / Analytics And Admin, and User Brain Architecture / The Whole
  Shape all rendered the synthetic rehearsal boundary with one visible audio
  player and no browser errors.
- `graphify update . --force`: passed, `959` nodes, `1677` edges, `56`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `runLocalBrainWiringRehearsal()`,
  `buildChatAgentToolDefinitions()`, `chatAgentToolNames()`,
  `buildBrainDocumentContext()`, `buildBrainFlowCoverageFromLedgers()`, and
  `AdminView()`.
- `graphify path "runLocalBrainWiringRehearsal()" "AdminView()"`: found a
  two-hop path through `buildBrainFlowCoverageFromLedgers()`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
