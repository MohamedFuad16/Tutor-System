/**
 * One conversation thread per book, shared by typed chat and voice.
 */
import type { ChatMessage, MessageChannel, MessagePart, MessageRole } from "../../shared/types.js";
import { newId, now, type Db } from "./db.js";

type MessageRow = {
  seq: number;
  id: string;
  book_id: string;
  role: MessageRole;
  channel: MessageChannel;
  content: string;
  parts_json: string;
  model: string | null;
  latency_ms: number | null;
  interrupted: number;
  created_at: number;
};

const toMessage = (row: MessageRow): ChatMessage & { seq: number } => ({
  seq: row.seq,
  id: row.id,
  bookId: row.book_id,
  role: row.role,
  channel: row.channel,
  content: row.content,
  parts: JSON.parse(row.parts_json || "[]") as MessagePart[],
  createdAt: row.created_at,
  model: row.model ?? undefined,
  latencyMs: row.latency_ms ?? undefined,
  interrupted: Boolean(row.interrupted),
});

export function createMessageRepo(db: Db) {
  const stmts = {
    insert: db.prepare(
      `INSERT INTO messages (id, user_id, book_id, role, channel, content, parts_json, model, latency_ms, interrupted, created_at)
       VALUES (@id, @userId, @bookId, @role, @channel, @content, @parts, @model, @latencyMs, @interrupted, @createdAt)`,
    ),
    update: db.prepare(
      `UPDATE messages SET content = @content, parts_json = @parts, model = @model, latency_ms = @latencyMs,
         interrupted = @interrupted WHERE id = @id`,
    ),
    get: db.prepare(`SELECT * FROM messages WHERE id = ? AND user_id = ?`),
    recent: db.prepare(`SELECT * FROM messages WHERE book_id = ? AND user_id = ? ORDER BY seq DESC LIMIT ?`),
    page: db.prepare(`SELECT * FROM messages WHERE book_id = ? AND user_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?`),
    since: db.prepare(`SELECT * FROM messages WHERE book_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?`),
    countSince: db.prepare(`SELECT COUNT(*) AS n, MAX(seq) AS maxSeq FROM messages WHERE book_id = ? AND seq > ?`),
    clear: db.prepare(`DELETE FROM messages WHERE book_id = ? AND user_id = ?`),
  };

  return {
    add(input: {
      userId: string;
      bookId: string;
      role: MessageRole;
      channel: MessageChannel;
      content: string;
      parts?: MessagePart[];
      model?: string;
      latencyMs?: number;
      interrupted?: boolean;
      id?: string;
    }): ChatMessage & { seq: number } {
      const id = input.id ?? newId("msg");
      stmts.insert.run({
        id,
        userId: input.userId,
        bookId: input.bookId,
        role: input.role,
        channel: input.channel,
        content: input.content,
        parts: JSON.stringify(input.parts ?? []),
        model: input.model ?? null,
        latencyMs: input.latencyMs ?? null,
        interrupted: input.interrupted ? 1 : 0,
        createdAt: now(),
      });
      return this.get(input.userId, id)!;
    },

    update(message: ChatMessage) {
      stmts.update.run({
        id: message.id,
        content: message.content,
        parts: JSON.stringify(message.parts ?? []),
        model: message.model ?? null,
        latencyMs: message.latencyMs ?? null,
        interrupted: message.interrupted ? 1 : 0,
      });
    },

    get(userId: string, id: string) {
      const row = stmts.get.get(id, userId) as MessageRow | undefined;
      return row ? toMessage(row) : null;
    },

    /** Most recent messages, oldest first. */
    recent(userId: string, bookId: string, limit = 20) {
      return (stmts.recent.all(bookId, userId, limit) as MessageRow[]).map(toMessage).reverse();
    },

    /** Paginated history for the UI, oldest first within the page. */
    page(userId: string, bookId: string, beforeSeq: number | null, limit = 50) {
      const rows = stmts.page.all(bookId, userId, beforeSeq ?? Number.MAX_SAFE_INTEGER, limit) as MessageRow[];
      return rows.map(toMessage).reverse();
    },

    since(bookId: string, seq: number, limit = 200) {
      return (stmts.since.all(bookId, seq, limit) as MessageRow[]).map(toMessage);
    },

    countSince(bookId: string, seq: number) {
      return stmts.countSince.get(bookId, seq) as { n: number; maxSeq: number | null };
    },

    clear(userId: string, bookId: string) {
      stmts.clear.run(bookId, userId);
    },
  };
}

export type MessageRepo = ReturnType<typeof createMessageRepo>;
