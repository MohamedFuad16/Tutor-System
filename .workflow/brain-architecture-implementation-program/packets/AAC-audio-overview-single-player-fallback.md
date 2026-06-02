# Packet AAC: Audio Overview Single Player Fallback

## Objective

Remove the visible native audio fallback player from built-in Library chapter
audio guides while keeping fallback/retry playback behind the same visible
player component.

## Context

The updated goal explicitly asked to remove the local audio overview fallback UI:
the same audio overview component can use fallback behavior in the background,
but users should not see another Play button. Graphify routed this slice through
`StoredAudioOverview()`, `RevisionView.tsx`, `ChapterAudioOverview`, and
`chapterAudioOverviews.ts`.

## Ownership

- `src/views/RevisionView.tsx`
- `tests/audio-overview-plan.test.mjs`
- Audio behavior copy in Tutor System Architecture, User Brain Architecture,
  Tutor System Architecture Library JSON, and App Design Language
- Workflow evidence and `graphify-out/*` after explicit Graphify regeneration

## Do

- Keep one visible Play/Pause player for stored chapter audio guides.
- Keep the backing `<audio>` element loaded with the stored MP3 asset.
- Remove visible native fallback controls and any second play surface.
- Keep retry/fallback messaging inside the same visible player.
- Add a regression test that prevents native fallback controls from returning.

## Do Not

- Remove stored audio overviews.
- Reintroduce live read-aloud/TTS for chapter guide playback.
- Add a separate fallback button, native player, or alternate card.
- Add AWS/cloud synchronization.

## Expected Output

- The reader shows a single audio guide player.
- The hidden audio element remains the playback engine with the stored asset.
- Browser QA confirms there is one visible Play button and no visible native
  media controls.
- Tests, Graphify refresh, workflow evidence, commit, and push.
