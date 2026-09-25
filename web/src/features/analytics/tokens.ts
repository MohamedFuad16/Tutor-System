/** Analytics design tokens (easing, chart colours, series, preview sizes) and the shared summary type. */
import type { AnalyticsSummary } from "@shared/types";

export const EASE = [0.22, 1, 0.36, 1] as const;
export const SURFACE = "#0f0f11"; // ink-850, the chart card surface
export const AXIS_TEXT = "#7c7c83"; // fog-500
export const GRID = "rgba(255,255,255,0.05)";
export const ACCURACY_COLOR = "#3b82f6"; // aura-blue

export const SERIES = [
  { key: "chat", label: "Questions", color: "#ff6e00", unit: "" },
  { key: "voice", label: "Voice", color: "#8b5cf6", unit: " min" },
  { key: "reviews", label: "Reviews", color: "#22d3ee", unit: "" },
] as const;
export type SeriesKey = (typeof SERIES)[number]["key"];

export const BUCKET_COLORS: Record<string, string> = {
  New: "#fb923c",
  Learning: "#fbbf24",
  Mastered: "#34d399",
};

export const CONCEPTS_PREVIEW = 12;
export const BOOKS_PREVIEW = 5;

export type Summary = AnalyticsSummary;
