import assert from "node:assert/strict";
import { test } from "node:test";

const {
  artifactRecordIdFor,
  citationStateIdFor,
  createArtifactRecord,
  createCitationStateRecord,
  normalizeArtifactStatus,
  normalizeArtifactVerificationState,
  normalizeCitationState,
} = await import("../.tmp-test/artifact.records.mjs");

test("artifact records normalize status and verification states conservatively", () => {
  assert.equal(normalizeArtifactStatus("complete"), "ready");
  assert.equal(normalizeArtifactStatus("error"), "failed");
  assert.equal(normalizeArtifactStatus(undefined), "ready");

  assert.equal(normalizeArtifactVerificationState("pending"), "checking");
  assert.equal(normalizeArtifactVerificationState("available"), "not_checked");
  assert.equal(normalizeArtifactVerificationState(undefined), "checking");
});

test("citation states normalize without over-claiming verified", () => {
  assert.equal(normalizeCitationState("pending"), "checking");
  assert.equal(normalizeCitationState("failed"), "unavailable");
  assert.equal(normalizeCitationState("unsupported"), "unsupported");
  assert.equal(normalizeCitationState(undefined), "checking");
});

test("artifact and citation ids are stable for the same source reference", () => {
  const artifactA = artifactRecordIdFor({
    artifactType: "source_card",
    sourceRef: "https://example.com/a",
  });
  const artifactB = artifactRecordIdFor({
    artifactType: "source_card",
    sourceRef: "https://example.com/a",
  });
  const citationA = citationStateIdFor({
    claimId: artifactA,
    sourceRef: "https://example.com/a",
  });
  const citationB = citationStateIdFor({
    claimId: artifactA,
    sourceRef: "https://example.com/a",
  });

  assert.equal(artifactA, artifactB);
  assert.equal(citationA, citationB);
});

test("artifact records compact fields and preserve audit metadata", () => {
  const record = createArtifactRecord(
    {
      artifactType: "source_card",
      sourceRef: "https://example.com/a",
      source: "chat_web_search",
      title: "  Source   title  ",
      summary: "summary ".repeat(90),
      url: "https://example.com/a",
      domain: "example.com",
      sourceIds: ["src-1", "src-1", "src-2"],
      citationStateIds: ["citation-1"],
      searchId: "search-1",
      messageId: "message-1",
      metadata: { mode: "search" },
    },
    12345,
  );

  assert.equal(record.timestamp, 12345);
  assert.equal(record.status, "ready");
  assert.equal(record.verificationState, "checking");
  assert.equal(record.title, "Source title");
  assert.equal(record.summary?.length, 500);
  assert.deepEqual(record.sourceIds, ["src-1", "src-2"]);
  assert.deepEqual(record.citationStateIds, ["citation-1"]);
  assert.deepEqual(record.metadata, { mode: "search" });
});

test("citation records keep unavailable reasons and source metadata", () => {
  const record = createCitationStateRecord(
    {
      state: "error",
      claimId: "claim-1",
      sourceRef: "web-search",
      verifier: "local_web_search",
      failureReason: "SERPER_API_KEY is not configured.",
      metadata: { searchId: "search-1" },
    },
    67890,
  );

  assert.equal(record.timestamp, 67890);
  assert.equal(record.state, "unavailable");
  assert.equal(record.claimId, "claim-1");
  assert.equal(record.sourceRef, "web-search");
  assert.equal(record.failureReason, "SERPER_API_KEY is not configured.");
  assert.deepEqual(record.metadata, { searchId: "search-1" });
});
