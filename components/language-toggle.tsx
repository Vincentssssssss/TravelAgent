"use client";

import type { Language } from "@/types/knowledge";

interface Props {
  language: Language;
  onChange: (value: Language) => void;
}

export function LanguageToggle({ language, onChange }: Props) {
  return (
    <div className="row">
      <button
        type="button"
        className={`button ${language === "zh" ? "" : "secondary"}`}
        onClick={() => onChange("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={`button ${language === "en" ? "" : "secondary"}`}
        onClick={() => onChange("en")}
      >
        English
      </button>
    </div>
  );
}
