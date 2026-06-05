# Adaptive Learning Brain Architecture Specification

Date: 2026-05-31
Repo: `/Users/mfuad16/Documents/LearningAI`

## 1. Executive Summary

LearningAI should evolve into an AI tutor that gets smarter about each student
the more they use it. The core product moat is the Learning Engine: a
transparent, persistent, per-user cognitive model that estimates mastery for
each concept from six behavioral signals:

1. Quiz correctness
2. Open-response quality
3. Time taken
4. Problem-solving process
5. Hint usage
6. Revision frequency

The recommended v1 architecture is an interpretable hybrid. Use BKT-style
per-concept mastery as the source of truth, because it is explainable, cheap,
and already aligned with the current repo's `src/memory/bkt.engine.ts` and
`src/memory/longterm.memory.ts`. Use LLMs to grade free-text quality, identify
misconceptions, extract concepts, and support cold-start diagnostics. Defer
DKT/transformer KT until LearningAI has enough clean event history to train and
validate sequence models.

The interaction model should be dual-layer:

- Interaction Layer: always-present real-time layer for typing, pauses, voice
  partials, PDF selections, interruptions, backchannels, and response format
  selection.
- Background Layer: async deep layer for source-grounded reasoning, retrieval,
  misconception diagnosis, Brain updates, book generation, and spaced recall.

All Brain updates must be non-blocking. User-facing responses stream first;
mastery, memory, graph, and book updates happen via SQS/EventBridge workers.

The production target is AWS-managed infrastructure: CloudFront/WAF/Cognito at
the edge, ECS Fargate for FastAPI/Brain Manager/WebSocket/long workers, Aurora
PostgreSQL plus pgvector as the system of record, Neptune Serverless for graph
traversal once product-critical, S3 for source and generated artifacts,
ElastiCache Redis/Valkey for hot state, and EventBridge/SQS/DLQs for async
pipelines.

Sources used include BKT/DKT/LLM-KT research, the Thinking Machines interaction
model, AWS service docs, PostgreSQL RLS docs, pgvector docs, and current repo
Graphify/source anchors. See "Source Notes" at the end.

## 2. Revised System Overview

```text
STUDENT
  |
  | WebSocket, text, voice, PDF selection, quiz events
  v
+------------------------------+
| Interaction Layer             |
| - state machine               |
| - pause/typing/voice handling |
| - fast backchannels           |
| - format selector             |
| - interruption control        |
+------------------------------+
  | delegates frozen context package when work exceeds real-time budget
  v
+------------------------------+       streams patches/results back
| Background Layer              | ------------------------------------+
| - source-grounded answers     |                                     |
| - misconception diagnosis     |                                     |
| - concept extraction          |                                     |
| - quiz/book/revision jobs     |                                     |
+------------------------------+                                     |
  | shared versioned context                                          |
  v                                                                   |
+------------------------------+                                      |
| Brain Manager                 | <------------------------------------+
| - tenant guardrails           |
| - context builder             |
| - learning engine             |
| - async event publisher       |
+------------------------------+
  |                         |                         |
  v                         v                         v
Knowledge Graph        Memory House              Learning Profile
Neptune                Aurora + pgvector         Aurora
per-user concepts      semantic + episodic       preferences, pacing,
and relationships      memory, books, spans      calibration, ZPD
  |
  | SQS/EventBridge, non-blocking after response_complete
  v
+------------------------------+
| Brain Updater Pipeline        |
| - update mastery              |
| - write episodic memory       |
| - upsert graph nodes/edges    |
| - schedule recall             |
| - generate/update books       |
+------------------------------+
```

### Current Local Anchors

Graphify-first navigation identified these current Brain-related files:

- `src/memory/longterm.memory.ts`: Dexie tables for concepts, sessions,
  interactions, flashcards, learning books, book concepts, and learning entries.
- `src/memory/bkt.engine.ts`: lightweight BKT posterior update and recognition/
  generation/transfer caps.
- `src/memory/learner.model.ts`: learner snapshot, ZPD, misconceptions,
  scaffolding, prerequisite gaps, cognitive load, and weak concepts.
- `src/memory/revision.memory.ts`: simplified SM-2 revision scheduling.
- `src/memory/memory.orchestrator.ts`: learning book/memory orchestration.
- `src/components/ChatPanel.tsx`, `src/components/PdfViewer.tsx`,
  `src/views/RevisionView.tsx`: user-facing product boundaries.

The target production architecture should preserve those product boundaries,
while replacing local-only Dexie persistence with server-owned, tenant-isolated
durable storage.

## 3. Data Architecture

### Tenant Isolation Invariant

Every persisted object has `user_id`. Every graph vertex, graph edge, SQL row,
S3 object key/tag, Lambda/SQS job, and audit event is scoped to one user. Every
read/write path starts with tenant context:

```text
auth user -> set app.user_id -> query user_id first -> emit tenant-scoped event
```

### Neptune Property Graph

Vertex labels:

```text
(:Subject {
  id: "user:{user_id}:subject:{subject_id}",
  user_id, subject_id, name, canonical_name, description,
  book_ids, artifact_ids, created_at, updated_at
})

(:Topic {
  id: "user:{user_id}:topic:{topic_id}",
  user_id, topic_id, subject_id, name, canonical_name, description,
  mastery_aggregate, book_ids, artifact_ids, created_at, updated_at
})

(:Concept {
  id: "user:{user_id}:concept:{concept_id}",
  user_id, concept_id, name, canonical_name, description, domain,
  difficulty, mastery_score, confidence, retention,
  p_learn, p_transit, p_slip, p_guess,
  attempts, correct_attempts,
  first_seen_at, last_reviewed_at, next_review_at, updated_at,
  book_ids, artifact_ids, source_span_ids
})
```

Edge labels:

