# P09 Dexie Hook Lead Result

Status: proposal only. No rendered `DOM + fake-indexedDB` harness is present in the inspected checkout, so no `tests/dexie-hooks-*.test.tsx` files were added.

Graphify route:
- MCP Graphify returned stale unrelated provider context.
- Local CLI `graphify query ... --graph graphify-out/graph.json` routed this lane to `src/views/StudyView.tsx`, `src/views/RevisionView.tsx`, `src/views/AnalyticsView.tsx`, `src/memory/longterm.memory.ts`, `src/store/index.ts`, and the existing Node/static test lane.

Harness finding:
- `package.json` uses `node --test tests/*.test.mjs` plus esbuild-bundled helper tests.
- No current `fake-indexedDB`/`fake-indexeddb`, `jsdom`, `happy-dom`, Testing Library, Vitest, or `.test.tsx` runner is available.
- Existing coverage is useful source-contract/helper coverage, but it does not render React against IndexedDB mutation events.

Current Dexie/reactivity surfaces:
- `StudyView` uses `useLiveQuery` for the active book and the active book's `learningDocuments`, then renders document chips only after the active document produces a `pdfUrl`.
- `RevisionView` uses `useLiveQuery` for `learningBooks`, `learningBookConcepts`, `learningEntries`, and `flashcards`, then renders the generated learning-books section, concept/card counts, active book markdown, and flashcard deck from those live results.
- `AnalyticsView` does not use `useLiveQuery`; it performs a one-shot `useEffect` read of `db.concepts.toArray()`, `db.interactions.count()`, and `db.sessions.count()`. A true "mutate Dexie after mount and screen updates" test should fail until this screen is converted to a live Dexie subscription.
- `longterm.memory.ts` exports a singleton `db = new BrainDatabase()` with the fixed database name `NeuralNestBrain`, so future rendered tests need per-test IndexedDB cleanup and module/import ordering that installs fake IndexedDB before the singleton opens.

Safest rendered tests once the harness exists:

1. `tests/dexie-hooks-study-view.test.tsx`
   - Install fake IndexedDB globals before importing `longterm.memory.ts`.
   - Reset `NeuralNestBrain`, localStorage, and Zustand state for each test.
   - Stub heavy children (`PdfViewer`, `ChatPanel`) and browser APIs (`URL.createObjectURL`, `URL.revokeObjectURL`, `matchMedia`, `requestAnimationFrame`, `ResizeObserver`).
   - Seed `db.learningBooks.put({ id: "book-hook", title: "Hook Proof Book", updatedAt: ... })` and set `activeLearningBookId` to that book.
   - Render `StudyView`, then `db.learningDocuments.put(...)` with a PDF `Blob`.
   - Assert the document chip text appears and the stubbed PDF area appears.
   - Add a second document, assert both chip titles appear in newest-first order.
   - Delete the first document through Dexie or the rendered remove button, assert the removed chip disappears without remounting.

2. `tests/dexie-hooks-revision-view.test.tsx`
   - Use the same fake IndexedDB/global reset harness.
   - Render `RevisionView` with empty generated-book tables.
   - `db.learningBooks.put(...)` after render and wait for the generated "Learning books" section plus the book title.
   - `db.learningBookConcepts.put(...)` for the same `bookId` and wait for the row text to change to `1 concepts`.
   - `db.flashcards.put(...)` for the same `bookId` and wait for `1 cards`.
   - Click/open the learning book and assert the active book page reflects the inserted title/overview.
   - Delete the book record and related rows via Dexie transaction, then assert the generated book row disappears without remounting.

3. `tests/dexie-hooks-analytics-view.test.tsx`
   - Treat this as blocked until `AnalyticsView` uses `useLiveQuery` or an equivalent Dexie `liveQuery` subscription.
   - After that source change, render the empty screen and assert total concepts/interactions/sessions are `0`.
   - Mutate `db.concepts`, `db.interactions`, and `db.sessions` after mount.
   - Assert total concepts/interactions/sessions and accessible chart summaries update without remounting.
   - Keep a regression assertion that concept normalization still clamps/labels values using the current `analytics-progress` helper behavior.

Recommended harness shape:
- Prefer one small shared helper for `installIndexedDbGlobals()`, `resetDexieSingleton()`, `resetStore()`, and `renderWithAct()`.
- Keep tests independent by deleting `NeuralNestBrain` after closing the singleton database.
- Avoid network and PDF parsing by stubbing child components and browser-only APIs.
- Do not add these rendered tests until the runner can execute `.test.tsx` with a DOM implementation and fake IndexedDB already available.

Verification performed:
- Graphify local CLI routing was used before source inspection.
- Existing test setup and directly connected files were inspected.
- No dependencies were added.

Remaining gaps:
- A runnable DOM/fake-indexedDB harness is still required.
- `AnalyticsView` needs a live Dexie subscription before it can honestly satisfy the requested post-mount Dexie update proof.
