/**
 * The magic pen: a dark glass whiteboard where the tutor's working appears
 * line by line, written by a glowing nib in step with the narration (a line
 * is written as the tutor starts explaining it). Equations render with KaTeX,
 * notes in a handwritten face, graphs are drawn by the pen, and the final
 * answer gets a hand-drawn ring. Without narration (typed replies, muted
 * audio) the pen keeps a steady rhythm on its own.
 */
import katex from "katex";
import { AnimatePresence, animate as animateValue, motion, useMotionValue } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Board, BoardItem, BoardPlot } from "@shared/voice";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";
import { Nib } from "./ink";
import { formatTick, plotGeometry } from "./plot";

const PEN_EASE = [0.42, 0.02, 0.28, 1] as const;
const CURVE_COLORS = ["#67e8f9", "#ff9a4d", "#c4b5fd"];

/** Reveals its content left to right behind the nib, like ink leaving a pen. */
function Ink({ children, animate, onDone }: { children: ReactNode; animate: boolean; onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useLayoutEffect(() => {
    if (!animate) return;
    const width = ref.current?.getBoundingClientRect().width ?? 320;
    setDuration(Math.min(2.6, Math.max(0.65, width / 300)));
  }, [animate]);
  useEffect(() => {
    if (!animate) done.current?.();
  }, [animate]);
  if (!animate) return <div className="w-fit max-w-full">{children}</div>;
  return (
    <div className="relative w-fit max-w-full">
      {duration === null ? (
        <div ref={ref} style={{ clipPath: "inset(0 100% 0 0)" }}>
          {children}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ clipPath: "inset(-40% 100% -40% -3%)" }}
            animate={{ clipPath: "inset(-40% -3% -40% -3%)" }}
            transition={{ duration, ease: PEN_EASE }}
            onAnimationComplete={() => done.current?.()}
          >
            {children}
          </motion.div>
          <motion.span
            className="pen-track"
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
            transition={{
              left: { duration, ease: PEN_EASE },
              opacity: { duration: duration + 0.35, times: [0, 0.06, 0.86, 1] },
            }}
          >
            <Nib />
          </motion.span>
        </>
      )}
    </div>
  );
}

function MathLine({ latex }: { latex: string }) {
  const html = useMemo(
    () => katex.renderToString(latex, { displayMode: true, throwOnError: false, strict: false, output: "html" }),
    [latex],
  );
  return <div className="board-math" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A hand-drawn loop around the final answer. */
function DrawnRing({ animate }: { animate: boolean }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -inset-x-5 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+2.5rem)] overflow-visible"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M9,21 C6,9 38,3 62,4.5 C86,6 97,14 95,25 C92,36 61,39 36,37.5 C14,36 3,29 9,17 C12,10 22,6.5 31,5.5"
        fill="none"
        stroke="#ff8a33"
        strokeWidth={2.2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={animate ? { pathLength: 0, opacity: 0.2 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: PEN_EASE }}
        style={{ filter: "drop-shadow(0 0 6px rgba(255,110,0,0.55))" }}
      />
    </svg>
  );
}

function MarginNote({ text, animate }: { text: string; animate: boolean }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, x: -6 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-2 hidden shrink-0 items-center gap-1.5 self-center sm:flex"
    >
      <svg aria-hidden viewBox="0 0 36 16" width="36" height="16" className="overflow-visible">
        <motion.path
          d="M34,9 C24,3 13,3 3,8 M3,8 L9,3.5 M3,8 L9.5,11.5"
          fill="none"
          stroke="#67e8f9"
          strokeWidth={1.6}
          strokeLinecap="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <span className="font-hand text-[1.35rem] leading-none text-[#8be9fb]">{text}</span>
    </motion.div>
  );
}

/** Places point labels so close neighbours alternate above and below instead of overlapping. */
function spreadLabels(points: Array<{ px: number; py: number; label?: string }>) {
  const order = [...points.keys()].sort((a, b) => points[a].px - points[b].px);
  const placed = new Map<number, { lx: number; ly: number }>();
  let previous: { px: number; below: boolean } | null = null;
  for (const index of order) {
    const point = points[index];
    const below: boolean = previous !== null && point.px - previous.px < 64 ? !previous.below : false;
    placed.set(index, { lx: point.px, ly: below ? point.py + 26 : point.py - 12 });
    previous = { px: point.px, below };
  }
  return points.map((point, index) => ({ ...point, ...placed.get(index)! }));
}

