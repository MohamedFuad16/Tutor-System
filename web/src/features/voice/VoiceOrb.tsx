/**
 * The voice orb: a liquid-glass sphere whose light reacts to the
 * conversation — cool blue while listening (swelling with your voice), violet
 * swirl while thinking, warm ember while speaking (pulsing with the audio).
 */
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform } from "motion/react";
import type { VoiceState } from "@shared/voice";
import { cx } from "@/components/ui";

const PALETTES: Record<string, [string, string, string]> = {
  listening: ["#22d3ee", "#3b82f6", "#8b5cf6"],
  thinking: ["#8b5cf6", "#6366f1", "#f472b6"],
  speaking: ["#ff6e00", "#f472b6", "#8b5cf6"],
  connecting: ["#6b7280", "#3b82f6", "#8b5cf6"],
  idle: ["#6b7280", "#3b82f6", "#8b5cf6"],
  error: ["#f87171", "#fb923c", "#6b7280"],
};

export function VoiceOrb({
  state,
  levels,
  size = 240,
  className,
}: {
  state: VoiceState | "idle" | "error";
  levels: () => { mic: number; out: number };
  size?: number;
  className?: string;
}) {
  const level = useMotionValue(0);
  const smooth = useSpring(level, { stiffness: 260, damping: 22 });
  const scale = useTransform(smooth, [0, 1], [1, 1.16]);
  const glow = useTransform(smooth, [0, 1], [0.35, 0.9]);
  const rotation = useMotionValue(0);

  useAnimationFrame((time, delta) => {
    const { mic, out } = levels();
    const value =
      state === "speaking"
        ? out
        : state === "listening"
          ? mic
          : state === "thinking"
            ? 0.25 + 0.15 * Math.sin(time / 380)
            : 0.05;
    level.set(value);
    rotation.set((rotation.get() + delta * (state === "thinking" ? 0.12 : 0.03)) % 360);
  });

  const [a, b, c] = PALETTES[state] ?? PALETTES.idle;
  return (
    <motion.div className={cx("relative", className)} style={{ width: size, height: size, scale }} aria-hidden>
      {/* Outer bloom */}
      <motion.div
        className="absolute -inset-[35%] rounded-full blur-3xl"
        style={{ opacity: glow, background: `radial-gradient(circle, ${a}66 0%, ${b}33 40%, transparent 70%)` }}
      />
      {/* Swirling light */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          rotate: rotation,
          background: `conic-gradient(from 0deg, ${a}, ${b}, ${c}, ${a})`,
          filter: "blur(18px) saturate(1.3)",
          opacity: 0.9,
        }}
      />
      {/* Glass body */}
      <div
        className="absolute inset-[6%] rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), rgba(255,255,255,0.08) 32%, transparent 55%),
            radial-gradient(circle at 70% 78%, ${c}55, transparent 60%),
            radial-gradient(circle at 50% 50%, rgba(10,10,14,0.35), rgba(10,10,14,0.75))`,
          boxShadow: `inset 0 2px 18px rgba(255,255,255,0.18), inset 0 -18px 40px ${b}44, 0 0 60px ${a}33`,
          backdropFilter: "blur(12px)",
        }}
      />
      {/* Specular highlight */}
      <div className="absolute top-[14%] left-[24%] h-[18%] w-[30%] -rotate-[25deg] rounded-full bg-white/35 blur-md" />
    </motion.div>
  );
}