```text
(child)-[:SUBTOPIC_OF {
  user_id, book_id, confidence, evidence_span_ids, created_at, updated_at
}]->(parent)

(prereq)-[:PREREQUISITE_OF {
  user_id, weight, confidence, evidence_span_ids
}]->(dependent)

(a)-[:RELATED_TO {
  user_id, weight, reason, evidence_span_ids
}]->(b)

(a)-[:LEADS_TO {
  user_id, pedagogical_reason, priority, evidence_span_ids
}]->(b)

(a)-[:CO_OCCURS_WITH {
  user_id, book_id, count, pmi, evidence_span_ids, last_seen_at
}]->(b)
```

`PREREQUISITE_OF` and `LEADS_TO` are directional. `RELATED_TO` and
`CO_OCCURS_WITH` may be stored bidirectionally or queried both ways.

### Neptune Query Designs

All graph access must use parameterized queries and enforce `user_id` first.

```cypher
-- Q1: Concept neighborhood for context enrichment
MATCH (c:Concept {user_id: $user_id, concept_id: $concept_id})
OPTIONAL MATCH (c)-[r:RELATED_TO|CO_OCCURS_WITH|SUBTOPIC_OF]-(n)
WHERE n.user_id = $user_id AND r.user_id = $user_id
RETURN c, r, n
ORDER BY coalesce(r.weight, r.count, r.confidence, 0) DESC
LIMIT $limit
```

```cypher
-- Q2: Prerequisite gaps for target concept
MATCH p=(pre:Concept)-[:PREREQUISITE_OF*1..3]->
  (target:Concept {user_id: $user_id, concept_id: $concept_id})
WHERE all(n IN nodes(p) WHERE n.user_id = $user_id)
  AND pre.mastery_score < $mastery_threshold
RETURN pre, length(p) AS distance
ORDER BY pre.mastery_score ASC, distance ASC
LIMIT $limit
```

```cypher
-- Q3: Next best learning step
MATCH (c:Concept {user_id: $user_id, concept_id: $concept_id})
  -[r:LEADS_TO]->(next:Concept)
WHERE r.user_id = $user_id
  AND next.user_id = $user_id
  AND next.mastery_score < $known_threshold
RETURN next, r
ORDER BY r.priority DESC, next.mastery_score ASC
LIMIT 5
```

```cypher
-- Q4: Book-local concept map
MATCH (s:Subject {user_id: $user_id})<-[:SUBTOPIC_OF*0..3]-(n)
WHERE $book_id IN n.book_ids
  AND n.user_id = $user_id
RETURN s, collect(n) AS nodes
LIMIT $limit
```

```cypher
-- Q5: Concepts due for spaced repetition
MATCH (c:Concept {user_id: $user_id})
WHERE c.next_review_at <= $now
RETURN c
ORDER BY c.next_review_at ASC
LIMIT 5
```

### PostgreSQL DDL

Use Aurora PostgreSQL for system of record, metadata, audit, jobs, and pgvector.
Enable RLS on all tenant tables.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE books (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text,
  source_type text NOT NULL CHECK (
    source_type IN ('pdf','paper','textbook','chat','voice','import')
  ),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft','generating','active','archived','deleted')
  ),
  s3_prefix text NOT NULL,
  version int NOT NULL DEFAULT 1,
  chapter_count int NOT NULL DEFAULT 0,
  word_count int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE artifacts (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  kind text NOT NULL CHECK (
    kind IN ('source','page_image','ocr_text','note','revision','book_json','export')
  ),
  s3_key text NOT NULL,
  mime_type text,
  sha256 text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, book_id) REFERENCES books(user_id, id) ON DELETE CASCADE
);

CREATE TABLE artifact_spans (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  artifact_id uuid NOT NULL,
  page_start int,
  page_end int,
  char_start int,
  char_end int,
  text text,
  s3_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, book_id) REFERENCES books(user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, artifact_id) REFERENCES artifacts(user_id, id) ON DELETE CASCADE
);

CREATE TABLE learning_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_style text CHECK (
    preferred_style IN ('visual','text','examples','socratic','code_first')
  ),
  preferred_pacing text CHECK (preferred_pacing IN ('fast','medium','slow')),
  strongest_domains text[] NOT NULL DEFAULT '{}',
  weakest_domains text[] NOT NULL DEFAULT '{}',
  avg_session_min numeric(8,2),
  hint_rate numeric(6,4) NOT NULL DEFAULT 0,
  revision_consistency numeric(6,4) NOT NULL DEFAULT 0,
  learning_velocity numeric(8,4) NOT NULL DEFAULT 0,
  struggle_concepts text[] NOT NULL DEFAULT '{}',
  calibration jsonb NOT NULL DEFAULT '{}',
  zpd jsonb NOT NULL DEFAULT '{}',
  total_sessions int NOT NULL DEFAULT 0,
  last_active timestamptz,
  profile_version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE semantic_memory (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  book_id uuid,
  artifact_id uuid,
  span_id uuid,
  memory_type text NOT NULL CHECK (
    memory_type IN ('concept','summary','misconception','preference','note','skill')
  ),
  content text NOT NULL,
  summary text,
  concept_tags text[] NOT NULL DEFAULT '{}',
  embedding vector(1536) NOT NULL,
  graph_node_id text,
  graph_edge_id text,
  source_type text CHECK (source_type IN ('chat','quiz','pdf','voice','revision','book')),
  confidence numeric(5,4) NOT NULL DEFAULT 0.5,
  importance numeric(5,4) NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, book_id) REFERENCES books(user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, artifact_id) REFERENCES artifacts(user_id, id) ON DELETE SET NULL,
  FOREIGN KEY (user_id, span_id) REFERENCES artifact_spans(user_id, id) ON DELETE SET NULL
);

