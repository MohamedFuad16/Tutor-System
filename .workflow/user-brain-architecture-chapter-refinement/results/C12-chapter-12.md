# C12 Chapter 12 Result

## Clarity Score
Before: 7/10
After: 9/10

## Integration Notes
Lead with the learner/device story, then map services to responsibilities.
Dexie is the fast local copy; AWS is the durable source that can restore it.

## Recommended Shape
- Open: Dexie gives beta a fast local brain.
- State production rule: Dexie is cache; AWS is durable learner brain.
- Explain cache versus learner brain.
- Add simple responsibility table for Dexie, API/workers, Aurora, pgvector,
  Neptune, S3, ElastiCache, EventBridge/SQS, CloudWatch/OpenTelemetry.
- State sync rule: browser may propose changes, server decides durable state.
- Clarify start-small path for cloud version.

## Caveats
Keep browser quota/eviction warning, cloud-can-rebuild-Dexie rule, and handoff
to Chapter 13 where Postgres owns durable ledger.

## Plain-English Sentence
Dexie is the fast notebook on this browser; AWS is the durable learner brain
that can restore that notebook anywhere after login.
