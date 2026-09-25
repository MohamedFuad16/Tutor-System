/** Page-turn input for the reader: arrow / PageUp / PageDown keys and horizontal swipes. */
import { useEffect, useRef, type RefObject, type TouchEvent as ReactTouchEvent } from "react";

/** Keyboard paging, unless the learner is typing somewhere or a dialog is open. */
export function useKeyboardPaging(scrollRef: RefObject<HTMLDivElement | null>, turn: (delta: number) => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const delta =
        event.key === "ArrowLeft" || event.key === "PageUp"
          ? -1
          : event.key === "ArrowRight" || event.key === "PageDown"
            ? 1
            : 0;
      if (!delta) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))
      )
        return;
      const el = scrollRef.current;
      if (!el || el.getClientRects().length === 0) return; // hidden (e.g. mobile chat pane)
      if (document.querySelector("[role='dialog'][aria-modal='true']")) return;
      event.preventDefault();
      turn(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollRef, turn]);
}

/** Horizontal swipe turns the page; pinches, pans while zoomed in and selection drags are left alone. */
export function useSwipePaging(scrollRef: RefObject<HTMLDivElement | null>, turn: (delta: number) => void) {
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = (event: ReactTouchEvent) => {
    const touch = event.touches[0];
    touchRef.current =
      event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY, t: Date.now() } : null;
  };
  const onTouchMove = (event: ReactTouchEvent) => {
    if (event.touches.length > 1) touchRef.current = null; // pinch, not a swipe
  };
  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || Date.now() - start.t > 700) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const el = scrollRef.current;
    if (el && el.scrollWidth > el.clientWidth + 2) return; // zoomed in: the swipe pans instead
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // adjusting a text selection
    turn(dx < 0 ? 1 : -1);
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
