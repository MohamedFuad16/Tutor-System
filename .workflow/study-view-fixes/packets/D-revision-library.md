# Packet D: Revision and Library

## Objective
Keep Revision library book identity synchronized with Study and Chat, including
generated artifacts and title/context updates.

## Context
Use Graphify-first navigation. Primary connected files are
`src/views/RevisionView.tsx`, `src/store/index.ts`, `src/memory/longterm.memory.ts`,
and `src/components/ChatPanel.tsx`.

## Ownership
Read-only unless explicitly reassigned. If editing is later approved, own only
Revision/library UI and book-opening logic.

## Do
- Trace how built-in and persisted learning books are listed/opened.
- Identify whether opening a book updates the same active book ID used by Chat.
- Identify generated book/artifact ID behavior that must remain stable.
- Recommend minimal sync fixes.

## Do Not
- Do not edit Dexie schema directly.
- Do not change unrelated book/chapter content.
- Do not revert dirty worktree changes.

## Expected Output
A concise result in `results/D-revision-library.md` with required edits and risks.

## Verification
Browser QA for switching from Revision library into Study/Chat context.
