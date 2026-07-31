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

type LlmMode = "remote" | "local" | "auto";

function resolveLlmMode(): LlmMode {
  const raw = (process.env.LLM_MODE ?? "auto").toLowerCase();
  if (raw === "remote" || raw === "local" || raw === "auto") {
    return raw;
  }
  return "auto";
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

function uniqueSources(snippets: GroundedSnippet[]): string[] {
  return [...new Set(snippets.map((snippet) => snippet.source))];
}

export function buildLocalGroundedAnswer(
  snippets: GroundedSnippet[],
  category: ChatResponse["category"],
  lang: Language
): ChatResponse {
  const top = snippets[0];
  const topSummary = top ? top.content.slice(0, 180) : "";
  const sources = uniqueSources(snippets);
  const joinedDetails = snippets
    .slice(0, 3)
    .map((snippet, idx) => `${idx + 1}. ${snippet.title}: ${snippet.content.slice(0, 160)}`)
    .join("\n");

  const nextStepZh =
    category === "visa"
      ? "如需进一步确认，请联系 Visa Support。"
      : category === "contact"
      ? "如需执行，请按联系人信息联系对应团队。"
      : "如需进一步确认，请联系 Travel Team。";

  const nextStepEn =
    category === "visa"
      ? "For further confirmation, please contact Visa Support."
      : category === "contact"
      ? "Please contact the listed owner/team for execution."
      : "For further confirmation, please contact the Travel Team.";

  return {
    resolved: true,
    category,
    conclusion:
      lang === "zh"
        ? `基于已命中资料：${topSummary || "已找到相关信息。"}`
        : `Based on matched sources: ${topSummary || "Relevant information was found."}`,
    details:
      lang === "zh"
        ? `${joinedDetails}\n\n（当前为本地兜底回答模式，未调用远程大模型。）`
        : `${joinedDetails}\n\n(Local fallback answer mode was used without remote LLM call.)`,
    nextSteps: lang === "zh" ? nextStepZh : nextStepEn,
    sources
  };
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
  const mode = resolveLlmMode();
  if (mode === "local") {
    return buildLocalGroundedAnswer(snippets, category, lang);
  }

  const apiBase = process.env.QWEN_API_BASE_URL;
  const model = process.env.QWEN_MODEL ?? "qwen-plus";
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiBase || !apiKey) {
    if (mode === "auto") {
      return buildLocalGroundedAnswer(snippets, category, lang);
    }
    throw new Error("Qwen API config is incomplete.");
  }

  try {
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
      sources: parsed.sources ?? uniqueSources(snippets)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (mode === "auto" && isNetworkLikeError(message)) {
      return buildLocalGroundedAnswer(snippets, category, lang);
    }
    throw new Error(
      `LLM answer generation failed: ${message}. Set LLM_MODE=local for offline preview.`
    );
  }
}
