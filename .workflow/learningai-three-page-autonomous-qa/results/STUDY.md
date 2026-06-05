# Study QA Result

## Scope
- Owner lane: Study page.
- Primary write scope used: `src/views/StudyView.tsx`.
- Shared context inspected only after Graphify: `src/App.tsx`, `src/components/Navigation.tsx`, `src/store/index.ts`, `package.json`.
- No `graphify-out` artifacts edited and no graph refresh run.

## Graphify Context
- `graphify query "StudyView AnalyticsView RevisionView direct dependencies downstream UI responsive animation performance" --budget 2200 --graph graphify-out/graph.json`
  - Located `StudyView.tsx` with direct dependencies on `useStore`, `useTranslation`, `useMotionPreference`, `PdfViewer`, `ChatPanel`, and `App`.

## Findings
- The intro card stack used desktop-biased transforms that pushed decorative cards aggressively off mobile bounds.
- The upload card click path reused the file input without clearing its value first, so selecting the same file twice could fail to trigger ingestion.
- Concurrent or stale ingestion responses could still update Study state after a newer ingest or after clearing the PDF.
- Headline word animation kept `will-change` pressure longer than necessary.

## Changes Made
- Added compact-viewport card transforms for the Study intro stack.
- Added `openFilePicker()` to clear the file input value before opening the picker.
- Added an ingestion sequence guard so stale uploads cannot update the current document state.
- Reset ingestion state when clearing the PDF.
- Reduced long-lived animation pressure by setting `will-change` only during headline animation and resetting it on cleanup.
- Added safer wrapping for long headline words on narrow screens.

## Browser Evidence
- Desktop screenshot: `/Users/mfuad16/Documents/LearningAI/.workflow/learningai-three-page-autonomous-qa/results/live-qa/study-desktop-1280x800.png`
- Mobile screenshot: `/Users/mfuad16/Documents/LearningAI/.workflow/learningai-three-page-autonomous-qa/results/live-qa/study-mobile-390x844.png`
- Live QA result: no document-level horizontal overflow at 1280x800 or 390x844.
- Live QA result: no page console warnings/errors after the favicon fix.

## Remaining Risks
- Decorative offscreen card layers still register as wide elements in DOM geometry because they are intentionally absolute-positioned; the document itself does not horizontally overflow.
- The PDF ingestion endpoint and real upload path were not exercised with a fixture PDF in this pass.
