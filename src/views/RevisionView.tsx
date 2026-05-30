import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Brain,
  Search,
  BookOpen,
  Layers,
  Zap,
  Clock,
  AlertTriangle,
  Code,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Trash2,
  MessageSquare,
  Highlighter,
  Underline,
  Strikethrough,
  StickyNote,
  Settings,
  Mic,
  Activity,
  ArrowUp,
  Folder,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  db,
  PersistentConcept,
  Flashcard,
  LearningBook,
} from "../memory/longterm.memory";
import { PatternCard, themes } from "../components/PatternCard";
import { SvgBeige } from "../components/PatternSVGs";
import tutorBook from "../lib/tutorBook.json";
import { useMotionPreference } from "../hooks/useMotionPreference";

type BuiltInBook = {
  id: string;
  name: string;
  description: string;
  hiddenKey: string;
  chapters: { title: string; content?: string }[];
  renderChapter?: (chapterIndex: number) => React.ReactNode;
};

type LibraryDeleteTarget = {
  id: string;
  name: string;
  kind: "built-in" | "learning";
};

const designTokens = [
  { label: "Obsidian", value: "#030303", swatch: "bg-[#030303]" },
  { label: "Panel", value: "#0A0A0B", swatch: "bg-[#0A0A0B]" },
  { label: "Paper", value: "#faf9f6", swatch: "bg-[#faf9f6]" },
  { label: "Violet", value: "#7c3aed", swatch: "bg-violet-600" },
  { label: "Blue", value: "#0a84ff", swatch: "bg-[#0a84ff]" },
  { label: "Signal", value: "#ff6e00", swatch: "bg-[#ff6e00]" },
];

type SnapshotPreviewId =
  | "navigation"
  | "library"
  | "pdf"
  | "toolbar"
  | "chat"
  | "thinking"
  | "brain"
  | "revision"
  | "settings"
  | "analytics";

type WireframeNodeTone = "dark" | "light" | "accent" | "paper" | "blue";

type WireframeNode = {
  id: string;
  x: number;
  y: number;
  tone: WireframeNodeTone;
  summary: string;
  lane: string;
};

type WireframeLinkSide = "top" | "right" | "bottom" | "left";

type WireframeLink = {
  from: string;
  to: string;
  label: string;
  labelX: number;
  labelY: number;
  fromSide?: WireframeLinkSide;
  toSide?: WireframeLinkSide;
  waypoints?: { x: number; y: number }[];
};

const wireframeNodes = [
  {
    id: "App Shell",
    x: 120,
    y: 150,
    tone: "dark",
    summary: "view host",
    lane: "Navigation",
  },
  {
    id: "Navigation",
    x: 410,
    y: 150,
    tone: "dark",
    summary: "activeView",
    lane: "Navigation",
  },
  {
    id: "Settings",
    x: 700,
    y: 150,
    tone: "light",
    summary: "keys + voice",
    lane: "Navigation",
  },
  {
    id: "Study View",
    x: 120,
    y: 375,
    tone: "dark",
    summary: "workspace",
    lane: "Study",
  },
  {
    id: "Document Intake",
    x: 360,
    y: 375,
    tone: "paper",
    summary: "upload",
    lane: "Study",
  },
  {
    id: "PDF Viewer",
    x: 600,
    y: 375,
    tone: "light",
    summary: "read + mark",
    lane: "Study",
  },
  {
    id: "Selection Toolbar",
    x: 840,
    y: 375,
    tone: "light",
    summary: "quote tools",
    lane: "Study",
  },
  {
    id: "Chat Panel",
    x: 1040,
    y: 375,
    tone: "dark",
    summary: "ask tutor",
    lane: "Tutor",
  },
  {
    id: "Thinking Trace",
    x: 600,
    y: 600,
    tone: "blue",
    summary: "stream",
    lane: "Tutor",
  },
  {
    id: "Tutor Tools",
    x: 840,
    y: 600,
    tone: "accent",
    summary: "actions",
    lane: "Tutor",
  },
  {
    id: "Server API",
    x: 1040,
    y: 600,
    tone: "dark",
    summary: "models",
    lane: "Tutor",
  },
  {
    id: "Voice + TTS",
    x: 120,
    y: 600,
    tone: "blue",
    summary: "speech",
    lane: "Tutor",
  },
  {
    id: "Memory Orchestrator",
    x: 360,
    y: 825,
    tone: "accent",
    summary: "maps learning",
    lane: "Memory",
  },
  {
    id: "Dexie DB",
    x: 600,
    y: 825,
    tone: "paper",
    summary: "browser store",
    lane: "Memory",
  },
  {
    id: "Brain Graph",
    x: 840,
    y: 825,
    tone: "dark",
    summary: "concepts",
    lane: "Memory",
  },
  {
    id: "Learning Books",
    x: 1040,
    y: 825,
    tone: "paper",
    summary: "chapters",
    lane: "Memory",
  },
  {
    id: "Revision Library",
    x: 600,
    y: 1050,
    tone: "paper",
    summary: "review",
    lane: "Review",
  },
  {
    id: "Flashcards",
    x: 840,
    y: 1050,
    tone: "light",
    summary: "recall",
    lane: "Review",
  },
  {
    id: "Analytics",
    x: 360,
    y: 1050,
    tone: "light",
    summary: "progress",
    lane: "Ops",
  },
  {
    id: "Admin Console",
    x: 120,
    y: 1050,
    tone: "accent",
    summary: "logs",
    lane: "Ops",
  },
] satisfies WireframeNode[];

