# Packet ABQ: Live Multi-PDF Beta Proof Gate

## Objective

Turn multi-PDF chat/voice context from an implemented behavior into a live local
beta proof gate. Admin should be able to show whether typed chat and live voice
both injected request-correlated context packets that included more than one
ready PDF from the active learning book.

## Graphify Routing

- `graphify query "brain architecture next implementation slice multi PDF
context injection chat voice mode stored injected tool calling agent layers
Admin diagnostics live beta proof" --budget 8000 --graph
graphify-out/graph.json`
- `graphify query "ChatPanel Voice Agent shared brain context packet multiple
PDFs active book request ids tool calling transcript memory Admin Beta
Diagnostics source files" --budget 8000 --graph graphify-out/graph.json`
- `graphify query "userBrainArchitectureBook tutorBook app design book system
architecture beta diagnostics thirteen signal multi-PDF context Admin source
files" --budget 7000 --graph graphify-out/graph.json`

## Ownership

- `src/memory/beta.diagnostics.ts`
- `src/memory/brain.rehearsal.ts`
- `src/views/AdminView.tsx`
- `src/views/RevisionView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `tests/beta-diagnostics.test.mjs`
- workflow notes and regenerated Graphify artifacts

## Do

- Add explicit chat and voice multi-PDF context coverage counters.
- Require request-correlated context events with multiple context document ids.
- Surface the new signals through the existing Admin diagnostics cards.
- Update source books and design copy from the older nine/eleven-signal wording
  to the thirteen-signal local verifier.
- Keep AWS/cloud and live provider-key traffic out of scope.

## Do Not

- Do not alter Dexie schema.
- Do not call paid providers.
- Do not change how raw prompt context is stored; keep raw context out of Admin
  exports.
- Do not stage unrelated untracked workflow folders.

## Verification

- `npm run format`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Diagnostics and relevant book/design copy.
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
