# Packet ACI: Latched Voice Proof-Attempt Metadata

## Objective

Keep live voice proof evidence under one deliberate provider-key proof attempt
identity for the whole session. The selected Admin attempt id should be latched
when voice starts and reused by voice context injection, websocket auth,
model-run rows, tool-job rows, transcript turns, and background learner-memory
writes.

## Scope

- Source scope:
  - `src/components/ChatPanel.tsx`
  - `tests/voice-proof-attempt-latch.test.mjs`
  - `README.md`
  - `TUTOR_ARCHITECTURE.md`
  - `src/lib/userBrainArchitectureBook.ts`
  - `src/views/RevisionView.tsx`
- Workflow scope:
  - `.workflow/brain-architecture-implementation-program/*`
  - `graphify-out/*` after explicit Graphify regeneration
- Out of scope:
  - AWS/cloud sync.
  - Automatic provider-key calls from Admin.
  - New Dexie schema fields.

## Graphify Routing

- `graphify query "remaining live provider key beta proof typed chat live voice
complete flow stored injected tool calling both agent layers Admin proof
diagnostics" --budget 7000 --graph graphify-out/graph.json`
- `graphify path "buildCoherentLiveProofFromLedgers()" "AdminView()"
--graph graphify-out/graph.json`
- `graphify query "voice_agent model run recordModelRunEvent durable model row
live voice voice websocket ChatPanel" --budget 6000 --graph
graphify-out/graph.json`
- `graphify path "recordModelRunEvent()" "ChatPanel()"
--graph graphify-out/graph.json`

## Integration Plan

1. Add a live voice proof-attempt ref and helper in `ChatPanel`.
2. Capture the selected Admin attempt id at `startVoice()`.
3. Reuse the latched id for websocket auth, context metadata, model rows, voice
   tool rows, transcript turn events, and background memory updates.
4. Keep typed chat scoped to the active proof attempt at chat request time.
5. Add a source-contract regression test for the voice latch.
6. Update the local architecture books and workflow evidence.

## Verification Plan

- `npm run format`
- `npm run test -- tests/voice-proof-attempt-latch.test.mjs
tests/system-activity.test.mjs tests/beta-diagnostics.test.mjs
tests/voice-agent-tools.test.mjs`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for App Design Language Local Beta Control Patterns.
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path for `voiceProofAttemptIdRef` and
  `getVoiceProofAttemptId()`.
