# P1 Deep Final Evaluator

Read-only packet result. The background evaluator used Graphify first, then
bounded local inspection around `userBrainArchitectureBook.ts`, `RevisionView`,
`ChatPanel`, `interactionModel`, `memory.orchestrator`, `longterm.memory`, and
`bkt.engine`.

## Accepted Architecture Gaps

- The book's core direction is valid: a foreground tutor plus an asynchronous
  background worker layer is a practical app-native analogue of Thinking
  Machines' interaction-model split.
- The book should keep saying this is not native interaction-model training and
  not continuous learner-specific fine-tuning.
- The app currently has early interaction-context and BKT machinery, but the
  durable evidence ledger, source-state machine, tool-job schemas, tenant-scoped
  cloud write path, and audit-enforced mastery contracts are still requirements.
- Dexie/IndexedDB is appropriate for local beta speed, but it must be described
  as local cache rather than durable backup.
- pgvector should be treated as retrieval infrastructure, not truth. Retrieval
  recall and citation accuracy need evals.
- OWASP/NIST style gates should be explicit because the architecture includes
  tools, uploads, retrieval, generated artifacts, vectors, and background jobs.
- LoRA/QLoRA/PEFT belong in the model-adaptation boundary: useful later for
  owned/open models and stable behavior, not for per-learner memory mutation.

## Rejected Or Overclaimed Ideas

- "Production needs a cloud brain" was too absolute. The stricter wording is:
  production needs durable server-side state, backup, access control, and
  observability; AWS is the current reference shape.
- Newer KT papers such as LLM-KT and RAG-KT should remain research-track
  references until LearningAI has its own benchmark data.
- Background workers must not commit durable mastery directly. They can propose
  observations; typed contracts and KT/evidence rules decide persistence.
- Vague beta budgets like "quickly" are not enough. The book should carry first
  numeric targets and mark them as thresholds to validate.
- RLS, KMS, queues, and tracing are not magic. They still require app-level
  tenant scope, tests, least privilege, and audit review.

## Source Table

| Area | Source |
| --- | --- |
| Interaction model analogy | https://thinkingmachines.ai/blog/interaction-models/ |
| OpenAI tools/background/realtime/evals | https://developers.openai.com/api/docs/guides/tools, https://developers.openai.com/api/docs/guides/background, https://developers.openai.com/api/docs/guides/realtime, https://developers.openai.com/api/docs/guides/evals |
| Structured contracts | https://developers.openai.com/api/docs/guides/structured-outputs |
| Fine-tuning and PEFT boundary | https://developers.openai.com/api/docs/guides/supervised-fine-tuning, https://arxiv.org/abs/2106.09685, https://arxiv.org/abs/2305.14314, https://huggingface.co/docs/peft/developer_guides/lora |
| KT baseline/research | https://doi.org/10.1007/BF01099821, https://arxiv.org/abs/1506.05908, https://arxiv.org/abs/2005.00869, https://arxiv.org/abs/2007.12324, https://doi.org/10.1145/3447548.3467237, https://arxiv.org/abs/2406.02893, https://arxiv.org/abs/2502.02945, https://arxiv.org/abs/2604.10960 |
| Local/cloud storage | https://dexie.org/docs/Dexie.js.html, https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API, https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria, https://github.com/pgvector/pgvector |
| AWS event/queue/observability | https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html, https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html, https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html |
| Privacy/security governance | https://owasp.org/www-project-top-10-for-large-language-model-applications, https://owasp.org/www-project-ai-security-and-privacy-guide/, https://www.nist.gov/itl/ai-risk-management-framework, https://www.nist.gov/privacy-framework, https://www.postgresql.org/docs/current/ddl-rowsecurity.html |
| Observability standard | https://opentelemetry.io/docs/ |

## Concrete Book Edits Integrated

- Added a model-adaptation boundary for LoRA, QLoRA, and PEFT.
- Added an implementation-status note separating current app behavior from
  cloud-beta requirements.
- Renamed the authority-sensitive background layer language from "agent" toward
  "background worker layer".
- Added minimum schema fields for EvidenceEvent, ToolJob, ArtifactRecord,
  MasteryDelta, and CitationState.
- Added Dexie/IndexedDB cache caveats and MDN storage quota references.
- Added pgvector retrieval caveat.
- Added RLS caveat and OWASP/NIST security baseline.
- Added first beta latency, tool, queue, and mastery-write targets.
- Added missing source appendix links for PEFT, Dexie, MDN, pgvector, OWASP,
  NIST, and OpenTelemetry.

## Remaining Risks

- The book is still ahead of the implementation. The next engineering milestone
  is enforcing typed evidence and mastery contracts in code.
- Source-state rendering exists as reader links and source cards, but not as a
  full verified/checking/unavailable/conflicting state machine.
- The current BKT engine is a baseline, not a calibrated logistic KT system.
- Cloud architecture remains a reference plan until tenant-scoped schemas,
  queues, IAM, KMS, observability, and deletion/export flows are implemented.
- RAG-KT/LLM-KT claims must stay in the research watchlist until tested on
  LearningAI data.
