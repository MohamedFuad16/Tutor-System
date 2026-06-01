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
- Admin exposes model runs, tool jobs, memory/retrieval events, evidence, correction requests, runtime tuning, beta diagnostics, source artifacts, and citation states.
- Generated flashcards, generated learning-book notes, and stored audio overviews now leave explicit \`not_checked\` artifact provenance.
- Revision shows this book in a shorter reader path and can play a stored overview asset for this chapter.

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

The local beta rule is intentionally conservative: generated notes, flashcards, stored audio overviews, charts, code, images, and websites can be useful study artifacts, but they are not verified evidence just because they exist.

## Current Enforcement

- Model summaries can add evidence rows, but cannot raise mastery.
- Flashcard reviews can write BKT evidence only when a real concept id exists.
- Generated flashcards, generated learning notes, and built-in stored audio overview manifests write \`ArtifactRecord\` rows with \`not_checked\` citation states.
- Admin's local verifier only mutates \`source_card\` artifacts; other artifact kinds remain explicitly unsupported until a real verifier exists.
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

Current local implementation verifies source-card structure without fetching external pages. It checks saved links, URL shape, domain consistency, source ids, and artifact/citation linkage. Generated flashcards and learning notes stay \`not_checked\` because they need different verifiers.`,
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
| Memory/Retrieval Events | Learner-brain writes and context selection. |
| Evidence Ledger | Evidence rows and BKT deltas. |
| Source Artifacts | Source cards plus generated flashcard, note, and stored audio overview provenance. |
| Correction Requests | Non-destructive review and propagation state. |
| Runtime Tuning | Local knobs for source-vs-web, memory context, tool budget, and refresh cadence. |
| Beta Diagnostics | Capped local export and readiness gate summary. |

The key boundary: Admin reports recorded system state. It must not pretend to know private model internals beyond saved traces, summaries, tool rows, and artifacts.`,
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
- avoid pretending live speech is evidence.

For Library books, the better pattern is stored audio overview, not live read-aloud. A chapter overview should be written as a short energetic explanation, generated once, stored as an asset, and played from the browser with normal controls. That keeps playback fast and prevents the app from sending chapter text to a live TTS route every time the learner presses play.

This phase starts that pattern for the opening User Brain Architecture chapter. The stored asset is also represented in Admin as a local \`audio_overview\` artifact row with not-checked provenance. Later slices should generate stored chapter-specific assets for the remaining built-in book chapters.`,
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
- capped beta diagnostics export;
- stored audio overview UI for the opening architecture chapter.

Still local beta work:

- source-span claim matching;
- generated-artifact verifiers for notes, charts, code snippets, images, and websites;
- durable job queue with retries and dead-letter review;
- broader stored audio overview generation for every built-in chapter;
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
| Stored audio overview | A pre-generated chapter explanation asset played locally instead of live read-aloud. |

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
