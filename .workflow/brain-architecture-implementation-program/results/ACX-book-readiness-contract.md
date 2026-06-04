# Packet ACX Result: Book Readiness Contract

## Accepted

- Updated `TUTOR_ARCHITECTURE.md` to include MisoTTS read-aloud in the model
  inventory and ChatPanel boundary text.
- Updated `src/lib/tutorBook.json` so the Tools and Model Provider chapters
  explain MisoTTS as an assistant-message Read Aloud provider that can use a
  local Vast tunnel, `MISO_TTS_API_URL`, or a compatible endpoint.
- Updated `src/lib/userBrainArchitectureBook.ts` so the Voice, Audio, And
  Timing chapter explains that MisoTTS is separate from realtime Deepgram voice
  and that Admin probes the selected endpoint.
- Added `tests/book-readiness-contract.test.mjs` to guard reader-first chapter
  order, concise Admin intro copy, MisoTTS/read-aloud book boundaries, one
  visible audio player, and 3-4 minute audio guide manifest windows.
- Added `phase77-book-readiness-browser-qa.mjs` and rendered Admin, Tutor book,
  and User Brain book proof screenshots.

## Rejected

- No second audio overview play button was added.
- No stored audio overview MP3s were regenerated.
- No MisoTTS live audio proof was claimed while the 8B model is still
  disk-blocked on the current Vast container.
- No AWS/cloud work was added.

## Verification Evidence

- Graphify-first routing identified `RevisionView.tsx`,
  `chapterAudioOverviews.ts`, `userBrainArchitectureBook.ts`,
  `tutorBook.json`, `AdminView.tsx`, and existing audio overview tests as the
  connected slice.
- `node --test tests/book-readiness-contract.test.mjs`: passed, 4 tests.
- `npm run test`: passed, 183 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser QA via `phase77-book-readiness-browser-qa.mjs` passed with zero
  console logs for Admin desktop, Tutor System Architecture desktop, and User
  Brain Architecture mobile.
- Browser screenshots saved as `phase77-admin-concise-preface-desktop.png`,
  `phase77-tutor-book-misotts-provider-desktop.png`, and
  `phase77-user-brain-misotts-mobile.png`; JSON evidence saved as
  `phase77-book-readiness-browser-qa.json`.
- Clean Graphify regeneration passed after stopping the dev server and removing
  generated `server.mjs`; final graph artifacts were rebuilt with 1195 nodes,
  2054 edges, and 66 communities.
- `npm run graphify:tree`: passed, writing `GRAPH_TREE.html` at 86.5 KB.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, `/private/tmp`, or
  `codex-runtimes` scratch references.

## Remaining Work

- Return to hard runtime proof slices: real provider-key OpenRouter/Deepgram
  drill, larger-disk MisoTTS 8B audio proof, and broader beta validation.
- Keep AWS/cloud synchronization deferred until after beta testing.
