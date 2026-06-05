# P08 Component Render Plan

Status: proposal only. No DOM harness was added.

## Routing Summary

Graphify MCP returned stale context, so this pass used the local CLI against `graphify-out/graph.json`.
The reusable component route was:

- `src/components/Navigation.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/PatternCard.tsx`
- `src/components/FloatingSkillsMenu.tsx`
- `src/components/SiriLiquidGlass.tsx`
- high-level `src/components/ChatPanel.tsx`
- high-level `src/components/PdfViewer.tsx`
- direct shared dependencies: `src/hooks/useMotionPreference.ts`, `src/store/index.ts`, translations

## Harness Decision

No rendered DOM test harness was present at inspection time:

- No `@testing-library/react`, `@testing-library/user-event`, `jsdom`, or `happy-dom` in `package.json`.
- No `.test.tsx` files under `tests`.
- Existing nearby coverage is source-contract style, especially `tests/app-shell-components.test.mjs` and `tests/pdf-viewer-controls.test.mjs`.

Therefore this artifact defines the first rendered-test matrix instead of adding tests. If a harness appears later, keep tests disjoint under `tests/rendered-components-*.test.tsx` and do not add dependencies for this slice.

## Source Anchors

- Navigation renders user/admin items, active pill, pointer spotlight, and `aria-current`: `src/components/Navigation.tsx:32`, `src/components/Navigation.tsx:47`, `src/components/Navigation.tsx:64`, `src/components/Navigation.tsx:94`, `src/components/Navigation.tsx:164`.
- Settings covers open/close, access mode switching, tabs, user/admin form branching, save validation, usage, and persona flows: `src/components/SettingsModal.tsx:698`, `src/components/SettingsModal.tsx:713`, `src/components/SettingsModal.tsx:784`, `src/components/SettingsModal.tsx:834`, `src/components/SettingsModal.tsx:879`, `src/components/SettingsModal.tsx:902`, `src/components/SettingsModal.tsx:952`, `src/components/SettingsModal.tsx:1167`, `src/components/SettingsModal.tsx:1192`, `src/components/SettingsModal.tsx:1306`.
- PatternCard covers themes, event callbacks, pointer CSS vars, dot rendering, drag/press visual states, and children: `src/components/PatternCard.tsx:6`, `src/components/PatternCard.tsx:49`, `src/components/PatternCard.tsx:93`, `src/components/PatternCard.tsx:112`, `src/components/PatternCard.tsx:154`, `src/components/PatternCard.tsx:197`.
- FloatingSkillsMenu covers closed/open render, 400 ms fake loading, skeleton, close, and Search selection: `src/components/FloatingSkillsMenu.tsx:6`, `src/components/FloatingSkillsMenu.tsx:25`, `src/components/FloatingSkillsMenu.tsx:72`, `src/components/FloatingSkillsMenu.tsx:83`, `src/components/FloatingSkillsMenu.tsx:115`.
- SiriLiquidGlass covers animation gating and four-orb render: `src/components/SiriLiquidGlass.tsx:5`, `src/components/SiriLiquidGlass.tsx:16`, `src/components/SiriLiquidGlass.tsx:24`, `src/components/SiriLiquidGlass.tsx:101`.
- ChatPanel high-level render points cover book dropdown, selected PDF chip, skills menu, textarea, voice button, send button, and invalid-input warning: `src/components/ChatPanel.tsx:4271`, `src/components/ChatPanel.tsx:6935`, `src/components/ChatPanel.tsx:7060`, `src/components/ChatPanel.tsx:7432`, `src/components/ChatPanel.tsx:7507`, `src/components/ChatPanel.tsx:7600`, `src/components/ChatPanel.tsx:7621`, `src/components/ChatPanel.tsx:7651`, `src/components/ChatPanel.tsx:7775`.
- PdfViewer high-level render points cover keyboard/page controls, fit modes, selection actions, annotations, draft notes, and voice focus overlay: `src/components/PdfViewer.tsx:284`, `src/components/PdfViewer.tsx:359`, `src/components/PdfViewer.tsx:363`, `src/components/PdfViewer.tsx:396`, `src/components/PdfViewer.tsx:461`, `src/components/PdfViewer.tsx:638`, `src/components/PdfViewer.tsx:701`, `src/components/PdfViewer.tsx:751`, `src/components/PdfViewer.tsx:760`, `src/components/PdfViewer.tsx:827`.