const wireframeLinks = [
  {
    from: "App Shell",
    to: "Navigation",
    label: "renders tabs",
    labelX: 265,
    labelY: 150,
  },
  {
    from: "Navigation",
    to: "Study View",
    label: "opens workspace",
    labelX: 248,
    labelY: 260,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 410, y: 260 },
      { x: 120, y: 260 },
    ],
  },
  {
    from: "Navigation",
    to: "Revision Library",
    label: "opens library",
    labelX: 700,
    labelY: 445,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 720, y: 260 },
      { x: 720, y: 965 },
      { x: 600, y: 965 },
    ],
  },
  {
    from: "Navigation",
    to: "Analytics",
    label: "opens progress",
    labelX: 170,
    labelY: 955,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 240, y: 260 },
      { x: 240, y: 965 },
      { x: 360, y: 965 },
    ],
  },
  {
    from: "Settings",
    to: "Chat Panel",
    label: "model + voice",
    labelX: 870,
    labelY: 250,
  },
  {
    from: "Study View",
    to: "Document Intake",
    label: "adds file",
    labelX: 240,
    labelY: 308,
  },
  {
    from: "Document Intake",
    to: "PDF Viewer",
    label: "loads pages",
    labelX: 480,
    labelY: 308,
  },
  {
    from: "PDF Viewer",
    to: "Selection Toolbar",
    label: "selected text",
    labelX: 720,
    labelY: 308,
  },
  {
    from: "Selection Toolbar",
    to: "Chat Panel",
    label: "ask tutor",
    labelX: 940,
    labelY: 308,
  },
  {
    from: "Chat Panel",
    to: "Thinking Trace",
    label: "streams reasoning",
    labelX: 800,
    labelY: 475,
  },
  {
    from: "Chat Panel",
    to: "Tutor Tools",
    label: "calls tools",
    labelX: 950,
    labelY: 515,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 1040, y: 515 },
      { x: 840, y: 515 },
    ],
  },
  {
    from: "Tutor Tools",
    to: "Server API",
    label: "model/search",
    labelX: 940,
    labelY: 720,
    fromSide: "bottom",
    toSide: "bottom",
    waypoints: [
      { x: 840, y: 680 },
      { x: 1040, y: 680 },
    ],
  },
  {
    from: "Server API",
    to: "Chat Panel",
    label: "returns answer",
    labelX: 1112,
    labelY: 500,
    fromSide: "right",
    toSide: "right",
    waypoints: [
      { x: 1135, y: 600 },
      { x: 1135, y: 375 },
    ],
  },
  {
    from: "Chat Panel",
    to: "Memory Orchestrator",
    label: "saves exchange",
    labelX: 1030,
    labelY: 750,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 1135, y: 455 },
      { x: 1135, y: 700 },
      { x: 360, y: 700 },
    ],
  },
  {
    from: "PDF Viewer",
    to: "Memory Orchestrator",
    label: "adds notes",
    labelX: 460,
    labelY: 690,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 500, y: 455 },
      { x: 500, y: 690 },
      { x: 360, y: 690 },
    ],
  },
  {
    from: "Tutor Tools",
    to: "Memory Orchestrator",
    label: "updates graph",
    labelX: 700,
    labelY: 735,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 840, y: 725 },
      { x: 360, y: 725 },
    ],
  },
  {
    from: "Voice + TTS",
    to: "Chat Panel",
    label: "speech input",
    labelX: 350,
    labelY: 650,
    fromSide: "right",
    toSide: "bottom",
    waypoints: [
      { x: 300, y: 690 },
      { x: 1135, y: 690 },
      { x: 1135, y: 455 },
      { x: 1040, y: 455 },
    ],
  },
  {
    from: "Memory Orchestrator",
    to: "Dexie DB",
    label: "persists",
    labelX: 480,
    labelY: 825,
  },
  {
    from: "Memory Orchestrator",
    to: "Brain Graph",
    label: "creates nodes",
    labelX: 560,
    labelY: 755,
    fromSide: "top",
    toSide: "top",
    waypoints: [
      { x: 360, y: 755 },
      { x: 840, y: 755 },
    ],
  },
  {
    from: "Memory Orchestrator",
    to: "Learning Books",
    label: "writes chapters",
    labelX: 720,
    labelY: 895,
    fromSide: "bottom",
    toSide: "bottom",
    waypoints: [
      { x: 360, y: 895 },
      { x: 1040, y: 895 },
    ],
  },
  {
    from: "Learning Books",
    to: "Revision Library",
    label: "appears as book",
    labelX: 820,
    labelY: 975,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 1040, y: 950 },
      { x: 600, y: 950 },
    ],
  },
  {
    from: "Learning Books",
    to: "Flashcards",
    label: "review queue",
    labelX: 1010,
    labelY: 935,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 1040, y: 985 },
      { x: 840, y: 985 },
    ],
  },
  {
    from: "Dexie DB",
    to: "Analytics",
    label: "aggregates",
    labelX: 500,
    labelY: 930,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 600, y: 940 },
      { x: 360, y: 940 },
    ],
  },
  {
    from: "Dexie DB",
    to: "Admin Console",
    label: "trace records",
    labelX: 300,
    labelY: 890,
    fromSide: "bottom",
    toSide: "top",
    waypoints: [
      { x: 600, y: 915 },
      { x: 120, y: 915 },
    ],
  },
] satisfies WireframeLink[];

const snapshotCards: {
  id: SnapshotPreviewId;
  title: string;
  caption: string;
}[] = [
  {
    id: "navigation",
    title: "Navigation",
    caption: "Click a route to move the active pill.",
  },
  {
    id: "library",
    title: "Library Book Card",
    caption: "Open and close the cover state.",
  },
  {
    id: "pdf",
    title: "PDF Viewer",
    caption: "Change page, zoom, and annotation mode.",
  },
  {
    id: "toolbar",
    title: "Selection Toolbar",
    caption: "Pick highlight, underline, strike, or Ask Tutor.",
  },
  {
    id: "chat",
    title: "Chat Panel",
    caption: "Send a sample prompt into the mini tutor.",
  },
  {
    id: "thinking",
    title: "AI Thinking",
    caption: "Expand and collapse the reasoning trace.",
  },
  {
    id: "brain",
    title: "Brain Graph",
    caption: "Focus different concept nodes.",
  },
  {
    id: "revision",
    title: "Revision Notebook",
    caption: "Turn notebook pages.",
  },
  {
    id: "settings",
    title: "Settings",
    caption: "Switch settings tabs.",
  },
  {
    id: "analytics",
    title: "Analytics/Admin",
    caption: "Toggle metric modes.",
  },
];

