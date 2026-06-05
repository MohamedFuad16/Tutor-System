# P4 Long-Term Memory Formation Result

## Summary
LearningAI should treat durable memory as a typed, temporal evidence ledger, not
as chat history, not as a single vector database, and not as model fine-tuning.
Foreground tutor stays responsive, background memory worker extracts candidate
memories, a validator decides what becomes durable learner state, and retrieval
pulls only scoped, source-backed memory into the tutor loop.

## Recommended Memory Taxonomy
- Working memory: current page, current goal, recent turns, active book, tool jobs.
- Episodic memory: timestamped learning events, attempts, annotations, pauses,
  questions, quiz answers.
- Semantic learner memory: concept summaries, misconceptions, mastery,
  confidence, prerequisites.
- Procedural tutor memory: teaching preferences, pacing, examples, scaffolding.
- Reflective memory: periodic "what changed this week" summaries.
- Source memory: document/page/web citations separated from learner-state claims.
- Audit memory: what changed mastery, from which event, with rollback/delete.

## Store / Summarize / Forget / Retrieve
- Store raw MemoryEvents append-only, then derive typed LearnerMemory records
  with type, confidence, sourceRefs, validFrom, validUntil, status, reviewedBy.
- Summarize older sessions into weekly learner snapshots, concept timelines,
  misconception trails, and spaced-review queues.
- Forget low-salience raw transcripts after retention windows, obsolete derived
  facts after supersession, and user-deleted memory across stores where practical.
- Retrieve by hard filters first: userId, bookId, concept, memory type, recency,
  confidence, permission scope. Only then use vector or graph retrieval.

## Architecture Refinements
- Add MemoryEvent and LearnerMemory as first-class records beside current Dexie
  books/concepts.
- Keep BKT/LKT as mastery engine; let LLMs propose evidence labels, not directly
  write mastery.
- Use consolidation queue after each session: extract, classify, cite,
  conflict-check, commit or review.
- Cloud brain: Postgres for ledger truth, pgvector for semantic recall,
  temporal graph for relationships, S3 for artifacts, tenant isolation.
- Dexie remains local/offline cache, not durable truth.
- Memory UI should expose "why remembered," edit, delete, and wrong controls.

## Rejected Claims
- Vector DB equals learner brain.
- Long context removes need for memory architecture.
- Fine-tuning/LoRA should store learner state.
- LLM summaries can be mastery truth without attempt evidence.
- Deleting a chat deletes all derived memory without explicit propagation.

## Sources
- Thinking Machines interaction models: https://thinkingmachines.ai/blog/interaction-models/
- Complementary Learning Systems: https://stanford.edu/~jlmcc/papers/McCMcNaughtonOReilly95.pdf
- Roediger and Karpicke review: https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_Review.pdf
- Adaptive forgetting curves: https://arxiv.org/abs/2004.11327
- BKT: https://doi.org/10.1007/BF01099821
- LKT: https://arxiv.org/abs/2005.00869
- DKT: https://arxiv.org/abs/1506.05908
- MemGPT: https://arxiv.org/abs/2310.08560
- Zep temporal graph: https://arxiv.org/abs/2501.13956
- Generative Agents: https://arxiv.org/abs/2304.03442
- LongMemEval: https://arxiv.org/abs/2410.10813
- Microsoft GraphRAG: https://www.microsoft.com/en-us/research/project/graphrag/
- OpenAI retrieval: https://developers.openai.com/api/docs/guides/retrieval
- OpenAI tools: https://developers.openai.com/api/docs/guides/tools
- OpenAI evals: https://developers.openai.com/api/docs/guides/evals
- OpenAI data controls: https://platform.openai.com/docs/guides/your-data
- MDN storage quotas: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

## Debate Position
The best path is a local-first, cloud-syncable, provenance-backed learner brain
with KT as scoring core, LLMs as candidate extractors, temporal graph memory as
relationship layer, and user-visible controls as trust layer.
