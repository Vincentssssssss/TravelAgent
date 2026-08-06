import type { KnowledgeEntry, KnowledgeType, Language } from "@/types/knowledge";

const categoryHints: Record<KnowledgeType, string[]> = {
  policy: ["policy", "政策", "报销", "标准", "航班", "approval"],
  hotel: ["hotel", "酒店", "协议价", "sourcing", "住宿"],
  process: ["how", "流程", "申请", "取消", "步骤", "如何"],
  contact: ["contact", "联系人", "谁负责", "部门", "team"],
  visa: ["visa", "签证", "出入境", "入境", "支持"],
  faq: ["faq", "常见", "问题", "help"]
};

export function inferCategory(query: string): KnowledgeType | "unknown" {
  const normalized = query.toLowerCase();

  let maxScore = 0;
  let selected: KnowledgeType | "unknown" = "unknown";

  (Object.keys(categoryHints) as KnowledgeType[]).forEach((type) => {
    const score = categoryHints[type].reduce((acc, hint) => {
      return normalized.includes(hint.toLowerCase()) ? acc + 1 : acc;
    }, 0);

    if (score > maxScore) {
      maxScore = score;
      selected = type;
    }
  });

  return maxScore > 0 ? selected : "unknown";
}

function entryText(entry: KnowledgeEntry, lang: Language): string {
  return `${entry.title_zh} ${entry.title_en} ${
    lang === "zh" ? entry.content_zh : entry.content_en
  } ${entry.keywords.join(" ")}`.toLowerCase();
}

export function searchKnowledge(
  entries: KnowledgeEntry[],
  query: string,
  lang: Language
): KnowledgeEntry[] {
  const normalizedTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const scored = entries
    .map((entry) => {
      const text = entryText(entry, lang);
      const hitScore = normalizedTokens.reduce((acc, token) => {
        if (text.includes(token)) {
          return acc + 2;
        }
        return acc;
      }, 0);

      const keywordScore = entry.keywords.reduce((acc, keyword) => {
        return query.toLowerCase().includes(keyword.toLowerCase()) ? acc + 3 : acc;
      }, 0);

      return { entry, score: hitScore + keywordScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((item) => item.entry);
}

export function hasReliableMatches(matches: KnowledgeEntry[]): boolean {
  return matches.length >= 1;
}
