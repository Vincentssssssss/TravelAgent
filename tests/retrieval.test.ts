import { describe, expect, test } from "vitest";
import { inferCategory, searchKnowledge } from "@/lib/retrieval";
import type { KnowledgeEntry } from "@/types/knowledge";

const fixtures: KnowledgeEntry[] = [
  {
    id: "k1",
    type: "hotel",
    title_zh: "协议酒店",
    title_en: "Contracted hotels",
    content_zh: "支持上海协议价",
    content_en: "Support contracted rates in Shanghai",
    keywords: ["协议酒店", "hotel rate"],
    source: "S1",
    updated_at: "2026-01-01",
    owner: "Travel"
  },
  {
    id: "k2",
    type: "visa",
    title_zh: "签证支持",
    title_en: "Visa support",
    content_zh: "至少提前15天",
    content_en: "At least 15 days in advance",
    keywords: ["签证", "visa"],
    source: "S2",
    updated_at: "2026-01-01",
    owner: "Visa"
  }
];

describe("retrieval", () => {
  test("infers hotel category from query", () => {
    expect(inferCategory("如何申请酒店 sourcing")).toBe("hotel");
  });

  test("returns hotel entry as top match", () => {
    const result = searchKnowledge(fixtures, "协议酒店价格", "zh");
    expect(result[0]?.id).toBe("k1");
  });
});
