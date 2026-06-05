import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pdfViewerSource = readFileSync(
  `${repoRoot}/src/components/PdfViewer.tsx`,
  "utf8",
);

test("PdfViewer keeps page navigation in a valid one-based range while loading", () => {
  assert.match(
    pdfViewerSource,
    /const boundedPdfTotalPages = Math\.max\(1, pdfTotalPages \|\| 1\);/,
  );
  assert.match(
    pdfViewerSource,
    /const clampPdfPage = \(page: number\) =>\s+Math\.min\(boundedPdfTotalPages, Math\.max\(1, page\)\);/,
  );
  assert.match(pdfViewerSource, /setPdfPage\(clampPdfPage\(pdfPage \+ 1\)\)/);
  assert.match(pdfViewerSource, /setPdfPage\(clampPdfPage\(pdfPage - 1\)\)/);
  assert.doesNotMatch(
    pdfViewerSource,
    /setPdfPage\(Math\.min\(pdfTotalPages, pdfPage \+ 1\)\)/,
  );
});

test("PdfViewer sticky notes keep the selected text through draft save", () => {
  assert.match(pdfViewerSource, /text: string;/);
  assert.match(pdfViewerSource, /text: selectionTooltip\.text,/);
  assert.match(pdfViewerSource, /text: draftNote\.text,/);
  assert.doesNotMatch(
    pdfViewerSource,
    /text: selectionTooltip\?\.text \|\| ""/,
  );
});
