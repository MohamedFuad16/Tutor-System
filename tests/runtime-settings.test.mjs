import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

import {
  DEFAULT_BRAIN_RUNTIME_SETTINGS,
  MASTERY_EVIDENCE_POLICIES,
  WEB_SEARCH_POLICIES,
  createTutorServerApp,
  normalizeBrainRuntimeSettings,
  parseServerStartOptions,
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

test("server startup options honor CLI host and port overrides", () => {
  assert.deepEqual(
    parseServerStartOptions(["--host", "127.0.0.1", "--port", "3100"], {}),
    {
      host: "127.0.0.1",
      port: 3100,
    },
  );

  assert.deepEqual(
    parseServerStartOptions(["--port=4100", "--host=localhost"], {
      PORT: "3000",
      HOST: "0.0.0.0",
    }),
    {
      host: "localhost",
      port: 4100,
    },
  );

  assert.deepEqual(parseServerStartOptions(["--port", "nope"], {}), {
    host: "0.0.0.0",
    port: 3000,
  });
});

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
      masteryEvidencePolicy: "review_required",
      bktTransitProbability: 0.99,
      bktSlipProbability: -1,
      bktGuessProbability: 0.123,
    }),
    {
      activityRefreshMs: 3000,
      memoryConceptLimit: 24,
      toolIterationLimit: 2,
      webSearchPolicy: "manual_only",
      masteryEvidencePolicy: "review_required",
      bktTransitProbability: 0.35,
      bktSlipProbability: 0.01,
      bktGuessProbability: 0.12,
    },
  );

  assert.ok(WEB_SEARCH_POLICIES.includes("source_first"));
  assert.ok(WEB_SEARCH_POLICIES.includes("manual_only"));
  assert.ok(WEB_SEARCH_POLICIES.includes("auto_freshness"));
  assert.ok(MASTERY_EVIDENCE_POLICIES.includes("validated_only"));
  assert.ok(MASTERY_EVIDENCE_POLICIES.includes("review_required"));

  assert.deepEqual(
    normalizeBrainRuntimeSettings({
      activityRefreshMs: "4500",
      memoryConceptLimit: 7.6,
      toolIterationLimit: "not-a-number",
      webSearchPolicy: "not-a-policy",
      masteryEvidencePolicy: "not-a-policy",
      bktTransitProbability: "0.185",
      bktSlipProbability: "not-a-number",
      bktGuessProbability: "0.214",
    }),
    {
      activityRefreshMs: 4500,
      memoryConceptLimit: 8,
      toolIterationLimit: DEFAULT_BRAIN_RUNTIME_SETTINGS.toolIterationLimit,
      webSearchPolicy: DEFAULT_BRAIN_RUNTIME_SETTINGS.webSearchPolicy,
      masteryEvidencePolicy:
        DEFAULT_BRAIN_RUNTIME_SETTINGS.masteryEvidencePolicy,
      bktTransitProbability: 0.19,
      bktSlipProbability: DEFAULT_BRAIN_RUNTIME_SETTINGS.bktSlipProbability,
      bktGuessProbability: 0.21,
    },
  );
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
  assert.equal(
    body.meters.tuning.masteryEvidencePolicyDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.masteryEvidencePolicy,
  );
  assert.equal(
    body.meters.tuning.bktTransitProbabilityDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.bktTransitProbability,
  );
  assert.equal(
    body.meters.tuning.bktSlipProbabilityDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.bktSlipProbability,
  );
  assert.equal(
    body.meters.tuning.bktGuessProbabilityDefault,
    DEFAULT_BRAIN_RUNTIME_SETTINGS.bktGuessProbability,
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
        masteryEvidencePolicy: "review_required",
        bktTransitProbability: 1,
        bktSlipProbability: 0,
        bktGuessProbability: 0.2,
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
    masteryEvidencePolicy: "review_required",
    bktTransitProbability: 0.35,
    bktSlipProbability: 0.01,
    bktGuessProbability: 0.2,
  });
});
