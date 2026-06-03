# Packet ABS: Dual-Agent Tool Contract And Playback Clarity

## Objective

Strengthen the local brain-wiring rehearsal so it proves typed chat and live
voice share the same required fields for common tools, not only the same tool
names. Keep the proof synthetic and excluded from live beta readiness.

## Context

Graphify routed this slice through `brain.rehearsal.ts`, `chatAgentTools.ts`,
`voiceAgentTools.ts`, `AdminView.tsx`, `RevisionView.tsx`, and
`tests/brain-rehearsal.test.mjs`.

The user also asked for simpler Admin copy and for audio overview fallback
behavior to stay in the background without exposing another visible play button
or fallback control.

## Ownership

- Main agent owns implementation.
- No sidecar write scopes are needed for this small slice.

## Do

- Compare shared required parameters for the common chat/voice tools.
- Surface the contract result in Admin's synthetic wiring rehearsal.
- Keep the rehearsal in-memory, synthetic, local-only, and excluded from live
  coverage.
- Simplify the Admin activity paragraph.
- Keep audio overview playback retry hidden inside the single visible player.
- Update architecture/book copy and workflow notes.

## Do Not

- Do not call external providers.
- Do not count rehearsal rows toward live beta readiness.
- Do not implement AWS/cloud pieces.
- Do not stage unrelated untracked workflow directories.

## Verification

- Focused `brain-rehearsal` test bundle.
- Format, lint, test, build.
- Browser QA for Admin Beta and Revision audio/book surfaces.
- Regenerate Graphify only after source changes are verified.
