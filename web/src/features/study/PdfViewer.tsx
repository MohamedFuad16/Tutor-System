/**
 * PDF reader for the study workspace: one page at a time on the dark canvas,
 * fitted to the pane width, with zoom, keyboard/swipe paging, a selection
 * toolbar (ask the tutor, highlight, underline, copy) and saved annotations
 * drawn as page-relative overlays so they survive any zoom level.
 *
 * The current page lives in the app store (`useApp().page`); this component
 * only mirrors it to the server (`lastPage`) so the learner resumes in place.
 */
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  FileWarning,
  Highlighter,
  MoveHorizontal,
  RotateCw,
  Sparkles,
  Trash2,
  Underline,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import type { Annotation, StudyDocument } from "@shared/types";
import { Button, IconButton, Spinner, cx, softSpring, spring, toast } from "@/components/ui";
import { API_BASE, api, authHeaders } from "@/lib/api";
import { keys, useAnnotations } from "@/lib/queries";
import { useApp, useMotion } from "@/store/app";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

/** cMaps + standard fonts are required for CJK text; served by vite.config.ts. */
const PDF_OPTIONS = {
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/pdfjs/standard_fonts/",
};

const HIGHLIGHT_COLOR = "#facc15";
const UNDERLINE_COLOR = "#ff6e00";
const PENDING_PREFIX = "pending-";
const DEFAULT_RATIO = 1.4142; // A4 until the real page size is known
const MAX_FIT_WIDTH = 1600;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const SAVE_DELAY_MS = 800;
const FLASH_MS = 1200;

/** Jump requests already honoured, so a remount never replays a stale one. */
let handledJumpNonce = 0;

