/**
 * Lays out a parsed flowchart (./parse.ts) for Tutor's renderer: measures and
 * wraps labels, sizes each node for its shape, runs dagre, numbers the steps
 * in reading order and turns edge routes into smooth curves.
 */
import { Graph, layout as dagreLayout } from "@dagrejs/dagre";
import type { FlowDirection, FlowEdge, FlowGroup, FlowNode, Flowchart, NodeShape } from "./parse";

export type FlowDensity = "compact" | "regular" | "stage";

export type FlowMetrics = {
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  /** Labels wrap beyond this width. */
  maxLabelWidth: number;
  padX: number;
  padY: number;
  nodesep: number;
  ranksep: number;
  edgeFontSize: number;
};

const SANS = '"Geist Sans", ui-sans-serif, system-ui, sans-serif';
const SERIF = 'Lora, Georgia, "Times New Roman", serif';

export function flowMetrics(density: FlowDensity, serif = false): FlowMetrics {
  const base = {
    compact: { fontSize: 12.5, maxLabelWidth: 148, padX: 13, padY: 9, nodesep: 24, ranksep: 34, edgeFontSize: 10.5 },
    regular: { fontSize: 13.5, maxLabelWidth: 184, padX: 15, padY: 11, nodesep: 32, ranksep: 46, edgeFontSize: 11 },
    stage: { fontSize: 15.5, maxLabelWidth: 210, padX: 17, padY: 12, nodesep: 38, ranksep: 54, edgeFontSize: 12.5 },
  }[density];
  return { ...base, fontFamily: serif ? SERIF : SANS, fontWeight: 500, lineHeight: 1.32 };
}

export type NodeKind = "terminal" | "decision" | "step" | "data" | "io";

export type LaidNode = FlowNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  kind: NodeKind;
  /** 1-based reading order ("step 3"). */
  step: number;
};
export type LaidEdge = FlowEdge & {
  key: string;
  path: string;
  points: Array<{ x: number; y: number }>;
  /** Where the edge's label chip sits, when it has one. */
  labelBox?: { x: number; y: number; width: number; height: number; lines: string[] };
};
export type LaidGroup = FlowGroup & { x: number; y: number; width: number; height: number; depth: number };
export type FlowLayout = {
  direction: FlowDirection;
  width: number;
  height: number;
  nodes: LaidNode[];
  edges: LaidEdge[];
  groups: LaidGroup[];
  metrics: FlowMetrics;
};

// ------------------------------------------------------------------ text

let context: CanvasRenderingContext2D | null | undefined;
function measure(text: string, fontSize: number, fontFamily: string, fontWeight: number) {
  if (context === undefined) {
    try {
      context = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    } catch {
      context = null;
    }
  }
  if (context) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const width = context.measureText(text).width;
    if (width > 0) return width;
  }
  // No canvas (tests, SSR): an average glyph is a little over half the font size.
  return text.length * fontSize * 0.56;
}

/** Greedy word wrap; long words are split. At most `maxLines` lines (ellipsis beyond). */
export function wrapText(
  text: string,
  maxWidth: number,
  metrics: Pick<FlowMetrics, "fontSize" | "fontFamily" | "fontWeight">,
  maxLines = 4,
) {
  const width = (value: string) => measure(value, metrics.fontSize, metrics.fontFamily, metrics.fontWeight);
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      // A single word wider than the box: break it.
      while (width(line) > maxWidth && line.length > 4) {
        let cut = line.length - 1;
        while (cut > 1 && width(`${line.slice(0, cut)}-`) > maxWidth) cut -= 1;
        lines.push(`${line.slice(0, cut)}-`);
        line = line.slice(cut);
      }
    }
    if (line || !lines.length) lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
    return { lines: kept, width: Math.max(...kept.map(width)) };
  }
  return { lines, width: Math.max(0, ...lines.map(width)) };
}

// ------------------------------------------------------------------ nodes

const KIND: Record<NodeShape, NodeKind> = {
  box: "step",
  round: "step",
  subroutine: "step",
  flag: "step",
  hexagon: "decision",
  decision: "decision",
  stadium: "terminal",
  circle: "terminal",
  database: "data",
  io: "io",
};

/** Room each shape needs around its text. */
function nodeSize(kind: NodeKind, shape: NodeShape, textWidth: number, textHeight: number, metrics: FlowMetrics) {
  let width = textWidth + metrics.padX * 2;
  let height = textHeight + metrics.padY * 2;
  if (kind === "decision") width += height * 0.62; // pointed ends
  if (kind === "terminal") width += height * 0.35; // pill caps
  if (kind === "io") width += 14; // slant
  if (kind === "data") height += 10; // cylinder lid
  if (shape === "subroutine") width += 12;
  // Every step card carries a number badge on its corner; leave a little air for it.
  if (kind !== "terminal") width += 6;
  return { width: Math.max(width, kind === "terminal" ? 72 : 92), height: Math.max(height, 36) };
}

// ------------------------------------------------------------------ edges

