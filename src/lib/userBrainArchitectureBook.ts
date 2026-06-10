const userBrainArchitectureBook = [
  {
    title: "Chapter 1: What The Learner Brain Is",
    content: `# What The Learner Brain Is

The learner brain is Tutor's durable, reviewable picture of one learner's study history. It is not a copy of the human brain, a model's hidden memory, or the Graphify repository map.

~~~interaction-runtime
user-brain-runtime
~~~

| Layer | Responsibility |
| --- | --- |
| Foreground tutor | Hold the conversation, explain, ask, and adapt in the moment. |
| Learner brain | Store learning books, concepts, evidence, mastery estimates, artifacts, and corrections. |
| Background work | Retrieve information, run tools, summarize completed turns, and propose bounded updates. |
| Admin | Let an operator inspect why the system reached an interpretation. |

~~~mermaid
flowchart LR
  Action[Learner action] --> Context[Current source and history]
  Context --> Tutor[Foreground teaching]
  Tutor --> Records[Durable learner records]
  Records --> Next[Next explanation or review]
~~~

The goal is not to collect everything a learner says. The goal is to preserve useful learning state with enough evidence, source context, user ownership, and correction history to make later teaching better.

**Completed locally:** local profiles create stable user IDs; the server stores each user's durable brain under a per-user folder; Dexie/IndexedDB keeps browser cache and UI state. **Partly completed:** real authenticated cloud identity. **Deferred:** cloud tenancy, synchronization, and organization administration.`,
  },
  {
    title: "Chapter 2: The Data Model For One Learner",
    content: `# The Data Model For One Learner

The learner brain is organized as a ledger. Each durable interpretation should answer: what changed, what caused it, how certain is it, and how can it be corrected?

| Record | Practical meaning |
| --- | --- |
| Learning book | A subject or study thread that belongs to a learner. |
| Chapter and entry | Revision material created from completed teaching. |
| Learning-book concept | A concept and its relationships inside one book. |
| Persistent concept | A concept with mastery parameters and review history. |
| Evidence event | A learner action evaluated under an explicit contract. |
| Mastery delta | The exact change produced by accepted evidence. |
| Artifact | A generated or retrieved object such as notes, cards, code, audio, or a source card. |
| Correction event | A non-destructive request to review, quarantine, or supersede a record. |

~~~mermaid
flowchart LR
  learner["Learner identity"] --> books["Learning books"]
  books --> chapters["Chapters and entries"]
  books --> concepts["Concept relationships"]
  concepts --> evidence["Evidence attempts"]
  evidence --> mastery["Mastery estimates"]
  mastery --> review["Revision and teaching"]
~~~

Today, local books carry a \`userName\`, so Admin can group separate learners on one local database. Each local profile also has a \`userId\`. That \`userId\` is sent with HTTP requests and voice websocket auth, and new learner records carry it so books, PDFs, conversations, concepts, BKT evidence, mastery deltas, misconceptions, and background tasks do not blend across profiles.

Durable local records live in a server-owned learner store:

\`\`\`text
data/users/<userId>/
  brain.sqlite
  documents/
  extracted-text/
  artifacts/
  exports/
\`\`\`

SQLite is a small database stored as a server-side file. In this app it is the local bridge to a future cloud database. Dexie is a wrapper around browser IndexedDB; IndexedDB is the browser's structured storage system. Tutor now treats IndexedDB as cache and offline staging, not as the permanent home for full PDF files or full extracted text. See the [official Dexie documentation](https://dexie.org/docs).`,
  },
  {
    title: "Chapter 3: From Conversation To Adaptation",
    content: `# From Conversation To Adaptation

Tutor uses two speeds of adaptation.

## Fast Interaction State

Hesitation, selected text, repeated questions, voice timing, and the active page may change the next explanation immediately. These signals are useful context, but they are not durable proof.

## Slow Learner State

A durable mastery change requires a learner action linked to a real concept and evaluated under a known evidence contract.

~~~mermaid
flowchart LR
  Explain[Explain] --> Try[Learner tries]
  Try --> Evaluate[Evaluate response]
  Evaluate --> Gate{Validated evidence?}
  Gate -->|yes| Update[Update mastery estimate]
  Gate -->|no| Context[Use only as teaching context]
  Update --> Adapt[Choose next teaching move]
  Context --> Adapt
~~~

Tutor currently supports conservative evidence thresholds, Bayesian Knowledge Tracing, and a decay-sensitive BKT path. BKT estimates a hidden knowledge state from observable attempts using learn, slip, and guess probabilities. The original model is described by [Corbett and Anderson](https://doi.org/10.1007/BF01099821).

**Completed locally:** evidence-gated mastery writes and inspectable algorithm selection. **Partly completed:** evaluation quality across many subjects. **Not claimed:** neural knowledge tracing or a scientifically validated cognitive diagnosis for every learner.`,
  },
  {
    title: "Chapter 4: Context, Retrieval, And Sources",
    content: `# Context, Retrieval, And Sources

The context builder decides what the tutor should see before it answers.

~~~mermaid
flowchart TD
  Question[Learner question] --> Local{About current study material?}
  Local -->|yes| Study[Page, selection, active book, PDFs]
  Local -->|no or freshness required| Web[Background web tool]
  Study --> Answer[Foreground answer]
  Web --> Normalize[Source-linked compact result]
  Normalize --> Answer
~~~

Local source questions should prefer the active page, selected text, active learning book, and uploaded documents. Chat and voice use the same context packet, which carries the active user, book, document IDs, document manifest, excerpts, semantic memory, learner model state, and request/proof IDs. Current facts such as prices, news, schedules, or recent research require web retrieval.

When an uploaded PDF has server-stored extracted text, the chat/voice surface hydrates that text before building the packet. This keeps the browser cache light while still giving the tutor the relevant book context.

Artifacts store provenance: which request created an item, which source rows were available, and which limited verifier ran. Provenance makes a result traceable. It does not automatically prove that every sentence is true.

| Citation state | Meaning |
| --- | --- |
| \`verified\` | A named verifier passed for its stated, limited scope. |
| \`not_checked\` | Provenance exists, but no supported verifier has passed. |
| \`unsupported\` or \`unavailable\` | The current verifier cannot evaluate the item. |
| \`conflicting\` | Saved source and claim fields disagree. |

**Completed locally:** user-scoped context packets, server-backed PDF text hydration, provenance rows, and scoped integrity checks for primary artifact types. **Partly completed:** semantic claim-to-source entailment and document-wide grounding.`,
  },
  {
    title: "Chapter 5: Learning Books And Revision Material",
    content: `# Learning Books And Revision Material

A learning book should be useful after the conversation has been forgotten. It is not a transcript dump and should not be headed “Concepts to revise.”

Each chapter aims to contain:

1. a clear big idea;
2. an explanation of the mechanism;
3. related concepts and distinctions;
4. a worked example;
5. a flowchart or code sample when the subject benefits from one;
6. an active-recall check.

~~~mermaid
flowchart LR
  Turn[Completed tutor turn] --> Extract[Extract teachable ideas]
  Extract --> Organize[Organize chapter]
  Organize --> Explain[Explanation and example]
  Organize --> Visual[Diagram or code]
  Explain --> Review[Recall check]
  Visual --> Review
~~~

Generated content is saved as an artifact with source metadata. When document excerpts exist, the system can save bounded source-span anchors. These anchors support review but do not yet prove full semantic agreement.

**Completed locally:** generated books, chapter navigation, Mermaid, code blocks, flashcards, and stored-audio playback only when the current chapter title matches an MP3 manifest. **Partly completed:** reliable notebook-quality output from very short or weakly grounded conversations, visible source provenance inside generated chapters, and regenerated audio guides for rewritten built-in chapter titles.`,
  },
  {
    title: "Chapter 6: Voice And Asynchronous Tools",
    content: `# Voice And Asynchronous Tools

The voice experience uses a foreground lane and a background lane.

~~~mermaid
sequenceDiagram
  participant U as Learner
  participant V as Voice session
  participant F as Foreground tutor
  participant B as Background tools
  U->>V: Speech
  V->>F: Streaming transcript
  F->>U: Acknowledge and begin teaching
  F->>B: Queue current fact, code, PDF, or analysis work
  B-->>F: Compact source-linked result
  F->>U: Insert a natural continuation
~~~

Deepgram provides streaming speech recognition and Aura text-to-speech. Its [streaming TTS documentation](https://developers.deepgram.com/docs/streaming-text-to-speech) recommends one WebSocket per conversation, which lets Tutor avoid a new connection for every sentence and supports controls such as flush and clear.

The foreground model must acknowledge delegated work: “I will check that and let you know.” It should continue the lesson while the job runs. When the result arrives, it should use a natural bridge such as “Also,” “One more useful detail,” or “I found the current figure.” Raw JSON, Markdown markers, and provider labels must be removed before speech.

**Completed locally:** Deepgram integration paths, background delegation contracts, result stitching, interruption controls, and traces. **Partly completed:** repeatable latency and duplex-quality proof across real regions and provider keys. MisoTTS is not treated as the live path after local measurements failed the latency requirement.`,
  },
  {
    title: "Chapter 7: Admin And Multi-Learner Oversight",
    content: `# Admin And Multi-Learner Oversight

Admin is a decision-support surface, not a wall of database tables. The first view should let an operator select a learner and understand their local knowledge map.

~~~mermaid
flowchart LR
  Select[Select learner] --> Books[Books and subjects]
  Books --> Graph[Concept relationship graph]
  Graph --> Signals[Mastery, confidence, attempts]
  Signals --> Patterns[Strengths, gaps, review needs]
  Patterns --> Evidence[Inspect supporting rows]
~~~

## How To Read The Signals

- **Mastery** is an evidence-linked probability or score, not a school grade.
- **Confidence** is how strongly local records support the interpretation.
- **Attempts** show how much direct learner evidence exists.
- **Misconceptions** are hypotheses requiring review.
- **Last activity** helps distinguish a new gap from knowledge that may have decayed.

The concept graph resembles Graphify visually because both show nodes and relationships, but they describe different worlds. Graphify maps code. The learner graph maps study concepts.

**Completed locally:** learner grouping by local book owner, per-learner concepts, evidence ledgers, activity, and readiness views. **Partly completed:** authenticated users and hard data isolation. **Deferred:** organization-wide cloud administration and production monitoring.`,
  },
  {
    title: "Chapter 8: Current Status, Glossary, And References",
    content: `# Current Status

## Completed Locally

- Local learner profiles with stable user IDs.
- Server-side per-user folders, SQLite learner stores, PDF files, extracted text, and generated artifacts.
- Local learner books, concepts, entries, documents, chat archives, and flashcards.
- Evidence events, mastery deltas, BKT-backed updates, and correction overlays.
- User-scoped source-first context packets for typed chat and voice.
- Tool, model, retrieval, memory, artifact, and background-job ledgers shared by chat and voice.
- Revision books with diagrams, code rendering, flashcards, and title-matched stored audio only when current MP3 manifests match rewritten chapter titles.
- Admin inspection and local-beta diagnostics.

## Partly Completed

- Rich chapter generation from sparse conversations.
- Semantic verification of every generated claim.
- Real-provider typed-chat and live-voice proof across a repeatable test matrix.
- Cloud authentication and secure production identity beyond local profiles.
- Regenerated MP3 guides for rewritten built-in chapters whose old manifests no longer title-match.

## Deferred

- AWS as the system of record, tenant isolation, cloud backup, cross-device sync, production queues, and organization dashboards.

# Glossary

| Term | Full meaning |
| --- | --- |
| Active book | The learning book whose documents, chat history, and summaries receive priority in the current context packet. |
| Agent layer | The foreground chat or voice runtime responsible for one interaction path. |
| Artifact | Generated or retrieved material such as notes, cards, code, audio, images, or source cards. |
| Background job | Asynchronous or request-correlated work that can complete after, or alongside, the foreground tutor answer. |
| Barge-in | The learner interrupting spoken output so playback stops and listening resumes. |
| Bayesian Knowledge Tracing (BKT) | A probabilistic method that estimates whether a learner knows a skill from attempts, learning transitions, slips, and guesses. |
| Citation state | The recorded result of a limited source-integrity check for an artifact. |
| Confidence | The strength of local support for an interpretation; it is not certainty. |
| Context packet | The bounded set of book, PDF, selection, memory, and interaction data sent to a tutor request. |
| Correction overlay | A non-destructive record that marks data for review, quarantine, or replacement. |
| Deepgram Nova | A Deepgram speech-to-text model family used for streaming transcription. |
| Deepgram Aura | A Deepgram text-to-speech model family used for streamed audio output. |
| Dexie | The JavaScript library used to work with browser IndexedDB. Tutor uses it for cache, UI state, and offline fallback rows. |
| Evidence contract | The exact conditions a learner action must satisfy before it can change durable mastery. |
| Evidence event | A stored learner attempt and its validation result. |
| Foreground tutor | The model and application path responsible for the immediate teaching conversation. |
| Graphify | The generated repository architecture graph used by maintainers. |
| Learner brain | Tutor's durable, auditable local record of one user's learning material, evidence, estimates, and corrections. |
| Learning book | A learner-owned collection of chapters, concepts, documents, and conversation-derived material. |
| Mastery delta | The before-and-after learner-state change caused by accepted evidence. |
| Misconception candidate | A reviewable hypothesis that a learner may hold an incorrect model; it is not automatically treated as fact. |
| Model run | A ledger row describing a model request, status, timing, and provider metadata. |
| Provenance | Information describing where an artifact or record came from and which request produced it. |
| Request ID | A correlation identifier used to follow one interaction across model, tool, retrieval, and memory rows. |
| Retrieval event | A record of context selected from local or external sources. |
| Source span | A bounded excerpt anchor saved to help inspect support for generated notes. |
| SQLite | The server-side local database file used for durable learner rows before cloud migration. |
| Tenant isolation | Security rules that prevent one authenticated user's data from being read as another user's data. |
| Tool job | A bounded capability request such as search, page inspection, code work, or artifact generation. |
| Trace | An app activity record used for debugging; it is not proof of private model reasoning or factual truth. |
| User ID | The local profile identifier used to keep learner books, documents, context, and evidence scoped to the active user. |
| WebSocket | A persistent two-way network connection used for streaming events or audio. |

# References

- [Dexie and IndexedDB documentation](https://dexie.org/docs)
- [Deepgram streaming speech-to-text documentation](https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio)
- [Deepgram streaming text-to-speech documentation](https://developers.deepgram.com/docs/streaming-text-to-speech)
- [OpenAI tool-use guide](https://developers.openai.com/api/docs/guides/tools)
- [OpenAI Realtime and audio guide](https://developers.openai.com/api/docs/guides/realtime)
- [Corbett and Anderson, Knowledge Tracing](https://doi.org/10.1007/BF01099821)

These references explain the general technologies and research. The current source, tests, and measured runtime evidence remain the authority for what Tutor actually implements.`,
  },
];

export default userBrainArchitectureBook;
