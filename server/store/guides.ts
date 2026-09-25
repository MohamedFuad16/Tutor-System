/**
 * Persistence for the per-book visual study guide.
 */
import { emptyGuide, type StudyGuide } from "../../shared/guide.js";
import { now, type Db } from "./db.js";

export function createGuideRepo(db: Db) {
  const stmts = {
    get: db.prepare(`SELECT * FROM guides WHERE book_id = ?`),
    upsert: db.prepare(
      `INSERT INTO guides (book_id, user_id, version, content_json, covered_seq, syncs, updated_at)
       VALUES (@bookId, @userId, @version, @content, @coveredSeq, @syncs, @now)
       ON CONFLICT(book_id) DO UPDATE SET version = @version, content_json = @content,
         covered_seq = @coveredSeq, syncs = @syncs, updated_at = @now`,
    ),
  };

  return {
    get(bookId: string, title?: string): { guide: StudyGuide; coveredSeq: number; syncs: number } {
      const row = stmts.get.get(bookId) as { content_json: string; covered_seq: number; syncs: number } | undefined;
      if (!row) return { guide: emptyGuide(bookId, title), coveredSeq: 0, syncs: 0 };
      return { guide: JSON.parse(row.content_json), coveredSeq: row.covered_seq, syncs: row.syncs };
    },

    save(userId: string, guide: StudyGuide, coveredSeq: number, syncs: number) {
      stmts.upsert.run({
        bookId: guide.bookId,
        userId,
        version: guide.version,
        content: JSON.stringify(guide),
        coveredSeq,
        syncs,
        now: now(),
      });
    },
  };
}

export type GuideRepo = ReturnType<typeof createGuideRepo>;