/** Uniform B-spline through the route points (the same curve as d3.curveBasis). */
export function basisPath(points: Array<{ x: number; y: number }>) {
  const fmt = (value: number) => Math.round(value * 10) / 10;
  if (!points.length) return "";
  if (points.length < 3) return `M${points.map((point) => `${fmt(point.x)},${fmt(point.y)}`).join("L")}`;
  let d = `M${fmt(points[0].x)},${fmt(points[0].y)}`;
  let [x0, y0, x1, y1] = [points[0].x, points[0].y, points[0].x, points[0].y];
  const curve = (x: number, y: number) => {
    d += `C${fmt((2 * x0 + x1) / 3)},${fmt((2 * y0 + y1) / 3)} ${fmt((x0 + 2 * x1) / 3)},${fmt((y0 + 2 * y1) / 3)} ${fmt(
      (x0 + 4 * x1 + x) / 6,
    )},${fmt((y0 + 4 * y1 + y) / 6)}`;
  };
  points.slice(1).forEach((point, index) => {
    if (index === 1) d += `L${fmt((5 * x0 + x1) / 6)},${fmt((5 * y0 + y1) / 6)}`;
    if (index >= 1) curve(point.x, point.y);
    x0 = x1;
    y0 = y1;
    x1 = point.x;
    y1 = point.y;
  });
  curve(x1, y1);
  d += `L${fmt(x1)},${fmt(y1)}`;
  return d;
}

// ------------------------------------------------------------------ layout

export function layoutFlowchart(chart: Flowchart, metrics: FlowMetrics, direction = chart.direction): FlowLayout {
  const graph = new Graph({ compound: chart.groups.length > 0, multigraph: true });
  graph.setGraph({
    rankdir: direction,
    nodesep: metrics.nodesep,
    ranksep: metrics.ranksep + (chart.groups.length ? 14 : 0),
    edgesep: 14,
    marginx: 14,
    marginy: 16,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const text = new Map<string, { lines: string[]; kind: NodeKind }>();
  for (const node of chart.nodes) {
    const kind = KIND[node.shape];
    // Start/end pills read best on one line: give them more room before wrapping.
    const wrap = wrapText(node.label, metrics.maxLabelWidth * (kind === "terminal" ? 1.45 : 1), metrics);
    const lineHeight = metrics.fontSize * metrics.lineHeight;
    const size = nodeSize(kind, node.shape, wrap.width, wrap.lines.length * lineHeight, metrics);
    text.set(node.id, { lines: wrap.lines, kind });
    graph.setNode(node.id, { width: size.width, height: size.height });
  }
  for (const group of chart.groups) graph.setNode(group.id, { width: 0, height: 0 });
  if (chart.groups.length) {
    for (const group of chart.groups) if (group.parent) graph.setParent(group.id, group.parent);
    for (const node of chart.nodes) if (node.group) graph.setParent(node.id, node.group);
  }

  const edgeText = new Map<string, { lines: string[]; width: number; height: number }>();
  chart.edges.forEach((edge, index) => {
    const key = `e${index}`;
    const label: Record<string, unknown> = { minlen: 1 };
    if (edge.label) {
      const wrap = wrapText(edge.label, 120, { ...metrics, fontSize: metrics.edgeFontSize, fontWeight: 500 }, 2);
      const size = {
        lines: wrap.lines,
        width: wrap.width + 16,
        height: wrap.lines.length * metrics.edgeFontSize * 1.3 + 8,
      };
      edgeText.set(key, size);
      Object.assign(label, { width: size.width, height: size.height, labelpos: "c" });
    }
    graph.setEdge(edge.from, edge.to, label, key);
  });

  dagreLayout(graph);

  const nodes: LaidNode[] = chart.nodes.map((node) => {
    const placed = graph.node(node.id);
    const info = text.get(node.id)!;
    return {
      ...node,
      x: placed.x! - placed.width / 2,
      y: placed.y! - placed.height / 2,
      width: placed.width,
      height: placed.height,
      lines: info.lines,
      kind: info.kind,
      step: 0,
    };
  });

  // Reading order: follow the flow (rank), then across it.
  const along = (node: LaidNode) => (direction === "LR" || direction === "RL" ? node.x : node.y);
  const across = (node: LaidNode) => (direction === "LR" || direction === "RL" ? node.y : node.x);
  const flip = direction === "BT" || direction === "RL" ? -1 : 1;
  [...nodes]
    .sort((a, b) => flip * (along(a) - along(b)) || across(a) - across(b))
    .forEach((node, index) => (node.step = index + 1));

  const edges: LaidEdge[] = chart.edges.map((edge, index) => {
    const key = `e${index}`;
    const placed = graph.edge({ v: edge.from, w: edge.to, name: key });
    const points = ((placed.points ?? []) as Array<{ x: number; y: number }>).map((point) => ({
      x: point.x,
      y: point.y,
    }));
    const labelSize = edgeText.get(key);
    return {
      ...edge,
      key,
      points,
      path: basisPath(points),
      labelBox:
        labelSize && placed.x !== undefined && placed.y !== undefined
          ? {
              x: placed.x - labelSize.width / 2,
              y: placed.y - labelSize.height / 2,
              width: labelSize.width,
              height: labelSize.height,
              lines: labelSize.lines,
            }
          : undefined,
    };
  });

  const depthOf = (group: FlowGroup): number => {
    const parent = group.parent ? chart.groups.find((candidate) => candidate.id === group.parent) : undefined;
    return parent ? depthOf(parent) + 1 : 0;
  };
  const groups: LaidGroup[] = chart.groups
    .map((group) => {
      const placed = graph.node(group.id);
      const pad = 6;
      return {
        ...group,
        x: placed.x! - placed.width / 2 - pad,
        y: placed.y! - placed.height / 2 - pad,
        width: placed.width + pad * 2,
        height: placed.height + pad * 2,
        depth: depthOf(group),
      };
    })
    .sort((a, b) => a.depth - b.depth);

  const size = graph.graph();
  return {
    direction,
    width: Math.ceil(size.width ?? 0),
    height: Math.ceil(size.height ?? 0),
    nodes,
    edges,
    groups,
    metrics,
  };
}
