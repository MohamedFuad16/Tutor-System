import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const tmpDir = path.join(rootDir, ".tmp-test");
const accessPlansOutfile = path.join(tmpDir, "analytics-access-plans.mjs");
const storeOutfile = path.join(tmpDir, "analytics-store.mjs");

class MemoryStorage {
  constructor(seed = {}) {
    this.values = new Map(
      Object.entries(seed).map(([key, value]) => [key, String(value)]),
    );
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

let buildPromise;

const buildAnalyticsBundles = async () => {
  if (!buildPromise) {
    buildPromise = (async () => {
      await mkdir(tmpDir, { recursive: true });
      await Promise.all([
        build({
          entryPoints: [path.join(rootDir, "src/lib/accessPlans.ts")],
          outfile: accessPlansOutfile,
          bundle: true,
          platform: "node",
          format: "esm",
          logLevel: "silent",
        }),
        build({
          entryPoints: [path.join(rootDir, "src/store/index.ts")],
          outfile: storeOutfile,
          bundle: true,
          platform: "node",
          format: "esm",
          packages: "external",
          logLevel: "silent",
        }),
      ]);
    })();
  }

  await buildPromise;
};

const importFresh = async (outfile) =>
  import(`${pathToFileURL(outfile).href}?case=${Date.now()}_${Math.random()}`);

const loadAccessPlans = async () => {
  await buildAnalyticsBundles();
  return importFresh(accessPlansOutfile);
};

const loadStore = async (seed = {}) => {
  await buildAnalyticsBundles();
  const storage = new MemoryStorage(seed);
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });
  const { useStore } = await importFresh(storeOutfile);
  return { storage, useStore };
};

test("plan assumptions preserve request tiers and service-time progress math", async () => {
  const {
    estimateServiceMinutes,
    formatServiceTime,
    getPlanOption,
    planOptions,
    serviceMilestones,
  } = await loadAccessPlans();

  assert.deepEqual(
    planOptions.map(({ id, dailyRequests }) => ({ id, dailyRequests })),
    [
      { id: "free", dailyRequests: 40 },
      { id: "plus", dailyRequests: 180 },
      { id: "pro", dailyRequests: 600 },
    ],
  );
  assert.deepEqual(
    serviceMilestones.map(({ label, minutes }) => ({ label, minutes })),
    [
      { label: "30 mins", minutes: 30 },
      { label: "1 hr", minutes: 60 },
      { label: "3 hrs", minutes: 180 },
    ],
  );
  assert.equal(getPlanOption("plus").dailyRequests, 180);
  assert.equal(getPlanOption("unknown-tier").id, "free");

  assert.equal(
    estimateServiceMinutes({
      chatRequests: 2,
      webRequests: 3,
      voiceSeconds: 90,
    }),
    19.5,
  );
  assert.equal(
    estimateServiceMinutes({
      chatRequests: -8,
      webRequests: 0,
      voiceSeconds: 0,
    }),
    0,
  );
  assert.equal(
    estimateServiceMinutes({
      chatRequests: 200,
      webRequests: 200,
      voiceSeconds: 9999,
    }),
    180,
  );

  assert.equal(formatServiceTime(19.5), "20m");
  assert.equal(formatServiceTime(60), "1h");
  assert.equal(formatServiceTime(125), "2h 5m");
});

