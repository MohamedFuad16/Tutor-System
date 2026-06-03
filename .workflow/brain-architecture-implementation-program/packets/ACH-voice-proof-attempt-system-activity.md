Packet ID: ACH
Objective: Preserve provider-key proof-attempt metadata in server-side voice system activity.
Status: in progress

## Context

Graphify routed the slice through `server.ts`, `ChatPanel.tsx`,
`voiceAgentTools.ts`, `brain.context.ts`, `AdminView.tsx`,
`beta.diagnostics.ts`, and `tests/system-activity.test.mjs`. Client-side
typed-chat and voice ledgers already carry `proofAttemptId`, but the voice
websocket server activity rows needed the same id so Admin can correlate auth,
context injection, tool calls, provider state, and close events during a
manual provider-key proof run.

## Scope

- Local-only voice websocket metadata.
- No provider calls, no cloud/AWS work, and no synthetic rows counted as live
  beta proof.
- Preserve the existing live voice and mock voice function-call loop behavior.

## Planned Changes

- Capture the normalized proof attempt id from `voice_auth` payloads or
  `studyContextMetadata`.
- Stamp voice system-activity rows with canonical `proofAttemptId`, `mode:
  "voice"`, and `agentLayer: "voice_realtime"` metadata.
- Extend the mock voice websocket test to prove auth/context/tool rows preserve
  the shared attempt id.
- Sync the architecture/design docs and workflow evidence.

