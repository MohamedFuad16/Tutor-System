# Final Report: brain architecture implementation program

## Outcome

## Accepted Results

## Rejected Results

## Conflicts Resolved

## Verification Evidence

## Remaining Risks

## Reusable Follow-up

# brain architecture implementation program: phase 58 report

## Scope

Phase 58 expands the local background-job scheduler coverage from the first
interaction-memory queue to the broader local memory-worker paths that already
run after chat, voice, and document work. This remains local-only: no AWS
workers, cloud queues, hooks, or Graphify watch mode were added.

## Graphify Context

- Graphify routed this slice through `background.jobs.ts`,
  `runBackgroundJob()`, `recordBackgroundJobEvent()`, `MemoryOrchestrator`,
  `.updateLearningBookFromConversation()`, `.addOrUpdateConcept()`,
  `AdminView()`, and `buildBetaDiagnosticsSnapshot()`.

## Integration Decisions

- Wrapped learning-book updates in the durable local `learning_book_update`
  background job state while preserving the awaited caller behavior.
- Wrapped graph-concept updates in the durable local `graph_concept_update`
  background job state.
- Kept model-summary mastery and confidence rows audit-only through the existing
  model-observation gate.
- Added Admin job-name mix chips so beta tuning can distinguish interaction,
  learning-book, and graph-concept memory-worker jobs.
- Updated README, Tutor System Architecture, User Brain Architecture, Tutor
  Library JSON, App Design Language, and workflow records to document the exact
  local-only boundary.

## Verification Evidence

- `npx tsc --noEmit --pretty false`: passed.
- `npm run format`: passed.
- `npm run test`: passed, 139 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at 599x822: Admin Beta rendered scheduler copy, no
  horizontal overflow, and no warning/error logs.
- Headless Chrome QA at 1440x1000 and 390x844: Admin Beta rendered scheduler
  copy, empty state, local-only cloud boundary, no horizontal overflow, and no
  console warning/error logs.
- QA screenshots and JSON were saved under
  `.workflow/brain-architecture-implementation-program/results/`.
- `graphify update . --force`: passed, 1008 nodes, 1805 edges, 62 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query and path checks found the new scheduler/Admin routes.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing.

## Remaining Work

- Live provider-key typed-chat and voice beta proof still needs a fuller
  end-to-end run after more scheduler and Admin tuning slices.
- Remaining background workers still need scheduler coverage before this can be
  called a complete local worker platform.
- AWS/cloud deployment remains deferred until local beta behavior is proven.

## Brain Architecture Progress

- Estimate after this slice: 74%.

# brain architecture implementation program: phase 34 report

## Scope

Phase 34 completes the built-in book voice-overview requirement. The previous
phase expanded User Brain Architecture only; this phase expands the remaining
Tutor System Architecture and App Design Language guides so every built-in
Library chapter now has a checked-in, plain-language, 3-4 minute stored MP3
guide.

## Graphify Context

- Graphify routed this slice through `tutorBook`, `RevisionView`,
  `AppDesignLanguagePage()`, `StoredAudioOverview()`,
  `chapterAudioOverviews`, the audio overview plan tests, README/Tutor
  architecture docs, and the generated `graphify-out` artifacts.

## Integration Decisions

- Added a reproducible phase packet that expands only the remaining short
  system/app-design audio scripts and keeps reruns idempotent.
- Regenerated all 13 Tutor System Architecture MP3 assets and all 4 App Design
  Language MP3 assets with Deepgram `aura-2-odysseus-en` at speed `1`.
- Updated manifest duration labels to match measured playback.
- Updated the Tutor System Architecture book, User Brain Architecture book,
  App Design Language control-pattern copy, README, and system architecture doc
  so they all describe 3-4 minute stored guides instead of shorter pending
  assets.
- Added a local headless-Chrome QA helper after the in-app browser session
  timed out on basic click/screenshot operations.

## Verification Evidence

- Deepgram generation passed for `npm run audio:overview:generate -- --provider
deepgram --overwrite --speed 1 --book tutor-book`.
- Deepgram generation passed for `npm run audio:overview:generate -- --provider
deepgram --overwrite --speed 1 --book app-design-language`.
- `ffprobe` measured all 25 built-in chapter guide assets in range:
  - Tutor System Architecture: 220-240 seconds.
  - User Brain Architecture: 193-214 seconds.
  - App Design Language: 233-235 seconds.
- `npm run audio:overview:dry-run`: passed, 25 present, 0 missing, 25 planned.
- `npm run format:check`: passed.
- `npm run test`: passed, 85 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- Headless Chrome QA at 390x844 and 1440x900: Tutor System Architecture and
  App Design Language chapter 1 audio cards loaded native controls, transcripts,
  226/233-second durations, no raw stored metadata in-card, and no horizontal
  overflow.
- QA screenshots were saved under
  `.workflow/brain-architecture-implementation-program/results/`.
- `graphify update . --force`: passed with no topology changes for this
  documentation/audio-manifest slice.
- `npm run graphify:tree`: passed.

## Remaining Work

- Continue the complete local learner-brain runtime flow: voice/chat storage,
  context injection, tool calling, Admin observability, and agent-layer behavior.
- AWS/cloud deployment remains intentionally deferred until local beta flow is
  proven.

# brain architecture implementation program: phase 33 report

## Scope

Phase 33 focuses only on the User Brain Architecture book's voice overview
requirement. It expands every User Brain Architecture chapter script into a
plain-language, long-form stored audio explainer, regenerates the checked-in
MP3 assets, and documents the boundary in the book itself: Tutor System
Architecture and App Design Language still use shorter guide assets until their
own rewrite pass.

## Graphify Context

- Graphify routed this slice through `RevisionView`, `StoredAudioOverview()`,
  `chapterAudioOverviews`, `userBrainArchitectureBook.ts`, and the generated
  `graphify-out` artifacts.

## Integration Decisions

- Expanded the 8 User Brain Architecture audio transcripts in
  `src/lib/chapterAudioOverviews.json` with simple explanations for the runtime,
  ledger, teaching loop, grounding, Admin tuning, voice timing, local beta, and
  glossary chapters.
- Updated `scripts/generate-user-brain-audio-overviews.mjs` so Deepgram inputs
  longer than the provider limit are split on sentence boundaries, synthesized
  as chunks, and stitched back into one MP3 with `ffmpeg`.
- Added a workflow packet helper for this phase so the transcript expansion is
  reproducible and idempotent.
- Updated `src/lib/userBrainArchitectureBook.ts` to say the User Brain
  Architecture guides are now 3-4 minute stored explainers while the other
  built-in books remain a follow-up.

## Verification Evidence

- Deepgram regeneration passed for `npm run audio:overview:generate -- --provider
deepgram --overwrite --speed 1 --book user-brain-architecture`.
- `ffprobe` measured the regenerated chapter durations as 207, 195, 196, 195,
  205, 193, 214, and 195 seconds.
- `npm run audio:overview:dry-run`: passed, 25 present, 0 missing, 25 planned.
- `npm run format:check`: passed.
- `npm run test`: passed, 85 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser QA: User Brain Architecture chapter 1 loaded the stored
  `/audio-overviews/user-brain-runtime-overview.mp3` asset with native controls,
  custom controls, transcript, 207-second duration, no raw stored metadata in
  the audio card, and no horizontal overflow at 390x844 and 1440x900.
- `graphify update . --force`: passed. The first phase run produced 858 nodes,
  1450 edges, and 60 communities; the final run after the book note edit found
  no further topology changes.
- `npm run graphify:tree`: passed.

## Remaining Work

- Expand Tutor System Architecture and App Design Language stored audio guides
  to the same 3-4 minute standard.
- Continue the complete local learner-brain runtime flow: voice/chat storage,
  context injection, tool calling, Admin observability, and agent-layer behavior.
- AWS/cloud deployment remains intentionally deferred until local beta flow is
  proven.

# brain architecture implementation program: phase 32 report

## Scope

Phase 32 handles the user-requested voice/audio follow-up without merging PR #4
wholesale. The phase inspected MegaaDev's open PR, kept the already-safer
current `main` voice transport, lifted only the missing voice-session title
route behavior, and made stored chapter audio guides usable even when the custom
media play promise is blocked by the browser.

## Graphify Context

- Graphify routed this slice through `ChatPanel()`, `createTutorServerApp()`,
  `/api/title`, `RevisionView`, `StoredAudioOverview()`,
  `chapterAudioOverviews`, and the generated `graphify-out` artifacts.

## Integration Decisions

- Added a text-transcript branch to `/api/title`, preserving the current
  OpenRouter auth resolver and the existing image-title path.
- Kept PR #4's image search, Mermaid generation, multiple-PDF changes,
  generated brain artifacts, stale workflow edits, and `server.mjs` changes out
  of this phase.
- Preserved the current Node/WebSocket voice-agent routing, Deepgram key path,
  KeepAlive, EOT tuning, usage events, and Admin observability already present
  on `main`.
- Updated `StoredAudioOverview()` so the custom Play button primes playback on
  pointer down and the browser-native audio controls are always visible beneath
  the custom controls.
- Confirmed there is no tracked GitHub Actions YAML workflow left on `main` for
  automatic Graphify refresh.

## Verification Evidence

- Read-only explorer Averroes inspected PR #4 and returned a voice-only
  extraction map.
- `git ls-files '*.yml' '*.yaml'`: no tracked YAML workflows.
- `npm run audio:overview:dry-run`: passed, 25 present, 0 missing, 25 planned.
- `npm run format:check`: passed.
- `npm run test`: passed, 85 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- `curl -I /audio-overviews/user-brain-runtime-overview.mp3`: served 200
  `audio/mpeg` with a 321408 byte content length.
- Browser QA with the in-app browser at 488x822: User Brain Architecture audio
  card rendered custom controls, native controls, loaded duration, transcript,
  no forbidden stored-metadata copy, and no horizontal overflow.
- `graphify update . --force`: passed, 854 nodes, 1442 edges, 61 communities.
- `npm run graphify:tree`: passed.

## Remaining Work

- A live `/api/title` text-title model call was not forced during verification
  to avoid spending a network/model request; source, build, and route structure
  verify the local branch.
- Live voice remains Node/WebSocket-only. The Vercel warning path should remain
  in place until a real realtime host is selected after beta.
- Continue the broader local learner-brain wiring before AWS/cloud work.

# brain architecture implementation program: phase 31 report

## Scope

Phase 31 adds generated learning-note source-span anchors. When
`MemoryOrchestrator.updateLearningBookFromConversation()` receives document
context with extracted text, generated note artifacts now save compact local
source-span previews and require those anchors to pass the local generated-note
provenance check. This moves the runtime closer to source-span matching while
staying honest: it proves saved local anchors exist, not that every sentence is
factually entailed by the source.

## Graphify Context

- Graphify routed this slice through `ChatPanel()`, `PdfViewer()`,
  `StudyView.tsx`, `MemoryOrchestrator`, `recordGeneratedNotesArtifact()`,
  `src/memory/artifact.records.ts`, `tests/artifact-records.test.mjs`,
  `AdminView`, `RevisionView`, and the architecture books.

## Integration Decisions

- Added `createGeneratedNoteSourceSpans()` to compact document contexts into
  stable local span anchors.
- Extended generated-note artifact/citation metadata with source-span ids,
  source document ids, preview metadata, source-span counts, and coverage state.
- Updated the generated-note local verifier so required-but-missing source spans
  make a note unavailable, while coherent anchors remain locally verified.
- Wired `MemoryOrchestrator` to pass document-context source spans into
  generated note artifact creation.
- Updated Admin and architecture-book copy to say source-span anchors are local
  previews, not sentence-level truth.

## Verification Evidence

- `npm run test`: passed, 85 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser QA with the in-app browser at 1280x900: Admin Source Artifacts rendered
  saved source-span anchor copy, local-preview boundary copy, and no horizontal
  overflow.
- Browser QA with the in-app browser at 390x844: Admin Source Artifacts rendered
  through the mobile `Sources` tab with saved source-span anchor copy and no
  horizontal overflow.
- Browser QA with the in-app browser at 1280x900 and 390x844: User Brain
  Architecture opened to Chapter 1, rendered source-span preview wording, and
  had no horizontal overflow.
- `graphify update . --force`: passed, 854 nodes, 1442 edges, 61 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `createGeneratedNoteSourceSpans()`,
  `buildGeneratedNoteSourceSpans()`, `recordGeneratedNotesArtifact()`, and the
  `MemoryOrchestrator` path.

## Remaining Work

- Implement actual sentence-level claim matching against saved source spans.
- Add Admin drill-down/filtering for generated-note source-span coverage once
  more real beta rows exist.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 30 report

## Scope

Phase 30 tightens generated learning-note provenance. It keeps constructors
conservative, but the Memory runtime write path now runs the local generated-note
integrity check immediately after creating the artifact/citation pair. This
proves ledger coherence only: learning entry, book or conversation anchor,
local-only metadata, no external fetch, and saved summary preview. It does not
claim sentence-level source-span truth.

## Graphify Context

- Graphify routed this slice through `MemoryOrchestrator`,
  `recordGeneratedNotesArtifact()`, `verifyLocalCitationIntegrity()`,
  `src/memory/artifact.records.ts`, `tests/artifact-records.test.mjs`,
  `src/lib/userBrainArchitectureBook.ts`, `src/lib/tutorBook.json`,
  `src/views/RevisionView.tsx`, and `TUTOR_ARCHITECTURE.md`.

## Integration Decisions

- Added `createInitialLocalCitationIntegrityRecords()` as a pure helper for the
  write-time trust transition.
- Updated `recordGeneratedNotesArtifact()` so coherent generated learning-note
  rows are saved as locally verified instead of staying `not_checked`.
- Preserved `createGeneratedNotesArtifactRecords()` as a conservative
  `not_checked` constructor for tests, review tools, and manual artifact
  assembly.
- Updated the system architecture doc, in-app Tutor architecture book, User
  Brain Architecture book, and App Design Language pattern text with the new
  auto-check boundary.

## Verification Evidence

- `npm run test`: passed, 81 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser QA with the in-app browser at 1280x900: Admin Source Artifacts rendered
  the artifact/citation ledger, generated learning-note provenance copy, local
  verifier coverage, and no-fetch boundary with no horizontal overflow.
- Browser QA with the in-app browser at 390x844: Admin Source Artifacts rendered
  through the mobile `Sources` tab with the same generated-note verifier copy
  and no horizontal overflow.
- Browser QA with the in-app browser at 1280x900 and 390x844: User Brain
  Architecture opened to Chapter 1, rendered the new auto provenance-check
  wording, and had no horizontal overflow.
- `graphify update . --force`: passed, 848 nodes, 1434 edges, 62 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `createInitialLocalCitationIntegrityRecords()`,
  `recordGeneratedNotesArtifact()`, `verifyLocalCitationIntegrity()`, and the
  `MemoryOrchestrator` path to the new helper.

## Remaining Work

- Add sentence-level source-span matching before generated notes can be treated
  as factually grounded evidence.
- Add verifier contracts for charts, code, images, websites, previews, and other
  unsupported artifact kinds.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 26 report

## Scope

Phase 26 promotes generated flashcard artifact rows from unsupported local
artifacts to locally verifiable provenance records. It stays inside local beta:
the verifier proves saved flashcard provenance, not flashcard answer
correctness, and it does not fetch external pages or call models.

## Graphify Context

- Graphify routed this slice through `src/memory/artifact.records.ts`,
  `tests/artifact-records.test.mjs`, `src/views/AdminView.tsx`,
  `src/lib/userBrainArchitectureBook.ts`, `src/lib/tutorBook.json`, and
  `TUTOR_ARCHITECTURE.md`.

## Integration Decisions

- Added `flashcards` support to `supportsLocalCitationIntegrityArtifact()`.
- Added `generated_flashcard_provenance` as a local verifier claim scope.
- Hardened generated flashcard artifact metadata so caller-supplied metadata
  cannot override `localOnly: true` or `externalContentFetched: false`.
- Added generated-flashcard verifier checks for batch id, source/message
  anchors, card count, saved card ids, source ids, concept id consistency,
  prompt preview, and local/no-external-fetch metadata.
- Updated Admin Source Artifacts copy and metrics so flashcard artifacts are
  visible alongside source cards, generated notes, and audio guides.
- Updated the system architecture doc, in-app Tutor architecture book, and User
  Brain Architecture book with the conservative verifier boundary.
- Regenerated Graphify because this phase changed code architecture.

## Verification Evidence

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 80 tests.
- `npm run build`: passed.
- `graphify update . --force`: passed, 840 nodes, 1421 edges, 58 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `verifyLocalCitationIntegrity()`,
  `supportsLocalCitationIntegrityArtifact()`,
  `createGeneratedFlashcardsArtifactRecords()`, `AdminView`, and flashcard
  memory neighbors.
- Browser QA on `http://localhost:3001`: Admin Source Artifacts rendered the
  generated flashcard provenance copy, Flashcards metric, flashcard-correctness
  boundary, and no old flashcard-unsupported wording.
- Browser QA at 390x844: Admin Source Artifacts kept the generated flashcard
  provenance copy and metric with no horizontal overflow.
- A read-only final-check sidecar was spawned but did not finish within the wait
  window; it was shut down before producing findings.

## Remaining Work

- Add source-span or answer-level checks before claiming generated flashcard
  factual correctness.
- Add local verifiers for charts, code, images, websites, previews, and other
  artifact kinds.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 25 report

## Scope

Phase 25 improves the stored audio overview experience for every built-in
Library book. It keeps playback local, regenerates the checked-in MP3 assets
from more natural chapter-specific scripts, and leaves AWS/cloud audio storage
out of scope.

## Graphify Context

- Graphify routed this slice through `StoredAudioOverview()`,
  `src/lib/chapterAudioOverviews.ts`,
  `src/lib/chapterAudioOverviews.json`,
  `scripts/user-brain-audio-overview-plan.mjs`,
  `scripts/generate-user-brain-audio-overviews.mjs`, and
  `tests/audio-overview-plan.test.mjs`.

## Integration Decisions

- Rewrote all 25 manifest transcripts as longer explanatory guides with more
  sentence breaks so Deepgram has room for a more natural cadence.
- Regenerated all 25 checked-in MP3 assets with Deepgram
  `aura-2-odysseus-en` at speed `1`.
- Updated manifest `durationLabel` values from actual `ffprobe` durations after
  regeneration.
- Added an audio-plan regression guard requiring substantial script length and
  at least seven sentence breaks per guide.
- Did not regenerate Graphify because this phase changed content, tests, and
  checked-in media assets rather than code architecture.

## Verification Evidence

- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing MP3
  assets.
- `node --test tests/audio-overview-plan.test.mjs`: passed, 5 tests.
- `ffprobe` duration check: all 25 regenerated MP3 files are valid and range
  from about 41 to 57 seconds; manifest labels match rounded durations.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 77 tests.
- `npm run build`: passed.
- Browser QA on `http://localhost:3001`: User Brain Architecture and App Design
  Language audio cards loaded regenerated local MP3 paths, showed updated
  durations and 1x/1.25x/1.5x controls, and did not show the old generated-by
  metadata, stored MP3 label, stored date, or overview title.
- Browser QA at 390x844: the App Design Language final chapter audio card kept
  controls visible with no horizontal overflow.
- Admin Sources still exposed the audio-guide provenance surface without old
  audio metadata strings.
- A read-only final-check sidecar was spawned, but it hit the subagent usage
  limit before producing findings. The main thread completed the final audit.

## Remaining Work

- Browser automation could validate loaded MP3 source paths, durations, and
  speed state, but not audible playback progression after the Play click in the
  in-app browser environment.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 22 report

## Scope

Phase 22 implements the updated all-chapter, all-built-in-book audio-guide
requirement with Deepgram-generated stored MP3s. It keeps playback local, avoids
live read-aloud at playback time, removes visible generated-by/stored-title
metadata from the reader, and keeps AWS/cloud work out of scope.

## Graphify Context

- Graphify routed this slice through `src/views/RevisionView.tsx`,
  `src/lib/chapterAudioOverviews.ts`,
  `scripts/user-brain-audio-overview-plan.mjs`,
  `scripts/generate-user-brain-audio-overviews.mjs`,
  `src/lib/userBrainArchitectureBook.ts`, `src/lib/tutorBook.json`,
  `README.md`, `TUTOR_ARCHITECTURE.md`, and the audio-plan test.

## Integration Decisions

- Moved chapter audio guide data into
  `src/lib/chapterAudioOverviews.json`, shared by the app and generation plan.
- Exposed stored audio guides for all 25 chapters across Tutor System
  Architecture, User Brain Architecture, and App Design Language.
- Updated the reader card to show a plain Chapter audio guide control with
  play/pause, progress, and speed controls, without displaying the old
  generated-by metadata string, stored MP3 label, stored date, or overview
  title.
- Switched the generator default to the requested Deepgram path:
  `aura-2-odysseus-en` at speed `1`, with the key supplied only through
  `DEEPGRAM_API_KEY`.
- Regenerated and checked in all 25 MP3 files from chapter-specific guide
  scripts that explain the chapter rather than reading the book text.
- Updated system architecture docs, the in-app Tutor architecture book, the User
  Brain Architecture book, README usage, and the App Design Language local beta
  pattern.

## Verification Evidence

- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing MP3
  assets.
- `ffprobe` duration check: all 25 MP3s are valid and range from about 28 to 41
  seconds with Deepgram speed `1`.
- Source search found no committed Deepgram token.
- `node --test tests/audio-overview-plan.test.mjs`: passed, 5 tests covering
  all built-in book chapters, Deepgram defaults, stored output files, and book
  filters.
- `npm run lint`: passed.
- `npm run test`: passed, 74 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://localhost:3001`: Tutor System Architecture, User Brain
  Architecture, and App Design Language rendered chapter audio guides for first
  and last chapters with expected local MP3 paths, real durations, and no old
  stored-overview metadata string. Admin Sources rendered 25 audio-guide
  artifacts and 25 citation states across all three built-in books.
- `graphify update . --force`: passed.
- `npm run graphify:tree`: passed.
- Graphify smoke query found the Deepgram generator, shared audio plan,
  `synthesizeWithDeepgram()`, manifest exports, `RevisionView()`, and
  `AdminView()`.
- Read-only final-check sidecar was attempted, but the subagent runner returned
  a usage-limit stop before producing findings. No code was changed by the
  sidecar.

## Remaining Work

- Add a real verifier for stored audio guide transcript/audio integrity; current
  audio-guide artifact provenance remains `not_checked`.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 21 report

## Scope

Phase 21 adds a local generated learning-note integrity verifier. It improves
the artifact trust boundary without claiming sentence-level source-span
verification and without changing AWS/cloud architecture.

## Graphify Context

- Graphify routed this slice through `src/memory/artifact.records.ts`,
  `src/views/AdminView.tsx`, `tests/artifact-records.test.mjs`,
  `src/lib/userBrainArchitectureBook.ts`, `src/lib/tutorBook.json`,
  `src/views/RevisionView.tsx`, and `TUTOR_ARCHITECTURE.md`.
- The relevant existing boundary was `verifyLocalCitationIntegrity()`, which
  previously supported source-card artifact rows only.

## Integration Decisions

- Extended `supportsLocalCitationIntegrityArtifact()` to include generated
  learning-note artifacts.
- Added generated-note verifier checks for learning entry id, citation/artifact
  linkage, source ids, local book or conversation anchor, local-only metadata,
  no external fetch, generated learning-entry note kind, and saved summary
  preview.
- Kept generated-note verification scoped to local provenance; source-span claim
  matching remains future work.
- Updated Admin so generated-note artifacts and generated-note citation rows can
  run the local check.
- Updated the system architecture doc, in-app system book, User Brain
  Architecture book, and App Design Language local beta pattern list.

## Verification Evidence

- `npm run test`: passed, 73 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://localhost:3001`: Admin Source Artifacts rendered the
  generated learning-note provenance verifier boundary copy; App Design Language
  rendered the Learning-note integrity checks pattern.
