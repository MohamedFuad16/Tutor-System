# P07 Build/Graphify Lead

Objective:
Audit build/type/Graphify verification: Vite build, TypeScript settings, production output, dev/prod parity risks, Tailwind setup, GSAP/reduced-motion hooks, and local Graphify evidence.

Graphify files:
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `src/App.tsx`
- `src/hooks/useMotionPreference.ts`
- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`

Ownership:
- Proposed or direct test changes under `tests/build-*.test.mjs` and workflow results.

Do:
- Record type-strictness gaps such as missing `strict` or `noImplicitAny`.
- Validate build script expectations without changing Graphify artifacts.
- Identify build-output smoke checks that fit the current scripts.

Do not:
- Run `graphify:update` unless explicitly requested.
- Edit generated Graphify files.

Expected output:
- Build/type/Graphify coverage notes and changed tests if stable.

Verification:
- `npm run lint`, `npm run build`, and relevant focused tests.
