# Packet DD: natural audio overview regeneration

## Goal

Redo the stored chapter audio guide content so every built-in Library book uses
more natural, paced, explanatory scripts instead of short rushed blurbs.

## Scope

- `src/lib/chapterAudioOverviews.json`
- `public/audio-overviews/*.mp3`
- `tests/audio-overview-plan.test.mjs`
- Workflow result/report files for this packet

## Constraints

- Keep playback local through checked-in MP3 assets.
- Use Deepgram `aura-2-odysseus-en` at speed `1`.
- Do not expose generated-by metadata, stored MP3 labels, stored dates, or
  overview titles in the reader card.
- Do not implement AWS/cloud audio storage or live playback generation.
- Do not regenerate Graphify unless source architecture changes require it.

## Acceptance Checks

- All 25 built-in chapter guides remain present.
- Manifest transcripts are materially longer and include enough sentence breaks
  for natural speech pacing.
- Regenerated MP3 durations match manifest `durationLabel` values.
- `npm run audio:overview:dry-run` passes with 25 present, 0 missing.
- Focused audio-plan test, lint, full test suite, build, and browser QA pass.