- `graphify update . --force`: passed.
- `npm run graphify:tree`: passed.
- Graphify query smoke found `verifyLocalCitationIntegrity()`,
  `supportsLocalCitationIntegrityArtifact()`,
  `createGeneratedNotesArtifactRecords()`, `verifyArtifactCitationIntegrity()`,
  and Admin imports.
- Final-check sidecar Hypatia found one blocking placeholder-entry risk. The
  verifier now treats `learning-entry` and `generated-learning-note` as
  placeholders, with a regression test for blank generated-note `entryId`.
- Hypatia's follow-up read-only check found no remaining blocker after the
  placeholder fix.

## Remaining Work

- Add sentence-level source-span claim matching for generated learning notes.
- Add real verifiers for generated flashcards, charts, code snippets, images,
  websites, and stored audio overviews.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 20 report

## Scope

Phase 20 makes stored User Brain Architecture audio overviews generation-ready
without exposing missing audio assets in the reader. AWS/cloud work remains out
of scope.

## Graphify Context

- Graphify routed this slice through `src/lib/chapterAudioOverviews.ts`,
  `src/views/RevisionView.tsx`, `src/views/AdminView.tsx`,
  `src/lib/userBrainArchitectureBook.ts`, `src/lib/tutorBook.json`, and
  `package.json`.
- Official OpenAI speech API docs were checked for the
  `openai.audio.speech.create` shape and the `gpt-4o-mini-tts` model before
  adding the local generator.

## Integration Decisions

- Added `scripts/user-brain-audio-overview-plan.mjs` with chapter scripts,
  target filenames, stable overview IDs, public audio URLs, and dry-run report
  helpers for all eight User Brain Architecture chapters.
- Added `scripts/generate-user-brain-audio-overviews.mjs`, a key-gated OpenAI
  speech generator. `--dry-run` performs only local file checks; synthesis
  exits before network work unless `OPENAI_API_KEY` exists.
- Added `npm run audio:overview:dry-run` and
  `npm run audio:overview:generate`.
- Kept `src/lib/chapterAudioOverviews.ts` limited to checked-in assets, so the
  reader cannot render controls for the seven pending MP3s.
- Updated `README.md`, `TUTOR_ARCHITECTURE.md`, the in-app Tutor architecture
  book, the User Brain Architecture book, and the App Design Language local beta
  patterns.
- Added `tests/audio-overview-plan.test.mjs` for chapter coverage, dry-run
  status, checked-in opening audio, and keyless dry-run behavior.

## Verification Evidence

- `npm run audio:overview:dry-run`: passed, 1 present and 7 missing planned MP3
  assets.
- `node --test tests/audio-overview-plan.test.mjs`: passed, 4 tests.
- `npm run lint`: passed.
- `npm run test`: passed, 69 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://localhost:3001`: Revision rendered the User Brain
  Architecture stored audio card with play and speed controls; App Design
  Language rendered the Audio generation dry-run control pattern.
- Graphify regenerated with `graphify update . --force` and
  `npm run graphify:tree`; query smoke found the generator, plan, dry-run, and
  speech-input symbols.
- Final-check sidecar Noether found no blocking issues. Its P3 drift concern was
  addressed by making the focused test compare audio-plan chapter titles against
  `src/lib/userBrainArchitectureBook.ts`.

## Remaining Work

- Generate and review the seven pending MP3 files once an OpenAI key is
  available.
- Add generated MP3 entries to `src/lib/chapterAudioOverviews.ts` only after the
  assets are checked in and reviewed.
- Continue broader local beta learner-brain implementation before any AWS/cloud
  work.

# brain architecture implementation program: phase 1 report

## Scope

Phase 1 implements local Admin observability foundations for the user-brain architecture program. AWS/cloud work is deferred.

## Graphify Context

- MCP graph stats: 756 nodes, 1351 edges, 51 communities.
- MCP label lookup missed several LearningAI brain labels, so Graphify CLI and generated graph artifacts were used for source routing.
- CLI queries identified Admin, Chat, server, store, memory orchestrator, longterm memory, BKT, embeddings, and Graphify scripts as first-phase surfaces.

## Sidecar Results

- A architecture decomposition: local observability accepted as the first safe slice; Dexie schema migrations and evidence-gated mastery are next slices.
- D memory runtime: avoid schema churn in phase 1; add traceability before durable evidence tables.
- E Graphify freshness: checked-in graph was stale; local regeneration was explicitly warranted by the user request.
- F QA/docs/git: verify Admin, debug API, chat blocked-event recording, Graphify smoke, and preserve unrelated dirty files.

## Integration Decisions

- Implemented an in-memory local system activity ledger in `server.ts` with 250-event retention, secret-key redaction, request IDs, status/kind summaries, and debug authorization.
- Added `/api/debug/system-activity` plus local debug CORS support for localhost/null-origin development reads.
- Instrumented `/api/chat`, `/api/trace`, `/api/learning-book-update`, `/api/generate-flashcards`, web search, model fallback, and tool execution paths.
- Added Admin `System Activity` tab with live event stream, event mix, tuning snapshot, usage/memory meters, mobile tab controls, empty/error states, and auto-refresh.
- Added `tests/system-activity.test.mjs` for debug endpoint metadata and blocked chat event capture without live model calls.
- Deferred Dexie evidence tables, mastery gating, durable tool jobs, AWS/cloud, and citation enforcement to future slices.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 7 tests.
- `npm run build`: passed.
- `npm run format:check`: failed on pre-existing `src/views/RevisionView.tsx`; touched files were formatted with Prettier.
- Browser QA: Admin Activity rendered live at `http://localhost:3001`; after a local no-key chat request, the event stream showed `Chat request blocked`, `model`, `blocked`, request ID, and event mix counts.
- API smoke: `/api/debug/system-activity` returned `localOnly: true`, retention limit 250, Graphify/learner-brain meters, and events.
- Graphify: `npm run graphify:update` and `npm run graphify:tree` completed. Final artifacts were regenerated again during rebase to resolve the remote Graphify refresh conflict without hand-merging generated files. `graphify-out/graph.json` has 507 nodes, 793 edges, `built_at_commit` equal to the remote Graphify refresh base (`9a5da7ee7287cc1c10ad2fef3d191e43e309ea24`), and query smoke returned Admin/system-activity nodes.

## Remaining Work

- Evidence-gated mastery adapter and tests: no evidence, no mastery increase.
- Durable local event tables such as `EvidenceEvent`, `MasteryDelta`, and `ToolJob` after a careful Dexie migration.
- Citation-state enforcement for external claims.
- Correction/deletion propagation across derived memories.
- AWS/cloud architecture is still deferred until beta evidence is available.

# brain architecture implementation program: phase 2 report

## Scope

Phase 2 implements the first local evidence-gating slice for mastery. It keeps model summaries useful for notes and confidence while preventing them from raising learner mastery without verified recall evidence.

## Graphify Context

- Initial Graphify traversal identified `src/memory/memory.orchestrator.ts`, `src/memory/bkt.engine.ts`, `src/memory/longterm.memory.ts`, and `src/components/ChatPanel.tsx` as the directly connected surfaces.
- Follow-up Graphify query after regeneration found `src/memory/evidence.mastery.ts`, `gateModelSummaryMastery()`, `masteryFromEvidenceAttempt()`, `MemoryOrchestrator`, and `BKTEngine`.

## Integration Decisions

- Added a pure local evidence policy adapter in `src/memory/evidence.mastery.ts`.
- Model-summary learning-book updates preserve existing mastery instead of accepting model-proposed mastery.
- Chat-derived `addOrUpdateConcept` writes now keep mastery gated and move confidence separately.
- New model-summary concepts start at `mastery: 0` and BKT prior `p_learn: 0.2`.
- BKT attempts now update both `p_learn` and `mastery` through recognition, generation, and transfer caps.
- Added `tests/evidence-mastery.test.mjs` and included the helper in the test bundle.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: initial sandbox run failed on local socket binding; escalated rerun passed, 10 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin Activity, Study/Chat, and Revision surfaces loaded without visible errors.
- Graphify regenerated from a clean temporary worktree with this phase's source files copied in, old graph artifacts outside the scan root, and source paths in `graph.json` verified as relative.
- Graphify query smoke found the new evidence-mastery helper and memory/BKT neighbors.

## Remaining Work

- Add durable local evidence and mastery-delta tables after a Dexie migration plan.
- Surface evidence events in Admin beyond the current activity ledger.
- Wire active recall/revision submissions into explicit BKT evidence paths where the UI does not already do so.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 64: Live Brain-Flow Signal Anchors

Packet ABR turns Brain Flow Coverage from aggregate gate counts into compact
live proof cards. The thirteen readiness rules stay unchanged, but each signal
now carries inspectable request ids, row sources, latest timestamps, and context
PDF ids when the live ledger contains proof.

Current conservative brain-architecture completion estimate after final gates:
about 83%.

## Graphify Context

- `graphify query "remaining brain architecture gaps after ABQ live
provider-key chat voice end-to-end proof stored injected tool calling both agent
layers Admin Beta Diagnostics multi-PDF context transcript memory tool jobs
model runs current source files" --budget 10000 --graph graphify-out/graph.json`
  routed the slice through `beta.diagnostics.ts`, `AdminView.tsx`,
  `tool.jobs.ts`, `longterm.memory.ts`, `memory.orchestrator.ts`,
  `ChatPanel.tsx`, `brain.context.ts`, and focused tests.
- `graphify query "Admin Beta Diagnostics live anchors request ids signal
evidence User Brain Architecture Tutor System Architecture App Design Language
source files" --budget 7000 --graph graphify-out/graph.json` confirmed the
  directly connected Admin/design/doc surfaces.

## Integration Decisions

- Added `BetaBrainFlowSignalEvidence` so every signal can carry compact live
  anchors.
- Kept raw prompt context, transcript text, and private model internals out of
  the diagnostics payload.
- Rendered request, source, context-PDF, and latest-time chips in Admin Brain
  Flow cards.
- Updated User Brain Architecture, Tutor System Architecture, the in-app Tutor
  Architecture book, App Design Language, and README wording.

## Verification Evidence

- `npm run brain:postchange -- --reason skill-preflight`: unavailable because
  current `package.json` has no `brain:postchange` script.
- Focused beta diagnostics bundle: passed, 12 tests.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 143 tests.
- `npm run build`: passed.
- In-app Browser QA at `1440x1000` confirmed Admin Beta Diagnostics renders
  all 13 `Live anchors` blocks, all 13 empty-live-ledger messages, and the
  chat/voice multi-PDF context signals.
- In-app Browser QA at `390x844` confirmed the same 13 anchor blocks and
  empty-live-ledger messages with `scrollWidth: 390`, `bodyScrollWidth: 390`,
  and no horizontal overflow.
- In-app Browser QA opened Revision > App Design Language > Local Beta Control
  Patterns and confirmed the live request, row-source, timestamp, and
  context-PDF anchor copy with no mobile overflow.
- In-app Browser QA opened Revision > Tutor System Architecture > Analytics
  And Admin and confirmed the live request id, context PDF id, and beta-signal
  proof question copy with no mobile overflow.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because current `package.json` has no `brain:postchange` script.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with `1032` nodes, `1829` edges, and `67` communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`76.9 KB`).
- Graphify smoke query found `BetaBrainFlowSignalEvidence`,
  `buildSignalEvidence()`, `buildBrainFlowCoverageFromLedgers()`,
  `AdminView()`, and connected Beta Diagnostics nodes.
- Graphify path `buildSignalEvidence()` to `AdminView()` found a two-hop route
  through `buildBrainFlowCoverageFromLedgers()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when live traffic is in
  scope, then use the request-anchor chips to confirm real ledger rows fill the
  thirteen signals together.
- Continue broader local beta validation across real Study, Chat, Voice, Admin,
  Revision, corrections, retrieval, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 65: Dual-Agent Tool Contract And Playback Clarity

Packet ABS strengthens the local synthetic rehearsal so it proves the shared
typed-chat/live-voice tool layer by required schema, not only by tool name. It
also simplifies the Admin activity explanation and keeps audio overview retry
behavior hidden inside the single visible player.

Current conservative brain-architecture completion estimate after final gates:
about 84%.

## Graphify Context

- `graphify query "chat voice both agent layers tool calling stored injected
request id provider key live proof source files ChatPanel voice agent tool jobs
memory orchestrator Beta Diagnostics" --budget 9000 --graph
graphify-out/graph.json` routed the slice through `brain.rehearsal.ts`,
  `chatAgentTools.ts`, `voiceAgentTools.ts`, `AdminView.tsx`,
  `brain.context.ts`, and focused rehearsal tests.
- `graphify query "audio overview local fallback visible play button fallback
background same ui component source files Audio Overview voice RevisionView
AdminView" --budget 9000 --graph graphify-out/graph.json` routed the playback
  clarity work through `RevisionView.tsx`, `chapterAudioOverviews.ts`, and
  book/design copy.
- `graphify path "runLocalBrainWiringRehearsal()" "AdminView()" --graph
graphify-out/graph.json` found a two-hop route through
  `buildBrainFlowCoverageFromLedgers()`.
- `graphify path "buildBrainContextPacket()" "ChatPanel()" --graph
graphify-out/graph.json` found a two-hop route through `ChatPanel.tsx`.

## Integration Decisions

- Added `BrainWiringToolContract` rows to compare the shared required
  parameters for `update_graph`, `generate_flashcards`, `evaluate_answer`,
  `look_at_current_page`, and `web_search` across chat and voice.
- Added a `Shared tool schemas` rehearsal check and Admin schema-check chips.
- Kept the synthetic rehearsal in memory only; it still writes no Dexie rows,
  calls no providers, enters no exports, and cannot raise live beta readiness.
- Simplified the Admin Activity introduction so it is readable before the user
  reaches meters and timelines.
- Kept audio overview retry behavior inside the existing player and removed
  visible playback-retry fallback wording; true media-unavailable errors still
  render as an error state.
- Updated User Brain Architecture, Tutor Architecture Library JSON, README,
  Tutor System Architecture, and App Design Language copy.

## Verification Evidence

- Focused rehearsal bundle passed: `node --test tests/brain-rehearsal.test.mjs`
  reported 4/4 tests passing.
- Focused audio overview test passed: `node --test
tests/audio-overview-plan.test.mjs` reported 6/6 tests passing.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run audio:overview:dry-run`: passed with 25 present and 0 missing
  stored guide assets.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because current `package.json` has no `brain:postchange` script.
- `npm run lint`: passed.
- `npm run test`: passed, 143 tests.
- `npm run build`: passed.
- In-app Browser QA on Admin desktop confirmed the simplified activity
  paragraph, synthetic ready state, provider-key ready state, shared schema
  checks for the five shared tools, no old retry/fallback text, and no
  horizontal overflow at `1280px`.
- In-app Browser QA on Admin mobile at `390x844` confirmed shared schema
  checks, shared tool schema card, synthetic ready, provider-key ready, no old
  retry/fallback text, and no horizontal overflow.
- In-app Browser QA on Revision mobile at `390x844` confirmed the User Brain
  Architecture audio guide surface has exactly one visible Play button, one
  hidden `audio.sr-only` element, three speed controls, no old retry/fallback
  wording, and no horizontal overflow.
- In-app Browser QA on Revision desktop at `1440x1000` confirmed the same
  single-player audio surface with one Play button, one hidden audio element,
  three speed controls, no old retry/fallback wording, and no horizontal
  overflow.
- Browser console warning/error logs were empty for the final desktop audio
  pass.
- `graphify update . --force`: passed, regenerating code architecture
  artifacts with `1036` nodes, `1838` edges, and `66` communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`77.2 KB`).
- Graphify smoke query found `BrainWiringToolContract`,
  `buildToolContracts()`, `runLocalBrainWiringRehearsal()`,
  `buildChatAgentToolDefinitions()`, `VOICE_AGENT_TOOL_DEFINITIONS`,
  `AdminView()`, and connected rehearsal nodes.
- Graphify path `buildToolContracts()` to `AdminView()` found a three-hop
  route through `runLocalBrainWiringRehearsal()` and
  `buildBrainFlowCoverageFromLedgers()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Commit and push Packet ABS.
- Continue toward live provider-key chat/voice proof after this local contract
  slice passes.

# brain architecture implementation program: phase 3 report

## Scope

Phase 3 adds a local durable evidence ledger for learner-state changes. It preserves the phase 2 rule that model summaries do not raise mastery, while making those summaries inspectable as evidence records and recording BKT mastery deltas from explicit recall attempts.

## Graphify Context

- Graphify routed the slice through `src/memory/longterm.memory.ts`, `src/memory/evidence.mastery.ts`, `src/memory/bkt.engine.ts`, `src/memory/memory.orchestrator.ts`, and `src/views/AdminView.tsx`.
- Revision and Chat were inspected only for connected recall/tool surfaces. Revision flashcard review currently updates scheduling, not BKT concept attempts.

## Integration Decisions

- Added Dexie v8 tables for `evidenceEvents`, `masteryDeltas`, and `toolJobs`.
- Added `src/memory/evidence.ledger.ts` for local evidence event and mastery-delta records.
- `MemoryOrchestrator` writes durable model-summary evidence for learning-book concept updates and chat graph updates.
- `BKTEngine` writes durable recall evidence plus mastery deltas after explicit BKT attempts.
- Admin now includes an `Evidence Ledger` tab for durable evidence counts, recent evidence events, BKT mastery deltas, and the local tool-job table.
- Durable `ToolJob` writes are deferred; the table is present and surfaced, while runtime tool calls continue to use the phase 1 in-memory system activity ledger.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 12 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin opened, `Evidence` tab rendered, evidence/mastery/tool-job sections appeared, and no visible Dexie/runtime errors were present.
- Graphify regenerated from clean committed source in a temporary worktree; query smoke found `evidence.ledger.ts`, `EvidenceEvent`, `MasteryDelta`, `ToolJob`, `AdminView`, and `BKTEngine`.

## Remaining Work

- Wire Revision flashcard/review controls to BKT attempts where concept IDs are available.
- Persist runtime tool execution into `toolJobs` with retry/dead-letter states.
- Add correction/deletion propagation over evidence and mastery deltas.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 4 report

## Scope

Phase 4 makes tool-call observability durable in the local beta store. The server still owns the live in-memory activity ledger, but chat streams now emit structured `tool_job` events and ChatPanel persists them into Dexie so Admin can inspect tool execution history after the stream finishes.

## Graphify Context

- Graphify routed this slice through `server.ts`, `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/views/AdminView.tsx`, and `src/memory/evidence.ledger.ts`.
- The directly relevant server paths were `/api/chat` tool-call execution branches for `look_at_current_page`, `web_search`, `update_graph`, `generate_flashcards`, and unsupported tools.

## Integration Decisions

- Added compact `tool_job` SSE events for tool execution running/completed/failed/blocked states.
- Added `src/memory/tool.jobs.ts` to normalize statuses, create stable local IDs, compact summaries, and upsert tool jobs into Dexie.
- ChatPanel now records `tool_job` stream events into `db.toolJobs`.
- Admin Evidence Ledger now presents Tool Jobs as active durable records instead of a future placeholder.
- Raw tool arguments are not stored; the server sends compact summaries and redacted metadata.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 15 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: Admin Evidence tab rendered the durable Tool Jobs section and empty state; browser console had 0 warnings/errors; smoke screenshot saved at `results/admin-tool-jobs-smoke.png`.
- Graphify regenerated from a stable temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke: 516 nodes, 847 edges, no temp-path markers in checked graph artifacts, and `graphify query "recordToolJobEvent createToolJobRecord tool.jobs ToolJobEventInput" --budget 1600 --graph graphify-out/graph.json` returned `tool.jobs.ts`, `recordToolJobEvent()`, `createToolJobRecord()`, `normalizeToolJobStatus()`, and `ToolJobEventInput`.

## Remaining Work

- Add durable retry queues and dead-letter review states.
- Persist server-side worker execution when a real local/remote queue exists.
- Wire Revision flashcard/review controls to BKT attempts where concept IDs are available.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 5 report

## Scope

Phase 5 wires Revision flashcard self-grading into verified local learner evidence where a flashcard has a real persisted concept ID. It keeps current scheduling behavior intact and deliberately skips placeholder `general` cards so model-generated flashcards do not fabricate mastery changes.

## Graphify Context

- Graphify routed this slice through `src/views/RevisionView.tsx`, `src/memory/bkt.engine.ts`, `src/memory/evidence.ledger.ts`, `src/memory/longterm.memory.ts`, `src/components/ChatPanel.tsx`, and `src/memory/memory.orchestrator.ts`.
- Read-only sidecar Peirce confirmed `FlashcardUI` sends quality scores, `handleReview` only scheduled cards before this phase, BKT requires `db.concepts`, and most current generated cards default to `general`.

## Integration Decisions

- Added `src/memory/revision.evidence.ts` to gate flashcard evidence before BKT.
- Flashcard reviews are treated as generation evidence because the learner recalls before self-grading.
- `quality >= 4` is correct; `0` and `2` are incorrect.
- `general` or missing concept IDs skip mastery evidence but still allow normal flashcard scheduling.
- `BKTEngine.updateConceptAttempt` now accepts optional evidence source, summary, and metadata so Admin evidence can distinguish `revision_flashcard` from generic BKT attempts.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 19 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001/revision`: Revision loaded the active General Study learning book; Admin Evidence tab still rendered; browser console had 0 warnings/errors; smoke screenshot saved at `results/revision-flashcard-evidence-smoke.png`.
- Graphify regenerated from a stable temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke: 530 nodes, 871 edges, no temp-path markers in checked graph artifacts, and `graphify query "revision.evidence recordFlashcardReviewEvidence flashcardReviewOutcome bktEngine updateConceptAttempt" --budget 1800 --graph graphify-out/graph.json` returned `revision.evidence.ts`, `recordFlashcardReviewEvidence()`, `flashcardReviewOutcome()`, `RevisionView.tsx`, and `bkt.engine.ts`.

## Remaining Work

- Improve flashcard generation so cards attach real concept IDs where possible.
- Bridge `learningBookConcepts` to BKT-capable persisted concepts or define a separate mastery path.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 6 report

## Scope

Phase 6 makes generated flashcards more useful to the evidence-gated learner brain by attaching them to real concepts when there is a strong local signal. It keeps the safety invariant from phase 5: ambiguous flashcards remain `general` and cannot change mastery.

## Graphify Context

- Graphify routed this slice through `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/memory/memory.orchestrator.ts`, `src/memory/revision.evidence.ts`, and `server.ts`.
- The relevant write paths were manual assistant-message flashcard generation and streamed `flashcardsUpdates` from the chat tool loop.

## Integration Decisions

- Added `src/memory/flashcard.concepts.ts` for generated-card concept resolution.
- Explicit non-placeholder concept IDs are preserved.
- Cards without explicit IDs only link to active learning-book concepts when the concept name appears in the card text.
- Matched learning-book concepts are mirrored into `db.concepts` with BKT defaults so Revision flashcard reviews can create verified mastery deltas.
- Server flashcard schemas accept optional `conceptId`; clients still validate and conservatively resolve before storage.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 24 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://localhost:3001`: app loaded, Study/Revision/Admin navigation controls were reachable, Admin Evidence controls were present, and browser console had 0 warnings/errors. Screenshot capture timed out in the in-app browser, so this phase records DOM/log smoke evidence only.
- Graphify regenerated from a stable temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke: 547 nodes, 905 edges, no temp-path markers in checked graph artifacts, and `graphify query "flashcard.concepts createFlashcardForStorage chooseFlashcardConcept persistentConceptFromLearningBookConcept ChatPanel" --budget 1800 --graph graphify-out/graph.json` returned `flashcard.concepts.ts`, `createFlashcardForStorage()`, `chooseFlashcardConcept()`, `persistentConceptFromLearningBookConcept()`, and `ChatPanel.tsx`.

## Remaining Work

- Add richer source-aware concept matching once there is enough beta data to tune false positives.
- Unify `learningBookConcepts` and BKT concepts more deeply if the local mirror proves useful.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 7 report

## Scope

Phase 7 adds local runtime tuning for the learner-brain architecture. It turns Admin from an observability-only surface into a local beta control plane for source-vs-web behavior, tool loop budget, memory context size, and activity polling. AWS/cloud remains deferred.

## Graphify Context

