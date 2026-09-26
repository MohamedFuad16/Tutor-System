/**
 * Tutor's own flowchart renderer, drawn in the Obsidian & Paper language
 * instead of Mermaid's defaults.
 *
 *  - Steps are soft cards with a numbered signal badge (the voice tour and
 *    the walk-through refer to them in this order).
 *  - Start/end are signal pills; decisions are violet chevron cards whose
 *    outgoing "Yes/No" chips are colour-coded; data and input/output steps
 *    carry cyan/blue aura tints; subgraphs are dashed regions with a legend.
 *  - Edges are smooth B-splines. Hovering a step lights its connections, and
 *    the active step (walk-through or voice) is spotlit, with its edges
 *    flowing in signal orange.
 *  - It draws itself in (unless reduced motion is on), fits its box, and
 *    re-flows TD↔LR when the other direction reads better.
 */
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cx } from "@/components/ui";
import {
  flowMetrics,
  layoutFlowchart,
  type FlowLayout,
  type FlowMetrics,
  type LaidEdge,
  type LaidNode,
} from "@/lib/flow/layout";
import type { Flowchart } from "@/lib/flow/parse";
import type { DiagramTheme } from "@/lib/mermaid";
import { useMotion } from "@/store/app";
import { betterFit, fitScale, useViewBoxCamera, type Box, type Fit } from "./fit";

/** Room around the drawing for badges, glows and shadows. */
const MARGIN = 14;

const YES = /^(?:yes|y|true|pass(?:es|ed)?|ok|success|valid|correct|done)\b/i;
const NO = /^(?:no|n|false|fail(?:s|ed)?|error|invalid|wrong|retry|not)\b/i;

function shapePath(node: LaidNode) {
  const { width: w, height: h } = node;
  switch (node.kind) {
    case "decision": {
      const p = Math.min(h * 0.31, 18);
      return `M${p},0 H${w - p} L${w},${h / 2} L${w - p},${h} H${p} L0,${h / 2} Z`;
    }
    case "io": {
      const s = 9;
      return `M${s},0 H${w} L${w - s},${h} H0 Z`;
    }
    case "data": {
      const ry = 5.5;
      return `M0,${ry} A${w / 2},${ry} 0 0 1 ${w},${ry} V${h - ry} A${w / 2},${ry} 0 0 1 0,${h - ry} Z`;
    }
    default:
      return null;
  }
}

function NodeShape({ node, fill }: { node: LaidNode; fill: string }) {
  const path = shapePath(node);
  const common = { className: "flow-shape", fill };
  if (path) return <path d={path} strokeLinejoin="round" {...common} />;
  const radius = node.kind === "terminal" ? node.height / 2 : node.shape === "round" ? 16 : 11;
  return <rect width={node.width} height={node.height} rx={radius} ry={radius} {...common} />;
}

