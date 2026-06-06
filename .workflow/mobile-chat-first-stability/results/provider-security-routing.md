# Provider Security Routing Audit

Date: 2026-06-07
Mode: read-only source audit; no `.env` values read; no provider traffic sent

## Scope And Graph Route

Graphify routed this packet through:

- `ChatPanel()` -> `ChatPanel.tsx` -> `voiceAgentTools.ts` <- `server.ts` -> `createTutorServerApp()`
- `SettingsModal.tsx` -> `index.ts` -> runtime settings <- `server.ts`
- `system-activity.test.mjs` -> `startApp()` -> `createTutorServerApp()` <- `server.ts`
- Direct provider tests: `tests/system-activity.test.mjs`, `tests/tts-provider-routing.test.mjs`, and `tests/voice-proof-attempt-latch.test.mjs`

Only `server.ts`, `src/components/ChatPanel.tsx`,
`src/components/SettingsModal.tsx`, and the Graphify-connected provider tests
were inspected.

Working-tree note: `src/components/ChatPanel.tsx` and
`tests/system-activity.test.mjs` already had concurrent uncommitted edits. The
current `ChatPanel` now polls public `/api/health` for provider readiness. That
change was not made by this packet.

## Decision

Server environment keys are not returned to the browser today, and the public
health response exposes only booleans. The current server-key path can therefore
serve a keyless browser without directly disclosing provider secrets.

It is not yet a safe shared-deployment contract. A configured Deepgram key is
automatically usable by unauthenticated HTTP and WebSocket clients, OpenRouter
shared fallback is usable by any caller once its flag is enabled, and live voice
accepts unauthenticated upgrades with no origin check, auth deadline, quota, or
concurrency guard.

## Current Fallback Behavior

### OpenRouter

- `getOpenRouterServerFallbackKey()` returns `OPENROUTER_API_KEY` only when
  `ALLOW_SERVER_OPENROUTER_FALLBACK` is truthy (`server.ts:226-233`).
- A browser `Authorization: Bearer ...` key takes precedence. The server fallback
  is used only when the bearer key is absent; it is not retried after an invalid
  browser key fails at OpenRouter.
- `/api/chat` and the other OpenRouter-backed HTTP routes use the resolver and
  therefore support keyless browsers when the fallback flag is enabled
  (`server.ts:1967-2141`).
- `/api/health` safely reports only whether the opt-in fallback is ready
  (`server.ts:799-810`). The existing health test asserts that sentinel secrets
  are absent from the response (`tests/system-activity.test.mjs:102-141`).
- Live voice requires an OpenRouter key or enabled fallback
  (`server.ts:3430-3443`), but that key is never used after the presence check.
  The only remaining server references are the gate and the parsed
  `voice_auth.openRouterKey` field. Deepgram's settings payload does not contain
  the OpenRouter key (`server.ts:3574-3612`).

### Deepgram

- Read-aloud TTS resolves in this order: `x-deepgram-key`, `x-voice-key`,
  `deepgramKey` query parameter, then `DEEPGRAM_API_KEY`
  (`server.ts:298-306`, `server.ts:1686-1704`).
- Live voice resolves in this order: `voice_auth.deepgramKey`, then
  `DEEPGRAM_API_KEY` (`server.ts:3446-3459`, `server.ts:3902-3925`).
- Unlike OpenRouter, Deepgram server fallback has no explicit sharing flag.
  Merely configuring `DEEPGRAM_API_KEY` makes it available to visitors.
- `/api/health` reports Deepgram readiness from environment-key presence, without
  returning the key (`server.ts:799-810`).

### Browser Routing

- The current working tree polls `/api/health`, so keyless browsers can discover
  server fallback readiness (`ChatPanel.tsx:3692-3715`). This is the correct
  public capability endpoint; the prior protected debug-endpoint polling would
  fail for deployed visitors.
- Normal chat omits `Authorization` when no browser OpenRouter key exists, which
  allows server fallback (`ChatPanel.tsx:6196-6202`).
