/**
 * Small dotted 3D orb that shows what the tutor is doing, one animation per
 * activity: searching (a scan sweeps a dotted globe), composing (an
 * undulating sash), weaving (three strands plait), listening (a waveform
 * rolls through latitude rings), working (particles on tilted orbits),
 * breathing, connecting, solving and shaping.
 *
 * Plain 2D canvas; every instance shares one animation clock, sleeps when
 * offscreen or hidden, and draws a single still frame under reduced motion.
 * First-party component with the libraries.dev "Thinking orbs" API (`state`,
 * `size`, `theme`, `paused`), so the `thinking-orbs` package can replace it.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { useMotion } from "@/store/app";

export type OrbState =
  | "working"
  | "searching"
  | "solving"
  | "listening"
  | "connecting"
  | "composing"
  | "breathing"
  | "weaving"
  | "shaping";

const LABELS: Record<OrbState, string> = {
  working: "Working…",
  searching: "Searching…",
  solving: "Solving…",
  listening: "Listening…",
  connecting: "Connecting…",
  composing: "Composing…",
  breathing: "Thinking…",
  weaving: "Weaving…",
  shaping: "Shaping…",
};

type Dot = { x: number; y: number; z: number; a: number; r?: number; hue?: number };
type Vec = [number, number, number];

const TAU = Math.PI * 2;

/** Evenly spread points on a unit sphere. */
function fibonacci(count: number): Vec[] {
  const points: Vec[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    points.push([Math.cos(golden * i) * radius, y, Math.sin(golden * i) * radius]);
  }
  return points;
}

const rotY = ([x, y, z]: Vec, a: number): Vec => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rotX = ([x, y, z]: Vec, a: number): Vec => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const rotZ = ([x, y, z]: Vec, a: number): Vec => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
const dot = (p: Vec, a = 1): Dot => ({ x: p[0], y: p[1], z: p[2], a });

const SPHERE = { 64: fibonacci(150), 20: fibonacci(46) } as const;

