# Packet K Result: Flashcard Concept Linking

Status: completed, verified local implementation.

Graphify routing used:

- `graphify query "generate_flashcards ChatPanel flashcardsUpdates db.flashcards learningBookConcepts db.concepts conceptId LearningBookConcept PersistentConcept"`
- `graphify path "ChatPanel()" "LearningBookConcept"`
- `graphify path "ChatPanel()" "MemoryOrchestrator"`

Accepted implementation:

- Added `src/memory/flashcard.concepts.ts` as the local flashcard concept resolver.
- Generated cards preserve explicit non-placeholder concept IDs.
- Missing or placeholder IDs only link when the active learning-book concept name appears in the card front/back text.
- Ambiguous cards remain `general` so revision review does not fabricate mastery evidence.
- Matched learning-book concepts are mirrored into `db.concepts` with BKT-safe defaults, enabling the Phase 5 Revision evidence path.
- ChatPanel now stores generated cards through the resolver in both manual flashcard generation and streamed tool-output paths.
- Server flashcard tool schemas now allow optional `conceptId` while still requiring only `front` and `back`.
- Added focused Node tests for placeholder rejection, explicit concept preservation, exact concept-name matching, unresolved fallback, and learning-book-to-persistent concept promotion.

Verification so far:

- `npm run lint`: passed.
- `npm run test`: passed, 24 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: app loaded, Study/Revision/Admin navigation controls were reachable, Admin Evidence controls were present, and browser console had 0 warnings/errors. Screenshot capture timed out in the in-app browser, so this phase records DOM/log smoke evidence only.
- Graphify regenerated from a stable temporary worktree with this phase's source files copied in; checked artifacts show 547 nodes, 905 edges, no temp-path leaks, and query smoke returned `flashcard.concepts.ts`, `createFlashcardForStorage()`, `chooseFlashcardConcept()`, and `persistentConceptFromLearningBookConcept()`.

Deferred:

- Rich semantic concept matching beyond exact concept-name phrase matching.
- Full learning-book concept/BKT unification beyond the conservative mirror needed for flashcard evidence.
- AWS/cloud synchronization remains out of scope until beta testing.
