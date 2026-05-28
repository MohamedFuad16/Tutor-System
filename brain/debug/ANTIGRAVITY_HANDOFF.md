# Antigravity Debug Handoff

This is a one-way handoff contract from Codex to Antigravity for the
LearningAI/Tutor workspace.

## Trigger

Use this handoff only when Codex explicitly says its remaining usage is low or
the user asks Antigravity to continue. Do not bounce work back to Codex from
Antigravity in the same run.

## Target Model

Use Antigravity 2.0 with Gemini 3.5 Flash Medium when that model is available.
If the exact selector is unavailable, choose the closest Flash/Medium option and
record the selected model in the first response.

## First Actions

1. Stay in `/Users/mfuad16/Documents/LearningAI`.
2. Read `AGENTS.md` and `skills/tutor-debug/SKILL.md`.
3. Run `git status --short` and treat every existing change as user/Codex work.
4. Do not revert, delete, or overwrite unrelated changes.
5. Run `npm run brain:drift-check`; regenerate only if drift is reported.
6. Retrieve focused context with `npm run brain:retrieve -- "<current task>"`.
7. Run impact analysis before editing any target.

## Debug Continuation

Use the tightened debug order in `skills/tutor-debug/SKILL.md`. For UI targets,
do not accept static screenshots or code inspection alone. The run must include:

- actual browser execution through `/browser` when available, or the
  Playwright-backed `npm run brain:ui-regression` fallback when not available;
- mobile, tablet, and desktop viewport testing;
- interaction simulation for click, type, toggle, navigation, and scroll paths;
- runtime instrumentation for console/page errors and frame timing;
- visual regression evidence with screenshot hashes, nonblank checks, overflow,
  and overlap checks;
- state-transition testing for route, toggle, loading, empty, disabled, error,
  and persisted-state paths.

Start narrow:

```bash
npm run brain:debug -- --mode fix --scope changed
```

If a previous run is still marked running but no process exists, inspect its
`run.json`, `summary.json`, `events.ndjson`, and component files before starting
a new run. Do not manually edit debug artifacts unless the user explicitly asks.

## Current Known Work

The current task involves:

- document classifier verification for native/text PDFs, scanned PDFs/images,
  and mixed documents;
- source-material-first chat search behavior;
- DeepSeek V4 Flash defaults;
- App Design Language wireframe and live component preview cleanup;
- tutor-debug process tightening;
- architecture book, design book, README, and `/brain` refresh.

## Finish Gates

Before claiming completion, run:

```bash
npm run format:check
npm run lint
npm run build
npm run brain:generate
npm run brain:embed
npm run brain:runtime-benchmark
npm run brain:verify
npm run brain:drift-check
npm run brain:self-audit
npm run brain:ui-regression
```

Report any skipped gate with the exact error text.
