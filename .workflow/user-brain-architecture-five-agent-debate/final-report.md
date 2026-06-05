# Final Report: User Brain Architecture Five Agent Debate

## Outcome
Completed the five-agent debate and integrated the consensus into the in-app **User Brain Architecture** book. The final strategy is a Thinking Machines-inspired app-native interaction runtime: one calm foreground tutor, asynchronous background intelligence, shared context, event contracts, evidence-only mastery updates, and explicit runtime/cloud ownership.

## Accepted
- P1: two-layer runtime with foreground tutor, background agent, shared context, and event stream.
- P2: mastery updates require validated learner evidence, BKT/Logistic KT, and audit rows.
- P3: background intelligence requires event contracts, job lifecycle, idempotency, queues, observability, tenant isolation, and failure gates.
- P4: the learner sees one calm tutor; tool results appear through artifact policy at useful teaching moments.
- P5: final evaluation accepted all four lanes with qualifications against native-model-training claims and impression-based mastery.

## Rejected Or Qualified
- Rejected any claim that LearningAI is training or reproducing a native Thinking Machines interaction model.
- Rejected continuous fine-tuning as the personalization path.
- Rejected mastery changes from pauses, praise, fluent conversation, generated notes, or model confidence alone.
- Qualified background agents into hot lane and durable lane.
- Qualified generated images as explanatory visuals, not factual evidence.

## Final Changes
- Added five-agent consensus section near the start of the book.
- Added generated visual asset: `public/user-brain/two-layer-tutor-runtime.png`.
- Added Mermaid rendering support to `RevisionView`.
- Added flowcharts for two-layer runtime, evidence-to-mastery flow, continuous teaching loop, artifact router, hot lane vs durable lane, runtime topology, and AWS cloud brain map.
- Tightened runtime contracts with events, job lifecycle, truth rules, artifact policy, operational gates, and quiet tutor policy.
- Added ElastiCache/Valkey hot-state lane and cloud ownership details.
- Updated glossary and source appendix.

## Verification Evidence
- `npm run lint` passed.
- `npm run build` passed.
- `verify_workflow.py .workflow/user-brain-architecture-five-agent-debate` passed.
- Browser smoke test at `http://127.0.0.1:3100/` passed:
  - User Brain Architecture opened.
  - Chapter 0 includes Five-Agent Consensus and app-native runtime wording.
  - Chapter 1 rendered the generated image with natural width 1536.
  - Chapter 9 Runtime Contracts rendered Mermaid SVGs with no Mermaid parse errors.
  - Chapter 15 showed 37 external source links.
  - External links use `target="_blank"` and `rel="noopener noreferrer"`.

## Remaining Risks
- Mermaid rendering adds lazy-loaded diagram weight to the Revision reader.
- The architecture is still a documented/runtime strategy; event bus, job queues, artifact lifecycle, and KT ledger implementation remain follow-up work.
- OpenAI/AWS docs are volatile and should be refreshed before release decisions.

## Follow-Up
- Implement explicit `TutorEvent`, `BackgroundJob`, `ArtifactPolicy`, and `KnowledgeEvent` types.
- Add hot-lane/durable-lane worker status events to chat streaming.
- Add tests for "no evidence event, no mastery update."