- Graphify routed the slice through `src/views/AdminView.tsx`, `src/store/index.ts`, `src/components/ChatPanel.tsx`, `server.ts`, `server/web-search.ts`, and the existing evidence/tool observability surfaces.
- Sidecar Boyle audited the proposed tuning slice read-only and identified tool-loop, manual-search, Admin refresh, and formatting-coverage risks.

## Integration Decisions

- Added `src/lib/brainRuntimeSettings.ts` for shared runtime defaults, bounds, policy types, and normalization.
- Persisted `brain_runtime_settings` in Zustand/localStorage with partial updates and reset-to-defaults.
- Added Admin `Runtime Tuning` tab with policy buttons, bounded sliders, current local setting meters, model behavior context, and local-only contract notes.
- Wired ChatPanel to send normalized runtime settings and the explicit Web Search UI flag in `/api/chat` requests.
- Server now normalizes runtime settings, records them in system activity metadata, applies `toolIterationLimit`, suppresses automatic freshness search in `manual_only`, and aligns model instructions with the active policy.
- Activity polling now uses the configured refresh interval and avoids overlapping fetches.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 27 tests.
- `npm run build`: passed.
- Browser QA on `http://localhost:3001`: Admin Activity loaded; Runtime Tuning rendered; Manual Only updated the visible policy summary; Reset defaults restored Source First and disabled the reset button; mobile viewport showed the Tuning tab and runtime controls; browser warning/error logs were 0.
- Browser screenshot was emitted during QA. Saving the screenshot artifact from the browser runtime to `.workflow/.../results/` was blocked by the browser runtime filesystem permissions.
- Graphify regenerated from a clean temporary worktree with only this phase's source files copied in, preserving unrelated local PDF/StudyView edits.
- Graphify artifact smoke after rebase: 566 nodes, 943 edges, no temp-path markers in checked graph artifacts, and query smoke returned `brainRuntimeSettings.ts`, `normalizeBrainRuntimeSettings()`, `AdminView()`, `ChatPanel.tsx`, and store/runtime-setting nodes.

## Remaining Work

- Extend `memoryConceptLimit` beyond the active-book concept list if beta behavior shows broader semantic-memory retrieval needs explicit bounding.
- Add full fake streaming model/tool-call policy tests when the chat loop has a lighter test harness.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 8 report

## Scope

Phase 8 makes chat model behavior durable and inspectable. It adds a local model-run ledger for blocked requests, starts, fallbacks, completions, failures, usage, runtime settings, and request metadata, then exposes that ledger in Admin.

## Graphify Context

- Graphify routed the main slice through `server.ts`, `src/components/ChatPanel.tsx`, `src/memory/longterm.memory.ts`, `src/memory/tool.jobs.ts`, `src/views/AdminView.tsx`, and `src/store/index.ts`.
- A follow-up graph query routed the mobile QA visibility issue through `src/App.tsx`, `GsapRouteFrame()`, and `AdminView()`.

## Integration Decisions

- Added Dexie schema version 9 with `modelRuns` as an append-only local observability table.
- Added `src/memory/model.runs.ts`, mirroring the durable tool-job helper style for status normalization, stable IDs, compact errors, and numeric clamping.
- Added `model_run` SSE events for `/api/chat` blocked, started, fallback, completed, and failed states.
- Persisted `model_run` events in `ChatPanel` so Admin can query them locally through IndexedDB.
- Added an Admin `Model Runs` tab for durable run counts, blocked/failed/fallback meters, recent run cards, runtime settings, and metadata details.
- Added route/Admin animation visibility fallbacks after browser QA found that mobile reloads could leave mounted Admin content hidden at `autoAlpha: 0`.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 31 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Activity loaded, Model Runs empty state rendered, a real blocked chat request through `ChatPanel` persisted one durable blocked model run, and the Model Runs tab displayed request id, provider, model, error, timing, and runtime metadata affordance.
- Mobile browser QA at 390x844: Admin and Model Runs rendered without horizontal overflow after the route/Admin animation guard.
- Browser screenshot capture timed out through the in-app browser CDP path, so this phase records DOM/viewport evidence rather than screenshot artifacts.
- `graphify update . --force`: regenerated the code architecture graph with 609 nodes, 998 links, and 38 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits, then regenerated again after rebasing over the remote Graphify refresh.
- `npm run graphify:tree`: passed and regenerated `graphify-out/GRAPH_TREE.html`.
- Graphify artifact smoke: no `/private/tmp` or phase temp path markers, and query smoke returned `model.runs.ts`, `createModelRunRecord()`, `recordModelRunEvent()`, `ModelRun`, `AdminView()`, and `ChatPanel()`.

## Remaining Work

- Add completed/fallback model-run integration tests with a fake streaming model harness.
- Decide whether server-side model-run persistence is needed once there is a local worker or queue.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 9 report

## Scope

Phase 9 adds durable local memory events for the learner-brain runtime. It makes session starts, saved interactions, learning-book writes, learning-concept writes, and graph concept updates inspectable from Admin without introducing AWS/cloud synchronization.

## Graphify Context

- Graphify routed the slice through `src/memory/longterm.memory.ts`, `src/memory/memory.orchestrator.ts`, `src/memory/evidence.ledger.ts`, `src/views/AdminView.tsx`, and existing model/tool/evidence observability helpers.
- Follow-up Graphify smoke after regeneration returned `memory.events.ts`, `MemoryEvent`, `createMemoryEventRecord()`, `recordMemoryEvent()`, `MemoryOrchestrator`, and `AdminView()`.

## Integration Decisions

- Added Dexie schema version 10 with an append-only `memoryEvents` table.
- Added `src/memory/memory.events.ts` for event normalization, compact records, confidence clamping, deduped source IDs, and non-blocking IndexedDB writes.
- Wired `MemoryOrchestrator` to record memory events for session start, interaction persistence, learning-book updates, learning-book concept updates, and chat graph concept writes.
- Added Admin `Memory Events` with durable counts, event mix, recent writes, latest context, source/metadata expansion, and clear user-brain-vs-Graphify boundary copy.
- Kept cloud sync, background queues, and AWS worker behavior out of scope for beta.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 35 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Memory rendered on desktop and mobile, displayed a real `session started` memory event from IndexedDB, had no horizontal overflow at 1280x900 or 390x844, and browser warning/error logs were 0.
- Browser screenshot save to `.workflow/.../results/admin-memory-events-smoke.png` was blocked by browser runtime filesystem permissions (`EPERM`), so this phase records DOM/log QA evidence instead.
- `graphify update . --force`: regenerated the code architecture graph with 624 nodes, 1029 edges, and 44 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke: no `/private/tmp` or phase stash markers were found in checked graph artifacts.

## Remaining Work

- Add retrieval-context memory events once broader semantic retrieval tuning lands.
- Decide during beta whether memory events need local retry/dead-letter handling.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 10 report

## Scope

Phase 10 adds durable local retrieval events for semantic memory context selection. It closes the Admin gap between "memory writes happened" and "which memory context was selected for a chat request" while keeping AWS/cloud synchronization out of scope.

## Graphify Context

- Graphify routed the slice through `src/memory/memory.orchestrator.ts`, `src/memory/longterm.memory.ts`, `src/views/AdminView.tsx`, `src/components/ChatPanel.tsx`, and `src/memory/learner.model.ts`.
- Path checks confirmed Admin reaches retrieval data through Dexie storage and ChatPanel reaches retrieval through `MemoryOrchestrator.getRelevantContext()`.

## Integration Decisions

- Added Dexie schema version 11 with an append-only `retrievalEvents` table.
- Added `src/memory/retrieval.events.ts` for local event normalization, stable IDs, compact fields, selected ID/name dedupe, score bounds, and non-blocking persistence.
- Instrumented `MemoryOrchestrator.getRelevantContext()` to record completed and failed retrievals with query summary, active-book/page filters, candidates, selections, scores, context size, tutor-instruction size, latency, and metadata.
- Added Admin `Retrieval Events` with durable counts, recent retrieval cards, selected concept chips, metadata details, and local-only semantic-memory boundary copy.
- Fixed a live Admin shell horizontal overflow found during browser QA.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 39 tests.
- `npm run build`: passed.
- `npm run format:check`: still fails only on pre-existing `src/views/RevisionView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: a real ChatPanel prompt created a completed retrieval event before the no-key chat request was blocked; Admin Retrieval displayed the query, completed status, context chars, selection counts, and boundary copy.
- Desktop browser QA at 1280x900: Retrieval tab rendered with document width matching viewport width and browser warning/error logs were 0.
- Mobile browser QA at 390x844: Retrieval tab and ledger rendered with document width matching viewport width and browser warning/error logs were 0.
- Browser screenshot emission worked during QA; saving screenshot files to `.workflow/.../results/` was blocked by browser runtime filesystem permissions (`EPERM`).

## Remaining Work

- Add richer retrieval ranking diagnostics after beta usage clarifies which scores are worth tuning.
- Decide whether retrieval failures need local retry/dead-letter states.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 11 report

## Scope

Phase 11 adds the first local memory-control path: durable correction and deletion-review requests. It makes "this memory is wrong" and "review this for deletion" visible and auditable before any destructive propagation is automated.

## Graphify Context

- Local Graphify routed the slice through `src/lib/userBrainArchitectureBook.ts`, `src/memory/longterm.memory.ts`, `src/memory/memory.events.ts`, and `src/views/AdminView.tsx`.
- Path checks confirmed Admin reaches `MemoryEvent` and `db` directly through `AdminView.tsx`.
- The MCP graph looked stale for this checkout, so the local `graphify-out/graph.json` CLI was used for source routing.

## Sidecar Results

- Kuhn recommended durable artifact/citation state as a high-value next slice.
- Anscombe recommended a non-destructive Beta Diagnostics/export tab as a safe Admin data-management slice.
- This phase chose correction requests because the architecture book explicitly calls memory correction/deletion a launch gate. Artifact/citation state and beta diagnostics remain follow-up candidates.

## Integration Decisions

- Added Dexie schema version 12 with append-only `correctionEvents`.
- Added `src/memory/correction.events.ts` for local correction event normalization, stable IDs, compact fields, related event IDs, and non-blocking persistence.
- Added Admin `Correction Requests` navigation, meters, recent request cards, manual request form, target mix, and local-only boundary copy.
- Added quick actions to Memory Events rows for `Mark wrong` and `Request deletion`.
- Kept this phase non-destructive: it records correction/deletion intent but does not yet invalidate derived summaries, embeddings, graph facts, or mastery deltas.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 43 tests.
- `npm run build`: passed.
- Browser QA on `http://127.0.0.1:3100`: a Memory Events quick action wrote a correction request, the Corrections tab displayed it, and the manual request form wrote a second request.
- Desktop browser QA at 1280x900: Correction Requests rendered with document width matching viewport width and browser warning/error logs were 0.
- Mobile browser QA at 390x844: Correction Requests rendered with document width matching viewport width and browser warning/error logs were 0.
- `npm run format:check`: expected to keep failing only on pre-existing `src/views/RevisionView.tsx`.

## Remaining Work

- Propagate correction/deletion state into derived memories, embeddings, graph facts, mastery deltas, tutor preferences, and exports where practical.
- Add source artifact/citation state ledgers.
- Add non-destructive beta diagnostics/export.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 12 report

## Scope

Phase 12 adds durable local source artifact and citation-state tracking. It turns streamed web-search source cards and source failures into inspectable local records without claiming that captured sources are verified.

## Graphify Context

- Graphify routed the slice through `src/lib/userBrainArchitectureBook.ts`, `src/components/ChatPanel.tsx`, `src/views/AdminView.tsx`, `src/memory/longterm.memory.ts`, and prior tool/model/retrieval ledgers.
- The architecture book calls out `ArtifactRecord`, `CitationState`, `artifact.ready`, and `citation.verified` as required runtime contracts. This phase implements the local record layer while keeping actual verification as a future explicit state transition.

## Integration Decisions

- Added Dexie schema version 13 with `artifactRecords` and `citationStates`.
- Added `src/memory/artifact.records.ts` for stable source-card artifact IDs, linked citation-state IDs, conservative state normalization, compact metadata, and non-blocking IndexedDB writes.
- Wired ChatPanel web-search streams to persist source cards as ready artifacts with `checking` citation states and to persist unavailable citation states when a search returns no sources or errors.
- Added compact `citation checking` chips to source cards.
- Added Admin `Source Artifacts` / `Artifacts & Citations` with meters, recent source artifacts, citation states, state mix, artifact mix, boundary copy, and review actions into the correction-request ledger.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 48 tests.
- `npm run build`: passed.
- `npm run format:check`: expected failure only on pre-existing `src/views/RevisionView.tsx` formatting.
- Browser QA on `http://127.0.0.1:3100`: Admin `Artifacts & Citations` rendered on desktop and mobile, boundary copy was visible, document width matched viewport width, and browser warning/error logs were 0.
- Browser screenshot saving to `.workflow/.../results/admin-source-artifacts-smoke.png` was blocked by browser runtime filesystem permissions (`EPERM`), so this phase records DOM/log QA evidence.
- `graphify update . --force`: regenerated the code architecture graph with 688 nodes, 1158 edges, and 47 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or phase stash markers in checked graph artifacts.
- Graphify query smoke returned `artifact.records.ts`, `ArtifactRecord`, `CitationState`, `recordWebSourceArtifact()`, `recordUnavailableCitationState()`, `AdminView()`, and `ChatPanel()`.

## Remaining Work

- Add an explicit local citation verifier before any source can move from `checking` to `verified`.
- Link generated notes, charts, code, flashcards, and other artifacts into the same `ArtifactRecord` table.
- Add non-destructive beta diagnostics/export.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 13 report

## Scope

Phase 13 adds local beta diagnostics and a capped JSON export path. It turns the Admin observability ledgers into reviewable readiness gates for local beta work without introducing AWS/cloud synchronization.

## Graphify Context

- Graphify routed the slice through `AdminView()`, `src/views/AdminView.tsx`, `src/memory/longterm.memory.ts`, `src/memory/artifact.records.ts`, correction events, model runs, retrieval events, and runtime settings.
- The architecture book calls out beta gates, artifact verification state, correction/export propagation, and cloud boundaries. This phase implements a local diagnostic snapshot and explicitly keeps cloud sync deferred.

## Integration Decisions

- Added `src/memory/beta.diagnostics.ts` for pure readiness snapshot and export payload building.
- Added Admin `Beta Diagnostics` with overall status, gate cards, export contents, runtime context, and out-of-scope boundaries.
- Added a local browser JSON export that packages currently loaded Admin ledger samples with `localOnly` metadata.
- Kept the export non-destructive and local-only. It is not a backup, cloud migration, or production-readiness certificate.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 51 tests.
- `npm run build`: passed.
- `npm run format:check`: expected failure only on pre-existing `src/views/RevisionView.tsx` formatting.
- Browser QA on `http://127.0.0.1:3100`: Admin `Beta Diagnostics` rendered on desktop and mobile, export feedback appeared after clicking `Export diagnostics JSON`, document width matched viewport width, and browser warning/error logs were 0.
- `graphify update . --force`: regenerated the code architecture graph with 703 nodes, 1179 edges, and 55 communities after temporarily stashing only unrelated `PdfViewer`/`StudyView` dirty edits.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or phase stash markers in checked graph artifacts.
- Graphify query smoke returned `beta.diagnostics.ts`, `buildBetaDiagnosticsSnapshot()`, `buildBetaDiagnosticsExport()`, and `AdminView()`.

## Remaining Work

- Add an explicit local citation verifier before any source can move from `checking` to `verified`.
- Link generated notes, charts, code, flashcards, and other artifacts into the same `ArtifactRecord` table.
- Propagate correction/deletion state into derived memories, embeddings, graph facts, mastery deltas, tutor preferences, and exports where practical.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 14 report

## Scope

Phase 14 adds a local non-destructive correction propagation layer, Admin request
timelines, the existing Study/Pdf PDF chip UI fixes, and in-app architecture book
updates. It keeps AWS/cloud synchronization and hard deletion out of scope.

## Graphify Context

- Graphify routed the correction slice through `CorrectionEvent`,
  `src/memory/correction.events.ts`, `src/memory/longterm.memory.ts`,
  `src/memory/beta.diagnostics.ts`, and `src/views/AdminView.tsx`.
- Graphify routed the book/design updates through `src/lib/tutorBook.json`,
  `src/lib/userBrainArchitectureBook.ts`, and `RevisionView` built-in books.
- Sidecar Curie recommended local correction propagation overlays as the next
  highest-value trust slice after beta diagnostics.
- Sidecar Confucius recommended Admin request timelines to group system events,
  model runs, and tool jobs by request id.

## Integration Decisions

- Added propagation helpers that resolve correction targets across local Dexie
  ledgers and apply conservative metadata overlays instead of hard deletion.
- Correction requests now mark affected evidence/mastery rows unverified,
  memory/retrieval rows skipped, artifacts stale/conflicting, and citation
  states unsupported/conflicting where practical.
- Admin correction requests can be applied, dismissed, or blocked, and manual or
  quick actions attempt overlay application immediately.
- Beta Diagnostics now counts propagated correction rows and includes a
  `correctionOverlay` export section.
- Admin System Activity now renders request timelines grouped by `requestId`.
- The Study PDF chip rail and reduced PDF top padding are included in this
  pushed phase.
- Tutor System Architecture, User Brain Architecture, and App Design Language
  built-in books were updated to describe the current local beta architecture.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 53 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Admin request timelines rendered,
  Memory quick action applied a non-destructive correction overlay, Corrections
  showed overlay counts and applied state, Beta Diagnostics export feedback
  appeared, Study rendered the compact PDF chip rail, and App Design Language
  opened the new Local Beta Control Patterns chapter.
- Mobile browser QA at 390x844: Admin rendered without horizontal overflow and
  browser warning/error logs were 0.
- Screenshot file writes to `.workflow/.../results/` were blocked by browser
  runtime filesystem permissions (`EPERM`), so this phase records emitted
  browser screenshots plus DOM/log evidence.
- `graphify update . --force`: regenerated the code architecture graph with 736
  nodes, 1247 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp` paths, or
  temp-test markers in checked graph artifacts.
- Graphify query smoke returned `correction.events.ts`,
  `buildCorrectionPropagationPatch()`, `applyCorrectionPropagation()`,
  `buildBetaDiagnosticsExport()`, `AdminRequestTimeline`, and `AdminView()`.
- Final-check sidecar found one zero-row overlay display issue; Admin now only
  shows the green overlay-applied card when propagated rows are greater than 0.

## Remaining Work

- Final review agent, commit, and push remain for this phase.
- Full correction replay over embeddings, graph facts, generated summaries, and
  tutor preferences remains a future implementation slice.
- Add an explicit local citation verifier before any source can move from
  `checking` to `verified`.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 15 report

## Scope

Phase 15 adds the first explicit local citation-state transition layer. It lets
Admin run a source-card integrity check that can move citation rows from
`checking` to `verified`, `unavailable`, `conflicting`, or `unsupported` while
staying clear that this is local source-card integrity, not external factual
proof.

## Graphify Context

- Graphify routed the slice through `src/memory/artifact.records.ts`,
  `CitationState`, `ArtifactRecord`, `src/memory/beta.diagnostics.ts`, and
  `AdminView()`.
- The architecture books routed through `src/lib/tutorBook.json`,
  `src/lib/userBrainArchitectureBook.ts`, and the built-in App Design book in
  `RevisionView`.
- Sidecar Lagrange recommended keeping this as a local citation-state transition
  layer rather than a truth oracle.

## Integration Decisions

- Added `verifyLocalCitationIntegrity()` and Dexie wrappers for artifact-level
  and citation-level local checks.
- The verifier checks artifact/citation linkage, URL shape, domain consistency,
  explicit source refs/source ids/search ids, and saved source-card structure.
- It records `localOnly: true` and `externalContentFetched: false` in verifier
  metadata.
- Placeholder source refs, citation ids, claim ids, and artifact ids do not count
  as source evidence.
- URL query strings and hashes participate in the local URL comparison, so
  query-identified sources cannot be silently treated as the same row.
- Artifact `ready` remains distinct from citation `verified`.
- Beta Diagnostics now counts and summarizes `conflicting`, `unsupported`, and
  `not_checked` citation states.
- Admin Source Artifacts now shows a `Run local check` control, verifier feedback,
  and a `Not checked` meter.
- Tutor System Architecture, User Brain Architecture, and App Design Language
  books were updated to describe the local verifier boundary.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 61 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Source Artifacts rendered with the
  local-verifier boundary, `Not checked` meter, no horizontal overflow, and zero
  browser warning/error logs. Beta Diagnostics rendered source-grounding watch
  copy. User Brain and App Design books rendered the updated local verifier
  content.
- Clean Graphify regeneration after removing the generated `server.mjs`: rebuilt
  the code architecture graph with 725 nodes, 1263 edges, and 53 communities.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or phase-stash markers in checked graph artifacts.
- Graphify query smoke returned `verifyLocalCitationIntegrity()`,
  `isPlaceholderSourceRef()`, `verifyArtifactCitationIntegrity()`,
  `verifyCitationStateIntegrity()`, `buildBetaDiagnosticsSnapshot()`, and
  `AdminView()`.
- Final-check sidecar Descartes found one placeholder-source over-claim and two
  clarity issues. The phase now includes regression tests for placeholder refs
  and query/hash URL conflicts, plus visible `not_checked` diagnostics.
- Final recheck sidecar Hume found no must-fix remaining.

## Remaining Work

- Phase 15 was committed and pushed before phase 16 began.
- Generated notes, charts, code, flashcards, and other artifacts still need to be
  fully linked into the same `ArtifactRecord` verification path.
- External content verification and source-span claim matching remain future
  slices.
- AWS/cloud synchronization remains out of scope until beta testing.

# brain architecture implementation program: phase 16 report

## Scope

Phase 16 links generated flashcard batches into the local artifact/citation trust
ledger. It keeps the source-card verifier boundary intact: generated flashcard
provenance is visible and reviewable, but stays `not_checked` until a broader
generated-artifact verifier exists.

## Graphify Context

- Graphify routed the slice through `src/memory/artifact.records.ts`,
  `src/components/ChatPanel.tsx`, `AdminView()`, `CitationState`,
  `ArtifactRecord`, and the in-app architecture books.
- Final Graphify regeneration produced 730 nodes, 1280 edges, and 43
  communities. Query smoke returned `supportsLocalCitationIntegrityArtifact()`,
  `createGeneratedFlashcardsArtifactRecords()`,
  `recordGeneratedFlashcardsArtifact()`, `ChatPanel()`, and `AdminView()`.

## Integration Decisions

- Added generated-flashcard artifact record construction and persistence helpers.
- Manual message flashcard generation and streamed chat-tool flashcard batches
  now write local `flashcards` `ArtifactRecord` rows.
- Each generated flashcard batch also writes a `not_checked` citation-state row
  with local provenance metadata: batch id, source message id, card ids, concept
  ids, unresolved-card count, and book context where available.
- Admin now avoids running the source-card local verifier against generated
  flashcard artifacts and shows `No local verifier yet` instead.
- The Dexie verifier wrappers also avoid persisting unsupported verifier
  transitions for non-source-card artifacts, preserving `not_checked`
  provenance until a real verifier exists.
- Tutor System Architecture, User Brain Architecture, and App Design Language
  were updated to describe flashcard artifact provenance and the `not_checked`
  boundary.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 63 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Admin Source Artifacts rendered
  generated-artifact provenance copy, `Not checked`, no horizontal overflow, and
  zero warning/error logs. User Brain, Tutor System Architecture, and App Design
  Language rendered the updated book copy.
- `graphify update . --force`: passed after removing generated dev/test files.
- `npm run graphify:tree`: passed.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or generated `server.mjs` paths.
- Final-check sidecar Plato found a P1 where Admin could mutate flashcard
  provenance out of `not_checked`; this was fixed with a verifier support guard
  and regression coverage.

## Remaining Work

- Link generated charts, code snippets, images, websites, and other artifacts
  into the same reviewable provenance path.
- Add real generated-artifact verification beyond source-card, flashcard, and
  learning-note provenance rows.
- Source-span claim matching and external content verification remain future
  slices.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 27: Admin Verifier Coverage Meter

Phase 27 keeps the source-artifact ledger honest by making verifier coverage
visible in Admin. It does not add new trust claims for unsupported artifact
kinds; instead, it shows how many local artifact rows have a no-fetch integrity
contract and which loaded artifact types still need future contracts.

## Graphify Context

- Graphify routed this slice through `AdminView()`,
  `supportsLocalCitationIntegrityArtifact()`, `artifact.records.ts`,
  `ArtifactRecord`, `CitationState`, and the artifact-record tests.
- A targeted source check found no live chart, code, image, website, preview, or
  other artifact creation paths in the connected runtime; the existing chart row
  is a synthetic unsupported-verifier test fixture.

## Integration Decisions

- Added `isLocallyVerifiableArtifactType()` in `AdminView.tsx`, delegating the
  support matrix to `supportsLocalCitationIntegrityArtifact()`.
- Added Admin Source Artifacts meters for learning-note artifacts and verifier
  coverage percentage.
- Added a local verifier coverage block that reports locally checkable rows,
  rows awaiting a verifier contract, and any loaded unsupported artifact types.
- Kept unsupported chart/code/image/website/preview rows visible as future work
  rather than treating them as verified.

## Verification Evidence

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 80 tests.
- `npm run build`: passed.
- `graphify update . --force`: regenerated the code architecture graph with 841
  nodes, 1423 edges, and 65 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `isLocallyVerifiableArtifactType()`,
  `AdminView()`, and `supportsLocalCitationIntegrityArtifact()`.
- Browser QA on `http://127.0.0.1:3100`: Source Artifacts rendered the new
  coverage block in the in-app browser at 488px width with no horizontal
  overflow and zero warning/error logs.
