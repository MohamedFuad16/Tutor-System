# A3 Result: Brain Data Layer

Sources cited by agent:
- Neptune property graph data model:
  https://docs.aws.amazon.com/neptune/latest/userguide/feature-overview-data-model.html
- Neptune openCypher best practices:
  https://docs.aws.amazon.com/neptune/latest/userguide/best-practices-content-2.html
- PostgreSQL row security:
  https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- pgvector HNSW:
  https://github.com/pgvector/pgvector/blob/master/README.md
- S3 object keys and lifecycle:
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- EventBridge Scheduler to Lambda:
  https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html

## Accepted Points
- Hard invariant: every graph vertex/edge, SQL row, S3 key/tag, Lambda job, and
  audit event is scoped to exactly one `user_id`.
- Neptune vertices: `Subject`, `Topic`, `Concept`; custom IDs include
  `user_id`.
- Neptune edges: `SUBTOPIC_OF`, `PREREQUISITE_OF`, `RELATED_TO`, `LEADS_TO`,
  `CO_OCCURS_WITH`, each with `user_id`.
- Final query designs must anchor on `user_id` and include:
  concept neighborhood, prerequisite gaps, next best learning step,
  book-local concept map, co-occurrence expansion.
- PostgreSQL tables: `books`, `artifacts`, `artifact_spans`,
  `semantic_memory`, `episodic_memory`, `learning_profiles`,
  `knowledge_state`.
- Enable RLS on every tenant table and use `current_setting('app.user_id')`.
- pgvector HNSW indexes use `vector_cosine_ops`, with scalar indexes for
  tenant/book filters.
- S3 convention:
  `users/{user_id}/books/{book_id}/...`; object tags include `user_id`,
  `book_id`, `artifact_kind`, and `retention_class`.
- Context Builder should reserve fixed space for system/policy, user question,
  answer, and tool/citation overhead, then pack source spans, user question,
  prerequisite gaps/mastery, semantic memory, episodic memory, profile, and
  lower-confidence graph expansions.
- Memory consolidation Lambda operates on one `{user_id, book_id?, session?}`
  unit per invocation, updates semantic memory, knowledge state, Neptune, and
  revision artifacts idempotently.

## Integration Notes
- The final DDL should add event types needed by Agent 2:
  `typing_pause`, `confusion`, `struggle`, `breakthrough`,
  `hint_requested`, `quiz_attempt`, `session_end`, and `pdf_selection`.
- Merge Agent 1's mastery model fields into `knowledge_state`.
- Keep artifact/book schemas as first-class outputs, not side fields on chat.
