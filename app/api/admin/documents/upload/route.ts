import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdminAuthorizedByKey } from "@/lib/admin-auth";
import { extractTextFromDocument, splitIntoChunks } from "@/lib/documents/parser";
import { generateEmbedding } from "@/lib/embedding-client";
import { upsertDocumentChunks } from "@/lib/vector-store";
import type { IndexedDocumentChunk, IndexedDocumentMeta } from "@/types/documents";

export const runtime = "nodejs";

function sanitizeFileName(fileName: string): string {
  return fileName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const auth = request.headers.get("x-admin-key");
    if (!isAdminAuthorizedByKey(auth, process.env.ADMIN_KEY)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }

    const documentId = randomUUID();
    const uploadTime = new Date().toISOString();
    const safeFileName = sanitizeFileName(file.name || `document-${documentId}`);
    const targetDir = path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(targetDir, { recursive: true });
    const storageName = `${Date.now()}-${safeFileName}`;
    const storagePath = path.join(targetDir, storageName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(storagePath, buffer);

    const text = await extractTextFromDocument(file.name, buffer);
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error: "No extractable text found in this document."
        },
        { status: 400 }
      );
    }

    const embeddedChunks: IndexedDocumentChunk[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const chunkText = chunks[i];
      const embedding = await generateEmbedding(chunkText);
      embeddedChunks.push({
        id: `${documentId}-${i}`,
        documentId,
        fileName: file.name,
        sourcePath: `data/uploads/${storageName}`,
        chunkIndex: i,
        text: chunkText,
        embedding,
        createdAt: uploadTime
      });
    }

    const documentMeta: IndexedDocumentMeta = {
      documentId,
      fileName: file.name,
      sourcePath: `data/uploads/${storageName}`,
      uploadedAt: uploadTime,
      chunkCount: embeddedChunks.length
    };
    await upsertDocumentChunks(documentMeta, embeddedChunks);

    return NextResponse.json({
      ok: true,
      documentId,
      fileName: file.name,
      chunkCount: embeddedChunks.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
