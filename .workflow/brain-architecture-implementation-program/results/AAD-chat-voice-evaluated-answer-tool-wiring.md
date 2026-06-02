# Packet AAD Result: Chat And Voice Evaluated-Answer Tool Wiring

## Accepted

- Added `evaluate_answer` to the typed-chat tool contract in `server.ts`.
- Chat SSE now stages evaluated-answer payloads in `done.evaluatedAnswers`.
- Chat server telemetry records evaluated-answer tool jobs and model metadata
  without claiming that mastery moved on the server.
- `ChatPanel` records staged evaluated answers locally through
  `recordEvaluatedAnswerEvidenceBatch()`.
- Added `evaluate_answer` to the shared live voice tool definitions.
- Live voice handles `evaluate_answer` through the same local evidence batch
  helper and marks the tool job blocked when no evidence row is recorded.
- Added answer-evidence normalization and batch helpers for chat/voice payloads.
- Beta Diagnostics now requires verified, request-correlated non-model-summary
  evidence for complete brain-flow readiness.
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and App Design Language copy describe the current
  chat/voice evaluated-answer flow.

## Guardrails

- Placeholder concept ids such as `general` still skip BKT.
- Missing concept ids still skip BKT.
- Unevaluated payloads still skip BKT.
- Missing persistent concepts return `missing_concept` instead of fabricating
  mastery.
- Server-side tool calls stage evaluations; browser-side local IndexedDB writes
  remain the source of durable learner evidence.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 117 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Browser QA was attempted with the in-app Browser at `localhost:3100`, but
  local socket connections are blocked in this environment with
  `EPERM`/`ERR_CONNECTION_REFUSED`. The package has no `brain:ui-regression`
  fallback script.
- `graphify update . --force`: regenerated code architecture artifacts with
  931 nodes, 1615 edges, and 61 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `recordEvaluatedAnswerEvidenceBatch()`,
  `ChatPanel()`, `answer.evidence.ts`,
  `normalizeEvaluatedAnswerEvidenceInput()`,
  `recordEvaluatedAnswerEvidence()`, `VOICE_AGENT_TOOL_DEFINITIONS`, and
  `VoiceAgentFunctionCall`.
- `graphify path "recordEvaluatedAnswerEvidenceBatch()" "ChatPanel()"` found a
  two-hop import/contains path.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Risk

- The tool path is structurally wired and unit/integration tested, but a live
  provider-key chat or voice turn has not been spent in this phase.
- Browser-rendered Admin QA remains pending until the local socket restriction
  is lifted or a non-network UI regression harness is added.
