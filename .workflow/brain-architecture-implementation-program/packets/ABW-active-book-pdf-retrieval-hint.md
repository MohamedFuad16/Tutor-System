Packet ID: ABW

Objective: Make typed chat and live voice retrieval ask against the whole active
book PDF set, not only the visible PDF, while keeping audio overview fallback UI
inside one visible player and simplifying Admin Center copy.

Context:
- The shared brain-context packet already includes an active-book PDF manifest,
  balanced multi-PDF excerpts, and chat/voice metadata.
- The remaining context weakness was that semantic retrieval received mostly
  the immediate user or voice query. That could make retrieval behave as if only
  the active/current PDF mattered, even though the final context packet included
  companion PDFs.
- The user also asked that Admin Center copy become simpler and that stored
  audio overview fallback controls stay hidden inside the existing player.

Ownership:
- `src/memory/brain.context.ts`
- `tests/brain-context.test.mjs`
- `src/views/AdminView.tsx`
- `src/views/RevisionView.tsx`
- Built-in architecture book copy in `src/lib/tutorBook.json` and
  `src/lib/userBrainArchitectureBook.ts`
- Workflow QA script/results for this packet.

Do:
- Add a compact active-book PDF retrieval hint for chat and voice.
- Include active and companion PDF titles, ids, statuses, and extraction
  metadata in the retrieval query.
- Keep final brain-context packet behavior unchanged except for stronger
  retrieval input.
- Add tests proving chat and voice retrieval queries include active and
  companion PDFs.
- Verify Admin copy and stored audio overview player behavior in browser QA.
- Update architecture/design book copy to match the runtime.

Do not:
- Add AWS/cloud behavior.
- Add a visible audio fallback, retry, or second play button.
- Treat synthetic or unit-test evidence as a real provider-key live beta run.
- Manually edit Graphify artifacts outside the explicit regeneration step.

Expected output:
- Source patch, tests, docs/book updates, browser QA evidence, Graphify refresh,
  commit, and push.

Verification:
- `npm run format`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA at desktop and mobile viewports for Admin and Revision audio.
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
