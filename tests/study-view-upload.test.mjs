import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const studyViewSource = readFileSync(
  `${repoRoot}/src/views/StudyView.tsx`,
  "utf8",
);

test("StudyView accepts multiple PDFs into one active book upload action", () => {
  assert.match(
    studyViewSource,
    /const attachDocuments = async \(files: File\[\]\)/,
  );
  assert.match(
    studyViewSource,
    /const pdfFiles = files\.filter\(\(file\) => file\.type === "application\/pdf"\)/,
  );
  assert.match(
    studyViewSource,
    /db\.learningDocuments\.bulkPut\(documentRecords\)/,
  );
  assert.match(
    studyViewSource,
    /documentRecords\.forEach\(\(documentRecord, index\)/,
  );
  assert.match(
    studyViewSource,
    /void ingestDocument\(pdfFiles\[index\], documentRecord, book\)/,
  );
  assert.match(studyViewSource, /Array\.from\(e\.target\.files \|\| \[\]\)/);
  assert.match(
    studyViewSource,
    /Array\.from\(e\.dataTransfer\.files \|\| \[\]\)/,
  );
  assert.doesNotMatch(studyViewSource, /files\?\.\[0\]/);
  assert.doesNotMatch(studyViewSource, /dataTransfer\.files\?\.\[0\]/);
});

test("StudyView tracks parallel PDF ingestion per document", () => {
  assert.match(studyViewSource, /activeIngestionCountRef/);
  assert.match(studyViewSource, /cancelledIngestionDocumentIdsRef/);
  assert.match(
    studyViewSource,
    /isDocumentIngestionCancelled\(documentRecord\.id\)/,
  );
  assert.doesNotMatch(studyViewSource, /ingestionSequenceRef/);
});

test("StudyView file inputs expose multi-PDF selection", () => {
  const fileInputs = [
    ...studyViewSource.matchAll(
      /<input\s+type="file"\s+accept="application\/pdf"\s+multiple/g,
    ),
  ];

  assert.equal(fileInputs.length, 2);
});

test("StudyView mobile shell stays height-bound with chat-first overflow", () => {
  assert.match(
    studyViewSource,
    /className="relative flex h-full w-full flex-col gap-3 overflow-hidden/,
  );
  assert.match(studyViewSource, /md:gap-5 md:overflow-y-auto/);
  assert.doesNotMatch(
    studyViewSource,
    /relative flex min-h-\[100dvh\] w-full flex-col gap-3 overflow-y-auto/,
  );
});

test("StudyView reuses PDF object URLs across mobile chat and reader toggles", () => {
  assert.match(studyViewSource, /const documentObjectUrlCache = new Map/);
  assert.match(
    studyViewSource,
    /const cached = documentObjectUrlCache\.get\(document\.id\);/,
  );
  assert.match(
    studyViewSource,
    /if \(cached\?\.blob === sourceBlob\) return cached\.url;/,
  );
  assert.match(studyViewSource, /isMobilePdfOpen \? "hidden md:flex" : "flex"/);
});

test("StudyView keeps mobile context switches on one mounted chat surface", () => {
  assert.match(studyViewSource, /const shouldRenderChatSurface = isChatOpen;/);
  assert.match(
    studyViewSource,
    /setIsMobilePdfOpen\(false\);\s+setIsChatOpen\(true\);/,
  );
  assert.match(
    studyViewSource,
    /data-testid="study-chat-surface"[\s\S]*isMobilePdfOpen \? "hidden md:flex" : "flex"/,
  );
});

test("StudyView preserves the active PDF when removing a different document", () => {
  assert.match(
    studyViewSource,
    /const removedActiveDocument = documentId === activeDocumentId;/,
  );
  assert.match(
    studyViewSource,
    /remainingDocuments\.find\(\(item\) => item\.id === activeDocumentId\)/,
  );
  assert.doesNotMatch(
    studyViewSource,
    /const nextDocument = remainingDocuments\[0\] \|\| null;/,
  );
});
