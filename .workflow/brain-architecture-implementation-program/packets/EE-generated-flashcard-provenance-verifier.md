# Packet EE: generated flashcard provenance verifier

## Goal

Promote generated flashcards from unsupported artifact rows to locally
verifiable learner-brain provenance records.

## Scope

- `src/memory/artifact.records.ts`
- `tests/artifact-records.test.mjs`
- `src/views/AdminView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `TUTOR_ARCHITECTURE.md`
- Workflow and Graphify artifacts for this packet

## Constraints

- Keep the verifier local-only and deterministic.
- Prove saved flashcard provenance, not flashcard factual correctness.
- Do not fetch external pages or call models during verification.
- Do not implement AWS/cloud sync.
- Preserve existing correction and citation-state semantics.

## Acceptance Checks

- Generated flashcard artifacts include local-only and no-external-fetch
  metadata that cannot be overridden by caller metadata.
- Admin can run the local verifier for flashcard artifacts.
- Coherent flashcard provenance verifies only when batch/message/card ids and
  local anchors agree.
- Missing card ids or conflicting source refs fail closed.
- Tests, lint, build, Graphify regeneration, and browser QA pass.
