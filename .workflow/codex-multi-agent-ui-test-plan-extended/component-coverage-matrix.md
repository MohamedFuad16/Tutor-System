# Reusable Component Coverage Matrix

Counting boundary: each reusable file-level component family in
`src/components/*.tsx`. Exported decorative icons and pattern variants count
inside their owning family. `ChatPanel.tsx` includes `UsageAnalyticsStrip`;
`SettingsModal.tsx` is exercised through its exported `SettingsButton`.

Target: 40-50 meaningful rendered cases per family, all green under
`npm run test:dom`.

| Component family | Primary rendered suite | Current rendered cases | Target | Status |
| --- | --- | ---: | ---: | --- |
| AnimatedScrollText | `rendered-animated-scroll-text.test.tsx` | 50 | 40-50 | complete |
| ChatPanel | `rendered-chatpanel-flows.test.tsx` | 4 | 40-50 | pending |
| FloatingSkillsMenu | shared rendered suites | 3 | 40-50 | pending |
| Navigation | `rendered-navigation.test.tsx` plus shared suites | 41 dedicated / 43 total | 40-50 | complete |
| PatternCard | shared rendered suites | 3 | 40-50 | pending |
| PatternSVGs | `rendered-status-pattern-svgs.test.tsx` | 48 | 40-50 | complete |
| PdfViewer | `rendered-pdfviewer-flows.test.tsx` | 5 | 40-50 | pending |
| SettingsModal / SettingsButton | `rendered-settings.test.tsx` plus shared suite | 7 | 40-50 | pending |
| ShikiHighlighter | `rendered-shiki-highlighter.test.tsx` | 49 | 40-50 | complete |
| SiriLiquidGlass | shared rendered suites | 2 | 40-50 | pending |
| StatusBadge and icon family | `rendered-status-pattern-svgs.test.tsx` | 48 | 40-50 | complete |

The matrix is evidence tracking, not a substitute for behavioral quality. Each
case must assert a distinct prop, state, interaction, rendering, accessibility,
cleanup, or failure behavior.

Latest rendered suite evidence:

- `npm run test:dom` on 2026-06-05 after Admin and Navigation expansion:
  15 files, 310 tests, all passing.
- New dedicated Navigation suite: 41 tests covering user/admin route sets,
  route clicks, active `aria-current`, responsive button contracts, decorative
  icons, GSAP border behavior, active-pill motion, reduced-motion preference,
  resize cleanup, pointer spotlight behavior, focusability, and store
  integration.
