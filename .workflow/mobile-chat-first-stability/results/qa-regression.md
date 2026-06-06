# QA regression audit

## Scope and method

Read-only audit of Graphify-routed Study, PDF, chat/voice, provider-routing, and
test surfaces. Application source, tests, and `graphify-out` were not edited.
The only write is this result note.

Graphify routed the audit through:

- `StudyView` -> `PdfViewer`, `ChatPanel`, store, and memory
- `ChatPanel` -> `voiceAgentTools` -> `server.ts`
- provider-routing tests -> `createTutorServerApp`

Concurrent mobile/provider lane changes were treated as in-flight source and
audited without reverting them.

## Existing coverage that is worth preserving

- Current in-flight rendered Study tests cover mobile chat-first opening and
  attached-PDF switching/view/return behavior:
  `tests/rendered-study-view-flows.test.tsx:268-324`.
- Existing Study/PDF tests cover multi-PDF upload, active-document deletion,
  page clamping, annotation scoping, selected-text handoff, and desktop
  close/reopen behavior.
- Existing ChatPanel tests cover selected PDF context, streamed chat, tools,
  read-aloud, proof-state rendering, and request payload context.
- Existing Node tests separate mock voice loops from proof diagnostics.
  `tests/system-activity.test.mjs` uses the local mock provider, while
  `tests/beta-diagnostics.test.mjs` rejects mock/fallback rows as real proof.
- The new public-health test verifies provider-ready booleans without returning
  the configured key values: `tests/system-activity.test.mjs:102-145`.
- DOM tests run serially through `vitest.config.ts` because Zustand, Dexie,
  localStorage, and browser stubs are shared.

## Findings

### Critical: Deepgram server-key traffic is not opt-in gated

`server.ts:1688-1690` lets unauthenticated `/api/tts` requests use
`process.env.DEEPGRAM_API_KEY`. Live voice similarly falls back to the server
Deepgram key at `server.ts:3446-3448`. There is no Deepgram equivalent of
`ALLOW_SERVER_OPENROUTER_FALLBACK`, so a reachable deployment can consume the
owner's Deepgram quota without a billing-approval gate.

No current test asserts that an environment Deepgram key remains unusable to
shared visitors by default.

### Critical: browser provider-key paths conflict with the workflow contract

The current client still stores OpenRouter and Deepgram keys in localStorage
(`src/store/index.ts:432-445`), explains that behavior in Settings
(`src/components/SettingsModal.tsx:1012-1074`), sends keys in WebSocket auth
(`src/components/ChatPanel.tsx:5584-5585`), sends Deepgram through an HTTP
header (`src/components/ChatPanel.tsx:6011-6014`), and sends OpenRouter as a
bearer token (`src/components/ChatPanel.tsx:6196-6201`).

Existing rendered Settings tests currently reinforce this old contract by
saving browser provider keys. Those assertions must be replaced when the
server-side-only contract is integrated.

### High: empty mobile chat-first Study has no PDF attach action

The mobile document/intro surface is hidden whenever chat is open
(`src/views/StudyView.tsx:1076-1082`), and mobile Study opens chat by default.
`ChatPanel` contains no PDF file input or attach action.

Live proof at `320x568`, `360x800`, `390x844`, and `767x844` showed zero visible
file inputs and zero `Add PDF` buttons. A new mobile learner therefore cannot
attach the first PDF without leaving the chat-first surface through an
unavailable control.

The new mobile empty-state test asserts full-height chat but does not assert
that PDF attachment remains reachable.

### High: Ask Tutor does not return from mobile PDF view to chat

When mobile PDF view is open, `isMobilePdfOpen` hides the chat surface. The
Ask Tutor effect only calls `setIsChatOpen(true)` at
`src/views/StudyView.tsx:1133-1137`; chat is already logically open, so the
hidden mobile chat does not reappear.

Add a mobile PDF-selection -> Ask Tutor regression test that asserts the chat
surface becomes visible, the document surface hides, and the selected text is
loaded into the textarea.

### High: narrow mobile header controls are clipped

At `320x568`, root horizontal overflow remained clipped at `320px`, but the
visible `Close tutor chat` button occupied `x=329..357`, entirely outside the
viewport. A neighboring header button also extended to `321px`.

At `360x800` and wider, the essential controls fit. This is clipping, not
document-level horizontal scrolling, so a simple `scrollWidth === innerWidth`
assertion will miss it.

### Medium: visible mobile close control is a no-op without a PDF

`closeChat()` returns without changing state on mobile when no PDF exists
(`src/views/StudyView.tsx:1094-1099`). Live clicking the visible
`Close tutor chat` button left chat visible and the document surface hidden.
Hide/disable the control or give it a meaningful mobile action, then test it.

### Medium: desktop split geometry and breakpoint transitions lack contracts

Live `1440x900` proof showed the in-flight layout remains side by side:
document width `849px`, chat width `495px`, with no horizontal overflow.
At `768x844`, the layout intentionally becomes internally scrollable
(`clientHeight=844`, `scrollHeight=968`).

Current rendered tests assert class tokens and element presence, but do not
protect desktop side-by-side geometry, the exact `767/768` transition, or draft
and chat-state preservation across responsive toggles.

### Medium: performance and console stability are manual-only

