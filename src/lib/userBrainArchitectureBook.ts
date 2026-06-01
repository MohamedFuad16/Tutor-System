const userBrainArchitectureBook = [
  {
    title: "Chapter 0: What We Are Building",
    content: `# What We Are Building

We are building a tutor that feels simple to the learner, even though a lot of intelligence is working behind the scenes.

The learner should experience one calm tutor that knows what they are reading, what concept they are working on, what page or source matters, and what kind of help is useful right now.

The simple version:

- the learner sees one calm tutor;
- the tutor knows the current concept, book, page, and teaching goal;
- background workers retrieve sources, call tools, make artifacts, update memory, and check understanding;
- mastery scores change because of evidence, not because a model had an impression.

This book is the architecture for that system. It treats the [Thinking Machines interaction-model strategy](https://thinkingmachines.ai/blog/interaction-models/) as a product-pattern analogy, uses OpenAI docs for model/tool/retrieval guidance, and uses knowledge-tracing research for learner-state design.

The goal is not to train a custom foundation model. The goal is to build the same kind of runtime shape: a fast foreground tutor, slower background intelligence, shared state, and continuous teaching context.

The important rule is that durable memory changes must be earned. A mastery score should change because the system found evidence, checked sources, and passed typed contracts, not because a model merely had a confident impression.

## Architecture Consensus

The tighter strategy is:

- build a Thinking Machines-inspired app-native interaction runtime, not a native model-training program;
- give the learner one calm foreground tutor;
- run tool use, retrieval, artifact generation, evaluation, and memory work in asynchronous background lanes;
- let soft signals adapt teaching style immediately;
- let only validated evidence update durable mastery;
- use runtime contracts, event IDs, job states, and audit rows so the system can be operated and debugged.`,
  },
  {
    title: "Chapter 1: What This Is And Is Not",
    content: `# What This Is And Is Not

Before the architecture gets technical, keep this distinction clear.

## What This Is

- a continuous tutor orchestration system;
- a fast visible tutor plus bounded background workers;
- a learner-state system based on evidence, retrieval, summaries, and knowledge tracing;
- a tool-using teaching runtime that can show source cards, charts, images, code, and quizzes;
- a private learner brain with audit logs and reversible state changes.

## What This Is Not

- not native Thinking Machines interaction-model training;
- not a model that silently rewrites learner truth;
- not continuous fine-tuning after every beta conversation;
- not a claim that the newest KT paper is automatically the best production system;
- not a background worker layer with unlimited authority.

The practical strategy is simple: make the tutor feel continuous, but make durable changes boring, typed, scoped, and auditable.`,
  },
  {
    title: "Chapter 2: The Simple Mental Model",
    content: `# The Simple Mental Model

Think of LearningAI as one tutor supported by two hidden layers.

| Part | Plain meaning | What it does |
| --- | --- | --- |
| Foreground tutor | The learner-facing teacher | Speaks, listens, explains, pauses, asks checks, and keeps the lesson coherent. |
| Learner brain | The memory of the learner | Stores what the learner knows, where they struggle, what changed, and why mastery moved. |
| Background workers | Specialist helpers behind the tutor | Retrieve sources, generate charts/images/code, grade answers, update books, and propose mastery changes. |

The learner should not feel like they are talking to a pile of systems. They should feel like one tutor is paying attention.

The key is the shared context package. It keeps the foreground tutor, learner brain, and background workers aligned around the same facts: what the learner is doing, what source they are reading, what they already know, which teaching phase is active, which tool jobs are running, and what should happen next.

This mirrors the public architecture shape described in [Thinking Machines interaction models](https://thinkingmachines.ai/blog/interaction-models/): continuous foreground interaction plus asynchronous background intelligence that shares context. The important difference is that Thinking Machines describes a model-native system, while LearningAI implements an app-native runtime around existing models.

~~~interaction-runtime
user-brain-runtime
~~~

_Figure 1: The learner experiences one attentive tutor, while LearningAI keeps shared context, background workers, artifacts, and memory synchronized behind the scenes._`,
  },
  {
    title: "Chapter 3: Why We Are Not Continuously Fine-Tuning",
    content: `# Why We Are Not Continuously Fine-Tuning

The learner brain should not be implemented by constantly fine-tuning a model during beta.

Fine-tuning can be useful later when we want stable tutoring style, output format, or educational frameworks. But changing model weights is a slow, hard-to-audit way to represent a learner's evolving state. OpenAI documentation frames [supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning) as training from examples for specific behavior and recommends evals before changing model behavior. Treat [fine-tuning best practices](https://developers.openai.com/api/docs/guides/fine-tuning-best-practices) as optimization guidance, not as the first-line memory system, and refresh current OpenAI docs before release decisions because model and platform availability can change.

The first-line approach is:

1. Store learner evidence.
2. Retrieve the relevant evidence.
3. Summarize the learner state.
4. Inject that state into the next tutor turn.
5. Evaluate whether the answer was grounded and useful.

This maps to [OpenAI retrieval](https://developers.openai.com/api/docs/guides/retrieval), [file search](https://developers.openai.com/api/docs/guides/tools-file-search), [conversation state](https://developers.openai.com/api/docs/guides/conversation-state), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [evals](https://developers.openai.com/api/docs/guides/evals).

## Model Adaptation Boundary

LoRA, QLoRA, and PEFT are useful if LearningAI later hosts or owns an open model and wants cheaper adaptation for stable behavior. They are not the learner brain.

[LoRA](https://arxiv.org/abs/2106.09685) freezes the base model and trains low-rank adapter weights. [QLoRA](https://arxiv.org/abs/2305.14314) combines quantization with adapters to reduce fine-tuning memory. Hugging Face documents these as [PEFT/LoRA adapter methods](https://huggingface.co/docs/peft/developer_guides/lora).

Use them later for stable style, rubric-following, classification, or domain-specific small models. Do not use them as a way to update one learner's private mastery state after each session. Learner memory belongs in scoped data stores, retrieval, summaries, KT updates, and audit logs.

Plain rule: keep the model stable, change the context carefully, and use evals before changing model behavior.`,
  },
  {
    title: "Chapter 4: The Learner Brain Ledger",
    content: `# The Learner Brain Ledger

The learner brain is a ledger of evidence, not a mood, guess, or hidden GPT impression.

Think of it as a learning receipt book. Every durable change should answer three questions:

1. What did the learner do?
2. What did the system observe?
3. Why is that evidence strong enough to update the learner model?

The important point is auditability: every durable change should be explainable.

Evidence can include:

- quiz answers;
- open-ended explanations;
- code attempts;
- source passages used;
- hints requested;
- time since last review;
- confidence ratings;
- voice pauses or hesitation signals;
- transfer tasks where the learner applies a concept in a new situation.

Soft signals have limited authority. A pause, hesitation, or confident tone can change the tutor's pacing and support style, but it cannot prove mastery by itself.

The ledger should produce two kinds of memory.

| Memory type | Meaning |
| --- | --- |
| Episodic memory | What happened in sessions: messages, questions, answers, attempts, tool results. |
| Semantic memory | Stable understanding: concepts, summaries, misconceptions, preferences, mastery state. |

GPT can propose summaries and observations, but authoritative mastery should be evidence-driven. This follows the original idea of knowledge tracing: estimate what the student has learned from observed performance, as described by [Corbett and Anderson](https://doi.org/10.1007/BF01099821).`,
  },
  {
    title: "Chapter 5: Knowledge Tracing Strategy",
    content: `# Knowledge Tracing Strategy

Knowledge tracing means estimating what a learner knows over time.

The best LearningAI strategy is not to pick one newest model and trust it blindly. It is to use layers.

| Layer | Use now? | Role |
| --- | --- | --- |
| BKT | Yes | Transparent per-concept mastery updates from attempts. |
| Logistic KT / LKT features | Yes | Add features such as spacing, latency, hint use, difficulty, confidence, and attempt type. |
| DKT | Benchmark later | Neural sequence prediction; useful but less transparent. |
| AKT / LPKT | Benchmark later | Modern sequence models that may help once LearningAI has enough logged attempts. |
| Language-model LKT | Add carefully | Helps cold start because uploaded books create new concepts with text but little attempt data. |
| LLM-KT / CIKT / RAG-KT | Research track | Promising for cloud-scale semantic learner profiles and cross-source context, but not beta source of truth. |

## Beta Core

Use [BKT](https://doi.org/10.1007/BF01099821) as the auditable core. Use [Logistic Knowledge Tracing](https://arxiv.org/abs/2005.00869) to add explainable features beyond simple correct/incorrect events.

In beta, the LLM should act like an analyst: map a learner turn to concepts, extract structured evidence, explain why a next teaching move makes sense, and flag uncertainty. The predictor should stay deterministic and reviewable.

Retrieval helps recall relevant context; it does not prove truth. A retrieved source, vector neighbor, or graph edge still needs citation checks and tenant scope before it can support a durable claim.

## Evaluation Track

Use [Deep Knowledge Tracing](https://arxiv.org/abs/1506.05908) as a benchmark, not the first production ledger. Evaluate [AKT](https://arxiv.org/abs/2007.12324) and [LPKT](https://doi.org/10.1145/3447548.3467237) only after beta data proves the extra sequence modeling helps. Use [Language Model-based Knowledge Tracing](https://arxiv.org/abs/2406.02893) for semantic cold start, where question and concept text matter. Use [LLM-KT](https://arxiv.org/abs/2502.02945) and [CIKT](https://arxiv.org/abs/2505.17705) as patterns for analyst/predictor workflows. Watch [RAG-KT](https://arxiv.org/abs/2604.10960) because it fits a cloud brain with documents, vectors, and graph context.

Source-review note: in this workflow, RAG-KT was the newest directly relevant KT paper identified in the local research set, submitted in April 2026. That makes it useful for the research watchlist, not a beta source of truth. Refresh the literature scan before release decisions. For LearningAI, "best" means reliable under our data, not newest on arXiv.

Important naming note: LKT can mean Logistic Knowledge Tracing or Language-model-based Knowledge Tracing. For beta, LearningAI should use logistic KT as the production upgrade and use language-model KT as a semantic research layer.

Bad updates to reject:

- do not update mastery because the learner sounded fluent;
- do not update mastery because the tutor praised the answer;
- do not update mastery because notes, charts, or flashcards were generated;
- do not update mastery from the model's confidence alone.

Update mastery only from learner evidence that can be audited.

~~~mermaid
flowchart LR
  Action["Learner Action"] --> Evidence["Evidence Event"]
  Evidence --> Extract["LLM Analyst Extracts Signals"]
  Extract --> Schema["Structured Output Validation"]
  Schema --> KT["BKT + Logistic KT Update"]
  KT --> Audit["Audit Row + Reversible Delta"]
  Audit --> Next["Next Teaching Move"]
~~~

_Figure 2: LLMs may extract signals, but mastery changes only after structured validation and a KT update._

Recommendation:

- V1: BKT plus logistic features and an evidence ledger.
- V2: LLM Analyst extracts structured learner evidence; deterministic Predictor updates mastery.
- V3: graph/RAG KT over Neptune, Postgres, pgvector, and S3, evaluated on LearningAI's own data.

Short rule: LLMs can explain and extract; the mastery ledger must verify.`,
  },
  {
    title: "Chapter 6: Interaction Model Strategy",
    content: `# Interaction Model Strategy

LearningAI should not train a native interaction model now. Instead, it should implement the same architecture pattern at runtime.

[Thinking Machines](https://thinkingmachines.ai/blog/interaction-models/) describes interaction models as systems that can handle continuous audio, video, text, timing, silence, interruptions, and asynchronous background work. Their implementation is model-native. Our implementation is app-native.

That means the architecture has two live layers:

| Layer | What it optimizes | What it does |
| --- | --- | --- |
| Foreground interaction layer | Presence and timing | Tracks learner timing, listens, speaks, pauses, handles interruptions, and streams the next useful teaching move. |
| Background intelligence layer | Depth and verification | Runs retrieval, tools, evaluation, artifact generation, memory proposals, and KT updates without freezing the tutor. |

Tool results can arrive after the first answer and be woven back into the lesson at a natural boundary. The shared context package keeps both layers aligned.

The current app already has the first local approximation: src/lib/interactionModel.ts tracks modes such as composing, thinking pause, submitted, awaiting response, listening, and speaking. ChatPanel sends that as an Interaction Model Context block.

Next, the interaction model should track teaching state too: whether the tutor is explaining, checking understanding, diagnosing a misconception, generating an artifact, or scheduling recall.

Implementation-status note: the current app has the early interaction-context layer. The full background job ledger, citation-state machine, tenant-scoped cloud write path, and durable mastery contracts remain architecture requirements until implemented and tested.

## Reliability Boundary

The background worker layer can retrieve, draft, grade, summarize, and propose memory deltas. It cannot directly commit durable mastery changes. Only a validated evidence event can create a mastery delta, and only a tenant-scoped, schema-valid job can write to the learner brain.

## Source Of Truth

| Layer | Owns | Does not own |
| --- | --- | --- |
| Visible tutor | Explanation, dialogue, pacing, tool requests. | Final mastery, private storage policy, billing-sensitive writes. |
| KT engine | Mastery, confidence, evidence deltas. | Free-form teaching style. |
| Retrieval layer | Source grounding and source spans. | Whether a learner has mastered a concept. |
| Memory service | Preferences, summaries, history, misconceptions. | Unvalidated external facts. |
| Evaluator | Quality, safety, source-grounding checks. | Product authority to ignore user consent. |

The important distinction:

| Signal | Can adapt teaching style? | Can update mastery alone? |
| --- | --- | --- |
| Pause or hesitation | Yes | No |
| Confidence language | Yes | No |
| User interruption | Yes | No |
| Correct answer to a check | Yes | Yes, after evidence validation. |
| Transfer task success | Yes | Yes, after KT update. |

Learning authority rule: the foreground tutor can teach, the background worker layer can analyze, but only validated evidence can update mastery.`,
  },
  {
    title: "Chapter 7: Continuous Tutor Loop",
    content: `# Continuous Tutor Loop

This is the runtime loop we want.

~~~mermaid
stateDiagram-v2
  [*] --> Listening
  Listening --> ThinkingPause: pause detected
  Listening --> Submitted: turn submitted
  ThinkingPause --> Listening: learner continues
  ThinkingPause --> Submitted: learner yields turn
  Submitted --> Teaching: foreground tutor responds
  Teaching --> BackgroundWork: launch async jobs
  BackgroundWork --> ArtifactReady: verified result ready
  ArtifactReady --> Teaching: weave in at natural boundary
  Teaching --> CheckUnderstanding
  CheckUnderstanding --> MemoryUpdate: answer evaluated
  MemoryUpdate --> Listening: next move chosen
~~~

_Figure 3: The tutor keeps the visible lesson moving while background work enriches the next teaching move._

| Step | What the learner sees | What the system does |
| --- | --- | --- |
| 1. Idle | Tutor waits calmly. | Load learner state and active book. |
| 2. Listening or composing | Learner speaks or types. | Track coarse timing, source context, and current concept. |
| 3. Pause detected | Tutor may lightly backchannel. | Mark hesitation, do not send raw draft text. |
| 4. Submit or interruption | Tutor responds quickly. | Send context package, start foreground response. |
| 5. Teaching move | Tutor explains, asks, or demonstrates. | Stream answer and launch background jobs. |
| 6. Tool work | A chart, code snippet, website, image, or source result may appear. | Background worker calls tools and validates results. |
| 7. Check understanding | Tutor asks a short question or task. | Evaluation worker scores the answer as evidence. |
| 8. Memory update | Learner can continue. | Memory worker updates summaries, graph, and book records; mastery changes only through validated evidence and KT contracts. |
| 9. Next move | Tutor chooses review, deeper explanation, or next concept. | KT state and retrieved context decide the next teaching action. |

This is not a model that magically reads minds. It is a disciplined event loop with visible teaching state, background work, and evidence-based learner updates. OpenAI's [Realtime](https://developers.openai.com/api/docs/guides/realtime), [tools](https://developers.openai.com/api/docs/guides/tools), [function calling](https://developers.openai.com/api/docs/guides/function-calling), and [background mode](https://developers.openai.com/api/docs/guides/background) are useful references for the API-side pieces.`,
  },
  {
    title: "Chapter 8: Teaching And Evaluation States",
    content: `# Teaching And Evaluation States

The tutor should know what kind of teaching move it is making.

Core teaching states:

| State | Tutor behavior | Evidence produced |
| --- | --- | --- |
| Explain concept | Gives a clear explanation. | Concept exposure event. |
| Show example | Demonstrates with code, chart, diagram, or analogy. | Example type and learner reaction. |
| Check understanding | Asks a short question. | Correctness, confidence, latency. |
| Detect misconception | Compares answer to known misconception patterns. | Misconception candidate with source evidence. |
| Repair explanation | Re-teaches in a simpler or alternate style. | Remediation event. |
| Generate artifact | Creates flashcards, code, chart, image, website, or notes. | Artifact record with source links. |
| Schedule recall | Plans future review. | Due date and spaced repetition reason. |
| Update mastery | Changes learner score. | Auditable knowledge event. |

Teaching mode should also respond to cognitive load and evidence quality:

| Learner state | Tutor move |
| --- | --- |
| High load, low prior evidence | worked example, smaller chunk, slower pace. |
| Medium load, partial evidence | faded scaffold, hint ladder, short prediction check. |
| Low load, strong recall | harder recall, transfer question, fewer hints. |
| High confidence plus later failure | calibration repair and illusion-of-knowing flag. |
| Misconception detected | elicit belief, counterexample, repair explanation, retest, delayed retest. |

This makes voice mode more human. If the learner pauses, the tutor can wait, nudge, or ask if they want help. If the learner interrupts, the tutor can stop speaking and rebase. If a background chart finishes after the tutor starts explaining, the tutor can say, in effect, "I have the chart now; let us use it."`,
  },
  {
    title: "Chapter 9: Tool-Using Background Worker Layer",
    content: `# Tool-Using Background Worker Layer

The background worker layer is the tutor's specialist workspace.

It does not replace the foreground tutor. It supplies the tutor with verified results.

Workers:

| Worker | Job | Authority boundary |
| --- | --- | --- |
| Retrieval worker | Pull source spans, book context, prior memories, and graph neighbors. | Can return cited context, not mastery changes. |
| Research worker | Use web search only when the question needs current external facts. | Can return untrusted external findings until verified. |
| Content worker | Generate charts, images, code snippets, examples, flashcards, and mini websites. | Can draft artifacts, not claim they are correct without checks. |
| Evaluation worker | Grade learner answers, check citations, and run safety checks. | Can produce evaluator output, not silently rewrite the learner brain. |
| Memory worker | Update summaries, misconceptions, and learning books. | Can write derived memory only through typed contracts. |
| KT worker | Apply BKT/logistic KT evidence and mastery updates. | Can change mastery only from validated EvidenceEvent rows. |
| Safety worker | Check privacy, source grounding, unsafe advice, and cross-user boundaries. | Can block or downgrade a result when policy or scope fails. |

~~~mermaid
flowchart LR
  Need["Learner Need"] --> Router["Artifact Router"]
  Router --> Source["Source Card"]
  Router --> Chart["Chart"]
  Router --> Image["Image or Diagram"]
  Router --> Code["Runnable Code"]
  Router --> Web["Website Preview"]
  Router --> Recall["Flashcard or Quiz"]
  Source --> Tutor["Tutor Weaves Result"]
  Chart --> Tutor
  Image --> Tutor
  Code --> Tutor
  Web --> Tutor
  Recall --> Tutor
~~~

_Figure 4: Tool use is routed by learning need, then returned to the tutor as a verified teaching artifact._

The background worker layer should emit events: tool started, tool progress, result ready, citation verified, memory updated, mastery changed. The foreground tutor can then decide whether to interrupt itself, wait for a natural pause, or show the result as a panel.

OpenAI [function calling](https://developers.openai.com/api/docs/guides/function-calling), [tools](https://developers.openai.com/api/docs/guides/tools), and [background mode](https://developers.openai.com/api/docs/guides/background) are the implementation references for this lane.`,
  },
  {
    title: "Chapter 10: Runtime Contracts",
    content: `# Runtime Contracts

The debate between the five agents converged on one point: the two-layer tutor becomes real only when the app has contracts for events, jobs, artifacts, and mastery updates.

The foreground tutor should usually avoid blocking on deep work. It should say the useful first thing, launch background jobs, and then merge verified results into the lesson.

Blocking exceptions: the tutor should wait or ask permission when a step depends on safety, privacy, tenant scope, required citations, source-grounding, or consent.

Use two background lanes:

| Lane | Use | Examples |
| --- | --- | --- |
| Hot lane | Fast session support while the tutor is live. | quick source lookup, small chart, citation check, short code snippet. |
| Durable lane | Reliable work that must survive retries and audits. | memory updates, KT changes, source ingestion, artifact persistence, expensive research. |

Core events:

| Event | Meaning |
| --- | --- |
| turn.submitted | The learner yielded the turn. |
| interaction.pause_detected | The learner paused long enough to matter. |
| tool.requested | The tutor or background worker layer needs a tool. |
| tool.progress | The tool is still working. |
| artifact.ready | A chart, image, source card, code snippet, or preview is ready. |
| citation.verified | A cited source link or source span passed verification. |
| evaluation.completed | The learner answer was evaluated. |
| mastery.changed | KT updated a concept score with evidence. |
| worker.failed | A worker failed and the UI should show a retryable state. |

Every event should carry tenant_id, user_id, session_id, turn_id, job_id, idempotency_key, created_at, and schema_version. This lets jobs retry safely and prevents old background results from attaching to the wrong lesson.

Before cloud beta, these should exist as typed runtime contracts:

| Contract | Purpose |
| --- | --- |
| EvidenceEvent | What learner action happened, what concept it touches, and why it counts. |
| ToolJob | What tool was requested, by whom, for which turn, and with which tenant scope. |
| ArtifactRecord | What chart, image, source card, code snippet, or preview was produced and whether it is verified. |
| MemoryEvent | The raw episodic learner event before summarization or scoring. |
| LearnerMemory | A derived, source-linked learner memory with confidence, time bounds, and deletion/correction status. |
| MasteryDelta | The reversible KT update, linked to an evidence event and audit row. |

Every tool job should also declare purpose, inputs, budget, timeout, permission tier, allowed outputs, trace_id, and fallback behavior.

Minimum schema fields:

| Contract | Required fields |
| --- | --- |
| EvidenceEvent | tenant_id, user_id, session_id, turn_id, concept_id, source_ref, attempt_type, observed_answer, evaluator_version, confidence, created_at. |
| ToolJob | tenant_id, user_id, turn_id, job_id, tool_name, permission_tier, inputs_hash, budget, timeout_ms, idempotency_key, trace_id, status. |
| ArtifactRecord | artifact_id, job_id, type, source_ids, verification_state, storage_ref, created_at, expires_at, stale_after_turn_id. |
| MemoryEvent | event_id, tenant_id, user_id, session_id, source_refs, event_type, raw_payload_ref, retention_policy, created_at. |
| LearnerMemory | memory_id, source_event_ids, memory_type, confidence, valid_from, valid_until, status, reviewed_by, deletion_group_id. |
| MasteryDelta | concept_id, prior_state, proposed_state, evidence_event_id, kt_model_version, reversible_delta, audit_id. |
| CitationState | claim_id, url_or_source_span, state, checked_at, verifier, failure_reason. |

Evidence facets should start richer than the first production mastery score. Store recall, explanation, procedure, near-transfer, far-transfer, confidence, calibration, latency, hint level, and delayed retest as facets on evidence events. In beta, these can feed a simpler calibrated KT ledger; they should not all become authoritative public scores on day one.

Derived memory pipeline:

~~~mermaid
flowchart LR
  MemoryEvent["Memory Event"] --> Extract["Extract Candidate"]
  Extract --> Validate["Cite + Conflict Check"]
  Validate --> LearnerMemory["Learner Memory"]
  LearnerMemory --> RetrievalContext["Retrieval Context"]
  LearnerMemory --> Correction["Edit/Delete/Mark Wrong"]
  Correction --> Invalidate["Invalidate Derived Projections"]
~~~

Correction rule: editing or deleting a session must propagate to summaries, graph facts, embeddings, mastery deltas, tutor preferences, caches, and exports where practical. A memory is not trustworthy unless the user can see why it exists and how to remove or correct it.

Local beta implementation note: Admin now records correction requests and applies non-destructive propagation overlays to matching local ledgers. Evidence and mastery rows are marked unverified, memory/retrieval rows can be skipped, source artifacts become stale/conflicting, citation states become unsupported/conflicting, and the capped diagnostics export includes a correction overlay. Source-card citation rows can also pass through a local citation-integrity verifier that checks saved artifact links, URL shape, domain consistency, and source ids without fetching external pages. Generated flashcard batches now write \`ArtifactRecord\` rows with \`not_checked\` provenance citation states, so Admin can see study-card artifacts without pretending they have external proof. This is not hard deletion, not full factual verification, and does not yet rebuild every embedding or graph projection.

Every background job should move through a visible lifecycle:

| State | Meaning |
| --- | --- |
| queued | Accepted and waiting. |
| running | Worker started. |
| progress | Partial status is available. |
| ready | Result is verified enough to show. |
| failed | The tutor should continue and offer retry. |
| cancelled | User or tutor cancelled the job. |
| stale | Result arrived too late for the active teaching moment. |

Artifact policy decides whether a result should show now, wait for a natural pause, summarize quietly, ask permission, or be discarded as stale.

~~~mermaid
flowchart LR
  Request["Tool Request"] --> Validate["Validate Scope"]
  Validate --> Queue["Queue Job"]
  Queue --> Run["Run Worker"]
  Run --> Verify["Verify Source or Result"]
  Verify --> Ready["Artifact Ready"]
  Verify --> Failed["Retryable Failure"]
  Ready --> Tutor["Tutor Weaves It In"]
  Ready --> Audit["Trace + Audit Row"]
  Failed --> Tutor
~~~

_Figure 5: Tool work becomes safe when each result passes scope, verification, fallback, and audit checks._

Failure rule: if a chart, image, code snippet, or source lookup fails, the tutor should continue teaching and show a retryable artifact card. It should not pretend the artifact exists.

Citation states:

| State | Meaning |
| --- | --- |
| verified | URL/source span or saved source-card linkage passed the configured verifier for its scope. |
| checking | The tutor can mention that verification is in progress, but should not present it as confirmed. |
| not_checked | The artifact has local provenance, but no verifier for that artifact kind has run yet. |
| unavailable | The source cannot be reached or does not support the claim. |
| conflicting | Sources disagree; the tutor should show uncertainty and ask whether to compare. |
| unsupported | The available local verifier cannot assess this citation kind yet. |

Truth rules:

- no citation, no external source claim;
- no evidence event, no mastery update;
- no tenant scope, no background job;
- no validation, artifact stays draft;
- stale job results attach to history, not the active lesson.

## Current Implementation Status

Implemented now:

- the built-in User Brain Architecture book;
- the local interaction context layer;
- basic BKT-style mastery machinery;
- source cards, reader citation links, durable citation-state rows, and a local source-card integrity verifier;
- generated flashcard artifact records with local provenance and explicit \`not_checked\` citation state.

Required before cloud beta:

- broader generated-artifact citation verification beyond source-card and flashcard-provenance rows;
- durable job queue with retries and dead-letter review;
- source-state enforcement in the UI;
- tenant-scoped write paths across relational rows, vectors, graph IDs, S3 objects, queues, and logs;
- tests that make mastery writes impossible without validated evidence and audit rows.

Operational gates:

- foreground first response starts quickly for cached context;
- voice barge-in cancels speech quickly after detection;
- background jobs show visible progress;
- every mastery update has an evidence row and reversible audit delta;
- dead-letter jobs are triaged before beta expansion;
- cross-tenant leakage tests cover rows, vectors, graph IDs, S3 objects, queues, and logs.`,
  },
  {
    title: "Chapter 11: Voice And Human Timing",
    content: `# Voice And Human Timing

Voice mode should feel like tutoring, not narration. Voice is not chat read aloud; it is a timing-sensitive teaching interface.

The tutor needs:

- voice activity detection;
- pause detection;
- barge-in handling;
- short backchannels;
- pronunciation repair;
- Japanese and English support;
- artifact display while speaking;
- ability to continue after a tool result arrives.

Operationally, voice also needs cost and fallback visibility. If realtime voice is too expensive or network conditions are poor, the app should be able to fall back to text streaming, push-to-talk, or a lower-cost speech path without losing learner state.

Examples:

- Learner pauses for two seconds during an answer. Tutor waits instead of jumping in.
- Learner says "wait." Tutor stops speaking and asks what changed.
- Learner asks for a diagram. Tutor gives a quick verbal bridge while a background worker generates the diagram.
- Learner struggles with a code trace. Tutor opens a runnable snippet, asks one prediction question, then updates mastery from the answer.

## When The Tutor Should Stay Quiet

The tutor should not fill every silence. Pauses can mean the learner is thinking.

Stay quiet when:

- the learner is mid-sentence;
- the learner has paused briefly after a difficult question;
- a tool result is ready but not needed yet;
- an artifact would distract from the current explanation;
- the learner is trying to solve a recall or code-prediction task.

Speak when:

- the learner explicitly asks for help;
- the pause passes the configured thinking threshold;
- the learner interrupts or says stop;
- a safety or wrong-source correction is needed;
- the background result directly improves the current teaching move.

OpenAI's [Realtime](https://developers.openai.com/api/docs/guides/realtime), [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc), [voice agents](https://developers.openai.com/api/docs/guides/voice-agents), and [voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad) are the relevant implementation references.`,
  },
  {
    title: "Chapter 12: From Dexie To AWS",
    content: `# From Dexie To AWS

Dexie is good for local beta. It makes the app feel fast and lets the browser hold learning books, concepts, entries, flashcards, and sessions.

Production needs durable server-side state, backup, access control, and observability. AWS is the current reference cloud shape.

The simple migration idea:

**Dexie becomes a local cache. AWS becomes the durable brain.**

Dexie should be treated as a friendly IndexedDB wrapper, not as the final source of truth. [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) can store significant structured browser data, but browser storage is quota-governed and can be best-effort unless persistence is granted; see MDN's [storage quota and eviction guidance](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). The cloud brain must be able to rebuild local cache state after device loss, browser cleanup, or a new login.

Target responsibilities:

| System | Stores |
| --- | --- |
| Aurora PostgreSQL | Users, books, chapters, sessions, events, learner profile, mastery ledger, audit rows. |
| pgvector | Semantic memory, source-span embeddings, learner-context retrieval. |
| Neptune | Concept graph, prerequisites, misconception graph, related concepts. |
| S3 | PDFs, page images, OCR, source spans, generated books, charts, code artifacts, exports. |
| ECS Fargate | API, interaction service, voice gateway, background workers. |
| ElastiCache / Valkey | Hot session state, presence, short-lived locks, and low-latency coordination. |
| EventBridge and SQS | Async jobs, retries, delayed work, dead-letter queues. |
| CloudWatch + OpenTelemetry | Logs, traces, latency, queue depth, retrieval quality, tool failures, cost signals. |

AWS docs support this split: [Amazon Neptune](https://docs.aws.amazon.com/neptune/latest/userguide/graph-get-started.html) for connected graph data, [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html) for managed relational storage, [Aurora PostgreSQL with pgvector](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html) for vector retrieval patterns, [pgvector](https://github.com/pgvector/pgvector) for PostgreSQL vector similarity search, and [S3 object keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html) for prefix-organized artifacts.

Use [ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) as LearningAI's initial default compute lane because it runs containers without managing EC2 clusters for ordinary services. Use [Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html) later only for GPU workloads, heavy media processing, local model hosting, or custom sandboxes.

Use [Amazon ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html) for hot, short-lived coordination when the live tutor needs low latency. Use [EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html) for domain events such as turn.submitted, tool.requested, brain.update.requested, and artifact.ready. Use [SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) for durable worker queues and retries. Use [CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html) for logs, dashboards, latency, queue depth, and tool failure alarms. Use [OpenTelemetry](https://opentelemetry.io/docs/) conventions where possible so tool calls, worker jobs, retrieval steps, and mastery changes share trace IDs across services.`,
  },
  {
    title: "Chapter 13: Cloud Data Model",
    content: `# Cloud Data Model

A production learner brain needs clear ownership boundaries.

Authority rule: Aurora Postgres owns the ledger. pgvector, Neptune, S3, Dexie, and caches are projections or artifact stores. If a worker retries, replays, or arrives late, the Postgres event ledger decides what still counts.

Postgres tables:

- tenants;
- users;
- books;
- chapters;
- source_spans;
- sessions;
- learning_events;
- memory_events;
- learner_memories;
- knowledge_state;
- mastery_audit;
- tool_jobs;
- outbox_events;
- artifact_manifest;
- generated_artifacts;
- consent_and_retention_events.

Vector rows in pgvector:

- memory embedding;
- source span embedding;
- concept summary embedding;
- learner profile summary embedding;
- metadata: tenant_id, user_id, book_id, concept_id, source_id, timestamp.

Vector caveat: pgvector is retrieval infrastructure, not truth. Approximate indexes and embedding similarity can miss relevant material or retrieve plausible but wrong neighbors, so source grounding needs precision/recall evals, tenant filters, and citation verification.

Projection consistency rule: every derived vector row, graph edge, S3 artifact, Dexie cache row, and summary should be traceable to source event IDs. Duplicate jobs, stale retries, partial failures, and redrives must not create duplicate learner truth.

Neptune graph:

- Concept nodes;
- Book nodes;
- Misconception nodes;
- Skill nodes;
- edges such as prerequisite_of, explained_by, confused_with, appears_in, supports, blocks.

S3 prefixes:

- tenants/{tenant_id}/users/{user_id}/books/{book_id}/source/
- tenants/{tenant_id}/users/{user_id}/books/{book_id}/spans/
- tenants/{tenant_id}/users/{user_id}/sessions/{session_id}/artifacts/

S3 lifecycle policies can later move old artifacts into cheaper storage classes; see [S3 lifecycle rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html).

~~~mermaid
flowchart LR
  Browser["Browser + Dexie Cache"] --> API["API + Interaction Service"]
  API --> PG["Aurora Postgres"]
  API --> Vec["pgvector Retrieval"]
  API --> Graph["Neptune Concept Graph"]
  API --> Obj["S3 Artifacts"]
  API --> Cache["ElastiCache Hot State"]
  API --> Events["EventBridge"]
  Events --> Queue["SQS Queues"]
  Queue --> Workers["Background Workers"]
  Workers --> PG
  Workers --> Vec
  Workers --> Graph
  Workers --> Obj
  Workers --> API
~~~

_Figure 6: Dexie keeps local reading fast, while AWS stores durable learner data, artifacts, graph context, retrieval vectors, and background jobs._`,
  },
  {
    title: "Chapter 14: Isolation, Privacy, And Safety",
    content: `# Isolation, Privacy, And Safety

OpenAI API requests are independently processed, but LearningAI still owns app-level isolation.

Every cloud row, graph node, graph edge, vector row, S3 object, queue message, and log event needs tenant and user scope.

Use:

- auth at the API edge;
- authorization before every request;
- PostgreSQL row-level security;
- tenant-scoped graph IDs and query predicates;
- S3 prefixes, tags, and scoped access;
- KMS keys for sensitive artifacts;
- ECS task IAM roles with least privilege;
- audit logs for every learner-state mutation.

Use [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) as a defense even when app logic is wrong. Use [AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html) for key management around sensitive artifacts. Use [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) when documenting provider data handling. Use [OpenAI safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices) and [evals](https://developers.openai.com/api/docs/guides/evals) for release gates.

RLS caveat: PostgreSQL row-level security is defense-in-depth, not a substitute for application authorization. Table owners and privileged roles need careful configuration and tests, and every query path still needs tenant scope.

Security baseline: map the tutor against the [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications), especially prompt injection, sensitive information disclosure, excessive agency, vector/embedding weaknesses, misinformation, and unbounded consumption. Use the [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) and [NIST Privacy Framework](https://www.nist.gov/privacy-framework) to turn this into governance: identify risks, measure them, manage them, and make data minimization explicit.

Plain rule: a learner's brain is private, auditable, and reversible.`,
  },
  {
    title: "Chapter 15: Beta Gates And Roadmap",
    content: `# Beta Gates And Roadmap

Beta should prove behavior.

Required gates:

| Gate | Pass condition | Evidence |
| --- | --- | --- |
| Source grounding | Answers cite the relevant page, source span, or retrieved record. | Source cards, citation states with local verifier metadata, retrieval traces. |
| Current facts | Latest/current questions trigger retrieval/search or explicit uncertainty. | Tool job logs and verified/unavailable/conflicting/unsupported citation states. |
| Tool artifacts | Charts, code, images, websites, flashcards, and source cards are visible, auditable, and attached to the turn. | ArtifactRecord rows with verification state. |
| Learner-state changes | Every durable change has evidence and can be reversed. | EvidenceEvent, MasteryDelta, audit row, correction path. |
| Voice behavior | Latency, pause handling, barge-in, pronunciation, and fallback path are measured. | Realtime traces and voice QA runs. |
| Tenant isolation | Cross-user leakage tests pass across rows, vectors, graph IDs, S3 objects, queues, and logs. | Security tests and red-team fixtures. |
| Cost and reliability | Model route, token cost, search cost, audio seconds, tool failures, and queue depth are tracked. | Dashboards, traces, alerts, dead-letter review. |
| KT calibration | BKT/logistic KT predictions are calibrated against real quiz and recall data. | Offline eval report and calibration plots. |
| Contract consistency | Event names and job states match implementation, logs, and this book. | Runtime schema tests and log samples. |
| Memory control | Remembered learner facts show why remembered, edit, delete, and mark wrong controls. | UI QA and deletion/correction propagation tests. |
| Adaptive recommendations | Experiments log propensities, alternatives shown, outcome labels, and guardrails before steering curriculum. | Experiment logs and counterfactual-eval plan. |

First beta targets to validate:

| Target | First threshold |
| --- | --- |
| Cached text first visible token | p50 under 1.5s, p95 under 4s. |
| Source-card from already indexed book/page | p50 under 2s, p95 under 5s. |
| Web/current-fact lookup | starts async with visible progress under 1s; may complete after the first answer. |
| Voice barge-in stop after detection | p50 under 300ms, p95 under 800ms. |
| Hot tool progress event | visible within 1s after accepted tool job. |
| Durable job retry | retry policy and dead-letter state visible before beta expansion. |
| Mastery update | zero writes without EvidenceEvent, MasteryDelta, and audit row. |
| Memory correction | derived memories and projections are invalidated, marked superseded, or exported with local correction overlays before destructive deletion. |
| Recommendation experiment | logged propensity and counterfactual-eval plan before online optimization. |

Security gates:

- prompt-injection tests cover user prompts, uploaded documents, retrieved web pages, source spans, and tool outputs;
- sensitive tools require permission tiers and, when needed, human approval;
- generated code, HTML, websites, charts, and images are treated as untrusted output until sanitized or sandboxed;
- vector search cannot bypass tenant scope or return cross-user chunks;
- logs redact learner PII, transcript fragments, and secrets before leaving the app boundary;
- background jobs have queue depth alarms, dead-letter review, trace IDs, and replay rules.

Roadmap:

| Phase | Goal |
| --- | --- |
| Local beta | Dexie cache, interaction context, BKT/logistic KT evidence, clickable citations, source-grounded tutoring. |
| Cloud beta | Aurora/Postgres, pgvector, S3 artifacts, EventBridge/SQS workers, tenant isolation, CloudWatch dashboards. |
| Production brain | Neptune graph traversal, durable mastery ledger, Admin mutation review, structured outputs, stronger evals. |
| Research-grade KT | Evaluate CIKT, LLM-KT, RAG-KT, L-HAKT, and DKT/transformer baselines on LearningAI data. |

The book itself should remain a living architecture record. When the implementation changes, update the citations and the beta gates together.`,
  },
  {
    title: "Chapter 16: Final Deep Evaluation",
    content: `# Final Deep Evaluation

This final pass checked the architecture against primary docs, research papers, and security guidance. The architecture is directionally strong, but only if LearningAI keeps the learner brain as data and evidence, not as hidden model drift.

## What Is Sound

The two-layer runtime is the right product shape:

- the foreground tutor stays present and responsive;
- the background worker layer retrieves, verifies, generates, evaluates, and updates memory asynchronously;
- background results return as artifacts or memory proposals, not as invisible authority;
- durable mastery changes require validated learner evidence.

This matches the interaction-model pattern from [Thinking Machines](https://thinkingmachines.ai/blog/interaction-models/) at the application layer: a foreground interaction loop delegates deeper work to asynchronous background intelligence and merges results at the right teaching moment. LearningAI should not claim native interaction-model training. It should claim a runtime architecture inspired by that pattern.

## Gaps Tightened

| Gap | Tightened rule |
| --- | --- |
| Dexie durability | Dexie is cache/offline beta storage. Aurora/Postgres, S3, pgvector, and Neptune become the durable cloud brain. |
| Vector retrieval | pgvector improves semantic recall but does not prove truth. Use tenant filters, source spans, evals, and citation states. |
| Knowledge tracing | BKT plus logistic features is the beta ledger. DKT, AKT, LPKT, language-model LKT, LLM-KT, CIKT, and RAG-KT stay eval tracks until LearningAI data proves lift. |
| LoRA/QLoRA/PEFT | Useful later for open-model adaptation, not for per-learner memory. Never replace audit logs or mastery deltas with adapter drift. |
| Background authority | Background jobs can propose, verify, and generate. Only typed contracts can commit durable learner-state changes. |
| Mastery dimensions | Recall, explanation, procedure, near-transfer, far-transfer, confidence, and calibration start as evidence facets. Promote them to separate authoritative scores only after enough data. |
| Projection consistency | Postgres is the replayable authority; vectors, graph edges, S3 manifests, summaries, Dexie rows, and caches must derive from event IDs. |
| Memory deletion | Deleting or correcting a session must propagate to derived memories, embeddings, graph facts, mastery deltas, exports, and tutor preferences where practical. Local beta starts with non-destructive overlays before hard deletion. |
| Adaptive recommendations | Bandits and recommenders need logged propensities, outcome labels, and guardrails before they can steer curriculum. |
| Security | OWASP LLM risks, NIST AI RMF, tenant isolation, data minimization, log redaction, and permissioned tools are launch gates. |
| Observability | Every tool job, retrieval step, artifact, evaluation, and mastery update needs trace_id, cost signals, latency, and failure state. |

## Rejected Overclaims

- "RAG-KT is the best current production model" is too strong. It is promising and recent, but beta should start with interpretable KT and compare newer methods offline.
- "Fine-tuning or LoRA can become personalized learner memory" is the wrong abstraction. Adapters are behavior adaptation; learner state is private, auditable data.
- "Vector search solves source grounding" is false. Retrieval can return near neighbors that are incomplete, stale, or cross-tenant if filters fail.
- "A background agent can safely do anything if prompted well" is false. Tool scope, schemas, budgets, approval tiers, and audit logs are required.
- "Dexie is enough for production memory" is false. It is excellent for local speed, but browser storage can be cleared or constrained.
- "The tutor remembers the learner" is too vague unless every durable remembered fact can explain why it exists and how it can be corrected or removed.

## Final Runtime Shape

~~~mermaid
flowchart TB
  Learner["Learner"] --> UI["Reader, Chat, Voice"]
  UI --> Tutor["Foreground Tutor"]
  Tutor --> Context["Context Package"]
  Context --> Hot["Hot Background Lane"]
  Context --> Durable["Durable Background Lane"]
  Hot --> Artifact["Verified Artifact"]
  Durable --> Evidence["Evidence Event"]
  Evidence --> KT["BKT + Logistic KT"]
  KT --> Ledger["Mastery Ledger"]
  Ledger --> Context
  Artifact --> Tutor
  Durable --> Audit["Trace, Cost, Safety, Audit"]
  Hot --> Audit
~~~

The plain-English version: the tutor teaches now, helpers work in the background, and the learner brain only changes when evidence passes through a verified contract.

## Next Implementation Moves

1. Define MemoryEvent, EvidenceEvent, LearnerMemory, ToolJob, ArtifactRecord, CitationState, and MasteryDelta as runtime schemas.
2. Add a durable worker queue with idempotency keys, stale-result handling, dead-letter review, and trace IDs.
3. Split local Dexie storage into cache tables and synced durable-state mirrors.
4. Add source-grounding evals for book spans, web citations, vector retrieval, and tool outputs.
5. Add security tests for prompt injection, excessive agency, cross-tenant vectors, S3 prefixes, queue messages, and logs.
6. Add delayed retest, misconception lifecycle, transfer evidence, and calibration facets before increasing durable mastery.
7. Extend memory correction/deletion propagation from local overlays into replayable summary, embedding, graph-edge, mastery, tutor-preference, and export rebuild paths.
8. Log recommendation propensities and alternatives before bandit or recommender experiments affect curriculum.
9. Keep LoRA/QLoRA/PEFT in a research lane until LearningAI has a clean dataset, stable evals, and a rollback plan.

Final judgment: the architecture is viable, but the durable learner brain must remain boring in the best way: typed, scoped, evidence-based, observable, and reversible.`,
  },
  {
    title: "Chapter 17: Glossary And Sources",
    content: `# Glossary And Sources

## Glossary

### Runtime Terms

- **Foreground Interaction Tutor**: the fast visible tutor that listens, speaks, teaches, pauses, interrupts, and shows artifacts.
- **Background Worker Layer**: slower worker layer for retrieval, tools, evaluation, memory updates, and generated study material.
- **Context Package**: the tutor's situational awareness packet: learner state, source context, interaction timing, active goal, tool jobs, and teaching phase.
- **Interaction Runtime Contract**: the event, job, artifact, and mastery rules that let the foreground tutor and background worker layer cooperate safely.
- **Hot Lane**: fast background support for the live lesson.
- **Durable Lane**: reliable queued work for memory, KT, source ingestion, artifact persistence, and audits.
- **Artifact Policy**: the rule for whether a tool result appears now, waits, summarizes quietly, asks permission, or gets discarded as stale.
- **Citation State**: whether a source-backed claim is verified, still checking, unavailable, or conflicting.
- **Audit Trace**: the recorded path from learner action to tool job, source, evidence row, and possible mastery delta.

### Memory, Evidence, And Safety

- **MemoryEvent**: raw timestamped learner event before summarization, scoring, or projection.
- **LearnerMemory**: source-linked derived memory with confidence, validity window, review state, and correction/deletion path.
- **Evidence Facet**: a learner-signal dimension such as recall, explanation, procedure, transfer, confidence, calibration, latency, or hint use.
- **Projection Consistency**: the rule that derived vectors, graph edges, summaries, artifacts, and caches can be replayed or invalidated from source event IDs.
- **Tenant Boundary**: the rule that one learner's rows, vectors, graph nodes, S3 objects, jobs, and logs must never cross into another learner's context.

### Knowledge-Tracing Terms

- **BKT**: Bayesian Knowledge Tracing, an interpretable mastery model.
- **DKT**: Deep Knowledge Tracing, a neural sequence model for predicting learner performance.
- **Logistic KT / LKT features**: explainable features such as attempt count, latency, spacing, hints, difficulty, and confidence.
- **Language-model LKT**: language-model-based knowledge tracing that uses question and concept text to improve cold start.
- **LLM-KT**: LLM plus traditional KT alignment.
- **RAG-KT**: retrieval-grounded KT for explainable, cross-source prediction.
- **Episodic Memory**: what happened in learning sessions.
- **Semantic Memory**: stable concepts, summaries, misconceptions, and preferences.
- **Mastery Ledger**: auditable record of why a learner's score changed.

## Implementation Sources

Source list assembled and locally reviewed on June 1, 2026. OpenAI API and AWS service docs can change, so this appendix should be refreshed before major release decisions. Source type: official documentation unless marked otherwise.

- [Thinking Machines interaction models](https://thinkingmachines.ai/blog/interaction-models/) - conceptual architecture essay
- [OpenAI supervised fine-tuning](https://developers.openai.com/api/docs/guides/supervised-fine-tuning)
- [OpenAI fine-tuning best practices](https://developers.openai.com/api/docs/guides/fine-tuning-best-practices)
- [OpenAI retrieval](https://developers.openai.com/api/docs/guides/retrieval)
- [OpenAI file search](https://developers.openai.com/api/docs/guides/tools-file-search)
- [OpenAI conversation state](https://developers.openai.com/api/docs/guides/conversation-state)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI evals](https://developers.openai.com/api/docs/guides/evals)
- [OpenAI tools](https://developers.openai.com/api/docs/guides/tools)
- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI background mode](https://developers.openai.com/api/docs/guides/background)
- [OpenAI Realtime](https://developers.openai.com/api/docs/guides/realtime)
- [OpenAI Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [OpenAI Realtime with tools](https://developers.openai.com/api/docs/guides/realtime-mcp)
- [OpenAI voice agents](https://developers.openai.com/api/docs/guides/voice-agents)
- [OpenAI voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad)
- [LoRA: Low-Rank Adaptation](https://arxiv.org/abs/2106.09685) - research paper
- [QLoRA](https://arxiv.org/abs/2305.14314) - research paper
- [Hugging Face PEFT LoRA guide](https://huggingface.co/docs/peft/developer_guides/lora)

## Knowledge-Tracing Sources

Source type: research paper unless marked as an arXiv preprint.

- [Corbett and Anderson, Knowledge tracing](https://doi.org/10.1007/BF01099821)
- [Logistic Knowledge Tracing](https://arxiv.org/abs/2005.00869) - arXiv preprint
- [Piech et al., Deep Knowledge Tracing](https://arxiv.org/abs/1506.05908) - arXiv preprint
- [AKT](https://arxiv.org/abs/2007.12324) - arXiv preprint
- [LPKT](https://doi.org/10.1145/3447548.3467237)
- [Language Model-based Knowledge Tracing](https://arxiv.org/abs/2406.02893) - arXiv preprint
- [Roediger and Karpicke, test-enhanced learning](https://doi.org/10.1111/j.1467-9280.2006.01693.x)
- [Cepeda et al., distributed practice meta-analysis](https://doi.org/10.1037/0033-2909.132.3.354)
- [Dunlosky et al., effective learning techniques](https://doi.org/10.1177/1529100612453266)
- [Sweller, cognitive load during problem solving](https://doi.org/10.1016/0364-0213(88)90023-7)
- [Posner et al., conceptual change](https://doi.org/10.1002/sce.3730660207)

## Research Watchlist

These are research or industry patterns to evaluate, not production proof.

- [LLM-KT](https://arxiv.org/abs/2502.02945) - arXiv preprint
- [CIKT](https://arxiv.org/abs/2505.17705) - arXiv preprint
- [L-HAKT](https://arxiv.org/abs/2602.22879) - arXiv preprint
- [RAG-KT](https://arxiv.org/abs/2604.10960) - arXiv preprint
- [MemGPT](https://arxiv.org/abs/2310.08560) - arXiv preprint
- [Generative Agents](https://arxiv.org/abs/2304.03442) - arXiv preprint
- [LongMemEval](https://arxiv.org/abs/2410.10813) - arXiv preprint
- [Zep temporal graph memory](https://arxiv.org/abs/2501.13956) - arXiv preprint
- [Microsoft GraphRAG](https://www.microsoft.com/en-us/research/project/graphrag/) - industry pattern
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) - vendor documentation
- [LlamaIndex multi-tenancy RAG](https://developers.llamaindex.ai/python/examples/multi_tenancy/multi_tenancy_rag/) - vendor example

## Cloud And Safety Sources

- [Amazon Neptune](https://docs.aws.amazon.com/neptune/latest/userguide/graph-get-started.html)
- [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Aurora PostgreSQL with pgvector](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html)
- [S3 object keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html)
- [S3 lifecycle rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html)
- [ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html)
- [Amazon ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html)
- [EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html)
- [Amazon SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [Amazon CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)
- [AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html)
- [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgvector documentation](https://github.com/pgvector/pgvector)
- [Dexie.js documentation](https://dexie.org/docs/Dexie/Dexie)
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications)
- [OWASP AI Security and Privacy Guide](https://owasp.org/www-project-ai-security-and-privacy-guide/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [OpenTelemetry documentation](https://opentelemetry.io/docs/)`,
  },
];

export default userBrainArchitectureBook;
