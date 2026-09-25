/**
 * PDF text extraction with pdf.js running in Node. No Python, no native
 * dependencies beyond the optional @napi-rs/canvas used to rasterise pages
 * that need OCR (scanned pages with no text layer).
 */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsPromise: Promise<PdfJs> | null = null;
const loadPdfJs = () => (pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs"));

export type ExtractedPdf = {
  pages: string[];
  /** 1-based page numbers whose text layer was (nearly) empty. */
  emptyPages: number[];
  title: string | null;
};

type TextItem = { str: string; hasEOL?: boolean; transform?: number[]; height?: number };

/** Rebuilds readable text from positioned glyph runs: lines by baseline, paragraphs by gaps. */
function itemsToText(items: TextItem[]): string {
  let out = "";
  let lastY: number | null = null;
  let lastHeight = 10;
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const y = item.transform?.[5] ?? null;
    if (lastY !== null && y !== null) {
      const gap = Math.abs(lastY - y);
      if (gap > lastHeight * 1.8) out += "\n\n";
      else if (gap > lastHeight * 0.5 && !out.endsWith("\n")) out += "\n";
    }
    out += item.str;
    if (item.hasEOL) out += "\n";
    if (y !== null) lastY = y;
    if (item.height) lastHeight = item.height;
  }
  return out
    .replace(/-\n(?=[a-z])/g, "") // re-join hyphenated line breaks
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw
    .replace(/^Microsoft (Word|PowerPoint) - /i, "")
    .replace(/\.(docx?|pptx?|pdf)$/i, "")
    .trim();
  if (
    title.length < 4 ||
    /^(untitled|document|slide|presentation)\b/i.test(title) ||
    /^(about|https?|file|blob):/i.test(title)
  )
    return null;
  return title.slice(0, 120);
}

async function open(data: Uint8Array) {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    cMapUrl: path.join(pdfjsRoot, "cmaps") + path.sep,
    cMapPacked: true,
    standardFontDataUrl: path.join(pdfjsRoot, "standard_fonts") + path.sep,
    verbosity: 0,
  }).promise;
}

export async function extractPdfText(buffer: Buffer, maxPages = 2000): Promise<ExtractedPdf> {
  const doc = await open(new Uint8Array(buffer));
  try {
    const pages: string[] = [];
    const emptyPages: number[] = [];
    const count = Math.min(doc.numPages, maxPages);
    for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = itemsToText(content.items as TextItem[]);
      pages.push(text);
      if (text.replace(/\s/g, "").length < 20) emptyPages.push(pageNumber);
      page.cleanup();
    }
    const metadata = await doc.getMetadata().catch(() => null);
    const info = (metadata?.info ?? {}) as { Title?: unknown };
    return { pages, emptyPages, title: cleanTitle(info.Title) };
  } finally {
    await doc.destroy();
  }
}

/** Rasterises one page to PNG (for OCR / vision). Returns null if no canvas backend is available. */
export async function renderPagePng(buffer: Buffer, pageNumber: number, maxWidth = 1400): Promise<Buffer | null> {
  const doc = await open(new Uint8Array(buffer));
  try {
    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2, maxWidth / base.width) });
    const factory = (doc as unknown as { canvasFactory?: any }).canvasFactory;
    if (!factory) return null;
    const { canvas, context } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    const png: Buffer = canvas.toBuffer("image/png");
    return png;
  } catch {
    return null;
  } finally {
    await doc.destroy();
  }
}
