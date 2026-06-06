# Mobile Study Chat First

Implemented mobile-first Study composition in `src/views/StudyView.tsx`:

- Mobile opens into a full-height `ChatPanel`; the intro/PDF surface stays hidden until intentionally opened.
- Active PDFs appear as compact attached chat context with multi-PDF switching and a clear `View PDF` control.
- Mobile PDF view includes an explicit return-to-chat control; desktop split-view behavior is preserved.

Verification:

- `npx vitest run tests/rendered-study-view-flows.test.tsx` - 16 passed.
- `node --test tests/study-view-upload.test.mjs` - 5 passed.
- `npm run lint` - passed.
- `npm run build` - passed.
- Browser: `390x844` rendered chat full-height with the document surface hidden; `1440x900` preserved the two-column desktop layout.

Changed files:

- `src/views/StudyView.tsx`
- `tests/rendered-study-view-flows.test.tsx`
- `tests/study-view-upload.test.mjs`
- `.workflow/mobile-chat-first-stability/results/mobile-study-chat-first.md`
