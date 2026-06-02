# Packet PP Result: offline voice tool-loop harness

## Result

Accepted for verification.

The server now supports a test-only mock voice provider option for
`createTutorServerApp()`. The harness opens the real `/api/voice-agent`
websocket, authenticates with local study context, emits a provider-shaped
`FunctionCallRequest`, receives client `FunctionCallResponse` messages, and
records the request/response loop in the local system activity ledger.

## Integrated Work

- Added `voiceProvider?: "deepgram" | "mock"` to the server app options.
- Added a mock voice provider branch that marks the voice websocket ready,
  records `Mock voice provider ready`, and sends tool calls from the shared
  voice tool definition list instead of a separate hand-written list.
- Shared voice tool request/response activity recording between the Deepgram
  path and the mock harness.
- Added a websocket integration test that replies to each mock function call
  and then reads `/api/debug/system-activity` to assert local activity rows for
  requested and completed voice tools.

## Verification Evidence

- Graphify CLI routed the slice through `server.ts`,
  `createTutorServerApp()`, and `tests/system-activity.test.mjs`.
- `npm run test`: passed, 89 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run format:check`: passed.
- In-app Browser QA on `http://localhost:3100`: Admin desktop rendered System
  Activity, meters, voice timeline, tool jobs, model runs, memory events, and
  runtime tuning with zero browser console errors.
- In-app Browser QA at 390x844: Admin remained responsive, and mobile Study
  showed the reader/tutor entry carousel with zero browser console errors.
- Browser QA screenshots were emitted in the browser tool output. The browser
  runtime could not write PNG files into the workflow folder, so no screenshot
  files were added to the repo.
- `graphify update . --force`: clean regeneration passed with 844 nodes, 1440
  edges, and 59 communities after moving stale generated graph artifacts aside
  and rebuilding.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `createTutorServerApp()`,
  `tests/system-activity.test.mjs`, `startVoiceApp()`, `functionRequest`, and
  `toolNames`; artifact grep found no `server.mjs` or `.tmp-test` nodes.

## Boundaries

- Live Deepgram voice was not exercised in this phase.
- The mock provider is only selected through the server factory option used by
  tests; the default provider remains Deepgram.
- Current-page vision remains a typed-chat-only voice parity gap.
- AWS/cloud synchronization remains out of scope until beta testing.
