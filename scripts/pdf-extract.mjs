import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function normalizeWhitespace(input) {
  return input.replace(/\s+/g, " ").trim();
}

async function parseWithPdfParse(buffer) {
  const modulePath = pathToFileURL(
    path.join(
      process.cwd(),
      "node_modules",
      "pdf-parse",
      "dist",
      "pdf-parse",
      "esm",
      "index.js"
    )
  ).href;
  const pdfParseModule = await import(modulePath);
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

async function parseWithPdfJs(buffer) {
  const modulePath = pathToFileURL(
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs")
  ).href;
  const pdfjs = await import(modulePath);

  const workerPath = pathToFileURL(
    path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    )
  ).href;
  pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false
  });
  const doc = await loadingTask.promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const line = textContent.items
      .map((item) => item.str ?? "")
      .join(" ")
      .trim();
    if (line.length > 0) {
      pages.push(line);
    }
  }

  if (typeof doc.cleanup === "function") {
    await doc.cleanup().catch(() => undefined);
  }
  await loadingTask.destroy();
  return normalizeWhitespace(pages.join("\n"));
}

async function run(filePath) {
  const buffer = await readFile(filePath);
  let primaryError = "";
  try {
    const text = await parseWithPdfParse(buffer);
    if (text.length > 0) {
      return {
        ok: true,
        text,
        engine: "pdf-parse"
      };
    }
    primaryError = "pdf-parse returned empty text";
  } catch (error) {
    primaryError = error instanceof Error ? error.message : String(error);
  }

  try {
    const text = await parseWithPdfJs(buffer);
    if (text.length > 0) {
      return {
        ok: true,
        text,
        engine: "pdfjs-dist",
        primaryError
      };
    }
    return {
      ok: false,
      error:
        "No extractable text found in this PDF (possibly image-only). OCR is disabled in this version.",
      primaryError,
      fallbackError: "pdfjs-dist returned empty text"
    };
  } catch (error) {
    const fallbackError = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `PDF parsing failed in both engines. Primary: ${primaryError}; Fallback: ${fallbackError}`,
      primaryError,
      fallbackError
    };
  }
}

const targetPath = process.argv[2];
if (!targetPath) {
  process.stdout.write(JSON.stringify({ ok: false, error: "Missing PDF file path argument." }));
  process.exit(1);
}

try {
  const result = await run(targetPath);
  process.stdout.write(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}
