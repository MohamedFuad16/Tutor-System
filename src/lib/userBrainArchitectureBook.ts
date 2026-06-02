const userBrainArchitectureBook = [
  {
    title: "Chapter 1: The Whole Shape",
    content: `# The Whole Shape

LearningAI should feel like one attentive tutor, not a bundle of separate tools.

The learner sees a calm foreground tutor. Behind that tutor, the app keeps a local learner brain, retrieves relevant context, generates study artifacts, records source state, and updates learning books. The important boundary is simple: fast teaching signals can adapt the conversation immediately, but durable learner-brain changes need evidence, typed records, and a visible audit trail.

The architecture has three layers:

| Layer | Plain meaning | What it owns |
| --- | --- | --- |
| Foreground tutor | The visible teacher | Explains, asks checks, handles voice/text timing, and keeps the lesson coherent. |
| Learner brain | The local memory ledger | Stores books, concepts, entries, evidence, mastery deltas, corrections, artifacts, and retrieval traces. |
| Background workers | Bounded helpers | Retrieve sources, generate artifacts, summarize conversations, evaluate answers, and propose updates. |

~~~interaction-runtime
user-brain-runtime
~~~

The system is inspired by continuous interaction-model work, but LearningAI is app-native. It uses existing models, local state, job ledgers, and UI contracts instead of training a custom foundation model.

## Current Local Implementation

- Chat and Study can capture local document context.
- Memory writes generated learning books, concepts, entries, model-summary evidence, memory events, retrieval events, and artifact provenance into Dexie.
- Admin exposes model runs, tool jobs, voice-agent lifecycle events, memory/retrieval events, evidence, correction requests, runtime tuning, beta diagnostics, source artifacts, and citation states.
- Generated learning-book notes now run an initial local provenance check when Memory writes them, so coherent note rows move from \`not_checked\` to \`verified\` immediately while remaining limited to ledger traceability. When document text is available, they also carry compact source-span preview anchors.
- Generated flashcards and stored chapter audio guides still leave explicit \`not_checked\` artifact provenance until a scoped local verifier runs.
- Admin can locally verify generated flashcard provenance when the batch links back to saved card ids, a message or batch anchor, local-only metadata, and no external fetch.
- Admin can locally verify generated learning-note provenance when the note links back to a learning entry, local book or conversation, local-only metadata, and no external fetch.
- Admin can locally verify stored audio-guide manifest integrity when the guide links back to its checked-in MP3 path, book/chapter anchors, transcript metadata, voice, duration, stored date, and no external fetch.
- Revision shows this book in a shorter reader path and can play a saved Deepgram chapter audio guide for every chapter.
- A local audio-guide manifest now covers every built-in Library book, with checked-in MP3 assets and Deepgram \`aura-2-odysseus-en\` regeneration at speed \`1\` when \`DEEPGRAM_API_KEY\` is available.

## What This Is Not

- Not silent fine-tuning after every conversation.
- Not a claim that model summaries can change mastery by themselves.
- Not cloud production architecture yet. AWS and tenant isolation remain deferred until beta testing.`,
  },
  {
    title: "Chapter 2: The Learner Brain Ledger",
    content: `# The Learner Brain Ledger

The learner brain is a ledger, not a vague memory blob.

Every durable row should answer four questions:

1. What changed?
2. Why did it change?
3. What source or evidence supports it?
4. How can the learner or developer inspect, correct, or reverse it?

Core local tables:

| Table family | Purpose |
| --- | --- |
| \`learningBooks\`, \`learningEntries\`, \`learningBookConcepts\` | Saved study notebook and concept summaries. |
| \`evidenceEvents\`, \`masteryDeltas\` | Source-linked evidence and BKT movement. |
| \`memoryEvents\`, \`retrievalEvents\`, \`modelRuns\`, \`toolJobs\` | Behind-the-scenes observability. |
| \`artifactRecords\`, \`citationStates\` | Source cards, generated artifacts, and verification state. |
| \`correctionEvents\` | Non-destructive mark-wrong, deletion-review, supersede, dismiss, and block intents. |

The local beta rule is intentionally conservative: generated notes, flashcards, stored chapter audio guides, charts, code, images, and websites can be useful study artifacts, but they are not verified evidence just because they exist.

## Current Enforcement

- Model summaries can add evidence rows, but cannot raise mastery.
- Flashcard reviews can write BKT evidence only when a real concept id exists.
- Generated learning notes write \`ArtifactRecord\` rows, save source-span preview anchors when document context is present, and immediately run the local generated-note provenance verifier when the entry/book/conversation anchors are coherent.
- Generated flashcards and built-in chapter audio guide manifests write \`ArtifactRecord\` rows with \`not_checked\` citation states until Admin or another local caller runs their verifier.
- Admin's local verifier mutates \`source_card\` artifacts, generated flashcard provenance, generated learning-note provenance, and stored audio-guide manifest integrity when the local ledger links are coherent; charts, code, images, and websites remain explicitly unsupported until real verifiers exist.
- Flashcard provenance verification proves saved card ids, batch/message anchors, local-only metadata, and no-external-fetch status. It does not prove the card answer is factually correct.
- Correction propagation marks related rows stale, skipped, unsupported, conflicting, or unverified instead of hard-deleting history.`,
  },
  {
    title: "Chapter 3: Teaching Loop And State",
    content: `# Teaching Loop And State

The tutor should adapt like a human teacher while preserving machine-checkable state.

Useful teaching states:

| State | Tutor move | Durable evidence? |
| --- | --- | --- |
| Explain concept | Give a clear explanation with local context first. | Exposure or interaction row. |
| Show example | Demonstrate with code, chart, analogy, or page reference. | Artifact row if generated. |
| Check understanding | Ask a short recall or transfer question. | Possible evidence event. |
| Detect misconception | Compare answer to known weak spots. | Misconception candidate with source context. |
| Repair explanation | Re-teach in a different style. | Remediation event. |
| Schedule recall | Prepare flashcards or review prompts. | Flashcard rows and due dates. |
| Update mastery | Change learner score. | Only from validated evidence. |

Soft signals can shape the live lesson: hesitation, repeated questions, selected page context, voice state, or confusion markers can change the next explanation. They should not silently become permanent truth.

## Practical Rule

If the tutor wants to become more helpful immediately, it can adapt style. If it wants to change durable memory or mastery, it needs an auditable row.`,
  },
  {
    title: "Chapter 4: Retrieval, Artifacts, And Citations",
    content: `# Retrieval, Artifacts, And Citations

Source grounding is the main trust boundary.

Questions about the current page, uploaded document, selected text, or saved learning book should use local source material first. Web search is for current external facts or explicit web-search requests.

Artifact states:

| State | Meaning |
| --- | --- |
| \`draft\` | Created but not ready to show. |
| \`ready\` | Available to the learner. |
| \`failed\` | Attempt failed and may be retried. |
| \`stale\` | Superseded or invalidated by correction. |

Citation states:

| State | Meaning |
| --- | --- |
| \`verified\` | A verifier for that scope passed. |
| \`checking\` | Verification is in progress. |
| \`not_checked\` | Local provenance exists, but no verifier has run. |
| \`unavailable\` | The source cannot support the claim. |
| \`conflicting\` | Saved source fields or claims disagree. |
| \`unsupported\` | The local verifier cannot assess this artifact kind yet. |

Current local implementation verifies source-card structure without fetching external pages. It checks saved links, URL shape, domain consistency, source ids, and artifact/citation linkage. Generated learning notes have a separate local provenance check for entry id, book/conversation anchors, local-only metadata, no external fetch, saved summary preview, and saved source-span anchors when document context exists; Memory runs that check immediately for newly written learning-entry artifacts. Generated flashcards have their own provenance check for saved card ids, batch/message anchors, local-only metadata, and no external fetch, but they still start \`not_checked\` until Admin or another local caller runs it. Stored chapter audio guides have a local manifest-integrity check for the MP3 path, overview id, book/chapter anchors, transcript length, summary, voice, duration, stored date, and no-external-fetch provenance. Those checks prove local traceability for their scope, not sentence-level source-span truth, flashcard answer correctness, or audio-content transcription accuracy.`,
  },
  {
    title: "Chapter 5: Admin And Runtime Tuning",
    content: `# Admin And Runtime Tuning

Admin is the operating room for local beta.

It should answer:

- What happened during one tutor request?
- Which model ran, fell back, failed, or was blocked?
- Which tools were called and with what status?
- Which retrieval and memory rows were written?
- Which evidence or mastery rows changed?
- Which source artifacts and citation states exist?
- Which corrections are pending or propagated?
- Which runtime settings shape the next request?

Implemented Admin surfaces:

| Surface | What it proves locally |
| --- | --- |
| System Activity | Request timelines and backend event summaries. |
| Model Runs | Provider/model selection, fallbacks, token/cost metadata, failures. |
| Tool Jobs | Tool lifecycle visibility. |
| Voice Agent Timeline | Local voice websocket lifecycle, Deepgram settings, speaking/listening state, barge-in, transcript turns, and errors. |
| Memory/Retrieval Events | Learner-brain writes and context selection. |
| Evidence Ledger | Evidence rows and BKT deltas. |
| Source Artifacts | Source cards plus generated learning-note integrity checks, generated flashcard provenance, and chapter audio guide provenance. |
| Correction Requests | Non-destructive review and propagation state. |
| Runtime Tuning | Local knobs for source-vs-web, memory context, tool budget, and refresh cadence. |
| Beta Diagnostics | Capped local export and readiness gate summary. |

The key boundary: Admin reports recorded system state. It must not pretend to know private model internals beyond saved traces, summaries, tool rows, voice lifecycle events, and artifacts.`,
  },
  {
    title: "Chapter 6: Voice, Audio, And Timing",
    content: `# Voice, Audio, And Timing

Voice is useful only when it respects timing.

Good voice behavior means:

- start quickly;
- stop quickly when interrupted;
- keep explanations shorter in voice mode;
- preserve learner state when voice falls back to text;
- record voice costs and failures;
- show voice lifecycle and interruption state in Admin;
- avoid pretending live speech is evidence.

For Library books, the better pattern is stored audio guide, not live read-aloud. A chapter guide should be written as a short energetic explanation, generated once, stored as an asset, and played from the browser with normal controls. Those controls now include play, pause, speed, seek, and native fallback playback when the browser blocks scripted play. That keeps playback fast and prevents the app from sending chapter text to a live TTS route every time the learner presses play.

This phase extends that pattern to every built-in Library chapter: Tutor System Architecture, User Brain Architecture, and App Design Language. \`src/lib/chapterAudioOverviews.json\` holds the chapter scripts, target filenames, provider metadata, and local MP3 manifest. \`npm run audio:overview:dry-run\` verifies which assets are checked in, while \`npm run audio:overview:generate -- --provider deepgram --overwrite\` regenerates them with Deepgram when \`DEEPGRAM_API_KEY\` is available. The reader uses the stored assets directly, so playback is instant and does not depend on a live model call.`,
  },
  {
    title: "Chapter 7: Local Beta Roadmap",
    content: `# Local Beta Roadmap

Local beta should prove behavior before AWS/cloud work starts.

Implemented now:

- built-in architecture books and a shorter User Brain Architecture reader path;
- local interaction context;
- evidence-gated BKT machinery;
- durable evidence and mastery ledgers;
- durable model/tool/memory/retrieval observability rows;
- runtime tuning controls;
- correction request ledger and non-destructive propagation overlays;
- source artifact and citation-state ledger;
- local source-card integrity verifier;
- generated flashcard and generated learning-note provenance;
- local generated flashcard provenance verifier;
- local generated learning-note provenance verifier;
- local stored audio-guide manifest-integrity verifier;
- capped beta diagnostics export;
- stored audio guide UI for every built-in Library chapter;
- chapter-by-chapter stored-audio manifest, checked-in MP3 assets, dry-run report, and Deepgram \`aura-2-odysseus-en\` regeneration path.

Still local beta work:

- source-span claim matching;
- stronger source-span matching beyond the current generated-note preview anchors;
- generated-artifact verifiers for charts, code snippets, images, websites, previews, and other unsupported artifact kinds;
- source-span claim matching for generated learning notes beyond the current provenance-level check;
- audio-content transcript matching beyond the current stored-manifest integrity check;
- durable job queue with retries and dead-letter review;
- stronger tests that make mastery writes impossible without validated evidence and audit rows.

Deferred until after beta:

- AWS sync;
- tenant-scoped relational/vector/blob/queue/log architecture;
- cloud backups and cross-device memory;
- production alerting and operational dashboards.`,
  },
  {
    title: "Chapter 8: Sources And Glossary",
    content: `# Sources And Glossary

## Glossary

| Term | Meaning |
| --- | --- |
| Learner brain | The local state system that stores concepts, books, evidence, mastery, artifacts, corrections, and retrieval traces. |
| Evidence event | A row that says a learner did something observable enough to support a memory or mastery decision. |
| Mastery delta | A BKT-style change in concept mastery linked to evidence. |
| Artifact record | A local row for a source card, flashcards, notes, chart, code snippet, image, website, preview, or other generated object. |
| Citation state | The verification state attached to an artifact or claim. |
| Correction overlay | A non-destructive status update that marks related rows stale, skipped, unsupported, conflicting, or unverified. |
| Interaction runtime | The app-native coordination layer between foreground tutor, local brain, retrieval, tools, and background workers. |
| Chapter audio guide | A pre-generated chapter explanation asset played locally instead of live read-aloud. |

## Trusted References

- [OpenAI Responses API](https://developers.openai.com/api/docs/guides/responses)
- [OpenAI Realtime](https://developers.openai.com/api/docs/guides/realtime)
- [OpenAI voice agents](https://developers.openai.com/api/docs/guides/voice-agents)
- [OpenAI safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [OpenAI evals](https://developers.openai.com/api/docs/guides/evals)
- [Thinking Machines interaction models](https://thinkingmachines.ai/blog/interaction-models/)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html)
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Bayesian Knowledge Tracing survey](https://arxiv.org/abs/2412.14337)
- [Knowledge Tracing Machines](https://arxiv.org/abs/2104.06529)
- [Deep Knowledge Tracing](https://papers.nips.cc/paper_files/paper/2015/hash/bac9162b47c56fc8a4d2a519803d51b3-Abstract.html)`,
  },
];

export default userBrainArchitectureBook;