- Desktop QA through temporary headless Chrome at 1440x1000 confirmed the
  coverage block rendered with no horizontal overflow (`scrollWidth` 1440,
  `clientWidth` 1440).
- Read-only final-check sidecar Kuhn found no blockers. Residual risk: the
  Admin artifact type bucket list is manually maintained and must stay aligned
  with future `ArtifactRecord["artifactType"]` additions.

## Remaining Work

- Add real local provenance contracts before marking chart, code, image,
  website, preview, or other generated artifacts locally verifiable.
- Continue source-span claim matching and external content verification as
  future slices.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 28: Audio Guide Playback Resilience

Phase 28 makes the stored chapter audio guide player recover when the browser
blocks scripted playback from the custom Play button. The MP3 assets were
already present; this slice improves the live reader controls so the user has a
seek slider, clearer playback status, and native browser controls as a fallback.

## Graphify Context

- Graphify routed the slice through `RevisionView()`, `StoredAudioOverview()`,
  `chapterAudioOverviews.ts`, `builtInBookAudioOverviews`, `audio.ts`, and the
  built-in user-brain book.
- A targeted manifest check found 25 audio overview entries across Tutor System
  Architecture, User Brain Architecture, and App Design Language, with 25 local
  MP3 files present and 0 missing.

## Integration Decisions

- Added a seek range input wired to the same local `<audio>` element.
- Added visible native browser audio controls when the custom `audio.play()`
  path is blocked or the media load fails.
- Split playback-blocked fallback status from true media-unavailable status so
  the UI does not claim recovery when the MP3 itself cannot load.
- Updated the architecture docs and in-app books to mention seek and native
  fallback controls without changing the no-live-TTS boundary.

## Verification Evidence

- `npm run audio:overview:dry-run`: passed, 25 present, 0 missing.
- `curl -I /audio-overviews/user-brain-voice-audio-overview.mp3`: returned 200
  with `Content-Type: audio/mpeg`.
- Browser QA on `http://127.0.0.1:3100`: reproduced the previous blocked custom
  playback path, then confirmed native controls appeared, the audio had duration
  53.568s, seek was enabled, and `1.5x` updated the real audio playback rate.
- Browser QA covered 390x844 and 1280x900 viewports with no horizontal overflow
  and zero warning/error logs.
- Read-only final-check sidecar Dirac found two issues in the first draft
  (fallback overclaiming and control placement); both were fixed before final
  verification.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 80 tests.
- `npm run build`: passed.
- `graphify update . --force`: regenerated the code architecture graph with 841
  nodes, 1423 edges, and 65 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `StoredAudioOverview()`, `formatAudioTime()`,
  `chapterAudioOverviews.ts`, and the stored audio artifact input path.

## Remaining Work

- Real users still need an actual audio-output listen check outside automation;
  the browser QA verifies element state, fallback controls, and served MP3s.
- Continue broader live voice-chat replacement work separately from stored
  chapter audio guides.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 29: Voice Agent Observability And Routing

Phase 29 tightens the MegaaDev PR voice-chat integration without pulling the
PR's unrelated image search, Mermaid generation, multi-PDF, or generated brain
artifact changes. It adds a local voice-agent event timeline, fixes local
backend routing for the live voice websocket, and makes Deepgram proxy activity
visible in Admin.

## Graphify Context

- Graphify routed the slice through `ChatPanel()`, `VoiceUniverse()`,
  `AdminView()`, `src/store/index.ts`, and the server `/api/voice-agent`
  websocket path.
- PR #4 inspection was limited to `src/components/ChatPanel.tsx`, `server.ts`,
  `src/types.ts`, and `src/store/index.ts`; unrelated PR file groups were
  explicitly excluded.

## Integration Decisions

- Added a capped local `voiceAgentEvents` buffer in Zustand with
  `recordVoiceAgentEvent()` and `clearVoiceAgentEvents()`.
- ChatPanel now records voice session start/end, Deepgram settings applied,
  typed and microphone user turns, assistant turns, speaking/listening
  transitions, barge-in, and voice errors.
- ChatPanel's voice websocket now uses the same backend-aware dev-host routing
  as Admin, so Vite `517x` origins target the Node backend instead of the Vite
  host.
- Voice usage duration/audio counters now accumulate server-sent deltas across
  sessions. User-ended voice sessions locally count one completed session when
  the server cannot send the final Deepgram-close usage frame.
- Server system activity now treats voice as a first-class local activity kind
  and records auth blocks, provider connection/settings readiness, errors, and
  close cleanup.
- Admin Activity now includes a `Live voice timeline` panel with event
  summaries, status chips, metadata details, current voice model/listen/speak
  meters, and a local clear control.
- The Tutor System Architecture, User Brain Architecture, and App Design
  Language books now mention the local voice-agent timeline and routing boundary
  without expanding into a new chapter.

## Verification Evidence

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 80 tests.
- `npm run build`: passed.
- Browser QA via local headless Chrome/CDP on `http://127.0.0.1:3100`: Admin
  rendered the `Live voice timeline` and empty-state copy at 1280x900 and
  390x844 with no horizontal overflow.
- Browser QA opened Study's tutor chat and confirmed the ChatPanel textarea and
  `Start voice input` control rendered with no horizontal overflow; the expected
  local voice URL was `ws://127.0.0.1:3100/api/voice-agent?language=en`.
- `graphify update . --force`: regenerated the code architecture graph with 845
  nodes, 1427 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke queries found `VoiceAgentEventType`, `VoiceAgentEvent`,
  `voiceServerWsUrl()`, `AdminView()`, and the voice/Admin graph neighbors.
- Read-only sidecar Pauli found six issues. This phase fixed the P1 websocket
  host bug, P1 session-count gap, P2 cross-session duration undercount, P2 Admin
  panel gap, P2 server activity gap, and P3 vague Deepgram error close.

## Remaining Work

- Real microphone, speaker, OpenRouter, and Deepgram end-to-end live voice still
  need manual beta validation outside headless browser automation.
- Voice visuals remain intentionally limited to the audio/UI/orchestration
  subset from PR #4; visual diagram/image tool-calling remains out of scope for
  this phase.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 23: Stored Audio-guide Integrity Verifier

Phase 23 adds a conservative local verifier for stored chapter audio guides.
Audio overview rows can now move from `not_checked` to `verified` when the
checked-in manifest, local MP3 path, book/chapter anchors, transcript metadata,
voice, duration, stored date, and no-external-fetch metadata agree. This is
manifest integrity only; it does not claim transcript/source-span truth.

## Verification Evidence

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 77 tests.
- `npm run build`: passed.
- Browser QA on Admin Source Artifacts showed audio guide rows with
  `Run local check`, moved a sample row to `verified`, and retained no
  horizontal overflow at mobile and desktop widths.
- `graphify update . --force`: passed.
- `npm run graphify:tree`: passed.
- A planned final-check sidecar was blocked by account usage limits; the main
  thread completed the verification sweep.

## Remaining Work

- Audio-content transcript matching remains future work.
- Generated charts, code snippets, images, and websites still need later
  artifact verifiers.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 24: Voice Chat PR Selection And Graphify Policy Cleanup

Phase 24 inspects MegaaDev's open PR #4 (`audio-orc`) and ports only the voice
chat pieces that fit this local beta branch. The unrelated PR features
(`image-search`, generated Mermaid endpoints, visual voice tool-calling, and
multi-PDF changes) were intentionally not copied.

## Integration Decisions

- Live Voice Agent speech now uses Deepgram Aura (`aura-asteria-en`) in the
  Deepgram agent settings.
- The voice WebSocket proxy now sends KeepAlive and preserves text/binary frame
  types.
- Chat voice turns are grouped into a collapsible `Voice conversation` card with
  duration instead of loose individual voice messages.
- Study voice mode now has a dark audio-reactive stage, rolling captions,
  typed-voice placeholder, and local barge-in handling.
- `.github/workflows/graphify-refresh.yml` was deleted. Graphify refresh is now
  explicit local maintenance only, and the docs/package scripts were updated to
  match.

## Verification Evidence

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 77 tests.
- `npm run build`: passed.
- Browser QA on `http://localhost:3100` covered Admin source artifacts, Revision
  audio guide loading, and Study voice-active UI. Headless Chrome loaded the
  MP3 and duration but did not advance playback time; the HTTP asset check
  returned `200 OK`, `Content-Type: audio/mpeg`, and a nonzero content length.
- `graphify update . --force`: regenerated 840 nodes, 1421 edges, and 58
  communities after rebasing over the remote Graphify auto-refresh commit.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `VoiceUniverse()` and `MorphBlob()`.

## Remaining Work

- Real live voice still needs end-to-end validation with actual OpenRouter and
  Deepgram keys, microphone, and speakers outside headless Chrome.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 19: Stored Audio Overview Provenance

Phase 19 connects the stored chapter audio overview feature to the local
source-artifact ledger. The stored MP3 remains a local asset played by the
browser; the new rows make its generation/provenance inspectable in Admin
without treating it as verified learner evidence.

## Graphify Context

- Repo-local Graphify routed this slice through `AdminView()`,
  `ArtifactRecord`, `artifact.records.ts`, `longterm.memory.ts`,
  `RevisionView()`, `chapterAudioOverviews.ts`, and the built-in architecture
  books.
- The MCP Graphify corpus appeared stale or pointed at another project, so the
  checked-in `graphify-out/graph.json` CLI path was used for source routing.

## Integration Decisions

- Added an `audio_overview` artifact kind.
- Added pure stored-audio provenance helpers that create an `ArtifactRecord`
  plus linked `CitationState` from overview metadata.
- Admin seeds built-in User Brain Architecture stored audio overview manifests
  into Dexie on load, making the rows visible under Source Artifacts.
- Admin artifact type meters now use full Dexie counts instead of the most
  recent 50 artifact rows, and citation rows fetch linked artifact types before
  deciding whether a local verifier is available.
- The local verifier still only supports `source_card` artifacts; audio
  overview rows remain `not_checked` and explicitly unsupported for local
  citation verification.
- Updated the system architecture doc, Tutor System Architecture book, User
  Brain Architecture book, packet, result, and workflow state.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 65 tests.
- `npm run build`: passed.
- `npm run format:check`: passed.
- Browser QA on `http://127.0.0.1:3100`: Admin Source Artifacts seeded and
  rendered one `audio_overview` artifact plus one `not_checked` citation state,
  showed the audio overview meter, showed "No local verifier yet" for both
  rows, did not show `Run local check` for the audio overview citation, and had
  no horizontal overflow in the in-app viewport.
- `graphify update . --force`: passed after removing generated `server.mjs` and
  `.tmp-test` artifacts; regenerated 1439 nodes, 2712 edges, and 132
  communities after rebasing onto the remote Graphify refresh.
- `npm run graphify:tree`: passed.
- Graphify query smoke returned `recordStoredAudioOverviewArtifacts()`,
  `AdminView()`, and `artifact.records.ts`.
- Graphify artifact smoke found no conflict markers, `/private/tmp`, `tmp-test`,
  or generated `server.mjs` paths.
- Final-check sidecar Peirce found no blockers. It flagged two 50-row-window
  risks in Admin, and both were fixed before final verification.

## Remaining Work

- Generate and store chapter-specific audio overview assets for the remaining
  built-in book chapters.
- Add richer verifier contracts for generated notes, charts, code snippets,
  images, websites, and audio overview assets when a real verification method
  exists.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 18: Book Reader And Stored Audio Overview

Phase 18 starts the updated Library/readability objective. It turns the User
Brain Architecture book from a sprawling 18-chapter research memo into a shorter
8-chapter reader path, then adds a stored audio-overview player for built-in
chapters.

## Graphify Context

- Graphify routed the slice through `RevisionView()`, `builtInBooks`,
  `userBrainArchitectureBook.ts`, `tutorBook.json`, `TUTOR_ARCHITECTURE.md`,
  `audio.ts`, and server voice/TTS routes.
- OpenAI docs confirmed that GPT audio output is available through audio
  modalities, but this local environment did not expose `OPENAI_API_KEY`.

## Integration Decisions

- Added typed chapter audio overview metadata in
  `src/lib/chapterAudioOverviews.ts`.
- Added a stored audio overview card to `RevisionView` with play, pause,
  progress, transcript, and 1x / 1.25x / 1.5x playback controls.
- Stored the opening User Brain Architecture overview asset under
  `public/audio-overviews/user-brain-runtime-overview.mp3`.
- The Library player uses the stored static asset. It does not call the live
  `/api/tts` route when the learner presses play.
- Added the user-brain book source and audio-overview metadata to the repo
  formatting gate.
- Tutor System Architecture, Tutor book, and App Design Language now describe
  shorter book reading and stored audio overviews.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 64 tests.
- `npm run build`: passed.
- `npm run format:check`: passed after adding
  `src/lib/userBrainArchitectureBook.ts` and
  `src/lib/chapterAudioOverviews.ts` to the format gate.
- Browser QA on `http://127.0.0.1:3100`: User Brain Architecture rendered as 8
  unique chapters, the stored MP3 loaded from
  `/audio-overviews/user-brain-runtime-overview.mp3` with a 38.79 second
  duration, the overview card showed transcript and speed controls, the 1.5x
  button set the audio element playback rate to 1.5, and the page had no
  horizontal overflow or warning/error console logs.
- Browser automation could load and control the media element but could not
  start audible playback under the in-app browser's autoplay/automation guard.
- `graphify update . --force`: regenerated the code architecture graph with 738
  nodes, 1301 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query returned `StoredAudioOverview()`,
  `chapterAudioOverviews.ts`, `userBrainChapterAudioOverviews`, and
  `RevisionView()`.
- Final-check sidecar Peirce found no TypeScript/runtime blockers and confirmed
  the Library path does not call `/api/tts`; it flagged stale workflow evidence,
  which was updated before commit.

## Remaining Work

- Generate and store chapter-specific audio overview assets for the remaining
  built-in book chapters.
- Add Admin provenance rows for stored overview generation metadata.
- Continue generated-artifact verification for charts, code snippets, images,
  websites, and richer note source spans.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 17: Learning-note Artifact Provenance

Phase 17 links generated learning-book entries into the local artifact/citation
trust ledger. It keeps the same conservative boundary as generated flashcards:
generated notes are visible and reviewable, but remain `not_checked` until a
real notes/source-span verifier exists.

## Graphify Context

- Graphify routed the slice through `MemoryOrchestrator`,
  `src/memory/memory.orchestrator.ts`, `src/memory/artifact.records.ts`,
  `ArtifactRecord`, `CitationState`, `AdminView()`, and the in-app architecture
  books.
- Read-only sidecar Kierkegaard confirmed the safest insertion point was the
  `db.learningEntries.add()` block inside
  `MemoryOrchestrator.updateLearningBookFromConversation()`.

## Integration Decisions

- Added generated learning-note artifact construction and persistence helpers.
- `MemoryOrchestrator.updateLearningBookFromConversation()` now creates a
  stable learning-entry id, persists the entry, and writes a sibling `notes`
  `ArtifactRecord` plus `not_checked` citation-state row.
- The learning-entry id is the artifact/citation source reference so multiple
  entries in one conversation do not overwrite each other.
- Metadata records local-only generated provenance, `externalContentFetched:
false`, book/chapter/conversation/document context, concept ids, model, and
  confidence.
- Admin and the built-in books now describe generated learning-note provenance
  without implying source verification.

## Verification Evidence

- `npm run lint`: passed.
- `npm run test`: passed, 64 tests.
- `npm run build`: passed.
- `npm run format:check`: passed after formatting `AdminView.tsx`.
- Browser QA on `http://127.0.0.1:3100`: Admin Source Artifacts rendered the
  `chat, memory, and tool streams` copy, generated learning-note empty-state
  copy, `Not checked` meter, no horizontal overflow, and zero warning/error
  logs at mobile and desktop widths. Tutor System Architecture, User Brain
  Architecture, and App Design Language rendered the updated note-provenance
  copy.
- `graphify update . --force`: regenerated the code architecture graph with 733
  nodes, 1293 edges, and 50 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query returned `createGeneratedNotesArtifactRecords()`,
  `recordGeneratedNotesArtifact()`,
  `.updateLearningBookFromConversation()`, `MemoryOrchestrator`, and
  `AdminView()`.
- Graphify artifact smoke found no conflict markers, `/private/tmp`,
  `tmp-test`, or generated `server.mjs` paths.
- Final-check sidecar Galileo found no code blockers. It flagged stale workflow
  closeout fields, which were updated before commit.

## Remaining Work

- Link generated charts, code snippets, images, websites, and other artifacts
  into the same reviewable provenance path.
- Add real generated-artifact verification beyond source-card, flashcard, and
  learning-note provenance rows.
- Source-span claim matching and external content verification remain future
  slices.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 35: Voice Learner-Context Injection

Phase 35 moves the program back from documentation/audio polish into the runtime
flow requirement: chat and voice should share the local learner-brain context
path as much as the current provider architecture allows. Typed chat already
retrieved local memory, active learning-book context, document excerpts, and
interaction-state context before `/api/chat`. Voice mode now builds a bounded
version of that same local context before opening the websocket and passes it to
the local Node voice proxy during `voice_auth`.

## Graphify Context

- Graphify routed the slice through `ChatPanel.tsx`, `server.ts`,
  `memory.orchestrator.ts`, `tool.jobs.ts`, `longterm.memory.ts`,
  `AdminView.tsx`, and the store voice-agent event types.
- Refreshed Graphify artifacts now include `compactVoiceStudyContext()` nodes in
  `graphify-out/graph.json`, so future agents can navigate this path without
  broad repository reads.

## Integration Decisions

- Added a bounded `buildVoiceStudyContext()` path in `ChatPanel.tsx`.
- The context includes persistent memory retrieval, active learning-book
  overview/knowledge summary/mapped concepts, active document excerpts, and the
  local interaction model snapshot.
- Voice auth now sends `studyContext`, active book/document metadata, and
  context character counts to the local websocket proxy.
- `server.ts` compacts the received study context, injects it into the
  Deepgram/OpenRouter voice-agent prompt, and records a local retrieval/system
  activity event named `Voice study context attached`.
- The store now recognizes a `context_attached` voice-agent event so Admin can
  show client-side evidence before the provider handshake.
- AWS/cloud synchronization remains out of scope. Live Deepgram provider testing
  was intentionally not part of this local implementation slice.

## Verification Evidence

- `npm run format:check`: passed.
- `npm run test`: passed, 85 tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA on `http://localhost:3100` confirmed Admin desktop exposes
  model/tool/memory/retrieval meters and the Live voice timeline.
- In-app Browser QA at `390x844` confirmed Admin remains responsive and mobile
  Study/Chat exposes the tutor textbox plus `Start voice input`.
- `graphify update . --force`: passed with 861 nodes, 1453 edges, and 59
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke checks found the new `compactVoiceStudyContext()` graph nodes.

## Remaining Work

- Add a true local/offline voice-session contract test that can assert
  `voice_auth` context injection without touching Deepgram.
- Add Admin request correlation between client `context_attached` events and
  server `Voice study context attached` system activity rows.
- Continue tightening the gap between voice mode and typed chat tool-calling
  depth; the current voice provider path receives context but does not yet use
  the full typed-chat tool loop.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 36: Voice Client-Side Tool Calls

Phase 36 gives voice mode an actual local tool-calling path instead of only
static prompt context. The Deepgram voice-agent settings now advertise local
client-side functions, and `ChatPanel` can execute those function requests
against the same learner-brain surfaces used by typed chat.

## Graphify Context

- Graphify routed the slice through `ChatPanel.tsx`, `server.ts`,
  `src/store/index.ts`, the tool-job ledger, `MemoryOrchestrator`, and the new
  `src/lib/voiceAgentTools.ts` helper.
- The Tutor debug skill was checked, but the current `package.json` has no
  `brain:*` scripts (`brain:postchange`, `brain:retrieve`, and `brain:impact`
  are absent). This phase therefore used Graphify plus the current repo's
  standard gates as the executable workflow.

## Integration Decisions

- Added `src/lib/voiceAgentTools.ts` with the voice tool definitions and
  protocol helpers for `FunctionCallRequest` arguments and
  `FunctionCallResponse` payloads.
- Added three local voice tools:
  - `look_at_study_context` returns active book, learner memory, document, and
    selection context.
  - `update_graph` writes one atomic concept into the local learner graph using
    `brainOrchestrator.addOrUpdateConcept()`.
  - `generate_flashcards` stores voice-generated active-recall cards in Dexie
    and the existing flashcard/artifact provenance ledgers.
- `server.ts` now includes those definitions in Deepgram voice `Settings`,
  updates the spoken prompt with the voice tool policy, and logs
  `FunctionCallRequest`/`FunctionCallResponse` activity to the local system
  activity ledger.
- `ChatPanel.tsx` now handles `FunctionCallRequest`, records voice tool jobs,
  executes local tools, sends `FunctionCallResponse`, and records client-side
  `tool_call` voice events for Admin.
- This remains local and GitHub-pushable. AWS/cloud synchronization is still
  deferred.

## Verification Evidence

- `npm run test`: passed, 88 tests including `voice-agent-tools.test.mjs`.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run format:check`: passed.
- In-app Browser QA on `http://localhost:3100` confirmed Admin still exposes
  voice/tool/memory/retrieval surfaces.
- In-app Browser QA at `390x844` confirmed mobile Tutor still exposes the
  textbox, `Start voice input`, and `Send message`.
- Browser warning/error logs were empty during smoke QA.
- `graphify update . --force`: passed with 870 nodes, 1466 edges, and 60
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke checks found `voiceAgentTools.ts`,
  `VOICE_AGENT_TOOL_DEFINITIONS`, `parseVoiceFunctionArguments()`, and
  `buildVoiceFunctionCallResponse()`.

## Remaining Work

- Add an offline websocket harness that simulates Deepgram
  `FunctionCallRequest` messages through the real `/api/voice-agent` proxy
  without calling the external provider.
- Browser-verify a live voice function-call round trip once provider keys/access
  are intentionally part of the test scope.
- Keep closing the remaining typed-chat vs voice parity gap: web search and
  current-page vision tools are still typed-chat-only.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 37: Offline Voice Tool-Loop Harness

Phase 37 adds the missing local contract test for voice tool calling. Instead
of relying on Deepgram availability, the server factory can now start a mock
voice provider in tests. The mock provider uses the real `/api/voice-agent`
websocket path, emits provider-shaped `FunctionCallRequest` messages for the
three local voice tools, accepts `FunctionCallResponse` replies, and records the
loop in the Admin system activity ledger.