/** The dots of one frame for a state at time t (seconds), in unit space. */
function frame(state: OrbState, t: number, small: boolean): Dot[] {
  const sphere = small ? SPHERE[20] : SPHERE[64];
  const out: Dot[] = [];
  switch (state) {
    case "searching": {
      const sweep = (t * 1.4) % TAU;
      for (const p of sphere) {
        const q = rotX(rotY(p, t * 0.35), 0.35);
        const lon = Math.atan2(p[0], p[2]);
        const d = Math.abs(((lon - sweep + Math.PI * 3) % TAU) - Math.PI);
        out.push({ ...dot(q, 0.25 + Math.max(0, 1 - d * 2.2) * 0.9), r: 1 + Math.max(0, 1 - d * 2.2) * 0.6 });
      }
      return out;
    }
    case "composing": {
      const n = small ? 40 : 120;
      for (let band = 0; band < (small ? 2 : 3); band += 1) {
        for (let i = 0; i < n / (small ? 2 : 3); i += 1) {
          const u = (i / (n / (small ? 2 : 3))) * TAU;
          const lat = Math.sin(u * 2 + t * 2.2 + band * 1.2) * 0.32 + (band - 1) * 0.16;
          const p: Vec = [Math.cos(u) * Math.cos(lat), Math.sin(lat), Math.sin(u) * Math.cos(lat)];
          out.push(dot(rotX(rotY(p, t * 0.6), 0.45), 0.9));
        }
      }
      return out;
    }
    case "weaving": {
      const n = small ? 16 : 48;
      for (let strand = 0; strand < 3; strand += 1) {
        for (let i = 0; i < n; i += 1) {
          const u = (i / n) * TAU;
          const phase = (strand * TAU) / 3;
          const r = 0.78 + Math.sin(u * 3 + phase + t * 2) * 0.18;
          const y = Math.cos(u * 3 + phase + t * 2) * 0.35;
          const p: Vec = [Math.cos(u + t * 0.5) * r, y, Math.sin(u + t * 0.5) * r];
          out.push({ ...dot(rotX(p, 0.5), 0.95), hue: strand });
        }
      }
      return out;
    }
    case "listening": {
      const rings = small ? 4 : 7;
      const per = small ? 12 : 26;
      for (let ring = 0; ring < rings; ring += 1) {
        const lat = -1.1 + (ring / (rings - 1)) * 2.2;
        const amp = 1 + Math.sin(t * 5 - ring * 0.9) * 0.14;
        for (let i = 0; i < per; i += 1) {
          const u = (i / per) * TAU;
          const p: Vec = [Math.cos(u) * Math.cos(lat) * amp, Math.sin(lat) * 0.9, Math.sin(u) * Math.cos(lat) * amp];
          out.push(dot(rotX(rotY(p, t * 0.4), 0.3), 0.85));
        }
      }
      return out;
    }
    case "connecting": {
      const nodes = small ? 7 : 12;
      const pts: Vec[] = [];
      for (let i = 0; i < nodes; i += 1) pts.push(rotX(rotY(sphere[Math.floor((i * sphere.length) / nodes)], t * 0.5), 0.3));
      for (let i = 0; i < nodes; i += 1) {
        const a = pts[i];
        const b = pts[(i * 5 + 3) % nodes];
        const steps = small ? 4 : 9;
        const build = Math.min(1, ((t * 0.8 + i * 0.13) % 2.4) / 1.2);
        for (let s = 1; s < steps * build; s += 1) {
          const k = s / steps;
          out.push({ ...dot([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k], 0.35), r: 0.6 });
        }
        const packet = (t * 0.9 + i * 0.37) % 1;
        out.push({ ...dot([a[0] + (b[0] - a[0]) * packet, a[1] + (b[1] - a[1]) * packet, a[2] + (b[2] - a[2]) * packet], 1), r: 1.2 });
        out.push({ ...dot(a, 1), r: 1.6 });
      }
      return out;
    }
    case "solving": {
      const bands = 4;
      for (const p of sphere) {
        const band = Math.min(bands - 1, Math.floor(((p[1] + 1) / 2) * bands));
        const cycle = (t * 0.9 + band * 0.25) % 2;
        const turn = cycle < 1 ? Math.floor(cycle * 4) * (Math.PI / 2) + (1 - Math.cos(((cycle * 4) % 1) * Math.PI)) * (Math.PI / 4) : 0;
        out.push(dot(rotX(rotY(p, (band % 2 ? 1 : -1) * turn + t * 0.2), 0.35), 0.8));
      }
      return out;
    }
    case "shaping": {
      const n = small ? 30 : 84;
      const phase = (t * 0.45) % 3;
      const shape = Math.floor(phase);
      const blend = Math.min(1, (phase % 1) * 1.6);
      const outline = (k: number, which: number): [number, number] => {
        const u = k * TAU;
        if (which === 0) return [Math.cos(u) * 0.85, Math.sin(u) * 0.85];
        const sides = which === 1 ? 3 : 4;
        const seg = Math.floor(k * sides);
        const f = k * sides - seg;
        const a0 = (seg / sides) * TAU - Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0);
        const a1 = ((seg + 1) / sides) * TAU - Math.PI / 2 + (sides === 4 ? Math.PI / 4 : 0);
        const r = which === 1 ? 0.95 : 1.05;
        return [(Math.cos(a0) + (Math.cos(a1) - Math.cos(a0)) * f) * r, (Math.sin(a0) + (Math.sin(a1) - Math.sin(a0)) * f) * r];
      };
      for (let i = 0; i < n; i += 1) {
        const k = i / n;
        const [x0, y0] = outline(k, shape);
        const [x1, y1] = outline(k, (shape + 1) % 3);
        const e = blend * blend * (3 - 2 * blend);
        out.push(dot(rotZ([x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, 0], t * 0.3), 0.9));
      }
      return out;
    }
    case "breathing": {
      const n = small ? 28 : 72;
      for (let i = 0; i < n; i += 1) {
        const u = (i / n) * TAU;
        const r = 0.72 + Math.sin(t * 1.6) * 0.1 + Math.sin(u * 3 + t * 2.1) * 0.06 + Math.sin(u * 5 - t * 1.3) * 0.03;
        out.push(dot([Math.cos(u) * r, Math.sin(u) * r, Math.sin(u * 2 + t) * 0.2], 0.55 + 0.45 * Math.sin(u * 2 - t * 2) ** 2));
      }
      return out;
    }
    case "working":
    default: {
      for (const p of sphere) out.push({ ...dot(rotX(rotY(p, t * 0.45), 0.35), 0.18), r: 0.8 });
      const orbits = small ? 3 : 4;
      const per = small ? 5 : 11;
      for (let o = 0; o < orbits; o += 1) {
        for (let i = 0; i < per; i += 1) {
          const u = (i / per) * TAU + t * (1.4 + o * 0.35);
          const p: Vec = [Math.cos(u) * 1.02, 0, Math.sin(u) * 1.02];
          out.push({ ...dot(rotY(rotX(p, 0.5 + o * 0.7), o * 1.3 + t * 0.2), 1), r: 1.25 });
        }
      }
      return out;
    }
  }
}

const HUES = ["#8b5cf6", "#3b82f6", "#ff6e00"];

export function ThinkingOrb({
  state = "working",
  size = 64,
  theme = "light",
  paused = false,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
}: {
  state?: OrbState;
  size?: 64 | 20;
  /** Ink: "light" draws dark dots for light surfaces, "dark" draws light dots. */
  theme?: "light" | "dark";
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionOn = useMotion();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const small = size === 20;
    const ink = theme === "dark" ? [244, 244, 241] : [41, 37, 36];
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const half = size / 2;
      const radius = half * 0.78;
      const dots = frame(stateRef.current, t, small).sort((a, b) => a.z - b.z);
      for (const d of dots) {
        const depth = (d.z + 1) / 2;
        const scale = 0.72 + depth * 0.45;
        const r = (small ? 0.62 : 1.05) * (d.r ?? 1) * scale;
        ctx.globalAlpha = Math.min(1, d.a * (0.35 + depth * 0.75));
        ctx.fillStyle = d.hue !== undefined ? HUES[d.hue % 3] : `rgb(${ink[0]},${ink[1]},${ink[2]})`;
        ctx.beginPath();
        ctx.arc(half + d.x * radius, half + d.y * radius, r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const epoch = performance.now();
    if (!motionOn || paused) {
      draw(1.2);
      return;
    }
    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      draw((now - epoch) / 1000);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const resume = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            resume();
          });
    observer?.observe(canvas);
    document.addEventListener("visibilitychange", resume);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", resume);
    };
  }, [size, theme, paused, motionOn]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      role={ariaHidden ? undefined : "img"}
      aria-label={ariaHidden ? undefined : (ariaLabel ?? LABELS[state])}
      aria-hidden={ariaHidden || undefined}
    />
  );
}
