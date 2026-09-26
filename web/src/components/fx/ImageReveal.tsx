/**
 * An image tile that loads as libraries.dev's pixel-mosaic shader (img-fx)
 * and dissolves into the photo once it has decoded. img-fx brings three.js,
 * so it loads on the first gallery that needs it; until then (and under
 * reduced motion) the tile is a plain image over a soft placeholder. Once
 * the reveal lands, the tile hands over to a plain <img>, so a finished
 * gallery costs nothing per frame and stays crisp and accessible.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import type { ImageGenerationHandle, ImageGenerationProps } from "img-fx";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";

type ImageGenerationComponent = ComponentType<ImageGenerationProps & React.RefAttributes<ImageGenerationHandle>>;

const ImageGeneration = lazy(() =>
  import("img-fx").then((module) => ({ default: module.ImageGeneration as ImageGenerationComponent })),
);

/** Resolves once the image has decoded; rejects if it can't be loaded. */
function preload(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.src = src;
  return image.decode();
}

function Plain({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} referrerPolicy="no-referrer" className={cx("size-full object-cover", className)} />;
}

export function ImageReveal({
  src,
  alt,
  tone = "light",
  delay = 0,
  effect = true,
  className,
  onError,
}: {
  src: string;
  alt: string;
  tone?: "light" | "dark";
  /** Stagger (ms) before this tile reveals, for a cascading gallery. */
  delay?: number;
  /** False: skip the WebGL mosaic and fade the photo in (keeps the GPU free for other work). */
  effect?: boolean;
  className?: string;
  onError?: () => void;
}) {
  const motionOn = useMotion();
  const handle = useRef<ImageGenerationHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settled, setSettled] = useState(false);
  // The shader chunk may arrive after the image: reveal once both are there.
  const attach = useCallback((value: ImageGenerationHandle | null) => {
    handle.current = value;
    setMounted(Boolean(value));
  }, []);
  useEffect(() => {
    if (ready && mounted) handle.current?.triggerReveal({ hold: "manual" });
  }, [ready, mounted, src]);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    setReady(false);
    setSettled(false);
    preload(src)
      .then(() => {
        if (!alive) return;
        timer = window.setTimeout(() => setReady(true), delay);
      })
      .catch(() => alive && onError?.());
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // onError is a notification; re-running on its identity would reload the image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, delay]);

  const box = cx("relative size-full overflow-hidden rounded-xl", className);
  if (!effect) {
    return (
      <div className={cx(box, tone === "dark" ? "bg-white/5" : "bg-stone-100")}>
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className={cx(
            "size-full object-cover transition-opacity duration-500",
            ready || !motionOn ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    );
  }
  if (!motionOn || settled) return <Plain src={src} alt={alt} className={box} />;
  return (
    <Suspense fallback={<div className={cx(box, tone === "dark" ? "bg-white/5" : "bg-stone-100")} />}>
      <ImageGeneration
        ref={attach}
        images={[src]}
        preset="pixels-organic"
        theme={tone}
        strength={tone === "dark" ? 0.9 : 0.75}
        role="img"
        aria-label={alt}
        aria-busy={!ready}
        onCycle={(event) => event.phase === "visible" && setSettled(true)}
        className="!block size-full"
        style={{ width: "100%", height: "100%" }}
      >
        <div className={box} />
      </ImageGeneration>
    </Suspense>
  );
}
