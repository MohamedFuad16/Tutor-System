# Packet AAI: Generated-Note Preview Lexical Support

## Objective

Add a conservative local generated-note claim-to-source-span matcher without
claiming semantic entailment, factual truth, or document-wide grounding.

## Graphify Context

- `createGeneratedNoteSourceSpans()` -> `recordGeneratedNotesArtifact()` is a
  two-hop path through `artifact.records.ts`.
- `recordGeneratedNotesArtifact()` -> `verifyArtifactCitationIntegrity()` is a
  two-hop path through `artifact.records.ts`.
- Graphify routed the slice through `artifact.records.ts`,
  `memory.orchestrator.ts`, `artifact-records.test.mjs`, `AdminView.tsx`, and
  the architecture/design books.

## Ownership

- `src/memory/artifact.records.ts`
- `src/memory/memory.orchestrator.ts`
- `tests/artifact-records.test.mjs`
- `src/views/AdminView.tsx`
- architecture and design books
- affected stored audio-guide manifests and MP3 assets
- workflow evidence
- regenerated `graphify-out/*`

## Do

- Split compact generated-note summaries into claim previews.
- Normalize meaningful terms and report each claim's best saved source-preview
  overlap.
- Require every saved claim preview to have local lexical support when document
  source previews exist.
- Keep missing overlap `unavailable`; reserve `conflicting` for saved ledger
  identity drift.
- Show coverage state, matched claims, and percent in Admin.
- Regenerate only the affected 3-4 minute stored audio guides.

## Do Not

- Do not claim semantic entailment, factual truth, or document-wide grounding.
- Do not add AWS/cloud work.
- Do not add a durable queue in this packet.

## Verification

- focused artifact-record tests
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- Browser QA for Admin Sources and affected books
- explicit Graphify regeneration and graph smoke queries
