/**
 * Voice WebSocket protocol (/ws/voice).
 *
 * Text frames carry JSON messages below. Binary frames carry audio:
 *   client → server: raw PCM16 LE mono at the `sampleRate` announced in `hello`
 *   server → client: 4-byte little-endian segment sequence number + PCM16 LE
 *                    mono at `ready.outputSampleRate`
 * The sequence prefix lets the client drop audio of cancelled segments
 * instantly on barge-in, without waiting for in-flight frames to drain.
 */
import type { Diagram, DiagramStep, WebImage } from "./types.js";

// ---------------------------------------------------------------- stage content

/** A small function graph on the board ("x^2 - 5*x + 6"; see shared/expr.ts). */
export type BoardPlot = {
  fns: string[];
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  points?: Array<{ x: number; y: number; label?: string }>;
};

/** One line of magic-pen working: written while the tutor says it. */
export type BoardItem = {
  /** Stable id the narration points at ("L1", "L2", …). */
  id: string;
  kind: "math" | "text" | "plot";
  latex?: string;
  text?: string;
  plot?: BoardPlot;
  /** Short margin annotation in the pen's hand ("factor", "check"). */
  note?: string;
  /** Circle the line once written (the final answer). */
  box?: boolean;
};

export type Board = { title: string; items: BoardItem[] };

export type Vec3 = [number, number, number];

export type SceneShape =
  | "sphere"
  | "box"
  | "cylinder"
  | "cone"
  | "torus"
  | "ring"
  | "plane"
  | "capsule"
  | "arrow"
  | "line"
  | "label";

/** A declarative 3D object: the tutor describes, the client builds (no code runs). */
export type SceneObject = {
  id: string;
  shape: SceneShape;
  label?: string;
  /** One-line fact shown when the learner taps the object. */
  info?: string;
  position?: Vec3;
  /** Degrees. */
  rotation?: Vec3;
  /** Radius (sphere, cylinder, cone, torus, ring, capsule) or [width, height, depth]. */
  size?: number | Vec3;
  color?: string;
  opacity?: number;
  /** Self-lit and lighting its surroundings (a sun, a hot filament). */
  glow?: boolean;
  wireframe?: boolean;
  /** Endpoints for cylinder, arrow and line. */
  from?: Vec3;
  to?: Vec3;
  /** Path for line. */
  points?: Vec3[];
  /** Circles `center` (an object id or a point). Speed in turns per minute. */
  orbit?: { center?: string | Vec3; radius: number; speed?: number; tilt?: number; phase?: number };
  /** Turns per minute around its own vertical axis. */
  spin?: number;
};

export type Scene = {
  title: string;
  mood?: "space" | "studio" | "blueprint";
  camera?: { position?: Vec3; target?: Vec3 };
  objects: SceneObject[];
};

export type VoiceVisual =
  | { id: string; kind: "diagram"; diagram: Diagram }
  | { id: string; kind: "images"; query: string; images: WebImage[] }
  | { id: string; kind: "markdown"; title: string; markdown: string }
  | { id: string; kind: "board"; board: Board }
  | { id: string; kind: "scene"; scene: Scene }
  /** A generated web page, rendered in a sandboxed frame with an opaque origin. */
  | { id: string; kind: "web"; title: string; html: string };

export type VisualKind = VoiceVisual["kind"];

/** Camera and layout moves the tutor (or the learner, by voice) can make on the stage. */
export type StageView =
  | "zoom_in"
  | "zoom_out"
  | "reset"
  | "rotate"
  | "stop"
  | "next"
  | "previous"
  | "sideways"
  | "upright"
  | "ar";

export const STAGE_VIEWS: readonly StageView[] = [
  "zoom_in",
  "zoom_out",
  "reset",
  "rotate",
  "stop",
  "next",
  "previous",
  "sideways",
  "upright",
  "ar",
];

/** Stage tools: what the tutor does to the screen. */
export type StageCommand =
  /** Clear the screen; the orb returns to the centre. */
  | { kind: "close" }
  /** Point at one part of a visual: a diagram node, a board line, a 3D object. */
  | { kind: "focus"; visualId: string; target: string }
  | { kind: "view"; visualId: string; view: StageView }
  /** Work has started on something that will appear here (a placeholder animates meanwhile). */
  | { kind: "pending"; id: string; visual: VisualKind | "build"; title: string }
  /** The pending work finished or failed. */
  | { kind: "settled"; id: string };

export type ClientVoiceMessage =
  | {
      type: "hello";
      bookId: string;
      language: string;
      /** "server" streams mic audio for server STT; "browser" sends recognised text. */
      stt: "server" | "browser";
      /** "server" returns synthesized audio; "browser" speaks segments locally. */
      tts: "server" | "browser";
      sampleRate: number;
      focus?: { documentId?: string; page?: number; selection?: string };
    }
  | { type: "focus"; documentId?: string; page?: number; selection?: string }
  /** A finished learner utterance. `spoken` marks browser speech recognition (echo-checked). */
  | { type: "text"; text: string; spoken?: boolean }
  /** Browser-STT only: the learner started talking (barge-in hint). */
  | { type: "speech_start" }
  /** Browser-STT only: interim transcript. */
  | { type: "partial"; text: string }
  | { type: "interrupt" }
  | { type: "playback"; seq: number; state: "start" | "end" }
  /** The learner changed what is on screen (closed it, or went back to an earlier visual). */
  | { type: "stage"; visualId: string | null }
  | { type: "bye" };

export type VoiceState = "connecting" | "listening" | "thinking" | "speaking";

export type ServerVoiceMessage =
  | {
      type: "ready";
      sessionId: string;
      stt: "server" | "browser";
      tts: "server" | "browser";
      outputSampleRate: number;
      models: { fast: string; smart: string };
    }
  | { type: "state"; state: VoiceState }
  | { type: "user_partial"; text: string }
  | { type: "user_final"; turnId: string; text: string }
  /** Sent right before the audio of a segment; `focus` points at part of a visual (node, board line, object) while it plays. */
  | { type: "segment"; turnId: string; seq: number; text: string; focus?: { visualId: string; node: string } }
  | { type: "segment_end"; seq: number }
  | { type: "turn_end"; turnId: string; interrupted: boolean }
  /** Lower playback volume: the learner may be starting to talk. */
  | { type: "duck"; on: boolean }
  /** Stop and discard all queued audio immediately (barge-in). */
  | { type: "clear" }
  | { type: "visual"; visual: VoiceVisual }
  | { type: "stage"; command: StageCommand }
  | { type: "task"; id: string; title: string; status: "running" | "done" | "failed"; summary?: string }
  | { type: "error"; message: string; fatal: boolean };

export type { DiagramStep };

/** Prefix a PCM chunk with its segment sequence number. */
export function packAudio(seq: number, pcm: Uint8Array): Uint8Array {
  const out = new Uint8Array(pcm.byteLength + 4);
  new DataView(out.buffer).setUint32(0, seq >>> 0, true);
  out.set(pcm, 4);
  return out;
}

export function unpackAudio(frame: ArrayBuffer): { seq: number; pcm: Int16Array } {
  const view = new DataView(frame);
  const seq = view.getUint32(0, true);
  const bytes = frame.byteLength - 4;
  return { seq, pcm: new Int16Array(frame, 4, Math.floor(bytes / 2)) };
}
