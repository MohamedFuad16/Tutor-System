# Packet AA: all-chapter audio guides

## Scope

Implement the updated audio-guide requirement for all built-in Library books:

- every built-in chapter gets a stored local MP3 guide;
- the player exposes play, pause, progress, and speed controls;
- the reader no longer shows the generated-by metadata string or the stored
  overview title;
- guide scripts explain the chapter instead of reading the chapter body;
- generation uses Deepgram Aura from the curl-style speech API shape, with the
  key supplied at runtime;
- generation remains local and GitHub-pushable, with AWS/cloud deferred.

## Write Scope

- `src/lib/chapterAudioOverviews.ts`
- `src/lib/chapterAudioOverviews.json`
- `scripts/user-brain-audio-overview-plan.mjs`
- `scripts/generate-user-brain-audio-overviews.mjs`
- `public/audio-overviews/*.mp3`
- `src/views/RevisionView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `README.md`
- `TUTOR_ARCHITECTURE.md`
- `tests/audio-overview-plan.test.mjs`
- workflow docs
- generated Graphify artifacts after verification

## Verification Plan

- `npm run audio:overview:dry-run`
- `node --test tests/audio-overview-plan.test.mjs`
- MP3 duration/probe check with `ffprobe`
- Browser QA in Revision for multiple chapters
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run format:check`
- Graphify regeneration and smoke query
- read-only final-check sidecar
