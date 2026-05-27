import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

type VectorChunk = {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  kind: string;
  text: string;
  tokenWeights: Record<string, number>;
  embedding: number[];
  concepts: string[];
};

type Graph = {
  metadata: Record<string, unknown>;
  nodes: Array<{ id: string; type: string; label: string; file?: string }>;
  edges: Array<{
    id: string;
    type: string;
    source: string;
    target: string;
    confidence: number;
  }>;
};

const ROOT = process.cwd();
const MODEL = process.env.BRAIN_EMBED_MODEL || "Xenova/all-MiniLM-L6-v2";
const CACHE_PATH = path.join(ROOT, "brain/embeddings/query-cache.json");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function tokenize(text: string) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "into",
    "must",
    "should",
    "when",
    "where",
    "what",
  ]);
  return text
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function searchablePath(file: string) {
  return file.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[/_.-]+/g, " ");
}

function hasToken(text: string, token: string) {
  return new Set(tokenize(text)).has(token);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function sparseVector(tokens: string[]) {
  return tokens.reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] ?? 0) + 1;
    return acc;
  }, {});
}

function sparseCosine(a: Record<string, number>, b: Record<string, number>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  keys.forEach((key) => {
    dot += (a[key] ?? 0) * (b[key] ?? 0);
    magA += (a[key] ?? 0) ** 2;
    magB += (b[key] ?? 0) ** 2;
  });
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function vectorCosine(a: number[], b: number[]) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function embedQuery(text: string, sourceHash: string) {
  const cache = fs.existsSync(CACHE_PATH)
    ? (JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) as Record<
        string,
        number[]
      >)
    : {};
  const key = sha256(`${MODEL}:${sourceHash}:${text}`);
  if (cache[key]) return cache[key];
  const { pipeline } = await import("@xenova/transformers");
  const embedder = await pipeline("feature-extraction", MODEL);
  const output = await embedder(
    text.replace(/\s+/g, " ").trim().slice(0, 4000) || "empty",
    { pooling: "mean", normalize: true },
  );
  const vector = Array.from(output.data as Float32Array).map((value) =>
    Number(value.toFixed(6)),
  );
  cache[key] = vector;
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
  return vector;
}

function loadContextPacks() {
  const packsDir = path.join(ROOT, "brain/retrieval/context-packs");
  if (!fs.existsSync(packsDir)) return [];
  return fs
    .readdirSync(packsDir)
    .filter((file) => file.endsWith(".json"))
    .map(
      (file) =>
        JSON.parse(
          fs.readFileSync(path.join(packsDir, file), "utf8"),
        ) as Record<string, unknown>,
    );
}

function packScore(pack: Record<string, unknown>, tokens: string[]) {
  const text = [
    pack.id,
    pack.title,
    ...((pack.invariants as string[] | undefined) ?? []),
    ...((pack.sourceFiles as string[] | undefined) ?? []),
  ]
    .join(" ")
    .toLowerCase();
  const packTokens = new Set(tokenize(text));
  return Math.min(
    1,
    tokens.reduce((sum, token) => sum + (packTokens.has(token) ? 0.25 : 0), 0),
  );
}

function taskMemoryScore(chunk: VectorChunk, tokens: string[]) {
  if (!chunk.file.includes("task-memory")) return 0;
  const text = chunk.text.toLowerCase();
  return Math.min(
    1,
    tokens.reduce((sum, token) => sum + (text.includes(token) ? 0.18 : 0), 0),
  );
}

function graphNeighborScore(
  graph: Graph,
  chunk: VectorChunk,
  seedFiles: Set<string>,
) {
  if (seedFiles.has(chunk.file)) return 1;
  const fileId = `file:${chunk.file}`;
  const neighbor = graph.edges.some((edge) => {
    if (edge.source === fileId) {
      const target = graph.nodes.find((node) => node.id === edge.target);
      return target?.file && seedFiles.has(target.file);
    }
    if (edge.target === fileId) {
      const source = graph.nodes.find((node) => node.id === edge.source);
      return source?.file && seedFiles.has(source.file);
    }
    return false;
  });
  return neighbor ? 0.65 : 0;
}

