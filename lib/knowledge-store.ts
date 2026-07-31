import { promises as fs } from "node:fs";
import path from "node:path";
import type { KnowledgeEntry } from "@/types/knowledge";

const knowledgePath = path.join(process.cwd(), "data", "knowledge.json");
const feedbackPath = path.join(process.cwd(), "data", "feedback.json");

export interface FeedbackEntry {
  id: string;
  question: string;
  helpful: boolean;
  createdAt: string;
}

async function ensureFile(filePath: string, fallback: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, fallback, "utf8");
  }
}

export async function readKnowledge(): Promise<KnowledgeEntry[]> {
  await ensureFile(knowledgePath, "[]");
  const raw = await fs.readFile(knowledgePath, "utf8");
  return JSON.parse(raw) as KnowledgeEntry[];
}

export async function writeKnowledge(entries: KnowledgeEntry[]): Promise<void> {
  await fs.writeFile(knowledgePath, JSON.stringify(entries, null, 2), "utf8");
}

export async function appendFeedback(entry: FeedbackEntry): Promise<void> {
  await ensureFile(feedbackPath, "[]");
  const raw = await fs.readFile(feedbackPath, "utf8");
  const existing = JSON.parse(raw) as FeedbackEntry[];
  existing.push(entry);
  await fs.writeFile(feedbackPath, JSON.stringify(existing, null, 2), "utf8");
}

export async function readFeedback(): Promise<FeedbackEntry[]> {
  await ensureFile(feedbackPath, "[]");
  const raw = await fs.readFile(feedbackPath, "utf8");
  return JSON.parse(raw) as FeedbackEntry[];
}
