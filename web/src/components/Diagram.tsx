/**
 * Mermaid diagrams with the Tutor treatment: they draw themselves in, fit the
 * space they're given (re-flowing a tall flowchart sideways when that reads
 * better), spotlight one node at a time with a smooth camera move, and can
 * narrate a guided walk-through that highlights each node as it's spoken.
 *
 * Variants:
 *  - compact: chat. A bounded-height card on a dotted canvas; click to expand.
 *  - card:    notebooks and study guides (paper theme), roomier.
 *  - stage:   voice mode. Large, no chrome; the voice tour drives the focus.
 */
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Pause, Play, Workflow } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DiagramStep } from "@shared/types";
import { api } from "@/lib/api";
import {
  findNode,
  flowDirection,
  polishSvg,
  prepareDrawIn,
  renderMermaid,
  svgSize,
  withDirection,
  type DiagramTheme,
} from "@/lib/mermaid";
import { speak, stopSpeaking } from "@/lib/speaker";
import { useApp, useMotion } from "@/store/app";
import { IconButton, Modal, Spinner, cx } from "./ui";

export type DiagramVariant = "compact" | "card" | "stage";

type Fit = {
  /** Tallest the diagram may be, in px. */
  maxHeight: number;
  /** Largest upscale for small diagrams (1 = never enlarge). */
  maxScale: number;
  /** Try the other flowchart direction when it fits the box noticeably better. */
  reorient?: boolean;
  compact?: boolean;
};

const FITS: Record<DiagramVariant, Fit> = {
  compact: { maxHeight: 250, maxScale: 1, reorient: true, compact: true },
  card: { maxHeight: 420, maxScale: 1.15, reorient: true },
  stage: { maxHeight: 460, maxScale: 1.8, reorient: true },
};

/** Scale at which a w×h drawing fits the box. */
const fitScale = (size: { width: number; height: number }, width: number, fit: Fit) =>
  Math.min(fit.maxScale, width / size.width, fit.maxHeight / size.height);

/** Is layout `a` a better fit than `b`? Larger text wins; near-ties go to the shorter drawing. */
function betterFit(a: { width: number; height: number }, b: { width: number; height: number }, width: number, fit: Fit) {
  const scaleA = fitScale(a, width, fit);
  const scaleB = fitScale(b, width, fit);
  if (scaleA > scaleB * 1.15) return true;
  return scaleA >= scaleB * 0.92 && scaleA >= 0.75 && a.height * scaleA < b.height * scaleB * 0.8;
}