CREATE TABLE episodic_memory (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  book_id uuid,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'session_start','session_end','chat_turn','voice_input','pdf_selection',
      'typing_pause','quiz_attempt','hint_requested','confusion','struggle',
      'breakthrough','annotation','revision','tool_call'
    )
  ),
  user_input text,
  assistant_output text,
  concept_ids text[] NOT NULL DEFAULT '{}',
  graph_node_ids text[] NOT NULL DEFAULT '{}',
  score numeric(5,4),
  duration_s int,
  cognitive_load jsonb NOT NULL DEFAULT '{}',
  embedding vector(1536),
  consolidated_at timestamptz,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id, book_id) REFERENCES books(user_id, id) ON DELETE SET NULL
);

CREATE TABLE knowledge_state (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graph_node_id text NOT NULL,
  book_id uuid,
  concept_id text NOT NULL,
  mastery_score numeric(5,4) NOT NULL DEFAULT 0.2000,
  retention_score numeric(5,4) NOT NULL DEFAULT 0.2000,
  half_life_days numeric(8,3) NOT NULL DEFAULT 3.000,
  p_learn numeric(5,4) NOT NULL DEFAULT 0.2000,
  p_transit numeric(5,4) NOT NULL DEFAULT 0.1000,
  p_slip numeric(5,4) NOT NULL DEFAULT 0.1000,
  p_guess numeric(5,4) NOT NULL DEFAULT 0.2000,
  attempts int NOT NULL DEFAULT 0,
  correct_attempts int NOT NULL DEFAULT 0,
  avg_response_quality numeric(5,4),
  problem_solving_ema numeric(5,4),
  hint_penalty_ema numeric(5,4),
  revision_frequency_30d numeric(6,3) NOT NULL DEFAULT 0,
  kt_model_state jsonb NOT NULL DEFAULT '{}',
  evidence_memory_ids uuid[] NOT NULL DEFAULT '{}',
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  model_version text NOT NULL DEFAULT 'hybrid-bkt-v1',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, graph_node_id),
  FOREIGN KEY (user_id, book_id) REFERENCES books(user_id, id) ON DELETE SET NULL
);

CREATE TABLE knowledge_events (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  graph_node_id text NOT NULL,
  session_id text,
  event_type text NOT NULL,
  correct boolean,
  response_quality numeric(5,4),
  problem_solving_score numeric(5,4),
  time_taken_ms int,
  regular_hints int NOT NULL DEFAULT 0,
  scaffold_hints int NOT NULL DEFAULT 0,
  bottom_out_hints int NOT NULL DEFAULT 0,
  revision_kind text,
  source_ref jsonb NOT NULL DEFAULT '{}',
  raw_payload jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE brain_jobs (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_type text NOT NULL CHECK (
    job_type IN (
      'brain_update','context_enrichment','book_generation',
      'spaced_repetition','memory_consolidation'
    )
  ),
  status text NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued','running','succeeded','failed','dead_lettered')
  ),
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (user_id, id),
  UNIQUE (user_id, idempotency_key)
);
```

RLS shape:

```sql
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_books ON books
  USING (user_id = current_setting('app.user_id')::uuid)
  WITH CHECK (user_id = current_setting('app.user_id')::uuid);
-- Repeat the same policy shape for each tenant table.
```

Indexes:

```sql
CREATE INDEX semantic_memory_user_book_idx
  ON semantic_memory (user_id, book_id, memory_type, updated_at DESC);

CREATE INDEX episodic_memory_user_book_idx
  ON episodic_memory (user_id, book_id, occurred_at DESC);

CREATE INDEX knowledge_events_lookup_idx
  ON knowledge_events (user_id, graph_node_id, occurred_at DESC);

CREATE INDEX brain_jobs_queue_idx
  ON brain_jobs (job_type, status, created_at);

CREATE INDEX semantic_memory_embedding_hnsw_idx
  ON semantic_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX episodic_memory_embedding_hnsw_idx
  ON episodic_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

At larger scale, partition vector-heavy memory tables by `user_id` hash and
create HNSW indexes per partition.

### S3 Conventions

Bucket: `tutor-brain-{env}-{account}`.

```text
users/{user_id}/books/{book_id}/source/{artifact_id}/original.pdf
users/{user_id}/books/{book_id}/pages/{page_no}.png
users/{user_id}/books/{book_id}/ocr/{artifact_id}.json
users/{user_id}/books/{book_id}/book/v{version}/book.json
users/{user_id}/books/{book_id}/revision/{revision_id}.md
users/{user_id}/tmp/{upload_id}/part-{n}
users/{user_id}/exports/{export_id}/...
```

Required object tags: `user_id`, `book_id`, `artifact_kind`,
`retention_class`. Use SSE-KMS. IAM bucket policies deny access outside
`users/{user_id}/...`.

Lifecycle:

- `tmp/`: abort incomplete multipart uploads after 7 days; expire after 14 days.
- `pages/` and `ocr/`: Standard-IA after 30 days; expire after 365 days only if
  regeneratable.
- `exports/`: expire after 30 days unless pinned.
- `source/`: Standard-IA after 90 days; Glacier after 365 days; no automatic
  expiration while the book exists.
- deleted users: erase through a dedicated erasure workflow after legal hold.

### Context Builder Algorithm

Token budget for a 128K model:

| Layer | Budget |
|---|---:|
| L0 system/tutor policy | 6,000 |
| L1 learning profile | 2,000 |
| L2 active graph neighborhood | 18,000 |
| L3 current session history | 18,000 |
| L4 recent episodic memory | 10,000 |
| L5 semantic memory | 22,000 |
| L6 source/book/page excerpts | 30,000 |
| L7 current user message | 4,000 |
| Tool/citation overhead | 6,000 |
| Reserved response budget | 12,000 |
| Total | 128,000 |

Pseudocode:

