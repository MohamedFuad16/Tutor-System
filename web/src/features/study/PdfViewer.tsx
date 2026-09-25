/**
 * PDF reader for the study workspace: one page at a time on the dark canvas,
 * fitted to the pane width, with zoom, keyboard/swipe paging, a selection
 * toolbar (ask the tutor, highlight, underline, copy) and saved annotations
 * drawn as page-relative overlays so they survive any zoom level.
 *
 * The current page lives in the app store (`useApp().page`); this component
 * only mirrors it to the server (`lastPage`) so the learner resumes in place.
 *
 * This file wires the reader together; hooks, overlays, controls, geometry and
 * state panels live in `./pdf/`.
 */
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page } from "react-pdf";
import type { Annotation, StudyDocument } from "@shared/types";
import { toast } from "@/components/ui";
import { API_BASE, authHeaders } from "@/lib/api";
import { useAnnotations } from "@/lib/queries";
import { useApp, useMotion } from "@/store/app";
import { AnnotationMarks, AnnotationPopover, hitAnnotation } from "./pdf/AnnotationOverlay";
import { ControlPill } from "./pdf/PageControls";
import { SelectionMenu } from "./pdf/SelectionMenu";
import { HIGHLIGHT_COLOR, UNDERLINE_COLOR, useAnnotationMutations } from "./pdf/annotations";
import { clamp, type Anchor } from "./pdf/geometry";
import { PDF_OPTIONS } from "./pdf/pdfjs";
import { DocumentStatusState, LoadError, PageError, PageShimmer, SheetSkeleton } from "./pdf/states";
import { useDismissFloating } from "./pdf/useDismissFloating";
import { useFitWidth } from "./pdf/useFitWidth";
import { FLASH_MS, useJumpTo } from "./pdf/useJumpTo";
import { usePageMemory } from "./pdf/usePageMemory";
import { useKeyboardPaging, useSwipePaging } from "./pdf/usePagingInput";
import { useTextSelection, type SelectionState } from "./pdf/useTextSelection";
import { useZoom } from "./pdf/useZoom";

const DEFAULT_RATIO = 1.4142; // A4 until the real page size is known

type PopoverState = { annotation: Annotation; anchor: Anchor };

export type PdfViewerProps = {
  document: StudyDocument;
  onAsk: (text: string, page: number) => void;
};

export function PdfViewer({ document: doc, onAsk }: PdfViewerProps) {
  if (doc.status !== "ready") return <DocumentStatusState doc={doc} />;
  // Keyed so every per-document bit of state (page count, zoom, pending save) starts fresh.
  return <PdfReader key={doc.id} doc={doc} onAsk={onAsk} />;
}

// ---------------------------------------------------------------- reader