const GalleryPanel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-[34px] border border-zinc-200/70 bg-zinc-100/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_28px_80px_rgba(24,24,27,0.08)] sm:p-6 ${className}`}
  >
    {children}
  </div>
);

const WireframeMap = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [mapScale, setMapScale] = useState(1);
  const nodeById = new Map(wireframeNodes.map((node) => [node.id, node]));
  const canvas = { width: 1160, height: 1160 };
  const nodeSize = { width: 160, height: 86 };
  const lanes = [
    ["Navigation", 82],
    ["Study", 300],
    ["Tutor", 525],
    ["Memory", 750],
    ["Review + Ops", 975],
  ] as const;
  const nodeClass = (tone: WireframeNodeTone) => {
    if (tone === "dark") return "border-zinc-700 bg-[#07070a] text-white";
    if (tone === "accent") return "border-orange-300 bg-white text-orange-600";
    if (tone === "paper") return "border-zinc-200 bg-[#faf9f6] text-zinc-900";
    if (tone === "blue") return "border-blue-200 bg-white text-blue-600";
    return "border-white bg-white text-zinc-700";
  };
  useEffect(() => {
    const updateScale = () => {
      const width = viewportRef.current?.clientWidth ?? canvas.width;
      setMapScale(Math.min(1, Math.max(0.72, (width - 24) / canvas.width)));
    };
    updateScale();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateScale)
        : null;
    if (viewportRef.current) resizeObserver?.observe(viewportRef.current);
    window.addEventListener("resize", updateScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [canvas.width]);
  const defaultSide = (
    source: WireframeNode,
    target: WireframeNode,
    role: "source" | "target",
  ): WireframeLinkSide => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (role === "source") return dx >= 0 ? "right" : "left";
      return dx >= 0 ? "left" : "right";
    }
    if (role === "source") return dy >= 0 ? "bottom" : "top";
    return dy >= 0 ? "top" : "bottom";
  };
  const anchorFor = (node: WireframeNode, side: WireframeLinkSide) => {
    if (side === "left") return { x: node.x - nodeSize.width / 2, y: node.y };
    if (side === "right") return { x: node.x + nodeSize.width / 2, y: node.y };
    if (side === "top") return { x: node.x, y: node.y - nodeSize.height / 2 };
    return { x: node.x, y: node.y + nodeSize.height / 2 };
  };
  const linkPath = (
    link: WireframeLink,
    source: WireframeNode,
    target: WireframeNode,
  ) => {
    const sourceSide = link.fromSide ?? defaultSide(source, target, "source");
    const targetSide = link.toSide ?? defaultSide(source, target, "target");
    const start = anchorFor(source, sourceSide);
    const end = anchorFor(target, targetSide);

    if (link.waypoints?.length) {
      return [
        `M ${start.x} ${start.y}`,
        ...link.waypoints.map((point) => `L ${point.x} ${point.y}`),
        `L ${end.x} ${end.y}`,
      ].join(" ");
    }

    const horizontal = sourceSide === "left" || sourceSide === "right";
    const distance = horizontal
      ? Math.abs(end.x - start.x)
      : Math.abs(end.y - start.y);
    const offset = Math.max(74, Math.min(170, distance * 0.55));

    if (horizontal) {
      const direction = sourceSide === "right" ? 1 : -1;
      return `M ${start.x} ${start.y} C ${start.x + direction * offset} ${start.y}, ${end.x - direction * offset} ${end.y}, ${end.x} ${end.y}`;
    }

    const direction = sourceSide === "bottom" ? 1 : -1;
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + direction * offset}, ${end.x} ${end.y - direction * offset}, ${end.x} ${end.y}`;
  };

  return (
    <GalleryPanel className="relative left-1/2 w-full -translate-x-1/2 overflow-hidden bg-[#f3f3f4] p-0 lg:w-[min(1280px,calc(100vw-18rem))] xl:w-[min(1380px,calc(100vw-24rem))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.88),transparent_56%)]" />
      <div className="relative border-b border-white/80 px-5 py-4 sm:px-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Component Map
        </div>
        <div className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Scroll the canvas to follow how the app shell hands work to the study
          surface, tutor tools, memory layer, review surfaces, and diagnostic
          views.
        </div>
      </div>
      <div
        ref={viewportRef}
        className="relative max-h-[min(76vh,780px)] overflow-x-auto overflow-y-auto custom-scroll"
        aria-label="Scrollable wireframe map of the Tutor UI components"
      >
        <div
          className="relative mx-auto"
          style={{
            width: canvas.width * mapScale,
            height: canvas.height * mapScale,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `scale(${mapScale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(212,212,216,0.28)_1px,transparent_1px),linear-gradient(180deg,rgba(212,212,216,0.28)_1px,transparent_1px)] bg-[size:80px_80px]" />
            {lanes.map(([lane, top]) => (
              <div
                key={lane}
                className="absolute left-6 right-6 border-t border-dashed border-zinc-300/70 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400"
                style={{ top }}
              >
                {lane}
              </div>
            ))}
            <svg
              className="absolute inset-0 z-10"
              width={canvas.width}
              height={canvas.height}
              viewBox={`0 0 ${canvas.width} ${canvas.height}`}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="wire-arrow"
                  markerHeight="8"
                  markerWidth="8"
                  orient="auto"
                  refX="7"
                  refY="4"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="rgba(113,113,122,0.82)" />
                </marker>
              </defs>
              {wireframeLinks.map((link) => {
                const source = nodeById.get(link.from);
                const target = nodeById.get(link.to);
                if (!source || !target) return null;
                return (
                  <g key={`${link.from}-${link.to}`}>
                    <path
                      d={linkPath(link, source, target)}
                      fill="none"
                      stroke="rgba(113,113,122,0.46)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      markerEnd="url(#wire-arrow)"
                    />
                  </g>
                );
              })}
            </svg>

            {wireframeLinks.map((link) => (
              <div
                key={`${link.from}-${link.to}-label`}
                data-wireframe-label={link.label}
                className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-zinc-200/80 bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.02em] text-zinc-600 shadow-[0_8px_20px_rgba(24,24,27,0.08)]"
                style={{ left: link.labelX, top: link.labelY }}
              >
                {link.label}
              </div>
            ))}

            {wireframeNodes.map((node) => (
              <div
                key={node.id}
                data-wireframe-node={node.id}
                className={`absolute z-30 flex min-h-[86px] w-[160px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[22px] border px-3 text-center shadow-[0_24px_55px_rgba(24,24,27,0.13)] transition-transform duration-300 hover:scale-[1.03] ${nodeClass(
                  node.tone,
                )}`}
                style={{ left: node.x, top: node.y }}
              >
                <div className="text-[14px] font-bold leading-tight tracking-tight">
                  {node.id}
                </div>
                <div
                  className={`mt-2 text-[10px] font-bold uppercase tracking-[0.16em] ${
                    node.tone === "dark" ? "text-white/40" : "text-zinc-400"
                  }`}
                >
                  {node.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GalleryPanel>
  );
};

const LiveComponentPreview = ({ id }: { id: SnapshotPreviewId }) => {
  const motionEnabled = useMotionPreference();
  const [activeRoute, setActiveRoute] = useState("Study");
  const [bookOpen, setBookOpen] = useState(false);
  const [pdfPage, setPdfPage] = useState(2);
  const [pdfZoom, setPdfZoom] = useState(112);
  const [activeTool, setActiveTool] = useState("Highlight");
  const [chatMessages, setChatMessages] = useState([
    "What should I review next?",
  ]);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [brainFocus, setBrainFocus] = useState("Memory");
  const [notebookPage, setNotebookPage] = useState(1);
  const [settingsTab, setSettingsTab] = useState("AI");
  const [metricMode, setMetricMode] = useState("Mastery");

  if (id === "navigation") {
    const navItems = [
      { label: "Study", icon: BookOpen },
      { label: "Analytics", icon: Zap },
      { label: "Revision", icon: Brain },
    ];
    return (
      <div className="flex justify-center rounded-[28px] bg-[#f7f7f8] p-6 shadow-inner">
        <div className="inline-flex rounded-full border border-white/10 bg-[#242426] p-1 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActiveRoute(label)}
              className={`relative inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition-colors ${
                activeRoute === label
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {activeRoute === label && (
                <span
                  className="absolute inset-0 rounded-full bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_22px_rgba(0,0,0,0.35)]"
                />
              )}
              <span
                className={`relative z-10 inline-flex items-center gap-2 transition-transform duration-200 ${
                  activeRoute === label ? "-translate-y-px" : ""
                }`}
              >
                <Icon size={14} />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (id === "library") {
    return (
      <div className="flex justify-center rounded-[30px] bg-[#f4f4f5] p-4 shadow-inner">
        <div className="h-60 w-[190px] overflow-hidden rounded-[28px]">
          <div className="origin-top-left scale-[0.58]">
            <PatternCard
              bgClass={bookOpen ? themes[2].bg : themes[0].bg}
              SvgComponent={
                bookOpen ? themes[2].SvgComponent : themes[0].SvgComponent
              }
              bloomColor={bookOpen ? themes[2].bloom : themes[0].bloom}
              bloomOpacity={
                bookOpen ? themes[2].bloomOpacity : themes[0].bloomOpacity
              }
              onClick={() => setBookOpen((open) => !open)}
              animateDots
            >
              <div
                className={`relative z-20 flex h-full flex-col justify-end p-8 ${
                  bookOpen ? "text-zinc-950" : "text-white"
                }`}
              >
                <div className="text-[12px] font-bold uppercase tracking-[0.22em] opacity-50">
                  Built-in book
                </div>
                <div className="mt-5 text-4xl font-semibold leading-[0.95] tracking-tight">
                  App Design
                  <br />
                  Language
                </div>
                <div className="mt-6 text-sm font-medium opacity-60">
                  {bookOpen ? "Wireframes · Theme · Snapshots" : "Tap to open"}
                </div>
              </div>
            </PatternCard>
          </div>
        </div>
      </div>
    );
  }

  if (id === "pdf") {
    return (
      <div className="rounded-[28px] bg-[#08080a] p-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {["-", "+"].map((control) => (
              <button
                key={control}
                type="button"
                onClick={() =>
                  setPdfZoom((zoom) =>
                    control === "+"
                      ? Math.min(150, zoom + 8)
                      : Math.max(80, zoom - 8),
                  )
                }
                className="h-8 w-8 rounded-xl bg-white/10 text-sm font-bold"
              >
                {control}
              </button>
            ))}
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-[10px]">
            {pdfZoom}%
          </div>
        </div>
        <div className="rounded-[22px] bg-[#faf9f6] p-4 text-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-2 w-24 rounded-full bg-zinc-300" />
            <div className="text-[10px] font-bold text-zinc-400">
              p. {pdfPage}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-zinc-200" />
            <div className="h-2 w-5/6 rounded-full bg-zinc-200" />
            <div
              className={`h-4 rounded-full ${
                activeTool === "Highlight" ? "bg-yellow-300" : "bg-zinc-200"
              }`}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setPdfPage(page)}
              className={`h-7 flex-1 rounded-full text-[10px] ${
                pdfPage === page ? "bg-indigo-500" : "bg-white/10 text-zinc-400"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (id === "toolbar") {
    const tools = [
      { label: "Highlight", icon: Highlighter, color: "text-yellow-400" },
      { label: "Underline", icon: Underline, color: "text-blue-500" },
      { label: "Strike", icon: Strikethrough, color: "text-red-500" },
      { label: "Sticky", icon: StickyNote, color: "text-yellow-400" },
    ];
    return (
      <div className="flex justify-center rounded-[28px] bg-[#f7f7f8] p-6 shadow-inner">
        <div className="relative flex items-center gap-1 overflow-hidden rounded-xl bg-[#121214]/95 p-1 text-white shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div
            className={`absolute inset-[-60%] h-[220%] w-[220%] ${
              motionEnabled ? "animate-[spin_4s_linear_infinite]" : ""
            }`}
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.08) 60%, transparent 100%)",
            }}
          />
          <div className="relative z-10 flex gap-1 border-r border-white/10 pr-1.5">
            {tools.map(({ label, icon: Icon, color }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTool(label)}
                title={label}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10 ${color} ${
                  activeTool === label ? "bg-white/10" : ""
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActiveTool("Ask")}
            className={`relative z-10 ml-1 flex items-center gap-1 overflow-hidden rounded-lg border border-indigo-400/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] ${
              activeTool === "Ask" ? "bg-indigo-400" : "bg-indigo-500"
            }`}
          >
            <span className="absolute inset-0 rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,255,255,0.04)_42%,rgba(129,140,248,0.32))]" />
            <MessageSquare size={12} className="relative z-10" />
            <span className="relative z-10">Ask Tutor</span>
          </button>
        </div>
      </div>
    );
  }

  if (id === "chat") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-[#fdfdfd] text-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200/70 bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(255,255,255,0.9)]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-black/5 bg-white shadow-sm">
              <Zap size={14} className="text-zinc-600" />
            </div>
            <div className="text-sm font-semibold">Tutor</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-medium shadow-sm">
            <Folder size={12} />
            App Design
          </div>
        </div>
        <div className="space-y-3 p-4">
          {chatMessages.slice(-2).map((message, index) => (
            <div
              key={`${message}-${index}`}
              className={
                index === 0
                  ? "ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-[#1c1c1e] px-3 py-2 text-xs font-medium text-white"
                  : "max-w-[88%] rounded-2xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700"
              }
            >
              {message}
            </div>
          ))}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-3 shadow-[0_14px_34px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Zap size={14} className="text-violet-500" />
              Reasoning trace
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                Complete
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">Answer ready.</div>
          </div>
        </div>
        <div className="p-3 pt-0">
          <div className="flex items-center gap-2 rounded-[24px] bg-[#18181b] p-2">
            <button
              type="button"
              onClick={() =>
                setChatMessages((messages) => [
                  ...messages,
                  "Explain this page with one analogy.",
                ])
              }
              className="flex-1 rounded-2xl px-3 py-2 text-left text-xs text-zinc-400"
            >
              Ask about the current page...
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (id === "thinking") {
    return (
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 text-left shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => setThinkingOpen((open) => !open)}
          aria-expanded={thinkingOpen}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none transition-colors hover:bg-zinc-50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Zap size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-zinc-900">
                  Reasoning trace
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Complete
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px] leading-snug text-zinc-500">
                Answer ready.
              </div>
            </div>
          </div>
          <span
            className={`transition-transform duration-200 ${
              thinkingOpen ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={16} className="text-zinc-400" />
          </span>
        </button>
          {thinkingOpen && (
            <div className="overflow-hidden border-t border-zinc-100">
              <div className="space-y-2 px-4 py-3 text-[12px] text-zinc-500">
                {["Retrieving relevant context", "Linking concepts"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-zinc-50 px-3 py-2"
                    >
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
      </div>
    );
  }

  if (id === "brain") {
    return (
      <div className="relative h-48 rounded-[30px] bg-[#07070a] p-4 shadow-2xl">
        {["Learner", "Memory", "Revision"].map((node, index) => {
          const positions = [
            "left-[18%] top-[48%]",
            "left-[48%] top-[25%]",
            "left-[70%] top-[62%]",
          ];
          return (
            <button
              key={node}
              type="button"
              onClick={() => setBrainFocus(node)}
              className={`absolute ${positions[index]} h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[color,background-color,border-color,box-shadow,transform,opacity] ${
                brainFocus === node
                  ? "bg-violet-400 shadow-[0_0_34px_rgba(167,139,250,0.82)]"
                  : "bg-blue-400/70 shadow-[0_0_22px_rgba(96,165,250,0.45)]"
              }`}
              aria-label={`Focus ${node}`}
            />
          );
        })}
        <div className="absolute left-[24%] top-[41%] h-px w-24 rotate-[-20deg] bg-white/30" />
        <div className="absolute left-[51%] top-[45%] h-px w-24 rotate-[31deg] bg-white/30" />
        <div className="absolute bottom-4 left-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          Focus: {brainFocus}
        </div>
      </div>
    );
  }

  if (id === "revision") {
    return (
      <div className="rounded-[28px] bg-[#faf9f6] p-5 shadow-2xl">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          Page {notebookPage}
        </div>
        <h4 className="mt-3 font-serif text-2xl font-medium">
          {notebookPage === 1 ? "Recall Prompt" : "Concept Notes"}
        </h4>
        <div className="mt-5 space-y-2">
          <div className="h-2 rounded-full bg-zinc-200" />
          <div className="h-2 w-5/6 rounded-full bg-zinc-200" />
          <div className="h-2 w-2/3 rounded-full bg-zinc-200" />
        </div>
        <button
          type="button"
          onClick={() => setNotebookPage((page) => (page === 1 ? 2 : 1))}
          className="mt-5 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white"
        >
          Turn page
        </button>
      </div>
    );
  }

  if (id === "settings") {
    return (
      <div className="rounded-[30px] border border-zinc-200 bg-[#faf9f6] p-4 text-zinc-950 shadow-2xl">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-inner">
          {["AI", "Voice", "Usage"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSettingsTab(tab)}
              className={`relative rounded-full py-2 text-[10px] font-semibold transition-colors ${
                settingsTab === tab
                  ? "text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-700"
              }`}
            >
              {settingsTab === tab && (
                <span
                  className="absolute inset-0 rounded-full bg-zinc-950/5 shadow-[0_8px_18px_rgba(24,24,27,0.08)]"
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
          <div
            key={settingsTab}
            className="mt-4 rounded-2xl border border-zinc-200 bg-white/80 p-4 text-xs text-zinc-600 shadow-sm"
          >
            <div className="flex items-center gap-2 font-semibold text-zinc-950">
              <Settings size={14} />
              {settingsTab} controls preview
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-200" />
            <div className="mt-2 h-2 w-2/3 rounded-full bg-zinc-200" />
          </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] bg-white p-4 shadow-2xl">
      <div className="mb-4 flex gap-2">
        {["Mastery", "Runtime"].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMetricMode(mode)}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
              metricMode === mode ? "bg-zinc-950 text-white" : "bg-zinc-100"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
      <div className="flex h-28 items-end gap-2">
        {(metricMode === "Mastery"
          ? [42, 68, 34, 86, 58]
          : [70, 40, 92, 55, 76]
        ).map((height, index) => (
          <div
            key={`${height}-${index}`}
            className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-500 to-emerald-300"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
};

const AppDesignLanguagePage = ({ chapterIndex }: { chapterIndex: number }) => {
  if (chapterIndex === 0) {
    return (
      <div className="font-sans text-zinc-900">
        <WireframeMap />
      </div>
    );
  }

  if (chapterIndex === 1) {
    return (
      <div className="font-sans text-zinc-900">
        <div className="grid gap-5 md:grid-cols-2">
          <GalleryPanel className="bg-[#09090b] text-white">
            <div className="mb-8 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Cosmic Obsidian
            </div>
            <div className="relative min-h-64 overflow-hidden rounded-[32px] border border-white/10 bg-[#030303] p-6 shadow-2xl">
              <div className="absolute -left-8 top-10 h-36 w-36 rounded-full bg-blue-500/25 blur-2xl" />
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-500/30 blur-2xl" />
              <div className="absolute bottom-0 right-8 h-24 w-24 rounded-full bg-orange-500/25 blur-xl" />
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 via-violet-500 to-orange-400 shadow-[0_0_40px_rgba(124,58,237,0.5)]" />
                <h3 className="mt-8 text-3xl font-semibold tracking-tight">
                  Dark learning surfaces stay cinematic and focused.
                </h3>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Glass, blur, neon, and spring motion are reserved for active
                  learning controls and AI state.
                </p>
              </div>
            </div>
          </GalleryPanel>

          <GalleryPanel className="bg-[#faf9f6]">
            <div className="mb-8 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Paper Counterpart
            </div>
            <div className="rounded-[32px] border border-zinc-200 bg-white/65 p-6 shadow-[0_24px_70px_rgba(46,36,22,0.12)]">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Revision
              </div>
              <h3 className="mt-5 font-serif text-3xl font-medium leading-tight">
                Review should feel like opening a careful notebook.
              </h3>
              <div className="mt-8 space-y-3">
                <div className="h-2 rounded-full bg-zinc-200" />
                <div className="h-2 w-5/6 rounded-full bg-zinc-200" />
                <div className="h-2 w-2/3 rounded-full bg-zinc-200" />
              </div>
            </div>
          </GalleryPanel>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {designTokens.map((token) => (
            <div
              key={token.label}
              className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-3 shadow-[0_14px_34px_rgba(24,24,27,0.08)]"
            >
              <div
                className={`h-10 w-10 rounded-2xl border border-zinc-200 ${token.swatch}`}
              />
              <div>
                <div className="text-sm font-semibold">{token.label}</div>
                <div className="font-mono text-xs text-zinc-400">
                  {token.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans text-zinc-900">
      <div className="grid gap-5 md:grid-cols-2">
        {snapshotCards.map((card) => (
          <GalleryPanel key={card.title} className="min-h-[250px]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Snapshot
                </div>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  {card.title}
                </h3>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-zinc-400 shadow-sm">
                UI
              </div>
            </div>
            <div className="flex min-h-36 items-center justify-center rounded-[30px] bg-white/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="w-full max-w-xs">
                <LiveComponentPreview id={card.id} />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              {card.caption}
            </p>
          </GalleryPanel>
        ))}
      </div>
    </div>
  );
};

const builtInBooks: BuiltInBook[] = [
  {
    id: "tutor-book",
    name: "Tutor System Architecture",
    description:
      "Complete guide to the underlying pedagogical models and technical architecture of the AI Tutor.",
    hiddenKey: "tutor_book_hidden",
    chapters: tutorBook,
  },
  {
    id: "app-design-language",
    name: "App Design Language",
    description:
      "Wireframe connections, theme rules, and rendered UI component snapshots for the Tutor interface.",
    hiddenKey: "app_design_language_book_hidden",
    chapters: [
      { title: "Wireframe Connections" },
      { title: "Theme System" },
      { title: "UI Component Snapshots" },
    ],
    renderChapter: (chapterIndex) => (
      <AppDesignLanguagePage chapterIndex={chapterIndex} />
    ),
  },
];

const builtInBookIds = new Set(builtInBooks.map((book) => book.id));

const createBuiltInBookConcept = (book: BuiltInBook): PersistentConcept => ({
  id: book.id,
  name: book.name,
  mastery: 0,
  confidence: 0,
  description: book.description,
  p_learn: 0.2,
  p_transit: 0.1,
  p_slip: 0.1,
  p_guess: 0.2,
  attempt_history: [],
  decay_factor: 1,
  prerequisites: [],
  relatedConcepts: [],
  sourcePages: [],
  revisionCount: 0,
  lastReviewedAt: Date.now(),
  firstLearnedAt: Date.now(),
  linkedAnnotations: [],
});

const LongPressWrapper = ({
  onLongPress,
  onClick,
  children,
}: {
  onLongPress: () => void;
  onClick: () => void;
  children: (pressing: boolean) => React.ReactNode;
}) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const mounted = useRef(true);
  const [pressing, setPressing] = useState(false);

  const clearTimer = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const clearPress = React.useCallback(() => {
    clearTimer();
    if (mounted.current) setPressing(false);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      mounted.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <div
      onPointerDown={() => {
        isLongPress.current = false;
        setPressing(true);
        timer.current = setTimeout(() => {
          if (!mounted.current) return;
          isLongPress.current = true;
          setPressing(false);
          onLongPress();
        }, 800);
      }}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
      onPointerCancel={clearPress}
      onClick={() => {
        if (!isLongPress.current) {
          onClick();
        }
      }}
      className="relative cursor-pointer select-none"
    >
      {children(pressing)}
    </div>
  );
};

const FlashcardUI = React.memo(
  ({
    card,
    onReview,
  }: {
    card: Flashcard;
    onReview: (quality: number) => void;
  }) => {
    const [flipped, setFlipped] = useState(false);

    return (
      <div className="w-full max-w-sm mx-auto mb-8 h-[240px] relative perspective-[1000px]">
        <div
          className="w-full h-full relative cursor-pointer"
          style={{
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
            transformStyle: "preserve-3d",
            transition: "transform 420ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <div
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-xl"
            style={{
              opacity: flipped ? 0 : 1,
              transition: `opacity 120ms ease ${flipped ? "0ms" : "100ms"}`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: flipped ? "none" : "auto",
            }}
          >
            <div className="text-center overflow-y-auto">
              <span className="text-xs font-mono text-zinc-500 mb-4 block">
                QUESTION
              </span>
              <p className="text-lg font-serif text-white">{card.front}</p>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 w-full h-full flex flex-col p-6 bg-white/5 border border-white/10 rounded-2xl shadow-xl bg-gradient-to-br from-[#1A1A1E] to-[#0A0A0B]"
            style={{
              transform: "rotateY(180deg)",
              opacity: flipped ? 1 : 0,
              transition: `opacity 120ms ease ${flipped ? "100ms" : "0ms"}`,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: flipped ? "auto" : "none",
            }}
          >
            <div className="flex-1 flex items-center justify-center text-center mb-4 overflow-y-auto w-full">
              <div className="w-full">
                <span className="text-xs font-mono text-zinc-500 mb-2 block">
                  ANSWER
                </span>
                <p className="text-[15px] font-serif text-white leading-relaxed">
                  {card.back}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 border-t border-white/5 pt-3 mt-auto shrink-0 relative z-10 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(0);
                }}
                className="text-[10px] font-mono py-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                AGAIN
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(2);
                }}
                className="text-[10px] font-mono py-2 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
              >
                HARD
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(4);
                }}
                className="text-[10px] font-mono py-2 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
              >
                GOOD
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                  onReview(5);
                }}
                className="text-[10px] font-mono py-2 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                EASY
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const FlashcardDeck = ({
  cards,
  totalCount,
  dueCount,
  onReview,
}: {
  cards: Flashcard[];
  totalCount: number;
  dueCount: number;
  onReview: (card: Flashcard, quality: number) => void;
}) => {
  if (cards.length === 0) return null;

  return (
    <div className="rounded-[28px] border border-zinc-900/10 bg-white/55 p-5 shadow-[0_24px_70px_rgba(46,36,22,0.14)] backdrop-blur-sm md:p-7">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-700">
            <Zap size={16} />
            Active Recall
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Flashcards
          </h2>
        </div>
        <div className="rounded-full border border-zinc-900/10 bg-[#faf9f6] px-3 py-1.5 text-xs font-medium text-zinc-600">
          {dueCount > 0 ? `${dueCount} due now` : `Next review queued`} ·{" "}
          {totalCount} total
        </div>
      </div>

        {cards.slice(0, 1).map((card) => (
          <div
            key={card.id}
          >
            <FlashcardUI
              card={card}
              onReview={(quality) => onReview(card, quality)}
            />
          </div>
        ))}
    </div>
  );
};

export function RevisionView() {
  const setActiveView = useStore((state) => state.setActiveView);
  const accessMode = useStore((state) => state.accessMode);
  const activeLearningBookId = useStore((state) => state.activeLearningBookId);
  const setActiveLearningBookId = useStore(
    (state) => state.setActiveLearningBookId,
  );
  const setActiveProject = useStore((state) => state.setActiveProject);
  const [libraryRevision, setLibraryRevision] = useState(0);

  const concepts = React.useMemo(
    () =>
      builtInBooks
        .filter((book) => localStorage.getItem(book.hiddenKey) !== "1")
        .map(createBuiltInBookConcept),
    [libraryRevision],
  );

  const learningBooks =
    useLiveQuery(
      () => db.learningBooks.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const visibleLearningBooks = learningBooks;
  const learningBookConcepts =
    useLiveQuery(
      () => db.learningBookConcepts.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const learningEntries =
    useLiveQuery(
      () =>
        db.learningEntries.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];

  const flashcards =
    useLiveQuery(async () => {
      try {
        return await db.flashcards.toArray();
      } catch (error) {
        console.warn("[RevisionView] Flashcards unavailable:", error);
        return [];
      }
    }, []) || [];

  const conceptsByBookId = React.useMemo(() => {
    const map = new Map<string, typeof learningBookConcepts>();
    learningBookConcepts.forEach((concept) => {
      const bucket = map.get(concept.bookId) || [];
      bucket.push(concept);
      map.set(concept.bookId, bucket);
    });
    return map;
  }, [learningBookConcepts]);

  const entriesByBookId = React.useMemo(() => {
    const map = new Map<string, typeof learningEntries>();
    learningEntries.forEach((entry) => {
      const bucket = map.get(entry.bookId) || [];
      bucket.push(entry);
      map.set(entry.bookId, bucket);
    });
    return map;
  }, [learningEntries]);

  const flashcardsByBookId = React.useMemo(() => {
    const map = new Map<string, Flashcard[]>();
    flashcards.forEach((card) => {
      if (!card.bookId) return;
      const bucket = map.get(card.bookId) || [];
      bucket.push(card);
      map.set(card.bookId, bucket);
    });
    return map;
  }, [flashcards]);

  const generalStudyFlashcards = React.useMemo(
    () => flashcards.filter((card) => !card.bookId),
    [flashcards],
  );

  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<LibraryDeleteTarget | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unhideCoreKey = "revision_core_books_visible_v1";
    if (localStorage.getItem(unhideCoreKey) !== "1") {
      try {
        localStorage.removeItem("tutor_book_hidden");
        localStorage.removeItem("app_design_language_book_hidden");
        localStorage.setItem(unhideCoreKey, "1");
        setLibraryRevision((version) => version + 1);
      } catch (error) {
        console.warn(
          "[RevisionView] Core book visibility sync skipped:",
          error,
        );
      }
    }
  }, []);

  const handleReview = async (card: Flashcard, quality: number) => {
    const nextDays = quality >= 4 ? 3 * (quality - 2) : 1;
    await db.flashcards.update(card.id, {
      nextReviewAt: Date.now() + nextDays * 24 * 60 * 60 * 1000,
    });
  };

  const sampleNotes = React.useMemo<Record<string, string>>(
    () => ({
      "tutor-book": tutorBook
        .map((chapter) => chapter.content)
        .join("\n\n---\n\n"),
    }),
    [],
  );

  const activeConcept = concepts.find((c) => c.id === activeConceptId);
  const activeBuiltInBook = builtInBooks.find(
    (book) => book.id === activeConcept?.id,
  );
  const activeLearningBook = learningBooks.find(
    (book) => book.id === activeConceptId,
  );
  const flashcardsForBook = React.useCallback(
    (book: LearningBook) => {
      const directCards = flashcardsByBookId.get(book.id) || [];
      if (book.title.toLowerCase() !== "general study") return directCards;
      return [...directCards, ...generalStudyFlashcards];
    },
    [flashcardsByBookId, generalStudyFlashcards],
  );
  const activeBookFlashcards = React.useMemo(
    () => (activeLearningBook ? flashcardsForBook(activeLearningBook) : []),
    [activeLearningBook, flashcardsForBook],
  );
  const activeDueFlashcards = React.useMemo(() => {
    const now = Date.now();
    return activeBookFlashcards
      .filter((card) => card.nextReviewAt <= now)
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
  }, [activeBookFlashcards]);
  const activeReviewQueue = React.useMemo(
    () =>
      activeDueFlashcards.length > 0
        ? activeDueFlashcards
        : [...activeBookFlashcards].sort(
            (a, b) => a.nextReviewAt - b.nextReviewAt,
          ),
    [activeBookFlashcards, activeDueFlashcards],
  );

  useEffect(() => {
    const pendingBookId = localStorage.getItem("revision_open_book_id");
    if (!pendingBookId) return;
    const canOpenBook =
      builtInBookIds.has(pendingBookId) ||
      learningBooks.some((book) => book.id === pendingBookId);
    if (!canOpenBook) return;
    setCurrentChapterIndex(0);
    setActiveConceptId(pendingBookId);
    localStorage.removeItem("revision_open_book_id");
  }, [learningBooks]);

  const cleanRevisionNote = React.useCallback(
    (value?: string) =>
      String(value || "")
        .replace(/\bPrompt:\s*/gi, "")
        .replace(/\bLearning note:\s*/gi, "")
        .replace(
          /\bReview hook:\s*restate the idea in your own words, identify the key mechanism, and test it with a fresh example\.?/gi,
          "",
        )
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    [],
  );

  const learningBookMarkdown = React.useCallback(
    (book: LearningBook) => {
      const conceptsForBook = conceptsByBookId.get(book.id) || [];
      const entriesForBook = entriesByBookId.get(book.id) || [];
      const chapterText = (book.chapters || []).length
        ? book.chapters
            .map((chapter, index) => {
              const chapterConceptIds = new Set(chapter.conceptIds);
              const chapterConcepts = conceptsForBook
                .filter((concept) => chapterConceptIds.has(concept.id))
                .map((concept) => concept.name);
              return `### Chapter ${index + 1}: ${chapter.title}\n${cleanRevisionNote(chapter.summary) || "Chapter summary pending."}${chapterConcepts.length ? `\n\nConcepts: ${chapterConcepts.join(", ")}` : ""}`;
            })
            .join("\n\n")
        : "No chapters mapped yet.";
      const conceptText = conceptsForBook.length
        ? conceptsForBook
            .map((concept) => {
              const branches = concept.childConcepts.length
                ? `\n  - Branches: ${concept.childConcepts.join(", ")}`
                : "";
              const parents = concept.parentConcepts.length
                ? `\n  - Parent concepts: ${concept.parentConcepts.join(", ")}`
                : "";
              return `### ${concept.name}\n${cleanRevisionNote(concept.summary) || "Summary pending."}${parents}${branches}`;
            })
            .join("\n\n")
        : "No concepts mapped yet.";
      const entryText = entriesForBook
        .slice(0, 5)
        .map(
          (entry, index) =>
            `### Page ${index + 1}\n${cleanRevisionNote(entry.conversationSummary || entry.assistantSummary) || "Learning note pending."}`,
        )
        .join("\n\n");
      return `## Overview\n${cleanRevisionNote(book.overview) || "Overview pending."}\n\n## Knowledge Summary\n${cleanRevisionNote(book.knowledgeSummary || book.summary) || "Summary pending."}\n\n## Chapters\n${chapterText}\n\n## Mapped Concepts\n${conceptText}\n\n## Learning Pages\n${entryText || "No learning notes recorded yet."}`;
    },
    [cleanRevisionNote, conceptsByBookId, entriesByBookId],
  );

  const formatLearningChapterPage = React.useCallback(
    (book: LearningBook, index: number) => {
      const chapter = book.chapters?.[index];
      if (!chapter) return learningBookMarkdown(book);
      const chapterConceptIds = new Set(chapter.conceptIds);
      const conceptsForChapter = (conceptsByBookId.get(book.id) || []).filter(
        (concept) => chapterConceptIds.has(concept.id),
      );
      const note =
        cleanRevisionNote(chapter.summary) ||
        cleanRevisionNote(book.summary) ||
        "This chapter is ready for notes from the next tutor exchange.";
      const conceptText = conceptsForChapter.length
        ? conceptsForChapter
            .map(
              (concept) =>
                `### ${concept.name}\n${cleanRevisionNote(concept.summary) || "Summary pending."}`,
            )
            .join("\n\n")
        : "No mapped concepts yet.";
      return `## Chapter ${index + 1}: ${chapter.title}\n\n${note}\n\n## Concepts To Revise\n\n${conceptText}\n\n## Review Check\n\nExplain the key idea in your own words, name the mechanism that makes it work, and apply it to one fresh example.`;
    },
    [cleanRevisionNote, conceptsByBookId, learningBookMarkdown],
  );
  const isBuiltInBook = Boolean(activeBuiltInBook);
  const activeTitle = activeLearningBook?.title || activeConcept?.name || "";
  const activeChapterCount = activeBuiltInBook
    ? activeBuiltInBook.chapters.length
    : activeLearningBook?.chapters?.length || 0;
  const activeMarkdown = React.useMemo(() => {
    if (activeBuiltInBook) {
      return activeBuiltInBook.chapters[currentChapterIndex]?.content || "";
    }
    if (activeLearningBook) {
      return activeLearningBook.chapters &&
        activeLearningBook.chapters.length > 0
        ? formatLearningChapterPage(activeLearningBook, currentChapterIndex)
        : learningBookMarkdown(activeLearningBook);
    }
    if (!activeConcept) return "";
    return (
      sampleNotes[activeConcept.id as keyof typeof sampleNotes] ||
      activeConcept.description ||
      "Notes unavailable."
    );
  }, [
    activeBuiltInBook,
    activeConcept,
    activeLearningBook,
    currentChapterIndex,
    formatLearningChapterPage,
    learningBookMarkdown,
    sampleNotes,
  ]);

  const scrollBookToTop = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior });
    });
  };

  const returnToLibrary = () => {
    setActiveConceptId(null);
    setCurrentChapterIndex(0);
    scrollBookToTop("auto");
  };

  const selectChapter = (index: number) => {
    setCurrentChapterIndex(index);
    scrollBookToTop();
  };

  const deleteLearningBookRecords = React.useCallback(async (bookId: string) => {
    await db.transaction(
      "rw",
      db.learningBooks,
      db.learningBookConcepts,
      db.learningEntries,
      db.flashcards,
      async () => {
        const relatedFlashcardIds = (
          await db.flashcards
            .filter((card) => card.bookId === bookId)
            .toArray()
        ).map((card) => card.id);
        await db.learningBookConcepts.where("bookId").equals(bookId).delete();
        await db.learningEntries.where("bookId").equals(bookId).delete();
        if (relatedFlashcardIds.length > 0) {
          await db.flashcards.bulkDelete(relatedFlashcardIds);
        }
        await db.learningBooks.delete(bookId);
      },
    );
  }, []);

  useEffect(() => {
    const cleanSlateKey = "revision_clean_slate_default_books_v1";
    if (localStorage.getItem(cleanSlateKey) === "1") return;
    let cancelled = false;

    void (async () => {
      try {
        const books = await db.learningBooks.toArray();
        await Promise.all(
          books.map((book) => deleteLearningBookRecords(book.id)),
        );
        if (cancelled) return;
        localStorage.setItem(cleanSlateKey, "1");
        if (activeLearningBookId) {
          setActiveLearningBookId(null);
          setActiveProject("General Study");
        }
        setActiveConceptId((current) =>
          current && books.some((book) => book.id === current) ? null : current,
        );
      } catch (error) {
        console.warn("[RevisionView] Clean slate reset skipped:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeLearningBookId,
    deleteLearningBookRecords,
    setActiveLearningBookId,
    setActiveProject,
  ]);

  const deleteConcept = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "built-in") {
        const builtInDeleteTarget = builtInBooks.find(
          (book) => book.id === deleteTarget.id,
        );
        if (builtInDeleteTarget) {
          localStorage.setItem(builtInDeleteTarget.hiddenKey, "1");
        }
        setLibraryRevision((version) => version + 1);
      } else {
        await deleteLearningBookRecords(deleteTarget.id);
        if (activeLearningBookId === deleteTarget.id) {
          setActiveLearningBookId(null);
          setActiveProject("General Study");
        }
      }
    } catch (error) {
      console.warn(
        "[RevisionView] Book delete could not update IndexedDB:",
        error,
      );
    }
    if (activeConceptId === deleteTarget.id) {
      setActiveConceptId(null);
    }
    setDeleteTarget(null);
  };

  return (
    <div
      ref={scrollRef}
      className="w-full h-full bg-[#faf9f6] text-zinc-900 flex flex-col overflow-y-auto custom-scroll pt-20 md:pt-0 relative"
    >
      {/* Subtle Paper Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
        }}
      />
      {activeConcept || activeLearningBook ? (
        <div className="min-h-full flex w-full relative z-10 pt-24 md:pt-28 lg:pt-24 shrink-0">
          {/* Sidebar Navigation */}
          {(isBuiltInBook || activeLearningBook) && (
            <div className="sticky top-24 hidden h-[calc(100vh-96px)] w-72 flex-shrink-0 flex-col overflow-hidden border-r border-zinc-200/50 bg-[#faf9f6] px-4 py-5 self-start lg:flex">
              <div className="z-20 flex-shrink-0 border-b border-zinc-200/70 bg-[#faf9f6] pb-4 shadow-[0_14px_28px_rgba(250,249,246,0.96)]">
                <div className="mb-3 line-clamp-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                  {activeTitle}
                </div>
                <button
                  onClick={returnToLibrary}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <Menu size={16} /> Back to Library
                </button>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-6 px-3">
                  Contents
                </div>
              </div>
              <nav className="custom-scroll -mr-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-4 pr-2">
                {(
                  activeBuiltInBook?.chapters ||
                  activeLearningBook?.chapters ||
                  []
                ).map((ch: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => selectChapter(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ${idx === currentChapterIndex ? "bg-zinc-900 text-white font-medium shadow-sm border border-zinc-900" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
                  >
                    <span className="line-clamp-2 leading-snug">
                      {ch.title}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div className="flex-1 flex flex-col w-full relative">
            {/* Header for mobile or non-book views */}
            <div className="sticky left-0 right-0 top-16 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/70 bg-[#faf9f6] px-4 py-3 shadow-[0_14px_28px_rgba(250,249,246,0.98)] md:top-20 md:px-6 md:py-4 lg:hidden">
              <button
                onClick={returnToLibrary}
                className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Menu size={16} /> Back to Library
              </button>
              <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-wide text-zinc-800 md:max-w-md">
                {activeTitle}
              </div>
              <div className="w-16"></div>
            </div>
            {(isBuiltInBook || activeLearningBook) && (
              <div className="sticky top-[121px] z-40 border-b border-zinc-200/70 bg-[#faf9f6] px-4 py-3 shadow-[0_14px_28px_rgba(250,249,246,0.96)] md:top-[141px] lg:hidden">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Contents
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                  {(
                    activeBuiltInBook?.chapters ||
                    activeLearningBook?.chapters ||
                    []
                  ).map((ch: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => selectChapter(idx)}
                      className={`max-w-[min(220px,70vw)] shrink-0 rounded-full border px-3 py-2 text-left text-xs transition-colors ${idx === currentChapterIndex ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"}`}
                    >
                      <span className="line-clamp-1">{ch.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative isolate mx-auto w-full max-w-4xl flex-1 p-5 sm:p-6 md:p-10 lg:p-16 xl:p-20">
                <div
                  key={currentChapterIndex}
                  className="relative z-10 font-serif pb-12"
                >
                  <div className="mb-10 border-b border-zinc-200 pb-8 pt-4 font-sans cursor-default">
                    <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-zinc-400 mb-6 block font-medium">
                      <span className="text-zinc-500 mr-2">#</span>
                      {isBuiltInBook
                        ? "Documentation"
                        : activeLearningBook
                          ? "Learning Book"
                          : "Concept Overview"}
                    </span>
                    <h1 className="text-3xl md:text-4xl lg:text-4xl font-medium tracking-tight text-zinc-900 mb-6 font-serif leading-[1.15]">
                      {activeBuiltInBook
                        ? activeBuiltInBook.chapters[currentChapterIndex]?.title
                        : activeLearningBook
                          ? activeLearningBook.chapters?.[currentChapterIndex]
                              ?.title || activeTitle
                          : activeTitle}
                    </h1>
                  </div>

                  {activeBuiltInBook?.renderChapter ? (
                    activeBuiltInBook.renderChapter(currentChapterIndex)
                  ) : (
                    <div className="prose prose-zinc w-full max-w-none prose-sm md:prose-base font-serif prose-p:leading-[1.8] prose-p:text-zinc-800 prose-p:font-light prose-p:my-5 prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-zinc-900 prose-li:leading-[1.8] prose-li:text-zinc-800 prose-li:font-light prose-ul:my-5 prose-pre:bg-zinc-100 prose-pre:text-zinc-800 prose-pre:border prose-pre:border-zinc-200 prose-pre:shadow-inner prose-pre:my-8 prose-code:before:content-none prose-code:after:content-none prose-code:bg-transparent prose-code:px-0 prose-code:py-0 prose-code:font-mono prose-code:text-[0.88em] prose-code:font-normal prose-code:text-zinc-700 prose-strong:text-zinc-900 prose-strong:font-medium selection:bg-zinc-200 selection:text-zinc-950">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeMarkdown}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

              {(isBuiltInBook || activeLearningBook) &&
                activeChapterCount > 1 && (
                  <div className="flex justify-between items-center mt-12 pt-8 border-t border-zinc-200/50 font-sans">
                    <button
                      disabled={currentChapterIndex === 0}
                      onClick={() => {
                        selectChapter(Math.max(0, currentChapterIndex - 1));
                      }}
                      className="px-5 py-2.5 rounded-full border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-[color,background-color,border-color,box-shadow,transform,opacity] flex items-center gap-2"
                    >
                      &larr; Previous
                    </button>
                    <button
                      disabled={currentChapterIndex === activeChapterCount - 1}
                      onClick={() => {
                        selectChapter(
                          Math.min(
                            activeChapterCount - 1,
                            currentChapterIndex + 1,
                          ),
                        );
                      }}
                      className="px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-[color,background-color,border-color,box-shadow,transform,opacity] flex items-center gap-2 shadow-sm"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}

              {activeLearningBook && activeBookFlashcards.length > 0 && (
                <div className="mt-20 border-t border-zinc-200 pt-16 font-sans">
                  <FlashcardDeck
                    cards={activeReviewQueue}
                    totalCount={activeBookFlashcards.length}
                    dueCount={activeDueFlashcards.length}
                    onReview={handleReview}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-12 lg:p-16">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-3 md:mb-16">
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-zinc-900 mb-2">
              Library
            </h1>
            <div className="text-sm font-mono text-zinc-500">
              {visibleLearningBooks.length +
                concepts.length +
                (accessMode === "admin" ? 1 : 0)}{" "}
              Books
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {visibleLearningBooks.length === 0 && concepts.length === 0 && (
              <div className="col-span-full h-64 flex items-center justify-center text-zinc-500 border border-white/10 border-dashed rounded-3xl">
                No books discovered yet. Start chatting to learn new concepts.
              </div>
            )}
            {visibleLearningBooks.map((book, index) => {
              const theme = themes[index % themes.length];
              const conceptCount = conceptsByBookId.get(book.id)?.length || 0;
              const cardCount = flashcardsForBook(book).length;
              return (
                <LongPressWrapper
                  key={book.id}
                  onLongPress={() =>
                    setDeleteTarget({
                      id: book.id,
                      name: book.title,
                      kind: "learning",
                    })
                  }
                  onClick={() => {
                    setCurrentChapterIndex(0);
                    setActiveConceptId(book.id);
                  }}
                >
                  {(pressing) => (
                    <PatternCard
                      layoutId={`card-${book.id}`}
                      bgClass={theme.bg}
                      SvgComponent={theme.SvgComponent}
                      bloomColor={theme.bloom}
                      bloomOpacity={theme.bloomOpacity}
                      isPressing={pressing}
                      pressDotColor={
                        theme.text.includes("1f1f1f") ? "#ff6e00" : "#fefefe"
                      }
                      pressRingColor={
                        theme.text.includes("1f1f1f")
                          ? "rgba(255,110,0,0.58)"
                          : "rgba(254,254,254,0.58)"
                      }
                    >
                      <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                        <div
                          className={`text-[11px] font-mono font-bold uppercase tracking-[0.16em] opacity-65 ${theme.text}`}
                        >
                          Learning Book · {conceptCount} concepts
                          {cardCount > 0 ? ` · ${cardCount} cards` : ""}
                        </div>
                        <div
                          className={`text-[25px] font-medium tracking-tight leading-[1.05] ${theme.text}`}
                        >
                          {book.title}
                        </div>
                        <div
                          className={`text-[16px] font-light tracking-tight leading-[1.25] opacity-70 ${theme.text}`}
                        >
                          {book.overview ||
                            book.knowledgeSummary ||
                            book.summary ||
                            "DeepSeek trace is building this map."}
                        </div>
                      </div>
                    </PatternCard>
                  )}
                </LongPressWrapper>
              );
            })}
            {concepts.map((concept, index) => {
              const theme =
                themes[(index + visibleLearningBooks.length) % themes.length];
              return (
                <LongPressWrapper
                  key={concept.id}
                  onLongPress={() =>
                    setDeleteTarget({
                      id: concept.id,
                      name: concept.name,
                      kind: "built-in",
                    })
                  }
                  onClick={() => {
                    setCurrentChapterIndex(0);
                    setActiveConceptId(concept.id);
                  }}
                >
                  {(pressing) => (
                    <PatternCard
                      layoutId={`card-${concept.id}`}
                      bgClass={theme.bg}
                      SvgComponent={theme.SvgComponent}
                      bloomColor={theme.bloom}
                      bloomOpacity={theme.bloomOpacity}
                      isPressing={pressing}
                      pressDotColor={
                        theme.text.includes("1f1f1f") ? "#ff6e00" : "#fefefe"
                      }
                      pressRingColor={
                        theme.text.includes("1f1f1f")
                          ? "rgba(255,110,0,0.58)"
                          : "rgba(254,254,254,0.58)"
                      }
                    >
                      <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                        <div
                          className={`text-[25px] font-medium tracking-tight leading-[1.05] ${theme.text}`}
                        >
                          {concept.name}
                        </div>
                        <div
                          className={`text-[16px] font-light tracking-tight leading-[1.25] opacity-70 ${theme.text}`}
                        >
                          {concept.description}
                        </div>
                      </div>
                    </PatternCard>
                  )}
                </LongPressWrapper>
              );
            })}

            {accessMode === "admin" && (
              <PatternCard
                layoutId="card-admin-dashboard"
                onClick={() => setActiveView("admin")}
                bgClass="bg-[#ecebe9]"
                SvgComponent={SvgBeige}
                bloomColor="rgb(255, 110, 0)"
                bloomOpacity={0.18}
              >
                <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                  <div className="p-3 rounded-full w-fit mb-2 transition-colors bg-[#ff6e00]/10 text-[#ff6e00]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="text-[25px] font-medium tracking-tight leading-[1.05] text-[#1f1f1f]">
                    Admin
                    <br />
                    Dashboard
                  </div>
                  <div className="text-[16px] font-light tracking-tight leading-[1.25] opacity-70 text-[#1f1f1f]">
                    View live DeepSeek LLM traces and server console logs.
                  </div>
                </div>
              </PatternCard>
            )}
          </div>
        </div>
      )}
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/35 px-4 backdrop-blur-sm"
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-zinc-900/10 bg-[#faf9f6] p-6 shadow-[0_30px_90px_rgba(46,36,22,0.28)]"
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.12]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 10%, rgba(255,110,0,0.28), transparent 34%), radial-gradient(circle at 85% 100%, rgba(17,24,39,0.12), transparent 30%)",
                }}
              />
              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-[#faf9f6] shadow-[0_16px_34px_rgba(24,24,27,0.22)]">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Delete book
                  </div>
                  <h2 className="mt-2 text-2xl font-serif font-medium leading-tight text-zinc-950">
                    Remove "{deleteTarget.name}"?
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    This removes the book from your revision library on this
                    device. The action keeps the rest of your notes and chat
                    history untouched.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 flex justify-end gap-3 border-t border-zinc-900/10 pt-4">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-full border border-zinc-900/10 bg-white/60 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-white hover:text-zinc-950"
                >
                  Keep book
                </button>
                <button
                  type="button"
                  onClick={deleteConcept}
                  className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-[#faf9f6] shadow-[0_14px_34px_rgba(24,24,27,0.22)] transition-colors hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
