/**
 * The learner's PDF on the voice stage: loads a document once (shared with
 * later page turns) and renders a page to a canvas at the stage's size, with
 * its text runs for placing highlights (see ./pageText.ts).
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfjs } from "react-pdf";
import { PDF_OPTIONS } from "@/features/study/pdf/pdfjs";
import { API_BASE, authHeaders } from "@/lib/api";

import type { TextRun } from "./pageText";

export { bounds, locate, type Rect, type TextRun } from "./pageText";

const documents = new Map<string, Promise<PDFDocumentProxy>>();

export function loadDocument(documentId: string): Promise<PDFDocumentProxy> {
  let loading = documents.get(documentId);
  if (!loading) {
    loading = pdfjs.getDocument({
      url: `${API_BASE}/api/documents/${encodeURIComponent(documentId)}/file`,
      httpHeaders: authHeaders(),
      ...PDF_OPTIONS,
    }).promise;
    loading.catch(() => documents.delete(documentId));
    documents.set(documentId, loading);
    // Keep the few most recent documents.
    for (const key of [...documents.keys()].slice(0, -3)) {
      void documents
        .get(key)
        ?.then((doc) => doc.destroy())
        .catch(() => undefined);
      documents.delete(key);
    }
  }
  return loading;
}

/** Renders a page to fit a box and returns its size and text runs. */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  box: { width: number; height: number },
): Promise<{ width: number; height: number; runs: TextRun[] }> {
  const page = await doc.getPage(Math.min(Math.max(1, pageNumber), doc.numPages));
  const natural = page.getViewport({ scale: 1 });
  const scale = Math.min(box.width / natural.width, box.height / natural.height);
  const viewport = page.getViewport({ scale });
  // Extra resolution so the text stays crisp when the camera zooms in on a line
  // (capped so a large page never becomes a huge canvas).
  const wanted = Math.min(4, (window.devicePixelRatio || 1) * 1.9);
  const ratio = Math.max(1, Math.min(wanted, Math.sqrt(14_000_000 / (viewport.width * viewport.height))));
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  const context = canvas.getContext("2d");
  if (context) {
    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    }).promise;
  }
  const content = await page.getTextContent();
  const runs: TextRun[] = [];
  for (const item of content.items) {
    if (!("str" in item) || !item.str) continue;
    const transform = pdfjs.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(transform[2], transform[3]) || 10;
    runs.push({
      str: item.str,
      x: transform[4],
      y: transform[5] - fontHeight,
      width: item.width * scale,
      height: fontHeight,
    });
  }
  return { width: viewport.width, height: viewport.height, runs };
}
