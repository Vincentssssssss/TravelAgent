import { NextResponse } from "next/server";
import { readKnowledge } from "@/lib/knowledge-store";
import { buildFallbackResponse } from "@/lib/chat-service";
import { generateGroundedAnswer, type GroundedSnippet } from "@/lib/qwen-client";
import { hasReliableMatches, inferCategory, searchKnowledge } from "@/lib/retrieval";
import type { Language } from "@/types/knowledge";
import { generateEmbedding } from "@/lib/embedding-client";
import { searchDocumentChunks } from "@/lib/vector-store";
import type { IndexedDocumentChunk } from "@/types/documents";

interface ChatRequestBody {
  question?: string;
  lang?: Language;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const question = body.question?.trim();
    const lang: Language = body.lang === "en" ? "en" : "zh";

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const knowledge = await readKnowledge();
    const category = inferCategory(question);
    const matches = searchKnowledge(knowledge, question, lang);
    let documentMatches: IndexedDocumentChunk[] = [];
    try {
      const queryEmbedding = await generateEmbedding(question);
      documentMatches = await searchDocumentChunks(queryEmbedding, 5, 0.35);
    } catch {
      documentMatches = [];
    }

    if (!hasReliableMatches(matches) && documentMatches.length === 0) {
      return NextResponse.json(buildFallbackResponse(lang, category));
    }

    const snippets: GroundedSnippet[] = [
      ...matches.map((entry) => ({
        title: lang === "zh" ? entry.title_zh : entry.title_en,
        content: lang === "zh" ? entry.content_zh : entry.content_en,
        source: entry.source,
        type: entry.type
      })),
      ...documentMatches.map((chunk) => ({
        title: chunk.fileName,
        content: chunk.text,
        source: `${chunk.fileName}#chunk-${chunk.chunkIndex + 1}`,
        type: "document"
      }))
    ];

    const groundedAnswer = await generateGroundedAnswer(question, snippets, category, lang);
    return NextResponse.json(groundedAnswer);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
