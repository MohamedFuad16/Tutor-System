# Packet ABO: Request-Correlated Thread Persistence

## Objective

Close the local proof gap left after Packet ABN: saved typed-chat and live-voice
transcript rows must not only exist; they must be joinable to the same
request/session IDs used by Admin request timelines, retrieval rows, model
runs, tool jobs, and brain-context rows.

## Graphify Context

- `graphify query "remaining brain architecture gaps live provider-key chat
voice end-to-end proof stored injected tool calling both agent layers Admin
Beta Diagnostics book_chat_thread_saved brain_context_injected
evaluate_answer toolJobs runLocalBrainWiringRehearsal" --budget 8000 --graph
graphify-out/graph.json`
- `graphify query "AdminRequestTimeline requestIdForRetrievalEvent
memoryEvents metadata requestId toolJobs modelRuns backgroundJobs
book_chat_thread_saved" --budget 6000 --graph graphify-out/graph.json`
- `graphify query "Message type requestId ChatPanel voiceSession sessionId
appendVoiceTurn sendVoiceText stopVoice persisted thread metadata requestIds"
--budget 6000 --graph graphify-out/graph.json`
- `graphify path "persistBookChatThread()" "AdminRequestTimeline" --graph
graphify-out/graph.json`

These routes selected `src/types.ts`, `src/lib/chatThreadUtils.ts`,
`src/components/ChatPanel.tsx`, `src/memory/beta.diagnostics.ts`,
`src/memory/brain.rehearsal.ts`, `src/views/AdminView.tsx`, and the focused
diagnostic/thread tests.

## Scope

- Add a stable optional `Message.requestId` field.
- Stamp typed user/assistant messages with the same `chat-*` request ID.
- Stamp voice-session transcript messages with the voice session ID.
- Include `requestId`, `requestIds`, and `requestCorrelated` metadata in
  `book_chat_thread_saved` memory rows.
- Make Beta Diagnostics count typed-chat and voice transcript persistence as
  ready only when the saved transcript row carries a request ID.
- Surface saved transcript memory rows in Admin request timelines.
- Keep AWS/cloud sync and live provider-key spend out of scope.

## Verification Requirements

- `npm run format`
- `npm run lint`
- Focused beta/rehearsal/chat-thread tests
- `npm run test`
- `npm run build`
- Browser QA for Admin Activity and Diagnostics at desktop and mobile widths
- Graphify regeneration, tree rebuild, smoke query, path checks, and scratch
  artifact grep
