const EMBEDDING_DIMENSIONS = 384;
const TOKEN_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "into",
  "have",
  "your",
  "you",
  "are",
  "was",
  "were",
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length > 2 && !TOKEN_STOPWORDS.has(token));
}

function fnv1a(value: string, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function normalize(vector: number[]) {
  const magnitude = Math.sqrt(
    vector.reduce((total, value) => total + value * value, 0),
  );
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
}

export async function initEmbeddings() {
  return undefined;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  tokens.forEach((token, index) => {
    const baseHash = fnv1a(token);
    const secondaryHash = fnv1a(`${token}:${index % 17}`, 0x9e3779b9);
    const slot = baseHash % EMBEDDING_DIMENSIONS;
    const sign = secondaryHash % 2 === 0 ? 1 : -1;
    const weight = 1 + Math.log1p(Math.min(token.length, 32));
    vector[slot] += sign * weight;

    if (token.length > 5) {
      const stem = token.slice(0, Math.max(4, Math.floor(token.length * 0.65)));
      const stemSlot = fnv1a(stem, 0x85ebca6b) % EMBEDDING_DIMENSIONS;
      vector[stemSlot] += sign * weight * 0.45;
    }
  });

  return normalize(vector);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < vecA.length; index += 1) {
    dotProduct += vecA[index] * vecB[index];
    normA += vecA[index] * vecA[index];
    normB += vecB[index] * vecB[index];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
