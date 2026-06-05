# Packet: Chart Integration

## Objective

Translate the supplied Gemini-style interaction-model UI into the in-app book reader charts.

## Inputs

- `/Users/mfuad16/Downloads/gemini-code-1780252831574.html`
- `src/views/RevisionView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- Chart agent results `results/D01-chart-visual-language.md`, `results/D02-chart-rendering.md`, and `results/D03-diagram-content.md`
- QA result `results/QA02-chart-risk.md`

## Constraints

- Keep the external HTML as inspiration only.
- Do not affect chat-streaming Mermaid behavior unnecessarily.
- Preserve markdown links, tables, images, and normal code blocks.
- Respect reduced-motion preferences.

## Expected Output

A custom `interaction-runtime` chart path and a User Brain Architecture Mermaid style variant, verified by lint, build, and browser smoke tests.
