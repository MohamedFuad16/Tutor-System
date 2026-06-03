# Packet ACI: Latched Voice Proof-Attempt Metadata

## Status

Completed and pushed through local verification gates.

## Summary

This packet latches the selected Admin provider-key proof attempt id when a
live voice session starts. The latched id then flows through voice context,
websocket auth, model-run telemetry, tool-job telemetry, voice transcript events,
and background learner-memory updates. Typed chat keeps its existing behavior:
it reads the active proof attempt id at chat request time.

## Implementation Notes

- Added `voiceProofAttemptIdRef` and `getVoiceProofAttemptId()` in
  `ChatPanel`.
- Captured `activeBetaProofAttemptId` once in `startVoice()`.
- Replaced live voice tool-call and websocket-session metadata reads with the
  latched helper.
- Added `tests/voice-proof-attempt-latch.test.mjs` to guard the contract.
- Updated README, Tutor System Architecture, User Brain Architecture, and App
  Design Language copy.

## Verification Evidence

- `npm run format`: passed.
- `npm run test -- tests/voice-proof-attempt-latch.test.mjs
tests/system-activity.test.mjs tests/beta-diagnostics.test.mjs
tests/voice-agent-tools.test.mjs`: passed via the project test runner, 164
  tests.
- `npm run test`: passed, 164 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason skill-preflight`: unavailable because
  `package.json` has no `brain:postchange` script.
- `npm run brain:retrieve -- remaining provider-key live beta proof typed chat
live voice stored injected tool calling both agent layers`: unavailable
  because `package.json` has no `brain:retrieve` script.
- `npm run brain:impact -- src/memory/beta.diagnostics.ts`: unavailable because
  `package.json` has no `brain:impact` script.
- In-app Browser desktop QA confirmed App Design Language Local Beta Control
  Patterns rendered the voice proof-attempt latch copy with no horizontal
  overflow and zero warning/error logs.
- `node .workflow/brain-architecture-implementation-program/packets/phase70-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile App Design Language
  rendered the voice proof-attempt latch copy with no horizontal overflow and
  zero warning/error logs.
- Browser QA screenshots saved as
  `ACI-app-design-voice-latch-desktop.png` and
  `ACI-app-design-voice-latch-mobile.png`; JSON evidence saved as
  `phase70-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1122 nodes, 1960 edges, and 65 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`82.3 KB`).
- Graphify smoke query found `voice-proof-attempt-latch.test.mjs`,
  `ChatPanel.tsx`, `ChatPanel()`, `sourceSlice()`, `startVoiceSource`,
  `voiceToolSource`, `sendMessageSource`, and connected beta
  diagnostics/Admin/Revision nodes.
- Graphify did not extract `getVoiceProofAttemptId()` as a standalone path node,
  so helper-level path smoke used the regenerated source-contract test and
  `ChatPanel` graph nodes instead.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch references.

## Remaining Work

- Run deliberate provider-key typed chat plus live voice traffic during beta.
- Keep AWS/cloud synchronization deferred until after local beta proof.
