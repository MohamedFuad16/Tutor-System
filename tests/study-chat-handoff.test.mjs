import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const readSource = (path) => readFileSync(`${repoRoot}/${path}`, "utf8");

const studyViewSource = readSource("src/views/StudyView.tsx");
const pdfViewerSource = readSource("src/components/PdfViewer.tsx");
const chatPanelSource = readSource("src/components/ChatPanel.tsx");
const storeSource = readSource("src/store/index.ts");
const memorySource = readSource("src/memory/longterm.memory.ts");

const assertInOrder = (source, snippets) => {
  let cursor = -1;
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    assert.notEqual(
      index,
      -1,
      `Expected snippet after offset ${cursor}:\n${snippet}`,
    );
    cursor = index;
  }
};

test("StudyView clears stale selected PDF context on upload and document switches", () => {
  assertInOrder(studyViewSource, [
    "await db.learningDocuments.bulkPut(documentRecords);",
    "setActiveLearningBookId(book.id);",
    "setActiveProject(book.title);",
    "setActiveDocumentId(activeUploadedDocumentId || null);",
    'setSelectedTextContext("");',
    "setIsChatOpen(true);",
  ]);

  assertInOrder(studyViewSource, [
    "const selectDocument = async (document: LearningDocument) => {",
    "setActiveDocumentId(document.id);",
    'setSelectedTextContext("");',
    "await updateBookDocumentLinks(document.bookId, document.id);",
  ]);

  assertInOrder(studyViewSource, [
    "const removedActiveDocument = documentId === activeDocumentId;",
    "cancelledIngestionDocumentIdsRef.current.add(documentId);",
    'if (removedActiveDocument) {\n      setSelectedTextContext("");\n    }',
    "await db.learningDocuments.delete(documentId);",
  ]);
});