```text
build_context(user_id, active_book_id, question, page_span):
  assert user_id is present
  set postgres app.user_id = user_id

  profile = fetch learning_profiles where user_id
  book = fetch books where user_id and id = active_book_id

  page_context = fetch artifact_spans
    where user_id and book_id and optional page_span
    budget 30000

  semantic_hits = vector_search semantic_memory
    where user_id first and book_id in (active_book_id, null)
    order by embedding similarity
    budget 22000

  episodic_hits = fetch/vector_search episodic_memory
    where user_id first and book_id = active_book_id
    prefer recent plus similar
    budget 10000

  seed_concepts = extract from question + semantic_hits

  graph_context = Neptune queries
    anchored by user_id
    include prerequisites, related, leads_to, co_occurs_with
    budget 18000

  knowledge = fetch knowledge_state
    where user_id and graph_node_id in graph_context
    budget 6000

  pack in priority order:
    1. source spans with citation anchors
    2. current user question and selected book metadata
    3. prerequisite gaps and mastery
    4. semantic memories
    5. recent episodic memories
    6. learner profile preferences
    7. lower-confidence graph expansions

  while over budget:
    summarize oldest episodic memories
    drop lowest-score co-occurrence expansions
    reduce semantic hits to top K
    compress source spans but preserve citation anchors

  never truncate system policy or current user message
  return context_package with provenance IDs
```

### Memory Consolidation Pipeline

Trigger: EventBridge Scheduler every 15 minutes plus SQS session-end events.
One worker invocation handles one `{user_id, book_id?, session_id?}`.

Steps:

1. Set `app.user_id`.
2. Load unconsolidated `episodic_memory`.
3. Cluster by concepts, graph nodes, and embedding similarity.
4. Summarize stable facts into `semantic_memory`.
5. Update `knowledge_state`.
6. Upsert Neptune `Concept`/`Topic`/`Subject` nodes and edges with `user_id`.
7. Write revision/book artifacts to S3.
8. Mark episodes `consolidated_at`.
9. Emit an audit event with counts, model cost, graph mutations, and failures.
10. Retry idempotently; never delete source episodes before successful commit.

### Text ER Diagram

```text
users 1--1 learning_profiles
users 1--N books
books 1--N artifacts
artifacts 1--N artifact_spans
books 1--N semantic_memory
books 1--N episodic_memory
books 1--N knowledge_state
users 1--N knowledge_events
users 1--N brain_jobs
knowledge_state graph_node_id -> Neptune Concept.id
semantic_memory graph_node_id/graph_edge_id -> Neptune element ids
artifact_spans -> source citation anchors used by Context Builder
```

## 4. Learning Engine Specification

### Model Decision

Use hybrid BKT v1:

- BKT core: per-concept, transparent, cheap, and already present locally.
- Rich evidence layer: folds in quality, time, problem solving, hints, and
  revision.
- LLM role: semantic grader, concept extractor, misconception classifier, and
  cold-start profiler.
- Future DKT/transformer KT role: offline prediction/analytics once enough
  clean event history exists.

Rejected as v1 source of truth:

- Pure DKT: too data-hungry and less interpretable for cold start.
- Pure LLM-KT: expensive, latency-sensitive, harder to reproduce, and
  calibration can drift.

### Mastery Formula

For user `u`, concept `c`, event `e`:

```text
retention r = 2 ^ (-days_since_last_evidence / half_life_days)

spaced_revision S = clamp(active_recall_reviews_30d / target_reviews, 0, 1)

half_life_days =
  base_half_life * exp(beta_m * mastery_prev + beta_s * S)

m_prior = floor + (mastery_prev - floor) * r

time_z = (ln(time_taken_ms) - ln(item_median_ms)) / item_sigma

fluency =
  correct * clamp(1 - max(0, time_z) / 2, -0.5, 1)
  - rapid_guess_flag * 0.5

hint_units =
  regular_hints + 2 * bottom_out_hints + 0.5 * scaffold_hints

evidence =
  w_correct * (2 * correct - 1)
  + w_quality * (2 * response_quality - 1)
  + w_process * (2 * problem_solving_score - 1)
  + w_time * fluency
  - w_hint * ln(1 + hint_units)
  + w_revision * S

mastery_next =
  sigmoid(logit(m_prior) + learning_rate * evidence_confidence * evidence)
```

Suggested v1 weights, tuned later:

```text
w_correct = 0.35
w_quality = 0.20
w_process = 0.20
w_time = 0.10
w_hint = 0.10
w_revision = 0.05
learning_rate = 0.40
floor = 0.05
```

Evidence caps:

- Recognition-only success: `mastery_next <= 0.70`
- Generation success: `mastery_next <= 0.85`
- Transfer success: `mastery_next <= 0.95`
- Hint-heavy correct answer: cap at `0.55` unless later transfer succeeds.

### Update Frequency

- Synchronous path: write `knowledge_events` and stream answer.
- Async path: enqueue `brain_update` job.
- Worker path: compute mastery, update `knowledge_state`, upsert Neptune,
  write episodic/semantic memory, emit `mastery_update`.

### Cold-Start Diagnostic

Run an 8-part assessment after the first book upload or first subject choice:

1. Self-rate top concepts from the book, `0..4`.
2. One prerequisite check.
3. One recognition MCQ.
4. One short own-words definition.
5. One worked-example completion.
6. One error-diagnosis question.
7. One transfer question in a new context.
8. Confidence rating after each answer.

Initial prior:

```text
m0 = clamp(
  0.20
  + 0.10 * self_rating_norm
  + 0.15 * prerequisite_score
  + 0.15 * recognition_score
  + 0.20 * generation_quality
  + 0.25 * transfer_score
  - 0.10 * hint_penalty,
  0.05,
  0.80
)
```

Defaults:

```text
p_transit = 0.10
p_slip = 0.10
p_guess = 0.20
half_life_days = 3
```

If transfer is strong and well-explained, start half-life at 7 days. If answers
are correct but low-quality or hint-heavy, cap `m0 <= 0.55`.

