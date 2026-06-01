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

const readActivity = async (baseUrl) => {
  const response = await fetch(`${baseUrl}/api/debug/system-activity`, {
    cache: "no-store",
  });
  assert.equal(response.status, 200);
  return response.json();
};

test("system activity endpoint exposes local ledger metadata", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const body = await readActivity(baseUrl);

  assert.equal(body.ok, true);
  assert.equal(body.localOnly, true);
  assert.equal(body.retention.limit, 250);
  assert.equal(body.summary.retentionLimit, 250);
  assert.ok(body.summary.total >= 1);
  assert.ok(Array.isArray(body.events));
  assert.ok(body.events.some((event) => event.kind === "system"));
  assert.equal(body.meters.graph.codeArchitecture, "Graphify");
});

test("blocked chat requests are recorded without live model calls", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Explain local observability." }],
      aiModel: "deepseek/deepseek-v4-flash",
    }),
  });

  assert.equal(response.status, 200);
  const streamText = await response.text();
  assert.match(streamText, /OpenRouter API key is required/);
  assert.match(streamText, /"type":"model_run"/);
  assert.match(streamText, /"status":"blocked"/);
  assert.match(streamText, /"requestedModel":"deepseek\/deepseek-v4-flash"/);

  const body = await readActivity(baseUrl);
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "model" &&
        event.status === "blocked" &&
        event.title === "Chat request blocked",
    ),
  );
});
