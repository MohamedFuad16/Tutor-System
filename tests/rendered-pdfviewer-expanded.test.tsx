import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gsap } from "gsap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PdfViewer } from "../src/components/PdfViewer";
import { db, type LearningDocument } from "../src/memory/longterm.memory";
import { type Annotation, useStore } from "../src/store";

type MockDocumentProps = {
  children?: React.ReactNode;
  file?: unknown;
  loading?: React.ReactNode;
  onItemClick?: (item: { pageNumber: number }) => void;
  onLoadSuccess?: (result: { numPages: number }) => void;
};

type MockPageProps = {
  canvasRef?: React.Ref<HTMLCanvasElement>;
  className?: string;
  height?: number;
  onRenderSuccess?: () => void;
  pageNumber: number;
  renderAnnotationLayer?: boolean;
  renderTextLayer?: boolean;
  scale?: number;
  width?: number;
};

const reactPdfMock = vi.hoisted(() => ({
  config: {
    mode: "loaded" as "loaded" | "loading",
    numPages: 4,
    outlinePage: 3,
  },
  documentFiles: [] as string[],
  pageProps: [] as Array<{
    height?: number;
    pageNumber: number;
    renderAnnotationLayer?: boolean;
    renderTextLayer?: boolean;
    scale?: number;
    width?: number;
  }>,
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "mock-pdf-worker-url",
}));

vi.mock("react-pdf", async () => {
  const ReactModule = await import("react");

  const Document = ({
    children,
    file,
    loading,
    onItemClick,
    onLoadSuccess,
  }: MockDocumentProps) => {
    ReactModule.useEffect(() => {
      if (reactPdfMock.config.mode === "loaded") {
        onLoadSuccess?.({ numPages: reactPdfMock.config.numPages });
      }
    }, [onLoadSuccess]);

    const fileValue = file === null || file === undefined ? "" : String(file);
    reactPdfMock.documentFiles.push(fileValue);

    if (reactPdfMock.config.mode === "loading") {
      return <div data-testid="mock-pdf-loading">{loading}</div>;
    }

    return (
      <div data-file={fileValue} data-testid="mock-pdf-document">
        <button
          type="button"
          onClick={() =>
            onItemClick?.({ pageNumber: reactPdfMock.config.outlinePage })
          }
        >
          Go to outline page {reactPdfMock.config.outlinePage}
        </button>
        {children}
      </div>
    );
  };

  const Page = ({
    canvasRef,
    height,
    onRenderSuccess,
    pageNumber,
    renderAnnotationLayer,
    renderTextLayer,
    scale,
    width,
  }: MockPageProps) => {
    const localCanvasRef = ReactModule.useRef<HTMLCanvasElement | null>(null);

    reactPdfMock.pageProps.push({
      height,
      pageNumber,
      renderAnnotationLayer,
      renderTextLayer,
      scale,
      width,
    });

    ReactModule.useEffect(() => {
      const canvas = localCanvasRef.current;
      if (canvas) {
        Object.defineProperty(canvas, "toBlob", {
          configurable: true,
          value: (callback: BlobCallback) => callback(null),
        });
      }
      if (typeof canvasRef === "function") {
        canvasRef(canvas);
      } else if (canvasRef) {
        (
          canvasRef as React.MutableRefObject<HTMLCanvasElement | null>
        ).current = canvas;
      }
      onRenderSuccess?.();
    }, [canvasRef, onRenderSuccess]);

    return (
      <div
        className="react-pdf__Page"
        data-page-number={pageNumber}
        data-testid="mock-pdf-page"
      >
        <canvas
          ref={localCanvasRef}
          className="react-pdf__Page__canvas"
          data-testid="mock-pdf-canvas"
          height={1000}
          width={800}
        />
        <span>Mock PDF page {pageNumber}</span>
      </div>
    );
  };

  return {
    Document,
    Page,
    pdfjs: {
      GlobalWorkerOptions: {
        workerSrc: "",
      },
    },
  };
});

vi.mock("../src/memory/memory.orchestrator", () => ({
  brainOrchestrator: {
    updateLearningBookTitle: vi.fn(async () => undefined),
  },
}));

