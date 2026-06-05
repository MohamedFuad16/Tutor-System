import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PdfViewer } from "../src/components/PdfViewer";
import { db, type LearningDocument } from "../src/memory/longterm.memory";
import { useStore } from "../src/store";

type MockDocumentProps = {
  children?: React.ReactNode;
  onItemClick?: (item: { pageNumber: number }) => void;
  onLoadSuccess?: (result: { numPages: number }) => void;
};

type MockPageProps = {
  canvasRef?: React.Ref<HTMLCanvasElement>;
  onRenderSuccess?: () => void;
  pageNumber: number;
};

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "mock-pdf-worker-url",
}));

vi.mock("react-pdf", async () => {
  const ReactModule = await import("react");

  const Document = ({
    children,
    onItemClick,
    onLoadSuccess,
  }: MockDocumentProps) => {
    ReactModule.useEffect(() => {
      onLoadSuccess?.({ numPages: 3 });
    }, []);

    return (
      <div data-testid="mock-pdf-document">
        <button type="button" onClick={() => onItemClick?.({ pageNumber: 2 })}>
          Go to outline page 2
        </button>
        {children}
      </div>
    );
  };

  const Page = ({ canvasRef, onRenderSuccess, pageNumber }: MockPageProps) => {
    const localCanvasRef = ReactModule.useRef<HTMLCanvasElement | null>(null);

    ReactModule.useEffect(() => {
      if (typeof canvasRef === "function") {
        canvasRef(localCanvasRef.current);
      } else if (canvasRef) {
        (
          canvasRef as React.MutableRefObject<HTMLCanvasElement | null>
        ).current = localCanvasRef.current;
      }
      onRenderSuccess?.();
    }, []);

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

const learningDocument = (): LearningDocument => ({
  id: "doc:pdf",
  bookId: "book:pdf",
  title: "Rendered PDF",
  mimeType: "application/pdf",
  size: 256,
  extractedText: "Testing selection handoff in a rendered PDF viewer.",
  classification: "paper",
  extractionMode: "test",
  processingStatus: "ready",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const resetPdfStore = (page = 1) => {
  useStore.setState({
    activeDocumentId: "doc:pdf",
    activeLearningBookId: "book:pdf",
    annotations: [],
    animationsEnabled: false,
    askTutorQuery: "",
    language: "en",
    pdfPage: page,
    pdfScale: 1,
    pdfTotalPages: 0,
    pdfUrl: "blob:rendered-pdf",
    selectedTextContext: "",
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

const installSelection = (text = "Retrieval practice\nimproves recall.") => {
  const selectedRect = mockClientRect({
    bottom: 160,
    height: 24,
    left: 120,
    right: 360,
    top: 136,
    width: 240,
    x: 120,
    y: 136,
  });
  const range = {
    getClientRects: () => [selectedRect],
  } as unknown as Range;
  const removeAllRanges = vi.fn();
  vi.spyOn(window, "getSelection").mockReturnValue({
    getRangeAt: () => range,
    isCollapsed: false,
    removeAllRanges,
    toString: () => text,
  } as unknown as Selection);
  return removeAllRanges;
};

const renderPdfViewer = async (page = 1) => {
  resetPdfStore(page);
  render(<PdfViewer />);
  await waitFor(() => {
    expect(useStore.getState().pdfTotalPages).toBe(3);
  });
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.learningDocuments.put(learningDocument());
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => mockClientRect(),
  );
});

afterEach(async () => {
  await waitFor(async () => {
    const documentRecord = await db.learningDocuments.get("doc:pdf");
    expect(documentRecord?.lastViewedPage).toBe(useStore.getState().pdfPage);
  });
  cleanup();
  await db.delete();
});

describe("rendered PdfViewer flows", () => {
  it("clamps loaded pages and keeps action-bar navigation within PDF bounds", async () => {
    await renderPdfViewer(9);

    expect(useStore.getState().pdfPage).toBe(3);
    expect(screen.getByLabelText("PDF page number")).toHaveValue("3");

    fireEvent.click(screen.getByRole("button", { name: "Next PDF page" }));
    expect(useStore.getState().pdfPage).toBe(3);

    fireEvent.click(screen.getByRole("button", { name: "Previous PDF page" }));
    expect(useStore.getState().pdfPage).toBe(2);

    const pageInput = screen.getByLabelText("PDF page number");
    fireEvent.change(pageInput, { target: { value: "99" } });
    fireEvent.keyDown(pageInput, { key: "Enter" });
    expect(useStore.getState().pdfPage).toBe(3);

    fireEvent.change(pageInput, { target: { value: "0" } });
    fireEvent.blur(pageInput);
    expect(useStore.getState().pdfPage).toBe(1);
  });

  it("toggles fit controls with pressed state instead of layout-coupled assertions", async () => {
    await renderPdfViewer();

    const fitHeight = screen.getByRole("button", { name: "Fit Height" });
    const fitWidth = screen.getByRole("button", { name: "Fit Width" });

    expect(fitHeight).toHaveAttribute("aria-pressed", "true");
    expect(fitWidth).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(fitWidth);
    expect(fitHeight).toHaveAttribute("aria-pressed", "false");
    expect(fitWidth).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(fitHeight);
    expect(fitHeight).toHaveAttribute("aria-pressed", "true");
    expect(fitWidth).toHaveAttribute("aria-pressed", "false");
  });

  it("hands selected PDF text to ChatPanel without creating an annotation", async () => {
    await renderPdfViewer();
    installSelection();

    fireEvent.mouseUp(screen.getByTestId("mock-pdf-page"));

    const askTutor = await screen.findByRole("button", { name: "Ask Tutor" });
    fireEvent.click(askTutor);

    expect(useStore.getState().selectedTextContext).toBe(
      "Retrieval practice improves recall.",
    );
    expect(useStore.getState().askTutorQuery).toBe("");
    expect(useStore.getState().annotations).toHaveLength(0);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Ask Tutor" })).toBeNull();
    });
  });

  it("creates document-scoped highlight and sticky annotations from rendered selection controls", async () => {
    const user = userEvent.setup();
    await renderPdfViewer(2);
    installSelection("Spacing effect annotation text.");

    fireEvent.mouseUp(screen.getByTestId("mock-pdf-page"));
    fireEvent.click(await screen.findByRole("button", { name: "Highlight" }));

    expect(useStore.getState().annotations[0]).toMatchObject({
      bookId: "book:pdf",
      documentId: "doc:pdf",
      pageNumber: 2,
      text: "Spacing effect annotation text.",
      type: "highlight",
    });

    fireEvent.mouseUp(screen.getByTestId("mock-pdf-page"));
    fireEvent.click(await screen.findByRole("button", { name: "Sticky Note" }));
    await user.type(
      screen.getByPlaceholderText("Add note to annotation..."),
      "Review this before active recall.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(useStore.getState().annotations[1]).toMatchObject({
      bookId: "book:pdf",
      documentId: "doc:pdf",
      note: "Review this before active recall.",
      pageNumber: 2,
      text: "Spacing effect annotation text.",
      type: "sticky",
    });
  });

  it("lets global arrow keys navigate while focused inputs keep page shortcuts inert", async () => {
    await renderPdfViewer(2);

    const pageInput = screen.getByLabelText("PDF page number");
    pageInput.focus();
    fireEvent.keyDown(pageInput, { key: "ArrowRight" });
    expect(useStore.getState().pdfPage).toBe(2);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(useStore.getState().pdfPage).toBe(3);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(useStore.getState().pdfPage).toBe(2);
  });
});
