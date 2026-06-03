import test from "node:test";
import assert from "node:assert/strict";

import {
  createModelRunRecord,
  modelRunIdFor,
  normalizeModelRunStatus,
} from "../.tmp-test/model.runs.mjs";

test("model run events normalize stream status names", () => {
  assert.equal(normalizeModelRunStatus("start"), "started");
  assert.equal(normalizeModelRunStatus("running"), "started");
  assert.equal(normalizeModelRunStatus("success"), "completed");
  assert.equal(normalizeModelRunStatus("complete"), "completed");
  assert.equal(normalizeModelRunStatus("error"), "failed");
  assert.equal(normalizeModelRunStatus("fallback"), "fallback");
});

test("model run ids are stable per stream source and request", () => {
  const input = {
    requestId: "req_123",
    source: "chat_stream",
    status: "completed",
    usedModel: "google/gemini-2.5-flash",
  };

  assert.equal(modelRunIdFor(input), modelRunIdFor(input));
  assert.match(
    modelRunIdFor(input),
    /chat_stream:req_123:completed:google-gemini-2.5-flash$/,
  );
});

test("model run ids preserve fallback and completed phases for one request", () => {
  const base = {
    requestId: "req_123",
    source: "chat_stream",
    requestedModel: "deepseek/deepseek-v4-flash",
    usedModel: "google/gemini-2.5-flash",
  };
  const fallbackId = modelRunIdFor({ ...base, status: "fallback" });
  const completedId = modelRunIdFor({ ...base, status: "completed" });

  assert.notEqual(fallbackId, completedId);
  assert.match(fallbackId, /:fallback:google-gemini-2.5-flash$/);
  assert.match(completedId, /:completed:google-gemini-2.5-flash$/);
});

test("model run records compact errors and preserve tuning metadata", () => {
  const record = createModelRunRecord(
    {
      requestId: "req_123",
      status: "completed",
      provider: "openrouter",
      requestedModel: "deepseek/deepseek-v4-flash",
      usedModel: "google/gemini-2.5-flash",
      inputTokens: 120,
      outputTokens: 80,
      cost: 0.0001234,
      estimated: true,
      durationMs: 42,
      runtimeSettings: {
        webSearchPolicy: "manual_only",
        toolIterationLimit: 4,
      },
      metadata: { messageCount: 3 },
    },
    123,
  );

  assert.equal(record.timestamp, 123);
  assert.equal(record.status, "completed");
  assert.equal(record.usedModel, "google/gemini-2.5-flash");
  assert.equal(record.durationMs, 42);
  assert.equal(record.runtimeSettings.webSearchPolicy, "manual_only");
  assert.equal(record.metadata.messageCount, 3);
});

test("model run numeric fields are clamped to non-negative values", () => {
  const record = createModelRunRecord({
    requestId: "req_456",
    status: "failed",
    inputTokens: -5,
    outputTokens: Number.NaN,
    cost: -2,
    durationMs: -100,
    error: " ".repeat(20) + "provider failed",
  });

  assert.equal(record.inputTokens, 0);
  assert.equal(record.outputTokens, undefined);
  assert.equal(record.cost, 0);
  assert.equal(record.durationMs, 0);
  assert.equal(record.error, "provider failed");
});
