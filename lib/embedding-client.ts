interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiBase = process.env.QWEN_API_BASE_URL;
  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_EMBEDDING_MODEL ?? "text-embedding-v3";

  if (!apiBase || !apiKey) {
    throw new Error("Qwen embedding API config is incomplete.");
  }

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
}
