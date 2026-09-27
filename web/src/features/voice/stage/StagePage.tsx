/**
 * A page of the learner's own document on the voice stage. The page settles
 * in like a sheet laid on a desk. The line the tutor is talking about is swept
 * with a glowing highlighter (the magic pen's nib riding its edge), the rest
 * of the page dims around it, and the view eases in so the line reads large.
 * Earlier highlights stay softly marked. Pages turn by voice or with the
 * arrows, and the reader behind the overlay follows along.
 */
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { StageView, VoiceVisual } from "@shared/voice";
import { cx } from "@/components/ui";
import { useApp, useMotion } from "@/store/app";
import { Nib } from "./ink";
import { bounds, loadDocument, locate, renderPage, type TextRun } from "./pdfPage";

type PageVisual = Extract<VoiceVisual, { kind: "page" }>;

const SWEEP_EASE = [0.42, 0.02, 0.28, 1] as const;
const LINE_SECONDS = 0.55;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function StagePage({
  visual,
  focus,
  view,
  onTurn,
}: {
  visual: PageVisual;
  /** The highlight being explained right now (H1, H2, …). */
  focus: string | null;
  view: { view: StageView; nonce: number } | null;
  /** The learner turned the page with the arrows. */
  onTurn: (page: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const motionOn = useMotion();
  const jump = useApp((state) => state.jump);
  const [page, setPage] = useState(visual.page);
  const [direction, setDirection] = useState(0);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [drawn, setDrawn] = useState<{ page: number; width: number; height: number; runs: TextRun[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Each time the focus moves, its highlight is swept again.
  const [sweep, setSweep] = useState(0);

  useEffect(() => {
    setDirection(visual.page >= page ? 1 : -1);
    setPage(visual.page);
    // The server moved the stage to another page (or another document).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visual.page, visual.documentId]);
  useEffect(() => setSweep((value) => value + 1), [focus]);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth - 32;
      const height = element.clientHeight - 32;
      if (width > 0 && height > 0) setBox({ width, height });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Render off-screen, then swap in, so a quick page turn never tears a half-drawn page.
  useEffect(() => {
    if (!box) return;
    let cancelled = false;
    const offscreen = document.createElement("canvas");
    loadDocument(visual.documentId)
      .then((doc) => renderPage(doc, page, offscreen, box))
      .then((result) => {
        const target = canvas.current;
        if (cancelled || !target) return;
        target.width = offscreen.width;
        target.height = offscreen.height;
        target.style.width = offscreen.style.width;
        target.style.height = offscreen.style.height;
        target.getContext("2d")?.drawImage(offscreen, 0, 0);
        setDrawn({ page, ...result });
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [visual.documentId, page, box]);

  useEffect(() => {
    if (!view) return;
    if (view.view === "zoom_in") setZoom((value) => Math.min(2.5, value * 1.3));
    else if (view.view === "zoom_out") setZoom((value) => Math.max(1, value / 1.3));
    else if (view.view === "reset") setZoom(1);
    // Only a new command zooms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.nonce]);

  const onPage = drawn && drawn.page === visual.page;
  const marks = useMemo(
    () =>
      onPage
        ? visual.highlights.map((highlight) => ({ ...highlight, rects: locate(drawn.runs, highlight.quote) }))
        : [],
    [onPage, drawn, visual.highlights],
  );
  const focused = marks.find((mark) => mark.id === focus) ?? null;
  const focusBox = focused ? bounds(focused.rects) : null;
  // A line the text layer can't show (scanned pages): the quote floats over the page instead.
  const floating =
    onPage && focus && (!focused || !focused.rects.length)
      ? (visual.highlights.find((highlight) => highlight.id === focus) ?? null)
      : null;

  // The camera eases in so the line being explained reads large.
  const camera = useMemo(() => {
    if (!drawn || !box || !focusBox) return { scale: zoom, x: 0, y: 0 };
    const scale =
      clamp(Math.min((box.width * 0.92) / focusBox.width, (box.height * 0.42) / focusBox.height), 1, 1.8) * zoom;
    const dx = focusBox.x + focusBox.width / 2 - drawn.width / 2;
    const dy = focusBox.y + focusBox.height / 2 - drawn.height / 2;
    // Pan toward the line, but never so far that the page leaves an empty band in the frame.
    const roomX = Math.max(0, (drawn.width * scale - box.width) / 2);
    const roomY = Math.max(0, (drawn.height * scale - box.height) / 2);
    return { scale, x: clamp(-dx * scale, -roomX, roomX), y: clamp(-dy * scale, -roomY, roomY) };
  }, [drawn, box, focusBox, zoom]);

  const turn = (next: number) => {
    const target = clamp(next, 1, visual.pageCount);
    if (target === page) return;
    setDirection(target > page ? 1 : -1);
    setPage(target);
    onTurn(target);
  };

  const spotlightId = `spot-${visual.id}`;
  const notePlace =
    focusBox && drawn && focused?.note
      ? drawn.width - (focusBox.x + focusBox.width) > 120
        ? { left: focusBox.x + focusBox.width + 14, top: focusBox.y - 6, arrow: "left" as const }
        : { left: Math.max(8, focusBox.x), top: focusBox.y + focusBox.height + 8, arrow: "up" as const }
      : null;

  return (
    <figure className="relative">
      <figcaption className="mb-2.5 flex items-center gap-2 px-1 pr-9 text-xs text-fog-300">
        <FileText className="size-3.5 shrink-0 text-signal-soft" />
        <span className="shrink-0 font-mono text-fog-500">{visual.label}</span>
        <span className="min-w-0 truncate text-fog-200">{visual.title}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={() => turn(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="rounded-full p-1 text-fog-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-mono tabular-nums">
            p. {page} / {visual.pageCount}
          </span>
          <button
            onClick={() => turn(page + 1)}
            disabled={page >= visual.pageCount}
            aria-label="Next page"
            className="rounded-full p-1 text-fog-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => jump(visual.documentId, page)}
            className="ml-1 hidden items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-fog-200 hover:bg-white/14 sm:flex"
          >
            <BookOpen className="size-3.5" /> Open in reader
          </button>
        </div>
      </figcaption>

      <div
        ref={frame}
        className="stage-page relative flex h-[46vh] items-center justify-center overflow-hidden rounded-[1.4rem] sm:h-[min(62vh,620px)]"
        style={{ perspective: 1200 }}
      >
        {/* A soft aura behind the page while the tutor is pointing at something on it. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-[12%] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.35), rgba(34,211,238,0.12) 55%, transparent 72%)",
          }}
          animate={{ opacity: focus ? 1 : 0.35 }}
          transition={{ duration: 0.8 }}
        />

        {!drawn && !failed && (
          <div
            aria-hidden
            className="absolute flex h-[82%] w-[min(60%,420px)] animate-pulse items-center justify-center rounded-md bg-[#f4f1ea]/10"
          >
            <span className="shimmer-text text-xs text-fog-400">Opening page {page}…</span>
          </div>
        )}
        {failed && (
          <p className="relative max-w-xs text-center text-sm text-fog-400">
            This page couldn't be opened here. Try "Open in reader".
          </p>
        )}

        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`${visual.documentId}-${page}`}
            className="absolute"
            custom={direction}
            initial={
              motionOn ? { opacity: 0, y: 36, rotateX: 16, scale: 0.92, x: direction * 40, filter: "blur(8px)" } : false
            }
            animate={{ opacity: drawn?.page === page ? 1 : 0, y: 0, rotateX: 0, scale: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -direction * 40, filter: "blur(6px)", transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <motion.div
              className="relative"
              animate={{ scale: camera.scale, x: camera.x, y: camera.y }}
              transition={{ type: "spring", stiffness: 70, damping: 18, mass: 1 }}
            >
              <div className="page-sheet relative overflow-hidden rounded-[4px] bg-white">
                <canvas ref={canvas} className="block" aria-label={`Page ${page} of ${visual.title}`} />
                {motionOn && drawn && <span aria-hidden className="light-sweep" />}

                {drawn && (
                  <>
                    {/* Dim the page around the line being explained. */}
                    <svg
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      width={drawn.width}
                      height={drawn.height}
                    >
                      <defs>
                        <mask id={spotlightId}>
                          <rect width={drawn.width} height={drawn.height} fill="white" />
                          {focused?.rects.map((rect, index) => (
                            <rect
                              key={index}
                              x={rect.x - 4}
                              y={rect.y - 2}
                              width={rect.width + 8}
                              height={rect.height + 4}
                              rx={4}
                              fill="black"
                            />
                          ))}
                        </mask>
                      </defs>
                      <motion.rect
                        width={drawn.width}
                        height={drawn.height}
                        fill="rgb(12,10,24)"
                        mask={`url(#${spotlightId})`}
                        animate={{ opacity: focused?.rects.length ? 0.26 : 0 }}
                        transition={{ duration: 0.6 }}
                      />
                    </svg>

                    {marks.map((mark) =>
                      mark.rects.map((rect, line) => {
                        const active = mark.id === focus;
                        return (
                          <span
                            key={`${mark.id}-${line}`}
                            data-mark={mark.id}
                            className={cx("page-mark", active && "is-focus")}
                            style={{
                              left: rect.x - 3,
                              top: rect.y - 2,
                              width: rect.width + 6,
                              height: rect.height + 4,
                            }}
                          >
                            {active && motionOn && (
                              <motion.span
                                key={sweep}
                                className="page-sweep"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: LINE_SECONDS, delay: line * LINE_SECONDS, ease: SWEEP_EASE }}
                              />
                            )}
                          </span>
                        );
                      }),
                    )}

                    {/* The nib rides the highlighter along each line in turn. */}
                    {motionOn &&
                      focused?.rects.map((rect, line) => (
                        <motion.span
                          key={`${sweep}-${line}`}
                          aria-hidden
                          className="pointer-events-none absolute"
                          style={{ top: rect.y + rect.height / 2 }}
                          initial={{ left: rect.x, opacity: 0 }}
                          animate={{ left: rect.x + rect.width, opacity: [0, 1, 1, 0] }}
                          transition={{
                            left: { duration: LINE_SECONDS, delay: line * LINE_SECONDS, ease: SWEEP_EASE },
                            opacity: {
                              duration: LINE_SECONDS + 0.2,
                              delay: line * LINE_SECONDS,
                              times: [0, 0.1, 0.8, 1],
                            },
                          }}
                        >
                          <Nib />
                        </motion.span>
                      ))}

                    {notePlace && focused?.note && (
                      <motion.span
                        key={`note-${sweep}`}
                        className="page-note"
                        style={{ left: notePlace.left, top: notePlace.top }}
                        initial={{
                          opacity: 0,
                          x: notePlace.arrow === "left" ? -6 : 0,
                          y: notePlace.arrow === "up" ? -4 : 0,
                        }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ delay: motionOn ? (focused.rects.length || 1) * LINE_SECONDS : 0 }}
                      >
                        {notePlace.arrow === "left" ? "← " : "↑ "}
                        {focused.note}
                      </motion.span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {floating && (
            <motion.blockquote
              key={floating.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="liquid-glass absolute inset-x-4 bottom-4 mx-auto max-w-xl rounded-2xl px-5 py-4 font-serif text-[1.05rem] leading-relaxed text-white"
            >
              <span className="mb-1 block font-sans text-[0.65rem] tracking-widest text-fog-400 uppercase">
                On this page
              </span>
              <mark className="page-quote">{floating.quote}</mark>
            </motion.blockquote>
          )}
        </AnimatePresence>
      </div>
    </figure>
  );
}
