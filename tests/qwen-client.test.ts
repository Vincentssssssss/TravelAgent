import { describe, expect, test } from "vitest";
import { parseModelAnswerJson } from "@/lib/qwen-client";

describe("parseModelAnswerJson", () => {
  test("parses plain JSON", () => {
    const raw = JSON.stringify({
      conclusion: "A",
      details: "B",
      nextSteps: "C",
      sources: ["S1"]
    });
    const parsed = parseModelAnswerJson(raw);
    expect(parsed.conclusion).toBe("A");
    expect(parsed.sources).toEqual(["S1"]);
  });

  test("parses fenced json block", () => {
    const raw = "```json\n{\"conclusion\":\"A\",\"details\":\"B\",\"nextSteps\":\"C\"}\n```";
    const parsed = parseModelAnswerJson(raw);
    expect(parsed.nextSteps).toBe("C");
  });

  test("parses wrapped text containing json block", () => {
    const raw =
      "Here is the answer:\n```json\n{\"conclusion\":\"A\",\"details\":\"B\",\"nextSteps\":\"C\"}\n```\nThanks";
    const parsed = parseModelAnswerJson(raw);
    expect(parsed.details).toBe("B");
  });
});
