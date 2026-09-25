/**
 * Users, books, documents, pages, chunks and annotations.
 */
import type { Annotation, Book, StudyDocument } from "../../shared/types.js";
import { newId, now, type Db } from "./db.js";

type BookRow = {
  id: string;
  user_id: string;
  title: string;
  theme: Book["theme"];
  title_locked: number;
  created_at: number;
  updated_at: number;
  document_count: number;
  message_count: number;
  concept_count: number;
  guide_version: number | null;
};

type DocumentRow = {
  id: string;
  book_id: string;
  title: string;
  filename: string;
  size_bytes: number;
  page_count: number;
  status: StudyDocument["status"];
  error: string | null;
  ocr_pages: number;
  last_page: number;
  created_at: number;
};

const THEMES: Book["theme"][] = ["ink", "ember", "paper"];

const toBook = (row: BookRow): Book => ({
  id: row.id,
  title: row.title,
  theme: row.theme,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  documentCount: row.document_count,
  messageCount: row.message_count,
  conceptCount: row.concept_count,
  guideVersion: row.guide_version ?? 0,
});

export const toDocument = (row: DocumentRow): StudyDocument => ({
  id: row.id,
  bookId: row.book_id,
  title: row.title,
  filename: row.filename,
  sizeBytes: row.size_bytes,
  pageCount: row.page_count,
  status: row.status,
  error: row.error ?? undefined,
  ocrPages: row.ocr_pages,
  createdAt: row.created_at,
  lastPage: row.last_page,
});

const BOOK_SELECT = `
  SELECT b.*,
    (SELECT COUNT(*) FROM documents d WHERE d.book_id = b.id) AS document_count,
    (SELECT COUNT(*) FROM messages m WHERE m.book_id = b.id) AS message_count,
    (SELECT COUNT(*) FROM concepts c WHERE c.book_id = b.id) AS concept_count,
    (SELECT g.version FROM guides g WHERE g.book_id = b.id) AS guide_version
  FROM books b`;

