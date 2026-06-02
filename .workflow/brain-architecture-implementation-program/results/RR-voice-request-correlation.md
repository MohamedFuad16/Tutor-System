# Packet RR Result: voice request correlation

## Result

Accepted for verification.

Voice auth now carries the browser voice session id to the local websocket
server, and the server adopts that id for voice system-activity rows after a
small shape validation. Admin request timelines can now correlate browser
`voice_agent` model/tool rows with server voice auth, context, tool request,
tool response, and close events under the same request id.

## Integrated Work

- `ChatPanel` now sends `voiceSessionId` and `requestId` in the `voice_auth`
  payload.
- `server.ts` validates the client request id with a conservative
  alphanumeric/underscore/colon/dash allowlist and uses it as the voice
  `requestId`.
- The mock websocket integration test now proves `Voice tool call requested`,
  `Voice client tool completed`, `Mock voice provider ready`, and
  `Voice study context attached` all share `voice-test-session-1`.

## Verification Evidence

- Graphify routed the slice through `server.ts`, `ChatPanel.tsx`,
  `tests/system-activity.test.mjs`, `recordToolJobEvent()`,
  `recordModelRunEvent()`, and `createTutorServerApp()`.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: passed, 92 tests.
- `npm run build`: passed.
- In-app Browser QA on `http://localhost:3100`: root/Study rendered, Admin
  activated through DOM CUA, and Admin showed Admin Center, System Activity,
  Request timelines, Model Runs, and Live voice timeline with zero console
  errors.
- Mobile browser QA at 390x844: Study rendered the tutor entry with zero
  console errors.
- `graphify update . --force`: regenerated Graphify code architecture artifacts
  with 857 nodes, 1470 edges, and 50 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found the voice websocket test/server/client route, and
  graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Boundaries

- Live Deepgram voice was not exercised in this phase.
- The shared id is local observability metadata only; it does not change
  mastery or evidence policy.
- AWS/cloud synchronization remains out of scope until beta testing.
