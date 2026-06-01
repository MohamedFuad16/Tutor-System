# Packet B: Chat Runtime

## Objective
Ensure chat loading, saving, visible history, prompt context, and memory updates
are scoped to the active learning book.

## Context
Use Graphify-first navigation. Primary connected files are
`src/components/ChatPanel.tsx`, `src/memory/memory.orchestrator.ts`,
`src/memory/longterm.memory.ts`, and `src/store/index.ts`.

## Ownership
Read-only unless explicitly reassigned. If editing is later approved, own only
chat/runtime changes that do not overlap with Packet A schema edits.

## Do
- Trace how ChatPanel chooses conversations and persists messages.
- Trace how active book/library context enters prompts and orchestrator updates.
- Identify transition points needed when the active book changes.
- Identify where multi-PDF context should be injected and what limits are needed.

## Do Not
- Do not change PDF UI or Revision UI in this packet.
- Do not weaken chat streaming/tool parsing behavior.
- Do not revert dirty worktree changes.

## Expected Output
A concise result in `results/B-chat-runtime.md` with required edits and risks.

## Verification
Book switch, refresh, and memory injection browser QA after integration.
