# Tutor - AI-Powered Learning Interface

## Objective
To build an advanced, visually stunning "Tutor" application that assists users in reading academic papers and textbooks (e.g., Fluent Python) with semantic intelligence, real-time knowledge graph generation, and an active recall revision system.

## Design Philosophy & Directives
- **Visual Theme**: "Cosmic Obsidian" — extremely heavy, dark backgrounds (`#030303`, `#0A0A0B`) interspersed with glowing neons (violet, blue, orange), heavily utilizing `mix-blend-mode` for cinematic overlays.
- **Micro-Interactions**: Use fluid, satisfying, motion-heavy interactions. Use physics-spring animations on buttons, and dynamic liquid glass effects for AI elements.
- **Premium UI Signatures**:
  - The AI Assistant avatar uses an animated Siri-like "liquid glass" shader using noise SVGs for gradients and CSS overlays.
  - The Revision/notes view uses a classic analog "Book/Notebook" rendering style (using `#faf9f6` paper background, serif typography, page textures) contrasting with the tech-heavy dark UI.
  - The Knowledge Graph (`react-force-graph-3d`) renders nodes as beautiful glass orbs with wireframes and glowing cores instead of hard geometric solids.

## Core Features
1. **Interactive PDF Viewer**: Highlights and annotations directly on the PDF surface with custom overlays. Liquid metal backdrop-blur toolbars for text selection with dark-themed visual alignment and precision vertical offset tuning.
2. **AI Chat Panel**: Claude/o1-style Animated Thinking Panel showing real-time streaming "Thought Process" expansions, glowing dynamic input boxes, and contextual awareness.
3. **Brain View (Knowledge Graph)**: Real-time 3D Force-Directed Graph mapping out Python concepts (or any text concepts).
4. **Revision Notebook**: A highly polished reading space for reviewing concept mastery using a "Book Pages" physical aesthetic, including long-press functionality for IndexedDB concept deletion.

## Frameworks & Layout
- React 18, Vite, TypeScript, Tailwind CSS
- Component boundaries must remain strict: `PdfViewer`, `ChatPanel`, `BrainView`, `RevisionView`. 
- No default UI slop — no telemetry labels, no margins of unneeded data. Everything serves the learning experience or visual luxury.

# Universal Brain Agent Runtime

This file is the single canonical runtime contract for AI coding agents working in this repository.

It is editor-agnostic. Use it in Codex, Claude Code, Cursor, Gemini, Antigravity, Roo, Aider, VSCode AI, OpenHands, or any future coding agent.

Do not create extra agent frameworks, swarms, orchestration layers, recursive runtimes, or editor-specific protocols. The `/brain` system is complete enough. The goal now is reliable, portable, low-maintenance operation.

## What `/brain` Is

`/brain` is a generated architecture cognition layer for this repository.

It contains:

- source-scoped architecture graphs
- semantic retrieval indexes
- runtime impact telemetry
- route, state, render, API, WebSocket, and database maps
- architecture rules and mutation boundaries
- drift and freshness checks
- self-audit reports
- longitudinal engineering memory

Treat `/brain` as decision support, not magic. It helps agents retrieve relevant context, estimate impact, verify invariants, detect stale artifacts, and preserve architecture during changes.

## Mandatory Pipeline

All agents must follow this exact pipeline:

```text
LOAD
-> RETRIEVE
-> IMPACT ANALYSIS
-> VERIFY RULES
-> PLAN
-> MODIFY
-> VERIFY
-> REGENERATE
-> UPDATE MEMORY
```

Do not skip steps because a change looks small.

## Minimal Commands

Use only these commands as the standard agent workflow:

```bash
npm run brain:generate
npm run brain:retrieve -- "<task>"
npm run brain:impact -- "<file-or-symbol>"
npm run brain:verify
npm run brain:drift-check
npm run brain:execute -- --task "<task>" --mode plan
npm run brain:self-audit
```

Command meanings:

- `brain:generate`: regenerates source-scoped brain artifacts from the current repository.
- `brain:retrieve`: retrieves relevant context for a task using semantic retrieval, graph neighbors, context packs, invariants, and task memory.
- `brain:impact`: reports static and observed runtime impact for a file, symbol, route, API, store, or subsystem.
- `brain:verify`: validates architecture rules, freshness, contracts, routes, runtime maps, vector indexes, loaders, and self-audit status.
- `brain:drift-check`: detects whether source files changed since the last brain generation and reports regeneration targets.
- `brain:execute`: creates a plan in `--mode plan`; in explicit `--mode execute`, applies guarded model-generated patches only when configured and verification passes.
- `brain:self-audit`: scores graph freshness, vector freshness, retrieval quality, runtime coverage, rule compliance, route/state coverage, loader coverage, and memory continuity.