type RenderOptions = {
  activeDocumentId?: string | null;
  activeLearningBookId?: string | null;
  annotations?: Annotation[];
  animationsEnabled?: boolean;
  mode?: "loaded" | "loading";
  numPages?: number;
  page?: number;
  pdfScale?: number;
  pdfUrl?: string | null;
  selectedTextContext?: string;
};

const baseRect = {
  x: 0.1,
  y: 0.2,
  width: 0.25,
  height: 0.04,
  pageIndex: 2,
};

const learningDocument = (
  overrides: Partial<LearningDocument> = {},
): LearningDocument => ({
  id: "doc:pdf",
  bookId: "book:pdf",
  title: "Expanded Rendered PDF",
  mimeType: "application/pdf",
  size: 512,
  extractedText: "Rendered PdfViewer expanded coverage fixture.",
  classification: "paper",
  extractionMode: "test",
  processingStatus: "ready",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const resetReactPdfMock = () => {
  reactPdfMock.config.mode = "loaded";
  reactPdfMock.config.numPages = 4;
  reactPdfMock.config.outlinePage = 3;
  reactPdfMock.documentFiles.length = 0;
  reactPdfMock.pageProps.length = 0;
};

const installMatchMedia = (matches = false) => {
  const mediaQuery = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null as MediaQueryList["onchange"],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => mediaQuery),
  });

  return mediaQuery;
};

const resetPdfStore = ({
  activeDocumentId = "doc:pdf",
  activeLearningBookId = "book:pdf",
  annotations = [],
  animationsEnabled = false,
  page = 1,
  pdfScale = 1,
  pdfUrl = "blob:expanded-pdf",
  selectedTextContext = "",
}: RenderOptions = {}) => {
  useStore.setState({
    activeDocumentId,
    activeLearningBookId,
    annotations,
    animationsEnabled,
    apiKey: "",
    askTutorQuery: "stale tutor query",
    language: "en",
    pdfPage: page,
    pdfScale,
    pdfTotalPages: 0,
    pdfUrl,
    selectedTextContext,
  });
};

const mockClientRect = (overrides: Partial<DOMRect> = {}): DOMRect =>
  ({
    bottom: 1000,
    height: 1000,
    left: 0,
    right: 800,
    top: 0,
    width: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...overrides,
  }) as DOMRect;

const installSelection = ({
  collapsed = false,
  rects = [
    mockClientRect({
      bottom: 160,
      height: 24,
      left: 120,
      right: 360,
      top: 136,
      width: 240,
      x: 120,
      y: 136,
    }),
  ],
  text = "Spacing effect\nimproves recall.",
}: {
  collapsed?: boolean;
  rects?: DOMRect[];
  text?: string;
} = {}) => {
  const removeAllRanges = vi.fn();
  const range = {
    getClientRects: () => rects,
  } as unknown as Range;

  vi.spyOn(window, "getSelection").mockReturnValue({
    getRangeAt: () => range,
    isCollapsed: collapsed,
    removeAllRanges,
    toString: () => text,
  } as unknown as Selection);

  return removeAllRanges;
};

const renderPdfViewer = async (options: RenderOptions = {}) => {
  reactPdfMock.config.mode = options.mode ?? "loaded";
  reactPdfMock.config.numPages = options.numPages ?? 4;
  resetPdfStore(options);

  const view = render(<PdfViewer />);

  if (reactPdfMock.config.mode === "loaded") {
    await waitFor(() => {
      expect(useStore.getState().pdfTotalPages).toBe(
        reactPdfMock.config.numPages,
      );
    });
  }

  return view;
};

const getPageInput = () =>
  screen.getByRole("textbox", { name: "PDF page number" });

const latestPageProps = () =>
  reactPdfMock.pageProps[reactPdfMock.pageProps.length - 1];

const openSelectionToolbar = async (
  selectionOptions: Parameters<typeof installSelection>[0] = {},
) => {
  const removeAllRanges = installSelection(selectionOptions);
  fireEvent.mouseUp(screen.getByTestId("mock-pdf-page"));
  await screen.findByRole("button", { name: "Highlight" });
  return removeAllRanges;
};

const openStickyEditor = async (
  selectionOptions: Parameters<typeof installSelection>[0] = {},
) => {
  const removeAllRanges = await openSelectionToolbar(selectionOptions);
  fireEvent.click(screen.getByRole("button", { name: "Sticky Note" }));
  await screen.findByPlaceholderText("Add note to annotation...");
  return removeAllRanges;
};