## First 50 Rendered Cases

| # | Priority | Component | Rendered case | Driver | Assertions |
|---:|:--|:--|:--|:--|:--|
| 1 | P0 | Navigation | User mode renders Study, Analytics, Revision only. | Mock store `accessMode=user`, `activeView=study`. | Three nav buttons are visible, Admin is absent, Study has `aria-current=page`. |
| 2 | P0 | Navigation | Admin mode adds Admin item. | Mock `accessMode=admin`. | Admin button is visible with Shield icon container and no duplicate labels. |
| 3 | P0 | Navigation | Clicking each nav item updates view. | Click Study, Analytics, Revision, Admin when allowed. | `setActiveView` receives the clicked `ViewState`; active button changes `aria-current`. |
| 4 | P1 | Navigation | Active pill tracks active button after render and resize. | Render with fake `getBoundingClientRect`, dispatch `resize`. | Pill becomes visible and receives width/height/x/y from active button. |
| 5 | P1 | Navigation | Coarse pointer ignores spotlight updates. | Mock `matchMedia("(pointer: coarse)")` true, fire mouse move. | Spotlight opacity stays inactive; no new mouse-position background is applied. |
| 6 | P1 | Navigation | Fine pointer spotlight enters, moves, leaves. | Mock coarse false; fire enter, move, leave. | Radial gradients update to pointer coordinates, then opacity returns to 0. |
| 7 | P1 | Navigation | Reduced motion disables spin and pill duration. | Mock `useMotionPreference=false` or store plus media. | GSAP receives zero-duration pill update and no infinite border tween. |
| 8 | P0 | Settings | Settings button opens modal with accessible controls. | Click app settings button. | Modal title appears, close button has `aria-label="Close settings"`, animation toggle has `aria-pressed`. |
| 9 | P0 | Settings | Close paths work when not validating. | Click close button, reopen, click backdrop, reopen, click Cancel. | Modal closes each time; no save setters fire on Cancel. |
| 10 | P0 | Settings | Validation locks close paths while saving. | Mock admin with non-empty key; make fetch pending. | Save button shows `Validating...`; close button disabled; backdrop click does not close. |
| 11 | P0 | Settings | Access mode switch from Admin to User leaves Admin view. | Mock `accessMode=admin`, `activeView=admin`; click User. | `setAccessMode("user")`, `setActiveView("study")`, switching overlay, delayed reload call. |
| 12 | P1 | Settings | Access mode no-op on selected mode. | Click the already selected mode. | No reload, no overlay, no duplicate setter call. |
| 13 | P0 | Settings | Tab bar switches General, Usage, Persona panels. | Click each tab. | Only selected panel content is visible; active tab class/pill tracks the selected tab. |
| 14 | P0 | Settings | User-mode General hides admin secrets. | Mock `accessMode=user`; open General. | Language, learner name, usage mini-panel, animation toggle visible; OpenRouter, Serper, Deepgram, TTS, model controls absent. |
| 15 | P0 | Settings | Admin-mode General exposes developer controls. | Mock `accessMode=admin`. | OpenRouter, Serper, Deepgram, TTS voice, MisoTTS URL, AI model, language, learner name, animation toggle visible. |
| 16 | P0 | Settings | User-mode Save persists only user-safe fields. | Change language, learner name, animations; Save. | Calls learner name, language, animation setters; does not call OpenRouter validation fetch. |
| 17 | P1 | Settings | Admin Save with blank OpenRouter key persists without validation. | Clear OpenRouter key, fill other fields, Save. | `setApiKey("")` plus other admin setters fire; no external fetch; modal closes. |
| 18 | P0 | Settings | Admin Save validates non-empty OpenRouter key successfully. | Mock `fetch("https://openrouter.ai/api/v1/models")` ok. | Authorization header uses typed key; all setters fire; modal closes. |
| 19 | P0 | Settings | Admin Save validation failure keeps modal open. | Mock fetch non-ok or throw. | Error text appears; `isValidating` clears; modal remains open; primary setters do not commit invalid key. |
| 20 | P1 | Settings | Usage tab branches by access mode. | Render Usage in user and admin modes. | User sees plan/milestones language; admin sees usage analytics, token/cost graph, and reset. |
| 21 | P1 | Settings | Plan selector updates plan tier in user Usage. | Mock `accessMode=user`, click Plus/Pro option. | `setPlanTier` receives selected tier; selected card visual updates. |
| 22 | P1 | Settings | Usage reset button resets analytics in admin Usage. | Mock usage values, click Reset. | `resetUsageAnalytics` called and values can re-render to zero in next state. |
| 23 | P1 | Settings | Persona presets populate description input. | Open Persona, click each preset. | Input value matches clicked preset. |
| 24 | P1 | Settings | Persona generation success writes prompt and status. | Type description, mock `/api/generate-persona` prompt response, click Generate. | Spinner while pending, prompt textarea fills, status says prompt generated. |
| 25 | P1 | Settings | Persona generation failure reports status. | Mock failed response or rejected fetch. | Failure message appears, spinner clears, modal remains usable. |
| 26 | P0 | PatternCard | Card renders children, SVG, bloom, and selected theme. | Render with each exported theme and child text. | Child content visible; SVG component mounted; background/text classes match theme. |
| 27 | P0 | PatternCard | Click and layout id pass through. | Provide `onClick` and `layoutId`. | Click calls handler once; root has `data-layout-id`. |
| 28 | P1 | PatternCard | Pointer move sets CSS variables. | Fire mouse move with stubbed rect. | Root style has `--mouse-x` and `--mouse-y` matching relative pointer coordinates. |
| 29 | P1 | PatternCard | Hover and press scale are motion-gated. | Fire enter, down, up, leave with motion on/off. | With motion on, GSAP target scales 1.02, 0.98, 1.02, 1; with motion off, no scale tween. |
| 30 | P1 | PatternCard | Dot overlay renders only when enabled. | Render `animateDots=true` and `false`. | True renders 16 dot spans; false renders none and no dot tweens. |
| 31 | P1 | PatternCard | Dragging visual state and callbacks work. | Render `isDragging=true`, fire dragOver/dragLeave/drop. | Ring/scale class present; callbacks receive drag events. |
| 32 | P2 | PatternCard | Pressing and dragging activate dot animation. | Render `isPressing` and `isDragging`. | GSAP dot targets use active opacity/scale values; inactive state returns base values. |
| 33 | P2 | PatternCard | Dot color defaults and overrides are respected. | Render beige theme, dark theme, and custom dot/ring colors. | Filled dots and ring borders use expected color values. |
| 34 | P0 | FloatingSkillsMenu | Closed state renders nothing. | Render `isOpen=false`. | No menu, heading, skeleton, or Search item in DOM. |
| 35 | P0 | FloatingSkillsMenu | Open state shows skeleton before fake load resolves. | Render `isOpen=true`, use fake timers before 400 ms. | Skills heading and close button visible; four skeleton rows visible; Search absent. |
| 36 | P0 | FloatingSkillsMenu | Fake load resolves to Search item. | Advance fake timers by 400 ms. | Skeleton disappears; Search item button appears. |
| 37 | P0 | FloatingSkillsMenu | Selecting Search closes and reports selection. | Click Search after load. | Calls `onSelectSkill("Search")`, then `onClose`. |
| 38 | P0 | FloatingSkillsMenu | Close button only closes. | Click header minus button. | `onClose` called, `onSelectSkill` not called. |
| 39 | P1 | FloatingSkillsMenu | Mobile width stays inside viewport. | Render at narrow viewport or style assertion. | Root keeps `max-w-[calc(100vw-32px)]` behavior and no horizontal overflow. |
| 40 | P1 | SiriLiquidGlass | Base render includes rotor and four color orbs. | Render default props. | One rotor plus blue, purple, pink, cyan orb elements render with absolute layout classes. |
| 41 | P1 | SiriLiquidGlass | Animated false or reduced motion resets transforms. | Render `animated=false`; render with motion false. | GSAP sets rotor rotate 0 and orbs scale/x/y to defaults, no infinite tween. |
| 42 | P2 | SiriLiquidGlass | Active and hovered props alter animation targets. | Render combinations of `isActive` and `isHovered`. | Active rotor duration is shorter and orb offsets apply; hovered scale targets are larger and non-repeating. |
| 43 | P1 | SiriLiquidGlass + ChatPanel | Glass appears only for active send or live voice buttons. | Render ChatPanel with empty input, typed input, and non-idle voice state. | Send button glass appears only with active input; voice button glass appears only when voice is non-idle. |
| 44 | P0 | ChatPanel | Project dropdown opens, renames, and selects context. | Click project pill; Enter a rename; click a book row. | Dropdown appears; rename calls title updater; selecting book closes dropdown and updates active book/project. |
| 45 | P0 | ChatPanel | PDF selection chip renders and clears. | Mock `selectedTextContext`. | Chip shows "From PDF Selection" and selected text; X clears selected context. |
| 46 | P0 | ChatPanel | Tools menu selects Search and renders Web Search chip. | Click tools button, advance menu timer, click Search. | Menu closes, Web Search chip appears, textarea placeholder changes to "Search the web...", chip X clears search mode. |
| 47 | P0 | ChatPanel | Textarea send keyboard and invalid-input visuals. | Type normal text, Enter, Shift+Enter; then type a disallowed character sequence. | Enter prevents default and calls send path; Shift+Enter keeps composing/newline behavior; invalid text shows "Special characters are limited." and invalid send-arrow styling. |
| 48 | P1 | ChatPanel | Voice and send button states render their high-level states. | Render empty input, typed input, non-idle voice, sending, and success states. | Voice button aria label changes from start to active voice; Siri glass appears for active send/live voice; send button shows idle arrow, sending spinner, and success check. |
| 49 | P0 | PdfViewer | Page controls, keyboard navigation, and fit modes render correctly. | Render with mocked `react-pdf` Document/Page and store page state. | Prev/next/page-input clamp pages; Arrow keys change pages unless focus is in input/textarea; fit-height, fit-width, and double-click toggle width mode. |
| 50 | P0 | PdfViewer | Selection tooltip drives annotation and Ask Tutor flows. | Mock `window.getSelection`, range rects, and page wrapper rect. | Selecting text opens tooltip; Highlight/Underline/Strike call annotation paths; Sticky opens note draft and saves selected text; Ask Tutor sets selected text context and clears tooltip. |

## Next Split

If this becomes implementation work, split the cases into small files rather than one mega-test:

- `tests/rendered-components-navigation-settings.test.tsx`: cases 1-25.
- `tests/rendered-components-pattern-menu-glass.test.tsx`: cases 26-43.
- `tests/rendered-components-chat-pdf.test.tsx`: cases 44-50 plus deeper browser-only PDF/voice follow-ups.

## Known Gaps For Later Browser QA

- True text selection ranges, `react-pdf` canvas behavior, and PDF page image extraction should be verified in a browser-capable harness, not only a component renderer.
- Chat live voice start/stop, WebSocket state, and `VoiceUniverse` rendering need either browser mocks for media/WebSocket or a live-app smoke.
- `FloatingSkillsMenu` close and Search buttons are currently icon/text visible but do not expose explicit button labels for the close icon; rendered accessibility checks should decide whether to add labels in a future source change.
- `PdfViewer` action-bar icon buttons mostly rely on titles or icons. A rendered a11y pass should decide which controls need explicit `aria-label` without changing behavior in this planning slice.
