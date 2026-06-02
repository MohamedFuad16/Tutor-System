# Packet ABO Result: Request-Correlated Thread Persistence

## Summary

Packet ABO makes saved typed-chat and live-voice transcript persistence rows
request-correlatable. `Message` rows now carry request/session IDs, thread
persistence summaries retain compact request ID lists, and
`book_chat_thread_saved` rows expose those IDs to Admin request timelines and
Beta Diagnostics.

## Implemented

- Added optional `Message.requestId`.
- Stamped typed user and assistant messages with the same generated chat request
  ID.
- Stamped live voice session transcript messages with the voice session ID.
- Extended `summarizeChatThreadPersistence()` with `requestIds`,
  `lastRequestId`, and `requestCorrelated`.
- Added request/session metadata to `book_chat_thread_saved` memory rows.
- Updated the local brain wiring rehearsal to produce request-correlated saved
  transcript rows.
- Tightened Beta Diagnostics so Chat thread saved and Voice thread saved signals
  only become ready from request-correlated rows.
- Added Admin request timeline chips for saved transcript rows and tightened
  Activity mobile layout so meters and timeline counters do not overflow.

## Verification

- `npm run format`: passed.
- `npm run lint`: passed.
- Focused contract tests passed with
  `node --test --test-name-pattern "brain flow|beta diagnostics|local brain wiring|synthetic rehearsal|chat thread persistence" tests/beta-diagnostics.test.mjs tests/brain-rehearsal.test.mjs tests/chat-thread-utils.test.mjs`.
- `npm run test`: passed, 141 tests.
- `npm run build`: passed.
- Live Admin CDP QA at `390x844` confirmed Activity rendered saved transcript
  memory-row request timeline copy with `horizontalOverflow: 0` and no measured
  overflow elements.
- Live Admin CDP QA at `390x844` confirmed Diagnostics rendered request timeline
  copy, Chat thread saved, and Voice thread saved with `horizontalOverflow: 0`
  and no measured overflow elements.
- Live Admin CDP QA at `1440x900` confirmed Activity and Diagnostics rendered
  the same surfaces with `horizontalOverflow: 0` and no measured overflow
  elements.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1018 nodes, 1809 edges, and 65 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `requestCorrelatedThreadPersistenceEvents`,
  `book_chat_thread_saved`, `persistBookChatThread()`,
  `summarizeChatThreadPersistence()`, `AdminRequestTimeline`, and
  `buildBrainFlowCoverageFromLedgers()`.
- `graphify path "persistBookChatThread()" "AdminRequestTimeline"` found a
  four-hop route through `shouldRecordBookChatThreadSave()`,
  `summarizeChatThreadPersistence()`, and `AdminView.tsx`.
- `graphify path "summarizeChatThreadPersistence()"
"buildBrainFlowCoverageFromLedgers()"` found a two-hop route through
  `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when live beta
  spend is in scope.
- Use live beta data to prove request-correlated saved transcript rows are
  produced by real model sessions, not only synthetic/local harnesses.
- Continue broader local beta validation before AWS/cloud synchronization.
