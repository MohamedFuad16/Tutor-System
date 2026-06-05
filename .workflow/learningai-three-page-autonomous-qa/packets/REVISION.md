# REVISION Packet

## Objective
Audit and fix the Revision page for bugs, reader/library layout, mobile/desktop behavior, chart sizing, animation, performance, and code quality.

## Ownership
- Primary write scope: `src/views/RevisionView.tsx`.
- You may inspect directly connected Revision helpers after Graphify retrieval.
- This file already has in-progress edits; do not revert unrelated changes.
- Avoid shared-file edits unless absolutely necessary; report shared-file proposals instead.

## Required Method
1. Use Graphify before broad reads.
2. Spawn nested subagents up to one level if available for reader visual QA, chart responsiveness, code/performance review, or browser testing.
3. Use the running app at `http://127.0.0.1:3100/`.
4. Capture or create screenshot evidence. If screenshot tooling is unavailable, record exact viewport observations.
5. Divide the page visually into library/header/content/chart/navigation zones and inspect each for overlap, clipping, unreadable text, bad animation, or broken controls.
6. Implement only safe, scoped fixes.

## Expected Result
Write a summary to `.workflow/learningai-three-page-autonomous-qa/results/REVISION.md` listing Graphify context, tests, screenshots, changes, and remaining risks.
