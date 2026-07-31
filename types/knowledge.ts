export type KnowledgeType =
  | "policy"
  | "hotel"
  | "process"
  | "contact"
  | "visa"
  | "faq";

export type Language = "zh" | "en";

export interface KnowledgeEntry {
  id: string;
  type: KnowledgeType;
  title_zh: string;
  title_en: string;
  content_zh: string;
  content_en: string;
  keywords: string[];
  source: string;
  updated_at: string;
  owner: string;
}

export interface ChatResponse {
  resolved: boolean;
  category: KnowledgeType | "unknown";
  conclusion: string;
  details: string;
  nextSteps: string;
  sources: string[];
}
