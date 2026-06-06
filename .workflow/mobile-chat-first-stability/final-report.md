# Final Report: Mobile chat first stability

## Outcome

- Mobile Study is now chat-first. The PDF reader stays attached as compact
  context until the learner intentionally opens it, and Ask Tutor returns from
  the mobile reader to the chat.
- Desktop retains the side-by-side PDF/chat workspace with compact, shadowless
  document chips.
- Provider readiness now uses public boolean-only `/api/health` data instead of
  the protected Admin ledger.
- Shared OpenRouter and Deepgram server keys both require explicit fallback
  flags. Deepgram query-string keys are ignored, voice requires an auth-first
  frame, and the server caps voice WebSocket payloads.
- Read Aloud now sends text in a POST body, aborts superseded requests, and
  revokes audio object URLs.

## Accepted Results

- Mobile Study worker: chat-first layout, attached PDF switching, View PDF, and
  return-to-chat behavior.
- Provider audit: explicit Deepgram sharing gate, public capability endpoint,
  keyless health response, query-key rejection, and voice handshake hardening.
- QA audit: mobile first-PDF attachment access, Ask Tutor return behavior,
  narrow-header clipping repair, and responsive browser matrix.
- Cleanup audit: TTS URL privacy fix, read-aloud cleanup, normal Send button
  activation, desktop PDF selected semantics, and official deprecation notes.

## Rejected Results

- No dependency versions were upgraded. `npm audit` found zero vulnerabilities;
  major compatibility upgrades remain separate work.
- No real provider traffic was sent and no actual `.env` secret values were
  read or changed.
- Shared provider fallback flags remain disabled because visitor-wide quota
  consumption still needs explicit billing approval and deployment controls.

## Conflicts Resolved

- Kept desktop PDF/chat behavior while changing only the mobile primary-surface
  composition.
- Preserved browser BYOK compatibility while making server fallback readiness
  explicit and secret-safe.
- Stabilized three existing ChatPanel stream/error tests that raced against
  asynchronous initialization in the full DOM suite.

## Verification Evidence

- `npm test`: 271 Node tests and 589 DOM tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run format:check`: passed.
- `npm run brain:postchange -- --reason mobile-chat-first-stability`: passed.
- `npm audit --json`: zero known vulnerabilities.
- Tracked-secret scan: zero tracked secret env files and zero matching provider
  key patterns.
- Live browser at `http://127.0.0.1:3100/`:
  - `320x568`: chat visible, PDF reader hidden, `View PDF` clear of Settings,
    no horizontal overflow, no console warnings/errors.
  - Mobile View PDF: reader visible, chat hidden, return-to-chat control
    present.
  - `1440x900`: PDF width 848.64px, chat width 495.36px, zero overlap, no
    horizontal overflow.
- Screenshots:
  - `.workflow/mobile-chat-first-stability/screenshots/mobile-chat-first-320x568.png`
  - `.workflow/mobile-chat-first-stability/screenshots/desktop-study-split-1440x900.png`

## Official Documentation Checked

- Vite environment variables:
  https://vite.dev/guide/env-and-mode.html
- OpenRouter API authentication and key protection:
  https://openrouter.ai/docs/api-keys
- Deepgram Voice Agent authentication:
  https://developers.deepgram.com/reference/voice-agent/voice-agent
- MDN deprecated `createScriptProcessor()` guidance:
  https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createScriptProcessor

## Remaining Risks

- Shared server keys still need application authentication, quotas, and rate
  limiting before an untrusted public deployment.
- Browser BYOK keys remain stored locally for compatibility.
- Live microphone capture still uses deprecated `createScriptProcessor()`; an
  AudioWorklet migration needs a dedicated browser/voice compatibility pass.
- Real OpenRouter/Deepgram proof remains unrun until provider-traffic approval.

## Reusable Follow-up

- Add authenticated short-lived voice session tickets plus per-user/IP quota
  and concurrency limits.
- Migrate microphone capture to `AudioWorkletNode`.
- Run the explicitly approved real-provider chat and voice beta proof.
