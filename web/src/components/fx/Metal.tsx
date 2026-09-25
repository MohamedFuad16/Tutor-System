/**
 * Liquid-metal text and badge: a brushed chrome gradient with a slow
 * travelling sheen, for the one headline or badge on a screen that should
 * catch the eye. CSS only (background-clip text + an animated highlight),
 * with a static finish under reduced motion.
 *
 * First-party take on libraries.dev "Liquid metal" (metal-fx `MetalText`,
 * `MetalBadge`), without WebGL.
 */
import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/components/ui";

export function MetalText({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={cx("metal-text", className)} style={style}>
      {children}
    </span>
  );
}

export function MetalBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "metal-badge relative inline-flex items-center overflow-hidden rounded-full px-2 py-0.5 text-[0.62rem] font-semibold tracking-wide text-ink-900 uppercase",
        className,
      )}
    >
      <span className="relative z-[1]">{children}</span>
    </span>
  );
}
