/**
 * Liquid tab indicator: when the active tab changes, the highlight runs to
 * its new place like a drop of liquid — the head leads, a droplet trails,
 * and a goo filter keeps them one stretched surface until they merge.
 *
 * Render it inside the (position: relative) element that holds the tabs;
 * each tab carries `data-liquid-key`. The goo runs on SVG content (not a CSS
 * filter on HTML) so labels stay crisp and Safari renders it correctly.
 * First-party take on libraries.dev "Gooey" (liquid-gooey `effect="move"`).
 */
import { useSpring } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useMotion } from "@/store/app";

type Box = { x: number; y: number; width: number; height: number };

export function LiquidIndicator({
  active,
  fill = "#ffffff",
  opacity = 0.13,
}: {
  active: string;
  fill?: string;
  opacity?: number;
}) {
  const id = useId().replace(/:/g, "");
  const motionOn = useMotion();
  const anchor = useRef<HTMLSpanElement>(null);
  const head = useRef<SVGRectElement>(null);
  const tail = useRef<SVGRectElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  // Measure against our own parent (a parent ref isn't attached yet during a child's first layout effect).
  useLayoutEffect(() => {
    const host = anchor.current?.parentElement;
    if (!host) return;
    const measure = () => {
      const tab = host.querySelector<HTMLElement>(`[data-liquid-key="${CSS.escape(active)}"]`);
      if (!tab) return setBox(null);
      const hostBox = host.getBoundingClientRect();
      const tabBox = tab.getBoundingClientRect();
      setBox({
        x: tabBox.left - hostBox.left,
        y: tabBox.top - hostBox.top,
        width: tabBox.width,
        height: tabBox.height,
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [active]);

  const headX = useSpring(0, { stiffness: 420, damping: 34 });
  const headW = useSpring(0, { stiffness: 420, damping: 34 });
  const tailX = useSpring(0, { stiffness: 150, damping: 22 });
  const tailW = useSpring(0, { stiffness: 150, damping: 22 });

  useEffect(() => {
    if (!box) return;
    const first = headW.get() === 0;
    for (const [value, target] of [
      [headX, box.x],
      [headW, box.width],
      [tailX, box.x + box.width * 0.2],
      [tailW, box.width * 0.6],
    ] as const) {
      if (first || !motionOn) value.jump(target);
      else value.set(target);
    }
  }, [box, motionOn, headX, headW, tailX, tailW]);

  // Springs write straight to the SVG attributes: no React render per frame.
  useEffect(() => {
    const paint = () => {
      head.current?.setAttribute("x", headX.get().toFixed(2));
      head.current?.setAttribute("width", Math.max(0, headW.get()).toFixed(2));
      tail.current?.setAttribute("x", tailX.get().toFixed(2));
      tail.current?.setAttribute("width", Math.max(0, tailW.get()).toFixed(2));
    };
    paint();
    const stops = [headX, headW, tailX, tailW].map((value) => value.on("change", paint));
    return () => stops.forEach((stop) => stop());
  }, [box, headX, headW, tailX, tailW]);

  const radius = (box?.height ?? 0) / 2;
  return (
    <span ref={anchor} aria-hidden className="pointer-events-none absolute inset-0">
      {box && (
        <svg className="absolute inset-0 size-full overflow-visible" style={{ opacity }}>
          <defs>
            <filter id={`${id}-goo`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
            </filter>
          </defs>
          <g filter={`url(#${id}-goo)`} fill={fill}>
            <rect ref={tail} y={box.y + box.height * 0.18} height={box.height * 0.64} rx={radius * 0.64} />
            <rect ref={head} y={box.y} height={box.height} rx={radius} />
          </g>
        </svg>
      )}
    </span>
  );
}
