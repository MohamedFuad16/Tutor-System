/** Tracks the scroll pane's width (debounced) and derives the page gutter and the fit-to-width page width. */
import { useLayoutEffect, useState, type RefObject } from "react";

const MAX_FIT_WIDTH = 1600;

export function useFitWidth(scrollRef: RefObject<HTMLDivElement | null>) {
  const [boxWidth, setBoxWidth] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setBoxWidth(el.clientWidth);
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      // Debounced: re-rendering the canvas on every frame of a pane drag is wasteful.
      timer = window.setTimeout(() => setBoxWidth(el.clientWidth), 90);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [scrollRef]);

  const gutter = boxWidth && boxWidth < 480 ? 12 : 28;
  const fitWidth = boxWidth ? Math.min(MAX_FIT_WIDTH, Math.max(160, boxWidth - gutter * 2)) : 0;
  return { gutter, fitWidth };
}
