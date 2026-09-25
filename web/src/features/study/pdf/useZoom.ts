/** Page zoom: clamped/stepped zoom levels, point-anchored zooming and trackpad pinch / ctrl+wheel handling. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { clamp } from "./geometry";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

function clampZoom(value: number) {
  return Math.round(clamp(value, ZOOM_MIN, ZOOM_MAX) * 100) / 100;
}

function stepZoom(current: number, dir: 1 | -1) {
  if (dir > 0) return ZOOM_STEPS.find((step) => step > current + 0.001) ?? ZOOM_MAX;
  return [...ZOOM_STEPS].reverse().find((step) => step < current - 0.001) ?? ZOOM_MIN;
}

export function useZoom(
  scrollRef: RefObject<HTMLDivElement | null>,
  sheetRef: RefObject<HTMLDivElement | null>,
  fitWidth: number,
) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  const anchorRef = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null);
  const pageWidth = fitWidth ? Math.floor(fitWidth * zoom) : 0;

  const setZoomAt = useCallback(
    (value: number, point?: { x: number; y: number }) => {
      const next = clampZoom(value);
      if (next === zoomRef.current) return;
      const el = scrollRef.current;
      const sheet = sheetRef.current;
      if (el && sheet) {
        const view = el.getBoundingClientRect();
        const rect = sheet.getBoundingClientRect();
        const cx = point?.x ?? view.left + view.width / 2;
        const cy = point?.y ?? view.top + view.height / 2;
        anchorRef.current = { fx: (cx - rect.left) / rect.width, fy: (cy - rect.top) / rect.height, cx, cy };
      }
      zoomRef.current = next;
      setZoom(next);
    },
    [scrollRef, sheetRef],
  );

  // Keep the point under the cursor (or the viewport centre) steady across zooms.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    anchorRef.current = null;
    const el = scrollRef.current;
    const sheet = sheetRef.current;
    if (!anchor || !el || !sheet) return;
    const rect = sheet.getBoundingClientRect();
    el.scrollLeft += rect.left + anchor.fx * rect.width - anchor.cx;
    el.scrollTop += rect.top + anchor.fy * rect.height - anchor.cy;
  }, [pageWidth, scrollRef, sheetRef]);

  // Trackpad pinch / ctrl+wheel zooms the page instead of the whole app.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let accumulated = 0;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      accumulated += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      if (Math.abs(accumulated) < 40) return;
      const factor = accumulated < 0 ? 1.1 : 1 / 1.1;
      accumulated = 0;
      setZoomAt(zoomRef.current * factor, { x: event.clientX, y: event.clientY });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollRef, setZoomAt]);

  const zoomStep = (dir: 1 | -1) => setZoomAt(stepZoom(zoomRef.current, dir));

  return { zoom, pageWidth, setZoomAt, zoomStep };
}
