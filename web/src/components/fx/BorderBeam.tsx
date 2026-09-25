/**
 * A light that travels around an element's border while something is being
 * worked on (the composer while the tutor answers). Pure CSS: a conic
 * gradient masked to a ring, plus a soft bloom, driven by a registered
 * custom property so the angle interpolates smoothly.
 *
 * First-party component with the libraries.dev "Border beam" API (`size`,
 * `colorVariant`, `active`, `strength`, `theme`), so the `border-beam`
 * package can replace it without touching call sites.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/components/ui";

const PALETTES = {
  colorful: "#8b5cf6, #3b82f6, #22d3ee, #ff6e00, #f472b6, #8b5cf6",
  ocean: "#6366f1, #3b82f6, #22d3ee, #818cf8, #6366f1",
  sunset: "#ff6e00, #f97316, #f43f5e, #fb923c, #ff6e00",
  mono: "#a8a29e, #fafaf9, #78716c, #e7e5e4, #a8a29e",
} as const;

export function BorderBeam({
  active = true,
  size = "md",
  colorVariant = "colorful",
  strength = 1,
  theme = "dark",
  className,
  style,
  children,
}: {
  active?: boolean;
  size?: "md" | "line";
  colorVariant?: keyof typeof PALETTES;
  strength?: number;
  theme?: "dark" | "light";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState("16px");

  // The beam follows the wrapped element's own corner radius.
  useLayoutEffect(() => {
    const child = ref.current?.firstElementChild;
    if (child) setRadius(getComputedStyle(child).borderTopLeftRadius || "16px");
  }, []);

  const colors = PALETTES[colorVariant];
  return (
    <div
      ref={ref}
      className={cx("border-beam relative isolate", className)}
      data-active={active || undefined}
      data-size={size}
      style={
        {
          ...style,
          borderRadius: radius,
          "--beam-colors": colors,
          "--beam-strength": strength,
          "--beam-blend": theme === "light" ? "multiply" : "screen",
        } as CSSProperties
      }
    >
      {children}
      <span aria-hidden className="border-beam-ring" />
      <span aria-hidden className="border-beam-bloom" />
    </div>
  );
}
