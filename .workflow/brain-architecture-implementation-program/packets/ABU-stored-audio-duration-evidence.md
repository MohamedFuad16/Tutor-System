# Packet ABU: Stored Audio Duration Evidence

## Objective

Make the built-in chapter audio guide duration promise verifiable in local source
metadata, tests, dry-run output, Admin artifact provenance, and the architecture
books.

## Scope

- Add measured duration seconds to the checked-in audio overview manifest.
- Require stored guide durations to stay inside the local beta 3-4 minute window.
- Keep AWS/cloud audio hosting out of scope.
- Preserve the single visible audio-player behavior from the previous slice.

## Graphify Route

- `graphify query "chapterAudioOverviews userBrainArchitectureBook audio overview duration transcript 3 4 minutes stored audio guide generator plan tests source files" --budget 10000 --graph graphify-out/graph.json`
- `graphify path "chapterAudioOverviews" "RevisionView()" --graph graphify-out/graph.json`
- `graphify query "stored audio guide manifest integrity duration seconds durationLabel artifact verifier audio_overview artifactRecords citationStates source files" --budget 8000 --graph graphify-out/graph.json`
- `graphify query "generate user brain audio overviews script dry run duration verification ffprobe chapterAudioOverviews json tests package scripts" --budget 8000 --graph graphify-out/graph.json`

## Write Scope

- `src/lib/chapterAudioOverviews.json`
- `src/lib/chapterAudioOverviews.ts`
- `scripts/user-brain-audio-overview-plan.mjs`
- `scripts/generate-user-brain-audio-overviews.mjs`
- `src/memory/artifact.records.ts`
- `src/views/AdminView.tsx`
- `src/views/RevisionView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `README.md`
- `TUTOR_ARCHITECTURE.md`
- `tests/audio-overview-plan.test.mjs`
- `tests/artifact-records.test.mjs`
- Workflow docs and regenerated Graphify artifacts.

## Acceptance

- All 25 built-in audio guides have measured `durationSeconds` in the manifest.
- Tests compare checked-in MP3 durations against manifest seconds when
  `ffprobe` or `afinfo` is available.
- Stored audio artifact verification rejects durations outside 180-245 seconds.
- Admin seeded source-artifact rows carry duration metadata.
- Revision still renders one visible audio player with no fallback copy.
- `npm run test`, `npm run format:check`, `npm run lint`, `npm run build`, and
  Graphify regeneration pass.
