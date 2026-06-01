import assert from "node:assert/strict";
import { test } from "node:test";

const {
  artifactRecordIdFor,
  citationStateIdFor,
  createArtifactRecord,
  createCitationStateRecord,
  artifactVerificationStateForCitationStates,
  normalizeArtifactStatus,
  normalizeArtifactVerificationState,
  normalizeCitationState,
  verifyLocalCitationIntegrity,
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

test("local citation verifier marks coherent source-card links verified without external fetch", () => {
  const artifact = createArtifactRecord(
    {
      id: "artifact-1",
      artifactType: "source_card",
      status: "ready",
      verificationState: "checking",
      title: "Example source",
      url: "https://example.com/paper",
      domain: "example.com",
      sourceIds: ["source-1"],
      citationStateIds: ["citation-1"],
    },
    100,
  );
  const citation = createCitationStateRecord(
    {
      id: "citation-1",
      state: "checking",
      claimId: "artifact-1",
      sourceRef: "https://example.com/paper",
      artifactId: "artifact-1",
      url: "https://example.com/paper",
      domain: "example.com",
      title: "Example source",
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 200,
  });

  assert.equal(result.state, "verified");
  assert.equal(result.artifactVerificationState, "verified");
  assert.equal(result.verifier, "local_citation_integrity");
  assert.equal(result.checkedAt, 200);
  assert.equal(result.failureReason, undefined);
  assert.equal(result.metadata.localOnly, true);
  assert.equal(result.metadata.externalContentFetched, false);
  assert.equal(result.metadata.claimCheck, "artifact_level_source_card");
});

test("local citation verifier keeps missing source evidence unavailable", () => {
  const citation = createCitationStateRecord(
    {
      id: "citation-missing",
      state: "checking",
      claimId: "claim-1",
      sourceRef: "",
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact: null,
    citation,
    timestamp: 300,
  });

  assert.equal(result.state, "unavailable");
  assert.match(result.failureReason || "", /No local artifact record/);
});

test("local citation verifier does not treat placeholder source refs as evidence", () => {
  const artifact = createArtifactRecord(
    {
      id: "artifact-empty",
      artifactType: "source_card",
      title: "Source shell",
      citationStateIds: ["citation-empty"],
    },
    100,
  );
  const citation = createCitationStateRecord(
    {
      id: "citation-empty",
      state: "checking",
      claimId: "artifact-empty",
      artifactId: "artifact-empty",
    },
    100,
  );

  assert.equal(citation.sourceRef, "citation-empty");

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 350,
  });

  assert.equal(result.state, "unavailable");
  assert.equal(result.metadata.sourceKind, "missing");
  assert.match(result.failureReason || "", /No URL, source reference/);
});

test("local citation verifier catches conflicting saved source fields", () => {
  const artifact = createArtifactRecord(
    {
      id: "artifact-conflict",
      artifactType: "source_card",
      title: "Example source",
      url: "https://example.com/a",
      domain: "example.com",
      sourceIds: ["source-1"],
      citationStateIds: ["citation-conflict"],
    },
    100,
  );
  const citation = createCitationStateRecord(
    {
      id: "citation-conflict",
      state: "checking",
      claimId: "artifact-conflict",
      sourceRef: "https://example.com/b",
      artifactId: "artifact-conflict",
      url: "https://example.com/b",
      domain: "example.com",
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 400,
  });

  assert.equal(result.state, "conflicting");
  assert.equal(result.artifactVerificationState, "conflicting");
  assert.match(result.failureReason || "", /URL/);
});

test("local citation verifier treats query and hash differences as URL conflicts", () => {
  const artifact = createArtifactRecord(
    {
      id: "artifact-query",
      artifactType: "source_card",
      title: "Query source",
      url: "https://example.com/source?id=1#claim",
      domain: "example.com",
      sourceIds: ["source-query"],
      citationStateIds: ["citation-query"],
    },
    100,
  );
  const citation = createCitationStateRecord(
    {
      id: "citation-query",
      state: "checking",
      claimId: "artifact-query",
      sourceRef: "https://example.com/source?id=2#claim",
      artifactId: "artifact-query",
      url: "https://example.com/source?id=2#claim",
      domain: "example.com",
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 450,
  });

  assert.equal(result.state, "conflicting");
  assert.match(result.failureReason || "", /URL/);
});

test("local citation verifier reports unsupported artifact kinds explicitly", () => {
  const artifact = createArtifactRecord(
    {
      id: "artifact-notes",
      artifactType: "notes",
      title: "Generated notes",
      sourceIds: ["source-1"],
      citationStateIds: ["citation-notes"],
    },
    100,
  );
  const citation = createCitationStateRecord(
    {
      id: "citation-notes",
      state: "checking",
      claimId: "artifact-notes",
      sourceRef: "source-1",
      artifactId: "artifact-notes",
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 500,
  });

  assert.equal(result.state, "unsupported");
  assert.equal(result.artifactVerificationState, "unavailable");
  assert.match(result.failureReason || "", /source-card/);
});

test("artifact verification state derives conservatively from citation states", () => {
  assert.equal(
    artifactVerificationStateForCitationStates(["verified", "verified"]),
    "verified",
  );
  assert.equal(
    artifactVerificationStateForCitationStates(["verified", "checking"]),
    "checking",
  );
  assert.equal(
    artifactVerificationStateForCitationStates(["verified", "conflicting"]),
    "conflicting",
  );
  assert.equal(
    artifactVerificationStateForCitationStates(["unsupported"]),
    "unavailable",
  );
  assert.equal(artifactVerificationStateForCitationStates([]), "not_checked");
});