export function createLibraryRepo(db: Db) {
  const stmts = {
    upsertUser: db.prepare(
      `INSERT INTO users (id, name, created_at, last_seen_at) VALUES (@id, @name, @now, @now)
       ON CONFLICT(id) DO UPDATE SET last_seen_at = @now,
         name = CASE WHEN @explicit = 1 THEN @name ELSE users.name END`,
    ),
    getUser: db.prepare(`SELECT id, name, created_at AS createdAt FROM users WHERE id = ?`),
    listBooks: db.prepare(`${BOOK_SELECT} WHERE b.user_id = ? ORDER BY b.updated_at DESC`),
    getBook: db.prepare(`${BOOK_SELECT} WHERE b.id = ? AND b.user_id = ?`),
    insertBook: db.prepare(
      `INSERT INTO books (id, user_id, title, theme, title_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ),
    renameBook: db.prepare(`UPDATE books SET title = ?, title_locked = ?, updated_at = ? WHERE id = ? AND user_id = ?`),
    touchBook: db.prepare(`UPDATE books SET updated_at = ? WHERE id = ?`),
    deleteBook: db.prepare(`DELETE FROM books WHERE id = ? AND user_id = ?`),
    bookCount: db.prepare(`SELECT COUNT(*) AS n FROM books WHERE user_id = ?`),
    titleLocked: db.prepare(`SELECT title_locked AS locked, title FROM books WHERE id = ?`),

    insertDocument: db.prepare(
      `INSERT INTO documents (id, user_id, book_id, title, filename, size_bytes, status, created_at, updated_at)
       VALUES (@id, @userId, @bookId, @title, @filename, @sizeBytes, 'processing', @now, @now)`,
    ),
    listDocuments: db.prepare(`SELECT * FROM documents WHERE book_id = ? AND user_id = ? ORDER BY created_at`),
    getDocument: db.prepare(`SELECT * FROM documents WHERE id = ? AND user_id = ?`),
    getDocumentById: db.prepare(`SELECT * FROM documents WHERE id = ?`),
    finishDocument: db.prepare(
      `UPDATE documents SET status = @status, error = @error, page_count = @pageCount, ocr_pages = @ocrPages,
         title = COALESCE(@title, title), updated_at = @now WHERE id = @id`,
    ),
    setLastPage: db.prepare(`UPDATE documents SET last_page = ?, updated_at = ? WHERE id = ? AND user_id = ?`),
    deleteDocument: db.prepare(`DELETE FROM documents WHERE id = ? AND user_id = ?`),

    insertPage: db.prepare(`INSERT OR REPLACE INTO pages (document_id, page, text) VALUES (?, ?, ?)`),
    getPage: db.prepare(`SELECT text FROM pages WHERE document_id = ? AND page = ?`),
    pageRange: db.prepare(`SELECT page, text FROM pages WHERE document_id = ? AND page BETWEEN ? AND ? ORDER BY page`),
    insertChunk: db.prepare(`INSERT INTO chunks (document_id, book_id, page, text) VALUES (?, ?, ?, ?)`),
    clearChunks: db.prepare(`DELETE FROM chunks WHERE document_id = ?`),

    listAnnotations: db.prepare(
      `SELECT * FROM annotations WHERE document_id = ? AND user_id = ? ORDER BY page, created_at`,
    ),
    insertAnnotation: db.prepare(
      `INSERT INTO annotations (id, user_id, document_id, page, kind, color, text, note, rects_json, created_at)
       VALUES (@id, @userId, @documentId, @page, @kind, @color, @text, @note, @rects, @createdAt)`,
    ),
    deleteAnnotation: db.prepare(`DELETE FROM annotations WHERE id = ? AND user_id = ?`),
  };

  return {
    ensureUser(id: string, name?: string) {
      stmts.upsertUser.run({ id, name: name?.trim() || "Learner", explicit: name?.trim() ? 1 : 0, now: now() });
      return stmts.getUser.get(id) as { id: string; name: string; createdAt: number };
    },

    listBooks(userId: string): Book[] {
      return (stmts.listBooks.all(userId) as BookRow[]).map(toBook);
    },

    getBook(userId: string, bookId: string): Book | null {
      const row = stmts.getBook.get(bookId, userId) as BookRow | undefined;
      return row ? toBook(row) : null;
    },

    createBook(userId: string, title: string, theme?: Book["theme"]): Book {
      const id = newId("book");
      const count = (stmts.bookCount.get(userId) as { n: number }).n;
      const t = now();
      stmts.insertBook.run(id, userId, title.trim() || "New notebook", theme ?? THEMES[count % THEMES.length], 0, t, t);
      return this.getBook(userId, id)!;
    },

    renameBook(userId: string, bookId: string, title: string, lock = true) {
      stmts.renameBook.run(title.trim().slice(0, 120), lock ? 1 : 0, now(), bookId, userId);
      return this.getBook(userId, bookId);
    },

    /** Auto-title a book unless the learner already named it. Returns true if renamed. */
    suggestBookTitle(userId: string, bookId: string, title: string) {
      const row = stmts.titleLocked.get(bookId) as { locked: number; title: string } | undefined;
      if (!row || row.locked || !title.trim()) return false;
      stmts.renameBook.run(title.trim().slice(0, 120), 0, now(), bookId, userId);
      return true;
    },

    touchBook(bookId: string) {
      stmts.touchBook.run(now(), bookId);
    },

    deleteBook(userId: string, bookId: string) {
      return stmts.deleteBook.run(bookId, userId).changes > 0;
    },

    createDocument(input: { userId: string; bookId: string; title: string; filename: string; sizeBytes: number }) {
      const id = newId("doc");
      stmts.insertDocument.run({ ...input, id, now: now() });
      return id;
    },

    listDocuments(userId: string, bookId: string): StudyDocument[] {
      return (stmts.listDocuments.all(bookId, userId) as DocumentRow[]).map(toDocument);
    },

    getDocument(userId: string, documentId: string): StudyDocument | null {
      const row = stmts.getDocument.get(documentId, userId) as DocumentRow | undefined;
      return row ? toDocument(row) : null;
    },

    getDocumentOwner(documentId: string): { userId: string; bookId: string } | null {
      const row = stmts.getDocumentById.get(documentId) as (DocumentRow & { user_id: string }) | undefined;
      return row ? { userId: row.user_id, bookId: row.book_id } : null;
    },

    /** Stores extracted pages and retrieval chunks atomically, then marks the document ready. */
    saveExtraction(input: {
      documentId: string;
      bookId: string;
      pages: string[];
      chunks: Array<{ page: number; text: string }>;
      ocrPages: number;
      title?: string;
    }) {
      db.transaction(() => {
        stmts.clearChunks.run(input.documentId);
        input.pages.forEach((text, index) => stmts.insertPage.run(input.documentId, index + 1, text));
        for (const chunk of input.chunks) stmts.insertChunk.run(input.documentId, input.bookId, chunk.page, chunk.text);
        stmts.finishDocument.run({
          id: input.documentId,
          status: "ready",
          error: null,
          pageCount: input.pages.length,
          ocrPages: input.ocrPages,
          title: input.title ?? null,
          now: now(),
        });
      })();
    },

    failDocument(documentId: string, error: string) {
      stmts.finishDocument.run({
        id: documentId,
        status: "failed",
        error,
        pageCount: 0,
        ocrPages: 0,
        title: null,
        now: now(),
      });
    },

    setLastPage(userId: string, documentId: string, page: number) {
      stmts.setLastPage.run(Math.max(1, Math.floor(page)), now(), documentId, userId);
    },

    deleteDocument(userId: string, documentId: string) {
      return stmts.deleteDocument.run(documentId, userId).changes > 0;
    },

    getPageText(documentId: string, page: number): string {
      return ((stmts.getPage.get(documentId, page) as { text: string } | undefined)?.text ?? "").trim();
    },

    getPages(documentId: string, from: number, to: number): Array<{ page: number; text: string }> {
      return stmts.pageRange.all(documentId, from, to) as Array<{ page: number; text: string }>;
    },

    listAnnotations(userId: string, documentId: string): Annotation[] {
      return (stmts.listAnnotations.all(documentId, userId) as any[]).map((row) => ({
        id: row.id,
        documentId: row.document_id,
        page: row.page,
        kind: row.kind,
        color: row.color,
        text: row.text,
        note: row.note ?? undefined,
        rects: JSON.parse(row.rects_json),
        createdAt: row.created_at,
      }));
    },

    addAnnotation(userId: string, input: Omit<Annotation, "id" | "createdAt">): Annotation {
      const annotation: Annotation = { ...input, id: newId("ann"), createdAt: now() };
      stmts.insertAnnotation.run({
        id: annotation.id,
        userId,
        documentId: annotation.documentId,
        page: annotation.page,
        kind: annotation.kind,
        color: annotation.color,
        text: annotation.text.slice(0, 4000),
        note: annotation.note?.slice(0, 4000) ?? null,
        rects: JSON.stringify(annotation.rects.slice(0, 200)),
        createdAt: annotation.createdAt,
      });
      return annotation;
    },

    deleteAnnotation(userId: string, id: string) {
      return stmts.deleteAnnotation.run(id, userId).changes > 0;
    },
  };
}

export type LibraryRepo = ReturnType<typeof createLibraryRepo>;
