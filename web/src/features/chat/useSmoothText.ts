/**
 * Paces streamed text for display. Tokens arrive in bursts (and faster or
 * slower depending on the model and network); revealing them at an even,
 * adaptive rate reads like fluent writing instead of stutter:
 *
 *  - base speed ~55 chars/s, rising with the backlog so the display never
 *    trails the stream by more than ~0.6 s;
 *  - reveals end on word boundaries, so words appear whole (and each one can
 *    fade in via rehypeStreamWords);
 *  - once the stream is done, the remainder flushes within ~0.3 s.
 *
 * Runs on requestAnimationFrame and only re-renders when the visible prefix
 * actually changes.
 */
import { useEffect, useRef, useState } from "react";

const BASE_CPS = 55;
const MAX_LAG_S = 0.6;
const FLUSH_S = 0.3;

/** Index just after the word that contains position `at`. */
function wordEnd(text: string, at: number) {
  if (at >= text.length) return text.length;
  const next = text.slice(at).search(/\s/);
  return next === -1 ? (at + 24 >= text.length ? text.length : at) : at + next;
}

/**
 * @param from Characters already on screen (e.g. a finished answer taking over
 *             from its streaming draft), so the reveal continues rather than restarts.
 */
export function useSmoothText(target: string, streaming: boolean, enabled = true, from?: number): string {
  const start = !enabled ? target.length : (from ?? (streaming ? 0 : target.length));
  const [shown, setShown] = useState(() => target.slice(0, start));
  const position = useRef(start);
  const revealed = useRef(target.slice(0, start));
  const targetRef = useRef(target);
  const streamingRef = useRef(streaming);
  targetRef.current = target;
  streamingRef.current = streaming;

  useEffect(() => {
    const show = (text: string) => {
      revealed.current = text;
      setShown(text);
    };
    if (!enabled) {
      position.current = target.length;
      show(target);
      return;
    }
    // A new turn, or an edit that isn't an append: start over.
    if (!target.startsWith(revealed.current)) position.current = 0;
    if (position.current >= target.length) {
      show(target);
      return;
    }
    let frame = 0;
    let last = performance.now();
    let rendered = -1;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const text = targetRef.current;
      const backlog = text.length - position.current;
      const cps = streamingRef.current
        ? Math.max(BASE_CPS, backlog / MAX_LAG_S)
        : Math.max(BASE_CPS * 2, backlog / FLUSH_S);
      position.current = Math.min(text.length, position.current + cps * dt);
      const end = wordEnd(text, Math.floor(position.current));
      if (end !== rendered) {
        rendered = end;
        show(text.slice(0, end));
      }
      if (position.current < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, streaming, enabled]);

  return enabled ? shown : target;
}

/** How much of each streamed answer was on screen when its stream ended (by message id). */
const handoff = new Map<string, number>();
export const rememberReveal = (id: string, length: number) => {
  handoff.set(id, length);
  if (handoff.size > 20) handoff.delete(handoff.keys().next().value!);
};
export const takeReveal = (id: string) => {
  const length = handoff.get(id);
  handoff.delete(id);
  return length;
};