Other internal commands may exist, but they are not part of the universal agent protocol.

## LOAD

Start by reading this file and identifying the user task.

Then run:

```bash
npm run brain:drift-check
```

If drift is reported, do not trust generated artifacts until regeneration has run:

```bash
npm run brain:generate
```

After regeneration, continue with retrieval and impact analysis.

## RETRIEVE

Before reading broad areas of the repository, retrieve focused context:

```bash
npm run brain:retrieve -- "<task>"
```

Retrieval rules:

- retrieve only context relevant to the task
- prioritize directly impacted systems
- prioritize architecture invariants and mutation boundaries
- prioritize runtime telemetry when available
- include dependency neighbors and downstream consumers
- include relevant task history when present
- minimize token usage
- avoid unrelated files and broad repository reads

Use retrieved files to decide what to inspect. Do not use retrieval output as proof by itself; verify important claims against source before editing.

## IMPACT ANALYSIS

Before modifying any source file, run impact analysis for the likely mutation targets:

```bash
npm run brain:impact -- "<file-or-symbol>"
```

Impact analysis should guide:

- downstream files to inspect
- rerender and route propagation risk
- Zustand state propagation risk
- API, SSE, and WebSocket coupling
- Dexie/database mutation risk
- shared UI and animation inheritance
- affected verification or test surfaces

Never bypass impact analysis for shared state, routing, server contracts, database code, shared UI primitives, or generated brain tooling.

## VERIFY RULES

Before planning edits, check that the current architecture state is valid:

```bash
npm run brain:verify
```

If verification fails, fix the verification failure or explain why the requested task is blocked. Do not build on a known-invalid brain state.

## PLAN

Create a short plan before modifying files.

The plan must include:

- files to inspect or edit
- retrieved context used
- impact-analysis findings
- architecture invariants to preserve
- verification commands to run
- known risks or unresolved questions

Prefer the built-in plan mode:

```bash
npm run brain:execute -- --task "<task>" --mode plan
```

Plan mode must not modify source files.

## MODIFY

Modify only the source files needed for the task.

Mutation boundaries:

- Do not manually edit generated artifacts such as graph, flow, contract, impact, vector, runtime, snapshot, or verification outputs.
- Regenerate generated artifacts with `brain:generate` instead.
- Treat Dexie schema changes as high risk; require explicit schema or migration intent.
- Treat server contract, SSE, WebSocket, and API changes as high risk; verify client and contract impact.
- Treat shared store, routing, layout, and UI primitive changes as broad-impact.
- Keep edits small and source-aware.

Autonomous safety rules:

- never modify blindly
- never trust stale artifacts
- never bypass verification
- never bypass impact analysis
- never mutate generated artifacts manually
- never bypass architecture invariants
- prefer plan mode before execute mode
- do not use execute mode unless the user explicitly wants autonomous patch application

## VERIFY

After source edits, run:

```bash
npm run brain:verify
```

Also run normal project checks requested by the user or required by the repository, such as typecheck, lint, build, or tests.

If verification fails, fix the source issue or stop and report the failure honestly.

## REGENERATE

After source changes that affect architecture, routes, state, contracts, runtime maps, retrieval, or brain tooling, regenerate:

```bash
npm run brain:generate
```

Then verify freshness:

```bash
npm run brain:drift-check
npm run brain:verify
npm run brain:self-audit
```

Do not claim `/brain` is current unless drift-check and verification pass.

## UPDATE MEMORY

At the end of a completed task, record enough information for future agents to understand why the change happened.

Task memory should capture:

- objective
- files changed
- systems affected
- invariants touched
- risks introduced
- verification results
- unresolved issues
- regeneration status

When `brain:execute --mode execute` performs a change successfully, it is responsible for updating memory after verification passes.

For manual agent edits, include the task-memory payload in the final response if no canonical memory update command is available in the universal workflow. Do not mark memory successful when verification failed.

## Final Completion Checklist

Before reporting done:

```bash
npm run brain:generate
npm run brain:verify
npm run brain:drift-check
npm run brain:self-audit
```

Then summarize:

- what changed
- what context was used
- what impact was checked
- which commands passed
- any remaining risks

Keep the workflow simple. The universal runtime is this file plus retrieved context.

