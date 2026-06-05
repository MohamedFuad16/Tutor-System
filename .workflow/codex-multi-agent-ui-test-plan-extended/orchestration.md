# Orchestration

1. Route through Graphify:
   - Prefer local CLI graph queries against `graphify-out/graph.json` because the current MCP context returned stale nodes.
   - Record all source clusters before opening large source files.

2. Baseline the harness:
   - Read `package.json`, `vite.config.ts`, `tsconfig.json`, and existing tests.
   - Confirm whether runtime UI testing packages already exist.

3. Delegate bounded lead passes:
   - Spawn page/surface leads only for distinct, non-overlapping questions.
   - Leads may inspect focused files and propose or make disjoint test additions when ownership is clear.
   - Leads must not regenerate Graphify, edit `graphify-out`, or revert unrelated work.

4. Main-agent critical path:
   - Keep the workflow state current.
   - Add the first repo-native coverage slice for the highest-risk shared surfaces.
   - Integrate useful lead outputs into stable tests and the final report.

5. Completion rule:
   - Mark a surface complete only when tests exist and pass.
   - Mark a surface partial when coverage is source-level only or dependency-gated.
   - Mark a surface blocked when it requires explicit approval for new dependencies, external calls, or large additional agent fan-out.

6. Verification order:
   - Run focused Node tests for newly added files.
   - Run `npm test`.
   - Run `npm run lint`.
   - Run `npm run build`.
   - Use browser verification only after UI/runtime changes or when a browser harness is available.
