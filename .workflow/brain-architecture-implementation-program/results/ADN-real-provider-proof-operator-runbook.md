# Packet ADN Result: Real Provider Proof Operator Runbook

Status: runbook added; real provider proof still pending explicit approval.

## What Changed

- Added an operator-safe runbook for the last real-provider beta proof.
- Captured the exact safety gate for OpenRouter, Deepgram, microphone, provider
  traffic, active-book context, and local ledger recording.
- Converted the diagnostics contract into a requirement/evidence matrix so the
  final proof cannot be satisfied by seeded, fallback, stale, mixed, or
  cross-attempt rows.

## Verification

- This packet is documentation/workflow only.
- It was based on current Graphify routing through `ChatPanel`, `AdminView`,
  `beta.diagnostics`, `StudyView`, and `longterm.memory`.
- It uses the current diagnostics requirements for durable proof-attempt rows,
  durable provider-traffic approval rows, OpenRouter provider captures, Deepgram
  provider-ready rows, shared proof attempt IDs, multi-PDF context, book/thread
  scoping, and `local_live_ledger` receipt readiness.
- `node --test tests/beta-diagnostics.test.mjs`: passed, 32 tests. The new
  runbook contract test reads the ADN packet and checks the hard safety gate,
  evidence matrix, receipt schema, receipt fields, OpenRouter/Deepgram provider
  captures, and seeded/fallback/mock exclusions.
- `npm run test:node`: passed, 257 node tests.
- `npm run format:check`: passed.
- `npm run brain:postchange -- --reason study-chip-and-provider-runbook-current-state --full`:
  passed format check, lint/typecheck, production build, diff whitespace check,
  257 node tests, 585 rendered DOM tests, and graphify-out scratch scan after
  the Study PDF rail tightening.

## Remaining Requirement

The full brain-architecture goal remains incomplete until the operator approves
and completes the real OpenRouter typed-chat request plus real Deepgram
live-voice request under the same active proof attempt.
