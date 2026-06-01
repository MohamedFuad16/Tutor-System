# Packet BB: stored audio-guide integrity verifier

## Objective

Close the local provenance gap left after all built-in chapter audio guides were
generated. Admin should be able to run a conservative local check for stored
audio-guide artifact rows without fetching external content or claiming factual
audio/source-span verification.

## Ownership

- `src/memory/artifact.records.ts`
- `tests/artifact-records.test.mjs`
- `src/views/AdminView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `TUTOR_ARCHITECTURE.md`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` after regeneration

## Do

- Extend the local artifact verifier to support `audio_overview` rows.
- Verify only stored manifest integrity: local MP3 path, overview id,
  book/chapter anchors, transcript length, summary, voice, duration, stored
  date, and local/no-external-fetch metadata.
- Keep generated flashcards and richer generated artifact kinds unsupported.
- Update Admin/book/docs copy so the verifier boundary is clear.

## Do Not

- Fetch MP3 files or external pages during the verifier.
- Claim audio-content transcription accuracy or sentence-level source-span
  verification.
- Implement AWS/cloud storage or verification.

## Verification

- Focused artifact-record tests.
- Lint, full test suite, build, format check.
- Browser QA for Admin Sources: audio-guide rows expose `Run local check`, and a
  check can mark a row verified.
- Graphify regeneration and smoke query.