## 5. Interaction Protocol Specification

### Student State Machine

| State | Entry Signals | Interaction Action | Background Action |
|---|---|---|---|
| `IDLE` | no activity over 5 min | suggest resume point | preload likely context |
| `TYPING` | text delta, cursor move, voice partial | observe silently | update intent estimate |
| `THINKING_PAUSE` | 1.5-5s pause mid-draft | optional tiny backchannel | none |
| `SUBMITTED` | message/answer sent | freeze turn | start answer/context jobs |
| `AWAITING` | response pending | stream progress, accept interrupt | retrieve, reason, generate |
| `CONFUSED` | "I don't get it", repeated edits, low confidence | simplify or ask clarifier | diagnose confusion |
| `STRUGGLING` | repeated wrong attempts/stalls | scaffold, reduce difficulty | update misconception evidence |
| `BREAKTHROUGH` | correct self-explanation after struggle | reinforce pattern | update mastery, schedule recall |

Transitions:

| From | To | Trigger |
|---|---|---|
| `IDLE` | `TYPING` | new input |
| `TYPING` | `THINKING_PAUSE` | pause over threshold |
| `THINKING_PAUSE` | `TYPING` | resumes writing |
| `THINKING_PAUSE` | `CONFUSED` | erase/rewrite loop or confusion phrase |
| any | `SUBMITTED` | submit event |
| `SUBMITTED` | `AWAITING` | context package sent |
| `AWAITING` | `TYPING` | student interrupts |
| `AWAITING` | `CONFUSED` | "too fast", "what?", low rating |
| `CONFUSED` | `STRUGGLING` | repeated failed attempts |
| `STRUGGLING` | `BREAKTHROUGH` | correct transfer/self-explanation |
| `BREAKTHROUGH` | `IDLE` | no activity after reinforcement |

### Proactive Interjection Rules

| ID | Priority | Trigger | Action | Example |
|---|---|---|---|---|
| P1 | High | student builds on factual error | interrupt gently | "Small correction before that compounds: ..." |
| P2 | Medium | stuck over 120s on same concept | offer hint | "Want the first step, not the answer?" |
| P3 | Medium | mastery under 0.30 for active concept | suggest prerequisite | "This rests on X; quick review first?" |
| P4 | Medium | imprecise term | clarify | "When you say X, do you mean Y or Z?" |
| P5 | Low | pause mid-sentence after technical term | backchannel | "Stay with that definition." |
| P6 | Low | PDF selection stable over 800ms | offer source explanation | "I can unpack this paragraph." |
| P7 | High | source context weak for factual answer | ask for source | "I need the relevant page to answer this safely." |
| P8 | Medium | repeated misconception pattern | switch format | "Let's do a worked example with that exact trap." |
| P9 | Medium | breakthrough after struggle | reinforce | "That was the move: you separated base case from recursive step." |
| P10 | Low | idle after breakthrough | schedule recall | "I'll bring this back later as a quick recall." |
| P11 | Medium | concept not reviewed over 7 days | spaced recall | "Before we continue, one quick check on X." |
| P12 | Low | student asks broad PDF question | format choice | "Do you want intuition, proof, code, or quiz?" |
| P13 | Medium | diagram would reduce cognitive load | change format | "This is easier as a flow. I'll map it." |
| P14 | High | student interrupts output | stop/rebase | "Got it. I'll switch to your new question." |

### Response Format Selector

```text
if intent is implement/code or active surface has code:
  CODE_EXAMPLE
else if student_state == STRUGGLING:
  WORKED_EXAMPLE
else if concept relationship/process is central:
  DIAGRAM_ASCII
else if student_state == BREAKTHROUGH or recall_due:
  QUIZ_QUESTION
else if intent is why and mastery >= 0.45:
  SOCRATIC_QUESTION
else if student_state == CONFUSED and prior worked example failed:
  ANALOGY
else if end_of_session or budget_tight:
  SUMMARY_CARD
else:
  TEXT_EXPLANATION
```

### WebSocket Event Schema

Envelope:

```ts
type TutorWsEvent<T> = {
  id: string;
  type: string;
  direction: "client_to_server" | "server_to_client";
  sessionId: string;
  userId: string;
  timestamp: string;
  seq: number;
  ack?: string;
  contextVersion?: string;
  payload: T;
};
```

Client to server:

```ts
type ClientEvent =
  | { type: "session.start"; payload: { deviceType: string } }
  | { type: "presence.open"; payload: { route: string; viewport: string } }
  | { type: "student.input.delta"; payload: { text: string; cursor: number; composing: boolean } }
  | { type: "student.pause"; payload: { durationMs: number; partialText: string } }
  | { type: "student.input.submit"; payload: { text: string; modality: "text" | "voice"; attachments?: string[] } }
  | { type: "student.interrupt"; payload: { reason: "typing" | "voice" | "stop" | "correction"; text?: string } }
  | { type: "voice.chunk"; payload: { audioB64: string; isFinal: boolean; chunkSeq: number } }
  | { type: "voice.partial"; payload: { transcript: string; isFinal: boolean; audioMs: number } }
  | { type: "pdf.selection"; payload: { docId: string; page: number; text: string; rects: unknown[] } }
  | { type: "pdf.viewport"; payload: { docId: string; page: number; zoom: number } }
  | { type: "quiz.answer"; payload: { quizId: string; answer: string; confidence?: number } }
  | { type: "session.end"; payload: { durationSeconds: number } }
  | { type: "flow.control"; payload: { maxInFlight: number; lastReceivedSeq: number } };
```

Server to client:

