import { promises as fs } from "node:fs";
import path from "node:path";
import type { IndexedDocumentChunk, IndexedDocumentMeta } from "@/types/documents";

interface VectorIndexFile {
  documents: IndexedDocumentMeta[];
  chunks: IndexedDocumentChunk[];
}

const vectorPath = path.join(process.cwd(), "data", "vector-index.json");

async function ensureVectorIndex(): Promise<void> {
  try {
    await fs.access(vectorPath);
  } catch {
    await fs.mkdir(path.dirname(vectorPath), { recursive: true });
    const initial: VectorIndexFile = { documents: [], chunks: [] };
    await fs.writeFile(vectorPath, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readVectorIndex(): Promise<VectorIndexFile> {
  await ensureVectorIndex();
  const raw = await fs.readFile(vectorPath, "utf8");
  return JSON.parse(raw) as VectorIndexFile;
}

export async function writeVectorIndex(index: VectorIndexFile): Promise<void> {
  await fs.writeFile(vectorPath, JSON.stringify(index, null, 2), "utf8");
}

export async function upsertDocumentChunks(
  document: IndexedDocumentMeta,
  chunks: IndexedDocumentChunk[]
): Promise<void> {
  const index = await readVectorIndex();
  const keptDocs = index.documents.filter((item) => item.documentId !== document.documentId);
  const keptChunks = index.chunks.filter((item) => item.documentId !== document.documentId);
  keptDocs.push(document);
  keptChunks.push(...chunks);
  await writeVectorIndex({
    documents: keptDocs,
    chunks: keptChunks
  });
}

export async function removeDocumentChunks(documentId: string): Promise<IndexedDocumentMeta | null> {
  const index = await readVectorIndex();
  const document = index.documents.find((item) => item.documentId === documentId) ?? null;
  if (!document) {
    return null;
  }

  await writeVectorIndex({
    documents: index.documents.filter((item) => item.documentId !== documentId),
    chunks: index.chunks.filter((item) => item.documentId !== documentId)
  });
  return document;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return -1;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return -1;
  return dot / denom;
}

export async function searchDocumentChunks(
  queryEmbedding: number[],
  topK = 5,
  threshold = 0.35
): Promise<IndexedDocumentChunk[]> {
  const index = await readVectorIndex();
  const scored = index.chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((item) => item.chunk);
}
