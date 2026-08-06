import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import mammoth from "mammoth";
import JSZip from "jszip";
import { read, utils } from "xlsx";

function decodeXmlText(input: string): string {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function normalizeWhitespace(input: string): string {
  return input.replaceAll(/\s+/g, " ").trim();
}

function assertPdfNodeVersion(): void {
  const [majorRaw, minorRaw] = process.versions.node.split(".");
  const major = Number(majorRaw);
  const minor = Number(minorRaw);

  if (Number.isNaN(major) || Number.isNaN(minor)) {
    return;
  }

  if (major < 20 || (major === 20 && minor < 16)) {
    throw new Error(
      `PDF parsing requires Node >= 20.16. Current runtime is ${process.versions.node}. Please upgrade Node or upload DOCX/PPTX.`
    );
  }
}

interface PdfExtractResult {
  ok: boolean;
  text?: string;
  error?: string;
  primaryError?: string;
  fallbackError?: string;
}

async function runPdfExtractProcess(filePath: string): Promise<PdfExtractResult> {
  const scriptPath = path.join(process.cwd(), "scripts", "pdf-extract.mjs");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, filePath], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      const trimmed = stdout.trim();
      if (!trimmed) {
        if (code === 0) {
          resolve({ ok: false, error: "PDF extractor returned empty output." });
          return;
        }
        resolve({
          ok: false,
          error: `PDF extractor exited with code ${code ?? -1}. ${stderr || "No stderr."}`
        });
        return;
      }

      try {
        const parsed = JSON.parse(trimmed) as PdfExtractResult;
        resolve(parsed);
      } catch {
        resolve({
          ok: false,
          error: `Failed to parse extractor output. Raw: ${trimmed.slice(0, 300)}`
        });
      }
    });
  });
}

async function parsePdf(buffer: Buffer): Promise<string> {
  assertPdfNodeVersion();
  const tempPath = path.join(os.tmpdir(), `travel-agent-pdf-${randomUUID()}.pdf`);
  await fs.writeFile(tempPath, buffer);

  try {
    const result = await runPdfExtractProcess(tempPath);
    if (!result.ok) {
      throw new Error(result.error ?? "PDF extraction failed.");
    }
    if (!result.text?.trim()) {
      throw new Error("PDF extraction returned empty text.");
    }
    return normalizeWhitespace(result.text);
  } finally {
    await fs.unlink(tempPath).catch(() => undefined);
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeWhitespace(result.value ?? "");
}

async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const pieces: string[] = [];
  for (const slideName of slideNames) {
    const xml = await zip.files[slideName].async("string");
    const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
    for (const match of matches) {
      const text = decodeXmlText(match[1] ?? "");
      if (text.trim().length > 0) {
        pieces.push(text.trim());
      }
    }
  }

  return normalizeWhitespace(pieces.join("\n"));
}

async function parseExcel(buffer: Buffer): Promise<string> {
  const workbook = read(buffer, { type: "buffer" });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = utils.sheet_to_json<Array<string | number | boolean | null>>(sheet, {
      header: 1,
      raw: false,
      defval: ""
    });

    const rowText = rows
      .map((row) =>
        row
          .map((cell) => String(cell ?? "").trim())
          .filter(Boolean)
          .join(" | ")
      )
      .filter(Boolean)
      .join("\n");

    if (rowText.length > 0) {
      sections.push(`Sheet: ${sheetName}\n${rowText}`);
    }
  }

  return normalizeWhitespace(sections.join("\n\n"));
}

export async function extractTextFromDocument(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return parsePdf(buffer);
  }
  if (lower.endsWith(".docx")) {
    return parseDocx(buffer);
  }
  if (lower.endsWith(".pptx")) {
    return parsePptx(buffer);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcel(buffer);
  }
  if (lower.endsWith(".doc")) {
    throw new Error("DOC format is not supported yet. Please convert to DOCX.");
  }
  if (lower.endsWith(".ppt")) {
    throw new Error("PPT format is not supported yet. Please convert to PPTX.");
  }
  throw new Error("Unsupported file type. Please upload PDF, DOCX, XLSX/XLS, or PPTX.");
}

export function splitIntoChunks(text: string, chunkSize = 700, overlap = 120): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + chunkSize);
    const chunk = clean.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
