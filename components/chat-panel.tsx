"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { ChatResponse, Language } from "@/types/knowledge";
import { FeedbackButtons } from "@/components/feedback-buttons";

type TurnStatus = "loading" | "resolved" | "error";

interface ChatTurn {
  id: string;
  question: string;
  language: Language;
  status: TurnStatus;
  answer?: ChatResponse;
  error?: string;
}

const HISTORY_STORAGE_KEY = "travel-assistant-chat-history-v1";

function makeTurnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatAssistantAnswer(answer: ChatResponse, language: Language): string {
  return [
    `${language === "zh" ? "结论" : "Conclusion"}: ${answer.conclusion}`,
    `${language === "zh" ? "说明" : "Details"}: ${answer.details}`,
    `${language === "zh" ? "下一步建议" : "Next steps"}: ${answer.nextSteps}`,
    `${language === "zh" ? "信息来源" : "Sources"}: ${
      answer.sources.length > 0 ? answer.sources.join("; ") : "-"
    }`
  ].join("\n\n");
}

export function ChatPanel() {
  const [language, setLanguage] = useState<Language>("zh");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const promptText = useMemo(() => t(language, "inputPlaceholder"), [language]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatTurn[];
        if (Array.isArray(parsed)) {
          setTurns(parsed.filter((item) => item.status !== "loading"));
        }
      }
    } catch {
      setTurns([]);
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(turns.filter((item) => item.status !== "loading"))
    );
  }, [historyReady, turns]);

  useEffect(() => {
    if (!historyRef.current) return;
    historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [turns]);

  async function readErrorMessage(response: Response): Promise<string> {
    const text = await response.text();
    if (!text) {
      return `Request failed (HTTP ${response.status})`;
    }

    try {
      const payload = JSON.parse(text) as { error?: string };
      return payload.error ?? `Request failed (HTTP ${response.status})`;
    } catch {
      return `Request failed (HTTP ${response.status}): ${text.slice(0, 240)}`;
    }
  }

  function clearHistory() {
    setTurns([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    const turnId = makeTurnId();
    const pendingTurn: ChatTurn = {
      id: turnId,
      question: trimmedQuestion,
      language,
      status: "loading"
    };

    setQuestion("");
    setLoading(true);
    setTurns((previous) => [...previous, pendingTurn]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: trimmedQuestion, lang: language })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as ChatResponse;
      setTurns((previous) =>
        previous.map((item) =>
          item.id === turnId
            ? {
                ...item,
                status: "resolved",
                answer: payload
              }
            : item
        )
      );
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setTurns((previous) =>
        previous.map((item) =>
          item.id === turnId
            ? {
                ...item,
                status: "error",
                error: message
              }
            : item
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card block chat-shell">
      <div className="row chat-header" style={{ justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <h1 className="title" style={{ fontSize: 24 }}>
            {t(language, "title")}
          </h1>
          <p className="subtitle">{t(language, "subtitle")}</p>
        </div>
        <div className="row">
          <button type="button" className="button secondary" onClick={clearHistory}>
            {language === "zh" ? "新对话" : "New chat"}
          </button>
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

      <div className="chat-history" ref={historyRef}>
        {historyReady && turns.length === 0 ? (
          <div className="chat-empty muted">
            {language === "zh"
              ? "开始你的第一个问题，例如：大中华区酒店策略如何？"
              : "Start your first question, e.g. What is the hotel policy in Greater China?"}
          </div>
        ) : null}

        {turns.map((turn) => (
          <div key={turn.id} className="chat-turn">
            <div className="chat-message user">
              <div className="chat-bubble user">{turn.question}</div>
            </div>

            <div className="chat-message assistant">
              <div className={`chat-bubble assistant ${turn.status === "error" ? "error" : ""}`}>
                {turn.status === "loading"
                  ? language === "zh"
                    ? "正在思考..."
                    : "Thinking..."
                  : turn.status === "error"
                  ? turn.error
                  : formatAssistantAnswer(turn.answer as ChatResponse, turn.language)}
              </div>
              {turn.status === "resolved" && turn.answer ? (
                <FeedbackButtons question={turn.question} language={turn.language} />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <form className="chat-input-wrap" onSubmit={onSubmit}>
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
    </section>
  );
}
