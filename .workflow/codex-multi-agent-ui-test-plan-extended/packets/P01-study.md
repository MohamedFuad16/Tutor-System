# P01 Study Lead

Objective:
Audit and expand tests around Study page flows: document upload, active document behavior, PDF viewer navigation, annotations, and tutor chat handoff.

Graphify files:
- `src/views/StudyView.tsx`
- `src/components/PdfViewer.tsx`
- `src/components/ChatPanel.tsx`
- `src/memory/longterm.memory.ts`
- `src/memory/memory.orchestrator.ts`
- `src/store/index.ts`

Ownership:
- Proposed or direct test changes under `tests/study-*.test.mjs` and `tests/pdf-*.test.mjs`.

Do:
- Use repo-native `node:test` unless a dependency need is explicitly recorded.
- Prefer stable behavior assertions and focused source invariants.
- Mock or block AI/provider behavior.

Do not:
- Edit Graphify artifacts.
- Add UI test dependencies without approval.
- Revert unrelated work.

Expected output:
- Coverage notes and changed test files, or blocked dependency rationale.

Verification:
- Focused new tests, then `npm test`.
