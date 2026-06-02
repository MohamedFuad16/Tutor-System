import test from "node:test";
import assert from "node:assert/strict";

import {
  backgroundJobIdFor,
  createBackgroundJobRecord,
  nextBackgroundJobFailureStatus,
  normalizeBackgroundJobStatus,
} from "../.tmp-test/background.jobs.mjs";

test("background job events normalize lifecycle status names", () => {
  assert.equal(normalizeBackgroundJobStatus("started"), "running");
  assert.equal(normalizeBackgroundJobStatus("success"), "completed");
  assert.equal(normalizeBackgroundJobStatus("error"), "failed");
  assert.equal(normalizeBackgroundJobStatus("dead-letter"), "dead_letter");
  assert.equal(
    normalizeBackgroundJobStatus("retry_scheduled"),
    "retry_scheduled",
  );
});

test("background job ids are stable per request, job, and runtime anchor", () => {
  const input = {
    requestId: "req_123",
    jobName: "interaction_memory_capture",
    metadata: { interactionId: "interaction_abc" },
  };

  assert.equal(backgroundJobIdFor(input), backgroundJobIdFor(input));
  assert.match(
    backgroundJobIdFor(input),
    /req_123:interaction_memory_capture:interaction_abc$/,
  );
});

test("background job records compact summaries and clamp attempt data", () => {
  const record = createBackgroundJobRecord(
    {
      requestId: "req_123",
      jobName: "interaction_memory_capture",
      status: "retry_scheduled",
      source: "memory_orchestrator",
      queue: "learner_memory",
      attempt: 8,
      maxAttempts: 3,
      inputSummary: ` ${"capture ".repeat(120)} `,
      durationMs: -50,
      metadata: { interactionId: "interaction_1", pageNumber: 7 },
    },
    123,
  );

  assert.equal(record.timestamp, 123);
  assert.equal(record.status, "retry_scheduled");
  assert.equal(record.attempt, 3);
  assert.equal(record.maxAttempts, 3);
  assert.equal(record.durationMs, 0);
  assert.equal(record.metadata.pageNumber, 7);
  assert.ok(record.inputSummary.length <= 500);
});

test("background job failure routing retries before dead-letter", () => {
  assert.equal(nextBackgroundJobFailureStatus(1, 2), "retry_scheduled");
  assert.equal(nextBackgroundJobFailureStatus(2, 2), "dead_letter");
  assert.equal(nextBackgroundJobFailureStatus(10, 2), "dead_letter");
});
