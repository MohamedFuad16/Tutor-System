# Dependency cleanup audit

## Scope and method

- Read-only audit of the Graphify-connected Study/chat/provider surface:
  `src/views/StudyView.tsx`, `src/components/ChatPanel.tsx`,
  `src/components/PdfViewer.tsx`, `server.ts`, directly relevant tests, and
  package/config metadata.
- Graphify was used before source inspection. No application files,
  lockfiles, or `graphify-out` artifacts were edited.
- No secrets were read and no live provider traffic was sent.
- The current worktree is being changed concurrently. In particular,
  `ChatPanel` already changed its provider readiness request from
  `/api/debug/system-activity` to `/api/health` during this audit, so that
  resolved issue is intentionally not reported below.

## Findings

### P1 - TTS text is placed in a GET URL and copied into server request logs

**Evidence**

- `src/components/ChatPanel.tsx:6016-6023` sends up to 1,503 characters of tutor
  output in `/api/tts?text=...`.
- `server.ts:644-652` logs request method and URL. `server.ts:268-272` redacts
  key-like query parameters, but not `text`.
- `server.ts:1572-1577` defines TTS as a GET route that reads `req.query.text`.
- `tests/tts-provider-routing.test.mjs:88-92` and
  `tests/rendered-chatpanel-expanded.test.tsx:1033-1037` lock in the query-string
  contract.

**Impact**

Tutor output, including material derived from private PDFs or selected text,
is written into local console/debug request history and can be retained by
intermediaries that log URLs. Percent-encoded Unicode can also expand enough
to hit URL-length limits even though the pre-encoded text is capped.

**Action**

Safe local API-contract fix: change TTS to `POST /api/tts` with JSON
`{ text, voice }`, keep keys in headers/server configuration, and update the
route/client tests. Do not log the request body.

### P1 - Read-aloud stop cannot cancel a pending request and audio cleanup leaks

**Evidence**

- `src/components/ChatPanel.tsx:5970-5981` treats a second click as stop, but it
  only pauses `window.currentAudio`; that global is not assigned until after
  the TTS fetch and blob conversion at `6045-6050`.
- The pending fetch has no `AbortController` or request identity
  (`6016-6023`), so a stopped or superseded request can later create and play
  audio at `6045-6066`.
- Stop and unmount clear the global without revoking its blob URL
  (`5974-5978`, `4257-4265`), and the catch path at `6067-6070` also lacks
  centralized URL cleanup.
- The rendered test uses an immediately resolving `AudioStub` and checks only
  the happy-path state transition
  (`tests/rendered-chatpanel-expanded.test.tsx:233-243,1025-1041`).

**Impact**

Pressing Stop while TTS is loading can still result in later playback.
Switching messages quickly can create overlapping playback. Repeated stop,
unmount, or `play()` rejection paths can retain blob URLs.

**Action**

Safe local code fix: replace `window.currentAudio` and `@ts-ignore` with typed
audio/request refs, abort or invalidate superseded requests, and centralize
pause, handler removal, and object-URL revocation. Add delayed-fetch,
superseded-request, play-rejection, and unmount cleanup tests.

### P2 - The visible Send button is not keyboard-activatable

**Evidence**

- `src/components/ChatPanel.tsx:7787-7798` gives the Send button an accessible
  name but wires submission only to `onPointerDown`; it has no `onClick` or
  keyboard handler.
- `tests/rendered-chatpanel-expanded.test.tsx:457-473` checks only that the
  button exists, and `1044-1054` activates it with `fireEvent.pointerDown`.
- `tests/app-shell-components.test.mjs:125-130` searches the entire ChatPanel
  source for an Enter handler, which can pass because the textarea handles
  Enter even while the button itself remains inoperable.

**Impact**

A keyboard or switch-device user can focus the Send button and press Enter or
Space without sending the message.

**Action**

Safe local accessibility fix: use the button's `onClick` activation contract
and preserve the pointer animation separately. Add Enter and Space activation
tests for the button and a visible `focus-visible` treatment.

### P2 - Removing an in-flight PDF does not stop extraction or provider OCR

**Evidence**

- `src/views/StudyView.tsx:912-932` starts `/api/documents/ingest` without an
  abort signal. Cancellation is only a Set checked after the response.
- `src/views/StudyView.tsx:1046-1050` marks a removed document cancelled, but
  cannot terminate the request.
- `server.ts:925-930` starts a Python extraction process with a 120-second
  timeout. For scanned/mixed PDFs, `server.ts:958-999` may then perform one
  OpenRouter vision request per rendered image.
- Existing Study tests assert the cancellation Set/check exists, but do not
  prove request or subprocess cancellation
  (`tests/study-view-upload.test.mjs:42-49`,
  `tests/study-chat-handoff.test.mjs:46-51`).

**Impact**

Deleting a processing document removes it locally but can leave CPU-heavy
extraction and billable provider OCR running in the background.

**Action**

Safe cross-boundary code fix: track an `AbortController` per document and abort
it on removal/unmount. On the server, listen for request close/abort, terminate
the child process, and stop before entering or continuing the vision loop.
Add a cancellation test that proves no post-abort provider call occurs.

