# Reusable Component Coverage Matrix

Counting boundary: each reusable file-level component family in
`src/components/*.tsx`. Exported decorative icons and pattern variants count
inside their owning family. `ChatPanel.tsx` includes `UsageAnalyticsStrip`;
`SettingsModal.tsx` is exercised through its exported `SettingsButton`.

Target: 40-50 meaningful rendered cases per family, all green under
`npm run test:dom`.

| Component family               | Primary rendered suite                                      |  Current rendered cases | Target | Status   |
| ------------------------------ | ----------------------------------------------------------- | ----------------------: | -----: | -------- |
| AnimatedScrollText             | `rendered-animated-scroll-text.test.tsx`                    |                      50 |  40-50 | complete |
| ChatPanel                      | `rendered-chatpanel-expanded.test.tsx` plus flow suite      | 43 dedicated / 47 total |  40-50 | complete |
| FloatingSkillsMenu             | `rendered-floating-skills-menu.test.tsx` plus shared suites | 50 dedicated / 53 total |  40-50 | complete |
| Navigation                     | `rendered-navigation.test.tsx` plus shared suites           | 41 dedicated / 43 total |  40-50 | complete |
| PatternCard                    | `rendered-pattern-card.test.tsx` plus shared suites         | 50 dedicated / 53 total |  40-50 | complete |
| PatternSVGs                    | `rendered-status-pattern-svgs.test.tsx`                     |                      48 |  40-50 | complete |
| PdfViewer                      | `rendered-pdfviewer-expanded.test.tsx` plus flow suite      | 45 dedicated / 50 total |  40-50 | complete |
| SettingsModal / SettingsButton | `rendered-settings.test.tsx` plus shared suite              | 40 dedicated / 41 total |  40-50 | complete |
| ShikiHighlighter               | `rendered-shiki-highlighter.test.tsx`                       |                      49 |  40-50 | complete |
| SiriLiquidGlass                | `rendered-siri-liquid-glass.test.tsx` plus shared suites    | 50 dedicated / 52 total |  40-50 | complete |
| StatusBadge and icon family    | `rendered-status-pattern-svgs.test.tsx`                     |                      48 |  40-50 | complete |

The matrix is evidence tracking, not a substitute for behavioral quality. Each
case must assert a distinct prop, state, interaction, rendering, accessibility,
cleanup, or failure behavior.

Latest rendered suite evidence:

- `npm run test:dom` on 2026-06-05 after PatternCard,
  FloatingSkillsMenu, SiriLiquidGlass, and Admin BKT wiring expansion:
  18 files, 460 tests, all passing.
- New dedicated Navigation suite: 41 tests covering user/admin route sets,
  route clicks, active `aria-current`, responsive button contracts, decorative
  icons, GSAP border behavior, active-pill motion, reduced-motion preference,
  resize cleanup, pointer spotlight behavior, focusability, and store
  integration.
- New dedicated PatternCard suite: 50 tests covering themes, accessibility,
  keyboard activation, pointer CSS variables, drag/drop callbacks, GSAP motion
  gating, reduced motion, press-dot styling, active states, and cleanup.
- New dedicated FloatingSkillsMenu suite: 50 tests covering closed/open states,
  skeleton loading, skill button data, focus/keyboard and click behavior,
  no-link contract, layout classes, GSAP branches, reduced motion, listener
  cleanup, and safe unmount.
- New dedicated SiriLiquidGlass suite: 50 tests covering decorative DOM and
  accessibility, state attributes, animation and reduced-motion branches, store
  motion preference changes, rerender behavior, multiple instances, inert
  interactions, and cleanup.
- Expanded SettingsModal/SettingsButton suite: 40 dedicated tests covering the
  icon trigger, modal lifecycle, motion/reduced-motion behavior, tabs, user and
  admin access views, provider validation, usage reset, plan controls,
  language/localStorage persistence, persona generation, and generated-prompt
  save flow.
- Expanded ChatPanel suite: 43 dedicated tests plus 4 flow tests covering
  selected PDF context, ask-tutor handoff, library context switching/renaming,
  assistant actions, flashcard generation, reasoning trace states, web-search
  sources, voice archives, TTS controls, validation, send keyboard behavior,
  streamed `/api/chat`, tool/model stream event recording, and error rendering.
- Expanded PdfViewer suite: 45 dedicated tests plus 5 flow tests covering
  mocked React-PDF load states, page clamping/input/keyboard navigation,
  fit controls and persisted scale, reduced-motion branches, Ask Tutor
  selection handoff, highlight/underline/strikethrough annotations, sticky-note
  save/cancel/blank states, document/page scoping, roles, labels, and empty
  document handoff.
- `npm run test:dom` on 2026-06-05 after ChatPanel/PdfViewer rendered expansion:
  20 files, 582 tests, all passing.
