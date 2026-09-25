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

export type VoiceVisual =
  | { id: string; kind: "diagram"; diagram: Diagram }
  | { id: string; kind: "images"; query: string; images: WebImage[] }
  | { id: string; kind: "markdown"; title: string; markdown: string };

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
  | { type: "text"; text: string }
  /** Browser-STT only: the learner started talking (barge-in hint). */
  | { type: "speech_start" }
  /** Browser-STT only: interim transcript. */
  | { type: "partial"; text: string }
  | { type: "interrupt" }
  | { type: "playback"; seq: number; state: "start" | "end" }
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
  /** Sent right before the audio of a segment; `focus` highlights a diagram node while it plays. */
  | { type: "segment"; turnId: string; seq: number; text: string; focus?: { visualId: string; node: string } }
  | { type: "segment_end"; seq: number }
  | { type: "turn_end"; turnId: string; interrupted: boolean }
  /** Lower playback volume: the learner may be starting to talk. */
  | { type: "duck"; on: boolean }
  /** Stop and discard all queued audio immediately (barge-in). */
  | { type: "clear" }
  | { type: "visual"; visual: VoiceVisual }
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
