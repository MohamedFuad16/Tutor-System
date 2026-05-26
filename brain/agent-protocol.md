# Agent Execution Protocol

This protocol is executable. Future agents should use the commands below instead of manually browsing generated JSON.

## Before Editing

Run:

```bash
npm run brain:retrieve -- "<task description>"
npm run brain:impact -- "<file-or-symbol>"
```

Use the retrieved context packs, impacted files, invariants, contracts, and dependency references to decide what source files to inspect.

## During Editing

- Keep changes inside the mutation boundaries in `brain/rules/mutation-boundaries.json`.
- Preserve generated source-of-truth artifacts by rerunning `npm run brain:generate` after structural changes.
- Do not edit generated graph, flow, contract, embedding, impact, or snapshot artifacts by hand.

## Before Completion

Run:

```bash
npm run brain:generate
npm run brain:verify
npm run brain:drift-check
```

If source changes were completed, append task memory:

```bash
npm run brain:memory -- append "<objective>" "<systems>" "<files>" "<invariants>" "<risks>" '{"brain:verify":"pass"}' "<unresolved>" "regenerated"
```

## Failure Conditions

Do not claim the brain is current if:

- `brain:verify` fails.
- `brain:drift-check` reports stale files.
- generated contracts omit endpoints from `server.ts`.
- route views differ from the Zustand `ViewState` union.
- graph nodes include `dist`, `node_modules`, `build`, or `coverage`.
