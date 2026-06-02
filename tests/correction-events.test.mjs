import assert from "node:assert/strict";
import { test } from "node:test";

const {
  buildConceptCorrectionPatch,
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

test("correction propagation quarantines corrected concept scores non-destructively", () => {
  const event = createCorrectionEventRecord(
    {
      id: "correction-concept",
      action: "wrong",
      targetType: "concept",
      targetId: "bayes-rule",
      reason: "The concept summary was attached to the wrong learner idea.",
      source: "admin_test",
    },
    1234,
  );

  const patch = buildConceptCorrectionPatch(event, 5678, {
    confidence: 0.91,
    mastery: 0.74,
    p_learn: 0.66,
  });

  assert.equal(patch.confidence, 0);
  assert.equal(patch.mastery, 0.2);
  assert.equal(patch.p_learn, 0.2);
  assert.equal(patch.lastReviewedAt, 5678);
  assert.equal(patch.correctionState.status, "quarantined");
  assert.equal(patch.correctionState.eventId, "correction-concept");
  assert.equal(patch.correctionState.nonDestructive, true);
  assert.equal(patch.correctionState.previousConfidence, 0.91);
  assert.equal(patch.correctionState.nextConfidence, 0);
  assert.equal(patch.correctionState.previousMastery, 0.74);
  assert.equal(patch.correctionState.nextMastery, 0.2);
  assert.equal(patch.correctionState.previousPLearn, 0.66);
  assert.equal(patch.correctionState.nextPLearn, 0.2);
});

test("concept review requests mark review state without lowering scores", () => {
  const event = createCorrectionEventRecord(
    {
      id: "correction-concept-review",
      action: "review",
      targetType: "concept",
      targetId: "bayes-rule",
      reason: "Needs a human pass before the score changes.",
      source: "admin_test",
    },
    1234,
  );

  const patch = buildCorrectionPropagationPatch(event, "concepts", 5678, {
    confidence: 0.7,
    mastery: 0.6,
    p_learn: 0.5,
  });

  assert.equal("confidence" in patch, false);
  assert.equal("mastery" in patch, false);
  assert.equal("p_learn" in patch, false);
  assert.equal(patch.correctionState.status, "review_requested");
  assert.equal(patch.correctionState.previousConfidence, 0.7);
  assert.equal(patch.correctionState.nextConfidence, 0.7);
  assert.equal(patch.correctionState.nextMastery, 0.6);
  assert.equal(patch.correctionState.nextPLearn, 0.5);
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
