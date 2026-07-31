import { describe, expect, test } from "vitest";
import { buildFallbackResponse } from "@/lib/chat-service";

describe("chat strict fallback", () => {
  test("returns unresolved response with travel handoff in zh", () => {
    const response = buildFallbackResponse("zh", "unknown");
    expect(response.resolved).toBe(false);
    expect(response.conclusion).toContain("知识库");
    expect(response.nextSteps).toContain("Travel Team");
  });

  test("routes visa questions to visa handoff", () => {
    const response = buildFallbackResponse("en", "visa");
    expect(response.nextSteps).toContain("Visa Support");
  });
});