## Graphify Context

- Graphify routed this slice through `server.ts`, `createTutorServerApp()`,
  `tests/system-activity.test.mjs`, `startVoiceApp()`, `functionRequest`, and
  `toolNames`.
- The refreshed graph artifacts are a clean regeneration of the code
  architecture graph, not the user-facing learner brain graph.

## Integration Decisions

- Added `voiceProvider?: "deepgram" | "mock"` to the local server factory
  options. The default remains Deepgram.
- Added a mock provider branch that bypasses external provider keys, records
  `Mock voice provider ready`, and sends one request each for
  `look_at_study_context`, `update_graph`, and `generate_flashcards`.
- Shared voice tool request/response system-activity recording between the live
  Deepgram path and the mock harness.
- Added a websocket integration test that authenticates with local study
  context, validates the requested tool names, replies with
  `FunctionCallResponse`, and asserts `Voice tool call requested` plus
  `Voice client tool completed` rows through `/api/debug/system-activity`.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run test`: passed, 89 tests including the mock voice websocket
  tool-loop test.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run format:check`: passed.
- In-app Browser QA on `http://localhost:3100`: Admin desktop rendered System
  Activity, meters, voice timeline, tool jobs, model runs, memory events, and
  runtime tuning with zero browser console errors.
- In-app Browser QA at `390x844`: Admin remained responsive, and mobile Study
  showed the reader/tutor entry carousel with zero browser console errors.
- Browser QA screenshots were emitted in the browser tool output. The browser
  runtime could not write PNG files into the workflow folder, so no screenshot
  files were added to the repo.
- `graphify update . --force`: clean regeneration passed with 844 nodes, 1440
  edges, and 59 communities after moving stale generated graph artifacts aside
  and rebuilding.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `createTutorServerApp()`,
  `tests/system-activity.test.mjs`, `startVoiceApp()`, `functionRequest`, and
  `toolNames`; artifact grep found no `server.mjs` or `.tmp-test` nodes.

## Remaining Work

- Browser-verify a live voice function-call round trip once provider keys/access
  are intentionally part of the test scope.
- Keep closing the typed-chat vs voice parity gap: web search and current-page
  vision tools are still typed-chat-only.
- Continue correlating client-side voice tool jobs with server system-activity
  rows across richer request timelines.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 38: Voice Chat-Thread Continuity

Phase 38 tightens the voice/text continuity layer. Voice transcripts were
already visible as grouped message cards and could update the learner brain per
completed turn, but the lightweight chat-history/title helpers still treated
the parent voice-session message as empty content. This phase makes voice
session turns first-class chat material and adds durable voice model-run rows
for Admin.

## Graphify Context

- Graphify routed this slice through `ChatPanel.tsx`,
  `src/lib/chatThreadUtils.ts`, `archiveChatSnapshot()`,
  `chatTitleFromMessages()`, `flattenChatMessagesForPrompt()`, and
  `meaningfulChatMessages()`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.

## Integration Decisions

- Added `src/lib/chatThreadUtils.ts` as a small pure helper for:
  - flattening voice-session turns into prompt messages;
  - treating voice-session cards as meaningful chat history;
  - detecting learner turns inside typed and voice messages;
  - deriving archive/thread titles from generated voice titles or the first
    learner voice turn.
- Updated ChatPanel archive and book-thread title paths to use the shared
  helper.
- Updated typed chat request assembly to use
  `flattenChatMessagesForPrompt()` so prior voice turns are injected through a
  tested path.
- Added `recordVoiceModelRun()` in ChatPanel so live voice sessions upsert a
  durable `voice_agent` model-run row on start/context attachment and complete
  or fail it when the session ends.
- Added unit tests for voice-session meaningful history, prompt flattening, and
  generated voice-title preference.

## Verification Evidence

- `npm run test`: passed, 92 tests including `chat-thread-utils.test.mjs`.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run format:check`: passed.
- In-app Browser QA on `http://localhost:3100`: Admin activated through DOM CUA
  and rendered Admin Center, System Activity, Model Runs, and Live voice
  timeline with zero browser console errors.
- In-app Browser QA at `390x844`: Admin remained responsive and mobile Study
  rendered the tutor entry with zero browser console errors.
- `graphify update . --force`: regenerated code architecture artifacts with
  857 nodes, 1470 edges, and 50 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `chatThreadUtils.ts`,
  `flattenChatMessagesForPrompt()`, `meaningfulChatMessages()`,
  `archiveChatSnapshot()`, and `chatTitleFromMessages()`.
- Scratch artifact checks found no `server.mjs`, `.tmp-test`, or running
  `node server.mjs` process after QA cleanup.

## Remaining Work

- Browser-verify a live voice function-call round trip once provider keys/access
  are intentionally part of the test scope.
- Keep closing the typed-chat vs voice parity gap: web search and current-page
  vision tools are still typed-chat-only.
- Add stronger request correlation between browser voice model-run rows, server
  system-activity rows, and client-side tool jobs.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 39: Voice Request Correlation

Phase 39 closes the request-correlation gap left by the voice continuity work.
The browser already records voice model/tool rows with the voice session id,
while the local websocket server previously generated a separate server-side
voice request id. That made Admin request timelines split one voice session
into two timelines. Voice auth now carries the browser session id to the server,
and the server uses it for voice system-activity rows after conservative shape
validation.

## Graphify Context

- Graphify routed this slice through `server.ts`, `ChatPanel.tsx`,
  `tests/system-activity.test.mjs`, `recordToolJobEvent()`,
  `recordModelRunEvent()`, and `createTutorServerApp()`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.

## Integration Decisions

- `ChatPanel` sends `voiceSessionId` and `requestId` in the `voice_auth`
  payload.
- `server.ts` validates the client request id with a small
  alphanumeric/underscore/colon/dash allowlist before adopting it as the local
  voice `requestId`.
- The server keeps its generated fallback id when no valid browser id is
  supplied.
- The mock websocket integration test now asserts shared request ids for
  `Voice tool call requested`, `Voice client tool completed`,
  `Mock voice provider ready`, and `Voice study context attached`.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: passed, 92 tests.
- `npm run build`: passed.
- In-app Browser QA on `http://localhost:3100`: root/Study rendered, Admin
  activated through DOM CUA, and Admin showed Admin Center, System Activity,
  Request timelines, Model Runs, and Live voice timeline with zero console
  errors.
- In-app Browser QA at `390x844`: Study rendered the tutor entry with zero
  console errors.
- `graphify update . --force`: regenerated code architecture artifacts with
  857 nodes, 1470 edges, and 50 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found the voice websocket test/server/client route, and
  graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Browser-verify a live voice function-call round trip once provider keys/access
  are intentionally part of the test scope.
- Keep closing the typed-chat vs voice parity gap: web search and current-page
  vision tools are still typed-chat-only.
- Add richer Admin labels around correlated voice timelines once real provider
  calls are exercised.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 40: Request-Correlated Brain Context Injection

Phase 40 makes the memory-context injection path visible inside the same Admin
request timeline as model runs, tool jobs, and server activity. Before this
slice, typed chat retrieval rows could be inspected in the Retrieval tab, but
they did not share a request id with the server-side tutor turn. Voice retrieval
also attached context, but the retrieval row did not explicitly carry the voice
session id.

## Graphify Context

- Graphify routed this slice through `ChatPanel.tsx`,
  `memory.orchestrator.ts`, `retrieval.events.ts`, `longterm.memory.ts`,
  `AdminView.tsx`, `server.ts`, and the built-in architecture/design books.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.

## Integration Decisions

- `ChatPanel` creates a browser `chat-*` request id before typed-chat retrieval
  starts.
- `ChatPanel` passes that id to `MemoryOrchestrator.getRelevantContext()` and
  `/api/chat`.
- Voice retrieval rows use the existing voice session id.
- `server.ts` now uses one conservative client-request-id validator for typed
  chat and voice.
- `RetrievalEvent` records preserve an optional `requestId`; no Dexie indexed
  schema bump was needed because Admin groups recent retrieval rows in memory.
- Admin request timelines now group server events, retrieval injections, model
  runs, and tool jobs by request id.
- README, Tutor System Architecture, User Brain Architecture, and App Design
  Language copy now describe request-correlated brain context injection.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: passed, 92 tests.
- `npm run build`: passed.
- Headless Chrome CDP fallback QA on `http://127.0.0.1:3100`: Study desktop
  rendered with zero console/page errors.
- Headless Chrome CDP fallback QA at `390x844`: Study mobile rendered with zero
  console/page errors.
- Headless Chrome CDP fallback QA for Admin: System Activity rendered Request
  timelines; Retrieval Events tab showed Recent retrievals and memory context
  selection copy; Model Runs body showed provider/model/tool language; all with
  zero console/page errors.
- `graphify update . --force`: regenerated code architecture artifacts with
  862 nodes, 1476 edges, and 56 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `RetrievalEvent`, `AdminView()`,
  `normalizeClientRequestId()`, `createRetrievalEventRecord()`,
  `recordRetrievalEvent()`, `ChatPanel()`, and the request/retrieval route.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Browser-verify a real successful chat request with a configured OpenRouter key
  so a live retrieval/model/tool timeline can be inspected end to end.
- Browser-verify a live Deepgram voice round trip when provider access is in
  scope.
- Continue closing typed-chat vs voice parity for current-page vision.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 41: Voice Web-Search Tool Parity

Phase 41 closes one of the remaining typed-chat vs voice parity gaps: live web
search for explicit web, current, recent, latest, or news-style questions. Voice
mode can now expose the same local source-card provenance path as typed chat
without weakening the source-material-first boundary for current page, selected
text, active document, or active book questions.

## Graphify Context

- Graphify routed this slice through `VOICE_AGENT_TOOL_DEFINITIONS`,
  `ChatPanel()`, `server.ts`, `searchSerper()`, `voiceAgentTools.ts`,
  `web-search.ts`, and the Admin/source-artifact adjacent surfaces.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.

## Integration Decisions

- Added `web_search` to the shared Deepgram voice-agent tool definition list.
- Added `/api/voice-web-search` as a local server bridge that validates the
  request id/query/mode/count, calls the existing Serper helper, and records
  web system activity for started, completed, blocked, and failed states.
- `ChatPanel` now executes voice `web_search` calls, blocks source-local prompts
  conservatively, records web search/usage events, caches sources, and writes
  source-card artifact/citation provenance for voice-returned sources.
- The mock voice provider now derives from the shared voice tool definition list
  so offline voice-tool tests catch future drift.
- README, Tutor System Architecture, User Brain Architecture, App Design
  Language, and workflow evidence now document the local voice web-search
  boundary.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 93 tests.
- `npm run build`: passed.
- In-app Browser QA on `http://localhost:3100`: Admin/System Activity rendered
  request timelines, local activity copy, tool visibility, and voice controls
  with zero captured browser error logs.
- In-app Browser QA at `390x844`: Admin/System Activity remained reachable and
  rendered with zero captured browser error logs.
- `graphify update . --force`: regenerated code architecture artifacts with
  863 nodes, 1477 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `VOICE_AGENT_TOOL_DEFINITIONS`, `ChatPanel()`,
  `searchSerper()`, `server.ts`, `voiceAgentTools.ts`, and `web-search.ts`.
- `graphify path "VOICE_AGENT_TOOL_DEFINITIONS" "searchSerper()"` found a
  two-hop path through `server.ts`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Browser-verify a live Deepgram voice round trip when provider access is in
  scope.
- Browser-verify a successful live Serper voice web-search response when a
  deliberate key-backed test is in scope.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 42: Voice Current-Page Vision Parity

Phase 42 closes the other typed-chat vs voice parity gap from the recent voice
tool work: current-page vision. Voice mode can now inspect the rendered PDF page
for page, screen, visible-diagram, chart, and reading-context questions through
a local `/api/voice-current-page` bridge, then return the text vision result to
the Deepgram voice-agent tool loop.

## Graphify Context

- Graphify routed this slice through `VOICE_AGENT_TOOL_DEFINITIONS`,
  `ChatPanel()`, `captureCurrentPdfPageImage()`, `server.ts`,
  `voiceAgentTools.ts`, `PdfViewer()`, tests, and Admin/system-activity
  surfaces.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.

## Integration Decisions

- Added `look_at_current_page` to the shared voice-agent tool definition list.
- Added `/api/voice-current-page` as a local bridge that validates request id,
  query, rendered page image, and OpenRouter key before using
  `openai/gpt-4o-mini` for page inspection.
- `ChatPanel` now reuses one current-PDF-canvas capture helper for typed chat
  and voice mode.
- Voice tool execution can now call `look_at_current_page`, return the vision
  model text to the voice-agent loop, and record blocked/completed tool-job
  status.
- The mock voice provider derives the new tool from
  `VOICE_AGENT_TOOL_DEFINITIONS`, so offline voice-tool tests catch future drift.
- README, Tutor System Architecture, User Brain Architecture, App Design
  Language, and workflow evidence now document local voice current-page
  boundaries.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- Explicit `npx prettier --check` for `ChatPanel` and workflow files: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 94 tests.
- `npm run build`: passed.
- In-app Browser QA on `http://localhost:3100`: Admin/System Activity rendered
  request timelines, tool signals, and voice activity with zero captured browser
  error logs.
- In-app Browser QA on `http://localhost:3100`: Study rendered after returning
  from Admin with zero captured browser error logs.
- In-app Browser QA at `390x844`: Study rendered with navigation available and
  zero captured browser error logs.
- `graphify update . --force`: regenerated code architecture artifacts with
  865 nodes, 1479 edges, and 47 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `VOICE_AGENT_TOOL_DEFINITIONS`, `ChatPanel()`,
  `currentPageTool`, `server.ts`, `voiceAgentTools.ts`, `PdfViewer()`, and
  `AdminView()`.
- `graphify path "VOICE_AGENT_TOOL_DEFINITIONS"
"captureCurrentPdfPageImage()"` found a three-hop path through
  `voiceAgentTools.ts` and `ChatPanel.tsx`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Browser-verify a live Deepgram voice round trip when provider access is in
  scope.
- Browser-verify a successful live OpenRouter voice current-page vision response
  when a deliberate key-backed test is in scope.
- Browser-verify a successful live Serper voice web-search response when a
  deliberate key-backed test is in scope.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 43: Unified Brain Context Packets

## Scope

Phase 43 turns chat/voice context injection into one local packet contract.
Typed chat and live voice now use the same builder for semantic memory,
active-book summary, ready document excerpts, and interaction timing state
before the foreground agent answers.

## Graphify Context

- Graphify routed this slice through `MemoryOrchestrator`,
  `memory.orchestrator.ts`, `retrieval.events.ts`, `memory.events.ts`,
  `ChatPanel()`, `AdminView()`, `TUTOR_ARCHITECTURE.md`, and the built-in
  architecture/design books.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.

## Integration Decisions

- Added `src/memory/brain.context.ts` as the shared packet builder.
- Added a durable `brain_context_injected` memory-event type without a Dexie
  schema bump because the value is stored in an already-indexed table field.
- Replaced duplicated ChatPanel typed-chat and voice context assembly with the
  shared packet builder.
- Kept `/api/chat` and `/api/voice-agent` request shapes compatible by sending
  the packet text as the existing `memoryContext` or `studyContext` field.
- Added packet memory rows to Admin request timelines beside retrieval, model,
  and tool rows.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- Explicit Prettier check for `ChatPanel` and Packet VV workflow files: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 99 tests.
- `npm run build`: passed.
- Headless Chrome CDP QA on `http://127.0.0.1:3100` desktop Study: rendered
  the Study surface with zero captured console/page errors.
- Headless Chrome CDP QA on desktop Admin: rendered Admin Center, System
  Activity, Request timelines, memory/context copy, and local observability copy
  with zero captured console/page errors.
- Headless Chrome CDP QA at `390x844`: rendered Study/mobile navigation with
  zero captured console/page errors.
- Browser QA screenshots were saved under
  `.workflow/brain-architecture-implementation-program/results/`.
- `graphify update . --force`: regenerated code architecture artifacts with
  882 nodes, 1519 edges, and 58 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `buildBrainContextPacket()`, `brain.context.ts`,
  `ChatPanel()`, `AdminView()`, `recordBrainContextInjected()`,
  `MemoryOrchestrator`, `recordMemoryEvent()`, and retrieval events.
- `graphify path "buildBrainContextPacket()" "AdminView()"` found a three-hop
  path through `ChatPanel.tsx` and `useStore`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
- `npm run brain:postchange -- --reason skill-preflight` remained unavailable
  because current `package.json` has no `brain:postchange` script.

## Remaining Work

- Browser-verify live key-backed provider success paths when provider spending
  is deliberately in scope.
- Continue closing the complete local learner-brain runtime against the book
  until chat mode, voice mode, tools, evidence, memory, retrieval, and Admin
  tuning are proven end to end.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 44: Brain Flow Coverage Verifier

## Scope

Phase 44 adds a local beta proof layer for the complete brain-flow story. The
previous phase made typed chat and live voice share one context packet, but Beta
Diagnostics still showed separate ledgers. This phase adds one conservative
verifier that checks whether chat context injection, voice context injection,
request correlation, foreground tool calls, and background learner-memory rows
all exist in local evidence before the flow is called ready.

## Graphify Context

- Graphify routed this slice through `beta.diagnostics.ts`, `AdminView.tsx`,
  `brain.context.ts`, `ChatPanel()`, `MemoryEvent`, `RetrievalEvent`,
  `ModelRun`, and `ToolJob`.
- The first graph refresh saw the temporary dev-server `server.mjs` bundle. The
  stale `graphify-out` folder was moved to
  `/private/tmp/learningai-graphify-clean.fhewU1/graphify-out`, then Graphify
  rebuilt from the clean source tree.
- Clean Graphify rebuild result: 888 nodes, 1529 edges, and 62 communities.
- `graphify path "buildBrainFlowCoverageFromLedgers()" "AdminView()"` found a
  direct call edge.
- A graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes after
  the clean rebuild.

## Integration Decisions

- Added `buildBrainFlowCoverageFromLedgers()` in
  `src/memory/beta.diagnostics.ts`.
- Added a `brain_flow_coverage` readiness item to Beta Diagnostics.
- The verifier marks missing evidence as `watch` and failed/blocked local rows
  as `blocked`; it marks `ready` only when the complete local flow has evidence.
- Admin Beta Diagnostics now renders a Brain Flow Coverage panel with coverage
  percent, signal counts, status, and missing-evidence copy.
- The repository format gates now include `src/memory/beta.diagnostics.ts`.
- README, Tutor System Architecture, the user-brain architecture book, the
  built-in Tutor System Architecture Library JSON, and the App Design Language
  pattern list now describe the verifier as a local beta proof, not a cloud or
  hidden-model guarantee.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 101 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Browser QA via
  `.workflow/brain-architecture-implementation-program/packets/phase44-browser-qa.mjs`:
  desktop Admin Beta rendered Brain Flow Coverage and missing-evidence state
  with zero captured browser errors.
- Browser QA at 390x844: mobile Admin Beta rendered Brain Flow Coverage with
  `scrollWidth` 390 and zero captured browser errors.
- Browser QA confirmed Revision rendered the App Design Library entry.
- Browser QA screenshots were saved as
  `WW-cdp-admin-beta-desktop.png` and `WW-cdp-admin-beta-mobile.png`.
- `graphify update . --force`: clean regeneration succeeded after stale graph
  artifacts were moved aside.
- `npm run graphify:tree`: passed after the clean graph rebuild.
- Graphify smoke query found `buildBrainFlowCoverageFromLedgers()`,
  `beta.diagnostics.ts`, `AdminView()`, `MemoryEvent`, `RetrievalEvent`,
  `ModelRun`, `ToolJob`, and `beta-diagnostics.test.mjs`.

## Remaining Work

- Populate real successful chat and voice flow evidence in the browser with
  deliberate provider-key spending when that is in scope.
- Continue tightening local learner-brain runtime parity against the book,
  especially around evidence-gated state transitions and background memory
  behavior.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 45: Model Summary Confidence Gate

## Scope

Phase 45 closes the remaining local learner-confidence drift in the background
memory path. Earlier work kept model summaries from raising mastery; this phase
applies the same conservative boundary to durable learner confidence while
keeping proposed confidence visible in evidence and memory metadata.

## Graphify Context

- Graphify routed this slice through `MemoryOrchestrator`,
  `updateLearningBookFromConversation()`, `addOrUpdateConcept()`,
  `confidenceFromModelSummary()`, `gateModelSummaryMastery()`,
  `recordModelSummaryEvidence()`, and `evidence.mastery.ts`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.
- `graphify path "confidenceFromModelSummary()" ".updateLearningBookFromConversation()"` found
  a direct call edge.
- `graphify path "confidenceFromModelSummary()" ".addOrUpdateConcept()"` found
  a direct call edge.
- A graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- `confidenceFromModelSummary()` now preserves the current durable confidence
  instead of accepting a model-summary proposal.
- Learning-book concept updates now record `proposedConfidence`,
  `acceptedConfidence`, and
  `confidenceGate: "model_summary_no_confidence_increase"` in evidence and
  memory metadata.
- Chat graph concept updates use the same gate, so new model-summary concepts
  start with accepted durable confidence `0`.
- Documentation and built-in Library book copy now say that model summaries can
  propose mastery/confidence and write rows, but cannot raise durable learner
  mastery or confidence by themselves.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 102 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA via
  `.workflow/brain-architecture-implementation-program/packets/phase45-browser-qa.mjs`:
  desktop Revision rendered the User Brain Architecture confidence gate at
  `1440x1000` with `scrollWidth` 1440 and zero captured browser errors.
- Headless Chrome CDP QA at `390x844`: mobile Revision rendered the same
  confidence gate with `scrollWidth` 390 and zero captured browser errors.
- Browser QA screenshots were saved as
  `XX-cdp-user-brain-confidence-desktop.png` and
  `XX-cdp-user-brain-confidence-mobile.png`.
- `graphify update . --force`: regenerated code architecture artifacts with
  888 nodes, 1530 edges, and 62 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `confidenceFromModelSummary()`,
  `MemoryOrchestrator`, `gateModelSummaryMastery()`,
  `updateLearningBookFromConversation()`, `addOrUpdateConcept()`,
  `recordModelSummaryEvidence()`, and `evidence.mastery.ts`.

## Remaining Work

- Populate real successful chat and voice flow evidence in the browser with
  deliberate provider-key spending when that is in scope.
- Continue tightening validated evidence paths so durable confidence can move
  from recall, quiz, correction, and BKT-backed learner evidence rather than
  model summaries.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 46: Request-Correlated Background Memory

## Scope

Phase 46 tightens the complete local brain-flow contract. Typed chat and live
voice already injected shared brain context and wrote background memory rows,
but the MemoryOrchestrator rows were not guaranteed to carry the same foreground
request id that Admin uses for request timelines. This phase threads that
request metadata into background memory and makes Beta Diagnostics require
request-correlated chat and voice memory evidence before calling the flow ready.

## Graphify Context

- Graphify routed this slice through `ChatPanel()`, `MemoryOrchestrator`,
  `trackInteraction()`, `updateLearningBookFromConversation()`,
  `addOrUpdateConcept()`, `recordMemoryEvent()`,
  `buildBrainFlowCoverageFromLedgers()`, and `AdminView()`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.
- `graphify path "buildBrainFlowCoverageFromLedgers()" "AdminView()"` found a
  direct call edge.
- `graphify path "memoryTraceMetadata()" "ChatPanel()"` found a three-hop path
  through `memory.orchestrator.ts` and `StudyView.tsx`.
- A graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- Added request trace fields to `LearningBookUpdateInput`,
  `trackInteraction()` context, stored `ConversationInteraction` rows, and graph
  concept update context.
- Typed chat now passes `chatRequestId`, `mode: "chat"`, and
  `agentLayer: "chat_stream"` into interaction, learning-book, and graph update
  writes.
- Live voice now passes the voice session id, `mode: "voice"`, and
  `agentLayer: "voice_realtime"` into interaction, learning-book, and
  `update_graph` tool writes.
