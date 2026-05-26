import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const ROOT = process.cwd();
const requiredArtifacts = [
  "brain/knowledge/graph.json",
  "brain/knowledge/schema.json",
  "brain/contracts/api-contracts.json",
  "brain/flows/route-map.json",
  "brain/flows/state-flow.json",
  "brain/flows/render-graph.json",
  "brain/impact/impact-analysis.json",
  "brain/embeddings/chunks.json",
  "brain/retrieval/vector-index.json",
  "brain/runtime/runtime-impact-map.json",
  "brain/runtime/rerender-graph.json",
  "brain/runtime/propagation-map.json",
  "brain/runtime/runtime-hotspots.json",
  "brain/compressed-context/subsystems.json",
  "brain/snapshots/file-hashes.json",
  "brain/loaders/index.json",
  "brain/tasks/decision-chains.json",
  "brain/tasks/risk-history.json",
  "brain/tasks/fragile-systems.json",
];

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function exists(file: string) {
  return fs.existsSync(path.join(ROOT, file));
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileText(file: string) {
  const absolute = path.join(ROOT, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

function fail(failures: string[], message: string) {
  failures.push(message);
}

function retrievalDocFiles() {
  const contextPackDir = path.join(ROOT, "brain/retrieval/context-packs");
  return [
    "brain/architecture.md",
    "brain/context.md",
    "brain/agent-protocol.md",
    "brain/contracts/api-contracts.json",
    "brain/rules/architecture-rules.json",
    "brain/rules/mutation-boundaries.json",
    "brain/rules/ui-invariants.json",
    "brain/tasks/task-memory.json",
    ...(fs.existsSync(contextPackDir) ? fs.readdirSync(contextPackDir).filter((file) => file.endsWith(".json")).map((file) => `brain/retrieval/context-packs/${file}`) : []),
  ].filter(exists);
}

function expectedVectorCorpusHash(chunks: Array<{ file: string; startLine: number; endLine: number; hash: string }>) {
  const sourcePart = chunks.map((chunk) => `${chunk.file}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}`).sort();
  const docPart = retrievalDocFiles().map((file) => `${file}:${sha256(fileText(file))}`).sort();
  return sha256([...sourcePart, ...docPart].join("\n"));
}

function extractViewStateLiterals() {
  const store = fs.readFileSync(path.join(ROOT, "src/store/index.ts"), "utf8");
  const match = store.match(/export\s+type\s+ViewState\s*=\s*([^;]+)/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]).sort();
}

function extractServerEndpoints() {
  const server = fs.readFileSync(path.join(ROOT, "server.ts"), "utf8");
  const http = [...server.matchAll(/app\.(get|post|put|patch|delete)\(["'`]([^"'`]+)["'`]/g)].map((match) => `${match[1].toUpperCase()} ${match[2]}`);
  const ws = [...server.matchAll(/pathname\s*===\s*["'`]([^"'`]+)["'`]/g)].map((match) => `WS ${match[1]}`);
  return [...http, ...ws].sort();
}

function main() {
  const failures: string[] = [];
  const warnings: string[] = [];

  requiredArtifacts.forEach((artifact) => {
    if (!exists(artifact)) fail(failures, `Missing required artifact: ${artifact}`);
  });

  if (failures.length === 0) {
    const graph = readJson<{ metadata?: Record<string, unknown>; nodes: Array<{ id: string; file?: string }>; edges: unknown[] }>("brain/knowledge/graph.json");
    const contracts = readJson<{ endpoints: Record<string, unknown>; websockets: Record<string, unknown> }>("brain/contracts/api-contracts.json");
    const routes = readJson<{ routes: Array<{ view: string; component: string }> }>("brain/flows/route-map.json");
    const state = readJson<{ fields: Array<{ field: string; readers: string[]; writers: string[] }> }>("brain/flows/state-flow.json");
    const chunks = readJson<{ chunks: unknown[] }>("brain/embeddings/chunks.json");
    const vector = readJson<{ metadata?: Record<string, unknown>; chunks: unknown[] }>("brain/retrieval/vector-index.json");
    const runtime = readJson<{ metadata?: Record<string, unknown>; events?: unknown[] }>("brain/runtime/runtime-impact-map.json");
    const loaders = readJson<{ loaders?: string[] }>("brain/loaders/index.json");
    const decisionChains = readJson<{ chains?: unknown[] }>("brain/tasks/decision-chains.json");
    const riskHistory = readJson<{ risks?: unknown[] }>("brain/tasks/risk-history.json");
    const fragileSystems = readJson<{ systems?: unknown[] }>("brain/tasks/fragile-systems.json");
    const packageJson = readJson<{ dependencies?: Record<string, string> }>("package.json");

    if (!graph.metadata?.generatedAt || !graph.metadata?.sourceHash) fail(failures, "Graph metadata must include generatedAt and sourceHash.");
    if (graph.nodes.length === 0 || graph.edges.length === 0) fail(failures, "Graph must contain typed nodes and edges.");
    graph.nodes.forEach((node) => {
      if (node.file && /^(dist|node_modules|build|coverage)\//.test(node.file)) {
        fail(failures, `Graph contains excluded generated path: ${node.file}`);
      }
    });

    const serverEndpoints = extractServerEndpoints();
    const contractEndpoints = [
      ...Object.keys(contracts.endpoints ?? {}),
      ...Object.keys(contracts.websockets ?? {}).map((endpoint) => `WS ${endpoint}`),
    ].sort();
    serverEndpoints.forEach((endpoint) => {
      if (!contractEndpoints.includes(endpoint)) fail(failures, `Contract missing server endpoint: ${endpoint}`);
    });
    contractEndpoints.forEach((endpoint) => {
      if (!serverEndpoints.includes(endpoint)) fail(failures, `Contract endpoint is stale or not served: ${endpoint}`);
    });

    const viewState = extractViewStateLiterals();
    const routeViews = routes.routes.map((route) => route.view).sort();
    viewState.forEach((view) => {
      if (!routeViews.includes(view)) fail(failures, `Route map missing ViewState value: ${view}`);
    });
    routeViews.forEach((view) => {
      if (!viewState.includes(view)) fail(failures, `Route map contains view not present in ViewState: ${view}`);
    });

    if (!state.fields.some((field) => field.field === "activeView" && field.readers.includes("src/App.tsx"))) {
      fail(failures, "State flow must map activeView usage in src/App.tsx.");
    }
    if (!state.fields.some((field) => field.field === "setActiveView" && field.writers.length > 0)) {
      fail(failures, "State flow must identify setActiveView writers.");
    }

    if (!exists("src/memory/longterm.memory.ts")) fail(failures, "Dexie source of truth must exist at src/memory/longterm.memory.ts.");
    const mutationBoundaries = readJson<Record<string, { file?: string }>>("brain/rules/mutation-boundaries.json");
    if (mutationBoundaries.indexedDB_dexie?.file !== "src/memory/longterm.memory.ts") {
      fail(failures, "Mutation boundary for Dexie must point to src/memory/longterm.memory.ts.");
    }

    const architecture = fs.readFileSync(path.join(ROOT, "brain/architecture.md"), "utf8");
    const reactVersion = packageJson.dependencies?.react ?? "";
    if (reactVersion && !architecture.includes(`React ${reactVersion.replace(/^[^0-9]*/, "").split(".")[0]}`)) {
      warnings.push(`Architecture docs do not clearly mention package React major version ${reactVersion}.`);
    }

    if (chunks.chunks.length === 0) fail(failures, "Retrieval chunks must not be empty.");
    if (vector.metadata?.sourceHash !== graph.metadata.sourceHash) fail(failures, "Semantic vector index is stale relative to graph sourceHash.");
    if (vector.metadata?.corpusHash !== expectedVectorCorpusHash(chunks.chunks as Array<{ file: string; startLine: number; endLine: number; hash: string }>)) {
      fail(failures, "Semantic vector index is stale relative to retrieval corpus content.");
    }
    if (vector.chunks.length === 0) fail(failures, "Semantic vector index must contain chunks.");
    if (runtime.metadata?.sourceHash !== graph.metadata.sourceHash) fail(failures, "Runtime impact map is stale relative to graph sourceHash.");
    if (!runtime.events || runtime.events.length === 0) fail(failures, "Runtime impact map must contain observed runtime events.");
    if ((loaders.loaders ?? []).length < 8) fail(failures, "Cross-model loader index must list all required loaders.");
    for (const loader of loaders.loaders ?? []) {
      if (!exists(`brain/loaders/${loader}.md`)) fail(failures, `Missing cross-model loader: brain/loaders/${loader}.md`);
    }
    if (!Array.isArray(decisionChains.chains)) fail(failures, "Decision-chain memory index is invalid.");
    if (!Array.isArray(riskHistory.risks)) fail(failures, "Risk-history memory index is invalid.");
    if (!Array.isArray(fragileSystems.systems)) fail(failures, "Fragile-systems memory index is invalid.");
    if (!process.env.BRAIN_SKIP_SELF_AUDIT_CHECK) {
      if (!exists("brain/verification/self-audit-report.json")) fail(failures, "Missing self-audit report.");
      else {
        const selfAudit = readJson<{ score?: number; ok?: boolean }>("brain/verification/self-audit-report.json");
        if (!selfAudit.ok || (selfAudit.score ?? 0) < 85) fail(failures, "Self-audit score is below autonomous-ready threshold.");
      }
    }
  }

  const result = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    failures,
    warnings,
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length > 0) process.exit(1);
}

main();
