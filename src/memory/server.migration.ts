import { learnerRequestHeaders } from "../lib/localLearnerProfile";
import { db } from "./longterm.memory";

const MIGRATION_VERSION = "learner-store-v1";

const TABLE_NAMES = [
  "concepts",
  "misconceptions",
  "sessions",
  "interactions",
  "flashcards",
  "traceLogs",
  "learningBooks",
  "learningBookConcepts",
  "learningEntries",
  "learningDocuments",
  "bookChatThreads",
  "evidenceEvents",
  "masteryDeltas",
  "memoryEvents",
  "retrievalEvents",
  "correctionEvents",
  "artifactRecords",
  "citationStates",
  "toolJobs",
  "backgroundJobs",
  "modelRuns",
] as const;

const migrationKeyFor = (userId: string) =>
  `learningai:${MIGRATION_VERSION}:${userId}`;

const documentBackfillKeyFor = (userId: string) =>
  `learningai:${MIGRATION_VERSION}:document-backfill:${userId}`;

const jsonSafeRecord = (tableName: string, record: any) => {
  if (tableName !== "learningDocuments") return record;
  const { blob, extractedText, ...rest } = record;
  const extracted = String(extractedText || "");
  return {
    ...rest,
    textPreview:
      record.textPreview || extracted.replace(/\s+/g, " ").slice(0, 6000),
    legacyIndexedDbBlobPreserved: blob instanceof Blob,
    legacyIndexedDbBlobSize: blob instanceof Blob ? blob.size : undefined,
    legacyFullExtractedTextPreserved: Boolean(extracted),
    legacyFullExtractedTextChars: extracted.length || undefined,
  };
};

const backfillLegacyDocumentsToServer = async (userId: string) => {
  const backfillKey = documentBackfillKeyFor(userId);
  if (localStorage.getItem(backfillKey) === "complete") return 0;
  if (typeof FormData === "undefined" || typeof Blob === "undefined") {
    return 0;
  }

  const legacyDocuments = await db.learningDocuments
    .toArray()
    .then((documents) =>
      documents
        .filter(
          (document) =>
            document.userId === userId ||
            (!document.userId && document.storageProvider !== "server-local"),
        )
        .filter(
          (document) =>
            document.storageProvider !== "server-local" &&
            document.blob instanceof Blob,
        )
        .slice(0, 10),
    );

  let copied = 0;
  for (const document of legacyDocuments) {
    const formData = new FormData();
    formData.append(
      "file",
      document.blob as Blob,
      document.title || "document.pdf",
    );
    formData.append("documentId", document.id);
    formData.append("bookId", document.bookId);
    formData.append("title", document.title);
    const response = await fetch("/api/documents/ingest", {
      method: "POST",
      headers: learnerRequestHeaders(userId),
      body: formData,
    });
    if (!response.ok) continue;
    const payload = await response.json();
    const serverDocument = payload?.serverDocument || {};
    await db.learningDocuments.update(document.id, {
      userId,
      storageProvider: "server-local",
      fileUrl: serverDocument.fileUrl,
      textUrl: serverDocument.textUrl,
      textPreview:
        serverDocument.textPreview ||
        document.textPreview ||
        String(document.extractedText || "")
          .replace(/\s+/g, " ")
          .slice(0, 6000),
      extractedText: undefined,
      blob: undefined,
      updatedAt: Date.now(),
    });
    copied += 1;
  }

  localStorage.setItem(backfillKey, "complete");
  return copied;
};

export const syncLearnerProfileAndMigration = async (
  userId: string,
  displayName: string,
) => {
  if (!userId) return { copied: 0, skipped: true };
  await fetch("/api/learner/profile", {
    method: "POST",
    headers: learnerRequestHeaders(userId, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ userId, displayName }),
  });

  const migrationKey = migrationKeyFor(userId);
  if (localStorage.getItem(migrationKey) === "complete") {
    const documentBackfilled = await backfillLegacyDocumentsToServer(userId);
    return { copied: documentBackfilled, skipped: true };
  }

  const records: Array<{
    tableName: string;
    recordId: string;
    record: unknown;
  }> = [];

  for (const tableName of TABLE_NAMES) {
    const table = (db as any)[tableName];
    if (!table?.toArray) continue;
    const rows = await table.toArray();
    rows.slice(0, 500).forEach((row: any) => {
      records.push({
        tableName,
        recordId: String(row.id || `${tableName}:${records.length}`),
        record: {
          ...jsonSafeRecord(tableName, row),
          userId: row.userId || userId,
          migrationSource: "indexeddb-cache",
          migrationVersion: MIGRATION_VERSION,
        },
      });
    });
  }

  if (!records.length) {
    localStorage.setItem(migrationKey, "complete");
    return { copied: 0, skipped: false };
  }

  const response = await fetch("/api/learner/migrate", {
    method: "POST",
    headers: learnerRequestHeaders(userId, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ records }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const result = await response.json();
  const documentBackfilled = await backfillLegacyDocumentsToServer(userId);
  localStorage.setItem(migrationKey, "complete");
  return {
    copied: Number(result.copied || 0) + documentBackfilled,
    skipped: false,
  };
};
