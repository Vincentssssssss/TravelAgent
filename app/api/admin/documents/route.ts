import { NextResponse } from "next/server";
import { isAdminAuthorizedByKey } from "@/lib/admin-auth";
import { readVectorIndex } from "@/lib/vector-store";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("x-admin-key");
  if (!isAdminAuthorizedByKey(auth, process.env.ADMIN_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const index = await readVectorIndex();
  return NextResponse.json({
    documents: index.documents
  });
}
