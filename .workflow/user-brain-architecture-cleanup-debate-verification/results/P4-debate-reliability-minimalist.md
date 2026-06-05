# P4 Debate: Reliability Minimalist

## Position
The two-layer architecture is useful, but only if the background worker is
bounded, traceable, and evidence-gated.

## Strong Points
- Background agents may propose updates; deterministic evidence rules decide
  mastery.
- BKT/IRT/Elo-style interpretable scoring should be the first source of record;
  DKT/LKT-style models need offline evaluation first.
- Every tool call needs timeout, cost budget, permission tier, trace ID, and
  fallback behavior.
- Voice mode must degrade gracefully when retrieval, search, image generation,
  or code execution is slow.
- Privacy and tenant scope are architecture, not a late compliance pass.

## Rebuttal Convergence
P4 accepted async orchestration as the selected beta architecture, but rejected
absolute claims that it is the only path or that more autonomy is inherently
better.
