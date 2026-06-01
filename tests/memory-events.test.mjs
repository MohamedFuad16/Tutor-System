import test from "node:test";
import assert from "node:assert/strict";

import {
  createMemoryEventRecord,
  memoryEventIdFor,
  normalizeMemoryEventStatus,
} from "../.tmp-test/memory.events.mjs";

test("memory events normalize stream status names", () => {
  assert.equal(normalizeMemoryEventStatus("start"), "pending");
  assert.equal(normalizeMemoryEventStatus("running"), "pending");
  assert.equal(normalizeMemoryEventStatus("success"), "completed");
  assert.equal(normalizeMemoryEventStatus("complete"), "completed");
  assert.equal(normalizeMemoryEventStatus("error"), "failed");
  assert.equal(normalizeMemoryEventStatus("skipped"), "skipped");
});

test("memory event ids include event type, source, anchor, and timestamp", () => {
  const id = memoryEventIdFor(
    {
      eventType: "learning_book_updated",
      source: "learning_book_update",
      bookId: "book-1",
    },
    123,
  );

  assert.match(
    id,
    /^memory-event:learning_book_updated:learning_book_update:book-1:123:/,
  );
});

test("memory event records compact summaries and preserve metadata", () => {
  const record = createMemoryEventRecord(
    {
      eventType: "learning_concept_updated",
      status: "completed",
      source: "learning_book_update",
      sessionId: "session-1",
      bookId: "book-1",
      conversationId: "conversation-1",
      conceptId: "concept-1",
      sourceIds: [" source-a ", "source-a", "", "source-b"],
      summary: ` ${"memory ".repeat(120)} `,
      confidence: 0.72,
      retentionPolicy: "local_indexeddb",
      metadata: { model: "local-session-fallback", conceptCount: 1 },
    },
    456,
  );

  assert.equal(record.timestamp, 456);
  assert.equal(record.status, "completed");
  assert.equal(record.sourceIds.length, 2);
  assert.equal(record.sourceIds[0], "source-a");
  assert.equal(record.summary.length, 500);
  assert.equal(record.confidence, 0.72);
  assert.equal(record.metadata.model, "local-session-fallback");
});

test("memory event records clamp confidence and provide defaults", () => {
  const record = createMemoryEventRecord(
    {
      confidence: 2,
      sourceIds: [null, "page:1"],
      status: "error",
    },
    789,
  );

  assert.equal(record.eventType, "interaction_recorded");
  assert.equal(record.status, "failed");
  assert.equal(record.source, "memory_orchestrator");
  assert.equal(record.summary, "Memory event recorded.");
  assert.equal(record.confidence, 1);
  assert.deepEqual(record.sourceIds, ["page:1"]);
});
