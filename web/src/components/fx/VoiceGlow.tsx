/**
 * Sound-reactive glow along the bottom edge of the element it wraps: coloured
 * lobes rise with a voice, and while the reply is processed they gather into
 * one beam that sweeps side to side.
 *
 * First-party effect modelled on libraries.dev "Voice" (voice-glow's
 * VoiceBeam: `level`, `processing`, `paused`, `type`), so the package can
 * replace it without touching call sites once it's approved for install.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";

const LOBES = [
  { color: "#8b5cf6", x: 0.12, freq: 1.7, phase: 0.2 },
  { color: "#3b82f6", x: 0.31, freq: 2.3, phase: 1.4 },
  { color: "#22d3ee", x: 0.5, freq: 1.3, phase: 2.2 },
  { color: "#ff6e00", x: 0.69, freq: 2.9, phase: 0.8 },
  { color: "#f472b6", x: 0.88, freq: 1.9, phase: 3.1 },
];

export function VoiceGlow({
  level,
  processing = false,
  paused = false,
  type = "default",
  className,
  children,
}: {
  /** 0..1 audio level, read once per frame (no re-render). */
  level: () => number;
  processing?: boolean;
  paused?: boolean;
  type?: "default" | "mobile";
  className?: string;
  children: ReactNode;
}) {
  const lobes = useRef<Array<HTMLSpanElement | null>>([]);
  const beam = useRef<HTMLSpanElement>(null);
  const motionOn = useMotion();
  const processingRef = useRef(processing);
  processingRef.current = processing;
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let smooth = 0;
    let gather = 0;
    let last = performance.now();
    const reach = type === "mobile" ? 1.35 : 1;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const target = Math.min(1, Math.max(0, levelRef.current()));
      smooth += (target - smooth) * (1 - Math.exp(-dt / (target > smooth ? 0.06 : 0.22)));
      gather += ((processingRef.current ? 1 : 0) - gather) * (1 - Math.exp(-dt / 0.35));
      const idle = motionOn ? 0.1 + 0.04 * Math.sin(t * 1.1) : 0.1;
      lobes.current.forEach((node, index) => {
        if (!node) return;
        const lobe = LOBES[index];
        const wobble = motionOn ? 0.55 + 0.45 * Math.sin(t * lobe.freq * 2.2 + lobe.phase) : 1;
        const height = (idle + smooth * 0.95 * wobble) * reach * (1 - gather * 0.85);
        node.style.transform = `translateX(-50%) scaleY(${height.toFixed(3)})`;
        node.style.opacity = String(Math.min(1, 0.35 + smooth * 0.9) * (1 - gather * 0.7));
      });
      if (beam.current) {
        const sweep = motionOn ? Math.sin(t * 1.6) * 0.38 : 0;
        beam.current.style.opacity = gather.toFixed(3);
        beam.current.style.left = `${(50 + sweep * 100).toFixed(2)}%`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, motionOn, type]);

  return (
    <div className={cx("relative isolate overflow-hidden", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {LOBES.map((lobe, index) => (
          <span
            key={lobe.color}
            ref={(node) => {
              lobes.current[index] = node;
            }}
            className="absolute bottom-[-35%] h-[120%] w-[38%] origin-bottom rounded-[50%] blur-2xl will-change-transform"
            style={{
              left: `${lobe.x * 100}%`,
              background: `radial-gradient(ellipse at 50% 100%, ${lobe.color} 0%, ${lobe.color}88 35%, transparent 70%)`,
              transform: "translateX(-50%) scaleY(0.1)",
            }}
          />
        ))}
        <span
          ref={beam}
          className="absolute bottom-[-30%] h-[95%] w-[34%] -translate-x-1/2 rounded-[50%] opacity-0 blur-xl"
          style={{
            left: "50%",
            background:
              "radial-gradient(ellipse at 50% 100%, #ffffff 0%, #c4b5fd 22%, #8b5cf6 45%, #3b82f6 62%, transparent 75%)",
          }}
        />
      </div>
      <div className="relative z-[5]">{children}</div>
    </div>
  );
}
