# P03 Revision Lead

Objective:
Audit and expand tests around Revision learning books, flashcards, generated artifacts, active recall, and source-backed paper-style UX invariants.

Graphify files:
- `src/views/RevisionView.tsx`
- `src/memory/revision.evidence.ts`
- `src/memory/longterm.memory.ts`
- `src/memory/flashcard.concepts.ts`
- `src/memory/artifact.records.ts`
- `src/lib/chapterAudioOverviews.ts`
- `src/lib/userBrainArchitectureBook.ts`

Ownership:
- Proposed or direct test changes under `tests/revision-*.test.mjs`, `tests/flashcard-*.test.mjs`, and `tests/artifact-*.test.mjs`.

Do:
- Keep artifact generation tests local and deterministic.
- Ensure learning book and flashcard persistence contracts are represented.

Do not:
- Treat built-in learner-brain content as Graphify architecture source.
- Edit unrelated memory schemas without explicit need.

Expected output:
- Coverage notes and changed test files, or blocked dependency rationale.

Verification:
- Focused new tests, then `npm test`.
