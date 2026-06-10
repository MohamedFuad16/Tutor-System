import Database from "better-sqlite3";
import * as fs from "fs";
import path from "path";

const DEFAULT_USER_ID = "local-default-user";
const USER_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/;

type LearnerStoreOptions = {
  rootDir?: string;
};

type StoreDocumentInput = {
  userId: string;
  documentId: string;
  bookId: string;
  title: string;
  mimeType: string;
  size: number;
  sourcePath: string;
  extractedText: string;
  classification?: string;
  extractionMode?: string;
  totalPages?: number;
  status?: "ready" | "processing" | "failed";
  error?: string;
};

type MigrationRecordInput = {
  userId: string;
  tableName: string;
  recordId: string;
  record: unknown;
};

export type BackgroundTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "inserted";

type BackgroundTaskInput = {
  userId: string;
  taskId: string;
  requestId?: string;
  source?: string;
  status: BackgroundTaskStatus;
  taskType?: string;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  metadata?: unknown;
};

const compact = (value: unknown, fallback = "", limit = 1000) => {
  const text =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? ""
        : JSON.stringify(value);
  return (text || fallback).replace(/\s+/g, " ").trim().slice(0, limit);
};

const sanitizePathSegment = (value: string, fallback: string) =>
  compact(value, fallback, 120)
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || fallback;

export const normalizeLearnerUserId = (value: unknown) => {
  const text = String(value || "").trim();
  if (USER_ID_PATTERN.test(text)) return text;
  return DEFAULT_USER_ID;
};

export const learnerUserIdFromHeaders = (
  headers: Record<string, unknown> | NodeJS.Dict<string | string[]>,
) => {
  const value =
    headers["x-learningai-user-id"] ||
    headers["X-LearningAI-User-Id"] ||
    headers["x-user-id"];
  return normalizeLearnerUserId(Array.isArray(value) ? value[0] : value);
};

export class LearnerStore {
  private readonly rootDir: string;
  private readonly usersDir: string;
  private databases = new Map<string, Database.Database>();

  constructor(options: LearnerStoreOptions = {}) {
    this.rootDir =
      options.rootDir ||
      process.env.LEARNINGAI_DATA_DIR ||
      path.join(process.cwd(), "data");
    this.usersDir = path.join(this.rootDir, "users");
    fs.mkdirSync(this.usersDir, { recursive: true });
  }

  getUserDir(userIdInput: unknown) {
    const userId = normalizeLearnerUserId(userIdInput);
    const userDir = path.join(this.usersDir, userId);
    fs.mkdirSync(path.join(userDir, "pdfs"), { recursive: true });
    fs.mkdirSync(path.join(userDir, "extracted-text"), { recursive: true });
    fs.mkdirSync(path.join(userDir, "artifacts"), { recursive: true });
    return userDir;
  }