- `MemoryOrchestrator` stores trace metadata in memory events,
  model-summary evidence metadata, generated-note artifact metadata, and
  interaction rows.
- Beta Diagnostics now keeps the background memory signal on watch unless both
  chat and voice have request-correlated background memory rows.
- README, Tutor System Architecture, User Brain Architecture, the built-in
  Tutor System Architecture Library JSON, and App Design Language copy now
  describe the request-correlated memory boundary.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- Targeted workflow Prettier check for Packet YY files: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 103 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA via
  `.workflow/brain-architecture-implementation-program/packets/phase46-browser-qa.mjs`:
  desktop Admin Beta rendered request-correlated memory copy at `1440x1000`
  with `scrollWidth` 1440 and zero captured browser errors.
- Headless Chrome CDP QA at `390x844`: mobile Admin Beta rendered
  request-correlated memory copy with `scrollWidth` 390 and zero captured
  browser errors.
- Headless Chrome CDP QA confirmed the App Design Language book rendered the
  request-correlated memory pattern with `scrollWidth` 1440.
- Browser QA screenshots were saved as
  `YY-cdp-admin-beta-request-memory-desktop.png`,
  `YY-cdp-admin-beta-request-memory-mobile.png`, and
  `YY-cdp-app-design-request-memory.png`.
- `graphify update . --force`: regenerated code architecture artifacts with
  891 nodes, 1535 edges, and 57 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `MemoryOrchestrator`, `ChatPanel()`,
  `memoryTraceMetadata()`, `buildBrainFlowCoverageFromLedgers()`,
  `AdminView()`, and request-correlation ledger types.

## Remaining Work

- Populate real successful chat and voice flow evidence in the browser with
  deliberate provider-key spending when that is in scope.
- Continue tightening validated learner evidence paths for recall, corrections,
  and durable confidence movement.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 47: Validated Recall Confidence Movement

## Scope

Phase 47 makes durable learner confidence move from validated local recall
evidence, while preserving the earlier rule that model-summary confidence
proposals remain observational.

## Graphify Context

- Graphify routed this slice through `recordFlashcardReviewEvidence()`,
  `BKTEngine.updateConceptAttempt()`, `masteryFromEvidenceAttempt()`,
  `confidenceFromUnderstandingDelta()`, `revision.evidence.ts`,
  `bkt.engine.ts`, and `evidence.mastery.ts`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.
- `graphify path "recordFlashcardReviewEvidence()" "buildBKTConfidenceUpdate()"`
  found a three-hop path through `revision.evidence.ts` and `bkt.engine.ts`.
- A graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- Added conservative confidence deltas for recognition, generation, and transfer
  attempts.
- `BKTEngine.updateConceptAttempt()` now updates durable
  `PersistentConcept.confidence` alongside `p_learn` and `mastery` when a
  validated recall attempt is recorded.
- Evidence metadata now stores confidence before/after values, actual delta,
  signal delta, and `confidenceSource: "validated_recall_attempt"`.
- Model-summary confidence remains gated and cannot raise durable learner
  confidence.
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and App Design Language copy now document the
  validated recall confidence path.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 105 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA via
  `.workflow/brain-architecture-implementation-program/packets/phase47-browser-qa.mjs`:
  desktop User Brain Architecture rendered validated confidence copy at
  `1440x1000` with `scrollWidth` 1440 and zero captured browser errors.
- Headless Chrome CDP QA at `390x844`: mobile User Brain Architecture rendered
  the same copy with `scrollWidth` 390 and zero captured browser errors.
- Headless Chrome CDP QA confirmed desktop Tutor System Architecture rendered
  the validated flashcard confidence copy with `scrollWidth` 1440.
- Headless Chrome CDP QA confirmed desktop App Design Language rendered the
  Validated Confidence Meters pattern with `scrollWidth` 1440.
- Browser QA screenshots were saved as
  `ZZ-cdp-user-brain-confidence-desktop.png`,
  `ZZ-cdp-user-brain-confidence-mobile.png`,
  `ZZ-cdp-tutor-book-confidence.png`, and
  `ZZ-cdp-app-design-confidence.png`.
- `graphify update . --force`: regenerated code architecture artifacts with 898
  nodes, 1550 edges, and 54 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `confidenceFromEvidenceAttempt()`,
  `buildBKTConfidenceUpdate()`, `confidenceDeltaFromEvidenceAttempt()`,
  `BKTEngine`, `recordMasteryDelta()`, and `revision.evidence.ts`.

## Remaining Work

- Populate real successful chat and voice flow evidence in the browser with
  deliberate provider-key spending when that is in scope.
- Continue tightening correction and quiz evidence paths so more learner actions
  can move durable confidence through audited local evidence.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 48: Concept Correction Quarantine

## Scope

Phase 48 makes Admin correction propagation protect durable learner-state scores.
Before this slice, correction requests could mark connected local rows stale,
skipped, unsupported, conflicting, or unverified, but a corrected concept could
keep stale confidence/mastery in the `concepts` table.

## Graphify Context

- Graphify routed this slice through `CorrectionEvent`,
  `applyCorrectionPropagation()`, `correction.events.ts`,
  `PersistentConcept`, `longterm.memory.ts`, `AdminView()`, and
  `tests/correction-events.test.mjs`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.
- Graphify smoke query found `buildConceptCorrectionPatch()`,
  `applyCorrectionPropagation()`, `PersistentConcept`, `correctionState`,
  `confidence`, `mastery`, and `p_learn`.
- A graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- Added `concepts` as a correction propagation target.
- Added `correctionState` to durable `PersistentConcept` rows.
- `applyCorrectionPropagation()` now adds concept targets from direct concept
  correction requests and concept-linked correction requests.
- Mark-wrong, deletion-review, and supersede corrections clear durable concept
  confidence, cap mastery and BKT `p_learn` at 20%, and preserve before/after
  values in `correctionState`.
- Review-only concept corrections record review state without lowering learner
  scores.
- Admin, README, Tutor System Architecture, User Brain Architecture, Tutor
  System Architecture Library JSON, and App Design Language copy now document
  concept correction quarantine.
- `package.json` format scripts now include the changed correction and long-term
  memory files.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 107 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA via
  `.workflow/brain-architecture-implementation-program/packets/phase48-browser-qa.mjs`:
  desktop Admin Corrections rendered concept quarantine copy at `1440x1000`
  with `scrollWidth` 1440 and zero captured browser errors.
- Headless Chrome CDP QA at `390x844`: mobile Admin Corrections rendered the
  same copy with `scrollWidth` 390 and zero captured browser errors.
- Headless Chrome CDP QA confirmed desktop User Brain Architecture rendered the
  concept correction quarantine copy with `scrollWidth` 1440.
- Headless Chrome CDP QA confirmed desktop Tutor System Architecture rendered
  the concept correction quarantine copy with `scrollWidth` 1440.
- Headless Chrome CDP QA confirmed desktop App Design Language rendered the
  corrected-concept quarantine copy with `scrollWidth` 1440.
- Browser QA screenshots were saved as
  `AAA-cdp-admin-corrections-desktop.png`,
  `AAA-cdp-admin-corrections-mobile.png`,
  `AAA-cdp-user-brain-correction.png`, `AAA-cdp-tutor-book-correction.png`, and
  `AAA-cdp-app-design-correction.png`.
- `graphify update . --force`: regenerated code architecture artifacts with 900
  nodes, 1557 edges, and 59 communities.
- `npm run graphify:tree`: passed.

## Remaining Work

- Populate real successful chat and voice flow evidence in the browser with
  deliberate provider-key spending when that is in scope.
- Continue tightening quiz/evaluated-answer evidence paths so learner answers
  outside flashcards can move durable confidence through audited local evidence.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 49: Evaluated Answer Evidence Contract

## Scope

Phase 49 adds a local evidence contract for evaluated learner answers outside
flashcards. The slice does not add a quiz UI or live model grading; it creates
the reusable runtime boundary future quiz, chat, voice, and revision callers can
use safely.

## Graphify Context

- Graphify routed the slice through `answer.evidence.ts`,
  `evidence.mastery.ts`, `bkt.engine.ts`, `revision.evidence.ts`,
  `PersistentConcept`, and the existing evidence tests.
- `graphify path "recordEvaluatedAnswerEvidence()" "BKTEngine"` found a
  two-hop path through `answer.evidence.ts`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- Added `src/memory/answer.evidence.ts`.
- Evaluated answers skip BKT when they have no real concept id.
- Evaluated answers skip BKT when they have no explicit correct/incorrect
  outcome and no score/max-score evaluation.
- Valid evaluated answers call `BKTEngine.updateConceptAttempt()` with
  recognition, generation, or transfer evidence.
- Evidence metadata stores the evaluated-answer contract id, question preview,
  learner-answer preview, score ratio, threshold, rubric, evaluator, request,
  source, conversation, and book anchors.
- Admin, README, Tutor System Architecture, User Brain Architecture, Tutor
  System Architecture Library JSON, and App Design Language copy now describe
  evaluated answers as validated recall evidence while keeping model summaries
  observational.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 114 tests after Phase 50.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- In-app Browser QA confirmed desktop Admin Evidence, mobile Admin Evidence,
  User Brain Architecture, Tutor System Architecture, and App Design Language
  rendered evaluated-answer copy with no horizontal overflow and zero browser
  error/warning logs. The mobile Admin screenshot capture timed out, so that
  mobile pass is DOM evidence only.
- Screenshots were saved as `AAB-iab-admin-evidence-desktop.png`,
  `AAB-iab-user-brain-answer-evidence.png`, and
  `AAB-iab-app-design-answer-evidence.png`.
- `graphify update . --force`: regenerated code architecture artifacts with 918
  nodes, 1587 edges, and 54 communities after Phase 50.
- `npm run graphify:tree`: passed.

## Remaining Work

- Connect the helper to a real quiz/chat/voice answer-evaluation caller once
  that product slice is selected.
- Keep confidence calibration risk explicit until real evaluated-answer flows
  are exercised with provider-key spending.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 50: Audio Overview Single-Player Fallback

## Scope

Phase 50 responds to the updated objective: remove the visible local fallback
audio player from built-in chapter audio guides while keeping retry/fallback
playback in the background behind the same visible component.

## Graphify Context

- Graphify routed the slice through `StoredAudioOverview()`,
  `RevisionView.tsx`, `ChapterAudioOverview`, and
  `chapterAudioOverviews.ts`.
- `graphify path "StoredAudioOverview()" "ChapterAudioOverview"` found a
  two-hop path through `RevisionView.tsx`.
- The refreshed graph artifacts are the code architecture graph for agents, not
  the user-facing learner brain graph.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- Removed `showNativeControls` state from `StoredAudioOverview()`.
- The backing `<audio>` element remains present with the stored MP3 source, but
  no visible native controls and `className="sr-only"`.
- Playback retry messaging now tells the learner to retry the same player
  instead of using a native fallback player.
- Playback status now says `Playback retry available`.
- Added a regression test that prevents native fallback controls from returning.
- Tutor System Architecture, User Brain Architecture, Tutor System Architecture
  Library JSON, and App Design Language copy now describe one visible player
  with hidden background retry/fallback playback.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 114 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- In-app Browser QA at `1440x1000` confirmed:
  - one visible `Play` button;
  - backing `<audio>` element exists;
  - `audio.controls` is `false`;
  - `audio.className` is `sr-only`;
  - stored MP3 source is
    `/audio-overviews/user-brain-runtime-overview.mp3`;
  - no visible native media-control text such as `audio time scrubber` or
    `show more media controls`;
  - `scrollWidth` is 1440;
  - zero browser error/warning logs.
- Screenshot saved as `AAC-iab-audio-single-player.png`.
- `graphify update . --force`: regenerated code architecture artifacts with 918
  nodes, 1587 edges, and 54 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `StoredAudioOverview()`, `RevisionView.tsx`,
  `ChapterAudioOverview`, `chapterAudioOverviews.ts`, `answer.evidence.ts`,
  `recordEvaluatedAnswerEvidence()`, `evaluatedAnswerOutcome()`, `BKTEngine`,
  and `recordMasteryDelta()`.

## Remaining Work

- Continue wiring real chat and voice brain flows until foreground answers,
  background memory, evidence, retrieval, and tool calls all work together under
  live provider conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 51: Chat And Voice Evaluated-Answer Tool Wiring

## Scope

Phase 51 connects the Phase 49 evaluated-answer evidence contract to actual
typed-chat and live-voice tool paths. The slice adds a local `evaluate_answer`
tool for quiz and active-recall turns, while preserving the rule that BKT
mastery can move only when a real concept id and explicit evaluation are
present.

## Graphify Context

- Graphify routed the slice through `ChatPanel()`, `server.ts` chat tools,
  `voiceAgentTools.ts`, `answer.evidence.ts`, `beta.diagnostics.ts`, and
  `AdminView()`.
- The slice intentionally reads connected runtime and Admin files only.
- The refreshed Graphify artifact step is pending until final verification for
  this phase.

## Integration Decisions

- Added `evaluate_answer` to the chat SSE tool definitions.
- Chat server handling now stages `evaluatedAnswers` in the final `done` event
  and records tool/model/system metadata for the call.
- `ChatPanel` records staged chat evaluations through
  `recordEvaluatedAnswerEvidenceBatch()`.
- Added `evaluate_answer` to shared live voice tool definitions.
- Live voice records evaluated answers through the same batch helper and marks
  the tool job blocked when no evidence is recorded.
- `answer.evidence.ts` now exposes normalization and batch helpers so chat and
  voice share the same guardrails.
- Beta Diagnostics now requires verified, request-correlated non-model-summary
  evidence before complete brain-flow coverage can be ready.
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and App Design Language copy document the current
  chat/voice evaluated-answer path.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 117 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Browser QA was attempted with the in-app Browser at `localhost:3100`, but
  local socket connections are blocked in this environment with
  `EPERM`/`ERR_CONNECTION_REFUSED`. The package has no `brain:ui-regression`
  fallback script.
- `graphify update . --force`: regenerated code architecture artifacts with
  931 nodes, 1615 edges, and 61 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `recordEvaluatedAnswerEvidenceBatch()`,
  `ChatPanel()`, `answer.evidence.ts`,
  `normalizeEvaluatedAnswerEvidenceInput()`,
  `recordEvaluatedAnswerEvidence()`, `VOICE_AGENT_TOOL_DEFINITIONS`, and
  `VoiceAgentFunctionCall`.
- `graphify path "recordEvaluatedAnswerEvidenceBatch()" "ChatPanel()"` found a
  two-hop import/contains path.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Keep confidence calibration risk explicit until real provider-key chat and
  voice turns exercise evaluated-answer evidence in the browser.
- Browser-rendered Admin QA remains pending until the local socket restriction
  is lifted or a non-network UI regression harness is added.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 52: Learning-Book Concept Promotion For Evaluated Answers

## Scope

Phase 52 tightens the chat/voice evaluated-answer brain path. The previous
phase wired `evaluate_answer` into typed chat and live voice, but BKT still
depended on the active concept already existing in the persistent `concepts`
table. This phase promotes stored active learning-book concepts into
BKT-compatible persistent concepts before recording evaluated-answer evidence.

## Graphify Context

- Graphify routed the slice through `recordEvaluatedAnswerEvidence()`,
  `answer.evidence.ts`, `flashcard.concepts.ts`,
  `ensurePersistentConceptForLearningBookConcept()`, `LearningBookConcept`, and
  answer/flashcard evidence tests.
- `graphify path "recordEvaluatedAnswerEvidence()"
"ensurePersistentConceptForLearningBookConceptId()"` found a two-hop
  import/contains path through `answer.evidence.ts`.
- The refreshed Graphify artifacts are the code architecture graph for agents,
  not the user-facing learner brain graph.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Integration Decisions

- Added `ensurePersistentConceptForLearningBookConceptId()` to resolve existing
  persistent concepts or promote stored `LearningBookConcept` rows before BKT
  writes.
- Updated the default answer-evidence engine so
  `recordEvaluatedAnswerEvidence()` runs promotion before
  `BKTEngine.updateConceptAttempt()`.
- Added `conceptPromotionStatus` and `conceptPromotionError` evidence metadata
  for Admin/debug inspection.
- Kept unresolved promotion honest: BKT still reports `missing_concept` instead
  of fabricating learner mastery.
- Updated README, Tutor System Architecture, User Brain Architecture, Tutor
  System Architecture Library JSON, and App Design Language copy to describe
  the local concept-promotion boundary.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 120 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- In-app Browser QA on `http://localhost:3100` confirmed User Brain
  Architecture rendered promotion and `missing_concept` copy, with no horizontal
  overflow at `563px` client width.
- In-app Browser QA confirmed App Design Language / Local Beta Control Patterns
  rendered the `learning-book concept promotion status` copy with no horizontal
  overflow at `563px` and `390px` client widths.
- Browser screenshots were captured/displayed in-session. Saving screenshot
  bytes into workflow results from the browser runtime failed with filesystem
  `EPERM`, so no AAE screenshot files were written.
- `graphify update . --force`: regenerated code architecture artifacts with
  935 nodes, 1624 edges, and 63 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found
  `ensurePersistentConceptForLearningBookConceptId()`,
  `recordEvaluatedAnswerEvidence()`, `ConceptPromotionStatus`,
  `LearningBookConcept`, and related evidence helpers.
- Temporary local dev server on port `3100` was stopped after Browser QA.

## Remaining Work

- Run deliberate provider-key chat and voice turns when spending live model
  calls is in scope, so the whole evaluated-answer path is exercised against a
  real model/tool loop.
- Continue the broader brain architecture program until chat, voice, context
  injection, retrieval, tools, background memory, evidence, corrections, and
  Admin diagnostics all operate together under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 53: Dual-Agent Brain Flow Coverage

## Scope

Phase 53 tightens the local brain-flow readiness gate. Before this phase, Beta
Diagnostics could mark the local flow ready with any request-correlated
foreground tool job and any request-correlated evaluated mastery row. The user's
target is stricter: typed chat and live voice should both have stored,
injected, tool-calling, and evaluated-evidence paths. This phase makes those
agent layers separate readiness signals.

## Graphify Context

- Graphify routed the slice through `buildBrainFlowCoverageFromLedgers()`,
  `beta.diagnostics.ts`, `AdminView()`, `EvidenceEvent`, `ToolJob`, and
  `tests/beta-diagnostics.test.mjs`.
- `graphify path "buildBrainFlowCoverageFromLedgers()" "AdminView()"` found a
  direct call edge.
- The refreshed Graphify artifacts are the code architecture graph for agents,
  not the user-facing learner brain graph.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes after
  a clean rebuild.

## Integration Decisions

- Split foreground tool readiness into `Chat tool calls` and `Voice tool calls`.
- Split evaluated mastery readiness into `Chat evaluated mastery` and
  `Voice evaluated mastery`.
- Added chat/voice-specific count fields to `BetaBrainFlowCoverage`.
- Reused existing `agentLayer`, `mode`, and tool-job `source` metadata instead
  of inventing new ledgers.
- Updated Admin Beta Diagnostics copy and grid layout for the stricter
  eight-signal verifier.
- Updated README, Tutor System Architecture, User Brain Architecture, Tutor
  System Architecture Library JSON, and App Design Language copy to describe
  both foreground tool layers and both evaluated mastery layers.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 121 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- In-app Browser QA on `http://localhost:3100` confirmed Admin Beta Diagnostics
  rendered the eight stricter signals at desktop width with no horizontal
  overflow.
- In-app Browser QA confirmed the compact mobile Admin `Beta` tab and the same
  eight-signal Beta Diagnostics content at `390px` width with no horizontal
  overflow.
- Initial Graphify regeneration picked up generated `server.mjs` from the dev
  server. The generated file was removed and Graphify was cleanly rebuilt with
  approval after sandbox `Operation not permitted`.
- Clean `graphify update . --force`: regenerated code architecture artifacts
  with 938 nodes, 1629 edges, and 55 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `buildBrainFlowCoverageFromLedgers()`,
  `isChatLayer()`, `isVoiceLayer()`, `BetaBrainFlowCoverage`, and Admin edges.
- Temporary local dev server on port `3100` was stopped after Browser QA.

## Remaining Work

- Run deliberate provider-key chat and voice turns when spending live model
  calls is in scope, so the stricter readiness gate can be populated by real
  beta traffic.
- Continue the broader brain architecture program until the live app proves
  chat, voice, context injection, retrieval, tools, background memory, evidence,
  corrections, and Admin diagnostics all operate together.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 54: Multi-PDF Brain Context Parity

## Scope

Phase 54 addresses the user's latest concrete brain-architecture gap: when
multiple PDFs are added to a learning book, chat and voice should not only see
the PDF currently on screen. They should receive a shared local packet that
represents the active book's ready documents while still marking the active PDF.

## Graphify Context

- Graphify CLI routed this slice through `ChatPanel.tsx`,
  `src/memory/brain.context.ts`, `server.ts`, `tests/brain-context.test.mjs`,
  `tests/system-activity.test.mjs`, `README.md`, and `RevisionView.tsx`.
- Graphify MCP appeared stale for this thread and returned unrelated
  player/anime nodes, so the explicit local `graphify-out/graph.json` CLI path
  was used for architecture navigation.

## Integration Decisions

- `buildBrainDocumentContext()` now creates a ready-document index, marks the
  active document, and balances excerpts across up to six ready PDFs.
- Voice packets now assemble active-book and multi-document context before long
  semantic memory, so live voice prompt compaction keeps the document set in
  view.
- Voice auth and system activity metadata now carry attached `documentIds`, and
  brain-context memory events also store those ids in metadata.
- The stored audio-overview UI keeps one visible player. Playback failures now
  use bounded retry through the same hidden audio element without fallback-button
  language.
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and App Design Language copy were updated to match
  the implementation.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 123 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Browser QA confirmed Tutor System Architecture chapter 5 rendered the balanced
  ready-document index/excerpt copy and one visible audio player.
- Browser QA confirmed desktop Admin Beta Diagnostics rendered Brain Flow
  Coverage, chat/voice tool signals, no horizontal overflow, and zero browser
  error logs.
- Browser QA confirmed mobile Admin Beta rendered Brain Flow Coverage, chat/voice
  tool signals, no horizontal overflow, and zero browser error logs at `390px`.
- Browser QA confirmed App Design Language / Local Beta Control Patterns rendered
  balanced multi-PDF context copy, bounded hidden retry copy, one visible audio
  player, no horizontal overflow, and zero browser error logs.
- `graphify update . --force`: regenerated code architecture artifacts with 942
  nodes, 1634 edges, and 56 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `buildBrainDocumentContext()`,
  `assembleBrainContextSections()`, `VoiceStudyContextPayload`,
  `BrainDocumentContextOptions`, and `buildBrainContextPacket()`.
- `graphify path "buildBrainDocumentContext()" "ChatPanel()"`: found a three-hop
  path through `brain.context.ts` and `ChatPanel.tsx`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
- Scratch cleanup found no `server.mjs`, `.tmp-test`, or running
  `node server.mjs` process after Browser QA.

## Remaining Work

- Run deliberate provider-key chat and voice turns when spending live model
  calls is in scope, so the end-to-end flow can be populated with real traffic.
- Continue the broader brain architecture program until chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together
  under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 55: Synthetic Dual-Agent Wiring Rehearsal

## Scope

Phase 55 adds an Admin-only deterministic rehearsal for the local typed-chat and
live-voice brain contracts. It exercises shared context and tool-definition
code without letting synthetic evidence masquerade as a learner turn or beta
traffic.

## Graphify Context

- Graphify routed the slice through `runLocalBrainWiringRehearsal()`,
  `buildBrainContextPacket()`, `buildBrainDocumentContext()`,
  `buildBrainFlowCoverageFromLedgers()`, `AdminView()`, `server.ts`,
  `chatAgentTools.ts`, and `voiceAgentTools.ts`.
- `graphify path "runLocalBrainWiringRehearsal()" "AdminView()"` found a
  two-hop path through `buildBrainFlowCoverageFromLedgers()`.
- The refreshed Graphify artifacts are the code architecture graph for agents,
  not the user-facing learner brain graph.

## Integration Decisions

