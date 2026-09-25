/**
 * Audio → uniform modulation. Capture and analysis live in @/lib/audio;
 * this only maps smoothed 0..1 bands onto the shader parameters.
 * Ported from LerSent001/orb (https://github.com/LerSent001/orb, MIT, commit 8d1736e).
 */
import { styleFlowIndexes, type StyleName } from "./presets";

export type AudioBands = { low: number; mid: number; high: number; all: number };
export const silentBands = (): AudioBands => ({ low: 0, mid: 0, high: 0, all: 0 });

// index, frequency band, additive amount, proportional amount, ceiling.
// Apply after the state transition, never back into saved preset parameters.
export const audioRules = [
  [3, "all", 0, 0.7, 5],
  [6, "mid", 0.85, 0, 7],
  [21, "low", 0.075, 0, 1],
  [10, "high", 0.16, 0, 2],
  [14, "all", 0, 0.12, 4],
] as const;

export const audioStyleStrengths: Partial<Record<StyleName, number>> = {
  siri: 0.8, voiceWave: 1, aurora: 0.65,
  plasma: 0.65, spectrum: 0.75, violetEmber: 0.7,
};
export const audioFlowStrengths: Record<number, number> = Object.fromEntries(
  Object.entries(audioStyleStrengths).map(([style, strength]) => [styleFlowIndexes[style as StyleName], strength]),
);

export function applyAudioUniforms(values: Float32Array, bands: AudioBands): void {
  const strength = audioFlowStrengths[Math.round(values[15])] ?? 0;
  if (!strength) return;
  for (const [index, band, additive, proportional, ceiling] of audioRules) {
    const input = bands[band];
    const level = (Number.isFinite(input) ? Math.max(0, Math.min(1, input)) : 0) * strength;
    if (!level) continue;
    values[index] = Math.min(Math.max(ceiling, values[index]), values[index] * (1 + proportional * level) + additive * level);
  }
}