```ts
type ServerEvent =
  | { type: "state.changed"; payload: { state: StudentState; confidence: number; reason: string } }
  | { type: "tutor.backchannel"; payload: { text: string; priority: "low" | "medium" } }
  | { type: "tutor.response.start"; payload: { responseId: string; formatType: ResponseFormat } }
  | { type: "tutor.response.delta"; payload: { responseId: string; token: string; cumulativeText: string } }
  | { type: "tutor.response.patch"; payload: { responseId: string; replaceRange: [number, number]; text: string } }
  | { type: "tutor.response.done"; payload: { responseId: string; fullText: string; formatType: ResponseFormat; latencyMs: number; citations?: unknown[] } }
  | { type: "proactive.alert"; payload: { ruleId: string; trigger: string; message: string; formatType: ResponseFormat } }
  | { type: "brain.status"; payload: { updating: boolean; jobsPending: number } }
  | { type: "mastery.update"; payload: { concept: string; oldScore: number; newScore: number; delta: number } }
  | { type: "book.ready"; payload: { bookId: string; title: string; s3Key: string } }
  | { type: "background.job.started"; payload: { jobId: string; kind: string } }
  | { type: "background.job.delta"; payload: { jobId: string; summary: string; usableNow: boolean } }
  | { type: "background.job.done"; payload: { jobId: string; resultRef: string } }
  | { type: "error.recoverable"; payload: { code: string; message: string; retryAfterMs?: number } };
```

### Context Package

```ts
type ContextPackage = {
  version: string;
  sessionId: string;
  userId: string;
  tokenBudget: {
    max: 128000;
    reservedForResponse: number;
    reservedForBackground: number;
  };
  student: {
    state: StudentState;
    mastery: Record<string, number>;
    recentMisconceptions: string[];
    preferences: {
      explanationStyle: "direct" | "socratic" | "visual" | "code_first";
      pace: "slow" | "normal" | "fast";
    };
  };
  liveSurface: {
    route: "study" | "revision" | "brain" | "settings";
    component: "ChatPanel" | "PdfViewer" | "RevisionView" | "BrainView";
    pdf?: { docId: string; page: number; selection?: string };
    activeBookId?: string;
  };
  conversation: {
    recentTurns: unknown[];
    currentDraft?: string;
    interruptedResponseId?: string;
  };
  brainSnapshot: {
    masteryScores: Record<string, number>;
    recentEpisodicEvents: string[];
    activeConcepts: string[];
    knowledgeGraphNeighborhood: unknown[];
  };
  sources: {
    selectedSpans: unknown[];
    retrievedPassages: unknown[];
    citationPolicy: "required_for_claims";
  };
  jobs: {
    active: string[];
    completed: string[];
  };
  urgency: "blocking" | "background";
  requestType: "deep_explanation" | "quiz_gen" | "book_update" | "brain_update";
};
```

### Pedagogical Mapping

| Pattern | Component |
|---|---|
| Socratic method | ChatPanel/Interaction Layer format selector |
| Scaffolding | LearnerModel + Interaction Layer + Learning Engine |
| Spaced repetition | RevisionView + recall scheduler + `knowledge_state.next_review_at` |
| Interleaving | Context Builder selects weak related concepts |
| Metacognitive cues | quiz events include confidence ratings |
| Source-grounded explanation | PdfViewer selection + Background Layer retrieval |
| Misconception repair | misconception diagnosis job + semantic/episodic memory |
| Learning book synthesis | Book Generator + RevisionView |

## 6. AWS Infrastructure Map

```text
Users
  |
CloudFront + WAF + Cognito/OIDC
  |
S3 static React/MUI app  ---- presigned upload/download ---- S3 tenant prefixes
  |
Public ALB / API Gateway WebSocket edge
  |
Private app subnets, no public task IPs
  |
  +-- ECS Fargate FastAPI / Brain Manager / Interaction API
  |     |-- Aurora PostgreSQL: users, books, sessions, jobs, audit, pgvector
  |     |-- Neptune Serverless: learner concept graph
  |     |-- ElastiCache Redis/Valkey: sessions, rate limits, presence, locks
  |     |-- Bedrock Runtime via PrivateLink or approved external LLM egress
  |
  +-- EventBridge custom bus
        |
        +-- SQS brain-update-queue       -> ECS Brain Updater -> Aurora/Neptune
        +-- SQS context-enrichment-queue -> Lambda/ECS Context Builder -> Aurora/S3
        +-- SQS book-generation-queue    -> ECS Book Generator -> S3/Aurora
        +-- SQS spaced-repetition-queue  -> Lambda/ECS Scheduler -> Aurora/EventBridge
        +-- SQS consolidation-queue      -> scheduled ECS/Lambda -> Aurora/Neptune
        +-- per-target DLQs + replay worker
```

### Service Decisions

| Component | Decision | Reason |
|---|---|---|
| FastAPI Backend | ECS Fargate | steady API, streaming, connection pools |
| Brain Manager | ECS Fargate | orchestration, tenant guardrails, warm caches |
| Context Builder | Lambda for small jobs, Fargate for heavy docs | mixed latency/duration profile |
| Learning Engine | ECS Fargate worker | explainable policy plus model calls |
| Brain Updater | ECS Fargate worker | graph/vector updates, batching |
| Book Generator | ECS Fargate or Step Functions | long-running, can exceed Lambda comfort |
| WebSocket Handler | ECS Fargate or API Gateway WS edge | persistent sessions and backpressure |
| Memory Consolidation | scheduled Fargate; Lambda at small scale | batch work, idempotent |

### Data Store Decisions

| Store | Decision |
|---|---|
| Aurora PostgreSQL | primary system of record |
| pgvector | MVP vector memory colocated with relational metadata |
| Pinecone | defer until vector QPS/recall/private networking justify it |
| Neptune Serverless | target graph store when traversal is core product behavior |
| Redis/Valkey | cache only: context, rate limits, presence, locks |
| S3 | source PDFs, OCR, generated books, exports |

### VPC and Security

