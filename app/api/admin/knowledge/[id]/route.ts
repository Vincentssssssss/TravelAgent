import { NextResponse } from "next/server";
import { readKnowledge, writeKnowledge } from "@/lib/knowledge-store";
import { isAdminAuthorizedByKey } from "@/lib/admin-auth";
import type { KnowledgeEntry } from "@/types/knowledge";

function isAdminAuthorized(request: Request): boolean {
  const auth = request.headers.get("x-admin-key");
  return isAdminAuthorizedByKey(auth, process.env.ADMIN_KEY);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as Partial<KnowledgeEntry>;
  const entries = await readKnowledge();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  entries[index] = {
    ...entries[index],
    ...payload,
    id: entries[index].id
  };

  await writeKnowledge(entries);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteParams): Promise<NextResponse> {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const entries = await readKnowledge();
  const filtered = entries.filter((entry) => entry.id !== id);
  if (filtered.length === entries.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeKnowledge(filtered);
  return NextResponse.json({ ok: true });
}
