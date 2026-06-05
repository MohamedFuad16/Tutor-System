# Pre-Push Clean Architecture Release

## Objective

Audit the current working tree, remove generated release debris, simplify the
built-in architecture books around clear boundaries and implementation truth,
run the full local verification suite, and push only verified source artifacts.

## Lanes

1. Code and test hygiene: inspect changed source and tests for regressions,
   accidental complexity, weak contracts, and release blockers.
2. Release hygiene: identify generated files, local browser state, secrets,
   caches, and other artifacts that must not be pushed.
3. Architecture books: make the built-in Tutor and learner-brain books concise,
   source-backed clean-architecture explanations.
4. Integration: review all changes, run formatting, lint, tests, build, browser
   smoke checks, then commit and push the intentional release set.

## Boundaries

- Use Graphify to route source inspection.
- Do not regenerate or edit `graphify-out`.
- Preserve unrelated user changes.
- Keep learner-brain claims separate from repository architecture claims.
- Describe implemented behavior separately from target or deferred behavior.
- Do not push secrets, browser profiles, caches, or local-only generated state.

## Verification

- `git diff --check`
- `npm run format:check`
- `npm run lint`
- `npm run test:dom`
- `npm run test`
- `npm run build`
- Browser smoke of built-in architecture books
- Final staged-content and sensitive-data review
