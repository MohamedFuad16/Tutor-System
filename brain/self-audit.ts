import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const THRESHOLD = Number(process.env.BRAIN_SELF_AUDIT_THRESHOLD || 85);

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function exists(file: string) {
  return fs.existsSync(path.join(ROOT, file));
}

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), content);
}

function score(condition: boolean, value: number) {
  return condition ? value : 0;
}

function runJson(
  command: string,
  args: string[],
  env: Record<string, string> = {},
) {
  return JSON.parse(
    execFileSync(command, args, {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, ...env },
    }),
  );
}

function retrievalBenchmark() {
  const tasks: Record<string, string[]> = {
    "add dashboard feature": [
      "src/App.tsx",
      "src/components/Navigation.tsx",
      "src/store/index.ts",
    ],
    "refactor Zustand store": [
      "src/store/index.ts",
      "src/App.tsx",
      "src/components/ChatPanel.tsx",
    ],
    "modify route layout": [
      "src/App.tsx",
      "src/components/Navigation.tsx",
      "src/views/StudyView.tsx",
    ],
    "modify SSE streaming": [
      "server.ts",
      "src/components/ChatPanel.tsx",
      "brain/contracts/api-contracts.json",
    ],
    "change shared UI animations": [
      "src/components/SiriLiquidGlass.tsx",
      "src/components/SettingsModal.tsx",
      "src/components/ChatPanel.tsx",
    ],
    "modify Dexie schema": [
      "src/memory/longterm.memory.ts",
      "src/memory/memory.orchestrator.ts",
      "src/views/RevisionView.tsx",
    ],
  };
  const confidenceWeight = (label: string) =>
    label === "high" ? 1 : label === "medium" ? 0.72 : 0.48;
  const results = Object.entries(tasks).map(([task, expected]) => {
    const retrieved = runJson("npm", [
      "run",
      "--silent",
      "brain:retrieve-semantic",
      "--",
      task,
    ]);
    const files = new Set<string>([
      ...(retrieved.dependencyAwareFiles ?? []),
      ...(retrieved.chunks ?? []).map((chunk: { file: string }) => chunk.file),
      ...(retrieved.contextPacks ?? []).flatMap(
        (pack: { sourceFiles?: string[] }) => pack.sourceFiles ?? [],
      ),
    ]);
    const hits = expected.filter((file) => files.has(file));
    const confidenceScore =
      typeof retrieved.retrievalConfidenceScore === "number"
        ? retrieved.retrievalConfidenceScore
        : confidenceWeight(String(retrieved.retrievalConfidence));
    return {
      task,
      expected,
      hits,
      recall: hits.length / expected.length,
      confidence: retrieved.retrievalConfidence,
      confidenceScore,
    };
  });
  const recall =
    results.reduce((sum, result) => sum + result.recall, 0) / results.length;
  const confidenceAverage =
    results.reduce((sum, result) => sum + result.confidenceScore, 0) /
    results.length;
  return { recall, confidenceAverage, results };
}

function main() {
  const graph = readJson<{
    metadata: Record<string, unknown>;
    nodes: unknown[];
    edges: unknown[];
  }>("brain/knowledge/graph.json");
  const vector = exists("brain/retrieval/vector-index.json")
    ? readJson<{ metadata: Record<string, unknown>; chunks: unknown[] }>(
        "brain/retrieval/vector-index.json",
      )
    : null;
  const runtime = exists("brain/runtime/runtime-impact-map.json")
    ? readJson<{ metadata: Record<string, unknown>; events: unknown[] }>(
        "brain/runtime/runtime-impact-map.json",
      )
    : null;
  const contracts = readJson<{
    endpoints: Record<string, unknown>;
    websockets: Record<string, unknown>;
  }>("brain/contracts/api-contracts.json");
  const routes = readJson<{ routes: unknown[] }>("brain/flows/route-map.json");
  const state = readJson<{ fields: unknown[] }>("brain/flows/state-flow.json");
  const memory = readJson<unknown[]>("brain/tasks/task-memory.json");
  const loaders = exists("brain/loaders/index.json")
    ? readJson<{ loaders: string[] }>("brain/loaders/index.json")
    : { loaders: [] };
  const retrieval = vector
    ? retrievalBenchmark()
    : { recall: 0, confidenceAverage: 0, results: [] };

  const checks = {
    graphFreshness: score(
      Boolean(
        graph.metadata.sourceHash &&
        graph.nodes.length > 0 &&
        graph.edges.length > 0,
      ),
      12,
    ),
    vectorFreshness: score(
      Boolean(
        vector &&
        vector.metadata.sourceHash === graph.metadata.sourceHash &&
        vector.chunks.length > 0,
      ),
      14,
    ),
    retrievalQuality: Math.round(
      Math.min(1, retrieval.recall) *
        Math.min(1, retrieval.confidenceAverage ?? 0) *
        16,
    ),
    runtimeCoverage: score(
      Boolean(
        runtime &&
        runtime.metadata.sourceHash === graph.metadata.sourceHash &&
        runtime.events.length > 0,
      ),
      14,
    ),
    contractCoverage: score(
      Object.keys(contracts.endpoints).length >= 5 &&
        Object.keys(contracts.websockets).length >= 2,
      10,
    ),
    routeStateCoverage: score(
      routes.routes.length >= 5 && state.fields.length > 0,
      10,
    ),
    ruleCompliance: score(
      runJson("npm", ["run", "--silent", "brain:verify"], {
        BRAIN_SKIP_SELF_AUDIT_CHECK: "1",
      }).ok === true,
      10,
    ),
    taskMemoryContinuity: score(memory.length >= 2, 7),
    loaderCoverage: score(loaders.loaders.length >= 8, 7),
  };
  const scoreTotal = Object.values(checks).reduce(
    (sum, value) => sum + value,
    0,
  );
  const report = {
    ok: scoreTotal >= THRESHOLD,
    generatedAt: new Date().toISOString(),
    threshold: THRESHOLD,
    score: scoreTotal,
    checks,
    retrievalBenchmark: retrieval,
    unresolvedWeaknesses: [
      ...(runtime?.events?.length
        ? []
        : ["Runtime benchmark did not capture events."]),
      ...(vector ? [] : ["Semantic vector index is missing."]),
      ...((retrieval.confidenceAverage ?? 0) >= 0.72
        ? []
        : [
            "Retrieval benchmark hit expected files but confidence remains low; ranking calibration needs real-world tuning.",
          ]),
    ],
  };

  write(
    "brain/verification/self-audit-report.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  write(
    "brain/verification/cognition-health-report.md",
    `# Cognition Health Report\n\nScore: ${scoreTotal} / 100\n\nStatus: ${report.ok ? "PASS" : "FAIL"}\n\n## Checks\n\n${Object.entries(
      checks,
    )
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n")}\n`,
  );
  write(
    "brain/verification/architecture-confidence-report.md",
    `# Architecture Confidence Report\n\nGenerated: ${report.generatedAt}\n\n- Graph nodes: ${graph.nodes.length}\n- Graph edges: ${graph.edges.length}\n- Vector chunks: ${vector?.chunks.length ?? 0}\n- Runtime events: ${runtime?.events.length ?? 0}\n- Retrieval benchmark recall: ${retrieval.recall.toFixed(2)}\n- Retrieval confidence average: ${(retrieval.confidenceAverage ?? 0).toFixed(2)}\n- Overall autonomous-readiness score: ${scoreTotal}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();
