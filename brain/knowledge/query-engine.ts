import * as fs from "fs";
import * as path from "path";

type GraphNode = {
  id: string;
  type: string;
  label: string;
  file?: string;
  metadata?: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  type: string;
  source: string;
  target: string;
  confidence: number;
  evidence: { file: string; line?: number; text?: string };
};

type Graph = {
  metadata: Record<string, unknown>;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

const ROOT = process.cwd();
const GRAPH_PATH = path.join(ROOT, "brain/knowledge/graph.json");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadGraph(): Graph {
  if (!fs.existsSync(GRAPH_PATH)) {
    throw new Error("Missing brain/knowledge/graph.json. Run npm run brain:generate first.");
  }
  return readJson<Graph>(GRAPH_PATH);
}

function nodeName(graph: Graph, id: string) {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  return node ? `${node.label} (${node.type})` : id;
}

function findNodes(graph: Graph, query: string) {
  const normalized = query.toLowerCase();
  return graph.nodes.filter((node) => {
    return (
      node.id.toLowerCase() === normalized ||
      node.id.toLowerCase().includes(normalized) ||
      node.label.toLowerCase().includes(normalized) ||
      node.file?.toLowerCase().includes(normalized)
    );
  });
}

function relatedEdges(graph: Graph, nodeIds: string[], types?: string[]) {
  const typeSet = types ? new Set(types) : undefined;
  return graph.edges.filter((edge) => {
    if (typeSet && !typeSet.has(edge.type)) return false;
    return nodeIds.includes(edge.source) || nodeIds.includes(edge.target);
  });
}

function dependsOn(graph: Graph, query: string) {
  const nodes = findNodes(graph, query);
  const ids = nodes.map((node) => node.id);
  const dependents = graph.edges
    .filter((edge) => ["imports", "dependsOn"].includes(edge.type) && ids.includes(edge.target))
    .map((edge) => ({ dependent: nodeName(graph, edge.source), edge: edge.type, evidence: edge.evidence }));
  const dependencies = graph.edges
    .filter((edge) => ["imports", "dependsOn"].includes(edge.type) && ids.includes(edge.source))
    .map((edge) => ({ dependency: nodeName(graph, edge.target), edge: edge.type, evidence: edge.evidence }));
  return { query, matchedNodes: nodes, dependencies, dependents };
}

function rerendersFrom(graph: Graph, query: string) {
  const nodes = findNodes(graph, query);
  const ids = nodes.map((node) => node.id);
  const readers = graph.edges
    .filter((edge) => ["readsStore", "usesState"].includes(edge.type) && ids.includes(edge.target))
    .map((edge) => nodeName(graph, edge.source));
  const renderParents = graph.edges
    .filter((edge) => edge.type === "renders" && ids.includes(edge.target))
    .map((edge) => nodeName(graph, edge.source));
  const renderChildren = graph.edges
    .filter((edge) => edge.type === "renders" && ids.includes(edge.source))
    .map((edge) => nodeName(graph, edge.target));
  return {
    query,
    matchedNodes: nodes,
    rerenderCandidates: [...new Set([...readers, ...renderParents])],
    renderedChildren: [...new Set(renderChildren)],
  };
}

function apiImpact(graph: Graph, query: string) {
  const nodes = findNodes(graph, query);
  const ids = nodes.map((node) => node.id);
  const calls = graph.edges
    .filter((edge) => edge.type === "callsEndpoint" && ids.includes(edge.source))
    .map((edge) => ({ endpoint: nodeName(graph, edge.target), client: nodeName(graph, edge.source), evidence: edge.evidence }));
  const served = graph.edges
    .filter((edge) => edge.type === "servedBy" && ids.includes(edge.target))
    .map((edge) => ({ endpoint: nodeName(graph, edge.source), server: nodeName(graph, edge.target), evidence: edge.evidence }));
  const clientsOfServed = served.flatMap((servedEndpoint) => {
    const endpoint = graph.nodes.find((node) => nodeName(graph, node.id) === servedEndpoint.endpoint);
    if (!endpoint) return [];
    const pathValue = endpoint.metadata?.path;
    return graph.edges
      .filter((edge) => edge.type === "callsEndpoint")
      .filter((edge) => edge.target === endpoint.id || graph.nodes.find((node) => node.id === edge.target)?.label.includes(String(pathValue)))
      .map((edge) => ({ endpoint: servedEndpoint.endpoint, client: nodeName(graph, edge.source), evidence: edge.evidence }));
  });
  return { query, matchedNodes: nodes, calls, served, clientsOfServed };
}

function routeLayouts(graph: Graph, query = "") {
  const routeNodes = query ? findNodes(graph, query).filter((node) => node.type === "route") : graph.nodes.filter((node) => node.type === "route");
  const ids = routeNodes.map((node) => node.id);
  return routeNodes.map((route) => ({
    route: route.label,
    wrappers: graph.edges.filter((edge) => edge.type === "wraps" && edge.target === route.id).map((edge) => nodeName(graph, edge.source)),
    renders: graph.edges.filter((edge) => edge.type === "renders" && edge.source === route.id).map((edge) => nodeName(graph, edge.target)),
    evidence: graph.edges.find((edge) => edge.target === route.id || edge.source === route.id)?.evidence,
  }));
}

function stateFlow(graph: Graph, query = "") {
  const stateNodes = graph.nodes.filter((node) => node.type === "storeField" && (!query || node.label.toLowerCase().includes(query.toLowerCase())));
  return stateNodes.map((node) => ({
    field: node.label,
    readers: graph.edges.filter((edge) => edge.type === "readsStore" && edge.target === node.id).map((edge) => nodeName(graph, edge.source)),
    writers: graph.edges.filter((edge) => edge.type === "writesStore" && edge.target === node.id).map((edge) => nodeName(graph, edge.source)),
  }));
}

function coupledSystems(graph: Graph) {
  const impactPath = path.join(ROOT, "brain/impact/impact-analysis.json");
  const impact = fs.existsSync(impactPath) ? readJson<{ couplingScores?: Record<string, { score: number; edgeTypes: Record<string, number> }> }>(impactPath) : {};
  return Object.entries(impact.couplingScores ?? {})
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 20)
    .map(([pair, data]) => ({ pair, ...data }));
}

function naturalQuery(graph: Graph, query: string) {
  const terms = query.toLowerCase().split(/[^a-z0-9_/-]+/).filter(Boolean);
  const scoredNodes = graph.nodes
    .map((node) => {
      const haystack = [node.id, node.type, node.label, node.file, JSON.stringify(node.metadata ?? {})].join(" ").toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { node, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((item) => item.node);
  const edges = relatedEdges(graph, scoredNodes.map((node) => node.id)).slice(0, 30);
  return { query, matchedNodes: scoredNodes, edges };
}

function main() {
  const graph = loadGraph();
  const [command = "query", ...rest] = process.argv.slice(2);
  const query = rest.join(" ");
  const result =
    command === "depends"
      ? dependsOn(graph, query)
      : command === "rerenders"
        ? rerendersFrom(graph, query)
        : command === "api"
          ? apiImpact(graph, query)
          : command === "layouts"
            ? routeLayouts(graph, query)
            : command === "state"
              ? stateFlow(graph, query)
              : command === "coupled"
                ? coupledSystems(graph)
                : naturalQuery(graph, query || command);
  console.log(JSON.stringify(result, null, 2));
}

main();
