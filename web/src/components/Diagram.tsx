/**
 * Mermaid diagram with the Tutor treatment: draws itself in, can spotlight
 * one node at a time (with a smooth camera move), and can narrate a guided
 * walk-through — highlighting each node while its explanation is spoken.
 */
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Pause, Play, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DiagramStep } from "@shared/types";
import { api } from "@/lib/api";
import { findNode, prepareDrawIn, renderMermaid, type DiagramTheme } from "@/lib/mermaid";
import { speak, stopSpeaking } from "@/lib/speaker";
import { useApp, useMotion } from "@/store/app";
import { Button, IconButton, Modal, Spinner, cx } from "./ui";

type Props = {
  source: string;
  theme?: DiagramTheme;
  /** Node to spotlight (driven externally, e.g. by the voice tour). */
  activeNode?: string | null;
  /** Pre-computed tour steps (voice background results include them). */
  steps?: DiagramStep[];
  title?: string;
  caption?: string;
  /** Show the walk-through / enlarge controls. */
  controls?: boolean;
  /** Surrounding explanation, improves generated tour narration. */
  context?: string;
  className?: string;
  maxHeight?: number;
};

export function MermaidView({
  source,
  theme = "light",
  activeNode,
  className,
  maxHeight = 520,
}: Pick<Props, "source" | "theme" | "activeNode" | "className" | "maxHeight">) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseBox = useRef<[number, number, number, number] | null>(null);
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; error?: string }>({ status: "loading" });
  const motionOn = useMotion();

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const timer = window.setTimeout(async () => {
      const result = await renderMermaid(source, theme);
      if (cancelled || !hostRef.current) return;
      if ("error" in result) {
        setState({ status: "error", error: result.error });
        return;
      }
      hostRef.current.innerHTML = result.svg;
      const svg = hostRef.current.querySelector("svg");
      if (!svg) return;
      svg.removeAttribute("height");
      // Keep the diagram's natural size (never blow a 3-node chart up to full width).
      const natural = parseFloat(svg.style.maxWidth) || Number(svg.getAttribute("viewBox")?.split(/[\s,]+/)[2]) || 0;
      svg.style.maxWidth = natural ? `min(100%, ${Math.round(natural * (theme === "dark" ? 1.8 : 1.15))}px)` : "100%";
      svg.style.maxHeight = `${maxHeight}px`;
      const box = svg
        .getAttribute("viewBox")
        ?.split(/[\s,]+/)
        .map(Number);
      baseBox.current = box && box.length === 4 ? (box as [number, number, number, number]) : null;
      svgRef.current = svg;
      if (motionOn) prepareDrawIn(svg);
      setState({ status: "ready" });
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, theme, maxHeight, motionOn]);

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
    <div className={cx("relative", className)}>
      <div ref={hostRef} className="mermaid-host flex justify-center [&_svg]:h-auto" />
      {state.status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm opacity-60">
          <Spinner /> Drawing diagram…
        </div>
      )}
      {state.status === "error" && (
        <details className="rounded-xl border border-current/15 p-3 text-xs opacity-80">
          <summary className="cursor-pointer">This diagram couldn't be drawn ({state.error}). Show source</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">{source}</pre>
        </details>
      )}
    </div>
  );
}

/** Diagram card with narrated walk-through, used in chat, notebooks and voice. */
export function Diagram({
  source,
  theme = "light",
  activeNode,
  steps,
  title,
  caption,
  controls = true,
  context,
  className,
  maxHeight,
}: Props) {
  const language = useApp((state) => state.language);
  const [tour, setTour] = useState<{ steps: DiagramStep[]; index: number } | null>(null);
  const [loadingTour, setLoadingTour] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const runId = useRef(0);

  const stopTour = useCallback(() => {
    runId.current += 1;
    stopSpeaking();
    setTour(null);
  }, []);

  useEffect(() => () => stopTour(), [stopTour]);

  const startTour = useCallback(async () => {
    const id = ++runId.current;
    let tourSteps = steps;
    if (!tourSteps?.length) {
      setLoadingTour(true);
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
        setLoadingTour(false);
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

  const dark = theme === "dark";
  const current = tour ? tour.steps[tour.index] : null;
  const body = (
    <MermaidView
      source={source}
      theme={theme}
      activeNode={current?.node ?? activeNode}
      maxHeight={enlarged ? 900 : maxHeight}
    />
  );

  return (
    <figure
      className={cx(
        "group/diagram my-2 overflow-hidden rounded-2xl",
        dark
          ? "bg-white/[0.03] ring-1 ring-white/8"
          : theme === "paper"
            ? "paper-card"
            : "bg-[#fcfbf8] ring-1 ring-black/6",
        className,
      )}
    >
      {(title || controls) && (
        <div className={cx("flex items-center gap-2 px-4 pt-3", dark ? "text-fog-200" : "text-stone-600")}>
          <Sparkles className="size-3.5 text-signal" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium tracking-wide uppercase">
            {title || "Diagram"}
          </span>
          {controls && (
            <>
              <Button
                size="sm"
                variant={dark ? "dark" : "light"}
                onClick={tour ? stopTour : startTour}
                aria-label={tour ? "Stop walk-through" : "Walk me through this diagram"}
              >
                {loadingTour ? (
                  <Spinner className="size-3.5" />
                ) : tour ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {tour ? "Stop" : "Walk me through"}
              </Button>
              <IconButton
                label="Enlarge diagram"
                size={32}
                tone={dark ? "dark" : "light"}
                onClick={() => setEnlarged(true)}
              >
                <Maximize2 className="size-3.5" />
              </IconButton>
            </>
          )}
        </div>
      )}
      <div className="px-3 py-3">{body}</div>
      <AnimatePresence>
        {current && (
          <motion.figcaption
            key={tour?.index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cx(
              "mx-3 mb-3 rounded-xl px-4 py-2.5 text-sm leading-relaxed",
              dark ? "bg-white/6 text-fog-50" : "bg-orange-50 text-stone-800",
            )}
          >
            <span className="mr-2 font-mono text-xs text-signal">
              {tour!.index + 1}/{tour!.steps.length}
            </span>
            {current.say}
          </motion.figcaption>
        )}
      </AnimatePresence>
      {caption && !current && (
        <figcaption className={cx("px-4 pb-3 text-xs", dark ? "text-fog-400" : "text-stone-500")}>{caption}</figcaption>
      )}
      <Modal
        open={enlarged}
        onClose={() => setEnlarged(false)}
        title={title || "Diagram"}
        width={1100}
        tone={theme === "paper" ? "paper" : "dark"}
      >
        <MermaidView
          source={source}
          theme={theme === "light" ? "dark" : theme}
          activeNode={current?.node ?? activeNode}
          maxHeight={900}
        />
      </Modal>
    </figure>
  );
}
