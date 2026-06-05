import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createTutorServerApp } from "../.tmp-test/server.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const createPdfFixture = async ({ withText }) => {
  const directory = await mkdtemp(join(tmpdir(), "learningai-pdf-extraction-"));
  const pdfPath = join(directory, withText ? "native.pdf" : "scanned.pdf");
  const python = [
    "import pymupdf, sys",
    "doc = pymupdf.open()",
    "page = doc.new_page()",
    withText
      ? "page.insert_text((72, 96), 'Retrieval Practice Fixture: recall strengthens durable learning.')"
      : "page.draw_rect(pymupdf.Rect(72, 72, 300, 240), color=(0, 0, 0), fill=(0.9, 0.9, 0.9))",
    "doc.save(sys.argv[1])",
    "doc.close()",
  ].join("\n");

  await execFileAsync("python3", ["-c", python, pdfPath], {
    cwd: repoRoot,
  });
  return { directory, pdfPath };
};

const runExtractionScript = async (pdfPath) => {
  const { stdout } = await execFileAsync(
    "python3",
    ["scripts/classify_and_extract.py", pdfPath],
    {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 16,
      timeout: 30_000,
    },
  );
  const jsonStart = stdout.indexOf("{");
  const jsonEnd = stdout.lastIndexOf("}");
  assert.ok(jsonStart >= 0 && jsonEnd > jsonStart, "expected JSON output");
  return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
};

const startApp = async () => {
  const { app } = await createTutorServerApp({ serveClient: false });
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

test("Python extraction classifies native PDFs and returns extracted markdown", async (t) => {
  const fixture = await createPdfFixture({ withText: true });
  t.after(() => rm(fixture.directory, { recursive: true, force: true }));

  const result = await runExtractionScript(fixture.pdfPath);

  assert.equal(result.classification, "Native");
  assert.equal(result.extraction_mode, "pymupdf4llm");
  assert.equal(result.total_pages, 1);
  assert.equal(result.pages_with_text, 1);
  assert.equal(result.images.length, 0);
  assert.match(result.content, /Retrieval Practice Fixture/);
  assert.match(result.content, /durable learning/);
});

test("Python extraction classifies image-only PDFs and returns bounded vision pages", async (t) => {
  const fixture = await createPdfFixture({ withText: false });
  t.after(() => rm(fixture.directory, { recursive: true, force: true }));

  const result = await runExtractionScript(fixture.pdfPath);

  assert.equal(result.classification, "Scanned");
  assert.equal(result.extraction_mode, "vision-ocr");
  assert.equal(result.total_pages, 1);
  assert.equal(result.pages_with_text, 0);
  assert.equal(result.content, "");
  assert.equal(result.vision_page_limit, 20);
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].page_num, 0);
  assert.equal(result.images[0].mime_type, "image/jpeg");
  assert.ok(result.images[0].data.length > 100);
});

test("Express document ingestion exposes normalized native extraction fields without provider calls", async (t) => {
  const fixture = await createPdfFixture({ withText: true });
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());
  t.after(() => rm(fixture.directory, { recursive: true, force: true }));

  const form = new FormData();
  form.set(
    "file",
    new Blob([await readFile(fixture.pdfPath)], {
      type: "application/pdf",
    }),
    "native-fixture.pdf",
  );

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: form,
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.classification, "Native");
  assert.equal(body.extractionMode, "pymupdf4llm");
  assert.equal(body.totalPages, 1);
  assert.equal(body.pagesWithText, 1);
  assert.equal(body.renderedImagePages, 0);
  assert.match(body.content, /Retrieval Practice Fixture/);
});