### P2 - Live voice capture relies on deprecated `ScriptProcessorNode`

**Evidence**

- `src/components/ChatPanel.tsx:3773` stores a `ScriptProcessorNode`.
- `src/components/ChatPanel.tsx:5398-5512` calls
  `audioContext.createScriptProcessor(4096, 1, 1)` and performs PCM conversion
  and volume analysis in `onaudioprocess`.
- MDN marks `createScriptProcessor()` and `ScriptProcessorNode` deprecated and
  replaced by `AudioWorklet` / `AudioWorkletNode`:
  <https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createScriptProcessor>

**Impact**

The voice path depends on an API that may cease working and runs recurring
audio-buffer work in the page's event-handler path, where UI work can compete
with capture.

**Action**

Code migration, not a dependency upgrade: move PCM conversion/level sampling
to an `AudioWorkletProcessor`, retaining a deliberately tested compatibility
fallback if required. This is higher risk than the safe fixes above and should
receive focused browser/voice regression coverage before integration.

### P3 - Desktop PDF selection state and keyboard focus are only visual

**Evidence**

- The desktop PDF toolbar is named at `src/views/StudyView.tsx:1163-1167`, but
  each document selector at `1180-1200` exposes no `aria-pressed` or equivalent
  selected state; the active document is represented only by classes.
- Document, remove, add, and return controls remove the default outline without
  a replacement (`1183`, `1206`, `1218`, `1225`).
- The current mobile attached-PDF switcher does use `aria-pressed`, so the
  desktop toolbar is inconsistent with the newer mobile contract.
- `tests/rendered-study-view-flows.test.tsx:400-433` checks toolbar classes, not
  active-state semantics or keyboard focus.

**Impact**

Screen-reader users are not told which desktop PDF is active, and keyboard
users can lose track of focus in the document toolbar.

**Action**

Safe local accessibility fix: add `aria-pressed` to document selectors and
visible `focus-visible` styles to every toolbar control. Add semantic and
keyboard-focus assertions.

### P3 - Production dependency metadata contains build-only and duplicate entries

**Evidence**

- `package.json:30-33,52` lists `@tailwindcss/typography`,
  `@tailwindcss/vite`, `@types/compression`, `@vitejs/plugin-react`, and `vite`
  as production dependencies.
- `@tailwindcss/vite`, `@vitejs/plugin-react`, and `vite` are used by
  `vite.config.ts:1-4` / `vitest.config.ts:1-3`; typography is a build-time CSS
  plugin at `src/index.css:6`; `@types/compression` is type-only.
- `vite` is also duplicated in `devDependencies` at `package.json:73`.
- `autoprefixer` is declared at `package.json:66`, but the targeted package,
  Vite/Vitest, and root CSS inspection found no configuration or source
  reference.

**Impact**

Production-only installs carry avoidable build/type tooling, and the duplicate
Vite declaration makes dependency ownership ambiguous.

**Action**

Safe metadata cleanup without version changes: move the build/type packages to
`devDependencies`, remove the duplicate production Vite entry, and verify
whether `autoprefixer` can be removed. Regenerate the lockfile and prove with
`npm run lint` and `npm run build`.

## Dependency upgrades requiring approval

Per workflow policy, do not apply dependency upgrades without approval.

`npm audit --json` and `npm audit --omit=dev --json` reported **0 known
vulnerabilities**, so there is no audit-driven emergency upgrade.

`npm outdated --json` reported:

- Same-major updates: `@testing-library/react 16.3.0 -> 16.3.2`,
  `@types/node 22.19.19 -> 22.19.20`, `dexie 4.4.2 -> 4.4.3`,
  `openai 6.39.0 -> 6.42.0`, `react/react-dom 19.2.6 -> 19.2.7`,
  `shiki 4.1.0 -> 4.2.0`, `vite 6.4.2 -> 6.4.3`, and
  `zustand 5.0.13 -> 5.0.14`.
- Major-version review required: `@google/genai 1.52.0 -> 2.8.0`,
  `@types/express 4.17.25 -> 5.0.6`, `@vitejs/plugin-react 5.2.0 -> 6.0.2`,
  `esbuild 0.25.12 -> 0.28.0`, `express 4.22.2 -> 5.2.1`,
  `jsdom 24.1.3 -> 29.1.1`, `lucide-react 0.546.0 -> 1.17.0`,
  `typescript 5.8.3 -> 6.0.3`, and `vite 6.4.2 -> 8.0.16`.

The major upgrades should be handled as separate compatibility packets,
especially Express/types, Vite/plugin-react/esbuild, TypeScript, Google GenAI,
and jsdom. Patch/minor updates still require the explicit workflow approval.

## Verification and limits

- Ran Graphify CLI queries against `graphify-out/graph.json`.
- Ran `npm ls --depth=0 --json`, `npm outdated --json`,
  `npm audit --json`, and `npm audit --omit=dev --json`.
- Inspected directly relevant source and tests only.
- Did not run live provider calls, browser flows, lint, build, or test suites in
  this read-only packet.