- Public layer: CloudFront, WAF, Cognito, ALB/API Gateway only.
- Private app subnets: ECS tasks/Lambda ENIs, no direct public IPs.
- Data subnets: Aurora, Neptune, Redis, no internet route.
- VPC endpoints: S3, ECR, CloudWatch Logs, X-Ray, Secrets Manager, KMS, SQS,
  EventBridge, STS, Bedrock runtime/control.
- Encryption: KMS/SSE-KMS for S3, Aurora, Neptune, Redis; TLS in transit.
- Secrets: Secrets Manager, rotated; no provider keys in task env literals.
- Isolation: Cognito JWT -> `user_id` -> app query interceptor -> PostgreSQL
  RLS -> S3 prefix policies -> Neptune user-first query guard.

### IAM Roles

| Role | Permissions |
|---|---|
| `ecsTaskExecutionRole` | ECR pull, CloudWatch logs, bootstrap secrets |
| `fastApiTaskRole` | tenant-scoped Aurora/S3, Bedrock invoke, EventBridge publish |
| `brainManagerRole` | Aurora jobs, Neptune read/write, Redis, SQS send |
| `contextBuilderRole` | S3 read, pgvector read/write, embedding model invoke |
| `learningEngineRole` | read learner state, write decisions/audit, model invoke |
| `brainUpdaterRole` | consume queue, mutate Aurora/Neptune/pgvector, emit events |
| `bookGeneratorRole` | read context, invoke model, write S3/Aurora books |
| `webSocketRole` | Redis presence, publish control events, no broad data writes |
| `memoryConsolidationRole` | scheduled session/memory compaction |
| `eventBridgeInvokeRole` | send only to declared SQS/Lambda/ECS targets |
| `dlqReplayRole` | read DLQs, replay with audit |

### Observability

CloudWatch namespace: `BrainSystem/`.

Metrics:

- `API/context_builder_tokens`
- `API/llm_latency_p50_p99`
- `Pipeline/brain_update_lag_seconds`
- `Pipeline/dlq_depth`
- `DB/neptune_query_latency_p99`
- `DB/aurora_connections`
- `Learning/mastery_score_delta`
- `WebSocket/connection_count`
- `Books/generation_duration_seconds`
- `Cost/model_tokens_by_tenant`

Alarms:

- DLQ depth over 10
- LLM/Bedrock error rate over 5 percent for 5 minutes
- Context Builder p99 over 2s
- Neptune p99 over 500ms
- Aurora CPU over 80 percent
- WebSocket disconnect spike
- book job timeout/failure spike

Tracing:

- OpenTelemetry/X-Ray trace IDs from frontend -> API -> EventBridge/SQS ->
  worker -> model/database/S3.
- Redact prompts and PDFs. Log content hashes, source IDs, and S3 keys.

### Cost Estimate

Assumptions: 2026-05-31 directional estimate, us-east-1 style pricing, 10
study sessions/user/month, 8 tutor turns/session, mixed routine/premium model
use, pgvector first, Neptune Serverless, no Pinecone, no NAT, Savings Plans at
scale.

| Monthly active users | Compute/API | Data/cache/queues | Observability/security | LLM/embedding | Estimated total |
|---:|---:|---:|---:|---:|---:|
| 1,000 | $500-$900 | $900-$1,800 | $250-$600 | $500-$900 | $2.2K-$4.2K |
| 10,000 | $2K-$4K | $3K-$7K | $800-$2K | $5K-$9K | $11K-$22K |
| 100,000 | $15K-$30K | $20K-$45K | $5K-$12K | $50K-$90K | $90K-$177K |

Main levers: model mix, prompt caching, generated-book cadence, Neptune vs
RDS-only graph, CloudWatch log volume, and Pinecone/private networking.

### Terraform Checklist

- `network`: VPC, subnets, routes, endpoints, security groups
- `edge`: CloudFront, WAF, ACM, ALB/API Gateway, Cognito
- `s3`: buckets, KMS, prefix policies, lifecycle
- `iam`: task roles, boundaries, endpoint policies
- `ecs`: cluster, services, workers, autoscaling
- `eventing`: EventBridge, SQS, DLQs, replay worker
- `data`: Aurora, pgvector migrations, Neptune, Redis
- `model`: Bedrock/private endpoints or approved external egress
- `observability`: logs, metrics, dashboards, alarms, traces
- `cost_controls`: budgets, anomaly detection, tenant usage
- `ci_cd`: build/push, migrations, blue/green deploys, rollback
- `tenant_bootstrap`: tenant prefixes, quotas, user rows

## 7. Implementation Roadmap

### Phase 1: MVP, Months 1-2

Goal: single-user end-to-end Brain with durable source-grounded tutoring.

Stack:

- FastAPI + React app
- Aurora PostgreSQL with pgvector
- S3 for PDFs/books
- BKT-style hybrid mastery formula
- Standard turn-based chat
- Async `brain_update` queue

Deliverables:

- Upload book/PDF.
- Ask source-grounded questions.
- Extract concepts.
- Persist `knowledge_state`.
- Generate simple revision cards/book updates.
- Show mastery dashboard with conservative labels.

Scope control:

- Neptune optional in Phase 1 if graph traversal can be represented in SQL.
- No full-duplex voice.
- No trained DKT.

### Phase 2: Beta, Months 3-5

Goal: multi-user isolation and Learning Engine v1.

Stack additions:

- Cognito/OIDC tenant auth
- PostgreSQL RLS
- SQS/EventBridge async jobs
- ElastiCache
- Neptune Serverless if graph traversal is needed
- WebSocket Interaction Layer

Deliverables:

- 50 beta users.
- Student state machine.
- Context package v1.
- Proactive rules v1.
- Mastery updates streamed back to client.
- Books as first-class user artifacts.

### Phase 3: Production, Months 6-9

Goal: 10K-user launch path with observability and cost controls.

Stack additions:

