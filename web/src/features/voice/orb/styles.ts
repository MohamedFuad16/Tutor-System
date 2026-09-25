/**
 * The orb presets offered in voice mode (the audio-reactive ones), with
 * labels and a CSS swatch for pickers. Kept apart from the renderer so the
 * settings screen can show them without loading the shader.
 */
import type { OrbStyle } from "@/store/app";
import { stylePresets } from "./presets";

/** The presets whose shader responds to audio — the ones that make sense for voice. */
export const ORB_STYLES: readonly OrbStyle[] = ["siri", "violetEmber", "voiceWave", "aurora", "plasma", "spectrum"];

export const ORB_STYLE_LABELS: Record<OrbStyle, string> = {
  siri: "Siri wave",
  violetEmber: "Violet core",
  voiceWave: "Voice membrane",
  aurora: "Aurora veil",
  plasma: "Neural plasma",
  spectrum: "Prismatic field",
};

/** A small CSS preview of a preset, for pickers. */
export function orbSwatch(style: OrbStyle) {
  const p = stylePresets[style];
  return `radial-gradient(circle at 32% 28%, ${p.highlightColor}cc, transparent 38%), conic-gradient(from 200deg, ${p.colorB}, ${p.colorC}, ${p.colorD}, ${p.colorA}, ${p.colorB})`;
}

