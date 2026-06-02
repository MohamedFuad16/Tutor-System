# Packet ABN: Chat/Voice Thread Persistence Observability

## Objective

Make local book-scoped chat and voice transcript persistence visible to Admin
and Beta Diagnostics. This packet proves that typed-chat and live-voice
conversation threads are saved locally without implementing AWS/cloud sync.

## Graphify Context

- `graphify query "ChatPanel persistBookChatThread voice session messages voice turns stored injected tools MemoryOrchestrator trackInteraction updateLearningBookFromConversation book chat thread Admin proof" --budget 7000 --graph graphify-out/graph.json`
  routed the slice through `persistBookChatThread()`, `ChatPanel()`,
  `MemoryOrchestrator`, `AdminView()`, `bookChatThreads`, and
  `recordMemoryEvent()`.
- `graphify query "remaining brain architecture live provider-key chat voice end-to-end proof memory injection tool calls evaluated_answer background jobs Admin Beta Diagnostics runLocalBrainWiringRehearsal" --budget 7000 --graph graphify-out/graph.json`
  identified `runLocalBrainWiringRehearsal()`,
  `buildBrainFlowCoverageFromLedgers()`, `AdminView()`, and the local
  diagnostic verifier as the downstream contract surface.

## Scope

- Add durable `book_chat_thread_saved` memory-event evidence when a normalized
  book chat thread changes.
- Keep writes low-noise by comparing a compact chat-thread persistence
  signature before emitting an event.
- Extend Beta Diagnostics to require both typed-chat and voice transcript save
  evidence.
- Surface saved book chat thread rows in Admin Memory and diagnostics exports.
- Update the synthetic local brain wiring rehearsal to satisfy the same
  eleven-signal verifier without mutating live beta readiness.

## Out of Scope

- AWS/cloud persistence, tenant sync, and remote workers.
- Spending live provider-key calls for typed chat or real voice sessions.
- Reworking the IndexedDB `bookChatThreads` schema shape.
