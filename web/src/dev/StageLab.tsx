/**
 * Dev-only bench for the voice stage (open the dev server at #stagelab, or
 * #stagelab/board, #stagelab/scene, #stagelab/molecule, #stagelab/web,
 * #stagelab/images, #stagelab/diagram, #stagelab/pending). Renders each stage
 * view in the voice-mode layout with sample content and buttons that play the
 * tutor's part: narrate, point, zoom, turn, close. Not in production builds.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { StageView, VoiceVisual } from "@shared/voice";
import { softSpring } from "@/components/ui";
import { StageContent } from "@/features/voice/stage/Stage";
import { StagePending } from "@/features/voice/stage/StagePending";
import { VoiceOrb } from "@/features/voice/VoiceOrb";

const photo = (hue: number, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,62%)"/><stop offset="1" stop-color="hsl(${hue + 40},60%,22%)"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#s)"/><circle cx="1180" cy="300" r="120" fill="hsl(${hue - 30},90%,85%)" opacity="0.9"/><path d="M0 760 L260 520 L420 640 L640 380 L900 700 L1120 480 L1360 690 L1600 560 L1600 1000 L0 1000Z" fill="hsl(${hue + 60},35%,14%)"/><path d="M0 860 L300 700 L560 820 L820 640 L1100 840 L1400 720 L1600 800 L1600 1000 L0 1000Z" fill="hsl(${hue + 70},30%,9%)"/><text x="80" y="140" font-family="Georgia" font-size="64" fill="white" opacity="0.85">${label}</text></svg>`,
  )}`;

const SAMPLES: Record<string, VoiceVisual> = {
  images: {
    id: "lab-images",
    kind: "images",
    query: "Mount Fuji at dawn",
    images: [
      {
        title: "Mount Fuji at dawn",
        imageUrl: photo(20, "Mount Fuji"),
        thumbnailUrl: photo(20, ""),
        sourceUrl: "#",
        domain: "commons.wikimedia.org",
        width: 1600,
        height: 1000,
      },
      {
        title: "Fuji over Lake Kawaguchi",
        imageUrl: photo(200, "Lake Kawaguchi"),
        thumbnailUrl: photo(200, ""),
        sourceUrl: "#",
        domain: "en.wikipedia.org",
        width: 1600,
        height: 1000,
      },
      {
        title: "Fuji in winter",
        imageUrl: photo(260, "Winter"),
        thumbnailUrl: photo(260, ""),
        sourceUrl: "#",
        domain: "nationalgeographic.com",
        width: 1600,
        height: 1000,
      },
    ],
  },
  board: {
    id: "lab-board",
    kind: "board",
    board: {
      title: "Solving x² − 5x + 6 = 0",
      items: [
        { id: "L1", kind: "math", latex: "x^2 - 5x + 6 = 0", note: "start here" },
        { id: "L2", kind: "text", text: "Find two numbers: product 6, sum −5" },
        { id: "L3", kind: "math", latex: "(x - 2)(x - 3) = 0", note: "factor" },
        { id: "L4", kind: "math", latex: "x - 2 = 0 \\quad\\text{or}\\quad x - 3 = 0" },
        {
          id: "L5",
          kind: "plot",
          text: "The curve crosses zero at 2 and 3",
          plot: {
            fns: ["x^2 - 5*x + 6"],
            xMin: -0.5,
            xMax: 5.5,
            points: [
              { x: 2, y: 0, label: "x = 2" },
              { x: 3, y: 0, label: "x = 3" },
              { x: 2.5, y: -0.25, label: "vertex" },
            ],
          },
        },
        { id: "L6", kind: "math", latex: "x = 2 \\;\\text{or}\\; x = 3", box: true },
      ],
    },
  },
  scene: {
    id: "lab-scene",
    kind: "scene",
    scene: {
      title: "The inner solar system",
      mood: "space",
      objects: [
        {
          id: "sun",
          shape: "sphere",
          label: "Sun",
          info: "A star: 99.8% of the solar system's mass.",
          size: 2.2,
          color: "#ffb347",
          glow: true,
        },
        {
          id: "mercury",
          shape: "sphere",
          label: "Mercury",
          info: "Closest to the Sun; a year lasts 88 days.",
          size: 0.3,
          color: "#b8a99a",
          orbit: { center: "sun", radius: 4, speed: 10, phase: 30 },
        },
        {
          id: "venus",
          shape: "sphere",
          label: "Venus",
          info: "The hottest planet, under thick clouds.",
          size: 0.5,
          color: "#e8c07a",
          orbit: { center: "sun", radius: 6, speed: 7, phase: 150 },
        },
        {
          id: "earth",
          shape: "sphere",
          label: "Earth",
          info: "Our home. One year is one orbit.",
          size: 0.55,
          color: "#3b82f6",
          orbit: { center: "sun", radius: 8.5, speed: 5, phase: 250 },
          spin: 20,
        },
        {
          id: "moon",
          shape: "sphere",
          label: "Moon",
          size: 0.16,
          color: "#d4d4d8",
          orbit: { center: "earth", radius: 1.1, speed: 20 },
        },
        {
          id: "mars",
          shape: "sphere",
          label: "Mars",
          info: "The red planet, with the tallest volcano.",
          size: 0.4,
          color: "#ef4444",
          orbit: { center: "sun", radius: 11, speed: 3.5, phase: 60 },
        },
        {
          id: "saturn",
          shape: "sphere",
          label: "Saturn",
          size: 1.1,
          color: "#e7d3a3",
          orbit: { center: "sun", radius: 15, speed: 1.5, phase: 200 },
        },
      ],
    },
  },
  molecule: {
    id: "lab-molecule",
    kind: "scene",
    scene: {
      title: "A water molecule",
      mood: "studio",
      objects: [
        {
          id: "o",
          shape: "sphere",
          label: "Oxygen",
          info: "Pulls shared electrons toward itself.",
          size: 1,
          color: "#ef4444",
          position: [0, 0, 0],
        },
        { id: "h1", shape: "sphere", label: "Hydrogen", size: 0.6, color: "#f4f4f5", position: [1.25, -0.95, 0] },
        { id: "h2", shape: "sphere", label: "Hydrogen", size: 0.6, color: "#f4f4f5", position: [-1.25, -0.95, 0] },
        { id: "b1", shape: "cylinder", from: [0, 0, 0], to: [1.25, -0.95, 0], size: 0.14, color: "#d4d4d8" },
        { id: "b2", shape: "cylinder", from: [0, 0, 0], to: [-1.25, -0.95, 0], size: 0.14, color: "#d4d4d8" },
        {
          id: "dipole",
          shape: "arrow",
          label: "Dipole",
          info: "The molecule is polar: oxygen end slightly negative.",
          from: [0, -2.4, 0],
          to: [0, 1.8, 0],
          size: 0.05,
          color: "#22d3ee",
        },
        { id: "angle", shape: "label", label: "104.5°", position: [0, -0.5, 0.8] },
      ],
    },
  },
  web: {
    id: "lab-web",
    kind: "web",
    title: "Crumb & Co. bakery",
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crumb & Co.</title><style>*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;background:#fbf6ef;color:#2b2118}header{padding:64px 8vw;background:linear-gradient(135deg,#f6d8b8,#fbf6ef)}h1{font-size:clamp(2.2rem,6vw,4rem);margin:0 0 12px}p{font-family:system-ui;line-height:1.6;max-width:36rem}button{margin-top:18px;padding:12px 22px;border:0;border-radius:999px;background:#c2410c;color:#fff;font:600 15px system-ui;cursor:pointer}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px;padding:40px 8vw}article{background:#fff;border-radius:18px;padding:22px;box-shadow:0 10px 30px -18px #5a3b1f}</style></head><body><header><h1>Crumb &amp; Co.</h1><p>Sourdough, croissants and cardamom buns, baked at 5 every morning.</p><button onclick="this.textContent='See you at 7!'">Reserve a loaf</button></header><section><article><h3>Country sourdough</h3><p>48-hour ferment, crackly crust.</p></article><article><h3>Butter croissant</h3><p>81 layers, French butter.</p></article><article><h3>Cardamom bun</h3><p>Swedish-style, knotted by hand.</p></article></section></body></html>`,
  },
  diagram: {
    id: "lab-diagram",
    kind: "diagram",
    diagram: {
      id: "lab-diagram",
      title: "How a REST API works",
      mermaid:
        "flowchart TD\n A([Client sends HTTP request]) --> B[DNS resolves to server]\n B --> C{Authentication check}\n C -->|Approved| D[Route to endpoint]\n C -->|Denied| G[401 error response]\n D --> E[(CRUD on database)]\n E --> F[Send HTTP response + JSON]\n F --> H([Client receives data])\n G --> H",
      steps: [],
    },
  },
};

const TARGETS: Record<string, string[]> = {
  board: ["L1", "L2", "L3", "L4", "L5", "L6"],
  scene: ["sun", "earth", "moon", "mars"],
  molecule: ["o", "h1", "dipole"],
  diagram: ["A", "C", "E", "F"],
};

const VIEWS: StageView[] = [
  "zoom_in",
  "zoom_out",
  "reset",
  "rotate",
  "stop",
  "next",
  "previous",
  "sideways",
  "upright",
];

export function StageLab() {
  const initial = location.hash.split("/")[1] ?? "board";
  const [kind, setKind] = useState(initial in SAMPLES || initial === "pending" ? initial : "board");
  const [shown, setShown] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setView] = useState<{ view: StageView; nonce: number } | null>(null);
  const [run, setRun] = useState(0);
  const visual = SAMPLES[kind];
  const targets = TARGETS[kind] ?? [];

  // Narrate: point at each target in turn, like the tutor's tour.
  const narrate = useMemo(
    () => () => {
      setRun((value) => value + 1);
      setFocus(null);
      targets.forEach((target, index) => window.setTimeout(() => setFocus(target), 1200 + index * 2600));
      window.setTimeout(() => setFocus(null), 1200 + targets.length * 2600);
    },
    [targets],
  );
  useEffect(() => {
    if (location.hash.endsWith("/auto")) narrate();
    // Once, on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbSize = shown ? 120 : 320;
  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-fog-50">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-20%] left-[10%] size-[60vmax] rounded-full bg-aura-violet/10 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-25%] size-[55vmax] rounded-full bg-aura-blue/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2 p-4 text-xs" data-lab-controls>
        {[...Object.keys(SAMPLES), "pending"].map((name) => (
          <button
            key={name}
            onClick={() => {
              setKind(name);
              setFocus(null);
              setShown(true);
              setRun((value) => value + 1);
            }}
            className={`rounded-full px-3 py-1 ${kind === name ? "bg-signal text-white" : "bg-white/8"}`}
          >
            {name}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-white/15" />
        <button onClick={narrate} className="rounded-full bg-white/8 px-3 py-1">
          narrate
        </button>
        {targets.map((target) => (
          <button key={target} onClick={() => setFocus(target)} className="rounded-full bg-white/8 px-3 py-1">
            {target}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-white/15" />
        {VIEWS.map((name) => (
          <button
            key={name}
            onClick={() => setView({ view: name, nonce: Date.now() })}
            className="rounded-full bg-white/8 px-3 py-1"
          >
            {name}
          </button>
        ))}
        <button onClick={() => setShown(!shown)} className="rounded-full bg-white/8 px-3 py-1">
          {shown ? "close" : "show"}
        </button>
      </div>
      <div
        className={`relative flex flex-1 items-center justify-center gap-10 px-6 pb-10 ${shown ? "flex-col lg:flex-row" : "flex-col"}`}
      >
        <motion.div
          layout
          className="relative shrink-0"
          animate={{ width: orbSize, height: orbSize }}
          transition={shown ? softSpring : { type: "spring", stiffness: 110, damping: 13 }}
        >
          <motion.div
            className="absolute top-1/2 left-1/2"
            style={{ width: 320, height: 320, x: "-50%", y: "-50%" }}
            animate={{ scale: orbSize / 320 }}
            transition={shown ? softSpring : { type: "spring", stiffness: 110, damping: 13 }}
          >
            <VoiceOrb
              state="speaking"
              bands={() =>
                ({
                  mic: { low: 0, mid: 0, high: 0, all: 0 },
                  out: { low: 0.3, mid: 0.2, high: 0.1, all: 0.25 },
                }) as never
              }
              levels={() => ({ mic: 0, out: 0.3 })}
              size={320}
            />
          </motion.div>
        </motion.div>
        <AnimatePresence mode="popLayout">
          {shown && (
            <motion.div
              key={`${kind}-${run}`}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 24, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
              transition={softSpring}
              className="liquid-glass relative w-full max-w-5xl rounded-[2rem] p-3 sm:p-5"
            >
              {kind === "pending" ? (
                <StagePending kind="images" title="Mount Fuji at dawn" />
              ) : (
                <StageContent
                  visual={visual}
                  focus={focus}
                  view={view}
                  instant={false}
                  onAsk={(text) => console.info("ask:", text)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
