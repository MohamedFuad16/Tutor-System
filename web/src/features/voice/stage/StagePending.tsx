/**
 * What the stage shows while the tutor is fetching or making something: an
 * iris of light for a photo, the pen warming up for the board, a wireframe
 * assembling itself for a build, a sketch for a diagram. The same frame then
 * turns into the result, so the moment of arrival feels continuous.
 */
import { motion } from "motion/react";
import type { VisualKind } from "@shared/voice";
import { DiagramSkeleton } from "@/components/Diagram";

const LABELS: Record<string, string> = {
  images: "Finding the best photo",
  board: "Getting the board ready",
  diagram: "Drawing the diagram",
  build: "Building it",
  scene: "Building it",
  web: "Building it",
  markdown: "Working on it",
  page: "Opening your document",
};

function Iris() {
  return (
    <div aria-hidden className="relative flex h-full items-center justify-center">
      <span className="summon-rings" />
      <span className="scan-beam" />
    </div>
  );
}

function Cube() {
  return (
    <div aria-hidden className="flex h-full items-center justify-center [perspective:700px]">
      <div className="wire-cube">
        {["front", "back", "left", "right", "top", "bottom"].map((face) => (
          <span key={face} className={`wire-face wire-${face}`} />
        ))}
      </div>
    </div>
  );
}

function Pen() {
  return (
    <div aria-hidden className="stage-board relative h-full overflow-hidden">
      <div className="board-surface" />
      <svg
        viewBox="0 0 300 120"
        className="absolute inset-x-0 top-1/2 mx-auto w-[min(80%,420px)] -translate-y-1/2 overflow-visible"
      >
        <motion.path
          d="M20,70 C40,30 60,100 85,62 S120,30 140,66 S175,96 196,58 S238,34 280,64"
          fill="none"
          stroke="#67e8f9"
          strokeWidth={2.4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0.9, 0.9, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", times: [0, 0.75, 1] }}
          style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.6))" }}
        />
      </svg>
    </div>
  );
}

export function StagePending({ kind, title }: { kind: VisualKind | "build"; title: string }) {
  const body =
    kind === "images" ? (
      <Iris />
    ) : kind === "board" ? (
      <Pen />
    ) : kind === "diagram" ? (
      <div className="flex h-full items-center">
        <div className="w-full">
          <DiagramSkeleton tone="dark" />
        </div>
      </div>
    ) : kind === "markdown" ? (
      <div className="flex h-full flex-col justify-center gap-3 px-8">
        {[92, 78, 85, 60].map((width, index) => (
          <span
            key={index}
            className="h-3 animate-pulse rounded-full bg-white/8"
            style={{ width: `${width}%`, animationDelay: `${index * 0.15}s` }}
          />
        ))}
      </div>
    ) : (
      <Cube />
    );
  return (
    <div role="status" aria-label={`${LABELS[kind] ?? "Working"}: ${title}`}>
      <div className="relative h-[34vh] sm:h-[min(46vh,420px)] overflow-hidden rounded-[1.4rem] bg-black/25">
        {body}
      </div>
      <div className="mt-3 flex items-center gap-2 px-1 text-xs">
        <span className="shimmer-text text-fog-300">{LABELS[kind] ?? "Working on it"}</span>
        <span className="min-w-0 truncate text-fog-500">· {title}</span>
      </div>
    </div>
  );
}
