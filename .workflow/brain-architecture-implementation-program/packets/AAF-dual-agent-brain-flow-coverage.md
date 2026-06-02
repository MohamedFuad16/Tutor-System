# Packet AAF: Dual-Agent Brain Flow Coverage

## Objective

Tighten the local brain-flow readiness verifier so it proves both foreground
agent layers are wired: typed chat and live voice must each have context,
request correlation, foreground tool calls, evaluated mastery evidence, and
background memory evidence before Beta Diagnostics can mark the local flow
ready.

## Context

Graphify routed this slice through `buildBrainFlowCoverageFromLedgers()`,
`beta.diagnostics.ts`, `AdminView()`, `EvidenceEvent`, `ToolJob`, and
`tests/beta-diagnostics.test.mjs`.

## Ownership

- Write scope: `src/memory/beta.diagnostics.ts`, `src/views/AdminView.tsx`,
  `tests/beta-diagnostics.test.mjs`, connected books/docs, workflow artifacts,
  and explicitly regenerated `graphify-out/*`.
- Do not touch AWS/cloud implementation.
- Do not relax the existing request-correlation or evidence-gated mastery
  requirements.

## Do

- Split pooled foreground-tool coverage into chat and voice tool signals.
- Split pooled evaluated-mastery coverage into chat and voice mastery signals.
- Keep failed/blocked row behavior unchanged.
- Update Admin copy/layout so the stricter eight-signal card remains readable.
- Add tests that keep voice-only evaluated mastery from passing the flow.

## Verification

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- In-app Browser QA for Admin Beta Diagnostics at desktop and mobile widths.
- Clean Graphify regeneration with no generated scratch nodes.
