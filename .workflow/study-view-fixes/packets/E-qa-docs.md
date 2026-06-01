# Packet E: QA, Docs, and Git

## Objective
Document and verify the integrated workflow, then prepare commit and push.

## Context
Use only source files and workflow results needed for docs and QA. README must
explain book-scoped chat and multi-PDF study behavior.

## Ownership
Read-only until implementation is stable. Later owns README, workflow final
report, screenshot artifacts, and Git evidence.

## Do
- Draft README sections for book-scoped chat and multi-PDF workflows.
- Build a browser QA checklist for desktop and mobile.
- Record screenshot paths and command results in `final-report.md`.
- Confirm branch/remote/auth before commit/push.

## Do Not
- Do not force push or rewrite history.
- Do not claim browser QA passed without evidence.
- Do not revert dirty worktree changes.

## Expected Output
A concise result in `results/E-qa-docs.md`, updated README after implementation,
and completed final report.

## Verification
`npm run lint`, `npm run build`, browser QA, git commit, and push evidence.