export function MermaidView({
  source,
  theme = "light",
  activeNode,
  className,
  fit,
  onRendered,
}: {
  source: string;
  theme?: DiagramTheme;
  activeNode?: string | null;
  className?: string;
  fit: Fit;
  onRendered?: (info: { nodes: number }) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseBox = useRef<[number, number, number, number] | null>(null);
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; error?: string }>({ status: "loading" });
  const motionOn = useMotion();
  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;
  const fitRef = useRef(fit);
  fitRef.current = fit;

  /** Sizes the SVG to fit the frame's current width (called on render and resize). */
  const applyFit = useCallback(() => {
    const svg = svgRef.current;
    const box = baseBox.current;
    const width = frameRef.current?.clientWidth ?? 0;
    if (!svg || !box || !width) return;
    const scale = fitScale({ width: box[2], height: box[3] }, width, fitRef.current);
    svg.setAttribute("width", String(Math.round(box[2] * scale)));
    svg.setAttribute("height", String(Math.round(box[3] * scale)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const timer = window.setTimeout(async () => {
      const current = fitRef.current;
      const width = frameRef.current?.clientWidth || 360;
      let result = await renderMermaid(source, theme, { compact: current.compact });
      // A tall flowchart in a wide, short box (or the reverse) often reads better re-flowed.
      const direction = "svg" in result ? flowDirection(source) : null;
      if (current.reorient && direction && "svg" in result) {
        const size = svgSize(result.svg);
        const tall = size && current.compact && !/LR|RL/.test(direction) && size.height * fitScale(size, width, current) > 170;
        if (size && (fitScale(size, width, current) < 0.8 || tall)) {
          const alt = await renderMermaid(withDirection(source, /LR|RL/.test(direction) ? "TD" : "LR"), theme, {
            compact: current.compact,
          });
          const altSize = "svg" in alt ? svgSize(alt.svg) : null;
          if (altSize && betterFit(altSize, size, width, current)) result = alt;
        }
      }
      if (cancelled || !hostRef.current) return;
      if ("error" in result) {
        setState({ status: "error", error: result.error });
        return;
      }
      hostRef.current.innerHTML = result.svg;
      const svg = hostRef.current.querySelector("svg");
      if (!svg) return;
      svg.removeAttribute("style");
      const box = svg
        .getAttribute("viewBox")
        ?.split(/[\s,]+/)
        .map(Number);
      baseBox.current = box && box.length === 4 ? (box as [number, number, number, number]) : null;
      svgRef.current = svg;
      polishSvg(svg);
      applyFit();
      if (motionOn) prepareDrawIn(svg);
      onRenderedRef.current?.({ nodes: svg.querySelectorAll("g.node").length });
      setState({ status: "ready" });
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, theme, motionOn, applyFit]);

  // Re-fit (not re-render) when the column is resized.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => applyFit());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [applyFit]);

  // Spotlight + camera: animate the viewBox towards the active node.
  useEffect(() => {
    const svg = svgRef.current;
    const host = hostRef.current;
    if (!svg || !host || state.status !== "ready") return;
    svg.querySelectorAll("[data-active]").forEach((node) => node.removeAttribute("data-active"));
    const base = baseBox.current;
    const node = activeNode ? findNode(svg, activeNode) : null;
    host.dataset.touring = node ? "true" : "false";
    if (!base) return;
    let target = base;
    if (node) {
      node.setAttribute("data-active", "true");
      try {
        // Map the node's local box into root viewBox units (robust to nested transforms).
        const bbox = node.getBBox();
        const toRoot = svg.getScreenCTM()!.inverse().multiply(node.getScreenCTM()!);
        const a = new DOMPoint(bbox.x, bbox.y).matrixTransform(toRoot);
        const b = new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(toRoot);
        const nodeX = Math.min(a.x, b.x);
        const nodeY = Math.min(a.y, b.y);
        const nodeWidth = Math.abs(b.x - a.x);
        const nodeHeight = Math.abs(b.y - a.y);
        // Zoom keeps the base aspect ratio so the element never resizes mid-tour.
        const scale = Math.min(1, Math.max(0.45, (nodeWidth * 3) / base[2], (nodeHeight * 3.5) / base[3]));
        const width = base[2] * scale;
        const height = base[3] * scale;
        const tx = Math.min(Math.max(base[0], nodeX + nodeWidth / 2 - width / 2), base[0] + base[2] - width);
        const ty = Math.min(Math.max(base[1], nodeY + nodeHeight / 2 - height / 2), base[1] + base[3] - height);
        target = [tx, ty, width, height];
      } catch {
        target = base;
      }
    }
    const from = (svg.getAttribute("viewBox") ?? base.join(" ")).split(/[\s,]+/).map(Number);
    if (!motionOn) {
      svg.setAttribute("viewBox", target.join(" "));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      svg.setAttribute("viewBox", from.map((value, index) => value + (target[index] - value) * eased).join(" "));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeNode, state.status, motionOn]);

  return (
    <div ref={frameRef} className={cx("relative w-full", className)}>
      <div ref={hostRef} data-theme={theme} className="mermaid-host flex justify-center" />
      {state.status === "loading" && <DiagramSkeleton tone={theme === "dark" ? "dark" : "light"} />}
      {state.status === "error" && (
        <details className="rounded-xl border border-current/15 p-3 text-xs opacity-80">
          <summary className="cursor-pointer">This diagram couldn't be drawn ({state.error}). Show source</summary>
          <pre className="mt-2 overflow-x-auto font-mono whitespace-pre-wrap">{source}</pre>
        </details>
      )}
    </div>
  );
}

/** Placeholder while a diagram streams in or renders: three nodes being sketched. */
export function DiagramSkeleton({ tone = "light", label }: { tone?: "light" | "dark"; label?: string }) {
  const dark = tone === "dark";
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6" role="status" aria-label={label ?? "Drawing diagram"}>
      <div className="flex items-center">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <span className={cx("h-px w-7 sm:w-10", dark ? "bg-white/15" : "bg-stone-300")}>
                <span
                  className="block h-full origin-left animate-[sketch-line_1.6s_ease-in-out_infinite] bg-signal/70"
                  style={{ animationDelay: `${index * 0.25}s` }}
                />
              </span>
            )}
            <span
              className={cx(
                "h-8 w-14 animate-pulse rounded-[9px] ring-1 sm:w-16",
                dark ? "bg-white/5 ring-white/12" : "bg-white ring-stone-300",
              )}
              style={{ animationDelay: `${index * 0.2}s` }}
            />
          </div>
        ))}
      </div>
      {label && <span className={cx("shimmer-text text-xs", dark ? "text-fog-400" : "text-stone-500")}>{label}</span>}
    </div>
  );
}

