# Packet ADM Result: Final Provider-Proof Readiness

Status: local preflight fixed and verified; real provider proof still pending
explicit operator run.

## Baseline Finding

The application proof gate is stricter than the older phase 74/75 handoff QA
scripts. A fresh proof attempt now requires an attempt-scoped local provider
traffic approval plus a durable `beta_provider_traffic_approved` memory-event
row before either exact proof prompt can be loaded.

The previous scripts started an attempt and immediately clicked the prompt
handoff button. On the current app the button correctly remained disabled, so
the phase 75 baseline timed out without calling OpenRouter, Deepgram, or the
microphone.

## Integration

- Phase 74 now starts a proof attempt, approves provider traffic locally, waits
  for the durable approval event, then loads the typed-chat prompt without
  sending it.
- Phase 75 follows the same approval-aware preflight before loading the voice
  script, and still stops before Send or microphone activation.
- Both scripts assert the ChatPanel proof HUD shows provider traffic approved.
- ChatPanel and Admin now treat `openRouterByok` as BYOK capability only. It no
  longer counts as a configured OpenRouter runtime/server key for provider-proof
  readiness.
- The User Brain Architecture book now separates artifact schema coverage from
  the narrower current local verifier support, and the stored audio transcript no
  longer claims native browser controls.

## Safety Boundary

These checks write only local browser/Dexie proof-attempt state. They do not
submit the chat prompt, open the microphone, connect the voice websocket, or
send provider traffic.

## Verification

- `npm run brain:postchange -- --reason final-provider-handoff-preflight --full`:
  passed format, lint/typecheck, production build, whitespace check, 256 node
  tests, 585 rendered DOM tests, and graphify-out scratch scan.
- `APP_URL=http://127.0.0.1:3001 node .workflow/brain-architecture-implementation-program/packets/phase74-live-proof-prompt-handoff-qa.mjs`:
  passed desktop and mobile in dummy browser-key mode. The script verified a
  fresh attempt, durable provider-traffic approval, two ready PDFs, prompt
  loaded, focused textarea, no overflow, and zero warning/error console logs
  without sending the prompt.
- `APP_URL=http://127.0.0.1:3001 node .workflow/brain-architecture-implementation-program/packets/phase75-live-voice-script-handoff-qa.mjs`:
  passed desktop and mobile in dummy browser-key mode. The script verified a
  fresh attempt, durable provider-traffic approval, two ready PDFs, voice script
  loaded, the "start voice first" guard, focused textarea, no overflow, and zero
  warning/error console logs without starting voice.
- `.env` readiness check confirmed `OPENROUTER_API_KEY` and `DEEPGRAM_API_KEY`
  are present without printing key values; `ALLOW_SERVER_OPENROUTER_FALLBACK` is
  not set.
- `node --test tests/book-readiness-contract.test.mjs`: passed, 6 tests.
- `npm run test:dom -- tests/rendered-admin-view-flows.test.tsx tests/rendered-chatpanel-expanded.test.tsx tests/rendered-study-view-flows.test.tsx`:
  passed, 72 rendered tests.
- `npm run brain:postchange -- --reason architecture-doc-provider-boundary-pdf-rail --full`:
  passed format, lint/typecheck, production build, full node tests, full DOM
  tests, whitespace check, and graphify-out scratch scan.
- The full postchange run passed 256 node tests and 585 rendered DOM tests.
- Live browser smoke at `http://localhost:3100/` passed on Revision desktop
  1280px and mobile 390px with zero warning/error console logs, visible User
  Brain Architecture copy, and no horizontal overflow.
- The focused rendered tests cover the BYOK-only OpenRouter boundary in Admin and
  ChatPanel, plus the compact Study PDF rail.

## Remaining Requirement

The final beta-proof requirement is still not completed by these checks. It
requires an explicitly approved real OpenRouter typed-chat run and real Deepgram
live-voice run tied to the same proof attempt, book, thread, multi-PDF context,
approval row, and fresh local ledger window.
