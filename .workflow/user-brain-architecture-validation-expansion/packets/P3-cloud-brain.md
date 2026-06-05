Packet ID: P3-cloud-brain

Objective:
Design the AWS-backed persistent learner brain that replaces browser-local Dexie over time.

Context:
The user wants EC2, Neptune, pgvector, S3, Postgres, and related AWS details included in the book.

Files / sources:
- `.workflow/adaptive-learning-brain-architecture/final-report.md`
- `src/memory/longterm.memory.ts`
- Official AWS docs for Neptune, S3, RDS/Postgres, EC2/ECS, IAM, VPC/security.

Ownership:
Read-only. Do not edit source files.

Expected output:
Cloud architecture with storage responsibilities, tenant isolation, retrieval path, async jobs, and migration plan from Dexie.
