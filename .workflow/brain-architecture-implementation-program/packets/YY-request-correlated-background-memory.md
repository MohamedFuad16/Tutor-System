# Packet YY: Request-Correlated Background Memory

## Objective

Make the complete local brain-flow proof stricter by tying background memory
writes back to the same foreground chat or voice request id that already groups
context injection, retrieval, model runs, and tool jobs in Admin.

## Context

Typed chat and live voice already build shared brain-context packets, call
tools, and write learning-book updates. The next gap is traceability: a beta
claim should prove that the background memory agent wrote rows for the exact
chat or voice request, not merely that some unrelated memory row exists.

## Ownership

- `src/components/ChatPanel.tsx`
- `src/memory/memory.orchestrator.ts`
- `src/memory/longterm.memory.ts`
- `src/memory/beta.diagnostics.ts`
- `tests/beta-diagnostics.test.mjs`
- README, architecture docs, built-in Library book copy, and workflow evidence
- `graphify-out/*` after explicit Graphify regeneration

## Do

- Thread request id, mode, and agent-layer metadata into chat and voice
  `trackInteraction()`, `updateLearningBookFromConversation()`, and graph
  concept updates.
- Preserve local-only behavior and existing request ids.
- Strengthen Beta Diagnostics so the background memory signal requires
  request-correlated chat and voice memory evidence.
- Keep model-summary mastery and confidence gates intact.

## Do Not

- Add AWS/cloud synchronization.
- Treat unverified model summaries as learner mastery or confidence evidence.
- Rewrite unrelated Admin layout or old workflow directories.

## Expected Output

- Admin request timelines can group background memory rows with chat/voice
  foreground rows by request id.
- Beta Diagnostics no longer marks the complete brain flow ready from
  chat-only or uncorrelated memory rows.
- Tests, docs, workflow evidence, Graphify refresh, commit, and push.