function confidence(score: number) {
  if (score >= 0.74) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

type ScoredChunk = {
  chunk: VectorChunk;
  semantic: number;
  lexical: number;
  graphScore: number;
  pack: number;
  memory: number;
  total: number;
};

function evidenceConfidenceScore(item: ScoredChunk) {
  const semanticSupport = clamp(item.semantic / 0.18);
  const lexicalSupport = clamp(item.lexical / 0.045);
  const rankSupport = clamp(item.total / 0.34);
  const corroboratingSignals = [
    item.semantic >= 0.12,
    item.lexical >= 0.025,
    item.graphScore >= 0.65,
    item.pack > 0,
    item.memory > 0,
  ].filter(Boolean).length;
  const multiSignalSupport = clamp(corroboratingSignals / 3);

  return clamp(
    rankSupport * 0.22 +
      semanticSupport * 0.24 +
      lexicalSupport * 0.12 +
      item.graphScore * 0.18 +
      item.pack * 0.16 +
      item.memory * 0.03 +
      multiSignalSupport * 0.05,
  );
}

function retrievalConfidenceScore(
  items: Array<ScoredChunk & { confidenceScore: number }>,
) {
  if (!items.length) return 0;
  const topScore = items[0].confidenceScore;
  const topThree = items.slice(0, 3);
  const topThreeAverage =
    topThree.reduce((sum, item) => sum + item.confidenceScore, 0) /
    topThree.length;
  return clamp(Math.max(topScore, topThreeAverage));
}

async function main() {
  const task = process.argv.slice(2).join(" ");
  if (!task.trim())
    throw new Error("Usage: npm run brain:retrieve-semantic -- <task>");
  const index = readJson<{
    metadata: Record<string, unknown>;
    chunks: VectorChunk[];
  }>("brain/retrieval/vector-index.json");
  const graph = readJson<Graph>("brain/knowledge/graph.json");
  const tokens = tokenize(task);
  const querySparse = sparseVector(tokens);
  const queryEmbedding = await embedQuery(
    task,
    String(index.metadata.sourceHash ?? ""),
  );
  const packs = loadContextPacks()
    .map((pack) => ({ pack, score: packScore(pack, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const packFiles = new Set(
    packs.flatMap(
      (item) => (item.pack.sourceFiles as string[] | undefined) ?? [],
    ),
  );
  const namedFiles = new Set(
    index.chunks
      .filter((chunk) => {
        const pathText = searchablePath(chunk.file);
        return tokens.some(
          (token) =>
            hasToken(pathText, token) ||
            (token.length >= 5 && chunk.file.toLowerCase().includes(token)),
        );
      })
      .map((chunk) => chunk.file),
  );
  const seedFiles = new Set([...packFiles, ...namedFiles]);

  const scored = index.chunks
    .map((chunk) => {
      const semantic = vectorCosine(queryEmbedding, chunk.embedding);
      const lexical = sparseCosine(querySparse, chunk.tokenWeights);
      const graphScore = graphNeighborScore(graph, chunk, seedFiles);
      const pack = packFiles.has(chunk.file) ? 1 : 0;
      const memory = taskMemoryScore(chunk, tokens);
      const total =
        semantic * 0.55 +
        lexical * 0.15 +
        graphScore * 0.15 +
        pack * 0.1 +
        memory * 0.05;
      return { chunk, semantic, lexical, graphScore, pack, memory, total };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const selected = new Map<string, (typeof scored)[number]>();
  [...seedFiles].forEach((file) => {
    const best = scored.find((item) => item.chunk.file === file);
    if (best) selected.set(best.chunk.id, best);
  });
  scored.forEach((item) => {
    if (selected.size < 12) selected.set(item.chunk.id, item);
  });

  const calibrated = [...selected.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((item) => ({
      ...item,
      confidenceScore: evidenceConfidenceScore(item),
    }));

  const chunks = calibrated.map((item) => ({
    file: item.chunk.file,
    startLine: item.chunk.startLine,
    endLine: item.chunk.endLine,
    kind: item.chunk.kind,
    score: Number(item.total.toFixed(4)),
    confidenceScore: Number(item.confidenceScore.toFixed(4)),
    confidence: confidence(item.confidenceScore),
    reasons: {
      semantic: Number(item.semantic.toFixed(4)),
      lexical: Number(item.lexical.toFixed(4)),
      graph: Number(item.graphScore.toFixed(4)),
      contextPack: Number(item.pack.toFixed(4)),
      taskMemory: Number(item.memory.toFixed(4)),
    },
    concepts: item.chunk.concepts,
    snippet: item.chunk.text.split(/\r?\n/).slice(0, 36).join("\n"),
  }));

  console.log(
    JSON.stringify(
      {
        task,
        generatedAt: new Date().toISOString(),
        sourceHash: index.metadata.sourceHash,
        model: index.metadata.model,
        retrievalFormula:
          "semantic .55 + lexical .15 + graph .15 + contextPack .10 + taskMemory .05",
        contextPacks: packs.slice(0, 6).map((item) => ({
          id: item.pack.id,
          title: item.pack.title,
          score: item.score,
          sourceFiles: item.pack.sourceFiles,
          invariants: item.pack.invariants,
        })),
        dependencyAwareFiles: [...new Set(chunks.map((chunk) => chunk.file))],
        chunks,
        retrievalConfidenceScore: Number(
          retrievalConfidenceScore(calibrated).toFixed(4),
        ),
        retrievalConfidence: confidence(retrievalConfidenceScore(calibrated)),
        tokenEfficiency: {
          returnedChunks: chunks.length,
          returnedFiles: new Set(chunks.map((chunk) => chunk.file)).size,
          estimatedSnippetLines: chunks.reduce(
            (sum, chunk) =>
              sum + Math.min(36, chunk.endLine - chunk.startLine + 1),
            0,
          ),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