- Read-aloud omits `x-deepgram-key` when no browser Deepgram key exists, which
  allows server fallback (`ChatPanel.tsx:6011-6025`).
- Live voice always includes `openRouterKey` and `deepgramKey` fields in the
  initial `voice_auth` frame, even when empty (`ChatPanel.tsx:5571-5588`).
- Live voice is Node-server-only. `attachWebSockets()` owns the upgrade route;
  Vercel function handlers do not attach it (`server.ts:3204-3232`,
  `server.ts:4078-4088`). The client only blocks `.vercel.app`, so a custom
  Vercel domain can still attempt and fail the websocket
  (`ChatPanel.tsx:5286-5290`).

## Findings

### P0: Shared fallback is an unauthenticated provider-spend surface

- `/api/chat`, `/api/tts`, and `/api/voice-agent` have no visitor authentication,
  rate limit, quota, or concurrency cap in the inspected routing.
- The voice websocket upgrade accepts every request to `/api/voice-agent`
  without checking `Origin` or a session credential (`server.ts:3210-3219`).
- A first non-`voice_auth` message automatically calls
  `startVoiceSession("", language)`. With server fallbacks present, even a binary
  first frame can start provider use (`server.ts:3902-4003`).
- Therefore, secrets remain server-side, but any network caller can spend the
  shared credentials. Deepgram sharing is especially easy to enable
  accidentally because it has no opt-in flag.

### P1: Browser BYOK remains exposed to browser storage and transport

- Settings explicitly stores OpenRouter and Deepgram BYOK values in browser
  `localStorage` (`SettingsModal.tsx:1025-1031`,
  `SettingsModal.tsx:1070-1074`). These values are available to same-origin XSS,
  extensions, DevTools, and anyone with browser-profile access.
- Flashcard generation re-reads legacy OpenRouter keys directly from
  `localStorage`, which can revive stale credentials after state is cleared
  (`ChatPanel.tsx:3274-3287`).
- OpenRouter validation sends the key directly from the browser to OpenRouter and
  sends `window.location.href` as `HTTP-Referer`
  (`SettingsModal.tsx:743-754`).
- Live voice sends both provider keys in a browser-visible websocket frame
  (`ChatPanel.tsx:5575-5588`). The OpenRouter key is unnecessary because the
  server only uses it as a presence gate.

### P1: Deepgram accepts a credential in the URL

`deepgramKeyFromRequest()` accepts `?deepgramKey=...` (`server.ts:298-306`).
The local request logger redacts it, but browser history, reverse proxies,
platform logs, and other infrastructure may record the URL before that
redaction. Header-only BYOK is safer.

### P1: Voice websocket lacks protocol hardening

- No `Origin` allowlist, app/session auth, auth-frame timeout, frame-size limit,
  connection limit, or pre-auth buffer limit was found.
- Non-auth first frames start a fallback session rather than being rejected.
- The browser's `ws:`/`wss:` selection is correct, but transport encryption alone
  does not authorize shared-key use (`ChatPanel.tsx:789-796`).

### P2: Capability and UI guards are incomplete

- The current `/api/health` readiness polling is correct but has no client-wiring
  regression test.
- `hasDeepgramRuntimeKey` is displayed in the proof HUD but is not checked before
  `startVoice`; only OpenRouter readiness is checked
  (`ChatPanel.tsx:5275-5291`, `ChatPanel.tsx:7420-7431`).
- The OpenRouter voice guard is misleading because OpenRouter is not used by the
  current Deepgram Voice Agent settings.
- Health does not report whether websocket voice is available, so the client
  relies on the incomplete `.vercel.app` hostname heuristic.

### P2: Logs include more provider-session data than needed

The Deepgram settings log does not contain provider keys, but it serializes the
full settings payload, including the voice prompt and attached local study
context (`server.ts:3568-3611`). Unexpected-response headers and bodies are also
logged (`server.ts:3637-3668`). These are privacy/log-retention risks even though
they are not direct key disclosure.

### P2: Provider-routing coverage is thin

