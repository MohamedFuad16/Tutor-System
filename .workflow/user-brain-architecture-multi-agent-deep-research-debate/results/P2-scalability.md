# P2 Scalability Result

## Summary
The architecture is directionally strong if it becomes operationally boring:
Postgres ledger first, async workers second, graph/vector/artifact stores as
projections, and no durable learner-state update without evidence, tenant scope,
idempotency, and traceability.

## Strengths
- Dexie as local cache and AWS as durable brain is the correct split.
- Foreground tutor plus background workers matches the app-native version of the
  Thinking Machines pattern.
- Typed event/job contracts, tenant/user/session/job IDs, idempotency keys,
  trace IDs, BKT/logistic KT, and rejection of LoRA as learner memory are strong
  existing choices.

## Scale Gaps
- SQS is at-least-once, so every worker write must be idempotent and
  stale-result-aware.
- EventBridge/SQS need DLQs, redrive policy, retry budgets, max event age, and
  stuck-job scanners.
- pgvector must not rely on metadata filters alone for tenant isolation; enforce
  tenant scope in SQL/RLS first.
- S3 concurrent writes to the same key are last-writer-wins; use immutable
  artifact keys plus Postgres manifests.
- ECS/Fargate autoscaling should consider queue depth, oldest message age, p95
  job latency, and tool-cost backlog, not just CPU/memory.
- Neptune should be derived from the mastery/event ledger at first to avoid
  dual-write truth.
- Observability needs spans for retrieval, rerank, tool call, citation check,
  model call, mastery write, cost, and worker lifecycle.

## Recommended Refinements
- Make Aurora Postgres the authority for learning_events, mastery_audit,
  tool_jobs, artifact_manifest, and outbox_events.
- Keep pgvector, Neptune, and S3 as specialized projections/artifact stores.
- Split background lanes:
  - Hot lane: short TTL, cancellable, no durable learner-state writes.
  - Durable lane: SQS-backed, idempotent, retryable, DLQ-visible, writes only
    through typed contracts.
- Benchmark pgvector cold-cache and tenant-filtered retrieval.
- Keep BKT/logistic KT in beta; use advanced KT only as offline-eval challengers.

## Operational Launch Gates
- Cross-tenant negative tests for rows, vectors, graph IDs, S3 prefixes, queues,
  logs, and citations.
- Queue chaos tests for duplicates, timeout, retry, DLQ, redrive, stale jobs, and
  cancelled turns.
- Retrieval tests for precision/recall, citation survival, tenant prefilter, and
  cold-cache latency.
- Worker budgets for tool calls, timeouts, token/audio cost, concurrency, and
  approval tier.
- S3 artifact tests for immutable keys, versioning, lifecycle, delete/export.
- Trace ID from user turn to tool job to artifact to mastery delta.
- KT calibration before mastery scores affect recommendations.

## Rejected Claims
- AWS services scale automatically.
- RLS alone is enough.
- pgvector solves grounding.
- Neptune is required for beta.
- Background agents can run freely if prompted well.

## Sources
- Thinking Machines interaction models: https://thinkingmachines.ai/blog/interaction-models/
- OpenAI tools: https://developers.openai.com/api/docs/guides/tools
- OpenAI Realtime: https://developers.openai.com/api/docs/guides/realtime
- OpenAI deep research best practices: https://developers.openai.com/api/docs/guides/deep-research#best-practices
- Aurora pgvector docs: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html
- pgvector: https://github.com/pgvector/pgvector
- AWS multi-tenant vector search: https://aws.amazon.com/blogs/database/self-managed-multi-tenant-vector-search-with-amazon-aurora-postgresql/
- PostgreSQL row security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Ring billion-scale pgvector: https://aws.amazon.com/blogs/database/rings-billion-scale-semantic-video-search-with-amazon-rds-for-postgresql-and-pgvector/
- SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- SQS DLQ: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- EventBridge DLQ: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html
- ECS service autoscaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html
- OpenTelemetry: https://opentelemetry.io/docs/what-is-opentelemetry/
- Amazon Neptune: https://docs.aws.amazon.com/neptune/
- Amazon S3 consistency: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
- LangGraph persistence: https://docs.langchain.com/oss/python/langgraph/persistence
- Flowise queue mode: https://docs.flowiseai.com/configuration/running-flowise-using-queue
- LlamaIndex multi-tenancy: https://developers.llamaindex.ai/python/examples/multi_tenancy/multi_tenancy_rag/
- RAGFlow: https://github.com/infiniflow/ragflow
- Haystack tracing: https://docs.haystack.deepset.ai/docs/tracing

## Debate Position
Support the strategy only if Postgres remains the ledger, async workers are
bounded, and graph/vector stores are projections rather than competing truth.
