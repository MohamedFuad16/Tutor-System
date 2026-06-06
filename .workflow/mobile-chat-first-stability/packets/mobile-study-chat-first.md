# Packet: mobile-study-chat-first

## Objective

Make mobile Study chat-first while keeping active PDFs visible as compact
attached context and preserving desktop split-view behavior.

## Ownership

- `src/views/StudyView.tsx`
- StudyView-focused tests only

## Do

- Use existing store and document/book state.
- Keep ChatPanel full-height and primary on mobile.
- Represent active/available PDFs as compact attached context.
- Preserve an intentional way to open or switch PDF context.
- Add focused responsive regression tests.

## Do Not

- Do not edit ChatPanel, PdfViewer, store, server, or Graphify artifacts.
- Do not revert concurrent edits.

## Verification

- Focused StudyView tests.
- Typecheck touched behavior.
