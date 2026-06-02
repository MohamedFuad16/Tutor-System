# Packet ABN Result: Chat/Voice Thread Persistence Observability

## Implemented

- Added chat-thread persistence summaries in `src/lib/chatThreadUtils.ts` for
  typed, voice, and mixed transcript history.
- Added `book_chat_thread_saved` as a local memory event type.
- Updated `persistBookChatThread()` in `ChatPanel.tsx` to emit a durable memory
  event when a book-scoped thread changes, including mode, typed-turn, voice
  session, voice-turn, and thread metadata.
- Extended Beta Diagnostics from the previous nine-signal local brain-flow
  verifier to an eleven-signal verifier by adding `Chat thread saved` and
  `Voice thread saved`.
- Added Admin Memory saved-thread cards, latest-thread context, diagnostics
  counts, and export coverage for `bookChatThreads`.
- Updated `runLocalBrainWiringRehearsal()` so synthetic local rows satisfy the
  same eleven-signal verifier while staying non-persistent and not counting
  toward live beta readiness.

## Verification Evidence

- `npm run format`: passed.
- `npm run lint`: passed.
- Focused contract tests passed with:
  `node --test --test-name-pattern "brain flow|beta diagnostics|local brain wiring|synthetic rehearsal|chat thread persistence" tests/beta-diagnostics.test.mjs tests/brain-rehearsal.test.mjs tests/chat-thread-utils.test.mjs`.
- `npm run test`: passed, 140 tests.
- `npm run build`: passed.
- In-app Browser QA at `1440x900` confirmed Admin Beta rendered Brain Flow
  Coverage, Chat thread saved, Voice thread saved, and Conversation
  persistence with zero horizontal overflow and zero clipped cards.
- In-app Browser QA at `1440x900` confirmed Admin Memory rendered Saved
  threads, Rows, Typed, Voice, and Latest thread with zero horizontal overflow
  and zero clipped cards.
- In-app Browser QA at `390x844` confirmed Admin Beta and Memory rendered the
  same thread persistence surfaces with zero horizontal overflow, zero clipped
  text blocks, and no browser warning/error logs.
- Clean `graphify update . --force` plus `npm run graphify:tree`: passed,
  regenerating `graphify-out` with `1017` nodes, `1808` edges, and `61`
  communities.
- Graphify smoke query found `persistBookChatThread()`,
  `summarizeChatThreadPersistence()`, `recordBookChatThreadSaveEvent()`,
  `recordMemoryEvent()`, `AdminView()`, `buildBrainFlowCoverageFromLedgers()`,
  and `runLocalBrainWiringRehearsal()`.
- Graphify path `persistBookChatThread()` to `AdminView()` found a three-hop
  route through `ChatPanel.tsx` and `useStore`.
- Graphify path `summarizeChatThreadPersistence()` to
  `buildBrainFlowCoverageFromLedgers()` found a two-hop route through
  `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when live provider
  spending is in scope, so the new persistence signals can move from missing to
  ready in live beta data.
- Continue broader local beta validation across chat, voice, retrieval, tools,
  evaluated mastery, background jobs, Admin, and Revision.
- Keep AWS/cloud sync deferred until after beta testing.
