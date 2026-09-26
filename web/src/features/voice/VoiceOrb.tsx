/**
 * The voice orb: a real-time liquid glass sphere (WebGPU shader ported from
 * LerSent001/orb, see ./orb/NOTICE.md). It rests dim and slow while the
 * tutor waits, blooms into its active profile while thinking or speaking, and
 * its contour, inner flow and highlights ride the live audio — the learner's
 * mic while listening, the tutor's voice while speaking.
 *
 * Browsers without WebGPU (or with reduced motion) get a light CSS orb with
 * the same palette, so voice mode never renders an empty stage.
 */
import { motion, useAnimationFrame, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { VoiceState } from "@shared/voice";
import { cx } from "@/components/ui";
import { silentBands, type AudioBands } from "@/lib/audio";
import { useMotion, type OrbStyle } from "@/store/app";
import { ORB_STYLES, ORB_STYLE_LABELS, orbSwatch } from "./orb/styles";
import { stylePresets } from "./orb/presets";
import { createOrbRenderer, webgpuAvailable } from "./orb/renderer";
export { ORB_STYLES, ORB_STYLE_LABELS, orbSwatch };
import { createPresetOrbStateConfiguration, resolveOrbStateParams, type OrbRenderTarget } from "./orb/states";

type OrbVoiceState = VoiceState | "idle" | "error";
type BandSource = () => { mic: AudioBands; out: AudioBands };

/** Voice state → which audio drives the orb, and whether it shows its active profile. */
function drive(state: OrbVoiceState) {
  switch (state) {
    case "listening":
      return { active: false, source: "mic" as const };
    case "thinking":
      return { active: true, source: "breath" as const };
    case "speaking":
      return { active: true, source: "out" as const };
    default:
      return { active: false, source: "none" as const };
  }
}

export function VoiceOrb({
  state,
  bands,
  levels,
  size = 240,
  style = "siri",
  className,
}: {
  state: OrbVoiceState;
  bands: BandSource;
  levels: () => { mic: number; out: number };
  size?: number;
  style?: OrbStyle;
  className?: string;
}) {
  const motionOn = useMotion();
  const [gpuFailed, setGpuFailed] = useState(false);
  const useGpu = motionOn && !gpuFailed && webgpuAvailable();
  return useGpu ? (
    <ShaderOrb
      state={state}
      bands={bands}
      size={size}
      style={style}
      className={className}
      onFail={() => setGpuFailed(true)}
    />
  ) : (
    <CssOrb state={state} levels={levels} size={size} style={style} className={className} still={!motionOn} />
  );
}

function ShaderOrb({
  state,
  bands,
  size,
  style,
  className,
  onFail,
}: {
  state: OrbVoiceState;
  bands: BandSource;
  size: number;
  style: OrbStyle;
  className?: string;
  onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const configuration = useMemo(() => createPresetOrbStateConfiguration(style), [style]);
  const { active, source } = drive(state);

  // The renderer reads these every frame; React never re-renders per frame.
  const target = useRef<OrbRenderTarget | null>(null);
  target.current = {
    state: active ? "thinking" : "idle",
    params: resolveOrbStateParams(configuration, active ? "thinking" : "idle"),
    activationDuration: configuration.activationDuration,
    transitionDuration: configuration.transitionDuration,
  };
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const bandsRef = useRef(bands);
  bandsRef.current = bands;
  const level = useMotionValue(0);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const smoothed = silentBands();
    let clock = 0;
    const dispose = createOrbRenderer({
      canvas: element,
      getTarget: () => target.current!,
      getAudioBands: (dt) => {
        clock += dt;
        const input = sourceRef.current;
        const live = bandsRef.current();
        let next = input === "mic" ? live.mic : input === "out" ? live.out : silentBands();
        // Browser speech has no analysable signal: give the orb a soft speaking cadence instead.
        if (input === "out" && next.all === 0) next = cadence(clock, 0.55);
        if (input === "breath") next = cadence(clock * 0.5, 0.22);
        for (const band of ["low", "mid", "high", "all"] as const) {
          const tau = next[band] > smoothed[band] ? 0.07 : 0.24;
          smoothed[band] += (next[band] - smoothed[band]) * (1 - Math.exp(-dt / tau));
          if (smoothed[band] < 0.0001) smoothed[band] = 0;
        }
        level.set(smoothed.all);
        return smoothed;
      },
      onReady: () => setReady(true),
      onError: (error) => {
        console.warn(`Voice orb: falling back to the CSS orb (${error.message})`);
        onFail();
      },
    });
    return dispose;
    // The renderer lives for the component's lifetime; inputs flow through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scale = useSpring(useTransform(level, [0, 1], [1, 1.07]), { stiffness: 220, damping: 20 });
  const glow = useTransform(level, [0, 1], [0.28, 0.75]);
  const preset = stylePresets[style];
  return (
    <motion.div
      className={cx("relative", className)}
      style={{ width: size, height: size, scale }}
      aria-hidden
      data-orb="webgpu"
    >
      <motion.div
        className="pointer-events-none absolute -inset-[30%] rounded-full blur-3xl"
        style={{
          opacity: glow,
          background: `radial-gradient(circle, ${preset.glowColor}55 0%, ${preset.colorC}22 42%, transparent 70%)`,
        }}
      />
      <canvas
        ref={canvas}
        className={cx("relative size-full transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
      />
    </motion.div>
  );
}

/** A speech-like envelope: syllables riding a slower phrase contour. */
function cadence(t: number, depth: number): AudioBands {
  const phrase = 0.55 + 0.45 * Math.sin(t * 1.3);
  const syllable = Math.max(0, Math.sin(t * 9.1) * 0.6 + Math.sin(t * 5.3 + 1.1) * 0.4);
  const all = depth * phrase * (0.35 + 0.65 * syllable);
  return { low: all * 0.8, mid: all, high: all * 0.45, all };
}

/** Fallback orb (no WebGPU, or reduced motion): layered gradients in the preset's colours. */
function CssOrb({
  state,
  levels,
  size,
  style,
  className,
  still,
}: {
  state: OrbVoiceState;
  levels: () => { mic: number; out: number };
  size: number;
  style: OrbStyle;
  className?: string;
  still: boolean;
}) {
  const level = useMotionValue(0);
  const smooth = useSpring(level, { stiffness: 260, damping: 22 });
  const scale = useTransform(smooth, [0, 1], [1, 1.14]);
  const glow = useTransform(smooth, [0, 1], [0.35, 0.9]);
  const rotation = useMotionValue(0);

  useAnimationFrame((time, delta) => {
    if (still) return;
    const { mic, out } = levels();
    const value =
      state === "speaking"
        ? out || 0.3 + 0.2 * Math.sin(time / 160)
        : state === "listening"
          ? mic
          : state === "thinking"
            ? 0.25 + 0.15 * Math.sin(time / 380)
            : 0.05;
    level.set(value);
    rotation.set((rotation.get() + delta * (state === "thinking" ? 0.12 : 0.03)) % 360);
  });

  const p = stylePresets[style];
  const dim = state === "idle" || state === "connecting" || state === "error";
  return (
    <motion.div
      className={cx("relative", className)}
      style={{ width: size, height: size, scale }}
      aria-hidden
      data-orb="css"
    >
      <motion.div
        className="absolute -inset-[35%] rounded-full blur-3xl"
        style={{
          opacity: glow,
          background: `radial-gradient(circle, ${p.glowColor}66 0%, ${p.colorC}33 40%, transparent 70%)`,
        }}
      />
      <motion.div
        className="absolute inset-[4%] rounded-full"
        style={{
          rotate: rotation,
          background: `conic-gradient(from 0deg, ${p.colorB}, ${p.colorC}, ${p.colorD}, ${p.colorA}, ${p.colorB})`,
          filter: `blur(16px) saturate(${dim ? 0.7 : 1.3})`,
          opacity: dim ? 0.55 : 0.9,
        }}
      />
      <div
        className="absolute inset-[6%] rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5), rgba(255,255,255,0.08) 32%, transparent 55%),
            radial-gradient(circle at 70% 78%, ${p.colorD}55, transparent 60%),
            radial-gradient(circle at 50% 50%, rgba(10,10,14,0.3), rgba(10,10,14,0.72))`,
          boxShadow: `inset 0 2px 18px rgba(255,255,255,0.18), inset 0 -18px 40px ${p.shellEdge}44, 0 0 60px ${p.glowColor}33`,
        }}
      />
      <div className="absolute top-[14%] left-[24%] h-[18%] w-[30%] -rotate-[25deg] rounded-full bg-white/35 blur-md" />
    </motion.div>
  );
}
