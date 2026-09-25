/**
 * Image tile that loads as a churning pixel mosaic and dissolves, cell by
 * cell, into the photo once it has decoded; then hands over to a real <img>
 * (crisp, accessible, zoomable). Waits are the network's, not ours: cached
 * images reveal almost immediately.
 *
 * Plain 2D canvas at ~12 fps, paused offscreen. First-party take on the
 * libraries.dev "Image" effect (img-fx `ImageGeneration`, presets
 * pixels-organic / pixels-mechanic), without its three.js dependency.
 */
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";

/** Colour ramps the churn flows through (interpolated, so the field reads as soft cloud, not confetti). */
const PALETTES: Record<"light" | "dark", Array<[number, number, number]>> = {
  light: [
    [245, 245, 244],
    [237, 233, 254],
    [224, 242, 254],
    [255, 237, 213],
    [250, 232, 255],
    [245, 245, 244],
  ],
  dark: [
    [24, 24, 27],
    [46, 16, 101],
    [23, 37, 84],
    [67, 20, 7],
    [30, 27, 75],
    [24, 24, 27],
  ],
};

function ramp(palette: Array<[number, number, number]>, value: number, lift: number) {
  const scaled = Math.min(0.9999, Math.max(0, value)) * (palette.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const [a, b] = [palette[i], palette[i + 1]];
  const mix = (k: number) => Math.round(a[k] + (b[k] - a[k]) * f + lift);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

/** Cheap smooth noise in 0..1 from a cell and time. */
function noise(x: number, y: number, t: number) {
  const v =
    Math.sin(x * 0.9 + t * 1.7) * 0.35 +
    Math.sin(y * 1.3 - t * 1.1) * 0.3 +
    Math.sin((x + y) * 0.55 + t * 0.8) * 0.35 +
    Math.sin(x * 3.7 + y * 2.9 + t * 3.1) * 0.12;
  return (v + 1.12) / 2.24;
}

export function ImageMosaic({
  src,
  alt,
  tone = "light",
  preset = "pixels-organic",
  delay = 0,
  className,
  imgClassName,
  onError,
}: {
  src: string;
  alt: string;
  tone?: "light" | "dark";
  preset?: "pixels-organic" | "pixels-mechanic";
  /** Stagger (ms) before this tile may reveal, for a cascading gallery. */
  delay?: number;
  className?: string;
  imgClassName?: string;
  onError?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<"churn" | "reveal" | "done">("churn");
  const motionOn = useMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = imgRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !element) return;
    setPhase("churn");
    const palette = PALETTES[tone];
    const cellCss = preset === "pixels-mechanic" ? 10 : 14;
    let raf = 0;
    let last = 0;
    let revealStart = 0;
    let image: HTMLImageElement | null = null;
    let visible = true;
    let cancelled = false;
    const seeds: number[] = [];

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      return { width, height, cell: Math.max(4, Math.round(cellCss * dpr)) };
    };

    /** Draws the image like object-fit: cover, clipped to one cell. */
    const drawCell = (img: HTMLImageElement, x: number, y: number, w: number, h: number, width: number, height: number) => {
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const offsetX = (width - img.naturalWidth * scale) / 2;
      const offsetY = (height - img.naturalHeight * scale) / 2;
      ctx.drawImage(img, (x - offsetX) / scale, (y - offsetY) / scale, w / scale, h / scale, x, y, w, h);
    };

    const paint = (now: number) => {
      raf = 0;
      if (cancelled) return;
      const { width, height, cell } = size();
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      while (seeds.length < cols * rows) seeds.push(Math.random());
      const t = now / 1000;
      const progress = revealStart ? Math.min(1, (now - revealStart) / 750) : 0;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const index = row * cols + col;
          const x = col * cell;
          const y = row * cell;
          // Organic reveal: a soft diagonal front with per-cell jitter.
          const front = (col / cols + row / rows) / 2;
          const threshold = preset === "pixels-mechanic" ? seeds[index] : front * 0.6 + seeds[index] * 0.4;
          if (image && progress > threshold) {
            drawCell(image, x, y, cell, cell, width, height);
            continue;
          }
          const n = noise(col * 0.45, row * 0.45, t * 0.8);
          const sparkle = (noise(col * 2.3, row * 2.1, t * 2.4 + seeds[index] * 3) - 0.5) * (tone === "dark" ? 26 : 14);
          ctx.fillStyle = ramp(palette, n, sparkle);
          const gap = preset === "pixels-mechanic" ? 1 : 0;
          ctx.fillRect(x, y, cell - gap, cell - gap);
        }
      }
      if (progress >= 1) {
        setPhase("done");
        return;
      }
      if (visible && !document.hidden) schedule();
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame((now) => {
        raf = 0;
        // ~12 fps churn is plenty; the reveal runs at full rate.
        if (!revealStart && now - last < 80) return schedule();
        last = now;
        paint(now);
      });
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) schedule();
          });
    observer?.observe(canvas);

    // Decode the very <img> that will be shown, so the hand-off never re-fetches or flashes.
    const img = element;
    const started = performance.now();
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        const wait = Math.max(0, delay - (performance.now() - started));
        window.setTimeout(() => {
          if (cancelled) return;
          image = img;
          if (!motionOn) {
            setPhase("done");
            return;
          }
          revealStart = performance.now();
          setPhase("reveal");
          schedule();
        }, wait);
      })
      .catch(() => !cancelled && onError?.());

    if (motionOn) schedule();
    else paint(performance.now());
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
    // onError is a notification only; restarting on its identity would reload the image.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, tone, preset, delay, motionOn]);

  return (
    <div className={cx("relative overflow-hidden", className)} aria-busy={phase !== "done"}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        decoding="async"
        className={cx(
          "absolute inset-0 size-full object-cover",
          phase === "done" ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-0 size-full transition-opacity duration-300",
          phase === "done" ? "opacity-0" : "opacity-100",
        )}
      />
    </div>
  );
}