const waitForActiveDocumentPersistence = async () => {
  const activeDocumentId = useStore.getState().activeDocumentId;
  if (!activeDocumentId) return;

  await waitFor(async () => {
    const documentRecord = await db.learningDocuments.get(activeDocumentId);
    if (!documentRecord) return;

    expect(documentRecord.lastViewedPage).toBe(useStore.getState().pdfPage);
    expect(documentRecord.scale).toBe(useStore.getState().pdfScale);
    if (reactPdfMock.config.mode === "loaded") {
      expect(documentRecord.totalPages).toBe(reactPdfMock.config.numPages);
    }
  });
};

beforeEach(async () => {
  resetReactPdfMock();
  installMatchMedia(false);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => mockClientRect(),
  );

  await db.delete();
  await db.open();
  await db.learningDocuments.put(learningDocument());
});

afterEach(async () => {
  await waitForActiveDocumentPersistence();
  cleanup();
  vi.restoreAllMocks();
  await db.delete();
});

describe("rendered PdfViewer expanded coverage", () => {
  it("renders the mocked React-PDF document with the current file and page", async () => {
    await renderPdfViewer({ page: 2, pdfUrl: "blob:custom-pdf" });

    expect(screen.getByTestId("mock-pdf-document")).toHaveAttribute(
      "data-file",
      "blob:custom-pdf",
    );
    expect(screen.getByTestId("mock-pdf-page")).toHaveAttribute(
      "data-page-number",
      "2",
    );
    expect(screen.getByText("Mock PDF page 2")).toBeInTheDocument();
  });

  it("renders the mocked React-PDF loading fallback before load success", async () => {
    await renderPdfViewer({ mode: "loading" });

    expect(screen.getByTestId("mock-pdf-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-pdf-page")).toBeNull();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(useStore.getState().pdfTotalPages).toBe(0);
  });

  it("stores loaded page count in state and the active document record", async () => {
    await renderPdfViewer({ numPages: 6 });

    expect(useStore.getState().pdfTotalPages).toBe(6);
    await waitFor(async () => {
      await expect(db.learningDocuments.get("doc:pdf")).resolves.toMatchObject({
        totalPages: 6,
      });
    });
  });

  it("keeps an in-range current page after the PDF loads", async () => {
    await renderPdfViewer({ numPages: 6, page: 4 });

    expect(useStore.getState().pdfPage).toBe(4);
    expect(getPageInput()).toHaveValue("4");
  });

  it("clamps an initial page above the loaded total", async () => {
    await renderPdfViewer({ numPages: 3, page: 9 });

    expect(useStore.getState().pdfPage).toBe(3);
    expect(getPageInput()).toHaveValue("3");
  });

  it("clamps an initial page below the first page", async () => {
    await renderPdfViewer({ numPages: 3, page: -5 });

    expect(useStore.getState().pdfPage).toBe(1);
    expect(getPageInput()).toHaveValue("1");
  });

  it("uses React-PDF outline item clicks for page handoff", async () => {
    reactPdfMock.config.outlinePage = 4;
    await renderPdfViewer({ numPages: 5 });

    fireEvent.click(
      screen.getByRole("button", { name: "Go to outline page 4" }),
    );

    expect(useStore.getState().pdfPage).toBe(4);
  });

  it("passes text and annotation layer flags to the rendered page", async () => {
    await renderPdfViewer({ page: 2, pdfScale: 1.15 });

    expect(latestPageProps()).toMatchObject({
      pageNumber: 2,
      renderAnnotationLayer: true,
      renderTextLayer: true,
      scale: 1.15,
    });
  });

  it("renders an empty document handoff when no PDF URL is active", async () => {
    await renderPdfViewer({ pdfUrl: null });

    expect(screen.getByTestId("mock-pdf-document")).toHaveAttribute(
      "data-file",
      "",
    );
    expect(screen.getByTestId("mock-pdf-page")).toBeInTheDocument();
  });

  it("moves to the previous page from the action bar", async () => {
    await renderPdfViewer({ page: 3 });

    fireEvent.click(screen.getByRole("button", { name: "Previous PDF page" }));

    expect(useStore.getState().pdfPage).toBe(2);
  });

  it("keeps previous-page navigation clamped at page one", async () => {
    await renderPdfViewer({ page: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Previous PDF page" }));

    expect(useStore.getState().pdfPage).toBe(1);
  });

  it("moves to the next page from the action bar", async () => {
    await renderPdfViewer({ page: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Next PDF page" }));

    expect(useStore.getState().pdfPage).toBe(3);
  });

  it("keeps next-page navigation clamped at the loaded total", async () => {
    await renderPdfViewer({ numPages: 3, page: 3 });

    fireEvent.click(screen.getByRole("button", { name: "Next PDF page" }));

    expect(useStore.getState().pdfPage).toBe(3);
  });

  it("commits a typed page number with Enter", async () => {
    await renderPdfViewer({ page: 1 });
    const pageInput = getPageInput();

    fireEvent.change(pageInput, { target: { value: "3" } });
    fireEvent.keyDown(pageInput, { key: "Enter" });

    expect(useStore.getState().pdfPage).toBe(3);
    expect(pageInput).toHaveValue("3");
  });

  it("commits a typed page number on blur", async () => {
    await renderPdfViewer({ page: 1 });
    const pageInput = getPageInput();

    fireEvent.change(pageInput, { target: { value: "4" } });
    fireEvent.blur(pageInput);

    expect(useStore.getState().pdfPage).toBe(4);
    expect(pageInput).toHaveValue("4");
  });

  it("lets the page input be temporarily blank without changing the page", async () => {
    await renderPdfViewer({ page: 2 });
    const pageInput = getPageInput();

    fireEvent.change(pageInput, { target: { value: "" } });
    expect(pageInput).toHaveValue("");
    expect(useStore.getState().pdfPage).toBe(2);

    fireEvent.blur(pageInput);
    expect(useStore.getState().pdfPage).toBe(2);
    expect(pageInput).toHaveValue("2");
  });

  it("ignores non-numeric page input on blur", async () => {
    await renderPdfViewer({ page: 2 });
    const pageInput = getPageInput();

    fireEvent.change(pageInput, { target: { value: "chapter" } });
    fireEvent.blur(pageInput);

    expect(useStore.getState().pdfPage).toBe(2);
    expect(pageInput).toHaveValue("2");
  });

  it("clamps zero or negative typed page input to the first page", async () => {
    await renderPdfViewer({ page: 3 });
    const pageInput = getPageInput();

    fireEvent.change(pageInput, { target: { value: "-8" } });
    fireEvent.keyDown(pageInput, { key: "Enter" });

    expect(useStore.getState().pdfPage).toBe(1);
    expect(pageInput).toHaveValue("1");
  });

  it("parses leading-zero page input within document bounds", async () => {
    await renderPdfViewer({ page: 1 });
    const pageInput = getPageInput();

    fireEvent.change(pageInput, { target: { value: "03" } });
    fireEvent.keyDown(pageInput, { key: "Enter" });

    expect(useStore.getState().pdfPage).toBe(3);
    expect(pageInput).toHaveValue("3");
  });

  it("moves forward with the ArrowRight keyboard shortcut", async () => {
    await renderPdfViewer({ page: 2 });

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(useStore.getState().pdfPage).toBe(3);
  });

  it("moves forward with the ArrowDown keyboard shortcut", async () => {
    await renderPdfViewer({ page: 2 });

    fireEvent.keyDown(window, { key: "ArrowDown" });

    expect(useStore.getState().pdfPage).toBe(3);
  });

  it("moves backward with the ArrowLeft keyboard shortcut", async () => {
    await renderPdfViewer({ page: 3 });

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(useStore.getState().pdfPage).toBe(2);
  });

  it("moves backward with the ArrowUp keyboard shortcut", async () => {
    await renderPdfViewer({ page: 3 });

    fireEvent.keyDown(window, { key: "ArrowUp" });

    expect(useStore.getState().pdfPage).toBe(2);
  });

  it("keeps page shortcuts inert while the page input is focused", async () => {
    await renderPdfViewer({ page: 2 });
    const pageInput = getPageInput();

    pageInput.focus();
    fireEvent.keyDown(pageInput, { key: "ArrowRight" });

    expect(useStore.getState().pdfPage).toBe(2);
  });

  it("removes global page keyboard shortcuts after unmount", async () => {
    const { unmount } = await renderPdfViewer({ page: 2 });

    unmount();
    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(useStore.getState().pdfPage).toBe(2);
  });

  it("exposes action-bar controls by role and label with default fit state", async () => {
    await renderPdfViewer();

    expect(
      screen.getByRole("button", { name: "Previous PDF page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next PDF page" }),
    ).toBeInTheDocument();
    expect(getPageInput()).toHaveAccessibleName("PDF page number");
    expect(screen.getByRole("button", { name: "Fit Height" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Fit Width" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggles fit-width pressed state from the action bar", async () => {
    await renderPdfViewer();

    fireEvent.click(screen.getByRole("button", { name: "Fit Width" }));

    expect(screen.getByRole("button", { name: "Fit Width" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Fit Height" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggles fit mode with a double click on the PDF surface", async () => {
    await renderPdfViewer();

    fireEvent.doubleClick(screen.getByTestId("mock-pdf-page"));
    expect(screen.getByRole("button", { name: "Fit Width" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.doubleClick(screen.getByTestId("mock-pdf-page"));
    expect(screen.getByRole("button", { name: "Fit Height" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("propagates updated store scale into the rendered PDF page", async () => {
    await renderPdfViewer({ pdfScale: 1 });

    act(() => {
      useStore.getState().setPdfScale(1.35);
    });

    await waitFor(() => {
      expect(latestPageProps()).toMatchObject({ scale: 1.35 });
    });
  });

  it("persists updated PDF scale to the active document record", async () => {
    await renderPdfViewer({ pdfScale: 1 });

    act(() => {
      useStore.getState().setPdfScale(1.2);
    });

    await waitFor(async () => {
      await expect(db.learningDocuments.get("doc:pdf")).resolves.toMatchObject({
        scale: 1.2,
      });
    });
  });

  it("runs border motion when animations are enabled and reduced motion is off", async () => {
    installMatchMedia(false);
    await renderPdfViewer({ animationsEnabled: true });

    expect(gsap.to).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ repeat: -1, rotate: 360 }),
    );
  });

  it("suppresses border motion when the learner prefers reduced motion", async () => {
    installMatchMedia(true);
    await renderPdfViewer({ animationsEnabled: true });

    expect(gsap.to).not.toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ repeat: -1, rotate: 360 }),
    );
  });

  it("does not show selection controls for collapsed selections", async () => {
    await renderPdfViewer();
    installSelection({ collapsed: true });

    fireEvent.mouseUp(screen.getByTestId("mock-pdf-page"));

    expect(screen.queryByRole("button", { name: "Highlight" })).toBeNull();
  });

  it("does not show selection controls when the browser selection API is empty", async () => {
    await renderPdfViewer();
    vi.spyOn(window, "getSelection").mockReturnValue(null);

    fireEvent.mouseUp(screen.getByTestId("mock-pdf-page"));

    expect(screen.queryByRole("button", { name: "Highlight" })).toBeNull();
  });

  it("exposes annotation controls and Ask Tutor after a rendered selection", async () => {
    await renderPdfViewer();

    await openSelectionToolbar();

    expect(
      screen.getByRole("button", { name: "Highlight" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Underline" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Strikethrough" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sticky Note" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ask Tutor" }),
    ).toBeInTheDocument();
  });

  it("hands normalized selected text to the tutor without creating annotations", async () => {
    await renderPdfViewer({
      selectedTextContext: "old selected context",
    });
    const removeAllRanges = await openSelectionToolbar({
      text: "Retrieval-\npractice   improves\nrecall.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Ask Tutor" }));

    expect(useStore.getState().selectedTextContext).toBe(
      "Retrievalpractice improves recall.",
    );
    expect(useStore.getState().askTutorQuery).toBe("");
    expect(useStore.getState().annotations).toHaveLength(0);
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("dismisses the selection toolbar on outside click and clears ranges", async () => {
    await renderPdfViewer();
    const removeAllRanges = await openSelectionToolbar();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("button", { name: "Highlight" })).toBeNull();
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("creates a document-scoped highlight annotation from the toolbar", async () => {
    await renderPdfViewer({ page: 2 });
    const removeAllRanges = await openSelectionToolbar({
      text: "Highlight this concept.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Highlight" }));

    expect(useStore.getState().annotations[0]).toMatchObject({
      bookId: "book:pdf",
      color: "#fde047",
      documentId: "doc:pdf",
      pageNumber: 2,
      text: "Highlight this concept.",
      type: "highlight",
    });
    expect(useStore.getState().annotations[0].rects[0]).toMatchObject({
      pageIndex: 2,
    });
    expect(useStore.getState().annotations[0].rects[0].x).toBeCloseTo(0.15);
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("creates an underline annotation with the expected color", async () => {
    await renderPdfViewer({ page: 2 });
    await openSelectionToolbar({ text: "Underline this relation." });

    fireEvent.click(screen.getByRole("button", { name: "Underline" }));

    expect(useStore.getState().annotations[0]).toMatchObject({
      color: "#3b82f6",
      documentId: "doc:pdf",
      pageNumber: 2,
      text: "Underline this relation.",
      type: "underline",
    });
  });

  it("creates a strikethrough annotation with the expected color", async () => {
    await renderPdfViewer({ page: 2 });
    await openSelectionToolbar({ text: "Strike this misconception." });

    fireEvent.click(screen.getByRole("button", { name: "Strikethrough" }));

    expect(useStore.getState().annotations[0]).toMatchObject({
      color: "#ef4444",
      documentId: "doc:pdf",
      pageNumber: 2,
      text: "Strike this misconception.",
      type: "strikethrough",
    });
  });

  it("drops annotation creation when selected rects do not intersect the page", async () => {
    await renderPdfViewer();
    const removeAllRanges = await openSelectionToolbar({
      rects: [
        mockClientRect({
          bottom: 1300,
          top: 1250,
        }),
      ],
      text: "Outside page selection.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Highlight" }));

    expect(useStore.getState().annotations).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Highlight" })).toBeNull();
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
  });

  it("cancels a sticky-note draft without creating an annotation", async () => {
    await renderPdfViewer();
    await openStickyEditor({ text: "Draft sticky text." });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useStore.getState().annotations).toHaveLength(0);
    expect(
      screen.queryByPlaceholderText("Add note to annotation..."),
    ).toBeNull();
  });

  it("keeps a blank sticky-note draft open and unsaved", async () => {
    await renderPdfViewer();
    await openStickyEditor({ text: "Blank sticky text." });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(useStore.getState().annotations).toHaveLength(0);
    expect(
      screen.getByPlaceholderText("Add note to annotation..."),
    ).toBeInTheDocument();
  });

  it("saves a sticky note with the selected text and note body", async () => {
    const user = userEvent.setup();
    await renderPdfViewer({ page: 2 });
    const removeAllRanges = await openStickyEditor({
      text: "Save this sticky selection.",
    });

    await user.type(
      screen.getByPlaceholderText("Add note to annotation..."),
      "Review during active recall.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(useStore.getState().annotations[0]).toMatchObject({
      color: "#fde047",
      documentId: "doc:pdf",
      note: "Review during active recall.",
      pageNumber: 2,
      text: "Save this sticky selection.",
      type: "sticky",
    });
    expect(removeAllRanges).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByPlaceholderText("Add note to annotation..."),
    ).toBeNull();
  });

  it("renders only annotations scoped to the active document and page", async () => {
    const { container } = await renderPdfViewer({
      annotations: [
        {
          id: "active-highlight",
          bookId: "book:pdf",
          color: "#fde047",
          documentId: "doc:pdf",
          pageNumber: 2,
          rects: [baseRect, { ...baseRect, x: 0.45, y: 0.28 }],
          text: "Active annotation.",
          type: "highlight",
        },
        {
          id: "other-document",
          bookId: "book:pdf",
          color: "#fde047",
          documentId: "doc:other",
          pageNumber: 2,
          rects: [baseRect],
          text: "Other document annotation.",
          type: "highlight",
        },
        {
          id: "other-page",
          bookId: "book:pdf",
          color: "#fde047",
          documentId: "doc:pdf",
          pageNumber: 3,
          rects: [baseRect],
          text: "Other page annotation.",
          type: "highlight",
        },
      ],
      page: 2,
    });

    expect(container.querySelectorAll(".mix-blend-multiply")).toHaveLength(2);
    const annotationMarks = container.querySelectorAll(
      '[data-annotation-id="active-highlight"][data-annotation-type="highlight"]',
    );
    expect(annotationMarks).toHaveLength(2);
    annotationMarks.forEach((mark) =>
      expect(mark).toHaveAttribute("aria-hidden", "true"),
    );
  });
});