- Multi-AZ Aurora/Neptune/Redis
- ECS autoscaling
- DLQ replay/audit
- CloudWatch/X-Ray dashboards
- Model cost budgets
- Step Functions/Fargate book generation

Deliverables:

- 10K active-user readiness.
- Full proactive interjection.
- Spaced repetition scheduling.
- Learning insights digest.
- FERPA/GDPR review package.
- DKT/transformer KT feasibility benchmark from collected events.

## 8. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| KT cold-start accuracy is weak | High | Medium | conservative priors, diagnostic, confidence labels |
| Neptune query performance at 100K users | Medium | High | user-first IDs, indexes, query budgets, RDS fallback |
| LLM API/model cost at scale | High | High | token budgets, caching, model routing, cost alarms |
| Tenant data leakage | Medium | Critical | RLS, user-first graph queries, S3 prefix policies, tests |
| Voice latency over 500ms | Medium | Medium | partial transcripts, local buffering, defer deep work |
| Context window overflow | High | Medium | strict packer, compression order, citation anchors |
| DKT accuracy for small data | High | Medium | do not use as v1 source of truth |
| Book generation exceeds worker limits | Medium | Medium | Fargate/Step Functions, chunked generation |
| Notification fatigue | Medium | Medium | cadence caps, user controls, active-recall quality gates |
| Learning profile staleness | Medium | Medium | rolling EMAs, recency weights, drift detection |
| LLM grading calibration drift | Medium | High | rubric tests, sampled human review, model versioning |
| Graph schema evolution breaks old books | Medium | High | version graph nodes, migrations, compatibility tests |
| Cloud provider/model lock-in | Medium | Medium | provider adapter and model policy layer |
| Over-personalization hides challenge | Medium | Medium | ZPD bounds and transfer tests |

## 9. Open Questions

| Question | Options | Recommendation | Owner |
|---|---|---|---|
| Who owns KT training data? | user-owned, company aggregate, opt-in research | user-owned with explicit opt-in aggregation | Product/Legal |
| LLM provider strategy? | OpenAI, Bedrock, multi-provider, self-hosted | multi-provider adapter; Bedrock for private VPC when needed | Eng |
| Book generation cadence? | per session, daily batch, explicit request | session-end for small updates, daily for large books | Product |
| Show mastery scores? | numeric, bands, hidden | show bands plus evidence, hide false precision | Design |
| Voice processing path? | AWS Transcribe, Whisper worker, provider API | start managed, benchmark latency/cost | Eng |
| Graph schema evolution? | migrations, versioned graph, rebuild | versioned graph with migration jobs | Eng |
| Multi-language timeline? | MVP, beta, post-launch | post-beta unless user demand requires earlier | Product |
| FERPA/GDPR posture? | basic policy, full compliance program | begin compliance design before beta | Legal |
| WebSocket scale limit? | API Gateway WS, ECS WS, hybrid | ECS WS for session control, gateway edge where useful | Eng |
| Pricing model? | per-seat, usage-based, hybrid | per-seat plus fair-use caps for schools | Business |
| Can Neptune be deferred? | yes, no, hybrid | defer in MVP if SQL graph is enough; keep target schema | Eng |
| What counts as active recall? | any revisit, quiz only, transfer only | quiz/transfer weighted high, passive rereads low | Learning |
| How transparent should hints be? | hidden penalty, visible support | show "supported mastery" vs independent mastery | Design |

## Integration Decisions

Accepted:

- Hybrid BKT v1 as source of truth.
- LLMs as graders/extractors, not sole mastery store.
- Dual-layer interaction model with concrete WebSocket protocol.
- Aurora PostgreSQL + pgvector as MVP memory store.
- Books/artifacts as first-class, user-owned objects.
- EventBridge/SQS non-blocking Brain update pipeline.

Rejected:

- Pure LLM-KT as source of truth.
- Pure DKT as Phase 1 architecture.
- Lambda-only book generation.
- Raw content in EventBridge/SQS events.
- Any data store without explicit `user_id` isolation.

Conflicts resolved:

- Agent 3 used `learner_id` in one schema variant and `user_id` elsewhere;
  final spec uses `user_id` consistently.
- Agent 4 proposed Neptune Serverless as target; final roadmap allows Phase 1
  SQL graph fallback while preserving Neptune architecture.
- Agent 2 job names were product-level; final spec maps them to AWS queue/job
  names.

## Verification Evidence

- Dynamic workflow artifacts created under
  `.workflow/adaptive-learning-brain-architecture/`.
- Four research packets completed and were summarized in `results/`.
- Graphify-first repo navigation used before local source checks.
- Local source anchors checked: `longterm.memory.ts`, `bkt.engine.ts`,
  `learner.model.ts`, `revision.memory.ts`.
- No application source code was edited.
- `npm run lint` and `npm run build` were not run because this was an
  architecture/documentation workflow, not a code change.

## Source Notes

- Thinking Machines interaction model:
  https://thinkingmachines.ai/blog/interaction-models/
- MDN WebSocket API:
  https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- DKT paper:
  https://arxiv.org/abs/1506.05908
- LLM-KT:
  https://arxiv.org/abs/2502.02945
- CLST:
  https://arxiv.org/abs/2406.10296
- CIKT:
  https://arxiv.org/abs/2505.17705
- Adaptive forgetting curves:
  https://arxiv.org/abs/2004.11327
- AWS PrivateLink:
  https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- Amazon Bedrock VPC endpoints:
  https://docs.aws.amazon.com/bedrock/latest/userguide/vpc-interface-endpoints.html
- Amazon Neptune property graph:
  https://docs.aws.amazon.com/neptune/latest/userguide/feature-overview-data-model.html
- PostgreSQL row security:
  https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- pgvector:
  https://github.com/pgvector/pgvector/blob/master/README.md
- Amazon S3 object keys and lifecycle:
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- EventBridge DLQs:
  https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html
- ECS network security:
  https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-network.html
