import test from "node:test";
import assert from "node:assert/strict";

import {
  createToolJobRecord,
  normalizeToolJobStatus,
  toolJobIdFor,
} from "../.tmp-test/tool.jobs.mjs";

test("tool job events normalize stream status names", () => {
  assert.equal(normalizeToolJobStatus("started"), "running");
  assert.equal(normalizeToolJobStatus("success"), "completed");
  assert.equal(normalizeToolJobStatus("error"), "failed");
  assert.equal(normalizeToolJobStatus("blocked"), "blocked");
});

test("tool job ids are stable per request, tool, and tool call", () => {
  const input = {
    requestId: "req_123",
    toolName: "web_search",
    metadata: { toolCallId: "call_abc" },
  };

  assert.equal(toolJobIdFor(input), toolJobIdFor(input));
  assert.match(toolJobIdFor(input), /req_123:web_search:call_abc$/);
});

test("tool job records compact summaries and preserve runtime metadata", () => {
  const record = createToolJobRecord(
    {
      requestId: "req_123",
      toolName: "generate_flashcards",
      status: "completed",
      source: "chat_stream",
      inputSummary: "  make cards  ",
      outputSummary: "created cards",
      durationMs: 42,
      metadata: { toolCallId: "call_1", cardCount: 3 },
    },
    123,
  );

  assert.equal(record.timestamp, 123);
  assert.equal(record.status, "completed");
  assert.equal(record.inputSummary, "make cards");
  assert.equal(record.outputSummary, "created cards");
  assert.equal(record.metadata.cardCount, 3);
});
