import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudyView } from "../src/views/StudyView";
import {
  db,
  type LearningBook,
  type LearningDocument,
} from "../src/memory/longterm.memory";
import { useStore } from "../src/store";

const {
  ensureSessionLearningBookMock,
  updateLearningBookFromConversationMock,
} = vi.hoisted(() => ({
  ensureSessionLearningBookMock: vi.fn(),
  updateLearningBookFromConversationMock: vi.fn(),
}));

vi.mock("../src/components/PdfViewer", () => ({
  PdfViewer: () => <div data-testid="pdf-viewer">Mock PDF viewer</div>,
}));

vi.mock("../src/components/ChatPanel", () => ({
  ChatPanel: ({ onClose }: { onClose?: () => void }) => (
    <section data-testid="chat-panel">
      Mock tutor chat
      <button type="button" onClick={onClose}>
        Close tutor chat
      </button>
    </section>
  ),
}));

vi.mock("../src/memory/memory.orchestrator", () => ({
  brainOrchestrator: {
    ensureSessionLearningBook: ensureSessionLearningBookMock,
    updateLearningBookFromConversation: updateLearningBookFromConversationMock,
  },
}));

let bookSequence = 0;
let documentSequence = 0;
let objectUrlSequence = 0;

const reviveDocumentBlob = (document: LearningDocument | undefined) =>
  !document || document.blob instanceof Blob
    ? document
    : {
        ...document,
        blob: new Blob([`%PDF revived ${document.title}`], {
          type: "application/pdf",
        }),
      };