test("usage signals accumulate chat, web, and voice costs into persisted analytics", async () => {
  const { storage, useStore } = await loadStore({
    usage_analytics_v1: JSON.stringify({
      chatUsage: {
        inputTokens: 10,
        outputTokens: 5,
        cost: 0.01,
        requests: 2,
      },
      voiceUsage: {
        connectionSeconds: 30,
        cost: 0.02,
        sessions: 1,
      },
      webUsage: {
        requests: 1,
        searchRequests: 1,
        sourcesReviewed: 4,
        cost: 0.03,
      },
      pricing: {
        source: "server",
        stale: false,
        deepgram: { aura1Per1kCharacters: 0.02 },
        openRouterModels: {
          "deepseek/deepseek-v4-flash": {
            prompt: 0.0000001,
            completion: 0.0000002,
          },
        },
      },
    }),
  });

  let state = useStore.getState();
  assert.equal(state.totalTokens, 15);
  assert.equal(state.estimatedCost, 0.06);
  assert.equal(state.pricing.deepgram.voiceAgentPerMinute, 0.075);
  assert.equal(state.pricing.deepgram.aura1Per1kCharacters, 0.02);

  state.recordChatUsage({
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4.5",
    inputTokens: 100,
    outputTokens: 50,
    cost: 0.12,
    estimated: true,
  });
  state.recordWebUsage({
    provider: "serper",
    requests: 2,
    searchRequests: 1,
    newsRequests: 1,
    sourcesReviewed: 6,
    failures: 1,
    cost: 0.04,
    estimated: true,
  });
  state.recordVoiceUsage({
    provider: "deepgram",
    voiceAgentModel: "Deepgram Voice Agent",
    connectionSeconds: 90,
    inputAudioSeconds: 12,
    outputAudioSeconds: 18,
    ttsCharacters: 400,
    sessions: 1,
    cost: 0.08,
  });

  state = useStore.getState();
  assert.equal(state.chatUsage.requests, 3);
  assert.equal(state.chatUsage.inputTokens, 110);
  assert.equal(state.chatUsage.outputTokens, 55);
  assert.equal(state.chatUsage.model, "anthropic/claude-sonnet-4.5");
  assert.equal(state.webUsage.requests, 3);
  assert.equal(state.webUsage.newsRequests, 1);
  assert.equal(state.webUsage.sourcesReviewed, 10);
  assert.equal(state.voiceUsage.connectionSeconds, 120);
  assert.equal(state.voiceUsage.ttsCharacters, 400);
  assert.equal(state.voiceUsage.sessions, 2);
  assert.equal(state.totalTokens, 165);
  assert.ok(Math.abs(state.estimatedCost - 0.3) < Number.EPSILON * 4);

  const persisted = JSON.parse(storage.getItem("usage_analytics_v1"));
  assert.equal(persisted.chatUsage.requests, 3);
  assert.equal(persisted.webUsage.failures, 1);
  assert.equal(persisted.voiceUsage.connectionSeconds, 120);
  assert.equal(persisted.pricing.source, "server");
});

test("settings store sanitizes plan, access, and runtime preferences", async () => {
  const { storage, useStore } = await loadStore({
    access_mode: "root",
    plan_tier: "enterprise",
    brain_runtime_settings: JSON.stringify({
      activityRefreshMs: 500,
      memoryConceptLimit: 99,
      toolIterationLimit: 4,
      webSearchPolicy: "not-real",
    }),
  });

  let state = useStore.getState();
  assert.equal(state.accessMode, "user");
  assert.equal(state.planTier, "free");
  assert.deepEqual(state.brainRuntimeSettings, {
    activityRefreshMs: 3000,
    memoryConceptLimit: 24,
    toolIterationLimit: 4,
    webSearchPolicy: "source_first",
  });

  state.setAccessMode("admin");
  state.setPlanTier("pro");
  state.setBrainRuntimeSettings({
    activityRefreshMs: 4200,
    toolIterationLimit: 99,
    webSearchPolicy: "auto_freshness",
  });

  state = useStore.getState();
  assert.equal(state.accessMode, "admin");
  assert.equal(state.planTier, "pro");
  assert.deepEqual(state.brainRuntimeSettings, {
    activityRefreshMs: 4200,
    memoryConceptLimit: 24,
    toolIterationLimit: 8,
    webSearchPolicy: "auto_freshness",
  });
  assert.equal(storage.getItem("access_mode"), "admin");
  assert.equal(storage.getItem("plan_tier"), "pro");
  assert.deepEqual(JSON.parse(storage.getItem("brain_runtime_settings")), {
    activityRefreshMs: 4200,
    memoryConceptLimit: 24,
    toolIterationLimit: 8,
    webSearchPolicy: "auto_freshness",
  });

  state.resetBrainRuntimeSettings();
  assert.deepEqual(useStore.getState().brainRuntimeSettings, {
    activityRefreshMs: 5000,
    memoryConceptLimit: 12,
    toolIterationLimit: 5,
    webSearchPolicy: "source_first",
  });
});
