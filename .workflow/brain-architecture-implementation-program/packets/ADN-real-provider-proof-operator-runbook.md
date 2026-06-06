# Packet ADN: Real Provider Proof Operator Runbook

## Purpose

Run the final local beta proof only after explicit operator approval. This packet
exists to prevent seeded, fallback, stale, or cross-attempt evidence from being
mistaken for the completed brain-architecture proof.

## Hard Safety Gate

Do not run the real proof from this packet unless the operator explicitly
approves all of the following in the current thread:

- use the real OpenRouter key for one typed-chat request;
- use the real Deepgram key for one live voice session;
- open the microphone for the live voice session;
- send the active book title, chat prompt, voice prompt, and relevant extracted
  multi-PDF context to those providers;
- record local proof-attempt and provider-capture rows in the browser/backend
  ledgers.

The no-provider phase 74 and phase 75 scripts remain safe preflights, but they
are not final proof.

## Required Runtime State

- Branch/worktree is intentionally dirty only with the current workflow/source
  implementation slice.
- `OPENROUTER_API_KEY` is present without printing its value.
- `DEEPGRAM_API_KEY` is present without printing its value.
- `ALLOW_SERVER_OPENROUTER_FALLBACK` is not used as the proof source unless the
  operator explicitly chooses server fallback.
- Local app is running from this checkout.
- Active Study book has at least two ready PDFs.
- Admin Beta Diagnostics shows one active proof attempt.
- Provider traffic approval is recorded as a durable
  `beta_provider_traffic_approved` memory-event row for that exact attempt.

## Preflight Commands

Run these before any real provider traffic:

```bash
node -e "import('dotenv').then(({config})=>{config(); console.log(JSON.stringify({openrouter:Boolean(process.env.OPENROUTER_API_KEY), deepgram:Boolean(process.env.DEEPGRAM_API_KEY), allowServerOpenRouterFallback:process.env.ALLOW_SERVER_OPENROUTER_FALLBACK || null}, null, 2));})"
npm run brain:postchange -- --reason final-provider-handoff-preflight --full
APP_URL=http://127.0.0.1:3001 node .workflow/brain-architecture-implementation-program/packets/phase74-live-proof-prompt-handoff-qa.mjs
APP_URL=http://127.0.0.1:3001 node .workflow/brain-architecture-implementation-program/packets/phase75-live-voice-script-handoff-qa.mjs
```

The phase 74/75 commands must stop with prompts loaded and must not click Send,
start voice, or open the microphone.

## Real Run Sequence

1. Start the app on the agreed local port.
2. Open Admin -> Beta Diagnostics.
3. Start a fresh proof attempt.
4. Approve provider traffic and wait until the durable approval row appears.
5. Load the typed-chat proof prompt.
6. Click Send once.
7. Wait for the OpenRouter answer, local model-run row, thread save, background
   memory rows, retrieval rows, tool rows, and evaluated mastery evidence.
8. Return to Admin -> Beta Diagnostics without starting a new proof attempt.
9. Load the live voice script.
10. Start voice once, accept the microphone prompt only after operator approval,
    and read or paste the queued voice script into the session.
11. Wait for the Deepgram provider-ready row, voice user/assistant turns, voice
    tool rows, visual-focus rows, thread save, background memory rows, and
    evaluated mastery evidence.
12. Export or screenshot Admin Beta Diagnostics while the same proof attempt is
    still active.

## Evidence Matrix

Final proof is complete only if all rows below refer to the same proof attempt,
same active book, same book-scoped thread, and at least two ready PDF document
IDs.

| Requirement | Authoritative Evidence |
| --- | --- |
| Fresh proof attempt | `beta_proof_attempt_started` memory event |
| Provider traffic approved | `beta_provider_traffic_approved` memory event |
| Typed chat sent through OpenRouter | completed `modelRuns` row with `source=chat_stream`, `provider=openrouter`, real model, request id, and proof attempt metadata |
| Live voice used Deepgram | completed voice system activity row titled `Voice provider ready`, plus voice request id and proof attempt metadata |
| Same proof attempt | provider captures include the active proof attempt id |
| Multi-PDF context | chat and voice `brain_context_injected` rows include at least two document IDs |
| Book/thread scoping | chat and voice `book_chat_thread_saved` rows share the active book/thread |
| Tool and retrieval coverage | completed request-correlated retrieval/tool rows for both layers where the prompt/script asks for them |
| Mastery evidence | verified non-`model_summary` evidence rows and mastery deltas linked to the request ids |
| Fresh local window | selected chat/voice proof rows fit the diagnostics freshness and proof-window limits |
| Not seeded | provider captures are `local_live_ledger`, not `local_qa_seed`, `synthetic`, `fallback`, or mock |

## Completion Check

After the real run, Admin Beta Diagnostics must show:

- Provider-key proof receipt schema `tutor.live-provider-proof-receipt.v1`;
- `sourceKind: local_live_ledger`;
- `sourceReadyForBeta: true`;
- `proofComplete: true`;
- `providerCaptureCount: 2`;
- selected request IDs for one chat request and one voice request;
- no warnings that the proof is seeded, synthetic, fallback, stale, mixed, or
  cross-attempt.

Only then can the full brain-architecture goal be considered ready for a final
completion audit.