- Extracted typed-chat provider tools into `buildChatAgentToolDefinitions()` so
  the chat server path and rehearsal inspect the same definitions.
- Added `runLocalBrainWiringRehearsal()` to assemble active plus companion PDF
  context with shared helpers, create request-correlated chat/voice packet
  events, compare typed-chat and live-voice tool parity, and feed in-memory rows
  into the existing eight-signal verifier.
- Kept the result explicit: `evidenceSource: synthetic_local_rehearsal`,
  `countsTowardBetaReadiness: false`, `persisted: false`, and
  `liveCoverageMutated: false`.
- Added an Admin Beta Diagnostics panel that renders the synthetic result
  beside the unchanged authoritative live coverage meter.
- Updated README, Tutor System Architecture, User Brain Architecture, the
  built-in Tutor Architecture book, and App Design Language control patterns.
- AWS/cloud synchronization remains intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 126 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the checkout has no `brain:postchange` script.
- Browser QA on Admin Beta Diagnostics at `1440x1000`, `768x1024`, and
  `390x844`: rehearsal showed `synthetic ready` and `100%` synthetic contract,
  while live coverage stayed `0% watch`, local rows stayed `92`, overflow
  stayed false, and browser error logs stayed empty.
- Desktop keyboard QA reran the rehearsal with Enter without changing live
  coverage or row totals.
- Reader QA confirmed the new boundary in App Design Language, Tutor System
  Architecture, and User Brain Architecture. Each rendered with one visible
  stored-audio player and no browser errors.
- `graphify update . --force`: passed, `959` nodes, `1677` edges, `56`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found the rehearsal, shared typed-chat tool builder,
  shared context helpers, live verifier, tests, and Admin route.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when spending live model
  calls is in scope. Synthetic rehearsal proves wiring contracts, not provider
  behavior or learner evidence.
- Continue broader local beta validation until real chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 56: Generated-Note Preview Lexical Support

## Scope

Phase 56 closes the next local generated-note trust gap. Notes with saved
document previews now need local summary-preview to source-preview lexical
support before their scoped local integrity check can pass.

## Graphify Context

- `graphify path "createGeneratedNoteSourceSpans()"
"recordGeneratedNotesArtifact()"` found a two-hop path through
  `artifact.records.ts`.
- `graphify path "recordGeneratedNotesArtifact()"
"verifyArtifactCitationIntegrity()"` found a two-hop path through
  `artifact.records.ts`.
- Graphify routed the slice through `artifact.records.ts`,
  `memory.orchestrator.ts`, artifact tests, Admin Source Artifacts, and the
  architecture/design books.

## Integration Decisions

- Added `createGeneratedNoteClaimSpanCoverage()` with compact claim splitting,
  normalized meaningful terms, best-span overlap, matched/partial/missing state,
  matched counts, percentage, and explicit `semanticEntailmentChecked: false`
  and `factualTruthChecked: false` flags.
- Kept no-document notes provenance-only. Notes with saved spans require local
  lexical support for every compact saved claim preview.
- Mapped insufficient support to `unavailable`, not `conflicting`. Reserved
  `conflicting` for saved count, id, citation-id, and preview-id drift.
- Added a `claimSpanPolicy` marker to generated-note metadata.
- Added Admin row-level preview lexical-support state, matched claims, percent,
  and local-overlap-only boundary copy.
- Admin rows prefer the latest recomputed citation-integrity coverage report
  after a local rerun, falling back to the write-time snapshot before reruns.
- Updated Tutor System Architecture, User Brain Architecture, the built-in
  Tutor Architecture book, and App Design Language control patterns.
- Refreshed three affected 3-4 minute stored audio guides with Deepgram Aura
  Odysseus at speed `1`.
- Kept AWS/cloud synchronization intentionally deferred.

## Sidecar Findings

- Ramanujan recommended the bounded no-fetch lexical overlap report and the
  conservative `unavailable` mapping for insufficient support.
- Carson mapped the following local-beta queue slice: add a local-only durable
  background queue with retries and dead-letter review for bounded generated
  note matching jobs without changing foreground tool telemetry.

## Verification Evidence

- Focused `artifact-records.test.mjs`: passed, 34 tests.
- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: sandbox run reached 121 passing tests and failed only on the
  known local socket-binding restriction; approved rerun passed, 129 tests.
- `npm run build`: passed.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing assets.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the checkout has no `brain:postchange` script.
- Browser QA confirmed Admin Sources at `1440x1000` and `390x844` rendered the
  lexical-support and honest-boundary copy with no horizontal overflow and no
  browser warnings or errors. The seeded browser database had no generated-note
  rows, so row-state cases remain covered by focused tests.
- Browser QA confirmed the affected User Brain, Tutor Architecture, and App
  Design reader chapters rendered updated copy with one visible player, no
  native media controls, no horizontal overflow, and clean logs.
- Refreshed MP3s measured about `3:30`, `3:14`, and `3:44`.
- `graphify update . --force`: passed, `968` nodes, `1692` edges, and `54`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found the matcher, normalization helpers, verifier,
  generated-note record builder, and Admin route.
- `graphify path "createGeneratedNoteClaimSpanCoverage()" "AdminView()"` found
  a three-hop path through `artifact.records.ts` and `AdminView.tsx`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Add stronger semantic and document-wide grounding beyond compact saved
  previews.
- Add verifier contracts for charts, code snippets, images, websites, previews,
  and other unsupported artifact kinds.
- Add audio-content transcript matching beyond manifest integrity.
- Add a durable local background queue with retries and dead-letter review.
- Run deliberate provider-key chat and voice turns when spending live model
  calls is in scope.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 57: Active-Book PDF Manifest Context

## Scope

Phase 57 tightens the shared typed-chat/live-voice brain-context packet so the
active learning book's full PDF set remains visible to the foreground agent and
to Admin. The slice focuses on local packet metadata and UI evidence; it does
not spend provider-key chat or real Deepgram voice calls.

## Graphify Context

- `graphify query "ChatPanel multi PDF document context voice memory
orchestrator active book source materials" --budget 5000 --graph
graphify-out/graph.json` routed the slice through `ChatPanel.tsx`,
  `StudyView.tsx`, `memory.orchestrator.ts`, `brain.context.ts`,
  `longterm.memory.ts`, store, and tests.
- `graphify path "buildBrainDocumentContext()" "ChatPanel()" --graph
graphify-out/graph.json` found the connected packet path through
  `brain.context.ts` and `ChatPanel.tsx`.
- `graphify query "AudioOverviewPlayer fallback local audio overview play button
RevisionView tutor book chapter audio" --budget 4000 --graph
graphify-out/graph.json` confirmed the single-player audio surface is
  `StoredAudioOverview()` in `RevisionView.tsx`.

## Integration Decisions

- Added `buildBrainDocumentContextReport()` to emit an active-book PDF manifest,
  ready excerpt context, and counts for added, ready, excerpted, pending/failed,
  and omitted ready PDFs.
- Kept non-ready PDFs visible as manifest-only rows instead of pretending they
  have usable extracted text.
- Added packet metadata fields for `readyDocumentIds`, `contextDocumentIds`,
  `readyDocumentCount`, `unreadyDocumentCount`, and
  `omittedReadyDocumentCount`.
- Threaded the metadata through typed chat `/api/chat` requests, live voice
  websocket auth, server system-activity rows, voice study-context activity, and
  Admin request timeline chips.
- Updated README, Tutor System Architecture, User Brain Architecture, the
  built-in Tutor Architecture book, and App Design Language control patterns.
- Confirmed the stored audio-overview UI still exposes one visible player and
  hidden retry inside the same component, not a second play button.
- Kept AWS/cloud synchronization intentionally deferred.

## Verification Evidence

- `npm run format`: passed.
- Workflow verifier: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 131 tests.
- `npm run build`: passed.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing stored
  guide assets.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the checkout has no `brain:postchange` script.
- Browser QA confirmed Admin request timelines at `1440x1000` and `390x844`
  rendered with no horizontal overflow. The in-app Browser read-only evaluation
  context did not expose IndexedDB, so live seeded multi-PDF Admin chips remain
  covered by focused tests instead of browser-seeded data.
- Browser QA confirmed App Design Language / Local Beta Control Patterns at
  `390x844` and `1440x1000` rendered the new PDF manifest copy with one visible
  `Play` button, one hidden audio element, zero native controls, and no
  horizontal overflow.
- Screenshots saved as `ABJ-iab-admin-desktop.png`,
  `ABJ-iab-admin-mobile.png`, and `ABJ-iab-app-design-desktop.png`.
- `graphify update . --force`: passed, `978` nodes, `1707` edges, and `63`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `buildBrainDocumentContextReport()`,
  `buildBrainContextPacket()`, `ChatPanel()`, `AdminRequestTimeline`, and
  `AdminView()`.
- `graphify path "buildBrainDocumentContextReport()" "AdminView()"` found a
  four-hop path through `brain.context.ts`, `ChatPanel.tsx`, and `useStore`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when spending live
  provider calls is in scope.
- Add a durable local background queue with retries and dead-letter review.
- Add stronger semantic and document-wide grounding beyond compact saved
  previews.
- AWS/cloud synchronization remains out of scope until beta testing.

# Phase 58: Model-Observation Evidence Gate

## Scope

Phase 58 tightens the learner-brain trust boundary for background model-summary
writes. It keeps generated learning-book and concept updates useful, but marks
them as audit-only observations that cannot mutate durable mastery or learner
confidence. It also simplifies the Admin Center preface copy and adds a regular
progress estimate for the broader brain architecture program.

Current conservative brain-architecture completion estimate after final gates:
about 69%.

## Graphify Context

- `graphify query "evidence gated memory orchestrator BrainContextPacket dual
agent tool calls chat voice Admin system activity mastery updates" --budget
5000 --graph graphify-out/graph.json` routed the slice through
  `BrainContextPacket`, `voice-agent-tools.test.mjs`, and local evidence tests.
- `graphify path "MemoryOrchestrator" "AdminView()" --graph
graphify-out/graph.json` found the four-hop source path through
  `memory.orchestrator.ts`, `longterm.memory.ts`, and `AdminView.tsx`.
- `graphify query "memory.orchestrator.ts
updateLearningBookFromConversation createBrainContextMemoryEventInput system
activity memory event" --budget 5000 --graph graphify-out/graph.json`
  identified `memory.orchestrator.ts`, `evidence.mastery.ts`,
  `evidence.ledger.ts`, `beta.diagnostics.ts`, `brain.rehearsal.ts`,
  `AdminView.tsx`, and tests as the connected source surface.

## Integration Decisions

- Added `modelObservationGateMetadata()` and the `model_observation_v1`
  evidence contract.
- Stamped learning-book concept updates, learning-book updates, and graph
  concept updates with non-verified model-observation metadata and no-mutation
  gates for mastery and confidence.
- Extended Beta Diagnostics from the previous eight-signal local brain-flow
  verifier to a nine-signal verifier that also requires model-observation
  gates on background model-summary rows.
- Updated the synthetic local brain wiring rehearsal so synthetic rows satisfy
  the same nine-signal contract without writing Dexie or counting toward live
  readiness.
- Added Admin request-timeline memory chips for audit-only observation,
  verified-evidence state, mastery mutation, and confidence mutation.
- Simplified the Admin Center paragraph into a short plain-language summary.
- Updated README, Tutor System Architecture, User Brain Architecture, Tutor
  Architecture Library JSON, and App Design Language copy.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 133 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser QA confirmed Admin Beta Diagnostics at `1440x1000` and `390x844`
  rendered the simplified Admin copy, Evidence gate signal, nine-signal wording,
  no horizontal overflow, and zero warning/error logs.
- Browser QA screenshots saved as `ABK-iab-admin-beta-desktop.png` and
  `ABK-iab-admin-beta-mobile.png`.
- `graphify update . --force`: passed, `988` nodes, `1727` edges, and `61`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `modelObservationGateMetadata()`,
  `MemoryOrchestrator`, `buildBrainFlowCoverageFromLedgers()`, `AdminView()`,
  and the model-observation constants.
- `graphify path "modelObservationGateMetadata()" "AdminView()"` found a
  three-hop path through `runLocalBrainWiringRehearsal()` and `AdminView.tsx`.
- `graphify path "modelObservationGateMetadata()" "MemoryOrchestrator"` found a
  two-hop path through `memory.orchestrator.ts`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
- Workflow verifier passed.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing stored
  guide assets.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when spending live
  provider calls is in scope.
- Add a durable local background queue with retries and dead-letter review.
- Continue broader local beta validation until real chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together
  under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 59: Durable Background Job Ledger

Phase 59 closes the first local retry/dead-letter gap for behind-the-scenes
memory work. Interaction-memory capture now records a durable background-job row
instead of running only as an untracked timer, and Admin can inspect active,
retry-scheduled, completed, and dead-letter states.

Current conservative brain-architecture completion estimate after final gates:
about 72%.

## Graphify Context

- `graphify query "background queue retry dead letter MemoryOrchestrator
setTimeout learning book update Admin diagnostics memory events background
jobs" --budget 6000 --graph graphify-out/graph.json` routed the slice through
  `MemoryOrchestrator`, `memory.events.ts`, `longterm.memory.ts`, and Admin
  diagnostics surfaces.
- `graphify query "longterm.memory Dexie toolJobs modelRuns memoryEvents retry
status queued running failed blocked AdminView beta diagnostics" --budget
6000 --graph graphify-out/graph.json` identified the existing ledger patterns
  in `ToolJob`, `ModelRun`, and `AdminView.tsx`.
- `graphify path "MemoryOrchestrator" "AdminView()" --graph
graphify-out/graph.json` confirmed the runtime-to-Admin route through the
  local memory database.
- `graphify path "recordMemoryEvent()" "buildBetaDiagnosticsSnapshot()"
--graph graphify-out/graph.json` confirmed the diagnostics route through
  memory events and Admin.

## Integration Decisions

- Added Dexie schema version 14 and a `backgroundJobs` table for local job
  evidence.
- Added `src/memory/background.jobs.ts` for compact job rows, status
  normalization, stable ids, retry routing, and a local async runner.
- Wrapped `MemoryOrchestrator.trackInteraction()` with a durable job id and
  queued/running/completed/retry/dead-letter records.
- Made the interaction write idempotent under retry by writing with the stable
  interaction id.
- Added Admin Activity request-timeline rows and meters for background jobs.
- Added Beta Diagnostics dead-letter blocking plus diagnostic export coverage.
- Updated README, Tutor System Architecture, User Brain Architecture, Tutor
  Architecture Library JSON, and App Design Language copy.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 138 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Browser QA on `http://localhost:3100/admin`: Admin Activity showed the
  Background jobs meter; Admin Beta showed Background Job Ledger, Local retry
  and dead-letter visibility, Dead-letter, Export contents, Background jobs,
  and Diagnostic snapshot and export with zero warning/error logs.
- Browser QA at `390x844`: Admin Beta rendered the same background-job ledger
  copy with `scrollWidth` 390 and zero warning/error logs.
- Browser QA screenshots saved as `ABL-iab-admin-beta-desktop.png`,
  `ABL-iab-admin-beta-mobile.png`, `ABL-iab-admin-beta-fullpage.png`, and
  `ABL-iab-admin-background-job-card-desktop.png`.
- `graphify update . --force`: passed, `1006` nodes, `1772` edges, and `59`
  communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `background.jobs.ts`, `BackgroundJob`,
  `runBackgroundJob()`, `recordBackgroundJobEvent()`, `MemoryOrchestrator`,
  `AdminView()`, and `buildBetaDiagnosticsSnapshot()`.
- `graphify path "runBackgroundJob()" "AdminView()"` found a four-hop path
  through `background.jobs.ts`, `BackgroundJob`, and `AdminView.tsx`.
- `graphify path "BackgroundJob" "buildBetaDiagnosticsSnapshot()"` found a
  two-hop path through `beta.diagnostics.ts`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.
- `npm run audio:overview:dry-run`: passed, 25 present and 0 missing stored
  guide assets.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when spending live
  provider calls is in scope.
- Add broader scheduler controls for more background job kinds after the
  interaction-memory queue proves stable.
- Continue broader local beta validation until real chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together
  under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 60: Chat/Voice Thread Persistence Observability

Packet ABN closes the local proof gap between "a thread was written to
IndexedDB" and "Admin/Beta can see durable evidence that typed-chat and
live-voice transcript threads were saved." The app now emits local
`book_chat_thread_saved` memory events when normalized book-scoped threads
change, and Admin/Beta expose those rows without implementing AWS/cloud sync.

Current conservative brain-architecture completion estimate after final gates:
about 76%.

## Graphify Context

- `graphify query "ChatPanel persistBookChatThread voice session messages voice
turns stored injected tools MemoryOrchestrator trackInteraction
updateLearningBookFromConversation book chat thread Admin proof" --budget 7000
--graph graphify-out/graph.json` routed the slice through
  `persistBookChatThread()`, `ChatPanel()`, `MemoryOrchestrator`, `AdminView()`,
  `bookChatThreads`, and `recordMemoryEvent()`.
- `graphify query "remaining brain architecture live provider-key chat voice
end-to-end proof memory injection tool calls evaluated_answer background jobs
Admin Beta Diagnostics runLocalBrainWiringRehearsal" --budget 7000 --graph
graphify-out/graph.json` identified `runLocalBrainWiringRehearsal()`,
  `buildBrainFlowCoverageFromLedgers()`, `AdminView()`, and the local
  diagnostic verifier as downstream contract surfaces.

## Integration Decisions

- Added typed/voice/mixed chat-thread persistence summaries in
  `chatThreadUtils.ts`.
- Added `book_chat_thread_saved` as a durable local memory event type.
- Updated `persistBookChatThread()` to emit low-noise memory events only when
  the normalized thread persistence signature changes.
- Extended Beta Diagnostics from the previous nine-signal verifier to an
  eleven-signal verifier that requires both `Chat thread saved` and
  `Voice thread saved` evidence.
- Added Admin Memory saved-thread cards, typed/voice counts, latest-thread
  context, diagnostics counts, and diagnostics-export coverage for
  `bookChatThreads`.
- Updated the synthetic local brain wiring rehearsal to satisfy the same
  eleven-signal verifier without writing live beta rows.

## Verification Evidence

- `npm run format`: passed.
- `npm run lint`: passed.
- Focused contract tests passed with
  `node --test --test-name-pattern "brain flow|beta diagnostics|local brain wiring|synthetic rehearsal|chat thread persistence" tests/beta-diagnostics.test.mjs tests/brain-rehearsal.test.mjs tests/chat-thread-utils.test.mjs`.
- `npm run test`: passed, 140 tests.
- `npm run build`: passed.
- In-app Browser QA at `1440x900` confirmed Admin Beta rendered Brain Flow
  Coverage, Chat thread saved, Voice thread saved, and Conversation
  persistence with zero horizontal overflow and zero clipped cards.
- In-app Browser QA at `1440x900` confirmed Admin Memory rendered Saved
  threads, Rows, Typed, Voice, and Latest thread with zero horizontal overflow
  and zero clipped cards.
- In-app Browser QA at `390x844` confirmed Admin Beta and Memory rendered the
  same thread persistence surfaces with zero horizontal overflow, zero clipped
  text blocks, and no browser warning/error logs.
- Clean `graphify update . --force` plus `npm run graphify:tree`: passed,
  regenerating `graphify-out` with `1017` nodes, `1808` edges, and `61`
  communities.
- Graphify smoke query found `persistBookChatThread()`,
  `summarizeChatThreadPersistence()`, `recordBookChatThreadSaveEvent()`,
  `recordMemoryEvent()`, `AdminView()`, `buildBrainFlowCoverageFromLedgers()`,
  and `runLocalBrainWiringRehearsal()`.
- Graphify path `persistBookChatThread()` to `AdminView()` found a three-hop
  route through `ChatPanel.tsx` and `useStore`.
- Graphify path `summarizeChatThreadPersistence()` to
  `buildBrainFlowCoverageFromLedgers()` found a two-hop route through
  `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when spending live
  provider calls is in scope, so the new persistence signals can move from
  missing to ready in live beta data.
- Continue broader local beta validation until real chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together
  under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 61: Request-Correlated Transcript Persistence

Packet ABO closes the next local proof gap after Packet ABN: saved transcript
rows are now joinable to request/session IDs. This lets Admin request timelines
show transcript persistence beside retrieval, model, tool, background-job, and
brain-context evidence, and it makes Beta Diagnostics reject uncorrelated saved
thread rows.

Current conservative brain-architecture completion estimate after final gates:
about 78%.

## Graphify Context

- `graphify query "remaining brain architecture gaps live provider-key chat
voice end-to-end proof stored injected tool calling both agent layers Admin
Beta Diagnostics book_chat_thread_saved brain_context_injected
evaluate_answer toolJobs runLocalBrainWiringRehearsal" --budget 8000 --graph
graphify-out/graph.json` routed the slice through
  `runLocalBrainWiringRehearsal()`, `ChatPanel.tsx`, `AdminView.tsx`,
  `longterm.memory.ts`, `memory.orchestrator.ts`, `beta.diagnostics.ts`,
  `brain.context.ts`, and `tool.jobs.ts`.
- `graphify query "AdminRequestTimeline requestIdForRetrievalEvent
memoryEvents metadata requestId toolJobs modelRuns backgroundJobs
book_chat_thread_saved" --budget 6000 --graph graphify-out/graph.json`
  selected the Admin request timeline and request-ID grouping surface.
- `graphify query "Message type requestId ChatPanel voiceSession sessionId
appendVoiceTurn sendVoiceText stopVoice persisted thread metadata requestIds"
--budget 6000 --graph graphify-out/graph.json` selected the chat/voice
  message contract.
- `graphify path "persistBookChatThread()" "AdminRequestTimeline" --graph
graphify-out/graph.json` confirmed the saved-thread-to-Admin route through
  `summarizeChatThreadPersistence()` and `AdminView.tsx`.

## Integration Decisions

- Added optional `requestId` to `Message`.
- Stamped typed-chat user and assistant messages with the same generated
  `chat-*` request ID.
- Stamped live voice session transcript messages with the voice session ID.
- Extended `summarizeChatThreadPersistence()` with compact `requestIds`,
  `lastRequestId`, and `requestCorrelated` fields.
- Added `requestId`, `requestIds`, `requestCorrelated`, `traceId`, and
  voice-session `sessionId` metadata to `book_chat_thread_saved` rows.
- Updated synthetic local brain wiring rehearsal rows to satisfy the same
  request-correlated transcript contract.
- Tightened Beta Diagnostics so typed-chat and voice transcript persistence
  signals require request-correlated saved-thread rows.
- Added saved-transcript chips to Admin request timelines and tightened Activity
  mobile layout around request timelines, meters, and tuning rows.

## Verification Evidence

- `npm run format`: passed.
- `npm run lint`: passed.
- Focused contract tests passed with
  `node --test --test-name-pattern "brain flow|beta diagnostics|local brain wiring|synthetic rehearsal|chat thread persistence" tests/beta-diagnostics.test.mjs tests/brain-rehearsal.test.mjs tests/chat-thread-utils.test.mjs`.
- `npm run test`: passed, 141 tests.
- `npm run build`: passed.
- Headless Chrome CDP QA at `390x844` confirmed Admin Activity rendered saved
  transcript memory-row request timeline copy with `horizontalOverflow: 0` and
  no measured overflow elements.
- Headless Chrome CDP QA at `390x844` confirmed Admin Diagnostics rendered
  request timeline copy, Chat thread saved, and Voice thread saved with
  `horizontalOverflow: 0` and no measured overflow elements.
- Headless Chrome CDP QA at `1440x900` confirmed Admin Activity and Diagnostics
  rendered the same request-correlation surfaces with `horizontalOverflow: 0`
  and no measured overflow elements.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with `1018` nodes, `1809` edges, and `65` communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `requestCorrelatedThreadPersistenceEvents`,
  `book_chat_thread_saved`, `persistBookChatThread()`,
  `summarizeChatThreadPersistence()`, `AdminRequestTimeline`, and
  `buildBrainFlowCoverageFromLedgers()`.
