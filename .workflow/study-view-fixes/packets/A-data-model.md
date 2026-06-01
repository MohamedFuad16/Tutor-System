# Packet A: Data Model and Persistence

## Objective
Map and validate the safest data model changes for book-scoped conversations and
multi-PDF documents.

## Context
Use Graphify-first navigation. The initial connected files are
`src/memory/longterm.memory.ts`, `src/store/index.ts`, `src/components/ChatPanel.tsx`,
`src/views/StudyView.tsx`, and `src/memory/memory.orchestrator.ts`.

## Ownership
Read-only unless explicitly reassigned. If editing is later approved, own only
Dexie interfaces/schema and focused persistence tests.

## Do
- Identify current tables, versions, indexes, and migration gaps.
- Determine how learning books, chats, messages, and PDFs are currently linked.
- Propose the smallest stable-ID schema that enforces one chat per book and many
  PDFs per book.
- Call out migration/default behavior for existing users.

## Do Not
- Do not edit `graphify-out`.
- Do not change UI files in this packet.
- Do not revert dirty worktree changes.

## Expected Output
A concise result in `results/A-data-model.md` listing findings, required edits,
and verification ideas.

## Verification
Focused migration/type checks, plus lint/build after integration.
