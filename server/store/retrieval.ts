/**
 * Lexical retrieval over document chunks with SQLite FTS5 (BM25).
 *
 * Latin-script queries use the porter/unicode61 index; queries containing
 * CJK characters use the trigram index, because unicode61 cannot segment
 * Japanese or Chinese. BM25 over well-sized chunks is fast (sub-millisecond
 * for typical books), deterministic and free, which matters for a voice turn
 * budget. Dense embeddings can be layered on later without changing callers.
 */
import type { Db } from "./db.js";

export type RetrievedChunk = {
  id: number;
  documentId: string;
  documentTitle: string;
  page: number;
  text: string;
  score: number;
};

const STOPWORDS = new Set(
  (
    "a an and are as at be but by can could did do does for from had has have how i if in into is it its " +
    "me my of on or our please so tell than that the their them then there these they this those to was " +
    "we were what when where which who why will with would you your explain about page pdf document"
  ).split(" "),
);

const CJK = /[぀-ヿ㐀-鿿가-힯]/;

function latinQuery(text: string): string | null {
  const terms = [
    ...new Set(
      text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^\p{L}\p{N}_]+/u)
        .filter((term) => term.length > 1 && !STOPWORDS.has(term)),
    ),
  ].slice(0, 16);
  if (!terms.length) return null;
  // Quote each term so FTS syntax characters in user text are inert; prefix-match longer terms.
  return terms.map((term) => (term.length >= 4 ? `"${term}"*` : `"${term}"`)).join(" OR ");
}

function trigramQuery(text: string): string | null {
  const runs = text.match(/[぀-ヿ㐀-鿿가-힯\p{L}\p{N}]{3,}/gu) ?? [];
  const grams = new Set<string>();
  for (const run of runs) {
    if (CJK.test(run)) {
      // Every trigram of the run: documents sharing more of them rank higher under BM25.
      for (let i = 0; i + 3 <= run.length && grams.size < 32; i += 1) grams.add(run.slice(i, i + 3));
    } else if (run.length >= 3) {
      grams.add(run.toLowerCase());
    }
  }
  if (!grams.size) return null;
  return [...grams].map((gram) => `"${gram.replace(/"/g, "")}"`).join(" OR ");
}

export function createRetrieval(db: Db) {
  const porter = db.prepare(`
    SELECT c.id, c.document_id AS documentId, d.title AS documentTitle, c.page, c.text, bm25(chunks_fts) AS score
    FROM chunks_fts JOIN chunks c ON c.id = chunks_fts.rowid JOIN documents d ON d.id = c.document_id
    WHERE chunks_fts MATCH @query AND c.book_id = @bookId AND d.user_id = @userId
    ORDER BY score LIMIT @limit`);
  const trigram = db.prepare(`
    SELECT c.id, c.document_id AS documentId, d.title AS documentTitle, c.page, c.text, bm25(chunks_tri) AS score
    FROM chunks_tri JOIN chunks c ON c.id = chunks_tri.rowid JOIN documents d ON d.id = c.document_id
    WHERE chunks_tri MATCH @query AND c.book_id = @bookId AND d.user_id = @userId
    ORDER BY score LIMIT @limit`);

  return {
    search(userId: string, bookId: string, text: string, limit = 6): RetrievedChunk[] {
      const trimmed = text.slice(0, 600);
      const statement = CJK.test(trimmed) ? trigram : porter;
      const query = CJK.test(trimmed) ? trigramQuery(trimmed) : latinQuery(trimmed);
      if (!query) return [];
      try {
        return statement.all({ query, bookId, userId, limit }) as RetrievedChunk[];
      } catch {
        return [];
      }
    },
  };
}

export type Retrieval = ReturnType<typeof createRetrieval>;

/**
 * Splits page texts into overlapping retrieval chunks (~900 chars) that never
 * cross a page boundary, so every hit maps to exactly one citable page.
 */
export function chunkPages(pages: string[], target = 900, overlap = 150): Array<{ page: number; text: string }> {
  const chunks: Array<{ page: number; text: string }> = [];
  pages.forEach((raw, index) => {
    const text = raw
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!text) return;
    if (text.length <= target * 1.3) {
      chunks.push({ page: index + 1, text });
      return;
    }
    let start = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + target);
      if (end < text.length) {
        // Prefer to cut at a paragraph or sentence end near the target.
        const window = text.slice(start + target * 0.6, end);
        const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("。"));
        if (cut > 0) end = start + Math.floor(target * 0.6) + cut + 1;
      }
      chunks.push({ page: index + 1, text: text.slice(start, end).trim() });
      if (end >= text.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  });
  return chunks;
}
