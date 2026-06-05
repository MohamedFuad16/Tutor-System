# P15 Page Rendered Expansion

Status: completed.

Scope:

- Added rendered App-shell route, keyboard, lazy-loading, GSAP, and
  reduced-motion coverage.
- Added rendered StudyView page flows backed by fake IndexedDB/Dexie and mocked
  ingestion.
- Added rendered AdminView page flows with deterministic debug API and
  WebSocket mocks.
- Tightened the Graphify contract test so every current page and reusable
  component must be present in `graphify-out/graph.json`.

Covered behavior:

- App invalid-route and user/Admin guards, shared chrome, numeric shortcuts,
  editable-control exclusions, lazy-route fallback, all route animation
  variants, zero-duration reduced motion, and cleanup.
- Study empty/introduction state, upload controls, stored-document handoff,
  chat open/close, document switching, mocked ingestion, drag/drop, inactive
  and active document removal, and final-document reset.
- Admin activity loading/success/error/refresh, token-aware requests, tab
  navigation, beta diagnostics, local JSON export, Back to Library routing,
  and debug WebSocket connected/offline states.
- Graphify source inventory includes `App.tsx`, `main.tsx`, every
  `src/views/*.tsx`, and every `src/components/*.tsx`.

Verification:

- `npm run test:dom`: 115/115 passing across 14 rendered test files.
- `npm run test`: 253/253 passing.
- `npm run lint`: passed with no implicit any.
- `npm run format:check`: passed.
- `npm run build`: passed; Vite transformed 4,584 modules in 20.60s.
- Focused StudyView rerun: 13/13 passing without React late-update warnings.

Remaining limits:

- The requested 40-50 rendered cases for every reusable component remains
  incomplete and is the next active phase.
- Real PDF canvas selection geometry and live voice/provider browser flows
  remain pending.
