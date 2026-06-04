# Packet ACV Result: Chat Read-Aloud Miso Surface

## Accepted

- Added read-aloud voice labels in `ChatPanel.tsx` and passed the selected
  `ttsVoice` into assistant message actions.
- The existing Read Aloud button now renders the selected provider label and
  exposes an accessible name such as `Read aloud with MisoTTS 8B`.
- MisoTTS tooltip copy states that the local HTTP TTS path powers Read Aloud
  while Live Voice still uses Deepgram.
- Fixed the StudyView mobile shell by making the root container height-bound
  (`h-full`) and scrollable inside the app shell, so the chat action row is
  reachable on phone viewports.
- Added static regression coverage for the chat Miso label and StudyView mobile
  scroll shell.

## Rejected

- No second visible audio fallback button was added.
- No AWS/cloud path was added.
- No claim was made that MisoTTS replaces realtime Deepgram voice mode.
- No live MisoTTS 8B audio proof was claimed while the Vast 8B model preload is
  still disk-blocked.

## Verification Evidence

- `npm run format`: passed.
- Direct touched-file Prettier check for `ChatPanel.tsx`, `StudyView.tsx`,
  `tts-provider-routing.test.mjs`, and `study-view-upload.test.mjs`: passed.
- `npm run test -- tests/tts-provider-routing.test.mjs
tests/study-view-upload.test.mjs tests/beta-diagnostics.test.mjs`: passed via
  the project runner, 177 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA on `http://127.0.0.1:3001` confirmed Settings persisted
  `MisoTTS 8B`, desktop Chat rendered exactly one visible `Read aloud with
MisoTTS 8B` button, and phone Chat rendered the same button without clipping
  after the StudyView scroll fix.
- Browser screenshots saved as `ACV-chat-read-aloud-miso-desktop.png` and
  `ACV-chat-read-aloud-miso-phone.png`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1181 nodes, 2041 edges, and 78 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`85.7 KB`).
- Graph artifact grep found no `server.mjs`, `.tmp-test`, `/private/tmp`, or
  `codex-runtimes` scratch references.

## Remaining Work

- Provision a larger executable Vast disk, preload the MisoTTS 8B weights, run
  the local FastAPI wrapper, and capture real `/api/tts?voice=miso-tts-8b`
  audio proof through the existing Read Aloud button.
- Run deliberate real OpenRouter plus Deepgram provider-key beta drills for the
  complete chat and voice proof bundle.
- AWS/cloud synchronization remains deferred until after beta testing.
