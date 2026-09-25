/**
 * Document ingestion pipeline:
 *   upload → store file → extract text per page (pdf.js) → OCR empty pages
 *   with the multimodal model → chunk + index for retrieval → suggest a book
 *   title → notify the learner's open tabs.
 *
 * Runs in the background with bounded concurrency so a 500-page textbook
 * never blocks the request that uploaded it.
 */
import { Priority, PriorityLimiter } from "../lib/limiter.js";
import { errorMessage, log } from "../lib/log.js";
import type { EventHub } from "../lib/events.js";
import type { LlmProvider } from "../providers/llm.js";
import { parseJsonObject } from "../providers/llm.js";
import type { Store } from "../store/index.js";
import { chunkPages } from "../store/retrieval.js";
import { extractPdfText, renderPagesPng } from "./pdf.js";

const MAX_OCR_PAGES = 30;

export function createIngestService(deps: { store: Store; llm: LlmProvider; events: EventHub }) {
  const { store, llm, events } = deps;
  const workers = new PriorityLimiter("ingest", 2);

  async function ocrImage(userId: string, png: Buffer): Promise<string> {
    const completion = await llm.complete({
      role: "vision",
      purpose: "ocr",
      userId,
      priority: Priority.batch,
      reasoning: "low",
      temperature: 0,
      maxTokens: 2500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Transcribe all text on this document page faithfully, in reading order, as plain text. " +
                "Keep headings on their own lines. For figures or diagrams, add one line: [Figure: short description]. " +
                "Output only the transcription.",
            },
            { type: "image_url", image_url: { url: `data:image/png;base64,${png.toString("base64")}` } },
          ],
        },
      ],
    });
    return completion.text.trim();
  }

  async function suggestTitle(userId: string, sample: string, fallback: string): Promise<string> {
    try {
      const completion = await llm.complete({
        role: "fast",
        purpose: "title",
        userId,
        priority: Priority.background,
        reasoning: "off",
        temperature: 0.2,
        maxTokens: 200,
        json: true,
        messages: [
          {
            role: "system",
            content:
              'Name the study topic of this document in 2-6 words, in the document\'s language. Reply as JSON: {"title": "..."}',
          },
          { role: "user", content: sample.slice(0, 2500) },
        ],
      });
      const title = parseJsonObject<{ title?: string }>(completion.text)?.title?.trim();
      return title && title.length <= 80 ? title : fallback;
    } catch {
      return fallback;
    }
  }

  async function process(userId: string, bookId: string, documentId: string, buffer: Buffer, filename: string) {
    try {
      const extracted = await extractPdfText(buffer);
      const pages = [...extracted.pages];
      let ocrPages = 0;
      const toOcr = extracted.emptyPages.slice(0, MAX_OCR_PAGES);
      if (toOcr.length) {
        // Render sequentially (one parse of the PDF), OCR up to two pages in parallel.
        const ocrLimiter = new PriorityLimiter("ocr", 2);
        const inflight: Array<Promise<void>> = [];
        for await (const { page, png } of renderPagesPng(buffer, toOcr)) {
          const release = await ocrLimiter.acquire(Priority.batch);
          inflight.push(
            ocrImage(userId, png)
              .then((text) => {
                if (text) {
                  pages[page - 1] = text;
                  ocrPages += 1;
                }
              })
              .catch((error) => log.warn("ingest.ocr_failed", { documentId, page, error: errorMessage(error) }))
              .finally(release),
          );
        }
        await Promise.all(inflight);
      }
      const textChars = pages.reduce((sum, page) => sum + page.length, 0);
      if (textChars < 20) {
        throw new Error(
          extracted.emptyPages.length
            ? "This PDF looks scanned and its pages could not be read. Try a PDF with selectable text."
            : "No readable text was found in this PDF.",
        );
      }
      const fileTitle =
        filename
          .replace(/\.pdf$/i, "")
          .replace(/[_-]+/g, " ")
          .trim() || "Document";
      const documentTitle = extracted.title ?? fileTitle;
      store.library.saveExtraction({
        documentId,
        bookId,
        pages,
        chunks: chunkPages(pages),
        ocrPages,
        title: documentTitle,
      });

      // A fresh notebook takes its name from its first document.
      const book = store.library.getBook(userId, bookId);
      if (book && book.documentCount <= 1) {
        const sample = pages.slice(0, 3).join("\n\n");
        const title = await suggestTitle(
          userId,
          `Filename: ${filename}\nTitle: ${documentTitle}\n\n${sample}`,
          documentTitle,
        );
        if (store.library.suggestBookTitle(userId, bookId, title)) {
          const updated = store.library.getBook(userId, bookId);
          if (updated) events.publish(userId, { type: "book.updated", book: updated });
        }
      }
      store.activity.record(userId, "upload", 1, bookId);
      log.info("ingest.done", { documentId, pages: pages.length, ocrPages, textChars });
    } catch (error) {
      log.warn("ingest.failed", { documentId, error: errorMessage(error) });
      store.library.failDocument(documentId, errorMessage(error).slice(0, 300));
    } finally {
      const document = store.library.getDocument(userId, documentId);
      if (document) events.publish(userId, { type: "document.updated", document });
    }
  }

  return {
    /** Registers the upload and schedules processing; returns immediately. */
    async accept(userId: string, bookId: string, file: { buffer: Buffer; originalname: string; size: number }) {
      const filename = file.originalname.slice(0, 200) || "document.pdf";
      const documentId = store.library.createDocument({
        userId,
        bookId,
        title: filename.replace(/\.pdf$/i, ""),
        filename,
        sizeBytes: file.size,
      });
      await store.files.put(userId, documentId, file.buffer);
      store.library.touchBook(bookId);
      void workers.run(() => process(userId, bookId, documentId, file.buffer, filename), {
        priority: Priority.background,
      });
      return store.library.getDocument(userId, documentId)!;
    },

    /** Test hook: run processing inline. */
    process,
  };
}

export type IngestService = ReturnType<typeof createIngestService>;
