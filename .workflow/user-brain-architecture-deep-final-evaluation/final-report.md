# Final Report: User Brain Architecture Deep Final Evaluation

## Outcome

Completed the requested deep final evaluation and local integration.

The stale generated tutor-runtime image was removed from built output. The
source book no longer references the PNG, `public/user-brain` is empty, and
`dist/user-brain` is empty after rebuild.

## Accepted Architecture Tightenings

- The book now states the LoRA/QLoRA/PEFT boundary: useful later for owned/open
  model adaptation, not for per-learner memory.
- The background layer is now framed as a bounded worker layer where authority
  matters.
- The Runtime Contracts chapter now includes minimum fields for EvidenceEvent,
  ToolJob, ArtifactRecord, MasteryDelta, and CitationState.
- The book now separates current implementation from cloud-beta requirements.
- Dexie/IndexedDB is now explicitly local cache, not durable backup.
- pgvector is now explicitly retrieval infrastructure, not truth.
- OWASP/NIST security and privacy gates were added.
- First beta latency, queue, tool, citation, and mastery-write targets were
  added.

## Rejected Or Downgraded Ideas

- Do not describe the system as native interaction-model training.
- Do not let background workers commit durable mastery without validated
  evidence and audit rows.
- Do not treat RAG-KT, LLM-KT, CIKT, or other newest KT papers as beta source of
  truth.
- Do not treat RLS, pgvector, S3 prefixes, queues, or KMS as complete security
  without app-level tenant scope and tests.

## Sources Used

- Thinking Machines interaction models: https://thinkingmachines.ai/blog/interaction-models/
- OpenAI tools/background/realtime/evals/structured outputs/data controls:
  https://developers.openai.com/api/docs/guides/tools,
  https://developers.openai.com/api/docs/guides/background,
  https://developers.openai.com/api/docs/guides/realtime,
  https://developers.openai.com/api/docs/guides/evals,
  https://developers.openai.com/api/docs/guides/structured-outputs,
  https://developers.openai.com/api/docs/guides/your-data
- PEFT/LoRA/QLoRA:
  https://arxiv.org/abs/2106.09685,
  https://arxiv.org/abs/2305.14314,
  https://huggingface.co/docs/peft/developer_guides/lora
- KT:
  https://doi.org/10.1007/BF01099821,
  https://arxiv.org/abs/1506.05908,
  https://arxiv.org/abs/2005.00869,
  https://arxiv.org/abs/2007.12324,
  https://doi.org/10.1145/3447548.3467237,
  https://arxiv.org/abs/2406.02893,
  https://arxiv.org/abs/2502.02945,
  https://arxiv.org/abs/2604.10960
- Storage, cloud, and security:
  https://github.com/pgvector/pgvector,
  https://dexie.org/docs/Dexie.js.html,
  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API,
  https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria,
  https://www.postgresql.org/docs/current/ddl-rowsecurity.html,
  https://owasp.org/www-project-top-10-for-large-language-model-applications,
  https://owasp.org/www-project-ai-security-and-privacy-guide/,
  https://www.nist.gov/itl/ai-risk-management-framework,
  https://www.nist.gov/privacy-framework,
  https://opentelemetry.io/docs/

## Verification

- Workflow verification: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Built asset check: `dist/user-brain` and `public/user-brain` contain no image
  files.
- Browser smoke in Zen at `http://127.0.0.1:3100/`: passed. User Brain
  Architecture opens, Chapter 2 renders the clean Mermaid flowchart, and the old
  generated hero image is absent.

## Remaining Risks

- The architecture book is ahead of implementation. The next build milestone is
  to enforce evidence and mastery contracts in code.
- Citation states exist in the book but are not yet a full UI/runtime state
  machine.
- The current local KT implementation is a baseline, not a calibrated
  logistic/sequence model.
- Cloud privacy and isolation remain a reference architecture until tenant
  scoping, IAM, KMS, queues, deletion/export flows, and observability are
  implemented and tested.

## Outcome

## Accepted Results

## Rejected Results

## Conflicts Resolved

## Verification Evidence

## Remaining Risks

## Reusable Follow-up
