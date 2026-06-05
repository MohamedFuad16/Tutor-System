import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(
  readFileSync(`${repoRoot}/package.json`, "utf8"),
);
const viteSource = readFileSync(`${repoRoot}/vite.config.ts`, "utf8");
const tsconfig = JSON.parse(readFileSync(`${repoRoot}/tsconfig.json`, "utf8"));
const workflowPlan = readFileSync(
  `${repoRoot}/.workflow/codex-multi-agent-ui-test-plan-extended/plan.md`,
  "utf8",
);
const graph = JSON.parse(
  readFileSync(`${repoRoot}/graphify-out/graph.json`, "utf8"),
);

test("package scripts wire the current build, typecheck, test, and Graphify gates", () => {
  assert.match(packageJson.scripts.lint, /tsc --noEmit/);
  assert.match(packageJson.scripts.build, /vite build/);
  assert.match(packageJson.scripts.build, /esbuild server\.ts/);
  assert.equal(
    packageJson.scripts.test,
    "npm run test:node && npm run test:dom",
  );
  assert.match(
    packageJson.scripts["test:node"],
    /node --test tests\/\*\.test\.mjs/,
  );
  assert.match(packageJson.scripts["test:dom"], /vitest run/);
  assert.equal(packageJson.scripts["graphify:query"], "graphify query");
  assert.equal(packageJson.scripts["graphify:path"], "graphify path");
  assert.match(
    packageJson.scripts["graphify:tree"],
    /graphify tree --graph graphify-out\/graph\.json/,
  );
});

test("Vite build keeps Tutor production chunks separated by major architecture surface", () => {
  assert.match(viteSource, /react\(\)/);
  assert.match(viteSource, /tailwindcss\(\)/);
  assert.match(viteSource, /vendor-react/);
  assert.match(viteSource, /vendor-pdf/);
  assert.match(viteSource, /vendor-mermaid/);
  assert.match(viteSource, /vendor-shiki/);
  assert.match(viteSource, /vendor-markdown/);
  assert.match(viteSource, /vendor-dexie/);
  assert.match(viteSource, /vendor-charts/);
  assert.match(viteSource, /modulePreload/);
});

test("TypeScript config is wired for app typechecking and records strictness migration gap", () => {
  assert.equal(tsconfig.compilerOptions.moduleResolution, "bundler");
  assert.equal(tsconfig.compilerOptions.jsx, "react-jsx");
  assert.equal(tsconfig.compilerOptions.noEmit, true);
  assert.equal(tsconfig.compilerOptions.isolatedModules, true);
  assert.deepEqual(tsconfig.include, ["src/**/*"]);

  assert.equal(
    Object.prototype.hasOwnProperty.call(tsconfig.compilerOptions, "strict"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      tsconfig.compilerOptions,
      "noImplicitAny",
    ),
    false,
  );
});

test("workflow records local Graphify authority and avoids generated artifact edits", () => {
  assert.match(
    workflowPlan,
    /Repo-local Graphify CLI with `graphify-out\/graph\.json`/,
  );
  assert.match(workflowPlan, /Do not manually edit `graphify-out` artifacts\./);
  assert.match(workflowPlan, /Graphify MCP appears stale for this checkout/);
  assert.match(workflowPlan, /Adding new test dependencies such as Vitest/);
});

test("Graphify source inventory covers every Tutor page and reusable component", () => {
  const graphSourceFiles = new Set(
    graph.nodes.map((node) => node.source_file).filter(Boolean),
  );
  const architectureFiles = [
    "src/App.tsx",
    "src/main.tsx",
    ...readdirSync(`${repoRoot}/src/components`)
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => `src/components/${file}`),
    ...readdirSync(`${repoRoot}/src/views`)
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => `src/views/${file}`),
  ];

  for (const sourceFile of architectureFiles) {
    assert.equal(
      graphSourceFiles.has(sourceFile),
      true,
      `Graphify is missing ${sourceFile}`,
    );
  }

  assert.equal(
    graph.nodes.some((node) => node.label === "App()"),
    true,
  );
  assert.equal(
    graph.nodes.some((node) => node.label === "StudyView()"),
    true,
  );
  assert.equal(
    graph.nodes.some((node) => node.label === "AnalyticsView()"),
    true,
  );
  assert.equal(
    graph.nodes.some((node) => node.label === "RevisionView()"),
    true,
  );
  assert.equal(
    graph.nodes.some((node) => node.label === "AdminView()"),
    true,
  );
});
