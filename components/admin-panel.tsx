"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { KnowledgeEntry, KnowledgeType, Language } from "@/types/knowledge";
import { labelForType } from "@/lib/i18n";
import type { IndexedDocumentMeta } from "@/types/documents";

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
  const [documents, setDocuments] = useState<IndexedDocumentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [reindexing, setReindexing] = useState(false);

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

  async function loadDocuments() {
    const response = await fetch("/api/admin/documents", {
      headers: { "x-admin-key": adminKey }
    });
    const payload = (await response.json()) as {
      documents?: IndexedDocumentMeta[];
      error?: string;
    };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load documents");
      return;
    }
    setDocuments(payload.documents ?? []);
  }

  useEffect(() => {
    void loadEntries();
    void loadDocuments();
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

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function uploadOnce(file: File): Promise<{ chunkCount?: number; note?: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/documents/upload");
      xhr.setRequestHeader("x-admin-key", adminKey);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(progress);
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onload = () => {
        let payload: { error?: string; chunkCount?: number; note?: string } = {};
        try {
          payload = JSON.parse(xhr.responseText) as {
            error?: string;
            chunkCount?: number;
            note?: string;
          };
        } catch {
          payload = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
          return;
        }
        reject(new Error(payload.error ?? "Upload failed"));
      };

      const payload = new FormData();
      payload.append("file", file);
      xhr.send(payload);
    });
  }

  async function onReindexAll() {
    setReindexing(true);
    const response = await fetch("/api/admin/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({})
    });
    setReindexing(false);
    const payload = (await response.json()) as {
      error?: string;
      reindexedDocuments?: number;
      totalChunks?: number;
    };
    if (!response.ok) {
      setMessage(payload.error ?? "Reindex failed");
      return;
    }
    setMessage(
      language === "zh"
        ? `重建完成，文档数：${payload.reindexedDocuments ?? 0}，分块数：${payload.totalChunks ?? 0}`
        : `Reindex completed. Documents: ${payload.reindexedDocuments ?? 0}, chunks: ${payload.totalChunks ?? 0}`
    );
    await loadDocuments();
  }

  async function onReindexDocument(documentId: string) {
    setReindexing(true);
    const response = await fetch("/api/admin/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({ documentId })
    });
    setReindexing(false);
    const payload = (await response.json()) as {
      error?: string;
      reindexedDocuments?: number;
      totalChunks?: number;
    };
    if (!response.ok) {
      setMessage(payload.error ?? "Reindex failed");
      return;
    }
    setMessage(
      language === "zh"
        ? `单文档重建完成，分块数：${payload.totalChunks ?? 0}`
        : `Document reindex completed, chunks: ${payload.totalChunks ?? 0}`
    );
    await loadDocuments();
  }

  async function onDeleteDocument(documentId: string) {
    const response = await fetch(
      `/api/admin/documents?documentId=${encodeURIComponent(documentId)}`,
      {
        method: "DELETE",
        headers: { "x-admin-key": adminKey }
      }
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Delete failed");
      return;
    }
    setMessage(language === "zh" ? "文档已删除" : "Document deleted");
    await loadDocuments();
  }

  async function onUploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>("input[name='document']");
    const file = fileInput?.files?.[0];
    if (!file) {
      setMessage(language === "zh" ? "请先选择文件" : "Please select a file first");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setRetryAttempt(0);
    let result: { chunkCount?: number; note?: string } | null = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        setRetryAttempt(attempt);
        result = await uploadOnce(file);
        break;
      } catch (error) {
        if (attempt === 3) {
          setUploading(false);
          setMessage(
            error instanceof Error
              ? error.message
              : language === "zh"
              ? "上传失败"
              : "Upload failed"
          );
          return;
        }
        await sleep(500 * attempt);
      }
    }
    setUploading(false);

    setMessage(
      language === "zh"
        ? `上传并索引完成，分块数：${result?.chunkCount ?? 0}${result?.note ? `。${result.note}` : ""}`
        : `Upload and indexing completed, chunks: ${result?.chunkCount ?? 0}${result?.note ? `. ${result.note}` : ""}`
    );
    setUploadProgress(100);
    form.reset();
    await loadDocuments();
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

      <section className="card block">
        <h3>{language === "zh" ? "文档上传与向量索引" : "Document Upload & Vector Indexing"}</h3>
        <p className="muted">
          {language === "zh"
            ? "支持 PDF / DOCX / PPTX（本期不做图片OCR）。上传后自动抽取文本并建立向量索引。"
            : "Supports PDF / DOCX / PPTX (no image OCR in this release). Text is extracted and embedded automatically."}
        </p>
        <div className="row block">
          <button className="button secondary" type="button" onClick={() => void onReindexAll()} disabled={reindexing}>
            {reindexing ? "..." : language === "zh" ? "全量重建索引" : "Reindex All"}
          </button>
        </div>
        <form className="row block" onSubmit={onUploadDocument}>
          <input className="input" name="document" type="file" accept=".pdf,.docx,.pptx,.doc,.ppt" />
          <button className="button" type="submit" disabled={uploading}>
            {uploading ? "..." : language === "zh" ? "上传并索引" : "Upload & Index"}
          </button>
        </form>
        {uploading ? (
          <p className="muted">
            {language === "zh"
              ? `上传进度 ${uploadProgress}%（第 ${retryAttempt} 次尝试）`
              : `Upload progress ${uploadProgress}% (attempt ${retryAttempt})`}
          </p>
        ) : null}
        <div className="block">
          {documents.length === 0 ? (
            <p className="muted">
              {language === "zh" ? "当前未上传文档" : "No uploaded documents yet"}
            </p>
          ) : (
            documents.map((doc) => (
              <div className="card block" key={doc.documentId}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{doc.fileName}</strong>
                  <div className="row">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => void onReindexDocument(doc.documentId)}
                      disabled={reindexing}
                    >
                      {language === "zh" ? "重建索引" : "Reindex"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => void onDeleteDocument(doc.documentId)}
                    >
                      {language === "zh" ? "删除文档" : "Delete"}
                    </button>
                  </div>
                </div>
                <p className="muted">
                  {language === "zh" ? "分块数" : "Chunks"}: {doc.chunkCount} ·{" "}
                  {language === "zh" ? "上传时间" : "Uploaded at"}: {doc.uploadedAt}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

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
