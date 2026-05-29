---
name: tutor-debug
description: Use when the user invokes /debug, asks for the LearningAI/Tutor debugging tool, long-horizon UI/code refactoring, brain-connected cleanup, official-doc comparison, performance/animation regression passes, or Admin debug-run tracking.
---

# Tutor Debug

Use this skill only inside `/Users/mfuad16/Documents/LearningAI`.

## Operating Modes

The skill has three explicit operating modes. Pick exactly one before invoking
the runner and record the chosen mode in the run artifact.

### 1. Focused Fix Mode

Use this when the user names a component, route, file, or concrete bug. Scope to
the smallest truthful target and patch only when a failing gate or deterministic
rule proves the defect.

```bash
npm run brain:debug -- --mode fix --scope component:ChatPanel
```

### 2. Changed-Work Audit Mode

Use this after a normal implementation pass. It audits only the changed source
surface, applies guarded fixes when justified, then runs final global gates.

```bash
npm run brain:debug -- --mode fix --scope changed
```

### 3. Long-Horizon Task Mode

Use this only when the user explicitly asks for a complete codebase audit,
`scope-all`, or a long-horizon refactor/debug pass. This mode must walk every
source-scoped target in queue order and run the full 35-step process for each
component, view, store, service, hook, context, route, utility, server/API file,
script, and `/brain` TypeScript tool. It audits and fixes completely: findings
are not allowed to stop at observation when a safe deterministic or
model-backed patch is available.

```bash
npm run brain:debug -- --mode long-horizon --scope all
```

Long-Horizon Task Mode rules:

- Do not downscope to `changed` once this mode is selected.
- Do not skip targets because they look stable; every queued target receives all
  35 steps.
- Run actual browser execution, viewport testing, interaction simulation,
  runtime instrumentation, visual regression checks, and state-transition tests
  for every UI target.
- Patch only after hash guards, backup creation, source-boundary checks, and a
  clear safety gate pass.
- Defer expensive workspace-wide gates for unchanged targets, but run final
  global gates once after the complete queue finishes.
- Persist every target result into `brain/debug/runs/<run-id>/` and
  `brain/debug/memory-graph.json` before moving to the next target.

## Workflow

1. Read `AGENTS.md` and follow the Universal Brain Agent Runtime.
2. Run `npm run brain:postchange -- --reason skill-preflight` to make `/brain` current before using it.
3. Retrieve focused context before reading broadly:
   ```bash
   npm run brain:retrieve -- "<task>"
   npm run brain:impact -- "<likely file or component>"
   ```
4. Invoke the debugger using the selected operating mode. For Focused Fix Mode
   and Changed-Work Audit Mode, use the narrowest truthful scope first:

   ```bash
   npm run brain:debug -- --mode fix --scope changed
   ```

   Use `changed` for current-task work. Use a named scope when the user named a
   component, route, or file. Use `all` only for Long-Horizon Task Mode or an
   explicit full-system audit.

   ```bash
   npm run brain:debug -- --mode fix --scope component:ChatPanel
   ```

   `all` means every source-scoped target: every file, UI component, store,
   service, hook, context, route, utility, server/API file, script, and `/brain`
   TypeScript tool. In Long-Horizon Task Mode, UI routes/components are audited
   before `/brain` tooling, and expensive workspace/runtime gates are deferred
   for unchanged targets until the final global gate phase.

   For each target, the debugger must run this exact order:
   1. Parse architecture.
   2. Understand purpose.
   3. Lock scope.
   4. Analyze dependencies.
   5. Verify mutation boundary.
   6. Detect anti-patterns.
   7. Detect performance issues.
   8. Detect stale state.
   9. Detect render problems.
   10. Detect memory leaks.
   11. Detect async issues.
   12. Detect typing issues.
   13. Detect animation issues.
   14. Detect API issues.
   15. Detect accessibility issues.
   16. Detect responsive layout and overlap issues at mobile, notebook, and desktop widths.
   17. Detect source-material boundaries for chat, vision, retrieval, and web-search tools.
   18. Detect model/config drift against current provider docs and local settings defaults.
   19. Detect document-ingestion branch coverage for native text, scanned/image, and mixed PDFs.
   20. Verify live surface.
   21. Execute the app in an actual browser context.
   22. Test mobile, tablet, and desktop viewports.
   23. Simulate interactions: click, type, toggle, navigate, and scroll.
   24. Instrument runtime: console errors, frame timing, responsiveness, and route/runtime signals.
   25. Run visual regression checks with screenshot hashes, nonblank viewport checks, overflow checks, and overlap checks.
   26. Test state transitions: route, toggle, loading, empty, disabled, error, and persisted-state transitions.
   27. Verify interactive controls, keyboard reachability, loading, empty, error, and disabled states.
   28. Compare against best practices.
   29. Search documentation patterns.
   30. Generate improvements.
   31. Gate patch safety.
   32. Apply patch when justified.
   33. Run focused validation.
   34. Run targeted regression tests, responsiveness probes, and animation smoothness sampling.
   35. Persist findings into brain.

   The operational loop is: scan, scope, understand, audit, boundary check,
   detect bugs, verify live UI, execute browser, test viewports, simulate
   interactions, instrument runtime, check visual regressions, test state
   transitions, search best practices, compare implementations, gate patch
   safety, patch issues, run focused validation, measure targeted regressions,
   persist findings into brain, and repeat until the queue is complete.