test("PdfViewer keeps PDF navigation and annotations scoped to the active document", () => {
  assert.match(
    pdfViewerSource,
    /const boundedPdfTotalPages = Math\.max\(1, pdfTotalPages \|\| 1\);/,
  );
  assert.match(
    pdfViewerSource,
    /const nextPage = Math\.min\(Math\.max\(currentPage, 1\), numPages\);/,
  );
  assert.match(
    pdfViewerSource,
    /db\.learningDocuments\.update\(activeDocumentId, \{\s+totalPages: numPages,/,
  );
  assert.match(
    pdfViewerSource,
    /db\.learningDocuments\.update\(activeDocumentId, \{\s+lastViewedPage: pdfPage,/,
  );
  assert.match(
    pdfViewerSource,
    /a\.pageNumber === pdfPage &&\s+\(!activeDocumentId \|\| a\.documentId === activeDocumentId\)/,
  );
  assert.match(
    pdfViewerSource,
    /bookId: activeLearningBookId \|\| undefined,\s+documentId: activeDocumentId \|\| undefined,\s+pageNumber: pdfPage,\s+rects: normalizedRects,\s+text: selectionTooltip\.text,/,
  );
  assert.match(
    pdfViewerSource,
    /bookId: activeLearningBookId \|\| undefined,\s+documentId: activeDocumentId \|\| undefined,\s+pageNumber: pdfPage,\s+rects: draftNote\.rects,\s+text: draftNote\.text,/,
  );
});

test("PdfViewer Ask Tutor handoff stores selected text without firing chat itself", () => {
  assert.match(
    pdfViewerSource,
    /const setAskTutorQuery = useStore\(\(state\) => state\.setAskTutorQuery\);/,
  );
  assert.match(
    pdfViewerSource,
    /setSelectedTextContext\(selectionTooltip\.text\);\s+setAskTutorQuery\(""\);\s+setSelectionTooltip\(null\);\s+window\.getSelection\(\)\?\.removeAllRanges\(\);/,
  );

  const handoffIndex = pdfViewerSource.indexOf(
    "setSelectedTextContext(selectionTooltip.text);",
  );
  const nextFetchIndex = pdfViewerSource.indexOf("fetch(", handoffIndex);
  const nextChatPostIndex = pdfViewerSource.indexOf(
    '"/api/chat"',
    handoffIndex,
  );
  assert.equal(nextFetchIndex, -1);
  assert.equal(nextChatPostIndex, -1);
});

test("ChatPanel sends selected PDF context with active document metadata", () => {
  assert.match(
    chatPanelSource,
    /selectedTextContext\s+\?\s+`Regarding this selected text:\\n\\n> \$\{selectedTextContext\}\\n\\n\$\{text\.trim\(\)\}`\s+:\s+text\.trim\(\)/,
  );

  const messageIndex = chatPanelSource.indexOf("const userMsgContent =");
  const clearIndex = chatPanelSource.indexOf(
    'setSelectedTextContext("");',
    messageIndex,
  );
  const requestIndex = chatPanelSource.indexOf(
    'const res = await fetch("/api/chat"',
    messageIndex,
  );
  assert.ok(
    clearIndex > messageIndex,
    "selected context is cleared after composing the user message",
  );
  assert.ok(
    clearIndex < requestIndex,
    "selected context is cleared before the chat request leaves the client",
  );

  assertInOrder(chatPanelSource, [
    "const hydratedDocuments =",
    "await hydrateDocumentsForBrainContext(orderedBookDocuments);",
    "const brainContextPacket = await buildBrainContextPacket({",
    'mode: "chat",',
    'agentLayer: "chat_stream",',
    "query: userMsgContent,",
    "activeBookId: canonicalActiveBookId,",
    "activeDocumentId,",
    "documents: hydratedDocuments,",
    "selectedTextAttached: Boolean(selectedTextContext),",
  ]);

  assertInOrder(chatPanelSource, [
    'const res = await fetch("/api/chat", {',
    "messages: flattenChatMessagesForPrompt(newMessages),",
    "memoryContext: requestMemoryContext,",
    "activeBookId: canonicalActiveBookId,",
    "activeDocumentId,",
    "documentContexts: orderedBookDocuments.map((document) => ({",
    "id: document.id,",
    "title: document.title,",
    "classification: document.classification,",
    "extractionMode: document.extractionMode,",
  ]);
});

test("ChatPanel persists chat learning with active document context", () => {
  assertInOrder(chatPanelSource, [
    "brainOrchestrator.trackInteraction(",
    "userMsgContent,",
    "data.content,",
    "bookId: canonicalActiveBookId,",
    "documentId: activeDocumentId,",
    'mode: "chat",',
    'agentLayer: "chat_stream",',
  ]);

  assertInOrder(chatPanelSource, [
    ".updateLearningBookFromConversation({",
    "activeBookId: canonicalActiveBookId,",
    "activeDocumentId,",
    'mode: "chat",',
    'agentLayer: "chat_stream",',
    "documentContexts: orderedBookDocuments,",
    "userMessage: userMsgContent,",
    "assistantMessage: data.content,",
  ]);
});

test("Store and long-term memory keep document-scoped study fields", () => {
  assert.match(
    storeSource,
    /export interface Annotation \{\s+id: string;\s+bookId\?: string;\s+documentId\?: string;/,
  );
  assert.match(
    storeSource,
    /activeDocumentId: localStorage\.getItem\("active_document_id"\) \|\| null,/,
  );
  assert.match(
    storeSource,
    /removeAnnotationsForDocument: \(documentId\) =>\s+set\(\(state\) => \(\{\s+annotations: state\.annotations\.filter\(\s+\(annotation\) => annotation\.documentId !== documentId,/,
  );
  assert.match(
    storeSource,
    /selectedTextContext: "",\s+setSelectedTextContext: \(text\) => set\(\{ selectedTextContext: text \}\),/,
  );

  assert.match(
    memorySource,
    /export interface LearningBook \{[\s\S]*activeDocumentId\?: string;[\s\S]*documentIds\?: string\[\];/,
  );
  assert.match(
    memorySource,
    /export interface LearningDocument \{[\s\S]*bookId: string;[\s\S]*lastViewedPage\?: number;[\s\S]*totalPages\?: number;[\s\S]*scale\?: number;/,
  );
  assert.match(
    memorySource,
    /learningBooks:\s+"id, userId, sessionId, title, userName, source, activeDocumentId, updatedAt",/,
  );
  assert.match(
    memorySource,
    /learningDocuments:\s+"id, userId, bookId, title, mimeType, updatedAt, createdAt",/,
  );
});