function PdfReader({ doc, onAsk }: { doc: StudyDocument; onAsk: PdfViewerProps["onAsk"] }) {
  const animate = useMotion();
  const storePage = useApp((state) => state.page);
  const { data: annotations } = useAnnotations(doc.id);
  const { create, remove } = useAnnotationMutations(doc.id);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [menu, setMenu] = useState<SelectionState | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const page = numPages ? clamp(storePage, 1, numPages) : Math.max(1, storePage);
  const total = numPages || doc.pageCount || 0;

  // Direction of the last page turn, derived during render for the enter animation.
  const [trail, setTrail] = useState({ page, dir: 0 });
  if (trail.page !== page) setTrail({ page, dir: page > trail.page ? 1 : -1 });

  const pageRef = useRef(page);
  const numPagesRef = useRef(0);
  const restoredRef = useRef(false);

  // `attempt` re-reads identity headers on retry (e.g. after an access code was entered).
  const file = useMemo(
    () => ({ url: `${API_BASE}/api/documents/${encodeURIComponent(doc.id)}/file`, httpHeaders: authHeaders() }),
    [doc.id, attempt],
  );

  const pageAnnotations = useMemo(() => (annotations ?? []).filter((item) => item.page === page), [annotations, page]);

  // ------------------------------------------------------------ navigation

  const goTo = useCallback((target: number) => {
    if (!Number.isFinite(target)) return;
    const count = numPagesRef.current;
    const next = Math.max(1, count ? Math.min(count, Math.round(target)) : Math.round(target));
    if (useApp.getState().page !== next) useApp.getState().set({ page: next });
  }, []);

  const turn = useCallback((delta: number) => goTo(pageRef.current + delta), [goTo]);

  const onDocumentLoad = useCallback(
    ({ numPages: count }: { numPages: number }) => {
      numPagesRef.current = count;
      setNumPages(count);
      setLoadError(null);
      if (restoredRef.current) return;
      restoredRef.current = true;
      if (useApp.getState().page === 1 && doc.lastPage > 1) goTo(Math.min(doc.lastPage, count));
    },
    [doc.lastPage, goTo],
  );

  // Keep the store inside [1, numPages] once the real count is known.
  useEffect(() => {
    if (numPages && storePage !== page) useApp.getState().set({ page });
  }, [numPages, storePage, page]);

  // New page: start at its top and drop any floating UI tied to the old one.
  useLayoutEffect(() => {
    pageRef.current = page;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setMenu(null);
    setPopover(null);
  }, [page]);

  const flash = useJumpTo(doc.id, goTo, restoredRef, numPages);

  useKeyboardPaging(scrollRef, turn);

  // --------------------------------------------------------- remember page

  usePageMemory(doc, page, numPages);

  // ------------------------------------------------------------------ zoom

  const { gutter, fitWidth } = useFitWidth(scrollRef);
  const { zoom, pageWidth, setZoomAt, zoomStep } = useZoom(scrollRef, sheetRef, fitWidth);
  const sheetHeight = Math.round(pageWidth * ratio);

  // ------------------------------------------------------------- selection

  const toolbarPressRef = useTextSelection(sheetRef, pageRef, setMenu);

  useDismissFloating(Boolean(menu || popover), menuRef, popoverRef, setMenu, setPopover);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  };

  const askTutor = () => {
    if (!menu) return;
    useApp.getState().set({ selection: { documentId: doc.id, page: menu.page, text: menu.text } });
    onAsk(menu.text, menu.page);
    clearSelection();
  };

  const annotate = (kind: "highlight" | "underline") => {
    if (!menu) return;
    create.mutate({
      page: menu.page,
      kind,
      color: kind === "highlight" ? HIGHLIGHT_COLOR : UNDERLINE_COLOR,
      text: menu.text,
      rects: menu.rects,
    });
    clearSelection();
  };

  const copySelection = async () => {
    if (!menu) return;
    try {
      await navigator.clipboard.writeText(menu.text);
      toast("Copied to clipboard");
    } catch {
      const ok = document.execCommand?.("copy") ?? false;
      toast(ok ? "Copied to clipboard" : "Couldn't copy. Try Ctrl+C instead.", ok ? "info" : "error");
    }
    clearSelection();
  };

  // ----------------------------------------------------------------- swipe

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipePaging(scrollRef, turn);

  // ---------------------------------------------------------------- render

  const retry = () => {
    setLoadError(null);
    setAttempt((value) => value + 1);
  };

  const skeletonWidth = pageWidth || 320;
  const loaded = numPages > 0 && !loadError;

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden bg-ink-950"
      role="region"
      aria-label={`${doc.title}, PDF reader`}
    >
      <div
        ref={scrollRef}
        className="scroll-quiet absolute inset-0 overflow-auto overscroll-contain"
        style={{ scrollbarGutter: "stable" }}
        onScroll={() => {
          if (menu) setMenu(null);
          if (popover) setPopover(null);
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex min-h-full w-max min-w-full items-center justify-center"
          style={{ paddingLeft: gutter, paddingRight: gutter, paddingTop: gutter + 4, paddingBottom: 96 }}
        >
          {loadError ? (
            <LoadError message={loadError} onRetry={retry} />
          ) : (
            <Document
              key={attempt}
              file={file}
              options={PDF_OPTIONS}
              onLoadSuccess={onDocumentLoad}
              onLoadError={(error) => setLoadError(error?.message || "Unknown error")}
              onSourceError={(error) => setLoadError(error?.message || "Unknown error")}
              onItemClick={({ pageNumber }) => goTo(pageNumber)}
              externalLinkTarget="_blank"
              externalLinkRel="noopener noreferrer"
              loading={<SheetSkeleton width={skeletonWidth} height={Math.round(skeletonWidth * ratio)} />}
              error={null}
              className="relative"
            >
              {pageWidth > 0 && (
                <motion.div
                  key={page}
                  className="relative"
                  initial={animate && trail.dir !== 0 ? { opacity: 0, x: trail.dir * 28 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }}
                >
                  <div
                    ref={sheetRef}
                    role="group"
                    aria-label={`Page ${page}${total ? ` of ${total}` : ""}`}
                    onClick={(event) => {
                      // A click (not a drag-selection) on highlighted text opens that mark.
                      if (!window.getSelection()?.isCollapsed || (event.target as Element).closest("a")) return;
                      const hit = hitAnnotation(pageAnnotations, event.currentTarget, event.clientX, event.clientY);
                      if (hit)
                        setPopover({
                          annotation: hit,
                          anchor: { x: event.clientX, top: event.clientY - 6, bottom: event.clientY + 6 },
                        });
                    }}
                    className="relative overflow-hidden rounded-[3px] bg-white shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9),0_8px_24px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]"
                    style={{ width: pageWidth, height: sheetHeight }}
                  >
                    <Page
                      pageNumber={page}
                      width={pageWidth}
                      renderTextLayer
                      renderAnnotationLayer
                      canvasBackground="#ffffff"
                      loading={<PageShimmer height={sheetHeight} />}
                      error={<PageError height={sheetHeight} />}
                      onLoadSuccess={(pdfPage) => {
                        if (pdfPage.originalWidth > 0 && pdfPage.originalHeight > 0)
                          setRatio(pdfPage.originalHeight / pdfPage.originalWidth);
                      }}
                    />
                    <AnnotationMarks
                      items={pageAnnotations}
                      onOpen={(annotation, anchor) => setPopover({ annotation, anchor })}
                    />
                  </div>
                  {flash > 0 && loaded && (
                    <motion.div
                      key={flash}
                      aria-hidden
                      className="pointer-events-none absolute -inset-1.5 z-[5] rounded-lg border-2 border-signal shadow-[0_0_36px_rgba(255,110,0,0.45)]"
                      initial={{ opacity: 0 }}
                      animate={animate ? { opacity: [0, 1, 1, 0] } : { opacity: 1 }}
                      transition={
                        animate
                          ? { duration: FLASH_MS / 1000, times: [0, 0.15, 0.7, 1], ease: "easeOut" }
                          : { duration: 0 }
                      }
                    />
                  )}
                </motion.div>
              )}
            </Document>
          )}
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {loaded ? `Page ${page} of ${numPages}` : ""}
      </span>

      <ControlPill
        page={page}
        total={total}
        zoom={zoom}
        disabled={!loaded}
        animate={animate}
        onPage={goTo}
        onPrev={() => turn(-1)}
        onNext={() => turn(1)}
        onZoomIn={() => zoomStep(1)}
        onZoomOut={() => zoomStep(-1)}
        onFit={() => setZoomAt(1)}
      />

      {createPortal(
        <AnimatePresence>
          {menu && (
            <SelectionMenu
              key="selection"
              anchor={menu.anchor}
              containerRef={menuRef}
              pressRef={toolbarPressRef}
              animate={animate}
              onAsk={askTutor}
              onAnnotate={annotate}
              onCopy={() => void copySelection()}
            />
          )}
          {popover && (
            <AnnotationPopover
              key={`note-${popover.annotation.id}`}
              annotation={popover.annotation}
              anchor={popover.anchor}
              containerRef={popoverRef}
              animate={animate}
              onRemove={() => {
                remove.mutate(popover.annotation.id);
                setPopover(null);
              }}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
