# C13 Chapter 13 Result

## Clarity Score
Before: 7.5/10
After: 9/10

## Audience Notes
This chapter is for engineers and technical product readers who need the
ownership model to be unmistakable. The rewrite makes the authority/projection
distinction explicit: Postgres is the system of record that all derived stores
must reconcile back to.

## Proposed Replacement Markdown
```markdown
# Cloud Data Model

A production learner brain needs one durable source of truth and several fast derived views.

## Source of truth

Aurora Postgres owns the canonical learner record. It stores tenants, users, books, source spans, sessions, learning events, memory events, knowledge state, mastery audits, job state, outbox events, artifact manifests, consent events, and retention events.

That means Postgres decides what is true after retries, replays, late workers, partial failures, or duplicate job delivery. If pgvector, Neptune, S3, Dexie, Redis, or a generated summary disagrees with Postgres, the projection is stale or wrong; Postgres is not overwritten by the projection.

Core Postgres tables:

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

## Projection stores

Derived stores make the product fast and expressive, but they do not own learner truth.

pgvector stores retrieval indexes:

- memory embedding;
- source span embedding;
- concept summary embedding;
- learner profile summary embedding;
- metadata: tenant_id, user_id, book_id, concept_id, source_id, timestamp.

Neptune stores the navigable concept graph:

- Concept nodes;
- Book nodes;
- Misconception nodes;
- Skill nodes;
- edges such as prerequisite_of, explained_by, confused_with, appears_in, supports, blocks.

S3 stores source files, extracted spans, and generated artifacts:

- tenants/{tenant_id}/users/{user_id}/books/{book_id}/source/
- tenants/{tenant_id}/users/{user_id}/books/{book_id}/spans/
- tenants/{tenant_id}/users/{user_id}/sessions/{session_id}/artifacts/

Dexie keeps local reading and revision responsive in the browser. ElastiCache keeps hot state fast. EventBridge and SQS move work to background workers. All of these systems should be rebuildable or reconcilable from Postgres events and artifact manifests.

## Consistency rule

Every vector row, graph edge, S3 artifact, Dexie cache row, Redis value, and generated summary should carry enough provenance to trace back to Postgres source event IDs, source span IDs, artifact manifest IDs, and tenant/user scope.

Projection writers should be idempotent. Duplicate jobs, stale retries, redrives, and partial failures must not create duplicate learner truth. They may create duplicate work attempts, but only Postgres determines the accepted state.

Vector caveat: pgvector is retrieval infrastructure, not truth. Approximate indexes and embedding similarity can miss relevant material or retrieve plausible but wrong neighbors, so source grounding needs precision/recall evals, tenant filters, and citation verification.

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

_Figure 6: Postgres owns durable learner truth; Dexie, pgvector, Neptune, S3, ElastiCache, and worker outputs are projections or artifacts that must reconcile back to Postgres provenance._
```

## Caveats To Preserve
Keep the pgvector warning: retrieval is approximate and must not be treated as
truth. Keep tenant/user/book metadata and source citation verification. Keep S3
lifecycle as a future storage policy, not a core truth mechanism. Preserve the
diagram, but update the caption so Postgres authority is explicit.

## Plain-English Sentence
Postgres is the official record, and every faster or richer view of the learner
brain has to prove where it came from in Postgres.