5. If a previous run stopped, resume it:
   ```bash
   npm run brain:debug -- --resume "<run-id>"
   ```

## Rules

- `/brain` is the source of app context. Do not start with broad repository reads.
- Never begin a user-reported UI defect with `--scope all`; use `changed`, a
  route name, a component name, or the named file first.
- For UI work, static screenshots or mock cards are not enough. Verify the
  rendered surface is live, interactive, keyboard-reachable where appropriate,
  and visible on mobile and desktop.
- Visual UI testing must use `/browser` when the Browser plugin is available.
  If that tool is unavailable in the current agent runtime, use the
  Playwright-backed `npm run brain:ui-regression` probe and record that fallback
  explicitly in the run artifact.
- Every UI target must collect evidence for actual browser execution, viewport
  testing, interaction simulation, runtime instrumentation, visual regression
  checks, and state transition testing before a visual fix is accepted.
- Browser evidence must include mobile, tablet, and desktop dimensions, console
  or page errors, frame timing, horizontal overflow, nonblank viewport status,
  screenshot hash/size, and at least one meaningful user interaction or a
  written explanation of why that target has no interaction path.
- State transition testing must cover the natural target states: route changes,
  active/inactive toggles, loading, empty, disabled, error, and persisted or
  restored state whenever the component owns those states.
- For UI work, reject overlapping text, clipped controls, floating nodes that
  collide at notebook width, one-note palettes, generic mockups posing as real
  components, and any preview that cannot be clicked, toggled, paged, or focused.
- For chat/search work, source material wins by default. Questions about the
  current page, screen, selected text, document, chapter, active book, uploaded
  source, visible diagram, or "what is this about" must use local context or
  vision before web search. Web search requires explicit external intent or a
  truly freshness-sensitive fact.
- For document ingestion, verify all classifier branches: native/text PDFs use
  PyMuPDF4LLM, scanned PDFs/images use bounded OCR/vision parsing, and mixed
  documents combine text extraction with page-image parsing without stdout
  buffer overflow.
- For model/provider work, compare current defaults against official provider
  docs and app routing. Do not keep deprecated aliases as defaults when an
  explicit current model slug is available.
- Do not spend full lint/build/runtime/UI-regression gates on every unchanged
  target in an all-scope pass. Run per-target workspace gates only for focused
  scopes or changed targets, then run final global gates once.
- Treat a debug run as stalled if no event or summary timestamp changes during
  a long regression phase; stop it before starting a competing run.
- Official docs in `brain/reference-docs` are primary source-of-truth evidence.
- Web search is secondary and must be recorded as best-practice evidence, not as canonical docs.
- Debug runs are append-only unless the user explicitly asks to reset the Version Tracker.
- Auto-fix mode may apply deterministic fixes only when backed by a failing gate, source hash check, backup, and post-change verification.
- When Codex hands off to Antigravity, use `brain/debug/ANTIGRAVITY_HANDOFF.md`
  as the one-way continuation contract. The receiving agent must reread
  `AGENTS.md`, check `git status --short`, preserve existing edits, and resume
  from the tightened debug process instead of improvising a new workflow.
- After source changes, run `npm run brain:postchange -- --reason debug-skill-change`.
- Before reporting done, run the final gates requested by the repository: brain generation, embedding, runtime benchmark, UI regression probe, verify, drift check, self-audit, format check, lint, and build.

## Outputs

The debugger writes run artifacts under `brain/debug/runs/<run-id>/` and updates `brain/debug/memory-graph.json`. The Admin Debug Runs tab reads the same run history and should show each completed target immediately with component name, what changed, why it changed, improvements, docs evidence, validation, and regression results. Component cards should stay collapsed by default for users; raw phase details stay in the artifact for agents.
