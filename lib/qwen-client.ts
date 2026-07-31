import type { ChatResponse, Language } from "@/types/knowledge";

export interface GroundedSnippet {
  title: string;
  content: string;
  source: string;
  type: string;
}

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

function toKnowledgeBlock(snippets: GroundedSnippet[]): string {
  return snippets
    .map((snippet) => {
      return `- [${snippet.type}] ${snippet.title}\n  ${snippet.content}\n  source: ${snippet.source}`;
    })
    .join("\n");
}

function buildPrompt(query: string, snippets: GroundedSnippet[], lang: Language): ModelMessage[] {
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
    toKnowledgeBlock(snippets);

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export async function generateGroundedAnswer(
  query: string,
  snippets: GroundedSnippet[],
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
      messages: buildPrompt(query, snippets, lang),
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
    sources: parsed.sources ?? snippets.map((snippet) => snippet.source)
  };
}
