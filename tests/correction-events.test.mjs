import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildCorrectionPropagationMetadata,
  buildCorrectionPropagationPatch,
  correctionEventIdFor,
  createCorrectionEventRecord,
  normalizeCorrectionEventAction,
  normalizeCorrectionEventStatus,
  normalizeCorrectionEventTargetType,
} = await import("../.tmp-test/correction.events.mjs");

test("correction events normalize status names", () => {
  assert.equal(normalizeCorrectionEventStatus("pending"), "open");
  assert.equal(normalizeCorrectionEventStatus("complete"), "applied");
  assert.equal(normalizeCorrectionEventStatus("completed"), "applied");
  assert.equal(normalizeCorrectionEventStatus("error"), "blocked");
  assert.equal(normalizeCorrectionEventStatus("dismissed"), "dismissed");
  assert.equal(normalizeCorrectionEventStatus(undefined), "open");
});

test("correction events normalize actions and target types", () => {
  assert.equal(normalizeCorrectionEventAction("wrong"), "mark_wrong");
  assert.equal(normalizeCorrectionEventAction("delete"), "delete_request");
  assert.equal(normalizeCorrectionEventAction("remove"), "delete_request");
  assert.equal(normalizeCorrectionEventAction(undefined), "review");

  assert.equal(normalizeCorrectionEventTargetType("memory"), "memory_event");
  assert.equal(normalizeCorrectionEventTargetType("book"), "learning_book");
  assert.equal(normalizeCorrectionEventTargetType("tool"), "tool_job");
  assert.equal(normalizeCorrectionEventTargetType(undefined), "other");
});

test("correction event ids include action, target type, target id, and timestamp", () => {
  const id = correctionEventIdFor(
    {
      action: "delete",
      targetType: "memory",
      targetId: "memory-123",
    },
    12345,
  );

  assert.match(
    id,
    /^correction-event:delete_request:memory_event:memory-123:12345:/,
  );
});

test("correction event records compact fields and preserve metadata", () => {
  const longReason = `${" needs review ".repeat(80)}done`;
  const record = createCorrectionEventRecord(
    {
      action: "wrong",
      targetType: "memory",
      targetId: "memory-123",
      targetSummary: "  Summary   with   whitespace  ",
      reason: longReason,
      source: "admin_memory_events",
      requestedBy: "admin",
      bookId: "book:general-study",
      conceptId: "concept-1",
      conversationId: "conversation-1",
      relatedEventIds: ["memory-123", "memory-123", "retrieval-1"],
      metadata: { eventType: "learning_concept_updated" },
    },
    98765,
  );

  assert.equal(record.timestamp, 98765);
  assert.equal(record.status, "open");
  assert.equal(record.action, "mark_wrong");
  assert.equal(record.targetType, "memory_event");
  assert.equal(record.targetId, "memory-123");
  assert.equal(record.targetSummary, "Summary with whitespace");
  assert.equal(record.reason.length, 500);
  assert.equal(record.bookId, "book:general-study");
  assert.equal(record.conceptId, "concept-1");
  assert.deepEqual(record.relatedEventIds, ["memory-123", "retrieval-1"]);
  assert.deepEqual(record.metadata, { eventType: "learning_concept_updated" });
});

test("correction propagation marks evidence and mastery rows unverified", () => {
  const event = createCorrectionEventRecord(
    {
      id: "correction-1",
      action: "wrong",
      targetType: "evidence_event",
      targetId: "evidence-1",
      reason: "The answer was graded against the wrong source.",
      source: "admin_test",
    },
    1234,
  );
  const evidencePatch = buildCorrectionPropagationPatch(
    event,
    "evidenceEvents",
    5678,
    { existing: true },
  );
  const masteryPatch = buildCorrectionPropagationPatch(
    event,
    "masteryDeltas",
    5678,
  );

  assert.equal(evidencePatch.verified, false);
  assert.equal(masteryPatch.verified, false);
  assert.equal(evidencePatch.metadata.existing, true);
  assert.deepEqual(evidencePatch.metadata.correction, {
    eventId: "correction-1",
    action: "mark_wrong",
    effect: "marked_wrong",
    targetType: "evidence_event",
    targetId: "evidence-1",
    reason: "The answer was graded against the wrong source.",
    source: "admin_test",
    appliedAt: 5678,
    table: "evidenceEvents",
  });
});

test("correction propagation keeps deletion requests non-destructive", () => {
  const event = createCorrectionEventRecord(
    {
      id: "correction-delete",
      action: "delete",
      targetType: "citation_state",
      targetId: "citation-1",
      reason: "Source should not be used.",
      source: "admin_test",
    },
    1234,
  );
  const citationPatch = buildCorrectionPropagationPatch(
    event,
    "citationStates",
    5678,
  );
  const metadata = buildCorrectionPropagationMetadata(
    event,
    "citationStates",
    5678,
  );

  assert.equal(citationPatch.state, "unsupported");
  assert.match(citationPatch.failureReason, /delete request/);
  assert.equal(metadata.correction.effect, "deletion_requested");
});
