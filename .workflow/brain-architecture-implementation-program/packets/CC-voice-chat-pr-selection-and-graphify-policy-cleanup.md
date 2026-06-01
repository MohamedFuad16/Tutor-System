# Packet CC: voice chat PR selection and Graphify policy cleanup

## Scope

Select only the useful voice-chat pieces from MegaaDev's open PR #4
(`audio-orc`) and keep unrelated PR features out of this branch. Remove the
GitHub Actions Graphify refresh workflow as requested, then regenerate Graphify
locally because this phase explicitly changes the code architecture graph.

## Boundaries

- Do not copy PR image-search, generated Mermaid endpoint, visual tool-calling
  functions, or unrelated multi-PDF work.
- Keep AWS/cloud work deferred.
- Preserve unrelated untracked `.workflow/*` directories and unrelated dirty
  work.

## Target Files

- `server.ts`
- `src/components/ChatPanel.tsx`
- `src/store/index.ts`
- `src/types.ts`
- `AGENTS.md`
- `README.md`
- `TUTOR_ARCHITECTURE.md`
- `package.json`
- `.github/workflows/graphify-refresh.yml`
- `graphify-out/*`
