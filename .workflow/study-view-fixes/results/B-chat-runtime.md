# Packet B: Chat Runtime

Status: integrated.

Findings from the read-only lane were applied:

- ChatPanel now loads and saves one `bookChatThreads` record per active book.
- Previous chats are filtered to the active learning book.
- Prompt and memory calls receive active book identity, selected document ID, and all current book document contexts.
- Context switching saves the previous thread before loading the next book thread.
- ChatPanel reads active document context but no longer mutates viewer document state.