const createBook = (overrides: Partial<LearningBook> = {}): LearningBook => {
  const id = overrides.id || `book:study-rendered-${++bookSequence}`;
  const timestamp = Date.now() + bookSequence;
  return {
    id,
    sessionId: `session:${id}`,
    title: "Rendered Study Book",
    userName: "Learner",
    source: "mixed",
    overview: "A rendered StudyView test book.",
    summary: "StudyView rendered flow coverage.",
    knowledgeSummary: "Page state should follow durable documents.",
    chapters: [],
    conceptIds: [],
    conversationCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
};

const createDocument = (
  bookId: string,
  title: string,
  overrides: Partial<LearningDocument> = {},
): LearningDocument => {
  const sequence = ++documentSequence;
  return {
    id: `doc:study-rendered-${sequence}`,
    bookId,
    title,
    mimeType: "application/pdf",
    size: 128,
    blob: new Blob([`%PDF rendered ${title}`], { type: "application/pdf" }),
    processingStatus: "ready",
    createdAt: Date.now() + sequence,
    updatedAt: Date.now() + sequence,
    lastViewedPage: 1,
    totalPages: 1,
    scale: 1,
    ...overrides,
  };
};

const seedStudyBook = async (
  titles: string[],
  options: {
    activeIndex?: number;
    setStoreActive?: boolean;
    documentOverrides?: Array<Partial<LearningDocument>>;
  } = {},
) => {
  const book = createBook();
  const documents = titles.map((title, index) =>
    createDocument(book.id, title, options.documentOverrides?.[index]),
  );
  const activeDocument =
    documents[options.activeIndex === undefined ? 0 : options.activeIndex];
  book.documentIds = documents.map((document) => document.id);
  book.activeDocumentId = activeDocument?.id;

  await db.learningBooks.put(book);
  if (documents.length) await db.learningDocuments.bulkPut(documents);

  useStore.setState({
    activeLearningBookId: book.id,
    activeProject: book.title,
    activeDocumentId:
      options.setStoreActive === false ? null : activeDocument?.id || null,
  });

  return { book, documents };
};

const getFileInput = (container: HTMLElement) => {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
};

const getUploadCard = (container: HTMLElement) => {
  const card = container.querySelector<HTMLElement>(
    '[data-intro-card="upload"] [role="button"]',
  );
  expect(card).not.toBeNull();
  return card as HTMLElement;
};

const renderStudyView = () => render(<StudyView />);

const waitForPdfView = async () => {
  expect(await screen.findByTestId("pdf-viewer")).toBeInTheDocument();
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  db.learningDocuments.hook("reading", reviveDocumentBlob);
  localStorage.clear();

  useStore.setState({
    activeView: "study",
    activeProject: "General Study",
    activeLearningBookId: null,
    activeDocumentId: null,
    animationsEnabled: false,
    annotations: [],
    askTutorQuery: "",
    pdfPage: 1,
    pdfScale: 1,
    pdfTotalPages: 0,
    pdfUrl: null,
    selectedTextContext: "",
  });

  ensureSessionLearningBookMock.mockReset();
  updateLearningBookFromConversationMock.mockReset();
  updateLearningBookFromConversationMock.mockResolvedValue(undefined);

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => `blob:study-view-${++objectUrlSequence}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(async () => {
  cleanup();
  db.learningDocuments.hook("reading").unsubscribe(reviveDocumentBlob);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await db.delete();
});

describe("rendered StudyView flows", () => {
  it("renders the introduction and minimized chat control for an empty study book", async () => {
    await seedStudyBook([]);

    renderStudyView();

    expect(await screen.findByTestId("intro-heading")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-viewer")).toBeNull();
    expect(screen.queryByTestId("chat-panel")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open tutor chat" }),
    ).toBeInTheDocument();
  });

  it("exposes a multiple-PDF picker and opens it from the upload card", async () => {
    await seedStudyBook([]);
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    const { container } = renderStudyView();
    const input = getFileInput(container);

    expect(input).toHaveAttribute("accept", "application/pdf");
    expect(input).toHaveAttribute("multiple");

    fireEvent.click(getUploadCard(container));
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it("selects the stored book document and hands its view state to the store", async () => {
    const { documents } = await seedStudyBook(["Stored document"], {
      setStoreActive: false,
      documentOverrides: [{ lastViewedPage: 7, totalPages: 24, scale: 1.4 }],
    });

    renderStudyView();
    await waitForPdfView();

    await waitFor(() => {
      expect(useStore.getState()).toMatchObject({
        activeDocumentId: documents[0].id,
        pdfPage: 7,
        pdfTotalPages: 24,
        pdfScale: 1.4,
      });
      expect(useStore.getState().pdfUrl).toMatch(/^blob:study-view-/);
    });
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("closes and reopens tutor chat while a document remains active", async () => {
    const user = userEvent.setup();
    await seedStudyBook(["Chat document"]);

    renderStudyView();
    await waitForPdfView();

    await user.click(screen.getByRole("button", { name: "Close tutor chat" }));
    expect(screen.queryByTestId("chat-panel")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open tutor chat" }));
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
  });

  it("opens tutor chat when an external ask-tutor query reaches the store", async () => {
    await seedStudyBook([]);
    renderStudyView();

    expect(screen.queryByTestId("chat-panel")).toBeNull();
    act(() => {
      useStore.setState({ askTutorQuery: "Explain the selected idea." });
    });

    expect(await screen.findByTestId("chat-panel")).toBeInTheDocument();
  });

  it("switches documents and hands selection, page state, and book links forward", async () => {
    const user = userEvent.setup();
    const { book, documents } = await seedStudyBook(["Alpha", "Beta"], {
      activeIndex: 0,
      documentOverrides: [
        { lastViewedPage: 2, totalPages: 10, scale: 1.1 },
        { lastViewedPage: 8, totalPages: 30, scale: 1.6 },
      ],
    });
    useStore.setState({ selectedTextContext: "stale Alpha selection" });

    renderStudyView();
    await waitForPdfView();
    await user.click(screen.getByRole("button", { name: "Beta" }));

    await waitFor(async () => {
      expect(useStore.getState()).toMatchObject({
        activeDocumentId: documents[1].id,
        pdfPage: 8,
        pdfTotalPages: 30,
        pdfScale: 1.6,
        selectedTextContext: "",
      });
      expect((await db.learningBooks.get(book.id))?.activeDocumentId).toBe(
        documents[1].id,
      );
    });
  });

  it("opens the document-mode add-PDF control without disturbing the active document", async () => {
    const user = userEvent.setup();
    const { documents } = await seedStudyBook(["Existing document"]);
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    renderStudyView();
    await waitForPdfView();
    await user.click(screen.getByRole("button", { name: "Add PDF" }));

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(useStore.getState().activeDocumentId).toBe(documents[0].id);
  });

  it("keeps the compact PDF document toolbar outside the reader region", async () => {
    await seedStudyBook(["Compact document"]);

    renderStudyView();
    await waitForPdfView();

    const toolbar = screen.getByTestId("pdf-document-toolbar");
    const readerRegion = screen.getByTestId("pdf-reader-region");

    expect(toolbar).toHaveClass("h-7", "shrink-0", "shadow-none");
    expect(readerRegion).toHaveClass("min-h-0", "flex-1", "overflow-hidden");
    expect(
      toolbar.compareDocumentPosition(readerRegion) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uploads a PDF through the picker and completes mocked ingestion", async () => {
    const { book } = await seedStudyBook([]);
    useStore.setState({ selectedTextContext: "clear on upload" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        classification: "Native",
        extractionMode: "pymupdf4llm",
        totalPages: 3,
        content: "Extracted rendered-study content.",
      }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderStudyView();

    fireEvent.change(getFileInput(container), {
      target: {
        files: [
          new File(["%PDF upload"], "Uploaded lesson.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });

    await waitFor(async () => {
      const uploaded = await db.learningDocuments
        .where("bookId")
        .equals(book.id)
        .first();
      expect(uploaded).toMatchObject({
        title: "Uploaded lesson",
        processingStatus: "ready",
        classification: "Native",
        extractionMode: "pymupdf4llm",
        totalPages: 3,
      });
      expect(useStore.getState()).toMatchObject({
        activeDocumentId: uploaded?.id,
        selectedTextContext: "",
      });
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/ingest",
      expect.objectContaining({ method: "POST" }),
    );
    expect(updateLearningBookFromConversationMock).toHaveBeenCalledOnce();
    expect(await screen.findByTestId("chat-panel")).toBeInTheDocument();
  });

  it("ignores non-PDF picker files without calling ingestion", async () => {
    const { book } = await seedStudyBook([]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderStudyView();

    fireEvent.change(getFileInput(container), {
      target: {
        files: [new File(["notes"], "notes.txt", { type: "text/plain" })],
      },
    });
    await act(async () => undefined);

    expect(
      await db.learningDocuments.where("bookId").equals(book.id).count(),
    ).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports drag feedback and PDF upload from the introduction card", async () => {
    const { book } = await seedStudyBook([]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        classification: "Native",
        extractionMode: "pymupdf4llm",
        totalPages: 1,
        content: "",
      }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderStudyView();
    const uploadCard = getUploadCard(container);
    const file = new File(["%PDF dropped"], "Dropped.pdf", {
      type: "application/pdf",
    });

    fireEvent.dragOver(uploadCard, { dataTransfer: { files: [file] } });
    expect(uploadCard.className).toContain("ring-4");
    fireEvent.drop(uploadCard, { dataTransfer: { files: [file] } });

    await waitFor(async () => {
      const dropped = await db.learningDocuments
        .where("bookId")
        .equals(book.id)
        .first();
      expect(dropped).toMatchObject({
        title: "Dropped",
        processingStatus: "ready",
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  it("removes an inactive document without clearing the active selection context", async () => {
    const user = userEvent.setup();
    const { book, documents } = await seedStudyBook(["Keep active", "Remove"]);
    useStore.setState({
      selectedTextContext: "Keep this active selection.",
      annotations: [
        {
          id: "annotation:inactive-document",
          documentId: documents[1].id,
          pageNumber: 1,
          rects: [],
          text: "Remove with document",
          color: "#ffff00",
        },
      ],
    });

    renderStudyView();
    await waitForPdfView();
    await user.click(screen.getByRole("button", { name: "Remove Remove" }));

    await waitFor(async () => {
      expect(await db.learningDocuments.get(documents[1].id)).toBeUndefined();
      expect(useStore.getState()).toMatchObject({
        activeDocumentId: documents[0].id,
        selectedTextContext: "Keep this active selection.",
        annotations: [],
      });
      expect((await db.learningBooks.get(book.id))?.activeDocumentId).toBe(
        documents[0].id,
      );
    });
  });

  it("removes the active document, clears its context, and selects the remaining document", async () => {
    const user = userEvent.setup();
    const { book, documents } = await seedStudyBook(["Remove active", "Next"]);
    useStore.setState({
      selectedTextContext: "Remove active context.",
      annotations: [
        {
          id: "annotation:active-document",
          documentId: documents[0].id,
          pageNumber: 1,
          rects: [],
          text: "Remove with active document",
          color: "#ffff00",
        },
      ],
    });

    renderStudyView();
    await waitForPdfView();
    await user.click(
      screen.getByRole("button", { name: "Remove Remove active" }),
    );

    await waitFor(async () => {
      expect(useStore.getState()).toMatchObject({
        activeDocumentId: documents[1].id,
        selectedTextContext: "",
        annotations: [],
      });
      expect((await db.learningBooks.get(book.id))?.activeDocumentId).toBe(
        documents[1].id,
      );
    });
    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
  });

  it("returns to the introduction and resets PDF state after removing the last document", async () => {
    const user = userEvent.setup();
    const { book, documents } = await seedStudyBook(["Only document"], {
      documentOverrides: [{ lastViewedPage: 5, totalPages: 12, scale: 1.25 }],
    });

    renderStudyView();
    await waitForPdfView();
    await user.click(
      screen.getByRole("button", { name: "Remove Only document" }),
    );

    expect(await screen.findByTestId("intro-heading")).toBeInTheDocument();
    await waitFor(() => {
      expect(useStore.getState()).toMatchObject({
        activeDocumentId: null,
        pdfPage: 1,
        pdfTotalPages: 0,
        pdfUrl: null,
      });
    });
    await waitFor(async () => {
      expect(await db.learningDocuments.get(documents[0].id)).toBeUndefined();
      const updatedBook = await db.learningBooks.get(book.id);
      expect(updatedBook?.documentIds).toEqual([]);
      expect(updatedBook?.activeDocumentId).toBeUndefined();
    });
  });
});
