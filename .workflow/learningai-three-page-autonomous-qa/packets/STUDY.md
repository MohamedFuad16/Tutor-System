# STUDY Packet

## Objective
Audit and fix the Study page for bugs, UI/UX, mobile/desktop layout, animation, performance, and code quality.

## Ownership
- Primary write scope: `src/views/StudyView.tsx`.
- You may inspect directly connected files after Graphify retrieval.
- Avoid editing shared files unless absolutely necessary; report shared-file proposals instead.

## Required Method
1. Use Graphify before broad reads.
2. Spawn nested subagents up to one level if available for visual QA, code/performance review, or browser testing.
3. Use the running app at `http://127.0.0.1:3100/`.
4. Capture or create screenshot evidence. If screenshot tooling is unavailable, record exact viewport observations.
5. Divide the page visually into top/middle/bottom or grid zones and inspect each zone for overlap, clipping, unreadable text, bad animation, or broken controls.
6. Implement only safe, scoped fixes.

## Expected Result
Write a summary to `.workflow/learningai-three-page-autonomous-qa/results/STUDY.md` listing Graphify context, tests, screenshots, changes, and remaining risks.
