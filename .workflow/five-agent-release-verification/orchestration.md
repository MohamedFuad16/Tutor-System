# Orchestration

## Delegation

Each agent is read-only and owns one review lane. Agents must use the local
Graphify graph before bounded file inspection and return findings ordered by
severity with file and line references.

## Integration

- Accept findings confirmed by source, tests, or rendered behavior.
- Reject speculative refactors without a demonstrated bug or meaningful risk.
- Defer production-only work that requires authentication, cloud storage,
  credentials, or provider billing.
- Keep all edits local to the main agent to avoid write conflicts.

## Release Gate

No commit or push occurs until all five reports are integrated, the README is
current, repository gates pass, browser QA is complete, and staged content is
reviewed for secrets and unrelated files.
