const userBrainArchitectureBook = [
  {
    title: "Chapter 1: The Whole Shape",
    content: `# The Whole Shape

The learner brain is the app's local, auditable learning state. It is not a model's hidden memory and it is not Graphify.

~~~interaction-runtime
user-brain-runtime
~~~

| Layer | Responsibility |
| --- | --- |
| Foreground tutor | Teach, ask, listen, and adapt the current interaction. |
| Learner brain | Store books, concepts, evidence, mastery, artifacts, corrections, and traces. |
| Background workers | Retrieve, summarize, generate, and propose bounded updates. |

## Beginner Map

~~~mermaid
flowchart LR
  Action[Learner action] --> Context[Local context]
  Context --> Tutor[Foreground tutor]
  Tutor --> Ledger[Learner brain ledger]
  Ledger --> Next[Next lesson or review]
~~~

LearningAI is app-native: existing models operate through app contracts, local records, tools, and UI. It does not train a custom foundation model after each conversation.

## Status Boundary

- **Implemented:** the current local-beta runtime, Dexie ledgers, evidence-gated mastery, and Admin inspection.
- **Target:** tighter verification and broader local-beta proof.
- **Deferred:** AWS sync, tenant isolation, cloud storage, and production operations.

Graphify describes repository architecture for maintainers. The learner brain describes learner state inside the product.`,
  },
  {
    title: "Chapter 2: The Learner Brain Ledger",
    content: `# The Learner Brain Ledger

The learner brain is a ledger: every durable change should state what changed, why, what evidence supports it, and how it can be reviewed or corrected.

| Record family | Meaning |
| --- | --- |
| \`learningBooks\`, entries, concepts | Reusable learner material. |
| \`evidenceEvents\`, \`masteryDeltas\` | Validated learner evidence and resulting state changes. |
| Artifacts and citation states | Generated material plus its verification scope. |
| Model, tool, memory, retrieval, and job rows | Local runtime traceability. |
| Corrections and misconceptions | Reviewable hypotheses and non-destructive repair. |

## Ledger Flowchart Style

Use a readable left-to-right chart with one explicit evidence gate.

~~~mermaid
flowchart LR
  action["Learner action"] --> capture["Capture local row"]
  capture --> gate{"Evidence gate"}
  gate -->|validated| mastery["Mastery update"]
  gate -->|not validated| audit["Audit-only record"]
  mastery --> review["Admin review + correction"]
  audit --> review
~~~

## Current Contract

Validated evidence is the only basis for mastery increases. A linked flashcard review or evaluated answer may pass the gate when it has a real concept and explicit outcome. Model summaries, generated artifacts, traces, and misconception candidates may shape teaching or support review, but they cannot raise mastery by themselves.

Accepted mastery writes are recorded atomically with evidence and a mastery delta. Local traces make the decision inspectable; they do not prove factual truth.`,
  },
  {
    title: "Chapter 3: Teaching Loop And State",
    content: `# Teaching Loop And State

The tutor may adapt the live lesson quickly while changing durable learner state cautiously. Think of this as two lanes: fast teaching feedback and slow durable memory.

~~~mermaid
flowchart LR
  Explain[Explain] --> Demo[Demonstrate]
  Demo --> Ask[Ask]
  Ask --> Evaluate[Evaluate]
  Evaluate --> Adapt[Adapt next explanation]
  Evaluate --> Recall[Schedule recall when evidence is valid]
~~~

Soft signals such as hesitation, repeated questions, selected text, or voice timing can change the next explanation. They are interaction context, not durable truth.

A mastery increase requires validated evidence linked to a real concept. Incorrect evaluated answers may create a misconception candidate for Socratic repair, but that candidate does not lower or raise mastery on its own.

**Implemented:** local teaching context and evidence-gated review attempts. **Target:** stronger evaluation quality and more reviewable teaching policies.`,
  },
  {
    title: "Chapter 4: Retrieval, Artifacts, And Citations",
    content: `# Retrieval, Artifacts, And Citations

Retrieval should follow the learner's question:

- Use the current page, selected text, uploaded documents, and active learning book first for source-material questions.
- Use web search for explicit or freshness-sensitive external questions.

~~~mermaid
flowchart LR
  Question[Learner question] --> Local{About current material?}
  Local -->|yes| Sources[Page, selection, book, PDF]
  Local -->|no or current external fact| Search[Web search]
  Sources --> Answer[Grounded answer]
  Search --> Answer
  Answer --> Artifact[Optional artifact row]
~~~

Generated notes, flashcards, audio guides, charts, code, images, and websites are artifacts. Their local rows can prove where they came from, which request created them, and whether a scoped verifier ran. That is traceability, not factual truth.

| Citation state | Meaning |
| --- | --- |
| \`verified\` | A named verifier passed for its limited scope. |
| \`not_checked\` | Provenance exists, but no verifier has passed. |
| \`unsupported\` or \`unavailable\` | The current verifier cannot support the claim. |
| \`conflicting\` | Saved source or claim fields disagree. |

**Implemented:** local provenance and scoped checks for selected artifact kinds. **Target:** semantic entailment, document-wide grounding, and broader artifact verification.`,
  },
  {
    title: "Chapter 5: Admin And Runtime Tuning",
    content: `# Admin And Runtime Tuning

Admin is the local-beta inspection surface. It follows request ids across model, tool, voice, retrieval, memory, evidence, artifact, correction, and background-job rows.

~~~mermaid
flowchart LR
  Request[Request id] --> Logs[Main runtime logs]
  Request --> Evidence[Evidence and mastery rows]
  Request --> Jobs[Background jobs]
  Logs --> Admin[Admin review]
  Evidence --> Admin
  Jobs --> Admin
~~~

Admin can answer:

- What did the app record for this request?
- Which local contract passed or failed?
- Did validated evidence change mastery?
- Which work is queued, retrying, complete, or dead-lettered?
- Which correction or verifier still needs review?

Admin cannot reveal private model internals or turn a trace into factual truth. Runtime tuning changes future app behavior; it does not rewrite past evidence.

**Implemented:** local diagnostics, correction paths, and exportable proof. **Target:** complete the remaining real-provider local-beta drill and verifier gaps. **Deferred:** cloud monitoring and production operations.`,
  },
  {
    title: "Chapter 6: Voice, Audio, And Timing",
    content: `# Voice, Audio, And Timing

Voice should start quickly, stop when interrupted, keep spoken explanations compact, and preserve the same learner-brain boundaries as text chat. Speech and transcript rows are interaction traces, not mastery evidence.

Read Aloud is a separate audio path from live voice. The app can send existing assistant text to the optional \`miso-tts-8b\` service through \`/api/tts\`. Settings stores a \`MisoTTS API URL\`, and the server can use \`MISO_TTS_API_URL\`; realtime voice still uses the Deepgram voice-agent websocket.

Built-in Library chapters use stored audio guides. They are generated ahead of time and played as local assets, so reading a chapter does not require a live model or TTS request.

**Implemented:** realtime voice, read-aloud routing, stored chapter guides, and local voice traces. **Target:** finish the real-provider local-beta proof. Voice activity alone never increases mastery.`,
  },
  {
    title: "Chapter 7: Local Beta Roadmap",
    content: `# Local Beta Roadmap

## Implemented Now

- App-native foreground tutor, local learner-brain ledger, and bounded background work.
- Source-first chat and voice context, local artifacts, corrections, and runtime traces.
- Validated flashcard and evaluated-answer evidence as the only basis for mastery increases.
- Admin diagnostics for local workflow and evidence inspection.

## Target Before Local Beta Is Complete

- Finish one coherent real-provider typed-chat and live-voice proof.
- Strengthen semantic grounding and add verifiers for unsupported artifact kinds.
- Review or quarantine historical rows that do not satisfy current evidence contracts.

## Deferred Until After Beta

- AWS sync and cloud system of record.
- Tenant isolation, cloud backups, cross-device memory, production queues, alerts, and dashboards.

Local beta is the current product phase. Synthetic rehearsals and local traces help find wiring problems, but they do not replace live provider proof or factual verification.`,
  },
  {
    title: "Chapter 8: Sources And Glossary",
    content: `# Sources And Glossary

| Term | Meaning |
| --- | --- |
| Learner brain | Local product state for learning, evidence, artifacts, corrections, and retrieval. |
| Graphify | Repository architecture graph for maintainers; not the learner brain. |
| Evidence event | A validated learner action that may support a durable state change. |
| Mastery delta | An evidence-linked change to concept mastery. |
| Artifact | Generated or retrieved material stored for use or review. |
| Trace | A record of app activity that supports inspection, not factual truth. |
| App-native runtime | Coordination implemented in the application around existing models. |

## Reference Families

- OpenAI Responses, Realtime, voice-agent, safety, and eval guidance.
- Deepgram voice and audio-provider guidance.
- Bayesian knowledge-tracing research.
- IndexedDB/Dexie local-storage contracts.
- AWS Well-Architected, KMS, and PostgreSQL row-security guidance for deferred cloud design.

References inform the architecture; current behavior is established by the live source, tests, and validated runtime evidence.`,
  },
];

export default userBrainArchitectureBook;