function useTour(source: string, steps: DiagramStep[] | undefined, context: string | undefined) {
  const language = useApp((state) => state.language);
  const [tour, setTour] = useState<{ steps: DiagramStep[]; index: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const runId = useRef(0);

  const stop = useCallback(() => {
    runId.current += 1;
    stopSpeaking();
    setTour(null);
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    const id = ++runId.current;
    let tourSteps = steps;
    if (!tourSteps?.length) {
      setLoading(true);
      try {
        tourSteps = (
          await api<{ steps: DiagramStep[] }>("/diagram/tour", {
            method: "POST",
            json: { mermaid: source, context, language },
          })
        ).steps;
      } catch {
        tourSteps = [];
      } finally {
        setLoading(false);
      }
    }
    if (!tourSteps.length || id !== runId.current) return;
    for (let index = 0; index < tourSteps.length; index += 1) {
      if (id !== runId.current) return;
      setTour({ steps: tourSteps, index });
      await speak(tourSteps[index].say, language);
    }
    if (id === runId.current) setTour(null);
  }, [steps, source, context, language]);

  return { tour, loading, start, stop, current: tour ? tour.steps[tour.index] : null };
}

/** Diagram card with a narrated walk-through, used in chat, notebooks and voice. */
export function Diagram({
  source,
  theme = "light",
  variant = theme === "light" ? "compact" : theme === "dark" ? "stage" : "card",
  activeNode,
  steps,
  title,
  caption,
  controls = true,
  context,
  className,
}: {
  source: string;
  theme?: DiagramTheme;
  variant?: DiagramVariant;
  /** Node to spotlight (driven externally, e.g. by the voice tour). */
  activeNode?: string | null;
  /** Pre-computed tour steps (voice background results include them). */
  steps?: DiagramStep[];
  title?: string;
  caption?: string;
  /** Show the walk-through / expand controls. */
  controls?: boolean;
  /** Surrounding explanation, improves generated tour narration. */
  context?: string;
  className?: string;
}) {
  const { tour, loading, start, stop, current } = useTour(source, steps, context);
  const [expanded, setExpanded] = useState(false);
  const [nodes, setNodes] = useState(0);
  const focus = current?.node ?? activeNode;
  const dark = theme === "dark";
  const compact = variant === "compact";

  if (variant === "stage") {
    return (
      <figure className={cx("w-full", className)}>
        {title && (
          <figcaption className="mb-3 flex items-center gap-2 text-xs tracking-wide text-fog-300 uppercase">
            <Workflow className="size-3.5 text-signal" /> {title}
          </figcaption>
        )}
        <MermaidView source={source} theme={theme} activeNode={focus} fit={FITS.stage} />
      </figure>
    );
  }

  return (
    <figure
      className={cx(
        "group/diagram relative my-3 overflow-hidden rounded-2xl",
        theme === "paper" ? "paper-card" : dark ? "bg-white/[0.03] ring-1 ring-white/8" : "bg-white ring-1 ring-stone-200/90",
        compact && "shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.18)]",
        className,
      )}
    >
      <div
        className={cx(
          "flex items-center gap-2 px-3 py-2",
          dark ? "text-fog-200" : "text-stone-600",
          compact && "border-b border-stone-100",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-signal ring-1 ring-orange-100">
          <Workflow className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.78rem] font-medium">{title || "Diagram"}</span>
        {nodes > 0 && (
          <span className="shrink-0 text-[0.68rem] text-stone-400 tabular-nums">
            {nodes} {nodes === 1 ? "step" : "steps"}
          </span>
        )}
        {controls && (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={tour ? stop : start}
              aria-label={tour ? "Stop walk-through" : "Walk me through this diagram"}
              className={cx(
                "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.72rem] font-medium transition-colors",
                tour
                  ? "bg-signal text-white"
                  : dark
                    ? "bg-white/8 text-fog-100 hover:bg-white/14"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200",
              )}
            >
              {loading ? (
                <Spinner className="size-3" />
              ) : tour ? (
                <Pause className="size-3 fill-current" />
              ) : (
                <Play className="size-3 fill-current" />
              )}
              {tour ? `${tour.index + 1}/${tour.steps.length}` : "Walk me through"}
            </motion.button>
            <IconButton
              label="Expand diagram"
              size={28}
              tone={dark ? "dark" : "light"}
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="size-3.5" />
            </IconButton>
          </>
        )}
      </div>
      <div
        className={cx("relative px-3 py-3", compact && "diagram-canvas cursor-zoom-in")}
        onClick={compact && controls ? () => setExpanded(true) : undefined}
      >
        <MermaidView
          source={source}
          theme={theme}
          activeNode={focus}
          fit={FITS[variant]}
          onRendered={({ nodes: count }) => setNodes(count)}
        />
      </div>
      <AnimatePresence>
        {current && tour && (
          <motion.figcaption
            key={tour.index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cx(
              "flex gap-2.5 border-t px-3 py-2.5 text-[0.82rem] leading-relaxed",
              dark ? "border-white/8 text-fog-50" : "border-orange-100 bg-orange-50/70 text-stone-800",
            )}
          >
            <span className="mt-1 flex shrink-0 gap-0.5" aria-hidden>
              {tour.steps.map((_, index) => (
                <span
                  key={index}
                  className={cx(
                    "h-1 rounded-full transition-all",
                    index === tour.index ? "w-3 bg-signal" : "w-1 bg-stone-300",
                  )}
                />
              ))}
            </span>
            <span>{current.say}</span>
          </motion.figcaption>
        )}
      </AnimatePresence>
      {caption && !current && (
        <figcaption className={cx("px-3 pb-2.5 text-xs", dark ? "text-fog-400" : "text-stone-500")}>{caption}</figcaption>
      )}
      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={title || "Diagram"}
        width={1100}
        tone={theme === "paper" ? "paper" : "dark"}
      >
        <MermaidView
          source={source}
          theme={theme === "light" ? "dark" : theme}
          activeNode={focus}
          fit={{ maxHeight: Math.round((typeof window === "undefined" ? 900 : window.innerHeight) * 0.7), maxScale: 1.6, reorient: true }}
        />
      </Modal>
    </figure>
  );
}
