# Packet C: Study and PDF

## Objective
Design the multi-PDF Study workflow: store multiple PDFs per book, select/view
one, remove PDFs cleanly, and expose all active book documents to chat context.

## Context
Use Graphify-first navigation. Primary connected files are
`src/views/StudyView.tsx`, `src/components/PdfViewer.tsx`, `src/store/index.ts`,
`src/memory/longterm.memory.ts`, and `src/memory/memory.orchestrator.ts`.

## Ownership
Read-only unless explicitly reassigned. If editing is later approved, own only
Study/PDF UI and non-schema helper changes.

## Do
- Trace current upload, selected PDF, viewer state, and document extraction flow.
- Propose UI states for multiple PDFs with add/select/remove behavior.
- Identify how selected PDF should persist per book.
- Identify how multiple PDF contexts should be passed to chat and memory.

## Do Not
- Do not alter chat streaming behavior.
- Do not edit Revision library behavior in this packet.
- Do not revert dirty worktree changes.

## Expected Output
A concise result in `results/C-study-pdf.md` with UI/state recommendations.

## Verification
Desktop/mobile browser QA for add/select/remove and no horizontal overflow.
