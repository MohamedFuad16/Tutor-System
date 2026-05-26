import { pipeline, env } from '@xenova/transformers';

// Keep local models cached in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;

export async function initEmbeddings() {
  if (!embedder) {
    // we use a small, fast model for embeddings in-browser
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  await initEmbeddings();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
