import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { appendFeedback } from "@/lib/knowledge-store";

interface FeedbackBody {
  question?: string;
  helpful?: boolean;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as FeedbackBody;
    if (!body.question || typeof body.helpful !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await appendFeedback({
      id: randomUUID(),
      question: body.question,
      helpful: body.helpful,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
