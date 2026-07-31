import { NextResponse } from "next/server";
import { readKnowledge } from "@/lib/knowledge-store";
import { buildFallbackResponse } from "@/lib/chat-service";
import { generateGroundedAnswer } from "@/lib/qwen-client";
import { hasReliableMatches, inferCategory, searchKnowledge } from "@/lib/retrieval";
import type { Language } from "@/types/knowledge";

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

    if (!hasReliableMatches(matches)) {
      return NextResponse.json(buildFallbackResponse(lang, category));
    }

    const groundedAnswer = await generateGroundedAnswer(question, matches, category, lang);
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
