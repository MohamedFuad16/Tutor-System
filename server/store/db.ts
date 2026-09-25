/**
 * SQLite connection and schema migrations.
 *
 * One database for all learners (rows carry user_id), WAL mode for concurrent
 * readers, FTS5 for document retrieval. Migrations are append-only and keyed
 * by PRAGMA user_version so upgrades are idempotent. The repositories built on
 * top only use portable SQL (apart from FTS), so moving to Postgres later is a
 * repository-level change.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const MIGRATIONS: string[] = [
  // v1: initial schema
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Learner',
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
  );

  CREATE TABLE books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'ink',
    title_locked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX books_user ON books(user_id, updated_at DESC);

  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    error TEXT,
    ocr_pages INTEGER NOT NULL DEFAULT 0,
    last_page INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX documents_book ON documents(book_id, created_at);

  CREATE TABLE pages (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page INTEGER NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (document_id, page)
  );

  CREATE TABLE chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    book_id TEXT NOT NULL,
    page INTEGER NOT NULL,
    text TEXT NOT NULL
  );
  CREATE INDEX chunks_doc ON chunks(document_id, page);
  CREATE INDEX chunks_book ON chunks(book_id);
  CREATE VIRTUAL TABLE chunks_fts USING fts5(
    text, content='chunks', content_rowid='id',
    tokenize='porter unicode61 remove_diacritics 2'
  );
  CREATE VIRTUAL TABLE chunks_tri USING fts5(
    text, content='chunks', content_rowid='id', tokenize='trigram'
  );
  CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
    INSERT INTO chunks_fts(rowid, text) VALUES (new.id, new.text);
    INSERT INTO chunks_tri(rowid, text) VALUES (new.id, new.text);
  END;
  CREATE TRIGGER chunks_ad AFTER DELETE ON chunks BEGIN
    INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES ('delete', old.id, old.text);
    INSERT INTO chunks_tri(chunks_tri, rowid, text) VALUES ('delete', old.id, old.text);
  END;

  CREATE TABLE messages (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    channel TEXT NOT NULL,
    content TEXT NOT NULL,
    parts_json TEXT NOT NULL DEFAULT '[]',
    model TEXT,
    latency_ms INTEGER,
    interrupted INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX messages_book ON messages(book_id, seq);

  CREATE TABLE guides (
    book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    covered_seq INTEGER NOT NULL DEFAULT 0,
    syncs INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    mastery REAL NOT NULL DEFAULT 0.2,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0,
    last_seen_at INTEGER NOT NULL,
    due_at INTEGER,
    created_at INTEGER NOT NULL,
    UNIQUE (book_id, slug)
  );
  CREATE INDEX concepts_user ON concepts(user_id, mastery);

  CREATE TABLE attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    concept_id TEXT,
    kind TEXT NOT NULL,
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    correct INTEGER NOT NULL,
    score REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX attempts_user ON attempts(user_id, created_at);

  CREATE TABLE quizzes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    message_id TEXT,
    payload_json TEXT NOT NULL,
    result_json TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    concept_id TEXT,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    due_at INTEGER NOT NULL,
    interval_days REAL NOT NULL DEFAULT 0,
    ease REAL NOT NULL DEFAULT 2.5,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    source_key TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (book_id, source_key)
  );
  CREATE INDEX cards_due ON cards(user_id, due_at);

  CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page INTEGER NOT NULL,
    kind TEXT NOT NULL,
    color TEXT NOT NULL,
    text TEXT NOT NULL,
    note TEXT,
    rects_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX annotations_doc ON annotations(document_id, page);

  CREATE TABLE activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    book_id TEXT,
    kind TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX activity_user ON activity(user_id, created_at);

  CREATE TABLE llm_usage (
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    model TEXT NOT NULL,
    purpose TEXT NOT NULL,
    calls INTEGER NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_ms INTEGER NOT NULL,
    PRIMARY KEY (user_id, day, model, purpose)
  );
  `,
];

export function openDatabase(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db: Db) {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

export const now = () => Date.now();

export function newId(prefix: string) {
  const random = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${prefix}_${random}`;
}