Targeted test inspection found no performance budgets, long-task checks,
layout-shift checks, or automated browser console gate for Study/PDF/Chat.
The current live no-PDF viewport pass produced no warnings or errors, but this
is not protected against regression.

## High-value automated tests

### Study responsive and attached-PDF tests

1. **Mobile empty state retains attachment access**
   - Render at mobile matchMedia with no documents.
   - Assert chat is primary and a visible `Attach PDF` action opens a multiple
     `application/pdf` input.

2. **Mobile Ask Tutor returns from PDF to chat**
   - Seed a PDF, open `View PDF`, trigger selected-text Ask Tutor.
   - Assert chat is visible, PDF is hidden, textarea contains the handoff, and
     active document metadata remains unchanged.

3. **Mobile close control has meaningful behavior**
   - With no PDF, assert the close control is absent or performs a defined
     action.
   - With a PDF, assert close switches to PDF and `Return to tutor chat`
     restores chat.

4. **Attached context preserves chat state**
   - Enter an unsent draft, view PDF, return to chat, and switch attached PDFs.
   - Assert draft/messages survive and selected context is correctly scoped.

5. **Breakpoint contract**
   - Drive a controllable matchMedia harness across `767px` and `768px`.
   - Assert mobile has one primary surface, desktop/tablet keeps intended
     stacked/split behavior, and listeners are removed on unmount.

6. **Long-title and many-document overflow**
   - Seed long PDF names and enough chips to overflow.
   - Assert controls remain inside the viewport and chip rows scroll without
     growing document width.

### Provider-key security tests

1. **Fallback denied by default**
   - Set fake `OPENROUTER_API_KEY` and `DEEPGRAM_API_KEY` environment values,
     leave fallback/approval flags disabled, stub provider fetches.
   - Assert unauthenticated chat, TTS, and voice cannot call providers.

2. **Explicit server fallback uses keys without exposure**
   - Enable the approved server fallback with fake keys and stub providers.
   - Assert the server sends the key upstream, but responses, SSE, WebSocket
     events, logs, activity rows, and errors never contain it.

3. **No browser provider-key persistence or transport**
   - Assert provider key localStorage entries are removed/migrated.
   - Assert ChatPanel requests and voice-auth payloads contain no OpenRouter or
     Deepgram key fields/headers.
   - Assert Settings no longer renders browser provider-key inputs.

4. **Reject leak-prone key channels**
   - Assert Deepgram/OpenRouter keys in query parameters and browser headers are
     rejected once server-side-only routing is adopted.

5. **Client bundle and artifact secret scan**
   - Build, then scan tracked files, `dist`, screenshots, workflow artifacts,
     and test fixtures for real provider-key patterns.
   - Allow documented empty placeholders only.

6. **Public health remains boolean-only**
   - Preserve the current health-response no-secret assertion.
   - Add the missing case: environment key present but fallback disabled must
     report shared OpenRouter readiness as false.

### Chat, voice, performance, and console tests

1. Assert `/api/health` polling creates one interval, cleans up on unmount, and
   does not duplicate during mobile PDF/chat toggles.
2. Assert mobile PDF/chat toggles do not recreate document blob URLs or lose
   active chat streaming state.
3. Add browser console fail-on-unexpected-warning/error checks. Allow the
   intentional microphone-denial warning only in that specific test.
4. Test microphone denial recovery, voice WebSocket failure recovery, and
   stop/restart behavior without provider traffic.
5. Add measured browser budgets for initial mobile chat interactivity, PDF/chat
   toggle latency, long-chat scrolling, and layout shift at breakpoint changes.

## Live-browser regression matrix

Run on a clean isolated browser profile with provider traffic disabled:

| Viewport   | Required checks                                                                          |
| ---------- | ---------------------------------------------------------------------------------------- |
| `320x568`  | No clipped header/input controls; no horizontal overflow; chat usable with keyboard open |
| `360x800`  | Chat primary; attach action reachable; composer/voice/send visible                       |
| `390x844`  | Chat primary; attached-PDF card visible; no document-level overflow                      |
| `430x932`  | Long PDF title and multi-PDF chip overflow                                               |
| `767x844`  | Last mobile pixel keeps one primary surface                                              |
| `768x844`  | First `md` pixel uses intended scroll/stack behavior                                     |
| `1024x768` | Tablet/desktop stacked behavior and internal scrolling                                   |
| `1440x900` | PDF/chat side-by-side split, independent scrolling, no overlap                           |

For attached-PDF live proof: upload a non-sensitive fixture, verify chat remains
primary, switch attachments, open PDF, Ask Tutor from a selection, return to
chat, remove inactive/active PDFs, and verify context/state after each step.

For voice: first run the local mock/permission-denial paths. Real OpenRouter or
Deepgram proof is a separate, explicitly approved provider-traffic drill and
must be backed by real provider receipts; mock rows and local UI success do not
count as real provider proof.

## Verification performed

- `npm run test:node`: **264/264 passed**
- Focused DOM suite covering Study, ChatPanel, PdfViewer, and Settings:
  **107/107 passed**
- Live isolated browser checks on `320x568`, `360x800`, `390x844`, `767x844`,
  `768x844`, and `1440x900`
- Live no-PDF browser pass: no console warnings/errors
- No real OpenRouter or Deepgram traffic was sent
- Attached-PDF live upload was not performed in this read-only lane; current
  attached-PDF proof is rendered/mock-backed only
