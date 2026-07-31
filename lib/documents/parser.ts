import path from "node:path";
import mammoth from "mammoth";
import JSZip from "jszip";

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

  if (major > 24) {
    throw new Error(
      `PDF parsing currently supports Node 20/22/23/24 in this build. Current runtime is ${process.versions.node}. Please use Node 22 or 24, or upload DOCX/PPTX instead of PDF.`
    );
  }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  assertPdfNodeVersion();
  const pdfParseModule = (await import("pdf-parse")) as {
    PDFParse: {
      new (params: { data: Buffer }): {
        getText: () => Promise<{ text?: string }>;
        destroy: () => Promise<void>;
      };
      setWorker: (workerPath: string) => void;
    };
  };
  const PDFParse = pdfParseModule.PDFParse;

  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdf-parse",
    "dist",
    "pdf-parse",
    "esm",
    "pdf.worker.mjs"
  );
  PDFParse.setWorker(workerPath);

  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  return normalizeWhitespace(parsed.text ?? "");
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
  if (lower.endsWith(".doc")) {
    throw new Error("DOC format is not supported yet. Please convert to DOCX.");
  }
  if (lower.endsWith(".ppt")) {
    throw new Error("PPT format is not supported yet. Please convert to PPTX.");
  }
  throw new Error("Unsupported file type. Please upload PDF, DOCX, or PPTX.");
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
