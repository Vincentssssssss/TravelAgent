"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { LanguageToggle } from "@/components/language-toggle";
import type { Language } from "@/types/knowledge";

function AdminContent() {
  const searchParams = useSearchParams();
  const key = useMemo(() => searchParams.get("key") ?? "", [searchParams]);
  const [language, setLanguage] = useState<Language>("zh");

  return (
    <main className="container">
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="title">{language === "zh" ? "管理员模式" : "Admin Mode"}</h1>
            <p className="subtitle">
              {language === "zh"
                ? "通过 URL 参数 key 访问管理能力"
                : "Use key query param in URL to access admin APIs"}
            </p>
          </div>
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>
      </section>

      {key ? (
        <div className="block">
          <AdminPanel adminKey={key} language={language} />
        </div>
      ) : (
        <section className="card block">
          <p className="muted">
            {language === "zh"
              ? "缺少 key 参数，请使用 /admin?key=YOUR_ADMIN_KEY"
              : "Missing key query param, please use /admin?key=YOUR_ADMIN_KEY"}
          </p>
        </section>
      )}
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="container"><section className="card"><p className="muted">loading...</p></section></main>}>
      <AdminContent />
    </Suspense>
  );
}
