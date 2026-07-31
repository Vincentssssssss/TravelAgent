interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

type EmbeddingMode = "remote" | "local" | "auto";

function resolveEmbeddingMode(): EmbeddingMode {
  const raw = (process.env.EMBEDDING_MODE ?? "auto").toLowerCase();
  if (raw === "remote" || raw === "local" || raw === "auto") {
    return raw;
  }
  return "auto";
}

function normalizeVector(input: number[]): number[] {
  const norm = Math.sqrt(input.reduce((acc, value) => acc + value * value, 0));
  if (norm === 0) return input;
  return input.map((value) => value / norm);
}

export function generateLocalEmbedding(text: string, dimensions = 256): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();
  if (!normalized) {
    return vector;
  }

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const next = normalized.charCodeAt((i + 1) % normalized.length);
    const index = (code * 31 + next * 17 + i * 13) % dimensions;
    vector[index] += 1;
  }

  return normalizeVector(vector);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isNetworkLikeError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econn") ||
    lower.includes("enotfound") ||
    lower.includes("timed out") ||
    lower.includes("certificate")
  );
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const mode = resolveEmbeddingMode();
  if (mode === "local") {
    return generateLocalEmbedding(text);
  }

  const apiBase = process.env.QWEN_API_BASE_URL;
  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_EMBEDDING_MODEL ?? "text-embedding-v3";

  if (!apiBase || !apiKey) {
    if (mode === "auto") {
      return generateLocalEmbedding(text);
    }
    throw new Error("Qwen embedding API config is incomplete.");
  }

  try {
    const response = await fetch(`${apiBase}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.status}`);
    }

    const payload = (await response.json()) as EmbeddingResponse;
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error("Embedding response is empty.");
    }

    return embedding;
  } catch (error) {
    const message = getErrorMessage(error);
    if (mode === "auto" && isNetworkLikeError(message)) {
      return generateLocalEmbedding(text);
    }
    throw new Error(
      `Embedding generation failed: ${message}. You can set EMBEDDING_MODE=local for offline development.`
    );
  }
}
