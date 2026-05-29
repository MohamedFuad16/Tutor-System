import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import { createTutorServerApp } from "../.tmp-test/server.mjs";

const startApp = async () => {
  const { app } = await createTutorServerApp({ serveClient: false });
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

test("document ingestion rejects unsupported file types before extraction", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const form = new FormData();
  form.set(
    "file",
    new Blob(["not a pdf"], { type: "text/plain" }),
    "notes.txt",
  );

  const response = await fetch(`${baseUrl}/api/documents/ingest`, {
    method: "POST",
    body: form,
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: "Only PDF documents are supported." });
});
