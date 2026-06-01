# Packet W: Book reader and stored audio overview

## Objective

Make the User Brain Architecture book easier to read and add a stored chapter
audio-overview player for built-in Library chapters.

## Context

Graphify routed this slice through:

- `src/views/RevisionView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `TUTOR_ARCHITECTURE.md`
- `src/lib/audio.ts`
- `server.ts` voice/TTS routes

OpenAI docs confirmed that GPT audio output can be generated through audio
modalities, but the current local environment has no `OPENAI_API_KEY`. This
slice therefore stores a GPT-authored overview script and a local MP3 asset for
playback, without wiring live TTS into the Library player.

## Do

- Collapse the User Brain Architecture book into a shorter reader path.
- Add typed stored-overview metadata for built-in chapters.
- Add a Library audio card with play, pause, progress, transcript, and 1x /
  1.25x / 1.5x controls.
- Store the first overview asset under `public/audio-overviews/`.
- Add new book/audio metadata files to the repo formatting gate.
- Update system architecture, app design, Tutor book, workflow state, and final
  report.

## Do Not

- Do not call `/api/tts` from the Library audio card.
- Do not claim every chapter has a stored audio asset yet.
- Do not implement AWS/cloud audio storage.
- Do not stage unrelated old workflow directories.

## Verification

- `npm run lint`
- `npm run build`
- `npm run format:check`
- Browser QA for User Brain Architecture playback controls and book chapter
  count.
- Graphify regeneration and smoke query because this changes architecture
  artifacts.
