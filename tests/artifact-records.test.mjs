import assert from "node:assert/strict";
import { test } from "node:test";

const {
  artifactRecordIdFor,
  citationStateIdFor,
  createArtifactRecord,
  createCitationStateRecord,
  createGeneratedFlashcardsArtifactRecords,
  createGeneratedNotesArtifactRecords,
  createStoredAudioOverviewArtifactRecords,
  artifactVerificationStateForCitationStates,
  normalizeArtifactStatus,
  normalizeArtifactVerificationState,
  normalizeCitationState,
  supportsLocalCitationIntegrityArtifact,
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

test("generated flashcards become not-checked artifact records with provenance", () => {
  const { artifact, citation } = createGeneratedFlashcardsArtifactRecords(
    {
      batchId: "batch-1",
      source: "chat_tool_flashcard_generation",
      sourceMessageId: "assistant-message-1",
      messageId: "assistant-message-1",
      conversationId: "thread:book-1",
      bookId: "book-1",
      bookTitle: "Graph learning",
      cards: [
        {
          id: "card-1",
          front: "What does BKT update?",
          back: "A concept mastery estimate.",
          conceptId: "concept-bkt",
        },
        {
          id: "card-2",
          front: "What should stay general?",
          back: "Ambiguous generated cards.",
          conceptId: "general",
        },
      ],
      metadata: { generationPath: "chat_stream_done" },
    },
    24680,
  );

  assert.equal(artifact.timestamp, 24680);
  assert.equal(artifact.artifactType, "flashcards");
  assert.equal(artifact.status, "ready");
  assert.equal(artifact.verificationState, "not_checked");
  assert.equal(artifact.source, "chat_tool_flashcard_generation");
  assert.equal(artifact.messageId, "assistant-message-1");
  assert.equal(artifact.conversationId, "thread:book-1");
  assert.equal(artifact.bookId, "book-1");
  assert.equal(artifact.conceptId, "concept-bkt");
  assert.deepEqual(artifact.citationStateIds, [citation.id]);
  assert.deepEqual(artifact.metadata.cardIds, ["card-1", "card-2"]);
  assert.deepEqual(artifact.metadata.conceptIds, ["concept-bkt"]);
  assert.equal(artifact.metadata.unresolvedCards, 1);
  assert.equal(artifact.metadata.localOnly, true);
  assert.equal(citation.timestamp, 24680);
  assert.equal(citation.state, "not_checked");
  assert.equal(citation.artifactId, artifact.id);
  assert.equal(citation.sourceRef, "assistant-message-1");
  assert.equal(citation.verifier, "generated_flashcard_provenance");
});

test("generated learning notes become not-checked artifact records with provenance", () => {
  const { artifact, citation } = createGeneratedNotesArtifactRecords(
    {
      entryId: "entry-1",
      source: "learning_book_update",
      conversationId: "conversation-1",
      bookId: "book-1",
      bookTitle: "Graph learning",
      chapterId: "chapter-1",
      chapterTitle: "BKT updates",
      documentId: "document-1",
      userName: "Learner",
      model: "local-session-fallback",
      confidence: 0.42,
      conceptIds: ["concept-bkt", "concept-bkt", "concept-evidence"],
      summary:
        "The learner connected Bayesian Knowledge Tracing to evidence-gated mastery updates.",
      knowledgeSummary: "BKT only moves mastery when evidence is accepted.",
      assistantSummary: "A concise tutor explanation about BKT.",
      metadata: { generationPath: "memory_orchestrator" },
    },
    13579,
  );

  assert.equal(artifact.timestamp, 13579);
  assert.equal(artifact.artifactType, "notes");
  assert.equal(artifact.status, "ready");
  assert.equal(artifact.verificationState, "not_checked");
  assert.equal(artifact.source, "learning_book_update");
  assert.equal(artifact.conversationId, "conversation-1");
  assert.equal(artifact.bookId, "book-1");
  assert.equal(artifact.conceptId, undefined);
  assert.deepEqual(artifact.sourceIds, [
    "entry-1",
    "conversation-1",
    "book-1",
    "chapter-1",
    "document-1",
    "concept-bkt",
    "concept-evidence",
  ]);
  assert.deepEqual(artifact.citationStateIds, [citation.id]);
  assert.equal(artifact.metadata.localOnly, true);
  assert.equal(artifact.metadata.externalContentFetched, false);
  assert.equal(artifact.metadata.generatedArtifact, true);
  assert.equal(artifact.metadata.noteKind, "learning_entry");
  assert.equal(artifact.metadata.entryId, "entry-1");
  assert.deepEqual(artifact.metadata.conceptIds, [
    "concept-bkt",
    "concept-evidence",
  ]);
  assert.equal(artifact.metadata.confidence, 0.42);
  assert.equal(artifact.metadata.generationPath, "memory_orchestrator");
  assert.equal(citation.timestamp, 13579);
  assert.equal(citation.state, "not_checked");
  assert.equal(citation.artifactId, artifact.id);
  assert.equal(citation.sourceRef, "entry-1");
  assert.equal(citation.metadata.externalContentFetched, false);
  assert.equal(citation.verifier, "generated_learning_entry_provenance");
});

test("stored audio overviews become not-checked artifact records with local provenance", () => {
  const { artifact, citation } = createStoredAudioOverviewArtifactRecords(
    {
      overviewId: "user-brain-architecture:chapter-0:stored-audio-overview",
      bookId: "user-brain-architecture",
      bookTitle: "User Brain Architecture",
      chapterIndex: 0,
      chapterTitle: "The Whole Shape",
      title: "Quick tour of the learner brain",
      summary: "Energetic architecture overview.",
      transcript:
        "LearningAI is a foreground tutor with a local learner brain ledger.",
      audioSrc: "/audio-overviews/user-brain-runtime-overview.mp3",
      durationLabel: "about 45 sec",
      generatedBy: "GPT-authored chapter guide",
      voice: "Deepgram Aura Odysseus",
      storedAt: "2026-06-02",
      metadata: { assetKind: "built_in_book_chapter_audio" },
    },
    112233,
  );

  assert.equal(artifact.timestamp, 112233);
  assert.equal(artifact.artifactType, "audio_overview");
  assert.equal(artifact.status, "ready");
  assert.equal(artifact.verificationState, "not_checked");
  assert.equal(artifact.source, "stored_audio_overview_manifest");
  assert.equal(artifact.bookId, "user-brain-architecture");
  assert.deepEqual(artifact.sourceIds, [
    "user-brain-architecture:chapter-0:stored-audio-overview",
    "user-brain-architecture",
    "The Whole Shape",
    "/audio-overviews/user-brain-runtime-overview.mp3",
  ]);
  assert.deepEqual(artifact.citationStateIds, [citation.id]);
  assert.equal(artifact.metadata.localOnly, true);
  assert.equal(artifact.metadata.externalContentFetched, false);
  assert.equal(artifact.metadata.generatedArtifact, true);
  assert.equal(artifact.metadata.artifactType, "audio_overview");
  assert.equal(artifact.metadata.assetKind, "built_in_book_chapter_audio");
  assert.equal(artifact.metadata.chapterIndex, 0);
  assert.equal(
    artifact.metadata.audioSrc,
    "/audio-overviews/user-brain-runtime-overview.mp3",
  );
  assert.equal(citation.timestamp, 112233);
  assert.equal(citation.state, "not_checked");
  assert.equal(citation.artifactId, artifact.id);
  assert.equal(
    citation.sourceRef,
    "/audio-overviews/user-brain-runtime-overview.mp3",
  );
  assert.equal(citation.verifier, "stored_audio_overview_provenance");
  assert.equal(citation.metadata.externalContentFetched, false);
});

test("local source-card verifier support excludes generated flashcards", () => {
  assert.equal(
    supportsLocalCitationIntegrityArtifact({ artifactType: "source_card" }),
    true,
  );
  assert.equal(
    supportsLocalCitationIntegrityArtifact({ artifactType: "notes" }),
    true,
  );
  assert.equal(
    supportsLocalCitationIntegrityArtifact({ artifactType: "flashcards" }),
    false,
  );
  assert.equal(
    supportsLocalCitationIntegrityArtifact({ artifactType: "audio_overview" }),
    true,
  );
  assert.equal(supportsLocalCitationIntegrityArtifact(null), false);
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

test("local citation verifier marks coherent generated learning-note provenance verified", () => {
  const { artifact, citation } = createGeneratedNotesArtifactRecords(
    {
      entryId: "entry-verified",
      source: "learning_book_update",
      conversationId: "conversation-verified",
      bookId: "book-verified",
      bookTitle: "Graph learning",
      chapterId: "chapter-verified",
      chapterTitle: "BKT updates",
      documentId: "document-verified",
      userName: "Learner",
      model: "local-session-fallback",
      confidence: 0.72,
      conceptIds: ["concept-bkt"],
      summary:
        "The learner connected Bayesian Knowledge Tracing to evidence-gated mastery updates.",
      knowledgeSummary: "BKT only moves mastery when evidence is accepted.",
      assistantSummary: "A concise tutor explanation about BKT.",
      metadata: { generationPath: "memory_orchestrator" },
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 525,
  });

  assert.equal(result.state, "verified");
  assert.equal(result.artifactVerificationState, "verified");
  assert.equal(result.metadata.localOnly, true);
  assert.equal(result.metadata.externalContentFetched, false);
  assert.equal(result.metadata.sourceKind, "local_source_ref");
  assert.equal(
    result.metadata.claimCheck,
    "generated_learning_note_provenance",
  );
  assert.deepEqual(result.metadata.checkedFields, [
    "artifactId",
    "citationStateIds",
    "sourceRef",
    "sourceIds",
    "bookId",
    "conversationId",
    "summary",
    "metadata.entryId",
    "metadata.localOnly",
    "metadata.externalContentFetched",
  ]);
});

test("local citation verifier marks coherent stored audio guide provenance verified", () => {
  const { artifact, citation } = createStoredAudioOverviewArtifactRecords(
    {
      overviewId: "user-brain-architecture:chapter-0:stored-audio-overview",
      bookId: "user-brain-architecture",
      bookTitle: "User Brain Architecture",
      chapterIndex: 0,
      chapterTitle: "The Whole Shape",
      title: "Quick tour of the learner brain",
      summary: "Energetic architecture overview.",
      transcript:
        "LearningAI is a foreground tutor with a local learner brain ledger.",
      audioSrc: "/audio-overviews/user-brain-runtime-overview.mp3",
      durationLabel: "0:32",
      generatedBy: "GPT-authored chapter guide",
      voice: "Deepgram Aura Odysseus",
      storedAt: "2026-06-02",
      metadata: { assetKind: "built_in_book_chapter_audio" },
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 625,
  });

  assert.equal(result.state, "verified");
  assert.equal(result.artifactVerificationState, "verified");
  assert.equal(result.metadata.localOnly, true);
  assert.equal(result.metadata.externalContentFetched, false);
  assert.equal(result.metadata.sourceKind, "local_source_ref");
  assert.equal(result.metadata.claimCheck, "stored_audio_overview_integrity");
  assert.deepEqual(result.metadata.checkedFields, [
    "artifactId",
    "citationStateIds",
    "sourceRef",
    "sourceIds",
    "bookId",
    "summary",
    "metadata.overviewId",
    "metadata.audioSrc",
    "metadata.bookId",
    "metadata.chapterIndex",
    "metadata.chapterTitle",
    "metadata.durationLabel",
    "metadata.generatedBy",
    "metadata.voice",
    "metadata.storedAt",
    "metadata.transcriptLength",
    "metadata.localOnly",
    "metadata.externalContentFetched",
  ]);
});

test("local citation verifier catches conflicting stored audio guide source refs", () => {
  const { artifact, citation } = createStoredAudioOverviewArtifactRecords(
    {
      overviewId: "user-brain-architecture:chapter-0:stored-audio-overview",
      bookId: "user-brain-architecture",
      bookTitle: "User Brain Architecture",
      chapterIndex: 0,
      chapterTitle: "The Whole Shape",
      title: "Quick tour of the learner brain",
      summary: "Energetic architecture overview.",
      transcript:
        "LearningAI is a foreground tutor with a local learner brain ledger.",
      audioSrc: "/audio-overviews/user-brain-runtime-overview.mp3",
      durationLabel: "0:32",
      generatedBy: "GPT-authored chapter guide",
      voice: "Deepgram Aura Odysseus",
      storedAt: "2026-06-02",
      metadata: { assetKind: "built_in_book_chapter_audio" },
    },
    100,
  );
  const conflictingCitation = createCitationStateRecord(
    {
      ...citation,
      sourceRef: "/audio-overviews/other-guide.mp3",
    },
    citation.timestamp,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation: conflictingCitation,
    timestamp: 650,
  });

  assert.equal(result.state, "conflicting");
  assert.equal(result.metadata.claimCheck, "stored_audio_overview_integrity");
  assert.match(result.failureReason || "", /source reference/);
});

test("local citation verifier keeps incomplete stored audio guides unavailable", () => {
  const { artifact, citation } = createStoredAudioOverviewArtifactRecords(
    {
      overviewId: "user-brain-architecture:chapter-0:stored-audio-overview",
      bookId: "user-brain-architecture",
      bookTitle: "User Brain Architecture",
      chapterIndex: 0,
      chapterTitle: "The Whole Shape",
      title: "Quick tour of the learner brain",
      summary: "Energetic architecture overview.",
      transcript: "",
      audioSrc: "/audio-overviews/user-brain-runtime-overview.mp3",
      durationLabel: "0:32",
      generatedBy: "GPT-authored chapter guide",
      voice: "Deepgram Aura Odysseus",
      storedAt: "2026-06-02",
      metadata: { assetKind: "built_in_book_chapter_audio" },
    },
    100,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 675,
  });

  assert.equal(result.state, "unavailable");
  assert.equal(result.metadata.claimCheck, "stored_audio_overview_integrity");
  assert.match(result.failureReason || "", /failed/);
});

test("local citation verifier catches conflicting generated note entry refs", () => {
  const { artifact, citation } = createGeneratedNotesArtifactRecords(
    {
      entryId: "entry-expected",
      conversationId: "conversation-1",
      bookId: "book-1",
      chapterTitle: "BKT updates",
      summary: "The learner connected BKT to evidence gates.",
      metadata: { generationPath: "memory_orchestrator" },
    },
    100,
  );
  const conflictingCitation = createCitationStateRecord(
    {
      ...citation,
      sourceRef: "entry-other",
    },
    citation.timestamp,
  );

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation: conflictingCitation,
    timestamp: 550,
  });

  assert.equal(result.state, "conflicting");
  assert.match(result.failureReason || "", /learning entry id/);
  assert.equal(
    result.metadata.claimCheck,
    "generated_learning_note_provenance",
  );
});

