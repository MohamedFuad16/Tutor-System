---
name: tutor-debug
description: Use when the user invokes /debug, asks for the LearningAI/Tutor debugging tool, long-horizon UI/code refactoring, brain-connected cleanup, official-doc comparison, performance/animation regression passes, or Admin debug-run tracking.
---

# Tutor Debug

Use this skill only inside `/Users/mfuad16/Documents/LearningAI`.

## Workflow

1. Read `AGENTS.md` and follow the Universal Brain Agent Runtime.
2. Run `npm run brain:postchange -- --reason skill-preflight` to make `/brain` current before using it.
3. Retrieve focused context before reading broadly:
   ```bash
   npm run brain:retrieve -- "<task>"
   npm run brain:impact -- "<likely file or component>"
   ```
4. Invoke the long-horizon debugger:
   ```bash
   npm run brain:debug -- --mode fix --scope all
   ```
   Use a narrower scope if the user named a component:
   ```bash
   npm run brain:debug -- --mode fix --scope component:ChatPanel
   ```
5. If a previous run stopped, resume it:
   ```bash
   npm run brain:debug -- --resume "<run-id>"
   ```

## Rules

- `/brain` is the source of app context. Do not start with broad repository reads.
- Official docs in `brain/reference-docs` are primary source-of-truth evidence.
- Web search is secondary and must be recorded as best-practice evidence, not as canonical docs.
- Debug runs are append-only. Do not overwrite old run artifacts.
- Auto-fix mode may apply deterministic fixes only when backed by a failing gate, source hash check, backup, and post-change verification.
- After source changes, run `npm run brain:postchange -- --reason debug-skill-change`.
- Before reporting done, run the final gates requested by the repository: brain generation, embedding, runtime benchmark, verify, drift check, self-audit, format check, lint, and build.

## Outputs

The debugger writes run artifacts under `brain/debug/runs/<run-id>/` and updates `brain/debug/memory-graph.json`. The Admin Debug Runs tab reads the same run history.
