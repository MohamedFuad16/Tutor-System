# Five-Agent Release Verification

## Goal

Independently verify the completed LearningAI architecture-book, learner Admin,
fullscreen chat, and revision-book work; fix confirmed defects; update the
README; and push a verified commit to `origin`.

## Success Criteria

- Five bounded review agents inspect separate risk areas.
- Every reported issue is accepted, rejected, or deferred with evidence.
- Confirmed regressions are fixed without reverting unrelated user work.
- The README accurately explains the product, architecture, setup, testing,
  voice providers, limitations, and repository navigation.
- Focused tests, the full test suite, lint, build, postchange, and browser QA
  pass.
- The current branch is committed and pushed to `origin`.

## Constraints

- Follow `AGENTS.md`: use Graphify before broad source reads.
- Do not regenerate `graphify-out`.
- Preserve the existing dirty worktree and unrelated user-owned files.
- Do not expose secrets or commit local credentials.
- Do not force-push.

## Work Packets

1. Architecture and data-contract review.
2. UI/UX, accessibility, and responsive review.
3. Runtime and rendering performance review.
4. Revision-book structure, content, citations, and audio review.
5. Test coverage, release readiness, and README requirements review.

## Verification

- Packet-specific checks.
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run brain:postchange -- --reason five-agent-release-verification`
- Desktop and mobile browser smoke tests.
- `git diff --check`
- Secret and generated-artifact review before commit.