test("local citation verifier keeps generated notes unavailable when local provenance is missing", () => {
  const { artifact, citation } = createGeneratedNotesArtifactRecords(
    {
      entryId: "entry-external",
      conversationId: "conversation-1",
      bookId: "book-1",
      chapterTitle: "BKT updates",
      summary: "The learner connected BKT to evidence gates.",
      metadata: { generationPath: "memory_orchestrator" },
    },
    100,
  );
  const unsafeArtifact = {
    ...artifact,
    metadata: { ...artifact.metadata, externalContentFetched: true },
  };
  const unsafeCitation = {
    ...citation,
    metadata: { ...citation.metadata, externalContentFetched: true },
  };

  const result = verifyLocalCitationIntegrity({
    artifact: unsafeArtifact,
    citation: unsafeCitation,
    timestamp: 575,
  });

  assert.equal(result.state, "unavailable");
  assert.match(result.failureReason || "", /external content/);
  assert.equal(
    result.metadata.claimCheck,
    "generated_learning_note_provenance",
  );
});

test("local citation verifier rejects placeholder generated note entry ids", () => {
  const { artifact, citation } = createGeneratedNotesArtifactRecords(
    {
      entryId: "",
      conversationId: "conversation-1",
      bookId: "book-1",
      chapterTitle: "BKT updates",
      summary: "The learner connected BKT to evidence gates.",
      metadata: { generationPath: "memory_orchestrator" },
    },
    100,
  );

  assert.equal(citation.sourceRef, "learning-entry");

  const result = verifyLocalCitationIntegrity({
    artifact,
    citation,
    timestamp: 590,
  });

  assert.equal(result.state, "unavailable");
  assert.equal(result.metadata.sourceKind, "local_source_ref");
  assert.match(result.failureReason || "", /source reference/);
  assert.equal(
    result.metadata.claimCheck,
    "generated_learning_note_provenance",
  );
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
      id: "artifact-flashcards",
      artifactType: "flashcards",
      title: "Generated flashcards",
      sourceIds: ["source-1"],
      citationStateIds: ["citation-flashcards"],
    },
    100,
  );
  const citation = createCitationStateRecord(
    {
      id: "citation-flashcards",
      state: "checking",
      claimId: "artifact-flashcards",
      sourceRef: "source-1",
      artifactId: "artifact-flashcards",
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
  assert.match(
    result.failureReason || "",
    /source-card, generated learning-note, and stored audio-guide/,
  );
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