- `tests/system-activity.test.mjs` covers public health booleans/no-secret
  response and a mock voice loop.
- `tests/tts-provider-routing.test.mjs` covers MisoTTS, not Deepgram key
  precedence or query-key rejection.
- `tests/voice-proof-attempt-latch.test.mjs` is source-pattern coverage for proof
  IDs, not websocket security.
- No inspected test covers shared-fallback authorization, Deepgram opt-in,
  websocket origin/auth rejection, first-frame rejection, auth timeout, or
  browser omission of provider keys.

## Exact Safe Change Contract

1. Add `ALLOW_SERVER_DEEPGRAM_FALLBACK` and
   `getDeepgramServerFallbackKey()`. Use the helper consistently in `/api/tts`,
   live voice, debug meters, and `/api/health`. Environment-key presence alone
   must not enable visitor sharing.
2. Keep `/api/health` as the public capability endpoint. Report booleans only,
   based on enabled fallback helpers, plus a `voiceWebSocket` capability derived
   from the runtime. Preserve the current `ChatPanel` health polling.
3. Remove `request.query?.deepgramKey`. Accept optional admin BYOK only through a
   header or authenticated server-side credential store. Prefer changing
   `/api/tts` to `POST` JSON so read-aloud text is not placed in URLs/logs.
4. Remove `openRouterKey` from the live-voice browser payload and
   `startVoiceSession()` signature, and remove the OpenRouter live-voice gate.
   The current Deepgram settings do not consume it. Do not add it to the
   Deepgram settings payload.
5. Require a valid first `voice_auth` frame. Reject binary/non-auth first frames
   with close code `1008`; add a short auth deadline and frame/payload size
   limits; do not buffer pre-auth audio.
6. Before allowing shared server keys, add app-level authorization or an explicit
   public-usage policy with per-user/IP quotas, global concurrency caps, and
   request-size/cost limits across chat, TTS, and voice. For websocket voice,
   validate an allowed `Origin` and require a short-lived, single-use,
   same-origin session ticket. Origin checks alone are not authentication.
7. Keep public/user mode keyless. Treat browser BYOK as an admin-only override;
   prefer session-only memory over `localStorage`. Remove the flashcard
   `localStorage` fallback and validate optional BYOK through a same-origin
   backend route instead of direct browser-to-OpenRouter traffic.
8. Replace full Deepgram settings/header/body logs with structured metadata that
   excludes prompts, study context, headers, response bodies, and credentials.

## Exact Offline Test Changes

No test should send provider traffic.

- Extend `tests/system-activity.test.mjs` with a readiness matrix:
  OpenRouter key with flag off/on, Deepgram key with flag off/on, and
  `voiceWebSocket` Node/Vercel capability. Assert sentinel secrets never appear.
- Add a client source-contract test that `ChatPanel` reads `/api/health`, never
  reads provider readiness from `/api/debug/system-activity`, and omits
  `openRouterKey`/`deepgramKey` from server-fallback voice auth.
- Extend the mock websocket tests to assert rejection of wrong origin, missing
  or invalid session ticket, non-auth first frame, binary first frame, oversized
  auth payload, and auth timeout. Assert no provider-start activity is recorded.
- Add a Deepgram routing test that `?deepgramKey=sentinel` is ignored/rejected
  and no outbound fetch occurs. Use a throwing local `globalThis.fetch` stub or
  injected provider adapter.
- Add pure resolver tests for browser-key precedence and explicit server-fallback
  flags. Export pure credential-resolution helpers or inject provider adapters
  through `createTutorServerApp` so all cases remain offline.
- Add a regression test that live voice no longer requires or transports an
  OpenRouter key.
- Add route-policy tests for unauthorized, quota-exhausted, and
  concurrency-exhausted shared-fallback requests.

## Verification Performed

- Graphify CLI traversal and shortest paths.
- Targeted source/test inspection only.
- Confirmed current targeted worktree changes before writing.
- No application files or `graphify-out` artifacts edited.
- No `.env` values read.
- No provider traffic or provider-backed tests run.
