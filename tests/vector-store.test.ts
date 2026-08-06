import { describe, expect, test } from "vitest";
import { cosineSimilarity } from "@/lib/vector-store";
import { splitIntoChunks } from "@/lib/documents/parser";

describe("vector utilities", () => {
  test("cosine similarity returns high score for identical vectors", () => {
    const score = cosineSimilarity([1, 2, 3], [1, 2, 3]);
    expect(score).toBeGreaterThan(0.99);
  });

  test("cosine similarity returns low score for orthogonal vectors", () => {
    const score = cosineSimilarity([1, 0], [0, 1]);
    expect(score).toBe(0);
  });

  test("split text into overlapping chunks", () => {
    const text = "a".repeat(1600);
    const chunks = splitIntoChunks(text, 700, 120);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].length).toBeLessThanOrEqual(700);
  });
});
