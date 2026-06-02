# Packet QQ: voice chat-thread continuity

## Lane

Memory/brain runtime and Admin observability.

## Scope

- `src/components/ChatPanel.tsx`
- `src/lib/chatThreadUtils.ts`
- `tests/chat-thread-utils.test.mjs`
- `package.json`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` through explicit Graphify regeneration

## Objective

Make voice-only sessions behave like durable book-scoped chat material:
voice-session turns should count as meaningful chat history, flatten into the
next typed chat prompt, and leave model-run rows in Admin's durable local
ledger.

## Boundaries

- Do not change the live Deepgram provider contract.
- Do not add cloud/AWS synchronization.
- Do not treat voice transcripts as verified mastery evidence by themselves.
- Do not manually edit generated Graphify artifacts.