function FlowNodeView({
  node,
  fills,
  hovered,
  active,
  onHover,
}: {
  node: LaidNode;
  fills: Record<LaidNode["kind"], string>;
  hovered: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const metrics = useMetrics();
  const lineHeight = metrics.fontSize * metrics.lineHeight;
  const extra = node.kind === "data" ? 5 : 0;
  const firstY = node.height / 2 + extra / 2 - ((node.lines.length - 1) * lineHeight) / 2;
  const badge = node.kind !== "terminal";
  const badgeX = node.kind === "decision" ? Math.min(node.height * 0.31, 18) : node.kind === "io" ? 9 : 0;
  return (
    <g
      className="node flow-node"
      data-node={node.id}
      data-kind={node.kind}
      data-hover={hovered || undefined}
      data-active={active ? "true" : undefined}
      transform={`translate(${node.x},${node.y})`}
      style={{ "--i": node.step } as CSSProperties}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <g className="flow-node-body">
        <NodeShape node={node} fill={fills[node.kind]} />
        {node.kind === "data" && (
          <path
            className="flow-lid"
            d={`M0,5.5 A${node.width / 2},5.5 0 0 0 ${node.width},5.5`}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {node.shape === "subroutine" && (
          <path className="flow-lid" d={`M8,0 V${node.height} M${node.width - 8},0 V${node.height}`} fill="none" />
        )}
        <text
          className="flow-label"
          x={node.width / 2 + (badge ? 3 : 0)}
          textAnchor="middle"
          fontFamily={metrics.fontFamily}
          fontSize={metrics.fontSize}
          fontWeight={node.kind === "terminal" ? 600 : metrics.fontWeight}
        >
          {node.lines.map((line, index) => (
            <tspan key={index} x={node.width / 2 + (badge ? 3 : 0)} y={firstY + index * lineHeight} dy="0.35em">
              {line}
            </tspan>
          ))}
        </text>
      </g>
      {badge && (
        <g className="flow-badge" transform={`translate(${badgeX},0)`} aria-hidden>
          <circle r={9.5} />
          <text textAnchor="middle" dy="0.35em" fontSize={10} fontWeight={700} fontFamily={metrics.fontFamily}>
            {node.kind === "decision" ? "?" : node.step}
          </text>
        </g>
      )}
    </g>
  );
}

function FlowEdgeView({ edge, lit, markers }: { edge: LaidEdge; lit: boolean; markers: Record<string, string> }) {
  const marker = (head: LaidEdge["head"]) => (head === "none" ? undefined : `url(#${markers[head]})`);
  return (
    <g className="flow-edge" data-stroke={edge.stroke} data-lit={lit || undefined}>
      <path
        className="flow-edge-line"
        d={edge.path}
        fill="none"
        // Normalised length drives the draw-in; dotted edges keep real dot spacing.
        pathLength={edge.stroke === "dotted" ? undefined : 1}
        markerEnd={marker(edge.head)}
        markerStart={marker(edge.tail)}
      />
      {lit && <path className="flow-edge-flow" d={edge.path} fill="none" />}
    </g>
  );
}

function EdgeLabelView({ edge }: { edge: LaidEdge }) {
  const metrics = useMetrics();
  if (!edge.labelBox) return null;
  const { x, y, width, height, lines } = edge.labelBox;
  const text = lines.join(" ");
  const tone = YES.test(text) ? "yes" : NO.test(text) ? "no" : undefined;
  const lineHeight = metrics.edgeFontSize * 1.3;
  return (
    <g className="flow-edge-label" data-tone={tone} transform={`translate(${x},${y})`}>
      <rect width={width} height={height} rx={Math.min(height / 2, 11)} />
      <text
        textAnchor="middle"
        fontFamily={metrics.fontFamily}
        fontSize={metrics.edgeFontSize}
        fontWeight={600}
        x={width / 2}
      >
        {lines.map((line, index) => (
          <tspan
            key={index}
            x={width / 2}
            y={height / 2 - ((lines.length - 1) * lineHeight) / 2 + index * lineHeight}
            dy="0.35em"
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** Text metrics of the current drawing, for the leaf components. */
const MetricsContext = createContext<FlowMetrics>(flowMetrics("regular"));
const useMetrics = () => useContext(MetricsContext);

/** Diagram state reported to the card (node count for "6 steps"). */
export type FlowRendered = { nodes: number };

export function FlowChartView({
  chart,
  theme = "light",
  fit,
  activeNode,
  title,
  className,
  onRendered,
}: {
  chart: Flowchart;
  theme?: DiagramTheme;
  fit: Fit;
  activeNode?: string | null;
  title?: string;
  className?: string;
  onRendered?: (info: FlowRendered) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseBox = useRef<Box | null>(null);
  const motionOn = useMotion();
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const density = fit.compact ? "compact" : theme === "dark" ? "stage" : "regular";
  const layouts = useMemo(() => {
    const metrics = flowMetrics(density, theme === "paper");
    const primary = layoutFlowchart(chart, metrics);
    if (!fit.reorient || chart.nodes.length < 3) return [primary];
    const flipped = /LR|RL/.test(chart.direction) ? "TB" : "LR";
    return [primary, layoutFlowchart(chart, metrics, flipped)];
  }, [chart, density, theme, fit.reorient]);

  // Keep the drawing's orientation unless the other one reads noticeably better in this box.
  const layout = useMemo(() => {
    const [primary, alternative] = layouts;
    if (!alternative || !width) return primary;
    const size = (candidate: FlowLayout) => ({
      width: candidate.width + MARGIN * 2,
      height: candidate.height + MARGIN * 2,
    });
    const tall =
      fit.compact &&
      !/LR|RL/.test(primary.direction) &&
      size(primary).height * fitScale(size(primary), width, fit) > 190;
    if (fitScale(size(primary), width, fit) < 0.8 || tall) {
      return betterFit(size(alternative), size(primary), width, fit) ? alternative : primary;
    }
    return primary;
  }, [layouts, width, fit]);

  const viewBox: Box = [-MARGIN, -MARGIN, layout.width + MARGIN * 2, layout.height + MARGIN * 2];
  baseBox.current = viewBox;
  const scale = width ? fitScale({ width: viewBox[2], height: viewBox[3] }, width, fit) : 1;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setWidth(frame.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(frame.clientWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const onRenderedRef = useRef(onRendered);
  onRenderedRef.current = onRendered;
  useLayoutEffect(() => onRenderedRef.current?.({ nodes: chart.nodes.length }), [chart]);

  const locate = useCallback(
    (svg: SVGSVGElement, id: string) => svg.querySelector<SVGGElement>(`[data-node="${CSS.escape(id)}"]`),
    [],
  );
  useViewBoxCamera({
    svg: svgRef,
    host: frameRef,
    base: baseBox,
    activeNode,
    ready: width > 0,
    motion: motionOn,
    locate,
    mark: false,
  });

  const focus = activeNode ?? hovered;
  const connected = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    for (const edge of layout.edges) {
      if (edge.from === focus) set.add(edge.to);
      if (edge.to === focus) set.add(edge.from);
    }
    return set;
  }, [focus, layout.edges]);

  const ids = {
    fill: `flow-${uid}-fill`,
    decision: `flow-${uid}-decision`,
    terminal: `flow-${uid}-terminal`,
    data: `flow-${uid}-data`,
    io: `flow-${uid}-io`,
    shadow: `flow-${uid}-shadow`,
  };
  const markers = { arrow: `flow-${uid}-arrow`, circle: `flow-${uid}-circle`, cross: `flow-${uid}-cross` };
  const fills: Record<LaidNode["kind"], string> = {
    step: `url(#${ids.fill})`,
    decision: `url(#${ids.decision})`,
    terminal: `url(#${ids.terminal})`,
    data: `url(#${ids.data})`,
    io: `url(#${ids.io})`,
  };
  const ordered = [...layout.nodes].sort((a, b) => a.step - b.step);
  const label = `${title || "Flowchart"}: ${ordered.map((node) => `${node.step}. ${node.lines.join(" ")}`).join(", ")}`;

  return (
    <MetricsContext.Provider value={layout.metrics}>
      <div
        ref={frameRef}
        className={cx("flow diagram-host relative flex w-full justify-center", className)}
        data-theme={theme}
        data-touring={activeNode && chart.nodes.some((node) => node.id === activeNode) ? "true" : "false"}
        data-focus={focus ? "true" : undefined}
      >
        <svg
          ref={svgRef}
          role="img"
          aria-label={label}
          viewBox={viewBox.join(" ")}
          width={Math.round(viewBox[2] * scale)}
          height={Math.round(viewBox[3] * scale)}
          data-draw={motionOn ? "true" : undefined}
          className="flow-svg"
        >
          <title>{label}</title>
          <defs>
            {(
              [
                [ids.fill, "--flow-node-a", "--flow-node-b"],
                [ids.decision, "--flow-decision-a", "--flow-decision-b"],
                [ids.terminal, "--flow-terminal-a", "--flow-terminal-b"],
                [ids.data, "--flow-data-a", "--flow-data-b"],
                [ids.io, "--flow-io-a", "--flow-io-b"],
              ] as const
            ).map(([id, from, to]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: `var(${from})` }} />
                <stop offset="1" style={{ stopColor: `var(${to})` }} />
              </linearGradient>
            ))}
            <marker
              id={markers.arrow}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={9}
              markerHeight={9}
              orient="auto-start-reverse"
              markerUnits="userSpaceOnUse"
            >
              <path d="M1,1.2 L9,5 L1,8.8 Q2.6,5 1,1.2 Z" className="flow-arrow" />
            </marker>
            <marker
              id={markers.circle}
              viewBox="0 0 10 10"
              refX={5}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <circle cx={5} cy={5} r={3.6} className="flow-arrow" />
            </marker>
            <marker
              id={markers.cross}
              viewBox="0 0 10 10"
              refX={5}
              refY={5}
              markerWidth={8}
              markerHeight={8}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M2,2 L8,8 M8,2 L2,8" className="flow-cross" />
            </marker>
          </defs>

          <g className="flow-groups">
            {layout.groups.map((group) => (
              <g key={group.id} className="flow-group" transform={`translate(${group.x},${group.y})`}>
                <rect width={group.width} height={group.height} rx={16} />
              </g>
            ))}
          </g>
          <g className="flow-edges">
            {layout.edges.map((edge) => (
              <FlowEdgeView
                key={edge.key}
                edge={edge}
                lit={Boolean(focus && (edge.from === focus || edge.to === focus))}
                markers={markers}
              />
            ))}
          </g>
          {/* Legends sit above edges so a line never runs through a group's title. */}
          <g className="flow-group-legends">
            {layout.groups.map((group) => (
              <g key={group.id} className="flow-group" transform={`translate(${group.x},${group.y})`}>
                <GroupLegend title={group.title} />
              </g>
            ))}
          </g>
          <g className="flow-nodes">
            {ordered.map((node) => (
              <g key={node.id} data-dim={connected && !connected.has(node.id) ? true : undefined} className="flow-slot">
                <FlowNodeView
                  node={node}
                  fills={fills}
                  hovered={hovered === node.id}
                  active={activeNode === node.id}
                  onHover={setHovered}
                />
              </g>
            ))}
          </g>
          <g className="flow-edge-labels">
            {layout.edges.map((edge) => (
              <EdgeLabelView key={edge.key} edge={edge} />
            ))}
          </g>
        </svg>
      </div>
    </MetricsContext.Provider>
  );
}

function GroupLegend({ title }: { title: string }) {
  const metrics = useMetrics();
  const text = title.toUpperCase();
  const width = Math.min(220, text.length * 6.4 + 18);
  return (
    <g className="flow-group-legend" transform="translate(14,-9)">
      <rect width={width} height={18} rx={9} />
      <text
        x={width / 2}
        y={9}
        dy="0.35em"
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={700}
        fontFamily={metrics.fontFamily}
      >
        {text.length > 32 ? `${text.slice(0, 31)}…` : text}
      </text>
    </g>
  );
}