- Graphify path `persistBookChatThread()` to `AdminRequestTimeline` found a
  four-hop route through `shouldRecordBookChatThreadSave()`,
  `summarizeChatThreadPersistence()`, and `AdminView.tsx`.
- Graphify path `summarizeChatThreadPersistence()` to
  `buildBrainFlowCoverageFromLedgers()` found a two-hop route through
  `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed-chat and real voice turns when spending live
  provider calls is in scope, so request-correlated transcript rows can be
  proven from real beta traffic.
- Continue broader local beta validation until real chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together
  under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 62: Rehearsal Live-Gap Proof Surface

Packet ABP makes the local brain wiring rehearsal more useful for the next beta
step. Admin can now run the synthetic rehearsal and see both sides of the proof:
the in-memory eleven-signal contract pass and the live local ledger evidence
that still has to be filled by real chat and voice turns.

Current conservative brain-architecture completion estimate after final gates:
about 80%.

## Graphify Context

- `graphify query "remaining brain architecture gaps after request-correlated
transcript persistence live provider-key chat voice end-to-end proof stored
injected tool calling both agent layers Admin Beta Diagnostics
runLocalBrainWiringRehearsal local verifier" --budget 8000 --graph
graphify-out/graph.json` routed the slice through
  `runLocalBrainWiringRehearsal()`, `buildBrainFlowCoverageFromLedgers()`,
  `AdminView()`, `brain.context.ts`, `chatAgentTools.ts`,
  `voiceAgentTools.ts`, and `tests/brain-rehearsal.test.mjs`.
- `graphify query "Admin Diagnostics run local brain wiring rehearsal button
synthetic verifier live ledger proof chat voice request correlated tools
memory retrieval model runs source files" --budget 8000 --graph
graphify-out/graph.json` selected the Admin Diagnostics rehearsal panel and
  live ledger contract surfaces.

## Integration Decisions

- Added `BrainWiringRehearsalGap` and
  `summarizeBrainWiringRehearsalGap()` to keep synthetic contract coverage
  separate from live beta ledger coverage.
- Added `chatRequestId` and `voiceRequestId` to rehearsal results so Admin can
  show the exact synthetic request anchors.
- Updated Admin Diagnostics rehearsal copy from nine-signal to eleven-signal.
- Added a `Live beta gap` panel after rehearsal that shows synthetic coverage,
  live coverage, provider-key readiness, and missing live ledger signals.
- Added a `Rehearsed contracts` panel that exposes chat/voice request IDs,
  multi-PDF context IDs, and chat/voice tool chips.

## Verification Evidence

- `npm run format`: passed.
- `npm run lint`: passed.
- Focused `node --test tests/brain-rehearsal.test.mjs`: passed, 4 tests.
- `npm run test`: passed, 142 tests.
- `npm run build`: passed.
- Headless Chrome CDP QA at `390x844` clicked Admin Diagnostics `Run local
rehearsal` and confirmed live beta gap, provider-key ready, rehearsed
  contracts, chat tools, voice tools, request IDs, context PDF IDs,
  eleven-signal copy, and `horizontalOverflow: 0`.
- Headless Chrome CDP QA at `1440x900` confirmed the same Admin Diagnostics
  rehearsal surface with `horizontalOverflow: 0`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with `1021` nodes, `1813` edges, and `63` communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `summarizeBrainWiringRehearsalGap()`,
  `BrainWiringRehearsalGap`, `runLocalBrainWiringRehearsal()`, and
  `AdminView()`.
- Graphify path `summarizeBrainWiringRehearsalGap()` to `AdminView()` found a
  two-hop route through `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when spending live provider
  calls is in scope, then use the new live-gap panel to confirm real traffic
  fills the remaining ledger signals.
- Continue broader local beta validation until real chat, voice, retrieval,
  tools, memory, evidence, corrections, Admin, and Revision operate together
  under live beta conditions.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 63: Live Multi-PDF Beta Proof Gate

Packet ABQ turns the existing multi-PDF chat/voice context behavior into a
local beta proof gate. The app already builds shared brain-context packets from
the active learning book and multiple ready PDFs; this phase makes Beta
Diagnostics require separate typed-chat and live-voice evidence that more than
one ready PDF actually reached the request-correlated prompt context.

Current conservative brain-architecture completion estimate after final gates:
about 82%.

## Graphify Context

- `graphify query "brain architecture next implementation slice multi PDF
context injection chat voice mode stored injected tool calling agent layers
Admin diagnostics live beta proof" --budget 8000 --graph
graphify-out/graph.json` routed the slice through `brain.context.ts`,
  `ChatPanel.tsx`, `voiceAgentTools.ts`, `beta.diagnostics.ts`,
  `brain.rehearsal.ts`, `AdminView.tsx`, and `tests/brain-context.test.mjs`.
- `graphify query "userBrainArchitectureBook tutorBook app design book system
architecture beta diagnostics thirteen signal multi-PDF context Admin source
files" --budget 7000 --graph graphify-out/graph.json` routed the book/design
  updates through `userBrainArchitectureBook.ts`, `tutorBook.json`,
  `RevisionView.tsx`, and audio-overview plan tests.

## Integration Decisions

- Added chat and voice multi-PDF context counters to
  `BetaBrainFlowCoverage`.
- Added `Chat multi-PDF context` and `Voice multi-PDF context` signals. Each
  requires request-correlated context metadata with more than one active-book
  document and more than one `contextDocumentIds` entry.
- Kept the existing packet builder behavior unchanged: it still orders the
  active document first and includes up to six ready PDFs by prompt budget.
- Updated Admin and rehearsal copy from eleven-signal to thirteen-signal.
- Updated User Brain Architecture, Tutor System Architecture, and App Design
  Language copy to describe the thirteen-signal local beta verifier.
- Simplified the Admin Center preface copy.
- Corrected the Tutor System Architecture Graphify rebuild policy to match
  AGENTS.md: no automatic GitHub Actions graph refresh on push or PR.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 143 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at `1440x1000` confirmed Admin Beta Diagnostics renders the
  simplified Admin Center preface, `Chat multi-PDF context`, `Voice multi-PDF
context`, and thirteen-signal copy with only normal Vite/React dev logs.
- In-app Browser QA at `390x844` confirmed the same Admin Beta Diagnostics
  gates and rehearsal copy render in the mobile layout.
- In-app Browser QA clicked `Run local rehearsal` and confirmed the synthetic
  contract reaches `100%`, includes active and companion PDF ids, and leaves
  live beta coverage at `0%` until real chat/voice traffic fills the ledger.
- In-app Browser QA opened Revision > App Design Language > Local Beta Control
  Patterns and confirmed the new shared multi-PDF context, chat/voice
  multi-PDF proof, request-correlation, and thirteen-signal rehearsal copy.
- Clean `graphify update . --force`: passed after removing ignored
  `server.mjs`/`.tmp-test` scratch files, regenerating code architecture
  artifacts with `1025` nodes, `1820` edges, and `57` communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`76.5 KB`).
- Graphify smoke query found `buildBrainFlowCoverageFromLedgers()`,
  `buildBetaDiagnosticsSnapshot()`, `AdminView()`,
  `runLocalBrainWiringRehearsal()`, `ChatPanel.tsx`, `RevisionView.tsx`,
  and `brain-context.test.mjs`.
- Graphify path `buildBrainFlowCoverageFromLedgers()` to `AdminView()` found a
  one-hop route through `AdminView()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when live traffic is in
  scope, then use the new thirteen-signal verifier to confirm real ledger rows
  fill chat/voice multi-PDF context, tools, mastery, transcript persistence,
  and memory evidence together.
- Continue broader local beta validation across real Study, Chat, Voice, Admin,
  Revision, corrections, retrieval, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until beta testing.

---

# Phase 64: Provider-Key Live Proof Checklist

Packet ABT makes the next live beta run inspectable without making any provider
calls by default. Admin Beta Diagnostics now has a provider-key proof checklist
that separates key setup, live-run availability, and complete
request-correlated chat/voice ledger proof.

Current conservative brain-architecture completion estimate after final gates:
about 86%.

## Graphify Context

- `graphify query "provider-key live proof chat voice beta diagnostics real
traffic chat mode voice mode stored injected tool calling both agent layers
Admin evidence checklist current implementation gaps" --budget 10000 --graph
graphify-out/graph.json` routed the slice through `ChatPanel.tsx`,
  `AdminView.tsx`, `server.ts`, `longterm.memory.ts`,
  `beta.diagnostics.ts`, `brain.rehearsal.ts`, `brain.context.ts`,
  `evidence.mastery.ts`, `voiceAgentTools.ts`, `chatAgentTools.ts`, and
  focused tests.
- Follow-up graph queries confirmed the same live-proof corridor through Admin
  provider status, chat/voice keys, and Beta Diagnostics.

## Integration Decisions

- Added `ProviderKeyProofChecklist` and
  `buildProviderKeyProofChecklist()` in `beta.diagnostics.ts`.
- The checklist contains two provider-key setup checks and thirteen live ledger
  checks mapped to the existing brain-flow signals.
- `canAttemptProviderKeyRun` is distinct from `proofComplete`: key presence can
  make a live run available, but only request-correlated chat/voice ledger rows
  complete proof.
- Admin Beta Diagnostics now renders provider-key proof percent, key/setup
  badges, live coverage percent, per-check action text, and missing proof rows.
- Provider keys are represented only as booleans from browser settings or the
  local server meter; no key values are displayed.
- Synthetic rehearsal copy now says `preflight ready` instead of
  `provider-key ready` so synthetic proof cannot be mistaken for live beta
  traffic.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 146 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at `1440x1000` confirmed Provider-Key Live Proof,
  deliberate beta-run checklist copy, no-provider-call copy, key/setup status,
  typed-chat multi-PDF proof, live-voice transcript proof, missing proof list,
  and `scrollWidth: 1440`.
- In-app Browser QA at `390x844` confirmed the same provider-key proof panel and
  missing-proof checklist with `scrollWidth: 390`.
- Browser QA screenshots saved:
  - `results/ABT-iab-admin-provider-key-desktop.png`
  - `results/ABT-iab-admin-provider-key-mobile.png`
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with `1050` nodes, `1855` edges, and `59` communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`78.0 KB`).
- Graphify smoke query found `buildProviderKeyProofChecklist()`,
  `ProviderKeyProofChecklist`, `beta.diagnostics.ts`, `AdminView.tsx`, and
  `beta-diagnostics.test.mjs`.
- Graphify path `buildProviderKeyProofChecklist()` to `AdminView()` found a
  two-hop route through `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when live provider traffic is
  in scope, then use the new checklist to confirm real ledger rows satisfy all
  chat, voice, tool, mastery, transcript, background-memory, and evidence-gate
  proof checks.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until after beta testing.

---

# Phase 65: Stored Audio Duration Evidence

Packet ABU makes the 3-4 minute built-in audio-guide requirement locally
checkable instead of relying on prose. The checked-in audio overview manifest now
stores measured `durationSeconds` for every built-in guide, the dry-run prints
those seconds, Admin stored-audio artifact inputs carry the metadata, and the
local verifier rejects stored audio guide records outside the 180-245 second
window.

Current conservative brain-architecture completion estimate after final gates:
about 87%.

## Graphify Context

- `graphify query "chapterAudioOverviews userBrainArchitectureBook audio
overview duration transcript 3 4 minutes stored audio guide generator plan tests
source files" --budget 10000 --graph graphify-out/graph.json` routed the slice
through `chapterAudioOverviews`, `RevisionView.tsx`,
`audio-overview-plan.test.mjs`, `README.md`, and
`userBrainArchitectureBook.ts`.
- `graphify path "chapterAudioOverviews" "RevisionView()" --graph
graphify-out/graph.json` found the direct reader path.
- Follow-up graph queries routed stored audio manifest integrity through
`artifact.records.ts`, `artifact-records.test.mjs`,
`generate-user-brain-audio-overviews.mjs`, and
`user-brain-audio-overview-plan.mjs`.

## Integration Decisions

- Added manifest `durationSeconds` for all 25 built-in guide MP3s using local
  `ffprobe` measurements.
- Kept the accepted duration window at 180-245 seconds, matching the current
  3-4 minute-ish beta requirement while allowing short metadata rounding.
- Updated dry-run data and console output so a local operator can see seconds
  before regenerating or reviewing assets.
- Added duration metadata to stored audio artifact records and local integrity
  checked fields.
- Updated the audio overview tests to compare checked-in MP3 duration against
  the manifest when `ffprobe` or `afinfo` is available.
- Preserved the single visible Revision player: retry/fallback behavior remains
  hidden in the component and no fallback copy is shown to learners.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 148 tests.
- `npm run audio:overview:dry-run`: passed, 25 present, 0 missing, 25 planned,
  with duration seconds printed for every guide.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- In-app Browser QA confirmed Admin Source Artifacts renders 25 stored
  audio-guide artifact rows and no console errors.
- In-app Browser QA confirmed Revision > User Brain Architecture renders one
  visible Play button, one hidden audio element, three speed controls, measured
  3-4 minute duration copy, no fallback copy, and no console errors.
- Mobile Browser QA at `390x844` confirmed Revision has one visible Play button,
  measured duration copy, no fallback copy, and no horizontal overflow.
- Mobile Browser QA confirmed Admin Center renders the simplified paragraph with
  no horizontal overflow and no console errors.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1052 nodes, 1857 edges, and 62 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`78.1 KB`).
- Graphify smoke query found `ChapterAudioOverview`,
  `chapterAudioOverviews.ts`, `builtInBookAudioOverviews`,
  `StoredAudioOverview()`, `RevisionView()`, `AdminView()`, and connected
  reader/source-artifact nodes.
- Graphify path `chapterAudioOverviews` to `RevisionView()` found a two-hop
  route through `RevisionView.tsx`.
- Graphify path `createStoredAudioOverviewArtifactRecords()` to `AdminView()`
  found a three-hop route through `artifact.records.ts` and `AdminView.tsx`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key chat and voice turns when live provider traffic is
  in scope, then use the provider-key checklist to confirm real ledger rows
  satisfy all chat, voice, tool, mastery, transcript, background-memory, and
  evidence-gate proof checks.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until after beta testing.

---

# Phase 66: Coherent Live Proof Bundle

Packet ABV strengthens provider-key live proof so aggregate green rows are no
longer enough. Provider-key proof now requires a coherent bundle: one complete
typed-chat request and one complete live-voice request that share the same
multi-PDF context ids and saved local book/thread anchors.

Current conservative brain-architecture completion estimate after final gates:
about 88%.

## Graphify Context

- `graphify query "next brain architecture live provider proof gap chat voice
stored injected tool calling request ledger Admin beta diagnostics missing
evidence source completed checklist" --budget 10000 --graph
graphify-out/graph.json` routed the slice to `ProviderKeyProofChecklist`,
`beta.diagnostics.ts`, and `beta-diagnostics.test.mjs`.
- `graphify query "ProviderKeyProofChecklist live proof request correlated chat
voice ledger rows missing proof source Admin beta diagnostics manual live run
evidence export" --budget 10000 --graph graphify-out/graph.json` confirmed the
Admin/Beta Diagnostics corridor.
- `graphify query "voice mode chat mode properly stored injected tool calling
both agent layers live beta proof ChatPanel voiceAgentTools chatAgentTools beta
diagnostics AdminView" --budget 12000 --graph graphify-out/graph.json` routed
the downstream display path through `AdminView()`,
`buildBrainFlowCoverageFromLedgers()`, and `buildBetaDiagnosticsSnapshot()`.

## Integration Decisions

- Added `buildCoherentLiveProofFromLedgers()` to select the best chat/voice
  request pair from local ledgers.
- A typed-chat request is complete only when that single request has context,
  retrieval, model-run, foreground tool, evaluated mastery, saved transcript,
  and background-memory rows.
- A live-voice request must satisfy the same local row set.
- The selected chat and voice requests must share more than one context PDF id
  and share a saved local book/thread anchor.
- `ProviderKeyProofChecklist` now includes `Coherent chat + voice beta bundle`
  as the final required live-ledger check.
- Admin Beta Diagnostics renders the coherent bundle percent, status, selected
  request ids, shared book/thread/PDF chips, and per-check summaries.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 150 tests.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA at desktop width confirmed Admin Beta Diagnostics renders
  the coherent live proof bundle, same-book/thread copy, missing coherent proof
  state, no-single-chat-request state, no console errors, and no horizontal
  overflow.
- In-app Browser QA at `390x844` confirmed the same coherent proof panel and
  missing-proof state render with no console errors and no horizontal overflow.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1067 nodes, 1886 edges, and 67 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.1 KB`).
- Graphify smoke query found `buildCoherentLiveProofFromLedgers()`,
  `CoherentLiveProofBundle`, `ProviderKeyProofChecklist`, `AdminView()`,
  `buildBetaDiagnosticsSnapshot()`, and `buildProviderKeyProofChecklist()`.
- Graphify path `buildCoherentLiveProofFromLedgers()` to `AdminView()` found a
  one-hop route through `AdminView()`.
- Graphify path from `buildCoherentLiveProofFromLedgers()` to
  `buildProviderKeyProofChecklist()` found a connected route through shared beta
  diagnostics helpers.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed chat and live voice turns when live provider
  traffic is in scope, then use the provider-key checklist and coherent proof
  bundle to confirm real rows satisfy the complete local beta flow.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until after beta testing.

# Phase 68: Live Beta Proof Runbook

Packet ABX turns the Provider-Key Live Proof panel into an ordered manual
runbook. Admin now tells the beta runner which local step is next, what evidence
is needed, and which proof checks are still blocking completion, without calling
providers or treating synthetic evidence as real live traffic.

Current conservative brain-architecture completion estimate after final gates:
about 90%.

## Graphify Context

- `graphify query "AdminView beta diagnostics user brain architecture" --budget
  4000 --graph graphify-out/graph.json` routed the slice to `AdminView.tsx`,
  `beta.diagnostics.ts`, `buildCoherentLiveProofFromLedgers()`,
  `buildBetaDiagnosticsSnapshot()`, and
  `buildBrainFlowCoverageFromLedgers()`.
- Exact Graphify CLI routing was needed because a broad MCP graph query
  overmatched on provider-like terms.
- Post-regeneration smoke query found `buildLiveBetaProofRunbook()`,
  `LiveBetaProofRunbook`, `ProviderKeyProofChecklist`,
  `buildProviderKeyProofChecklist()`, `beta.diagnostics.ts`, and
  `AdminView.tsx`.
- Graphify path `buildLiveBetaProofRunbook()` to `AdminView()` found a connected
  route through `beta.diagnostics.ts` and Admin's beta diagnostics calls.
- Graphify path `buildLiveBetaProofRunbook()` to
  `buildProviderKeyProofChecklist()` found the expected one-hop connection.

## Integration Decisions

- Added `LiveBetaProofRunbook` and `buildLiveBetaProofRunbook()` in
  `src/memory/beta.diagnostics.ts`.
- `ProviderKeyProofChecklist` now carries the runbook, so Admin derives both the
  checklist and the manual proof path from one local truth source.
- The runbook has six ordered steps: provider keys, one multi-PDF active book,
  typed-chat proof, live-voice proof, background memory/gates, and coherent
  bundle export.
- Admin renders step status, action, evidence needed, missing blockers, and
  compact request/PDF anchors where available.
- Diagnostics export metadata now includes provider-key proof summary and the
  runbook without exposing provider key values.

## Verification Evidence

- `npm run format`: passed.
- Direct `node --test tests/beta-diagnostics.test.mjs`: unavailable because the
  project test harness must first generate `.tmp-test/*`.
- `npm run test`: passed, 151 tests.
- `npm run format:check`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser desktop QA on `http://localhost:3100` confirmed Admin Beta
  Diagnostics renders the live beta runbook, all six ordered steps, setup/next
  status, local-only chip, no horizontal overflow, and zero console logs.
- `node .workflow/brain-architecture-implementation-program/packets/phase60-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin rendered Local
  Beta Readiness, Live beta runbook, manual/setup status, all six runbook
  steps, local-only copy, no horizontal overflow, and zero console logs.
- Browser screenshots saved as `ABX-admin-runbook-desktop.png` and
  `ABX-admin-runbook-mobile.png`; JSON evidence saved as
  `phase60-browser-qa.json`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1075 nodes, 1899 edges, and 55 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.6 KB`).
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed chat and live voice turns when live provider
  traffic is in scope, then use the runbook and coherent proof bundle to confirm
  real request-correlated rows satisfy the complete local beta flow.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until after beta testing.

# Phase 67: Active-Book PDF Retrieval Hint

Packet ABW tightens the multi-PDF context path at the retrieval layer. The
shared chat/voice brain-context builder already injected an active-book PDF
manifest and balanced excerpts; this phase also gives semantic retrieval a
compact hint that names the active PDF on screen plus companion PDFs in the
same local book.

Current conservative brain-architecture completion estimate after final gates:
about 89%.

## Graphify Context

- `graphify query "multi PDF uploaded documents context injection chatbot voice
live agent tools active book source context ChatPanel voiceAgentTools multiple
pdfs not only current screen" --budget 12000 --graph graphify-out/graph.json`
  routed the slice to `ChatPanel.tsx`, `brain.context.ts`, `StudyView.tsx`,
  `index.ts`, and `tests/brain-context.test.mjs`.
- `graphify path "ChatPanel()" "buildBrainDocumentContext()" --graph
graphify-out/graph.json` found the route through `ChatPanel.tsx` and
`brain.context.ts`.
- `graphify path "ChatPanel()" "voiceAgentToolNames" --graph
graphify-out/graph.json` confirmed the live-voice tool layer remains connected
through `voiceAgentTools.ts`.
- `graphify query "audio overview local fallback second play button UI
component background fallback voice overview book 3 4 minutes content
architecture book app design book" --budget 12000 --graph
graphify-out/graph.json` routed the audio/book work to `RevisionView.tsx`,
`chapterAudioOverviews.ts`, `userBrainArchitectureBook.ts`, and `README.md`.

## Integration Decisions

- Added `buildBrainDocumentRetrievalHint()` and `buildBrainRetrievalQuery()`.
- `buildBrainContextPacket()` now sends retrieval the original query plus
  active-book PDF hint text before assembling the final context packet.
- Because typed chat and live voice both call `buildBrainContextPacket()`, both
  agent layers now use the same active-plus-companion PDF retrieval hint.
- Simplified the Admin Center preface to a shorter plain-language sentence.
- Left the stored chapter audio guide as one visible custom player with hidden
  retry behavior inside the same `audio.sr-only` element; no visible fallback or
  second play control was added.
- Updated the User Brain Architecture, Tutor System Architecture, and App
  Design Language book copy to describe the retrieval-hint contract without
  rearranging chapter indices or desynchronizing stored audio assets.

## Verification Evidence

- `npm run format`: passed.
- `npm run test`: passed, 151 tests.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `node .workflow/brain-architecture-implementation-program/packets/phase59-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin rendered the
  simplified preface with no horizontal overflow and zero console logs. Desktop
  and mobile Revision rendered App Design Language audio with exactly one
  visible Play button, no visible fallback/retry/native controls, one hidden
  audio element, the retrieval-hint copy, no horizontal overflow, and zero
  console logs.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1071 nodes, 1893 edges, and 63 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.3 KB`).
- Graphify smoke query found `buildBrainDocumentRetrievalHint()`,
  `buildBrainRetrievalQuery()`, `buildBrainContextPacket()`, `ChatPanel()`,
  `brain.context.ts`, and connected Study/Admin/Revision nodes.
- Graphify path `buildBrainRetrievalQuery()` to `ChatPanel()` found a
  three-hop route through `brain.context.ts` and `ChatPanel.tsx`.
- Graphify path `buildBrainDocumentRetrievalHint()` to
  `buildBrainContextPacket()` found the expected helper route through
  `buildBrainRetrievalQuery()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Work

- Run deliberate provider-key typed chat and live voice turns when live provider
  traffic is in scope, then use the provider-key checklist and coherent proof
  bundle to confirm real rows satisfy the complete local beta flow.
- Continue broader beta validation across Study, Chat, Voice, Admin, Revision,
  retrieval, corrections, artifacts, and evidence surfaces.
- AWS/cloud synchronization remains out of scope until after beta testing.
