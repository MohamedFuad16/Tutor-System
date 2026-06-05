# P13 ChatPanel and PdfViewer Rendered Expansion

Status: completed.

Scope:

- Added rendered ChatPanel coverage in `tests/rendered-chatpanel-flows.test.tsx`.
- Added rendered PdfViewer coverage in `tests/rendered-pdfviewer-flows.test.tsx`.
- Added accessible names/pressed state for icon-only ChatPanel and PdfViewer controls needed by element-level tests.
- Added Vite ambient declarations to the Vitest TypeScript program so strict test type-checking sees `import.meta.env` and `?url` imports.

Covered behavior:

- ChatPanel selected PDF context chip renders, exposes a named clear control, and clears Zustand state.
- ChatPanel tools menu activates/removes the Web Search skill and switches textarea placeholder state.
- ChatPanel Shift+Enter does not submit, Enter sends a mocked streamed `/api/chat` request, selected PDF text is included, active document metadata is sent, and the mocked assistant response renders.
- ChatPanel voice and send controls expose accessible labels, and invalid/special-character input surfaces validation with a rendered invalid animation state.
- PdfViewer mocked React-PDF document load clamps page state and updates total pages.
- PdfViewer previous/next/page-input controls stay within one-based PDF bounds.
- PdfViewer fit-height/fit-width controls expose stable `aria-pressed` state.
- PdfViewer selection Ask Tutor handoff stores normalized selected text without creating annotations.
- PdfViewer highlight and sticky-note actions create document-scoped annotations on the active page.
- PdfViewer global arrow shortcuts navigate pages while focused inputs keep shortcuts inert.

Verification:

- `npm run format:check`: passed.
- `npm run lint`: passed with `tsc --noEmit --noImplicitAny` for app source and `tsconfig.vitest.json`.
- `npm run test:dom`: 28/28 passing across 7 rendered test files.
- `npm run test`: 249/249 passing.
- `npm run build`: passed; Vite transformed 4,584 modules in 8.11s, `dist/server.cjs` 160.2 kB.

Remaining limits:

- This expands the rendered harness but does not complete the user's requested 40-50 rendered cases for every reusable component.
- Full browser-level PDF canvas/selection and live voice interaction QA remains pending.
