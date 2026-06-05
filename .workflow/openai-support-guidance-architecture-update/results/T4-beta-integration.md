# Team 4 Result: Beta Readiness and Integration

## Accepted
- Team 4 turns Teams 1-3 into release gates, policy defaults, dashboards, and
  the final architecture addendum.
- Before beta: reduce release risk, freeze model routing unless evals justify
  changes, add source-grounding/web-search guardrails, formalize cost/latency
  telemetry, add privacy language/controls, and run lint/build plus live smoke
  tests.
- After beta: defer full Responses API migration, primary latest-model switch,
  structured-output contract refactors, persistent remote conversation state,
  hosted tools, prompt caching strategy, provider abstraction, and fine-grained
  per-user budget enforcement unless blocking.
- Eval gates: grounded tutoring, freshness routing, tool correctness, citation
  behavior, learning memory quality, safety, and cost/latency visibility.
- Privacy: beta traces should be opt-in, revocable, minimized, and redacted by
  default; distinguish browser-local state, provider-transmitted data, OpenAI
  data controls, and app retention.
- Dashboards: eval pass rate, unsupported-claim rate, citation precision/recall,
  learner-state mutation/reversal, safety events, model routing, latency, cost,
  retrieval misses, consent coverage, deletion/export requests.

## Key URLs
- https://developers.openai.com/api/docs/guides/evals
- https://developers.openai.com/api/docs/guides/evaluation-best-practices
- https://developers.openai.com/api/docs/guides/graders
- https://developers.openai.com/api/docs/guides/safety-best-practices
- https://developers.openai.com/api/docs/guides/your-data
- https://developers.openai.com/api/docs/guides/retrieval
- https://developers.openai.com/api/docs/guides/tools-file-search
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/conversation-state
- https://developers.openai.com/api/docs/guides/model-optimization
- https://developers.openai.com/api/docs/guides/prompt-engineering
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/pricing
- https://openai.com/security-and-privacy/

## Integration Notes
- Support emails are private inputs, not public documentation.
- Avoid claims that ZDR is universal, that OpenAI never stores API data, or that
  pricing/model availability is stable.
