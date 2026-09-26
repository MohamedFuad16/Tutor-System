/**
 * Sizing and camera helpers shared by both diagram renderers (Tutor's own
 * flowcharts and Mermaid for everything else).
 */
import { useEffect, type RefObject } from "react";

export type Fit = {
  /** Tallest the diagram may be, in px. */
  maxHeight: number;
  /** Largest upscale for small diagrams (1 = never enlarge). */
  maxScale: number;
  /** Try the other flowchart direction when it fits the box noticeably better. */
  reorient?: boolean;
  compact?: boolean;
};

export type Box = [number, number, number, number];

/** Scale at which a w×h drawing fits the box. */
export const fitScale = (size: { width: number; height: number }, width: number, fit: Fit) =>
  Math.min(fit.maxScale, width / size.width, fit.maxHeight / size.height);

/** Is layout `a` a better fit than `b`? Larger text wins; near-ties go to the shorter drawing. */
export function betterFit(
  a: { width: number; height: number },
  b: { width: number; height: number },
  width: number,
  fit: Fit,
) {
  const scaleA = fitScale(a, width, fit);
  const scaleB = fitScale(b, width, fit);
  if (scaleA > scaleB * 1.15) return true;
  return scaleA >= scaleB * 0.92 && scaleA >= 0.75 && a.height * scaleA < b.height * scaleB * 0.8;
}

/** Where to point the camera so `node` is comfortably in view (in viewBox units). */
export function focusBox(svg: SVGSVGElement, node: SVGGraphicsElement, base: Box): Box {
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
    return [tx, ty, width, height];
  } catch {
    return base;
  }
}

/**
 * Spotlight + camera: marks the active node and eases the viewBox towards it
 * (back to the whole drawing when nothing is active).
 */
export function useViewBoxCamera(options: {
  svg: RefObject<SVGSVGElement | null>;
  host: RefObject<HTMLElement | null>;
  base: RefObject<Box | null>;
  activeNode: string | null | undefined;
  ready: boolean;
  motion: boolean;
  locate: (svg: SVGSVGElement, id: string) => SVGGraphicsElement | null;
  /** Set data-active/data-touring on the DOM (renderers that do it in React pass false). */
  mark?: boolean;
}) {
  const { svg: svgRef, host: hostRef, base: baseRef, activeNode, ready, motion, locate, mark = true } = options;
  useEffect(() => {
    const svg = svgRef.current;
    const host = hostRef.current;
    if (!svg || !host || !ready) return;
    const base = baseRef.current;
    const node = activeNode ? locate(svg, activeNode) : null;
    if (mark) {
      svg.querySelectorAll("[data-active]").forEach((element) => element.removeAttribute("data-active"));
      host.dataset.touring = node ? "true" : "false";
      if (node) node.setAttribute("data-active", "true");
    }
    if (!base) return;
    const target = node ? focusBox(svg, node, base) : base;
    const from = (svg.getAttribute("viewBox") ?? base.join(" ")).split(/[\s,]+/).map(Number);
    if (!motion) {
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
  }, [svgRef, hostRef, baseRef, activeNode, ready, motion, locate, mark]);
}
