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
