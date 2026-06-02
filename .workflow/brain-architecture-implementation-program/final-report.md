# Final Report: brain architecture implementation program

## Outcome

## Accepted Results

## Rejected Results

## Conflicts Resolved

## Verification Evidence

## Remaining Risks

## Reusable Follow-up

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
