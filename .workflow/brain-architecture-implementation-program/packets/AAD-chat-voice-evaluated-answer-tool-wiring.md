# Packet AAD: Chat And Voice Evaluated-Answer Tool Wiring

## Objective

Wire the evaluated-answer evidence contract into the real typed-chat and
live-voice tool paths so quiz or active-recall turns can create audited local
BKT evidence when they have a real concept id and explicit evaluation.

## Graphify Route

- `graphify query "ChatPanel streaming parser tool calls memory update evaluated answer evidence source aware tutor chat active book voice mode" --budget 3000 --graph graphify-out/graph.json`
- `graphify query "MemoryOrchestrator updateLearningBookFromConversation concept mastery confidence evidence gates chat voice tool runtime" --budget 3000 --graph graphify-out/graph.json`
- `graphify query "AdminView observability tabs tool calls model behavior memory retrieval evaluated answer evidence telemetry" --budget 2400 --graph graphify-out/graph.json`
- `graphify query "evaluated answer quiz assessment rubric tool schema chat stream done payload server" --budget 2600 --graph graphify-out/graph.json`

## Ownership

- `server.ts`
- `src/components/ChatPanel.tsx`
- `src/lib/voiceAgentTools.ts`
- `src/memory/answer.evidence.ts`
- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- Focused tests and architecture book copy.

## Constraints

- Do not fake mastery evidence.
- Skip invented or placeholder concept ids.
- Skip answers that have no score/max-score or explicit correct/incorrect
  outcome.
- Keep AWS/cloud synchronization out of scope.
- Preserve unrelated untracked workflow directories.

## Expected Output

- Chat stream exposes `evaluate_answer` and sends staged evaluations in the
  final `done` event.
- `ChatPanel` records staged evaluations through the local evidence contract.
- Live voice exposes and handles the same `evaluate_answer` tool.
- Admin brain-flow coverage requires request-correlated evaluated mastery
  evidence before the flow is ready.

## Verification

- `npm run test`
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Beta Diagnostics and architecture books.
- Graphify refresh and smoke queries before commit.
