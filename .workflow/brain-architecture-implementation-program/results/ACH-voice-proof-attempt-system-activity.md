Packet ID: ACH
Objective: Preserve provider-key proof-attempt metadata in server-side voice system activity.
Status: completed

## Summary

This slice keeps Admin's behind-the-scenes voice timeline correlated with the
deliberate provider-key proof attempt. Typed chat and client-side voice ledgers
already carried the proof attempt id; the server-side voice websocket now keeps
that same id on local system-activity rows so the Admin proof drill can inspect
voice auth, context, provider, tool, and close activity without guessing.

## Verification

- `graphify query "server voice websocket proofAttemptId recordVoiceToolRequest startVoiceSession recordSystemActivity" --budget 4000 --graph graphify-out/graph.json`: routed the slice to `server.ts`, `ChatPanel.tsx`, `voiceAgentTools.ts`, `brain.context.ts`, `beta.diagnostics.ts`, `AdminView.tsx`, and connected tests.
- `graphify query "voice proofAttemptId system activity Admin architecture book app design userBrainArchitectureBook TUTOR_ARCHITECTURE RevisionView" --budget 5000 --graph graphify-out/graph.json`: routed the doc sync to `src/lib/userBrainArchitectureBook.ts`, `TUTOR_ARCHITECTURE.md`, `README.md`, and `src/views/RevisionView.tsx`.
- `npm run format`: passed.
- `npm run test -- tests/system-activity.test.mjs tests/voice-agent-tools.test.mjs tests/beta-diagnostics.test.mjs`: passed through the project test runner, 161 tests.
- `npm run test`: passed, 161 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no `brain:ui-regression` script.
- In-app Browser QA on `http://localhost:3100` confirmed desktop and mobile App Design Language / Local Beta Control Patterns rendered the Voice agent timeline text with proof-attempt id, `voice_realtime` agent layer, tool requests, and tool completions; both viewports had no horizontal overflow and zero warning/error logs.
- `graphify update . --force`: regenerated code architecture artifacts with 1115 nodes, 1954 edges, and 66 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html` at 81.9 KB.
- Graphify smoke query found `hasVoiceProofMetadata()`, `system-activity.test.mjs`, `startVoiceApp()`, `server.ts`, `ChatPanel.tsx`, `voiceAgentTools.ts`, `brain.context.ts`, `beta.diagnostics.ts`, and `AdminView.tsx`.
- Graphify path `hasVoiceProofMetadata()` to `startVoiceApp()` found a two-hop route through `system-activity.test.mjs`.
- Top-level Graphify artifacts `graph.json`, `GRAPH_REPORT.md`, `GRAPH_TREE.html`, and `manifest.json` had no `server.mjs`, `.tmp-test`, or `/private/tmp` scratch references.

## Remaining Work

- Real deliberate provider-key typed-chat plus live-voice beta traffic remains the largest unproven local gap; AWS/cloud synchronization stays deferred.
