/**
 * Routes a stage visual to its view. The heavy ones (the magic-pen board
 * with KaTeX, the three.js scene, the web preview) load on first use, with
 * the matching "being made" placeholder while their code arrives.
 */
import { Suspense, lazy } from "react";
import type { StageView, VoiceVisual } from "@shared/voice";
import { Diagram } from "@/components/Diagram";
import { Markdown } from "@/components/Markdown";
import { StageImage } from "./StageImage";
import { StagePending } from "./StagePending";

const StageBoard = lazy(() => import("./StageBoard"));
const StageScene = lazy(() => import("./StageScene"));
const StageWeb = lazy(() => import("./StageWeb"));

export type StageViewCommand = { view: StageView; nonce: number } | null;

export function visualTitle(visual: VoiceVisual) {
  switch (visual.kind) {
    case "images":
      return visual.query;
    case "diagram":
      return visual.diagram.title;
    case "board":
      return visual.board.title;
    case "scene":
      return visual.scene.title;
    default:
      return visual.title;
  }
}

export function StageContent({
  visual,
  focus,
  view,
  instant,
  onAsk,
}: {
  visual: VoiceVisual;
  /** The part being talked about (node id, board line, 3D part). */
  focus: string | null;
  view: StageViewCommand;
  /** Shown again from history: no build-up animation. */
  instant: boolean;
  onAsk: (text: string) => void;
}) {
  switch (visual.kind) {
    case "diagram":
      return (
        <Diagram
          source={visual.diagram.mermaid}
          title={visual.diagram.title}
          steps={visual.diagram.steps}
          activeNode={focus}
          theme="dark"
          variant="stage"
          view={view}
          onNodeClick={(_id, label) => onAsk(`Tell me more about the "${label}" step.`)}
        />
      );
    case "images":
      return <StageImage images={visual.images} query={visual.query} view={view} />;
    case "board":
      return (
        <Suspense fallback={<StagePending kind="board" title={visual.board.title} />}>
          <StageBoard board={visual.board} focus={focus} instant={instant} />
        </Suspense>
      );
    case "scene":
      return (
        <Suspense fallback={<StagePending kind="scene" title={visual.scene.title} />}>
          <StageScene scene={visual.scene} focus={focus} view={view} onAsk={onAsk} />
        </Suspense>
      );
    case "web":
      return (
        <Suspense fallback={<StagePending kind="web" title={visual.title} />}>
          <StageWeb title={visual.title} html={visual.html} />
        </Suspense>
      );
    case "markdown":
      return (
        <div className="scroll-quiet max-h-[60vh] overflow-y-auto">
          <h3 className="mb-3 text-sm tracking-wide text-fog-400 uppercase">{visual.title}</h3>
          <Markdown text={visual.markdown} tone="dark" />
        </div>
      );
  }
}
