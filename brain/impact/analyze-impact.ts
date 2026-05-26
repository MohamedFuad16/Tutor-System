import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function exists(file: string) {
  return fs.existsSync(path.join(ROOT, file));
}

function loadRuntimeImpact() {
  if (!exists("brain/runtime/runtime-impact-map.json")) return null;
  const runtime = readJson<{
    metadata?: Record<string, unknown>;
    events?: Array<Record<string, unknown>>;
    observedRoutes?: Array<Record<string, unknown>>;
    observedEndpoints?: Array<Record<string, unknown>>;
  }>("brain/runtime/runtime-impact-map.json");
  return runtime;
}

function main() {
  const target = process.argv.slice(2).join(" ");
  if (!target) throw new Error("Usage: npm run brain:impact -- <file-or-symbol>");
  const impact = readJson<{ metadata: Record<string, unknown>; files: Record<string, unknown>; couplingScores: Record<string, unknown> }>("brain/impact/impact-analysis.json");
  const graph = readJson<{ nodes: Array<{ id: string; label: string; file?: string; type: string }>; edges: Array<{ type: string; source: string; target: string; evidence: unknown }> }>("brain/knowledge/graph.json");
  const runtime = loadRuntimeImpact();
  const matches = Object.keys(impact.files).filter((file) => file.includes(target));
  const nodeMatches = graph.nodes.filter((node) => node.id.includes(target) || node.label.includes(target) || node.file?.includes(target));
  const files = new Set(matches);
  nodeMatches.forEach((node) => {
    if (node.file) files.add(node.file);
    graph.edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .forEach((edge) => {
        const source = graph.nodes.find((candidate) => candidate.id === edge.source);
        const targetNode = graph.nodes.find((candidate) => candidate.id === edge.target);
        if (source?.file) files.add(source.file);
        if (targetNode?.file) files.add(targetNode.file);
      });
  });
  const fileResults = [...files].sort().map((file) => ({ file, impact: impact.files[file] ?? null }));
  const relatedEdges = graph.edges.filter((edge) => {
    const source = graph.nodes.find((node) => node.id === edge.source);
    const targetNode = graph.nodes.find((node) => node.id === edge.target);
    return files.has(source?.file ?? "") || files.has(targetNode?.file ?? "") || nodeMatches.some((node) => node.id === edge.source || node.id === edge.target);
  });
  const runtimeText = [...files, target].join(" ").toLowerCase();
  const runtimeEvents = (runtime?.events ?? []).filter((event) => {
    const haystack = JSON.stringify(event).toLowerCase();
    return [...files].some((file) => haystack.includes(file.toLowerCase().replace(/^src\//, ""))) || haystack.includes(target.toLowerCase()) || runtimeText.includes(String(event.id ?? "").toLowerCase());
  });
  console.log(JSON.stringify({
    target,
    generatedAt: new Date().toISOString(),
    sourceHash: impact.metadata.sourceHash,
    files: fileResults,
    relatedEdges: relatedEdges.slice(0, 80),
    runtime: runtime
      ? {
          sourceHash: runtime.metadata?.sourceHash,
          observedEventCount: runtime.events?.length ?? 0,
          relatedEvents: runtimeEvents.slice(0, 50),
          observedRoutes: runtime.observedRoutes ?? [],
          observedEndpoints: runtime.observedEndpoints ?? [],
        }
      : null,
  }, null, 2));
}

main();
