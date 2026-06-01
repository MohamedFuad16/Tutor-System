import test from "node:test";
import assert from "node:assert/strict";

import {
  createRetrievalEventRecord,
  normalizeRetrievalEventStatus,
  retrievalEventIdFor,
} from "../.tmp-test/retrieval.events.mjs";

test("retrieval events normalize stream status names", () => {
  assert.equal(normalizeRetrievalEventStatus("success"), "completed");
  assert.equal(normalizeRetrievalEventStatus("complete"), "completed");
  assert.equal(normalizeRetrievalEventStatus("error"), "failed");
  assert.equal(normalizeRetrievalEventStatus("skipped"), "skipped");
});

test("retrieval event ids include source, anchor, and timestamp", () => {
  const id = retrievalEventIdFor(
    {
      source: "memory_orchestrator",
      activeBookId: "book-1",
    },
    123,
  );

  assert.match(id, /^retrieval-event:memory_orchestrator:book-1:123:/);
});

test("retrieval event records compact query text and preserve selection metadata", () => {
  const record = createRetrievalEventRecord(
    {
      status: "completed",
      source: "memory_orchestrator",
      querySummary: ` ${"retrieval ".repeat(80)} `,
      activeBookId: "book-1",
      pageNumber: 4.7,
      durationMs: 12.3,
      candidateInteractionCount: 50.2,
      candidateConceptCount: 200.8,
      selectedInteractionIds: [" interaction-1 ", "interaction-1"],
      selectedConceptIds: ["concept-1", "concept-2"],
      selectedConceptNames: ["Alpha", "Beta"],
      topInteractionScore: 0.88,
      topConceptScore: 0.93,
      contextChars: 1200,
      tutorInstructionChars: 400,
      metadata: { activeBookFiltered: true },
    },
    456,
  );

  assert.equal(record.timestamp, 456);
  assert.equal(record.querySummary.length, 500);
  assert.equal(record.pageNumber, 5);
  assert.equal(record.durationMs, 12);
  assert.equal(record.candidateInteractionCount, 50);
  assert.equal(record.candidateConceptCount, 201);
  assert.deepEqual(record.selectedInteractionIds, ["interaction-1"]);
  assert.deepEqual(record.selectedConceptNames, ["Alpha", "Beta"]);
  assert.equal(record.topConceptScore, 0.93);
  assert.equal(record.metadata.activeBookFiltered, true);
});

test("retrieval event records clamp counts and scores safely", () => {
  const record = createRetrievalEventRecord(
    {
      status: "error",
      candidateInteractionCount: -3,
      candidateConceptCount: Number.NaN,
      contextChars: -100,
      topInteractionScore: 2,
      topConceptScore: -2,
      error: " retrieval failed ",
    },
    789,
  );

  assert.equal(record.status, "failed");
  assert.equal(record.source, "memory_retrieval");
  assert.equal(record.querySummary, "Memory retrieval request.");
  assert.equal(record.candidateInteractionCount, 0);
  assert.equal(record.candidateConceptCount, 0);
  assert.equal(record.contextChars, 0);
  assert.equal(record.topInteractionScore, 1);
  assert.equal(record.topConceptScore, -1);
  assert.equal(record.error, "retrieval failed");
});
