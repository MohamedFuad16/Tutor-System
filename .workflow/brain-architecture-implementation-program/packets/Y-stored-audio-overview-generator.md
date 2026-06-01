# Packet Y: Stored Audio Overview Generator

## Scope

Make the User Brain Architecture stored-audio system generation-ready without
shipping broken playback controls or pretending missing MP3s were generated.

## Write Scope

- `scripts/generate-user-brain-audio-overviews.mjs`
- `scripts/user-brain-audio-overview-plan.mjs`
- `src/lib/chapterAudioOverviews.ts`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `src/views/RevisionView.tsx`
- `README.md`
- `TUTOR_ARCHITECTURE.md`
- `tests/audio-overview-plan.test.mjs`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` only by explicit Graphify regeneration

## Constraints

- Use Graphify before source inspection.
- Keep the existing checked-in chapter 1 MP3 as the only exposed player until
  additional assets actually exist.
- Do not call live OpenAI synthesis during verification when `OPENAI_API_KEY` is
  absent.
- Keep AWS/cloud work out of scope.

## Acceptance

- A local plan covers every User Brain Architecture chapter.
- A dry-run command reports present and missing MP3 assets with no network
  access.
- A generation command uses OpenAI speech only when `OPENAI_API_KEY` is present.
- Tests validate the plan and dry-run behavior.
- Architecture docs, brain book, and app design book mention the new generation
  contract.
