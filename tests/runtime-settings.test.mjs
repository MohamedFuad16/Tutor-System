import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import {
  DEFAULT_BRAIN_RUNTIME_SETTINGS,
  WEB_SEARCH_POLICIES,
  createTutorServerApp,
  normalizeBrainRuntimeSettings,
} from "../.tmp-test/server.mjs";

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

test("runtime settings normalization clamps local tuning controls", () => {
  assert.deepEqual(normalizeBrainRuntimeSettings(null), {
    ...DEFAULT_BRAIN_RUNTIME_SETTINGS,
  });

  assert.deepEqual(
    normalizeBrainRuntimeSettings({
      activityRefreshMs: 1200,
      memoryConceptLimit: 99,
      toolIterationLimit: -4,
      webSearchPolicy: "manual_only",
    }),
    {
      activityRefreshMs: 3000,
      memoryConceptLimit: 24,
      toolIterationLimit: 2,
      webSearchPolicy: "manual_only",
    },
  );

  assert.ok(WEB_SEARCH_POLICIES.includes("source_first"));
  assert.ok(WEB_SEARCH_POLICIES.includes("manual_only"));
  assert.ok(WEB_SEARCH_POLICIES.includes("auto_freshness"));
});

test("system activity exposes runtime tuning defaults", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const body = await readActivity(baseUrl);

  assert.equal(
    body.meters.tuning.toolIterationLimitDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.toolIterationLimit,
  );
  assert.equal(
    body.meters.tuning.memoryConceptLimitDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.memoryConceptLimit,
  );
  assert.equal(
    body.meters.tuning.webSearchPolicyDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.webSearchPolicy,
  );
});

test("blocked chat activity records normalized runtime settings", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Explain this page." }],
      aiModel: "deepseek/deepseek-v4-flash",
      runtimeSettings: {
        activityRefreshMs: 999999,
        memoryConceptLimit: 2,
        toolIterationLimit: 88,
        webSearchPolicy: "manual_only",
      },
    }),
  });

  assert.equal(response.status, 200);
  const streamText = await response.text();
  assert.match(streamText, /"type":"model_run"/);
  assert.match(streamText, /"runtimeSettings"/);
  assert.match(streamText, /"toolIterationLimit":8/);

  const body = await readActivity(baseUrl);
  const blockedEvent = body.events.find(
    (event) =>
      event.kind === "model" &&
      event.status === "blocked" &&
      event.title === "Chat request blocked",
  );

  assert.deepEqual(blockedEvent.metadata.runtimeSettings, {
    activityRefreshMs: 30000,
    memoryConceptLimit: 4,
    toolIterationLimit: 8,
    webSearchPolicy: "manual_only",
  });
});
