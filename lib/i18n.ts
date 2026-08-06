import type { KnowledgeType, Language } from "@/types/knowledge";

type CopyKey =
  | "title"
  | "subtitle"
  | "inputPlaceholder"
  | "send"
  | "adminEntry"
  | "feedbackHelpful"
  | "feedbackUnhelpful"
  | "unknownFallback"
  | "handoffTravel"
  | "handoffFinance"
  | "handoffVisa";

const copy: Record<Language, Record<CopyKey, string>> = {
  zh: {
    title: "Travel Assistant",
    subtitle: "公司内部差旅智能问答",
    inputPlaceholder: "请输入差旅相关问题，例如：如何申请酒店Sourcing？",
    send: "发送",
    adminEntry: "管理员入口",
    feedbackHelpful: "有帮助",
    feedbackUnhelpful: "没帮助",
    unknownFallback: "知识库暂无可确认信息。",
    handoffTravel: "请联系 Travel Team 继续处理。",
    handoffFinance: "请联系 Finance 团队继续处理。",
    handoffVisa: "请联系 Visa Support 继续处理。"
  },
  en: {
    title: "Travel Assistant",
    subtitle: "Internal business travel Q&A",
    inputPlaceholder:
      "Ask a travel question, e.g. How can I request hotel sourcing?",
    send: "Send",
    adminEntry: "Admin",
    feedbackHelpful: "Helpful",
    feedbackUnhelpful: "Not helpful",
    unknownFallback: "No verified information was found in the knowledge base.",
    handoffTravel: "Please contact the Travel Team for further help.",
    handoffFinance: "Please contact the Finance team for further help.",
    handoffVisa: "Please contact Visa Support for further help."
  }
};

export function t(lang: Language, key: CopyKey): string {
  return copy[lang][key];
}

export function labelForType(type: KnowledgeType, lang: Language): string {
  const map: Record<KnowledgeType, { zh: string; en: string }> = {
    policy: { zh: "差旅政策", en: "Policy" },
    hotel: { zh: "酒店资源", en: "Hotel" },
    process: { zh: "流程咨询", en: "Process" },
    contact: { zh: "联系人查询", en: "Contacts" },
    visa: { zh: "签证咨询", en: "Visa" },
    faq: { zh: "常见问题", en: "FAQ" }
  };

  return map[type][lang];
}