type Rect = Annotation["rects"][number];
type Anchor = { x: number; top: number; bottom: number };
type SelectionState = { text: string; page: number; rects: Rect[]; anchor: Anchor };
type PopoverState = { annotation: Annotation; anchor: Anchor };
type NewAnnotation = Pick<Annotation, "page" | "kind" | "color" | "text" | "rects"> & { note?: string };
type Box = { left: number; top: number; right: number; bottom: number };

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
  const client = useQueryClient();
  const animate = useMotion();
  const storePage = useApp((state) => state.page);
  const jumpTo = useApp((state) => state.jumpTo);
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
  const [boxWidth, setBoxWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [flash, setFlash] = useState(0);
  const [menu, setMenu] = useState<SelectionState | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const page = numPages ? clamp(storePage, 1, numPages) : Math.max(1, storePage);
  const total = numPages || doc.pageCount || 0;

  // Direction of the last page turn, derived during render for the enter animation.
  const [trail, setTrail] = useState({ page, dir: 0 });
  if (trail.page !== page) setTrail({ page, dir: page > trail.page ? 1 : -1 });

  const pageRef = useRef(page);
  const numPagesRef = useRef(0);
  const zoomRef = useRef(zoom);
  const restoredRef = useRef(false);
  const savedRef = useRef<number>(doc.lastPage);
  const pendingSaveRef = useRef<number | null>(null);
  const anchorRef = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null);
  const mouseDownRef = useRef(false);
  const toolbarPressRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const gutter = boxWidth && boxWidth < 480 ? 12 : 28;
  const fitWidth = boxWidth ? Math.min(MAX_FIT_WIDTH, Math.max(160, boxWidth - gutter * 2)) : 0;
  const pageWidth = fitWidth ? Math.floor(fitWidth * zoom) : 0;
  const sheetHeight = Math.round(pageWidth * ratio);

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

  // Citation chips / guide sources ask for a page via `jumpTo`.
  useEffect(() => {
    if (!jumpTo || jumpTo.documentId !== doc.id || jumpTo.nonce === handledJumpNonce) return;
    handledJumpNonce = jumpTo.nonce;
    restoredRef.current = true; // an explicit jump beats "resume where you left off"
    goTo(jumpTo.page);
    setFlash(jumpTo.nonce);
  }, [jumpTo, doc.id, goTo]);

  useEffect(() => {
    if (!flash || !numPages) return;
    const timer = window.setTimeout(() => setFlash(0), FLASH_MS + 150);
    return () => window.clearTimeout(timer);
  }, [flash, numPages]);

  // Keyboard paging, unless the learner is typing somewhere or a dialog is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const delta =
        event.key === "ArrowLeft" || event.key === "PageUp"
          ? -1
          : event.key === "ArrowRight" || event.key === "PageDown"
            ? 1
            : 0;
      if (!delta) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))
      )
        return;
      const el = scrollRef.current;
      if (!el || el.getClientRects().length === 0) return; // hidden (e.g. mobile chat pane)
      if (document.querySelector("[role='dialog'][aria-modal='true']")) return;
      event.preventDefault();
      turn(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  // --------------------------------------------------------- remember page

  const flushSave = useCallback(() => {
    const target = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (target === null || target === savedRef.current) return;
    savedRef.current = target;
    api<StudyDocument>(`/documents/${doc.id}`, { method: "PATCH", json: { lastPage: target } })
      .then((updated) => {
        client.setQueryData<StudyDocument[]>(keys.documents(doc.bookId), (list) =>
          list?.map((item) => (item.id === doc.id ? { ...item, lastPage: updated?.lastPage ?? target } : item)),
        );
      })
      .catch(() => {
        if (savedRef.current === target) savedRef.current = -1; // let the next turn retry
      });
  }, [client, doc.id, doc.bookId]);

  useEffect(() => {
    if (!numPages || page === savedRef.current) return;
    pendingSaveRef.current = page;
    const timer = window.setTimeout(flushSave, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [page, numPages, flushSave]);

  // Leaving the document mid-debounce still records where the learner was.
  useEffect(() => () => flushSave(), [flushSave]);

  // ------------------------------------------------------------------ zoom

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setBoxWidth(el.clientWidth);
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      // Debounced: re-rendering the canvas on every frame of a pane drag is wasteful.
      timer = window.setTimeout(() => setBoxWidth(el.clientWidth), 90);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const setZoomAt = useCallback((value: number, point?: { x: number; y: number }) => {
    const next = clampZoom(value);
    if (next === zoomRef.current) return;
    const el = scrollRef.current;
    const sheet = sheetRef.current;
    if (el && sheet) {
      const view = el.getBoundingClientRect();
      const rect = sheet.getBoundingClientRect();
      const cx = point?.x ?? view.left + view.width / 2;
      const cy = point?.y ?? view.top + view.height / 2;
      anchorRef.current = { fx: (cx - rect.left) / rect.width, fy: (cy - rect.top) / rect.height, cx, cy };
    }
    zoomRef.current = next;
    setZoom(next);
  }, []);

  // Keep the point under the cursor (or the viewport centre) steady across zooms.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    anchorRef.current = null;
    const el = scrollRef.current;
    const sheet = sheetRef.current;
    if (!anchor || !el || !sheet) return;
    const rect = sheet.getBoundingClientRect();
    el.scrollLeft += rect.left + anchor.fx * rect.width - anchor.cx;
    el.scrollTop += rect.top + anchor.fy * rect.height - anchor.cy;
  }, [pageWidth]);

  // Trackpad pinch / ctrl+wheel zooms the page instead of the whole app.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let accumulated = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      accumulated += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      if (Math.abs(accumulated) < 40) return;
      const factor = accumulated < 0 ? 1.1 : 1 / 1.1;
      accumulated = 0;
      setZoomAt(zoomRef.current * factor, { x: event.clientX, y: event.clientY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoomAt]);

  const zoomStep = (dir: 1 | -1) => setZoomAt(stepZoom(zoomRef.current, dir));

  // ------------------------------------------------------------- selection

  const readSelection = useCallback(() => {
    if (mouseDownRef.current) return; // still dragging
    const selection = window.getSelection();
    const sheet = sheetRef.current;
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !sheet) {
      // Some touch browsers drop the selection as a toolbar button is tapped; let the tap land.
      if (Date.now() - toolbarPressRef.current > 700) setMenu(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!sheet.contains(range.startContainer) || !sheet.contains(range.endContainer)) {
      setMenu(null);
      return;
    }
    const text = cleanSelectionText(selection.toString());
    const lines = mergeLines(textRects(range, sheet));
    if (!text || !lines.length) {
      setMenu(null);
      return;
    }
    const box = sheet.getBoundingClientRect();
    const left = Math.max(box.left, Math.min(...lines.map((line) => line.left)));
    const right = Math.min(box.right, Math.max(...lines.map((line) => line.right)));
    setMenu({
      text,
      page: pageRef.current,
      rects: toFractions(lines, box),
      anchor: {
        x: (left + right) / 2,
        top: Math.min(...lines.map((line) => line.top)),
        bottom: Math.max(...lines.map((line) => line.bottom)),
      },
    });
  }, []);

  useEffect(() => {
    let timer = 0;
    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(readSelection, delay);
    };
    const onChange = () => schedule(200);
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button === 0) mouseDownRef.current = true;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      mouseDownRef.current = false;
      schedule(10);
    };
    document.addEventListener("selectionchange", onChange);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
    };
  }, [readSelection]);

  const floatingOpen = Boolean(menu || popover);
  useEffect(() => {
    if (!floatingOpen) return;
    const close = () => {
      setMenu(null);
      setPopover(null);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || popoverRef.current?.contains(target))) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.getSelection()?.removeAllRanges();
      close();
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [floatingOpen]);

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

  const onTouchStart = (event: ReactTouchEvent) => {
    const touch = event.touches[0];
    touchRef.current =
      event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY, t: Date.now() } : null;
  };
  const onTouchMove = (event: ReactTouchEvent) => {
    if (event.touches.length > 1) touchRef.current = null; // pinch, not a swipe
  };
  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || Date.now() - start.t > 700) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth + 2) return; // zoomed in: the swipe pans instead
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // adjusting a text selection
    turn(dx < 0 ? 1 : -1);
  };

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
            <Floating
              key="selection"
              anchor={menu.anchor}
              preferBelow={coarsePointer()}
              containerRef={menuRef}
              label="Selection actions"
              animate={animate}
            >
              <div
                className="glass flex h-11 items-center gap-0.5 rounded-full p-1 shadow-[var(--shadow-float)]"
                onPointerDown={() => (toolbarPressRef.current = Date.now())}
              >
                <motion.button
                  type="button"
                  aria-label="Ask tutor about the selection"
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={askTutor}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,var(--color-aura-violet),var(--color-aura-blue))] px-3.5 text-sm font-medium text-white shadow-[0_8px_24px_-10px_rgba(139,92,246,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] transition-[filter] hover:brightness-110"
                >
                  <Sparkles className="size-4" aria-hidden />
                  Ask tutor
                </motion.button>
                <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />
                <ToolbarButton
                  label="Highlight"
                  onClick={() => annotate("highlight")}
                  icon={<Highlighter className="size-4" style={{ color: HIGHLIGHT_COLOR }} aria-hidden />}
                />
                <ToolbarButton
                  label="Underline"
                  onClick={() => annotate("underline")}
                  icon={<Underline className="size-4" style={{ color: UNDERLINE_COLOR }} aria-hidden />}
                />
                <ToolbarButton
                  label="Copy"
                  onClick={() => void copySelection()}
                  icon={<Copy className="size-4" aria-hidden />}
                />
              </div>
            </Floating>
          )}
          {popover && (
            <Floating
              key={`note-${popover.annotation.id}`}
              anchor={popover.anchor}
              preferBelow={false}
              containerRef={popoverRef}
              label="Annotation actions"
              animate={animate}
            >
              <div className="glass flex h-11 max-w-[min(20rem,calc(100vw-1rem))] items-center gap-2 rounded-full py-1 pr-1 pl-3.5 shadow-[var(--shadow-float)]">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: popover.annotation.color }}
                />
                <span className="min-w-0 truncate text-xs text-fog-400">
                  {popover.annotation.text || (popover.annotation.kind === "underline" ? "Underline" : "Highlight")}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  autoFocus
                  aria-label={`Remove ${popover.annotation.kind === "underline" ? "underline" : "highlight"}`}
                  className="shrink-0"
                  onClick={() => {
                    remove.mutate(popover.annotation.id);
                    setPopover(null);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </Button>
              </div>
            </Floating>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

// ------------------------------------------------------------- annotations

function useAnnotationMutations(documentId: string) {
  const client = useQueryClient();
  const key = keys.annotations(documentId);

  const create = useMutation({
    mutationFn: (input: NewAnnotation) =>
      api<Annotation>(`/documents/${documentId}/annotations`, { method: "POST", json: input }),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: key });
      const optimistic: Annotation = {
        ...input,
        id: `${PENDING_PREFIX}${Date.now()}`,
        documentId,
        createdAt: Date.now(),
      };
      client.setQueryData<Annotation[]>(key, (list) => [...(list ?? []), optimistic]);
      return { optimisticId: optimistic.id };
    },
    onError: (_error, input, context) => {
      client.setQueryData<Annotation[]>(key, (list) => list?.filter((item) => item.id !== context?.optimisticId));
      toast(`Couldn't save that ${input.kind}. Please try again.`, "error");
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/annotations/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: key });
      const removed = client.getQueryData<Annotation[]>(key)?.find((item) => item.id === id);
      client.setQueryData<Annotation[]>(key, (list) => list?.filter((item) => item.id !== id));
      return { removed };
    },
    onError: (_error, _id, context) => {
      const removed = context?.removed;
      if (removed) client.setQueryData<Annotation[]>(key, (list) => [...(list ?? []), removed]);
      toast("Couldn't remove that annotation. Please try again.", "error");
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });

  return { create, remove };
}

