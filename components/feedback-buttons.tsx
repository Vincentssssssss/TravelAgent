"use client";

import { useState } from "react";
import type { Language } from "@/types/knowledge";
import { t } from "@/lib/i18n";

interface Props {
  question: string;
  language: Language;
}

export function FeedbackButtons({ question, language }: Props) {
  const [submitted, setSubmitted] = useState(false);

  async function send(helpful: boolean) {
    if (submitted || !question) return;

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, helpful })
    });
    setSubmitted(true);
  }

  return (
    <div className="row block">
      <button type="button" className="button secondary" onClick={() => send(true)}>
        👍 {t(language, "feedbackHelpful")}
      </button>
      <button type="button" className="button secondary" onClick={() => send(false)}>
        👎 {t(language, "feedbackUnhelpful")}
      </button>
      {submitted ? (
        <span className="muted">{language === "zh" ? "感谢反馈" : "Thanks for the feedback"}</span>
      ) : null}
    </div>
  );
}
