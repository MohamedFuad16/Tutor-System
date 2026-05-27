import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

type VectorChunk = {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  hash: string;
  kind: string;
  text: string;
  tokenWeights: Record<string, number>;
  embedding: number[];
  concepts: string[];
};

const ROOT = process.cwd();
const MODEL = process.env.BRAIN_EMBED_MODEL || "Xenova/all-MiniLM-L6-v2";
const VECTOR_INDEX = path.join(ROOT, "brain/retrieval/vector-index.json");
const CACHE_PATH = path.join(ROOT, "brain/embeddings/cache.json");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
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
    "const",
    "return",
    "import",
    "export",
  ]);
  return text
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function sparseVector(text: string) {
  return tokenize(text).reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] ?? 0) + 1;
    return acc;
  }, {});
}

function fileText(file: string) {
  const absolute = path.join(ROOT, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

function snippet(file: string, startLine: number, endLine: number) {
  return fileText(file)
    .split(/\r?\n/)
    .slice(startLine - 1, endLine)
    .join("\n");
}

function conceptsFor(text: string) {
  const tokens = Object.entries(sparseVector(text))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([token]) => token);
  return tokens;
}

function chunkText(file: string, text: string, kind: string, size = 90) {
  const lines = text.split(/\r?\n/);
  const chunks: Array<Omit<VectorChunk, "embedding">> = [];
  for (let start = 0; start < lines.length; start += size) {
    const part = lines.slice(start, start + size).join("\n");
    if (!part.trim()) continue;
    chunks.push({
      id: sha256(`${file}:${kind}:${start + 1}:${part}`).slice(0, 20),
      file,
      startLine: start + 1,
      endLine: start + lines.slice(start, start + size).length,
      hash: sha256(part),
      kind,
      text: part,
      tokenWeights: sparseVector(part),
      concepts: conceptsFor(part),
    });
  }
  return chunks;
}

function docFiles() {
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
    ...(fs.existsSync(contextPackDir)
      ? fs
          .readdirSync(contextPackDir)
          .filter((file) => file.endsWith(".json"))
          .map((file) => `brain/retrieval/context-packs/${file}`)
      : []),
  ].filter((file) => fs.existsSync(path.join(ROOT, file)));
}

function corpusHash(
  sourceChunks: Array<{
    file: string;
    startLine: number;
    endLine: number;
    hash: string;
  }>,
  docs: string[],
) {
  const sourcePart = sourceChunks
    .map(
      (chunk) =>
        `${chunk.file}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}`,
    )
    .sort();
  const docPart = docs
    .map((file) => `${file}:${sha256(fileText(file))}`)
    .sort();
  return sha256([...sourcePart, ...docPart].join("\n"));
}

function collectChunks() {
  const sourceChunks = readJson<{
    metadata: Record<string, unknown>;
    chunks: Array<{
      file: string;
      startLine: number;
      endLine: number;
      hash: string;
      tokenWeights: Record<string, number>;
    }>;
  }>("brain/embeddings/chunks.json");
  const chunks: Array<Omit<VectorChunk, "embedding">> = sourceChunks.chunks.map(
    (chunk) => {
      const text = snippet(chunk.file, chunk.startLine, chunk.endLine);
      return {
        id: chunk.hash.slice(0, 20),
        file: chunk.file,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        hash: chunk.hash,
        kind: "source",
        text,
        tokenWeights: chunk.tokenWeights,
        concepts: conceptsFor(text),
      };
    },
  );

  const docs = docFiles();

  docs.forEach((file) =>
    chunks.push(
      ...chunkText(
        file,
        fileText(file),
        file.endsWith(".json") ? "generated-artifact" : "brain-doc",
        70,
      ),
    ),
  );
  return {
    metadata: sourceChunks.metadata,
    chunks,
    corpusHash: corpusHash(sourceChunks.chunks, docs),
  };
}

function cosine(a: number[], b: number[]) {
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

async function getEmbedder() {
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", MODEL);
}

async function embedText(embedder: any, text: string) {
  const normalized = text.replace(/\s+/g, " ").trim().slice(0, 4000);
  const output = await embedder(normalized || "empty", {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data as Float32Array).map((value) =>
    Number(value.toFixed(6)),
  );
}

function loadCache(): Record<string, number[]> {
  return fs.existsSync(CACHE_PATH)
    ? readJson<Record<string, number[]>>(CACHE_PATH)
    : {};
}

function clusterChunks(chunks: VectorChunk[]) {
  const buckets = new Map<string, VectorChunk[]>();
  chunks.forEach((chunk) => {
    const key = chunk.file.startsWith("src/memory/")
      ? "memory"
      : chunk.file.startsWith("src/components/")
        ? "components"
        : chunk.file.startsWith("src/views/")
          ? "views"
          : chunk.file.startsWith("brain/")
            ? "brain"
            : chunk.file === "server.ts"
              ? "backend"
              : chunk.file.includes("store")
                ? "state"
                : "core";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(chunk);
  });
  return [...buckets.entries()].map(([id, items]) => ({
    id,
    size: items.length,
    files: [...new Set(items.map((item) => item.file))].sort(),
    topConcepts: conceptsFor(
      items.flatMap((item) => item.concepts).join(" "),
    ).slice(0, 16),
  }));
}

async function main() {
  const { metadata, chunks, corpusHash } = collectChunks();
  const sourceHash = String(metadata.sourceHash ?? "");
  const cache = loadCache();
  const embedder = await getEmbedder();
  const vectorChunks: VectorChunk[] = [];

  for (const chunk of chunks) {
    const cacheKey = sha256(`${MODEL}:${sourceHash}:${chunk.hash}`);
    const embedding =
      cache[cacheKey] ??
      (await embedText(
        embedder,
        `${chunk.file}\n${chunk.kind}\n${chunk.text}`,
      ));
    cache[cacheKey] = embedding;
    vectorChunks.push({ ...chunk, embedding });
  }

  const similarityMaps = vectorChunks.map((chunk) => ({
    id: chunk.id,
    file: chunk.file,
    nearest: vectorChunks
      .filter((candidate) => candidate.id !== chunk.id)
      .map((candidate) => ({
        id: candidate.id,
        file: candidate.file,
        score: Number(cosine(chunk.embedding, candidate.embedding).toFixed(4)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
  }));

  writeJson(CACHE_PATH, cache);
  writeJson(VECTOR_INDEX, {
    metadata: {
      generatedAt: new Date().toISOString(),
      model: MODEL,
      sourceHash,
      corpusHash,
      algorithm: "xenova-all-minilm-l6-v2-hybrid-v1",
      chunkCount: vectorChunks.length,
      embeddingDimensions: vectorChunks[0]?.embedding.length ?? 0,
    },
    chunks: vectorChunks,
    similarityMaps,
    conceptClusters: clusterChunks(vectorChunks),
  });
  writeJson(path.join(ROOT, "brain/embeddings/metadata.json"), {
    ...metadata,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    algorithm: "xenova-all-minilm-l6-v2-hybrid-v1",
    chunkCount: vectorChunks.length,
    vectorIndex: "brain/retrieval/vector-index.json",
  });

  console.log(
    `Semantic vector index generated: ${vectorChunks.length} chunks with ${vectorChunks[0]?.embedding.length ?? 0} dimensions.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
