# Packet ADF: Local postchange preflight

## Objective

Close the repeated `brain:postchange` workflow failure with a truthful local
compatibility preflight that uses the checks this checkout actually supports.

## Context

- `AGENTS.md` says Graphify is the repository architecture graph and the old
  custom architecture runtime has been removed.
- The Tutor debug skill and many workflow packets still attempted
  `npm run brain:postchange -- --reason ...`, but `package.json` had no such
  script.
- This packet must not reintroduce a custom architecture runtime or regenerate
  `graphify-out` implicitly.

## Do

- Add a `brain:postchange` package script backed by a small local Node wrapper.
- Run real local gates: format check, typecheck, production build, diff
  whitespace check, and Graphify scratch-reference scan.
- Keep full tests opt-in through `--full`.
- Document that Graphify remains the code architecture graph.

## Do Not

- Do not create a `brain/` runtime directory.
- Do not edit `graphify-out` manually.
- Do not call providers, start the microphone, or begin AWS/cloud work.

## Verification

- `npm run brain:postchange -- --reason skill-preflight`
- `npm run test`
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify scratch-contamination scan
