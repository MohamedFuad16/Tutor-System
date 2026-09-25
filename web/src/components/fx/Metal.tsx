/**
 * Liquid-metal text and badge from libraries.dev (metal-fx, WebGL2), loaded
 * on demand. Until it loads, and where WebGL2 is missing, the plain text or
 * a quiet pill stands in, so nothing ever shifts or disappears.
 */
import { lazy, Suspense } from "react";
import { useMotion } from "@/store/app";

const LazyMetalText = lazy(() => import("metal-fx").then((module) => ({ default: module.MetalText })));
const LazyMetalBadge = lazy(() => import("metal-fx").then((module) => ({ default: module.MetalBadge })));

export function MetalText({ children, font, color }: { children: string; font: string; color: string }) {
  const motionOn = useMotion();
  const plain = <span style={{ font, color, whiteSpace: "nowrap" }}>{children}</span>;
  if (!motionOn) return plain;
  return (
    <Suspense fallback={plain}>
      <LazyMetalText font={font} color={color} theme="dark">
        {children}
      </LazyMetalText>
    </Suspense>
  );
}

export function MetalBadge({ children }: { children: string }) {
  return (
    <Suspense
      fallback={
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.62rem] font-semibold text-ink-900 uppercase">
          {children}
        </span>
      }
    >
      <LazyMetalBadge theme="dark" scale={0.8}>
        {children}
      </LazyMetalBadge>
    </Suspense>
  );
}
