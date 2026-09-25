/**
 * Concept map: the learner's ideas as glass orbs. Size encodes importance
 * (core vs supporting), colour encodes mastery, links carry their relation.
 * Layout is a precomputed force simulation, so it renders instantly and
 * stays still (no jiggling physics while reading).
 */
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from "d3-force";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { GuideConcept, GuideEdge } from "@shared/guide";
import { cx } from "@/components/ui";

type Node = SimulationNodeDatum & GuideConcept & { r: number };

const WIDTH = 760;
const HEIGHT = 440;

function masteryColor(value: number | undefined) {
  if (value === undefined || value < 0) return { core: "#8b5cf6", edge: "#3b82f6", label: "not yet checked" };
  if (value >= 0.8) return { core: "#10b981", edge: "#34d399", label: "mastered" };
  if (value >= 0.4) return { core: "#f59e0b", edge: "#fbbf24", label: "learning" };
  return { core: "#f97316", edge: "#fb923c", label: "needs work" };
}

export function ConceptMap({
  concepts,
  edges,
  mastery,
  selected,
  onSelect,
  tone = "paper",
}: {
  concepts: GuideConcept[];
  edges: GuideEdge[];
  mastery: Record<string, number>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  tone?: "paper" | "dark";
}) {
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => {
    const nodes: Node[] = concepts.map((concept) => ({
      ...concept,
      r: concept.kind === "core" ? 30 : concept.kind === "example" ? 17 : 22,
    }));
    const links = edges
      .filter((edge) => nodes.some((n) => n.id === edge.from) && nodes.some((n) => n.id === edge.to))
      .map((edge) => ({ source: edge.from, target: edge.to, label: edge.label }));
    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink(links)
          .id((d) => (d as Node).id)
          .distance(110)
          .strength(0.5),
      )
      .force("charge", forceManyBody().strength(-420))
      .force(
        "collide",
        forceCollide<Node>().radius((d) => d.r + 34),
      )
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("x", forceX(WIDTH / 2).strength(0.06))
      .force("y", forceY(HEIGHT / 2).strength(0.1))
      .stop();
    for (let i = 0; i < 320; i += 1) simulation.tick();
    for (const node of nodes) {
      node.x = Math.max(node.r + 40, Math.min(WIDTH - node.r - 40, node.x ?? WIDTH / 2));
      node.y = Math.max(node.r + 20, Math.min(HEIGHT - node.r - 30, node.y ?? HEIGHT / 2));
    }
    // Frame the content: small maps render compact instead of floating in empty space.
    const pad = 60;
    const minX = Math.min(...nodes.map((n) => (n.x ?? 0) - n.r)) - pad;
    const maxX = Math.max(...nodes.map((n) => (n.x ?? 0) + n.r)) + pad;
    const minY = Math.min(...nodes.map((n) => (n.y ?? 0) - n.r)) - pad / 2;
    const maxY = Math.max(...nodes.map((n) => (n.y ?? 0) + n.r)) + pad;
    let width = Math.max(300, maxX - minX);
    let height = Math.max(170, maxY - minY);
    if (width / height > 2.6) height = width / 2.6;
    width = Math.min(width, WIDTH + pad);
    height = Math.min(height, HEIGHT + pad);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const viewBox = `${cx - width / 2} ${cy - height / 2} ${width} ${height}`;
    return { nodes, viewBox, links: links as unknown as Array<{ source: Node; target: Node; label?: string }> };
  }, [concepts, edges]);

  const focus = hover ?? selected;
  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    for (const link of layout.links) {
      if (link.source.id === focus) set.add(link.target.id);
      if (link.target.id === focus) set.add(link.source.id);
    }
    return set;
  }, [focus, layout.links]);

  if (!concepts.length) return null;
  const dark = tone === "dark";

  return (
    <svg
      viewBox={layout.viewBox}
      className="mx-auto h-auto max-h-[480px] w-full select-none"
      role="img"
      aria-label="Concept map"
    >
      <defs>
        {layout.nodes.map((node) => {
          const color = masteryColor(mastery[node.id]);
          return (
            <radialGradient key={node.id} id={`orb-${node.id}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="28%" stopColor={color.edge} stopOpacity="0.75" />
              <stop offset="75%" stopColor={color.core} stopOpacity="0.9" />
              <stop offset="100%" stopColor={dark ? "#0b0b10" : "#3b2f25"} stopOpacity="0.85" />
            </radialGradient>
          );
        })}
        <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {layout.links.map((link, index) => {
        const active = !neighbours || (neighbours.has(link.source.id) && neighbours.has(link.target.id));
        const mx = ((link.source.x ?? 0) + (link.target.x ?? 0)) / 2;
        const my = ((link.source.y ?? 0) + (link.target.y ?? 0)) / 2 - 18;
        return (
          <g key={index} opacity={active ? 1 : 0.15} style={{ transition: "opacity 0.3s" }}>
            <motion.path
              d={`M ${link.source.x} ${link.source.y} Q ${mx} ${my} ${link.target.x} ${link.target.y}`}
              fill="none"
              stroke={dark ? "rgba(255,255,255,0.22)" : "rgba(80,60,40,0.3)"}
              strokeWidth={1.4}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.2 + index * 0.03 }}
            />
            {link.label && neighbours && active && (
              <text
                x={mx}
                y={my + 4}
                textAnchor="middle"
                className={cx("text-[10px] italic", dark ? "fill-fog-400" : "fill-[#7a6c58]")}
              >
                {link.label}
              </text>
            )}
          </g>
        );
      })}

      {layout.nodes.map((node, index) => {
        const active = !neighbours || neighbours.has(node.id);
        const color = masteryColor(mastery[node.id]);
        return (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: active ? 1 : 0.25, scale: selected === node.id ? 1.12 : 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: index * 0.035 }}
            style={{ originX: `${node.x}px`, originY: `${node.y}px`, cursor: "pointer" }}
            onMouseEnter={() => setHover(node.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelect(selected === node.id ? null : node.id)}
            role="button"
            aria-label={`${node.label}: ${color.label}`}
          >
            <circle cx={node.x} cy={node.y} r={node.r + 6} fill={color.edge} opacity={0.25} filter="url(#orb-glow)" />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={`url(#orb-${node.id})`}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1}
            />
            <ellipse
              cx={(node.x ?? 0) - node.r * 0.3}
              cy={(node.y ?? 0) - node.r * 0.42}
              rx={node.r * 0.38}
              ry={node.r * 0.2}
              fill="white"
              opacity={0.45}
            />
            <text
              x={node.x}
              y={(node.y ?? 0) + node.r + 16}
              textAnchor="middle"
              className={cx(
                "font-sans text-[12px]",
                dark ? "fill-fog-50" : "fill-[#2b251d]",
                node.kind === "core" && "font-semibold",
              )}
            >
              {node.label.length > 24 ? `${node.label.slice(0, 23)}…` : node.label}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

export const MASTERY_LEGEND = [
  { label: "Not yet checked", color: "#8b5cf6" },
  { label: "Needs work", color: "#f97316" },
  { label: "Learning", color: "#f59e0b" },
  { label: "Mastered", color: "#10b981" },
];
