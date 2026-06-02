import test from "node:test";
import assert from "node:assert/strict";

import {
  assembleBrainContextSections,
  buildActiveBookContext,
  buildBrainDocumentContext,
  buildBrainDocumentContextReport,
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
  assert.match(context, /Active Book Document Manifest/);
  assert.match(context, /Added PDFs in active book: 3/);
  assert.match(context, /Ready extracted PDFs: 1/);
  assert.match(context, /Document ID: doc-ready/);
  assert.match(context, /Classification: native_text_pdf/);
  assert.match(context, /Extraction: pymupdf4llm/);
  assert.match(context, /doc-empty/);
  assert.match(context, /ready_without_extracted_text/);
  assert.match(context, /Failed Paper/);
  assert.match(context, /manifest only until extraction succeeds/);
  assert.doesNotMatch(context, /Should not appear/);
});

test("brain document context balances multiple ready PDFs and marks the active document", () => {
  const context = buildBrainDocumentContext(
    [
      {
        id: "doc-1",
        title: "Long Background Paper",
        bookId: "book-1",
        mimeType: "application/pdf",
        size: 10,
        processingStatus: "ready",
        extractedText: "background-one ".repeat(800),
        classification: "native_text_pdf",
        extractionMode: "pymupdf4llm",
        createdAt: 1,
        updatedAt: 2,
      },
      {
        id: "doc-2",
        title: "Active Experiment Paper",
        bookId: "book-1",
        mimeType: "application/pdf",
        size: 10,
        processingStatus: "ready",
        extractedText: "active-two ".repeat(800),
        classification: "mixed_pdf",
        extractionMode: "hybrid",
        createdAt: 1,
        updatedAt: 3,
      },
      {
        id: "doc-3",
        title: "Supplement Paper",
        bookId: "book-1",
        mimeType: "application/pdf",
        size: 10,
        processingStatus: "ready",
        extractedText: "supplement-three ".repeat(800),
        classification: "native_text_pdf",
        extractionMode: "pymupdf4llm",
        createdAt: 1,
        updatedAt: 4,
      },
    ],
    { activeDocumentId: "doc-2" },
  );

  assert.match(context, /Ready documents in active book: 3/);
  assert.match(context, /Document 1: Active Experiment Paper/);
  assert.match(context, /Document ID: doc-2/);
  assert.match(context, /Role: Active document/);
  assert.match(context, /Document ID: doc-1/);
  assert.match(context, /Document ID: doc-3/);
  assert.match(context, /active-two/);
  assert.match(context, /background-one/);
  assert.match(context, /supplement-three/);
});

test("brain document context report distinguishes added, ready, excerpted, and omitted PDFs", () => {
  const documents = Array.from({ length: 8 }, (_, index) => ({
    id: `doc-${index + 1}`,
    title: `Paper ${index + 1}`,
    bookId: "book-1",
    mimeType: "application/pdf",
    size: 10,
    processingStatus: "ready",
    extractedText: `paper-${index + 1} `.repeat(300),
    classification: "native_text_pdf",
    extractionMode: "pymupdf4llm",
    createdAt: 1,
    updatedAt: 2,
  }));
  documents.push({
    id: "doc-pending",
    title: "Pending Paper",
    bookId: "book-1",
    mimeType: "application/pdf",
    size: 10,
    processingStatus: "processing",
    createdAt: 1,
    updatedAt: 3,
  });

  const report = buildBrainDocumentContextReport(documents, {
    activeDocumentId: "doc-3",
    maxDocuments: 3,
  });

  assert.equal(report.documentCount, 9);
  assert.equal(report.readyDocumentCount, 8);
  assert.equal(report.contextDocumentIds.length, 3);
  assert.equal(report.contextDocumentIds[0], "doc-3");
  assert.equal(report.unreadyDocumentCount, 1);
  assert.equal(report.omittedReadyDocumentCount, 5);
  assert.match(report.context, /Added PDFs in active book: 9/);
  assert.match(
    report.context,
    /Ready PDFs omitted because of prompt budget: 5/,
  );
  assert.match(report.context, /PDFs without usable extracted text yet: 1/);
  assert.match(report.context, /Pending Paper/);
  assert.match(report.context, /paper-3/);
  assert.doesNotMatch(report.context, /paper-8/);
});

test("brain document context keeps a manifest when no PDF has extracted text yet", () => {
  const report = buildBrainDocumentContextReport([
    {
      id: "doc-processing",
      title: "Uploading Paper",
      bookId: "book-1",
      mimeType: "application/pdf",
      size: 10,
      processingStatus: "processing",
      createdAt: 1,
      updatedAt: 2,
    },
  ]);

  assert.equal(report.documentCount, 1);
  assert.equal(report.readyDocumentCount, 0);
  assert.equal(report.contextDocumentIds.length, 0);
  assert.match(report.context, /Active Book Document Manifest/);
  assert.match(report.context, /Uploading Paper/);
  assert.match(report.context, /manifest only until extraction succeeds/);
});

test("voice context assembly keeps multi-document context ahead of long memory", () => {
  const documentContext = [
    "### Active Book Document Contexts",
    "Document ID: doc-voice-1",
    "Excerpt: voice-one ".repeat(80),
    "Document ID: doc-voice-2",
    "Excerpt: voice-two ".repeat(80),
  ].join("\n");
  const rawContext = assembleBrainContextSections({
    mode: "voice",
    activeBookContext: "### Active Library Book Context\nBook: Voice Book",
    documentContext,
    relatedMemoryContext: "memory-tail ".repeat(1200),
    interactionContext: "### Interaction Context\nmode: listening",
  });
  const compacted = compactBrainContext(rawContext, 7000, "voice");

  assert.match(compacted, /Document ID: doc-voice-1/);
  assert.match(compacted, /Document ID: doc-voice-2/);
  assert.match(compacted, /voice-one/);
  assert.match(compacted, /voice-two/);
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
    readyDocumentIds: ["doc-1"],
    contextDocumentIds: ["doc-1"],
    documentCount: 2,
    readyDocumentCount: 1,
    unreadyDocumentCount: 1,
    omittedReadyDocumentCount: 0,
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
  assert.deepEqual(event.metadata.documentIds, ["doc-1", "doc-2"]);
  assert.deepEqual(event.metadata.readyDocumentIds, ["doc-1"]);
  assert.deepEqual(event.metadata.contextDocumentIds, ["doc-1"]);
  assert.equal(event.metadata.readyDocumentCount, 1);
  assert.equal(event.metadata.unreadyDocumentCount, 1);
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