function AnnotationMarks({
  items,
  onOpen,
}: {
  items: Annotation[];
  onOpen: (annotation: Annotation, anchor: Anchor) => void;
}) {
  if (!items.length) return null;
  // No z-index on the wrapper: each mark must blend (multiply) with the canvas underneath.
  return (
    <div className="pointer-events-none absolute inset-0">
      {items.map((annotation) => {
        const pending = annotation.id.startsWith(PENDING_PREFIX);
        const underline = annotation.kind === "underline";
        const label = `${underline ? "Underlined" : "Highlighted"}: ${annotation.text.slice(0, 80)}`;
        return annotation.rects.map((rect, index) => {
          const first = index === 0;
          const position: CSSProperties = {
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          };
          return (
            <div
              key={`${annotation.id}-${index}`}
              role={first ? "button" : undefined}
              tabIndex={first && !pending ? 0 : -1}
              aria-label={first ? label : undefined}
              aria-hidden={first ? undefined : true}
              onClick={(event) => {
                if (!pending)
                  onOpen(annotation, { x: event.clientX, top: event.clientY - 6, bottom: event.clientY + 6 });
              }}
              onKeyDown={(event) => {
                if (pending || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                const box = event.currentTarget.getBoundingClientRect();
                onOpen(annotation, { x: box.left + box.width / 2, top: box.top, bottom: box.bottom });
              }}
              className={cx(
                "pointer-events-auto absolute z-[4] cursor-pointer transition-opacity duration-200",
                underline ? "hover:bg-black/[0.04]" : "rounded-[2px] opacity-40 mix-blend-multiply hover:opacity-60",
                pending && "animate-pulse",
              )}
              style={
                underline
                  ? { ...position, borderBottom: `2px solid ${annotation.color}` }
                  : { ...position, backgroundColor: annotation.color }
              }
            />
          );
        });
      })}
    </div>
  );
}

// ------------------------------------------------------------ floating UI

function Floating({
  anchor,
  preferBelow,
  containerRef,
  label,
  animate,
  children,
}: {
  anchor: Anchor;
  preferBelow: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  label: string;
  animate: boolean;
  children: ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 44 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  });

  const gap = 10;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fitsAbove = anchor.top - size.height - gap >= margin;
  const fitsBelow = anchor.bottom + size.height + gap <= vh - margin;
  const below = preferBelow ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;
  const top = below
    ? Math.min(vh - size.height - margin, anchor.bottom + gap)
    : Math.max(margin, anchor.top - size.height - gap);
  const left = clamp(anchor.x - size.width / 2, margin, Math.max(margin, vw - size.width - margin));

  return (
    <motion.div
      ref={containerRef}
      role="toolbar"
      aria-label={label}
      className="fixed z-[90]"
      style={{ left, top, transformOrigin: below ? "50% 0%" : "50% 100%" }}
      initial={animate ? { opacity: 0, scale: 0.86, y: below ? -6 : 6 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        animate
          ? { opacity: 0, scale: 0.92, transition: { duration: 0.12 } }
          : { opacity: 0, transition: { duration: 0 } }
      }
      transition={spring}
      // Keep the text selection alive while clicking toolbar buttons.
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </motion.div>
  );
}

function ToolbarButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      onClick={onClick}
      className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm text-fog-200 transition-colors hover:bg-white/8 hover:text-white"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

// ---------------------------------------------------------------- controls

function ControlPill({
  page,
  total,
  zoom,
  disabled,
  animate,
  onPage,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  page: number;
  total: number;
  zoom: number;
  disabled: boolean;
  animate: boolean;
  onPage: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <motion.div
        role="toolbar"
        aria-label="Page controls"
        initial={animate ? { opacity: 0, y: 24, scale: 0.96 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={softSpring}
        className="glass pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full p-1 shadow-[var(--shadow-float)]"
      >
        <IconButton label="Previous page" size={36} disabled={disabled || page <= 1} onClick={onPrev}>
          <ChevronLeft className="size-4.5" />
        </IconButton>
        <PageField page={page} total={total} disabled={disabled} onCommit={onPage} />
        <IconButton label="Next page" size={36} disabled={disabled || (total > 0 && page >= total)} onClick={onNext}>
          <ChevronRight className="size-4.5" />
        </IconButton>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-white/10" />
        <IconButton label="Zoom out" size={36} disabled={disabled || zoom <= ZOOM_MIN} onClick={onZoomOut}>
          <ZoomOut className="size-4.5" />
        </IconButton>
        <span
          className="hidden w-11 shrink-0 text-center text-xs text-fog-400 tabular-nums sm:inline"
          aria-label={`Zoom ${Math.round(zoom * 100)} percent`}
        >
          {Math.round(zoom * 100)}%
        </span>
        <IconButton label="Zoom in" size={36} disabled={disabled || zoom >= ZOOM_MAX} onClick={onZoomIn}>
          <ZoomIn className="size-4.5" />
        </IconButton>
        <IconButton label="Fit to width" size={36} active={zoom === 1} disabled={disabled} onClick={onFit}>
          <MoveHorizontal className="size-4.5" />
        </IconButton>
      </motion.div>
    </div>
  );
}

function PageField({
  page,
  total,
  disabled,
  onCommit,
}: {
  page: number;
  total: number;
  disabled: boolean;
  onCommit: (page: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const skipCommit = useRef(false);
  const digits = Math.max(2, String(total || page).length);

  const commit = () => {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    if (draft !== null) {
      const value = Number.parseInt(draft, 10);
      if (Number.isFinite(value)) onCommit(value);
    }
    setDraft(null);
  };

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 px-1 text-sm text-fog-400 tabular-nums">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="go"
        aria-label={total ? `Page number, 1 to ${total}` : "Page number"}
        disabled={disabled}
        value={draft ?? String(page)}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          else if (event.key === "Escape") {
            skipCommit.current = true;
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        style={{ width: `calc(${digits}ch + 0.9rem)` }}
        className="h-7 rounded-lg bg-white/6 text-center text-fog-50 transition-colors outline-none hover:bg-white/9 focus:bg-white/10 focus:ring-1 focus:ring-signal/60 disabled:opacity-50"
      />
      <span aria-hidden>/</span>
      <span aria-hidden className="min-w-[2ch]">
        {total || "–"}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ state panels

function SheetSkeleton({ width, height }: { width: number; height: number }) {
  return (
    <div
      role="status"
      aria-label="Loading document"
      className="relative overflow-hidden rounded-[3px] bg-white shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.05)]"
      style={{ width, height, fontSize: Math.max(8, width / 42) }}
    >
      <div className="flex flex-col gap-[2.2%] p-[9%]">
        <div className="mb-[4%] h-[1.1em] w-1/2 rounded bg-black/[0.07]" />
        {[100, 94, 98, 72, 0, 100, 88, 96, 60].map((line, index) =>
          line ? (
            <div key={index} className="h-[0.6em] rounded bg-black/[0.055]" style={{ width: `${line}%` }} />
          ) : (
            <div key={index} className="h-[0.8em]" />
          ),
        )}
        <div className="my-[3%] aspect-[16/8] w-full rounded-md bg-black/[0.045]" />
        {[100, 92, 97, 54].map((line, index) => (
          <div key={`b${index}`} className="h-[0.6em] rounded bg-black/[0.055]" style={{ width: `${line}%` }} />
        ))}
      </div>
      <PageShimmer />
    </div>
  );
}

function PageShimmer({ height }: { height?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(0,0,0,0.05)_45%,rgba(255,255,255,0.6)_50%,rgba(0,0,0,0.05)_55%,transparent_70%)] bg-[length:200%_100%]"
      style={height ? { height } : undefined}
    />
  );
}

function PageError({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center p-6 text-center text-sm text-stone-500" style={{ height }}>
      This page couldn't be rendered.
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[var(--radius-card)] border border-white/8 bg-ink-900 px-6 py-8 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-bad/10 text-bad">
        <FileWarning className="size-5" aria-hidden />
      </div>
      <h3 className="text-base text-fog-50">This PDF didn't open</h3>
      <p className="text-sm leading-relaxed text-fog-400">
        Something interrupted the download. Check your connection and try again.
        {message && <span className="mt-2 block font-mono text-[0.7rem] break-words text-fog-500">{message}</span>}
      </p>
      <Button variant="primary" size="sm" onClick={onRetry} className="mt-1">
        <RotateCw className="size-3.5" aria-hidden />
        Try again
      </Button>
    </div>
  );
}

function DocumentStatusState({ doc }: { doc: StudyDocument }) {
  const animate = useMotion();
  const failed = doc.status === "failed";
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-ink-950 p-6">
      <motion.div
        role={failed ? "alert" : "status"}
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
        className="flex max-w-sm flex-col items-center gap-4 text-center"
      >
        <div
          className={cx(
            "relative flex size-14 items-center justify-center rounded-2xl border",
            failed ? "border-bad/25 bg-bad/10 text-bad" : "border-white/8 bg-white/[0.04] text-signal",
          )}
        >
          {!failed && (
            <span aria-hidden className="absolute inset-0 animate-breathe rounded-2xl bg-signal/10 blur-md" />
          )}
          {failed ? <FileWarning className="size-6" aria-hidden /> : <Spinner className="relative size-6" />}
        </div>
        <div>
          <h3 className="text-base text-fog-50">
            {failed ? "We couldn't read this document" : "Reading your document…"}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-fog-400">
            {failed
              ? doc.error || "Something went wrong while processing the file. Try uploading it again."
              : `Extracting text and structure from “${doc.title}”. It opens here as soon as it's ready.`}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------------- helpers

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampZoom(value: number) {
  return Math.round(clamp(value, ZOOM_MIN, ZOOM_MAX) * 100) / 100;
}

function stepZoom(current: number, dir: 1 | -1) {
  if (dir > 0) return ZOOM_STEPS.find((step) => step > current + 0.001) ?? ZOOM_MAX;
  return [...ZOOM_STEPS].reverse().find((step) => step < current - 0.001) ?? ZOOM_MIN;
}

function coarsePointer() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}

const CJK = "\\u3000-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af\\uff00-\\uffef";
const CJK_BREAK = new RegExp(`([${CJK}])\\s*\\n\\s*([${CJK}])`, "g");

/** Joins the text layer's line breaks back into prose (hyphenation, CJK without spaces). */
function cleanSelectionText(raw: string) {
  return raw
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(CJK_BREAK, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Client rects of only the selected *text*: Range.getClientRects() would also
 * return whole element boxes (including the text layer's page-sized helper).
 */
function textRects(range: Range, root: Element): DOMRect[] {
  const container = range.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) return Array.from(range.getClientRects());
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (!range.intersectsNode(text) || !root.contains(text) || !text.parentElement?.closest(".textLayer")) continue;
    const part = document.createRange();
    part.setStart(text, text === range.startContainer ? range.startOffset : 0);
    part.setEnd(text, text === range.endContainer ? range.endOffset : text.length);
    if (!part.collapsed) rects.push(...Array.from(part.getClientRects()));
  }
  return rects;
}

/** Merges per-span rects into one box per visual line (same row, touching or near). */
function mergeLines(rects: DOMRect[]): Box[] {
  const boxes = rects
    .filter((rect) => rect.width >= 1 && rect.height >= 1)
    .map((rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }))
    .sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: Box[] = [];
  for (const box of boxes) {
    const height = box.bottom - box.top;
    const line = lines.find((candidate) => {
      const lineHeight = candidate.bottom - candidate.top;
      const overlap = Math.min(candidate.bottom, box.bottom) - Math.max(candidate.top, box.top);
      const gap = Math.max(box.left - candidate.right, candidate.left - box.right);
      return overlap >= 0.5 * Math.min(height, lineHeight) && gap <= Math.max(height, lineHeight);
    });
    if (line) {
      line.left = Math.min(line.left, box.left);
      line.top = Math.min(line.top, box.top);
      line.right = Math.max(line.right, box.right);
      line.bottom = Math.max(line.bottom, box.bottom);
    } else {
      lines.push({ ...box });
    }
  }
  return lines;
}

/** Client boxes → fractions (0..1) of the rendered page box, so marks survive zoom. */
function toFractions(lines: Box[], page: DOMRect): Rect[] {
  const round = (value: number) => Math.round(value * 100000) / 100000;
  return lines
    .map((line) => {
      const x = clamp((line.left - page.left) / page.width, 0, 1);
      const y = clamp((line.top - page.top) / page.height, 0, 1);
      const right = clamp((line.right - page.left) / page.width, 0, 1);
      const bottom = clamp((line.bottom - page.top) / page.height, 0, 1);
      return { x: round(x), y: round(y), width: round(right - x), height: round(bottom - y) };
    })
    .filter((rect) => rect.width > 0.001 && rect.height > 0.001);
}
