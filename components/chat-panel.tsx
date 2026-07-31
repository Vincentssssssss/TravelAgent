"use client";

import { FormEvent, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import type { ChatResponse, Language } from "@/types/knowledge";
import { FeedbackButtons } from "@/components/feedback-buttons";

export function ChatPanel() {
  const [language, setLanguage] = useState<Language>("zh");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const promptText = useMemo(() => t(language, "inputPlaceholder"), [language]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question, lang: language })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Request failed");
      }

      const payload = (await response.json()) as ChatResponse;
      setAnswer(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card block">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="title">{t(language, "title")}</h1>
          <p className="subtitle">{t(language, "subtitle")}</p>
        </div>
        <div className="row">
          <button
            type="button"
            className={`button ${language === "zh" ? "" : "secondary"}`}
            onClick={() => setLanguage("zh")}
          >
            中文
          </button>
          <button
            type="button"
            className={`button ${language === "en" ? "" : "secondary"}`}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
        </div>
      </div>

      <form className="block" onSubmit={onSubmit}>
        <div className="row">
          <input
            className="input"
            placeholder={promptText}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className="button" type="submit" disabled={loading || !question.trim()}>
            {loading ? "..." : t(language, "send")}
          </button>
        </div>
      </form>

      {error ? <p className="muted block">Error: {error}</p> : null}

      {answer ? (
        <div className="card block">
          <div className="response">
            <strong>{language === "zh" ? "结论" : "Conclusion"}:</strong> {answer.conclusion}
            {"\n\n"}
            <strong>{language === "zh" ? "说明" : "Details"}:</strong> {answer.details}
            {"\n\n"}
            <strong>{language === "zh" ? "下一步建议" : "Next steps"}:</strong> {answer.nextSteps}
            {"\n\n"}
            <strong>{language === "zh" ? "信息来源" : "Sources"}:</strong>{" "}
            {answer.sources.length > 0 ? answer.sources.join("; ") : "-"}
          </div>
          <FeedbackButtons question={question} language={language} />
        </div>
      ) : null}
    </section>
  );
}
