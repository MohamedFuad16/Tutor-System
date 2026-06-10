import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";

import {
  createLearnerStore,
  normalizeLearnerUserId,
} from "../.tmp-test/learner-store.mjs";

const withStore = (fn) => {
  const rootDir = mkdtempSync(join(tmpdir(), "learningai-learner-store-"));
  const store = createLearnerStore({ rootDir });
  try {
    return fn(store, rootDir);
  } finally {
    store.close();
    rmSync(rootDir, { recursive: true, force: true });
  }
};

test("learner user ids normalize to safe local profile ids", () => {
  assert.equal(normalizeLearnerUserId("local-maya_123"), "local-maya_123");
  assert.equal(normalizeLearnerUserId("../escape"), "local-default-user");
  assert.equal(normalizeLearnerUserId("x"), "local-default-user");
});

test("server learner store persists PDFs and extracted text per user", () =>
  withStore((store, rootDir) => {
    const sourcePdf = join(rootDir, "source.pdf");
    writeFileSync(sourcePdf, Buffer.from("%PDF-learner-store"));

    const profile = store.ensureProfile("local-maya", "Maya");
    const document = store.storeDocument({
      userId: profile.userId,
      documentId: "doc:abc",
      bookId: "book:general-study",
      title: "Algorithms",
      mimeType: "application/pdf",
      size: 18,
      sourcePath: sourcePdf,
      extractedText: "Binary search halves the search interval.",
      classification: "Native",
      extractionMode: "pymupdf4llm",
      totalPages: 4,
    });

    assert.equal(document.userId, "local-maya");
    assert.match(document.fileUrl, /userId=local-maya/);
    assert.equal(
      store.readDocumentText("local-maya", "doc:abc"),
      "Binary search halves the search interval.",
    );

    const stored = store.getDocument("local-maya", "doc:abc");
    assert.ok(stored);
    assert.ok(existsSync(stored.filePath));
    assert.equal(readFileSync(stored.filePath, "utf8"), "%PDF-learner-store");

    const db = new Database(
      join(rootDir, "users", "local-maya", "brain.sqlite"),
    );
    try {
      const row = db
        .prepare("SELECT user_id, document_id, book_id FROM documents")
        .get();
      assert.deepEqual(row, {
        user_id: "local-maya",
        document_id: "doc:abc",
        book_id: "book:general-study",
      });
    } finally {
      db.close();
    }
  }));

test("migration snapshots and background tasks remain user scoped", () =>
  withStore((store, rootDir) => {
    const migration = store.copyMigrationRecords([
      {
        userId: "local-ada",
        tableName: "learningBooks",
        recordId: "book:general-study",
        record: { id: "book:general-study", title: "Ada Book" },
      },
      {
        userId: "local-grace",
        tableName: "learningBooks",
        recordId: "book:general-study",
        record: { id: "book:general-study", title: "Grace Book" },
      },
    ]);
    assert.equal(migration.copied, 2);

    store.recordBackgroundTask({
      userId: "local-ada",
      taskId: "task-1",
      requestId: "voice-1",
      source: "voice_broker",
      taskType: "async_tool_or_research",
      status: "queued",
      inputSummary: "Search this in the background",
    });
    store.recordBackgroundTask({
      userId: "local-ada",
      taskId: "task-1",
      requestId: "voice-1",
      source: "voice_broker",
      taskType: "async_tool_or_research",
      status: "completed",
      outputSummary: "Background result inserted",
    });

    const adaDb = new Database(
      join(rootDir, "users", "local-ada", "brain.sqlite"),
    );
    const graceDb = new Database(
      join(rootDir, "users", "local-grace", "brain.sqlite"),
    );
    try {
      assert.equal(
        adaDb.prepare("SELECT COUNT(*) AS count FROM learner_records").get()
          .count,
        1,
      );
      assert.equal(
        graceDb.prepare("SELECT COUNT(*) AS count FROM learner_records").get()
          .count,
        1,
      );
      assert.equal(
        adaDb.prepare("SELECT status FROM background_tasks").get().status,
        "completed",
      );
      assert.equal(
        graceDb.prepare("SELECT COUNT(*) AS count FROM background_tasks").get()
          .count,
        0,
      );
    } finally {
      adaDb.close();
      graceDb.close();
    }
  }));
