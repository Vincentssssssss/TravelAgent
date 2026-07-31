import type { ChatResponse, KnowledgeEntry, Language } from "@/types/knowledge";

interface ModelMessage {
  role: "system" | "user";
  content: string;
}

interface QwenChatCompletion {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function toKnowledgeBlock(matches: KnowledgeEntry[], lang: Language): string {
  return matches
    .map((entry) => {
      const title = lang === "zh" ? entry.title_zh : entry.title_en;
      const content = lang === "zh" ? entry.content_zh : entry.content_en;
      return `- [${entry.type}] ${title}\n  ${content}\n  source: ${entry.source}`;
    })
    .join("\n");
}

function buildPrompt(query: string, matches: KnowledgeEntry[], lang: Language): ModelMessage[] {
  const system =
    lang === "zh"
      ? "你是公司内部差旅助手。必须只基于提供的知识库内容回答，不得补充未给出的事实。输出必须是严格JSON：{conclusion,details,nextSteps,sources}。sources为字符串数组。"
      : "You are an internal travel assistant. You must answer only with the provided knowledge snippets and never add unsupported facts. Return strict JSON: {conclusion,details,nextSteps,sources}. sources must be string array.";

  const user =
    (lang === "zh" ? "用户问题：" : "User question: ") +
    query +
    "\n\n" +
    (lang === "zh" ? "可用知识：" : "Knowledge snippets:") +
    "\n" +
    toKnowledgeBlock(matches, lang);

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export async function generateGroundedAnswer(
  query: string,
  matches: KnowledgeEntry[],
  category: ChatResponse["category"],
  lang: Language
): Promise<ChatResponse> {
  const apiBase = process.env.QWEN_API_BASE_URL;
  const model = process.env.QWEN_MODEL ?? "qwen-plus";
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiBase || !apiKey) {
    throw new Error("Qwen API config is incomplete.");
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: buildPrompt(query, matches, lang),
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`Qwen request failed: ${response.status}`);
  }

  const payload = (await response.json()) as QwenChatCompletion;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Qwen returned empty content.");
  }

  const parsed = JSON.parse(content) as Omit<ChatResponse, "resolved" | "category">;
  return {
    resolved: true,
    category,
    conclusion: parsed.conclusion,
    details: parsed.details,
    nextSteps: parsed.nextSteps,
    sources: parsed.sources ?? matches.map((entry) => entry.source)
  };
}
