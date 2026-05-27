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

   The default `all` scope means every source-scoped target: every file, UI component, store, service, hook, context, route, utility, server/API file, script, and `/brain` TypeScript tool.

   For each target, the debugger must run this exact order:
   1. Parse architecture.
   2. Understand purpose.
   3. Analyze dependencies.
   4. Detect anti-patterns.
   5. Detect performance issues.
   6. Detect stale state.
   7. Detect render problems.
   8. Detect memory leaks.
   9. Detect async issues.
   10. Detect typing issues.
   11. Detect animation issues.
   12. Detect API issues.
   13. Detect accessibility issues.
   14. Compare against best practices.
   15. Search documentation patterns.
   16. Generate improvements.
   17. Apply patch when justified.
   18. Run validation.
   19. Run regression tests, responsiveness probes, and animation smoothness sampling.
   20. Persist findings into brain.

   The operational loop is: scan, understand, audit, benchmark, detect bugs, search best practices, compare implementations, patch issues, rerun tests, validate fixes, measure regressions, persist findings into brain, and repeat until the queue is complete.

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
- Debug runs are append-only unless the user explicitly asks to reset the Version Tracker.
- Auto-fix mode may apply deterministic fixes only when backed by a failing gate, source hash check, backup, and post-change verification.
- After source changes, run `npm run brain:postchange -- --reason debug-skill-change`.
- Before reporting done, run the final gates requested by the repository: brain generation, embedding, runtime benchmark, UI regression probe, verify, drift check, self-audit, format check, lint, and build.

## Outputs

The debugger writes run artifacts under `brain/debug/runs/<run-id>/` and updates `brain/debug/memory-graph.json`. The Admin Debug Runs tab reads the same run history and should show each completed target immediately with component name, what changed, why it changed, improvements, docs evidence, validation, and regression results. Component cards should stay collapsed by default for users; raw phase details stay in the artifact for agents.