  private dbFor(userIdInput: unknown) {
    const userId = normalizeLearnerUserId(userIdInput);
    const cached = this.databases.get(userId);
    if (cached) return cached;
    const dbPath = path.join(this.getUserDir(userId), "brain.sqlite");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS documents (
        user_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        title TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        pdf_path TEXT NOT NULL,
        text_path TEXT,
        classification TEXT,
        extraction_mode TEXT,
        total_pages INTEGER,
        status TEXT NOT NULL,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, document_id)
      );
      CREATE INDEX IF NOT EXISTS documents_user_book_idx
        ON documents (user_id, book_id, updated_at);
      CREATE TABLE IF NOT EXISTS learner_records (
        user_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        copied_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, table_name, record_id)
      );
      CREATE TABLE IF NOT EXISTS background_tasks (
        user_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        request_id TEXT,
        source TEXT,
        task_type TEXT,
        status TEXT NOT NULL,
        input_summary TEXT,
        output_summary TEXT,
        error TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, task_id)
      );
      CREATE INDEX IF NOT EXISTS background_tasks_user_request_idx
        ON background_tasks (user_id, request_id, updated_at);
    `);
    this.databases.set(userId, db);
    return db;
  }

  ensureProfile(userIdInput: unknown, displayNameInput?: unknown) {
    const userId = normalizeLearnerUserId(userIdInput);
    const displayName = compact(displayNameInput, "Learner", 120) || "Learner";
    const now = Date.now();
    const db = this.dbFor(userId);
    db.prepare(
      `INSERT INTO profiles (user_id, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`,
    ).run(userId, displayName, now, now);
    return {
      userId,
      displayName,
      userDir: this.getUserDir(userId),
      databasePath: path.join(this.getUserDir(userId), "brain.sqlite"),
    };
  }

  storeDocument(input: StoreDocumentInput) {
    const userId = normalizeLearnerUserId(input.userId);
    this.ensureProfile(userId);
    const userDir = this.getUserDir(userId);
    const documentSegment = sanitizePathSegment(input.documentId, "document");
    const pdfRelativePath = path.join("pdfs", `${documentSegment}.pdf`);
    const textRelativePath = path.join(
      "extracted-text",
      `${documentSegment}.txt`,
    );
    const pdfPath = path.join(userDir, pdfRelativePath);
    const textPath = path.join(userDir, textRelativePath);
    fs.copyFileSync(input.sourcePath, pdfPath);
    fs.writeFileSync(textPath, input.extractedText || "", "utf8");
    const now = Date.now();
    const db = this.dbFor(userId);
    db.prepare(
      `INSERT INTO documents (
        user_id, document_id, book_id, title, mime_type, size, pdf_path,
        text_path, classification, extraction_mode, total_pages, status,
        error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, document_id) DO UPDATE SET
        book_id = excluded.book_id,
        title = excluded.title,
        mime_type = excluded.mime_type,
        size = excluded.size,
        pdf_path = excluded.pdf_path,
        text_path = excluded.text_path,
        classification = excluded.classification,
        extraction_mode = excluded.extraction_mode,
        total_pages = excluded.total_pages,
        status = excluded.status,
        error = excluded.error,
        updated_at = excluded.updated_at`,
    ).run(
      userId,
      input.documentId,
      input.bookId,
      input.title,
      input.mimeType,
      input.size,
      pdfRelativePath,
      textRelativePath,
      input.classification || null,
      input.extractionMode || null,
      input.totalPages ?? null,
      input.status || "ready",
      input.error || null,
      now,
      now,
    );
    return {
      userId,
      documentId: input.documentId,
      bookId: input.bookId,
      title: input.title,
      mimeType: input.mimeType,
      size: input.size,
      fileUrl: `/api/learner/documents/${encodeURIComponent(input.documentId)}/file?userId=${encodeURIComponent(userId)}`,
      textUrl: `/api/learner/documents/${encodeURIComponent(input.documentId)}/text?userId=${encodeURIComponent(userId)}`,
      textPreview: input.extractedText
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 6000),
      classification: input.classification,
      extractionMode: input.extractionMode,
      totalPages: input.totalPages,
      status: input.status || "ready",
    };
  }

  getDocument(userIdInput: unknown, documentIdInput: unknown) {
    const userId = normalizeLearnerUserId(userIdInput);
    const documentId = String(documentIdInput || "").trim();
    if (!documentId) return null;
    const row = this.dbFor(userId)
      .prepare(
        `SELECT * FROM documents WHERE user_id = ? AND document_id = ? LIMIT 1`,
      )
      .get(userId, documentId) as Record<string, unknown> | undefined;
    if (!row) return null;
    const userDir = this.getUserDir(userId);
    return {
      userId,
      documentId: String(row.document_id),
      bookId: String(row.book_id),
      title: String(row.title),
      mimeType: String(row.mime_type),
      filePath: path.join(userDir, String(row.pdf_path)),
      textPath: row.text_path
        ? path.join(userDir, String(row.text_path))
        : undefined,
      status: String(row.status),
    };
  }

  readDocumentText(userIdInput: unknown, documentIdInput: unknown) {
    const document = this.getDocument(userIdInput, documentIdInput);
    if (!document?.textPath || !fs.existsSync(document.textPath)) return "";
    return fs.readFileSync(document.textPath, "utf8");
  }

  copyMigrationRecords(records: MigrationRecordInput[]) {
    let copied = 0;
    const now = Date.now();
    for (const record of records) {
      const userId = normalizeLearnerUserId(record.userId);
      const tableName = sanitizePathSegment(record.tableName, "unknown");
      const recordId = compact(record.recordId, "record", 500);
      this.ensureProfile(userId);
      this.dbFor(userId)
        .prepare(
          `INSERT INTO learner_records (
            user_id, table_name, record_id, payload_json, copied_at
          ) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, table_name, record_id) DO UPDATE SET
            payload_json = excluded.payload_json,
            copied_at = excluded.copied_at`,
        )
        .run(userId, tableName, recordId, JSON.stringify(record.record), now);
      copied += 1;
    }
    return { copied };
  }

  recordBackgroundTask(input: BackgroundTaskInput) {
    const userId = normalizeLearnerUserId(input.userId);
    const now = Date.now();
    this.ensureProfile(userId);
    const existing = this.dbFor(userId)
      .prepare(
        `SELECT created_at FROM background_tasks WHERE user_id = ? AND task_id = ?`,
      )
      .get(userId, input.taskId) as { created_at?: number } | undefined;
    this.dbFor(userId)
      .prepare(
        `INSERT INTO background_tasks (
          user_id, task_id, request_id, source, task_type, status,
          input_summary, output_summary, error, metadata_json, created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, task_id) DO UPDATE SET
          request_id = excluded.request_id,
          source = excluded.source,
          task_type = excluded.task_type,
          status = excluded.status,
          input_summary = excluded.input_summary,
          output_summary = excluded.output_summary,
          error = excluded.error,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at`,
      )
      .run(
        userId,
        input.taskId,
        input.requestId || null,
        input.source || "client",
        input.taskType || "background_task",
        input.status,
        input.inputSummary || null,
        input.outputSummary || null,
        input.error || null,
        input.metadata === undefined ? null : JSON.stringify(input.metadata),
        existing?.created_at || now,
        now,
      );
    return {
      userId,
      taskId: input.taskId,
      status: input.status,
      updatedAt: now,
    };
  }

  close() {
    for (const db of this.databases.values()) {
      db.close();
    }
    this.databases.clear();
  }
}

export const createLearnerStore = (options?: LearnerStoreOptions) =>
  new LearnerStore(options);
