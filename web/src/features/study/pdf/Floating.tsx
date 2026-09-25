/** Viewport-clamped floating toolbar that sits above (or flips below) an on-page anchor. */
import { motion } from "motion/react";
import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { spring } from "@/components/ui";
import { clamp, type Anchor } from "./geometry";

export function Floating({
  anchor,
  preferBelow,
  containerRef,
  label,
  animate,
  children,
}: {
  anchor: Anchor;
  preferBelow: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  label: string;
  animate: boolean;
  children: ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 44 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  });

  const gap = 10;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fitsAbove = anchor.top - size.height - gap >= margin;
  const fitsBelow = anchor.bottom + size.height + gap <= vh - margin;
  const below = preferBelow ? fitsBelow || !fitsAbove : !fitsAbove && fitsBelow;
  const top = below
    ? Math.min(vh - size.height - margin, anchor.bottom + gap)
    : Math.max(margin, anchor.top - size.height - gap);
  const left = clamp(anchor.x - size.width / 2, margin, Math.max(margin, vw - size.width - margin));

  return (
    <motion.div
      ref={containerRef}
      role="toolbar"
      aria-label={label}
      className="fixed z-[90]"
      style={{ left, top, transformOrigin: below ? "50% 0%" : "50% 100%" }}
      initial={animate ? { opacity: 0, scale: 0.86, y: below ? -6 : 6 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        animate
          ? { opacity: 0, scale: 0.92, transition: { duration: 0.12 } }
          : { opacity: 0, transition: { duration: 0 } }
      }
      transition={spring}
      // Keep the text selection alive while clicking toolbar buttons.
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </motion.div>
  );
}
