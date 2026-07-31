"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { KnowledgeEntry, KnowledgeType, Language } from "@/types/knowledge";
import { labelForType } from "@/lib/i18n";

const defaultEntry: KnowledgeEntry = {
  id: "",
  type: "policy",
  title_zh: "",
  title_en: "",
  content_zh: "",
  content_en: "",
  keywords: [],
  source: "",
  updated_at: new Date().toISOString().slice(0, 10),
  owner: ""
};

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

interface Props {
  adminKey: string;
  language: Language;
}

export function AdminPanel({ adminKey, language }: Props) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [form, setForm] = useState<KnowledgeEntry>(defaultEntry);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const typeOptions: KnowledgeType[] = useMemo(
    () => ["policy", "hotel", "process", "contact", "visa", "faq"],
    []
  );

  async function loadEntries() {
    setLoading(true);
    const response = await fetch("/api/admin/knowledge", {
      headers: { "x-admin-key": adminKey }
    });
    const payload = (await response.json()) as { entries?: KnowledgeEntry[]; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load");
      setLoading(false);
      return;
    }

    setEntries(payload.entries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `/api/admin/knowledge/${encodeURIComponent(editingId)}`
      : "/api/admin/knowledge";
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({
        ...form,
        keywords: form.keywords
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setMessage(payload.error ?? "Create failed");
      return;
    }

    setMessage(editingId ? (language === "zh" ? "更新成功" : "Updated") : language === "zh" ? "新增成功" : "Created");
    setForm(defaultEntry);
    setEditingId(null);
    await loadEntries();
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/admin/knowledge/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey }
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setMessage(payload.error ?? "Delete failed");
      return;
    }

    setMessage(language === "zh" ? "删除成功" : "Deleted");
    await loadEntries();
  }

  function onEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setForm(entry);
  }

  function onCancelEdit() {
    setEditingId(null);
    setForm(defaultEntry);
  }

  return (
    <section className="card">
      <h2>{language === "zh" ? "知识库管理" : "Knowledge Management"}</h2>
      <p className="muted">
        {language === "zh"
          ? "管理员可以新增和删除用于问答的官方知识条目。"
          : "Admins can create and delete official knowledge entries used in Q&A."}
      </p>

      <form className="block" onSubmit={onCreate}>
        <div className="grid">
          <input
            className="input"
            placeholder="id"
            value={form.id}
            onChange={(event) => setForm({ ...form, id: event.target.value })}
          />
          <select
            className="input"
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value as KnowledgeType
              })
            }
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {labelForType(type, language)}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="title_zh"
            value={form.title_zh}
            onChange={(event) => setForm({ ...form, title_zh: event.target.value })}
          />
          <input
            className="input"
            placeholder="title_en"
            value={form.title_en}
            onChange={(event) => setForm({ ...form, title_en: event.target.value })}
          />
        </div>
        <div className="block">
          <textarea
            className="input"
            rows={4}
            placeholder="content_zh"
            value={form.content_zh}
            onChange={(event) => setForm({ ...form, content_zh: event.target.value })}
          />
        </div>
        <div className="block">
          <textarea
            className="input"
            rows={4}
            placeholder="content_en"
            value={form.content_en}
            onChange={(event) => setForm({ ...form, content_en: event.target.value })}
          />
        </div>
        <div className="grid block">
          <input
            className="input"
            placeholder="keywords: comma,separated"
            value={form.keywords.join(", ")}
            onChange={(event) =>
              setForm({
                ...form,
                keywords: parseKeywords(event.target.value)
              })
            }
          />
          <input
            className="input"
            placeholder="source"
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
          />
          <input
            className="input"
            placeholder="updated_at (YYYY-MM-DD)"
            value={form.updated_at}
            onChange={(event) => setForm({ ...form, updated_at: event.target.value })}
          />
          <input
            className="input"
            placeholder="owner"
            value={form.owner}
            onChange={(event) => setForm({ ...form, owner: event.target.value })}
          />
        </div>
        <div className="row block">
          <button className="button" type="submit">
            {editingId
              ? language === "zh"
                ? "保存更新"
                : "Save Update"
              : language === "zh"
              ? "新增条目"
              : "Create Entry"}
          </button>
          {editingId ? (
            <button className="button secondary" type="button" onClick={onCancelEdit}>
              {language === "zh" ? "取消编辑" : "Cancel"}
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="muted block">{message}</p> : null}

      <div className="block">
        {loading ? (
          <p className="muted">loading...</p>
        ) : (
          entries.map((entry) => (
            <div className="card block" key={entry.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>{entry.id}</strong> · {labelForType(entry.type, language)}
                  <p className="muted">
                    {(language === "zh" ? entry.title_zh : entry.title_en) || entry.id}
                  </p>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => onEdit(entry)}
                  >
                    {language === "zh" ? "编辑" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => void onDelete(entry.id)}
                  >
                    {language === "zh" ? "删除" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
