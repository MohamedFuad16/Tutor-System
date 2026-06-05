# P3 AWS Cloud Brain Architecture

Agent: Hooke  
Agent ID: `019e7ec6-ed09-7bd1-8f33-9525f888487a`  
Status: completed

## Findings

Dexie is the right local beta cache, but production should move the durable learner brain to AWS.

Target split:

- Aurora PostgreSQL: users, books, sessions, learning events, mastery ledger, audit rows;
- pgvector: semantic memory and source-span embeddings;
- Neptune: concept graph, prerequisites, misconception links, related concepts;
- S3: PDFs, page images, OCR, source spans, generated books, charts, code artifacts, exports;
- ECS Fargate: default compute lane for API, interaction service, voice gateway, and workers;
- EC2: later for GPU, heavy media, local model hosting, or custom sandboxes;
- EventBridge/SQS: async events, queueing, retries, and dead-letter lanes;
- CloudWatch: logs, dashboards, queue depth, tool failures, latency, and cost signals.

## Accepted Into Book

- Added “Dexie becomes a local cache. AWS becomes the durable brain.”
- Added cloud service table and data-model chapter.
- Added tenant isolation rules covering rows, graph nodes/edges, vectors, S3 objects, queues, and logs.
- Added citations for Fargate, EC2, EventBridge, SQS, CloudWatch, KMS, Neptune, RDS/Postgres, Aurora pgvector, S3, and Postgres RLS.
