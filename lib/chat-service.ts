import { t } from "@/lib/i18n";
import type { ChatResponse, Language } from "@/types/knowledge";

export function buildFallbackResponse(
  lang: Language,
  category: ChatResponse["category"]
): ChatResponse {
  const handoff =
    category === "visa"
      ? t(lang, "handoffVisa")
      : category === "policy"
      ? t(lang, "handoffFinance")
      : t(lang, "handoffTravel");

  return {
    resolved: false,
    category,
    conclusion: t(lang, "unknownFallback"),
    details:
      lang === "zh"
        ? "当前问题未在已验证知识库中命中，请使用人工支持渠道继续处理。"
        : "No verified knowledge match was found. Please continue via human support.",
    nextSteps: handoff,
    sources: []
  };
}
