# D02 Chart Rendering Result

## Scope

Read-only rendering review for the User Brain Architecture chart treatment.

## Recommendation

- Keep chart changes in `src/views/RevisionView.tsx`.
- Preserve markdown links, tables, images, and normal code blocks.
- Add a narrow chart path for User Brain Architecture diagrams instead of changing chat-streaming Mermaid rendering.
- Treat the supplied Gemini HTML as visual direction: light grey canvas, white rounded nodes, soft shadows, grey arrows, dashed real-time boundary, and blue/green animated pulses.

## Risks To Watch

- Mermaid is a singleton, so global Mermaid theme changes can affect all Mermaid renders in the same runtime.
- Mermaid-generated internal SVG classes may change between versions; prefer stable wrapper styling and custom SVG only for the special interaction runtime diagram.
- The book uses both `flowchart` and `stateDiagram-v2`, so verification needs more than one chapter.

## Verification Needed

- `npm run lint`
- `npm run build`
- Browser smoke check in Revision -> User Brain Architecture:
  - custom interaction-runtime diagram renders;
  - normal Mermaid diagrams still render;
  - external links open in a new tab;
  - tables remain readable;
  - mobile overflow is intentional chart scrolling, not page breakage.