/** A graph drawn by the pen: axes first, then each curve, then the marked points. */
function PlotLine({
  plot,
  caption,
  animate,
  onDone,
}: {
  plot: BoardPlot;
  caption?: string;
  animate: boolean;
  onDone: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const firstPath = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const nibX = useMotionValue(0);
  const nibY = useMotionValue(0);
  const [drawing, setDrawing] = useState(animate);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => setWidth(Math.min(560, Math.max(240, element.clientWidth)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const height = width < 400 ? 200 : 250;
  const geometry = useMemo(() => (width ? plotGeometry(plot, width, height) : null), [plot, width, height]);

  // The nib rides along the first curve while it is drawn.
  useEffect(() => {
    if (!geometry) return;
    if (!animate) {
      onDone();
      return;
    }
    const path = firstPath.current;
    const length = path?.getTotalLength?.() ?? 0;
    const progress = animateValue(0, 1, {
      duration: 1.9,
      delay: 0.55,
      ease: PEN_EASE,
      onUpdate: (value) => {
        if (!path || !length) return;
        const point = path.getPointAtLength(value * length);
        nibX.set(point.x);
        nibY.set(point.y);
      },
      onComplete: () => {
        setDrawing(false);
        onDone();
      },
    });
    return () => progress.stop();
    // Runs once per drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(geometry)]);

  const draw = (delay: number, duration: number) =>
    animate
      ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay, duration, ease: PEN_EASE } }
      : {};

  return (
    <figure ref={frame} className="w-full max-w-[560px]">
      {geometry && (
        <div className="relative" style={{ width: geometry.width, height: geometry.height }}>
          <svg
            width={geometry.width}
            height={geometry.height}
            className="overflow-visible"
            role="img"
            aria-label={`Graph of ${plot.fns.join(", ")}`}
          >
            <defs>
              <clipPath id={`plot-clip-${plot.fns.join("").length}-${geometry.width}`}>
                <rect x={28} y={20} width={geometry.width - 56} height={geometry.height - 40} />
              </clipPath>
            </defs>
            {geometry.xTicks.map((tick) => (
              <g key={`x${tick.value}`} opacity={0.5}>
                <line x1={tick.px} x2={tick.px} y1={28} y2={geometry.height - 28} stroke="rgba(255,255,255,0.06)" />
                <text
                  x={tick.px}
                  y={(geometry.xAxis ?? geometry.height - 28) + 16}
                  textAnchor="middle"
                  className="board-tick"
                >
                  {tick.value === 0 && geometry.yAxis !== null ? "" : formatTick(tick.value)}
                </text>
              </g>
            ))}
            {geometry.yTicks.map((tick) => (
              <g key={`y${tick.value}`} opacity={0.5}>
                <line x1={28} x2={geometry.width - 28} y1={tick.px} y2={tick.px} stroke="rgba(255,255,255,0.06)" />
                <text x={(geometry.yAxis ?? 28) - 7} y={tick.px + 4} textAnchor="end" className="board-tick">
                  {tick.value === 0 ? "" : formatTick(tick.value)}
                </text>
              </g>
            ))}
            {geometry.xAxis !== null && (
              <motion.path
                d={`M20,${geometry.xAxis} L${geometry.width - 16},${geometry.xAxis}`}
                stroke="#e9e5dc"
                strokeWidth={1.6}
                strokeLinecap="round"
                fill="none"
                {...draw(0, 0.45)}
              />
            )}
            {geometry.yAxis !== null && (
              <motion.path
                d={`M${geometry.yAxis},${geometry.height - 16} L${geometry.yAxis},14`}
                stroke="#e9e5dc"
                strokeWidth={1.6}
                strokeLinecap="round"
                fill="none"
                {...draw(0.15, 0.45)}
              />
            )}
            <g clipPath={`url(#plot-clip-${plot.fns.join("").length}-${geometry.width})`}>
              {geometry.paths.map((d, index) => (
                <g key={index}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={CURVE_COLORS[index % 3]}
                    strokeWidth={6}
                    opacity={0.22}
                    style={{ filter: "blur(3px)" }}
                    {...draw(0.55, 1.9)}
                  />
                  <motion.path
                    ref={index === 0 ? firstPath : undefined}
                    d={d}
                    fill="none"
                    stroke={CURVE_COLORS[index % 3]}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...draw(0.55, 1.9)}
                  />
                </g>
              ))}
            </g>
            {spreadLabels(geometry.points).map((point, index) => (
              <motion.g
                key={index}
                initial={animate ? { opacity: 0, scale: 0 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: animate ? 2.5 + index * 0.25 : 0, type: "spring", stiffness: 380, damping: 18 }}
                style={{ transformOrigin: `${point.px}px ${point.py}px` }}
              >
                <circle cx={point.px} cy={point.py} r={5} fill="#ff8a33" stroke="#fff" strokeWidth={1.5} />
                {point.label && (
                  <text x={point.lx} y={point.ly} textAnchor="middle" className="board-point">
                    {point.label}
                  </text>
                )}
              </motion.g>
            ))}
          </svg>
          {drawing && <Nib className="absolute" style={{ left: nibX, top: nibY }} />}
        </div>
      )}
      {caption && <figcaption className="mt-1 font-hand text-[1.4rem] text-[#d9d4c8]">{caption}</figcaption>}
    </figure>
  );
}

function BoardLine({
  item,
  animate,
  focused,
  dim,
}: {
  item: BoardItem;
  animate: boolean;
  focused: boolean;
  dim: boolean;
}) {
  const [done, setDone] = useState(!animate);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest", behavior: animate ? "smooth" : "auto" });
    // Once, when the line appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [focused]);
  return (
    <motion.li
      ref={ref}
      data-line={item.id}
      layout="position"
      animate={{ opacity: dim ? 0.5 : 1 }}
      transition={{ duration: 0.35 }}
      className="relative flex items-start gap-5"
    >
      <AnimatePresence>
        {focused && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            className="board-focus"
          />
        )}
      </AnimatePresence>
      <div
        className={cx(
          "scroll-quiet relative -mx-6 -my-3 max-w-[calc(100%+3rem)] min-w-0 overflow-x-auto px-6 py-3",
          item.kind === "plot" && "flex-1",
        )}
      >
        {item.kind === "plot" && item.plot ? (
          <PlotLine plot={item.plot} caption={item.text} animate={animate} onDone={() => setDone(true)} />
        ) : (
          <div className="relative w-fit max-w-full">
            <Ink animate={animate} onDone={() => setDone(true)}>
              {item.kind === "math" ? (
                <MathLine latex={item.latex ?? ""} />
              ) : (
                <p className="font-hand text-[1.75rem] leading-tight text-[#ece8df] sm:text-[1.95rem]">{item.text}</p>
              )}
            </Ink>
            {item.box && done && <DrawnRing animate={animate} />}
          </div>
        )}
      </div>
      {item.note && done && <MarginNote text={item.note} animate={animate} />}
    </motion.li>
  );
}

export default function StageBoard({
  board,
  focus,
  instant,
}: {
  board: Board;
  focus: string | null;
  instant: boolean;
}) {
  const motionOn = useMotion();
  const [run, setRun] = useState(0);
  const animate = motionOn && (!instant || run > 0);
  const [revealed, setRevealed] = useState(animate ? 0 : board.items.length);
  const [auto, setAuto] = useState(false);
  const sawFocus = useRef(false);

  // Narration drives the pen: the line being explained is the line being written.
  useEffect(() => {
    if (!focus) {
      if (sawFocus.current) setRevealed(board.items.length);
      return;
    }
    const index = board.items.findIndex((item) => item.id === focus);
    if (index < 0) return;
    sawFocus.current = true;
    setRevealed((current) => Math.max(current, index + 1));
  }, [focus, board.items]);

  // No narration arriving: write on a steady rhythm instead.
  useEffect(() => {
    if (!animate) return;
    const timer = window.setTimeout(() => {
      if (!sawFocus.current) setAuto(true);
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [animate, run]);
  useEffect(() => {
    if (!auto || revealed >= board.items.length) return;
    const timer = window.setTimeout(() => setRevealed((current) => current + 1), revealed === 0 ? 400 : 2300);
    return () => window.clearTimeout(timer);
  }, [auto, revealed, board.items.length]);

  const replay = () => {
    sawFocus.current = false;
    setRevealed(0);
    setAuto(true);
    setRun((value) => value + 1);
  };

  return (
    <div className="stage-board relative overflow-hidden rounded-[1.6rem]" aria-label={`Whiteboard: ${board.title}`}>
      <div aria-hidden className="board-surface" />
      <header className="relative flex items-center gap-3 px-6 pt-5 sm:px-10 sm:pt-7">
        <Ink key={`title-${run}`} animate={animate}>
          <h3 className="font-hand text-[2rem] leading-none font-bold text-[#ffb27a] sm:text-[2.3rem]">
            {board.title}
          </h3>
        </Ink>
        <div className="flex-1" />
        <span className="font-mono text-[0.68rem] whitespace-nowrap text-fog-500 tabular-nums">
          {Math.min(revealed, board.items.length)} / {board.items.length}
        </span>
        <button
          onClick={replay}
          aria-label="Write it again"
          className="rounded-full p-1.5 text-fog-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </header>
      <div className="board-scroll scroll-quiet relative max-h-[42vh] sm:max-h-[min(58vh,560px)] overflow-y-auto px-6 pt-4 pb-7 sm:px-10">
        <ol className="space-y-4">
          {board.items.slice(0, revealed).map((item) => (
            <BoardLine
              key={`${run}-${item.id}`}
              item={item}
              animate={animate}
              focused={focus === item.id}
              dim={Boolean(focus) && focus !== item.id && board.items.some((candidate) => candidate.id === focus)}
            />
          ))}
        </ol>
        {revealed === 0 && (
          <motion.div
            className="flex items-center gap-3 py-6 font-hand text-[1.5rem] text-fog-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="relative inline-block h-6 w-6">
              <Nib className="absolute top-3 left-3" />
            </span>
            Getting ready to write…
          </motion.div>
        )}
      </div>
    </div>
  );
}
