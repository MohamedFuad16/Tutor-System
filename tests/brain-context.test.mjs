import test from "node:test";
import assert from "node:assert/strict";

import {
  buildActiveBookContext,
  buildBrainDocumentContext,
  compactBrainContext,
  createBrainContextMemoryEventInput,
} from "../.tmp-test/brain.context.mjs";

test("brain context compaction keeps voice packets bounded", () => {
  const context = [
    "### Persistent Memory Context",
    "alpha ".repeat(200),
    "### Active Library Book Context",
    "beta ".repeat(200),
  ].join("\n\n");

  const compacted = compactBrainContext(context, 240, "voice");

  assert.ok(compacted.length <= 240);
  assert.match(
    compacted,
    /Local voice brain context truncated for the live prompt/,
  );
});

test("brain document context includes ready extracted documents only", () => {
  const context = buildBrainDocumentContext([
    {
      id: "doc-ready",
      title: "Ready Paper",
      bookId: "book-1",
      mimeType: "application/pdf",
      size: 10,
      processingStatus: "ready",
      extractedText: " The first useful excerpt. ".repeat(20),
      classification: "native_text_pdf",
      extractionMode: "pymupdf4llm",
      createdAt: 1,
      updatedAt: 2,
    },
    {
      id: "doc-empty",
      title: "Empty Paper",
      bookId: "book-1",
      mimeType: "application/pdf",
      size: 10,
      processingStatus: "ready",
      extractedText: "",
      createdAt: 1,
      updatedAt: 2,
    },
    {
      id: "doc-failed",
      title: "Failed Paper",
      bookId: "book-1",
      mimeType: "application/pdf",
      size: 10,
      processingStatus: "failed",
      extractedText: "Should not appear.",
      createdAt: 1,
      updatedAt: 2,
    },
  ]);

  assert.match(context, /Active Book Document Contexts/);
  assert.match(context, /Document ID: doc-ready/);
  assert.match(context, /Classification: native_text_pdf/);
  assert.match(context, /Extraction: pymupdf4llm/);
  assert.doesNotMatch(context, /doc-empty/);
  assert.doesNotMatch(context, /Failed Paper/);
});

test("brain context memory event records request and agent-layer metadata", () => {
  const event = createBrainContextMemoryEventInput({
    requestId: "chat-req-1",
    mode: "chat",
    agentLayer: "chat_stream",
    querySummary: "Explain the current page",
    activeBookId: "book-1",
    activeBookTitle: "Learning Book",
    activeDocumentId: "doc-1",
    documentIds: ["doc-1", "doc-2"],
    documentCount: 2,
    context: "context",
    rawContext: "raw context",
    contextChars: 7,
    rawContextChars: 11,
    memoryContextChars: 3,
    activeBookContextChars: 2,
    documentContextChars: 4,
    interactionContextChars: 5,
    compacted: false,
  });

  assert.equal(event.eventType, "brain_context_injected");
  assert.equal(event.status, "completed");
  assert.equal(event.source, "brain_context_builder");
  assert.deepEqual(event.sourceIds, ["doc-1", "doc-2"]);
  assert.equal(event.metadata.requestId, "chat-req-1");
  assert.equal(event.metadata.agentLayer, "chat_stream");
  assert.equal(event.metadata.rawContextChars, 11);
});

test("active book context describes chapters and mapped concepts", () => {
  const context = buildActiveBookContext(
    {
      id: "book-1",
      sessionId: "session-1",
      title: "Learning Book",
      userName: "Learner",
      source: "chat",
      overview: "A book overview.",
      summary: "A fallback summary.",
      knowledgeSummary: "A knowledge summary.",
      chapters: [
        {
          id: "chapter-1",
          title: "Chapter One",
          summary: "Summary",
          conceptIds: [],
          conversationCount: 1,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      conceptIds: ["concept-1"],
      conversationCount: 1,
      createdAt: 1,
      updatedAt: 2,
    },
    [
      {
        id: "concept-1",
        bookId: "book-1",
        name: "Retrieval Practice",
        summary: "A concept summary.",
        mastery: 0,
        confidence: 0.62,
        parentConcepts: [],
        childConcepts: [],
        evidence: [],
        firstSeenAt: 1,
        updatedAt: 2,
      },
    ],
  );

  assert.match(context, /Book: Learning Book/);
  assert.match(context, /Chapters: Chapter One/);
  assert.match(context, /Retrieval Practice \(62%\)/);
});
