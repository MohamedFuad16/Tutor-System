# Result TT: Voice Web-Search Tool Parity

## Accepted

- Added `web_search` to the shared voice-agent tool definition list with a
  source-material-first description and `query` requirement.
- Added `/api/voice-web-search` as a local server bridge that normalizes
  request ids, query, mode, and result count, calls Serper through the existing
  search helper, and records started/completed/blocked/failed system activity.
- `ChatPanel` can execute voice `web_search` tool calls, blocks source-local
  prompts conservatively, records web usage/search events, caches sources, and
  writes source-card artifact/citation provenance for returned results.
- The mock voice provider now derives from `VOICE_AGENT_TOOL_DEFINITIONS` so
  future voice tool additions are covered by the offline websocket harness.
- Tests now cover the four-tool voice definition list, mock voice tool-loop
  drift, and a no-network blocked voice web-search activity row.

## Rejected

- Current-page vision was not added to voice mode in this slice.
- Live Deepgram and live Serper success-path QA were not forced into the local
  automated test suite.
- AWS/cloud search infrastructure remains deferred until after beta.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 93 tests.
- `npm run build`: passed.
- In-app Browser QA on `http://localhost:3100`: Admin/System Activity rendered
  request timelines, local activity copy, tool visibility, and voice controls
  with zero captured browser error logs.
- In-app Browser QA at `390x844`: Admin/System Activity remained reachable and
  rendered with zero captured browser error logs.
- `graphify update . --force`: regenerated code architecture artifacts with
  863 nodes, 1477 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `VOICE_AGENT_TOOL_DEFINITIONS`, `ChatPanel()`,
  `searchSerper()`, `server.ts`, `voiceAgentTools.ts`, and
  `web-search.ts`.
- `graphify path "VOICE_AGENT_TOOL_DEFINITIONS" "searchSerper()"` found a
  two-hop path through `server.ts`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
- Local dev server was stopped after browser QA and scratch files were removed
  before Graphify regeneration.

## Remaining Work

- Browser-verify a live Deepgram voice round trip with real provider access.
- Browser-verify a successful live Serper voice web-search response when a
  deliberate key-backed test is in scope.
- Close voice current-page vision parity in a later local slice.
