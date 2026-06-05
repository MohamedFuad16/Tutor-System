# P05 Component/Element Lead

Objective:
Build a reusable component and element coverage matrix for `src/components`, including buttons, inputs, forms, tooltips, labels, keyboard access, ARIA roles, reduced-motion handling, and animation boundaries.

Graphify files:
- `src/components/ChatPanel.tsx`
- `src/components/PdfViewer.tsx`
- `src/components/Navigation.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/PatternCard.tsx`
- `src/components/PatternSVGs.tsx`
- `src/components/FloatingSkillsMenu.tsx`
- `src/components/SiriLiquidGlass.tsx`
- `src/hooks/useMotionPreference.ts`

Ownership:
- Proposed or direct test changes under `tests/components-*.test.mjs` and workflow result matrices.

Do:
- Identify what can be asserted with the current source-level Node harness.
- Identify what requires a DOM/browser harness.
- Prioritize stable ARIA, keyboard, reduced-motion, and interaction hooks.

Do not:
- Add a new UI testing stack without approval.
- Claim source-text checks are full rendered interaction coverage.

Expected output:
- Component coverage matrix and first stable tests if possible.

Verification:
- Focused new tests, then `npm test`.
