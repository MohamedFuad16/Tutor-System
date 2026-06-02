# Packet PP: offline voice tool-loop harness

## Lane

Runtime voice observability and local verification.

## Scope

- `server.ts`
- `tests/system-activity.test.mjs`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` through explicit Graphify regeneration

## Objective

Add a local-only voice websocket harness that proves the real
`/api/voice-agent` proxy can emit voice tool requests, receive
`FunctionCallResponse` messages, and record the loop in the system activity
ledger without contacting Deepgram or any cloud provider.

## Boundaries

- Do not change the production Deepgram provider path except to share logging
  helpers with the mock harness.
- Do not require provider keys in the harness.
- Do not implement AWS/cloud synchronization.
- Do not manually edit generated Graphify artifacts.
