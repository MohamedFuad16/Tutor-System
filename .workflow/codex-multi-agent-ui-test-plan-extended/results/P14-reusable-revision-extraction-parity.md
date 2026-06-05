# P14 Reusable Components, Revision, Extraction, and Runtime Parity

Status: completed.

Scope:

- Added rendered coverage for `StatusBadge`, `PatternSVGs`, `ShikiHighlighter`,
  and `AnimatedScrollText`.
- Added rendered RevisionView coverage backed by real fake IndexedDB/Dexie live
  queries.
- Added real Python PDF extraction integration coverage for native and scanned
  fixtures plus the Express ingestion route.
- Compared the live Vite development server and built production server in the
  in-app browser at desktop and `390x844`.

Source fixes:

- `StatusBadge` decorative icons are hidden from assistive technology.
- `AnimatedScrollText` retains the observed element so unmount cleanup reliably
  unobserves the same node.

Covered behavior:

- Status labels, overrides, theme classes, decorative icon semantics, and SVG
  pattern variants.
- Shiki loading, known/unknown languages, stale async result cancellation,
  highlighted HTML, and escaped fallback HTML.
- Animated scroll text layout, progressive reveal, clamping, resize behavior,
  rerenders, callbacks, and observer/listener cleanup.
- Revision generated-book live updates, opening and navigating generated
  chapters, durable flashcard review scheduling/evidence, and admin routing.
- Native PDF classification and markdown extraction, scanned PDF
  classification and bounded rendered pages, and normalized Express ingestion
  output without provider calls.
- Dev/production page identity, Study/Analytics/Revision route transitions,
  production user-mode Admin gating, development Admin route, console health,
  and mobile overflow.

Verification:

- `npm run test:dom`: 75/75 passing across 11 rendered test files.
- `npm run test`: 252/252 passing.
- `npm run lint`: passed with no implicit any.
- `npm run format:check`: passed.
- `npm run build`: passed; Vite transformed 4,584 modules in 13.36s.
- Repeated root requests: 12/12 passed on development and production.
- Repeated `/api/health` requests: 10/10 passed on development and production.
- Browser console warnings/errors: none on checked dev and production routes.
- Mobile viewport: both servers measured `390px` viewport and `390px`
  document width, with no horizontal overflow.

Expected environment difference:

- Production returns `403` for `/api/debug/system-activity` without a debug
  token. This is the intended production security boundary in
  `isAuthorizedDebugRequest`, not a rendering or serving parity failure.

Remaining limits:

- The requested 40-50 rendered cases for every reusable component is not
  complete.
- App-shell, StudyView, and AdminView rendered page suites remain in progress.
- Real PDF canvas selection geometry, live voice/provider calls, and exhaustive
  browser viewport coverage remain pending.
