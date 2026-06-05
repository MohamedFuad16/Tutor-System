# P06 Data/State Lead

Objective:
Audit and expand tests around Zustand, Dexie schema, persistence, and Dexie-react hook update assumptions.

Graphify files:
- `src/store/index.ts`
- `src/memory/longterm.memory.ts`
- `src/memory/memory.orchestrator.ts`
- `src/memory/memory.events.ts`
- `src/memory/retrieval.events.ts`
- `src/memory/correction.events.ts`
- `src/memory/model.runs.ts`
- `src/memory/tool.jobs.ts`
- `src/memory/background.jobs.ts`

Ownership:
- Proposed or direct test changes under `tests/state-*.test.mjs`, `tests/dexie-*.test.mjs`, and existing memory event tests.

Do:
- Cover persisted settings, PDF/chat state, learning books, concepts, flashcards, and ledgers.
- Keep IndexedDB/Dexie limitations explicit if a browser-like DB dependency is needed.

Do not:
- Modify Dexie schema casually.
- Add fake-indexeddb or DOM dependencies without approval.

Expected output:
- Data/state coverage notes and changed tests, or blocked dependency rationale.

Verification:
- Focused new tests, then `npm test`.
