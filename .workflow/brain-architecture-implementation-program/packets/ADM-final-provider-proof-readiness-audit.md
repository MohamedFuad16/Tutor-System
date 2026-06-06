# Packet ADM: Final Provider-Proof Readiness Audit

## Objective

Audit the current checkout against the one remaining local beta requirement:
one deliberate proof attempt that links a real OpenRouter typed-chat request and
a real Deepgram live-voice request to the same active book, multi-PDF context,
book-scoped thread, durable approval row, and fresh local ledger window.

## Context

- The implementation program is conservatively recorded at 98%.
- Server-side `OPENROUTER_API_KEY` and `DEEPGRAM_API_KEY` are present.
- `pendingVoiceProofScriptRef` already queues and flushes the voice script after
  voice websocket authentication.
- Diagnostics intentionally reject seeded, mock, fallback, stale, scattered,
  or cross-attempt evidence.
- AWS/cloud work remains deferred.

## Ownership

- Independent implementation-thread auditor: read-only current-state audit.
- Main thread: workflow integration, local fixes, verification, and Git.

## Do

- Use repo-local Graphify before source inspection.
- Inspect only the directly connected proof surfaces:
  `ChatPanel.tsx`, `AdminView.tsx`, `beta.diagnostics.ts`, `server.ts`, store
  proof state, focused tests, and existing proof QA scripts.
- Produce a requirement-by-requirement matrix with authoritative evidence.
- Identify any blocker that can prevent a real approved run despite both server
  keys being present.
- Recommend the smallest local-only fix if a blocker exists.

## Do Not

- Do not call OpenRouter or Deepgram.
- Do not start the microphone.
- Do not edit source or workflow files.
- Do not touch AWS/cloud code.
- Do not treat seeded or fallback rows as final proof.

## Expected Output

- Current proven requirements.
- Missing or weak evidence.
- Any deterministic local blocker.
- Exact safe preflight sequence up to, but not including, provider traffic.
- A completion recommendation: ready for explicit provider-run approval, or
  local fix required first.
