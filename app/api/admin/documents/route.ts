import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdminAuthorizedByKey } from "@/lib/admin-auth";
import { extractTextFromDocument, splitIntoChunks } from "@/lib/documents/parser";
import { generateEmbedding } from "@/lib/embedding-client";
import {
  readVectorIndex,
  removeDocumentChunks,
  upsertDocumentChunks
} from "@/lib/vector-store";
import type { IndexedDocumentChunk } from "@/types/documents";

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

export async function DELETE(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("x-admin-key");
  if (!isAdminAuthorizedByKey(auth, process.env.ADMIN_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const removed = await removeDocumentChunks(documentId);
  if (!removed) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), removed.sourcePath);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // Keep deletion idempotent when file was already removed.
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("x-admin-key");
  if (!isAdminAuthorizedByKey(auth, process.env.ADMIN_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    documentId?: string;
  };

  const index = await readVectorIndex();
  const targets = body.documentId
    ? index.documents.filter((doc) => doc.documentId === body.documentId)
    : index.documents;

  if (targets.length === 0) {
    return NextResponse.json({ error: "No documents to reindex" }, { status: 404 });
  }

  let totalChunks = 0;
  for (const doc of targets) {
    const absolutePath = path.join(process.cwd(), doc.sourcePath);
    const fileBuffer = await fs.readFile(absolutePath);
    const extractedText = await extractTextFromDocument(doc.fileName, fileBuffer);
    const textChunks = splitIntoChunks(extractedText);
    const now = new Date().toISOString();

    const embeddedChunks: IndexedDocumentChunk[] = [];
    for (let i = 0; i < textChunks.length; i += 1) {
      const embedding = await generateEmbedding(textChunks[i]);
      embeddedChunks.push({
        id: `${doc.documentId}-${i}`,
        documentId: doc.documentId,
        fileName: doc.fileName,
        sourcePath: doc.sourcePath,
        chunkIndex: i,
        text: textChunks[i],
        embedding,
        createdAt: now
      });
    }

    totalChunks += embeddedChunks.length;
    await upsertDocumentChunks(
      {
        ...doc,
        uploadedAt: now,
        chunkCount: embeddedChunks.length
      },
      embeddedChunks
    );
  }

  return NextResponse.json({
    ok: true,
    reindexedDocuments: targets.length,
    totalChunks
  });
}
