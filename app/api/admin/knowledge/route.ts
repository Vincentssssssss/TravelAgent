import { NextResponse } from "next/server";
import { readKnowledge, writeKnowledge } from "@/lib/knowledge-store";
import { isAdminAuthorizedByKey } from "@/lib/admin-auth";
import type { KnowledgeEntry } from "@/types/knowledge";

function isAdminAuthorized(request: Request): boolean {
  const auth = request.headers.get("x-admin-key");
  return isAdminAuthorizedByKey(auth, process.env.ADMIN_KEY);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await readKnowledge();
  return NextResponse.json({ entries });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<KnowledgeEntry>;
  if (!body.id || !body.type || !body.title_zh || !body.title_en) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const entries = await readKnowledge();
  const exists = entries.some((entry) => entry.id === body.id);
  if (exists) {
    return NextResponse.json({ error: "Entry id already exists" }, { status: 409 });
  }

  entries.push({
    id: body.id,
    type: body.type,
    title_zh: body.title_zh,
    title_en: body.title_en,
    content_zh: body.content_zh ?? "",
    content_en: body.content_en ?? "",
    keywords: body.keywords ?? [],
    source: body.source ?? "Unknown source",
    updated_at: body.updated_at ?? new Date().toISOString().slice(0, 10),
    owner: body.owner ?? "Unknown owner"
  });

  await writeKnowledge(entries);
  return NextResponse.json({ ok: true });
}
