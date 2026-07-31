import { describe, expect, test } from "vitest";
import { generateLocalEmbedding } from "@/lib/embedding-client";
import { buildLocalGroundedAnswer } from "@/lib/qwen-client";
import type { GroundedSnippet } from "@/lib/qwen-client";

describe("local fallback utilities", () => {
  test("generateLocalEmbedding returns deterministic vector length", () => {
    const vectorA = generateLocalEmbedding("travel policy");
    const vectorB = generateLocalEmbedding("travel policy");
    expect(vectorA.length).toBe(256);
    expect(vectorA).toEqual(vectorB);
  });

  test("buildLocalGroundedAnswer keeps sources and resolved status", () => {
    const snippets: GroundedSnippet[] = [
      {
        title: "Finance policy",
        content: "Reimburse within 30 days.",
        source: "Finance Policy v1",
        type: "policy"
      },
      {
        title: "Travel contact",
        content: "Email travel-support@company.com",
        source: "Travel Contact v1",
        type: "contact"
      }
    ];

    const answer = buildLocalGroundedAnswer(snippets, "policy", "en");
    expect(answer.resolved).toBe(true);
    expect(answer.sources).toContain("Finance Policy v1");
    expect(answer.details).toContain("Local fallback");
  });
});
