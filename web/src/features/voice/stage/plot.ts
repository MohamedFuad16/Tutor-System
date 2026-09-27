/**
 * Geometry for the magic pen's graphs: samples each function (compiled by
 * shared/expr.ts, never eval'd), picks a sensible y range when the tutor gave
 * none, breaks the curve at asymptotes, and lays out ticks. Pure, so it is
 * unit-tested and the board component only draws.
 */
import { compileExpression } from "@shared/expr";
import type { BoardPlot } from "@shared/voice";

export type PlotTick = { value: number; px: number };
export type PlotGeometry = {
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** One SVG path per function; a path may hold several pieces ("M … L … M …"). */
  paths: string[];
  /** Pixel row of y = 0 and pixel column of x = 0, when they are in view. */
  xAxis: number | null;
  yAxis: number | null;
  xTicks: PlotTick[];
  yTicks: PlotTick[];
  points: Array<{ px: number; py: number; label?: string }>;
};

const SAMPLES = 360;

/** A "nice" tick step (1, 2 or 5 × 10ⁿ) giving about `count` ticks across `span`. */
export function niceStep(span: number, count = 6) {
  const raw = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

function ticks(min: number, max: number, toPx: (value: number) => number, count: number): PlotTick[] {
  const step = niceStep(max - min, count);
  const out: PlotTick[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    const rounded = Math.abs(value) < step * 1e-9 ? 0 : Number(value.toPrecision(12));
    out.push({ value: rounded, px: toPx(rounded) });
  }
  return out;
}

export function plotGeometry(plot: BoardPlot, width: number, height: number, pad = 28): PlotGeometry {
  const fns = plot.fns.map((fn) => compileExpression(fn)).filter((fn): fn is (x: number) => number => Boolean(fn));
  const { xMin, xMax } = plot;
  const xs = Array.from({ length: SAMPLES + 1 }, (_, index) => xMin + ((xMax - xMin) * index) / SAMPLES);
  const series = fns.map((fn) => xs.map((x) => fn(x)));

  let yMin = plot.yMin;
  let yMax = plot.yMax;
  if (yMin === undefined || yMax === undefined) {
    // Robust range: ignore the extreme 4% so an asymptote doesn't flatten everything else.
    const values = [...series.flat(), ...(plot.points ?? []).map((point) => point.y)]
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    let low = values.length ? values[Math.floor(values.length * 0.04)] : -1;
    let high = values.length ? values[Math.ceil(values.length * 0.96) - 1] : 1;
    for (const point of plot.points ?? []) {
      low = Math.min(low, point.y);
      high = Math.max(high, point.y);
    }
    if (low === high) {
      low -= 1;
      high += 1;
    }
    // Show the x axis when it is close to the curve.
    const span = high - low;
    if (low > 0 && low < span * 0.6) low = 0;
    if (high < 0 && -high < span * 0.6) high = 0;
    const margin = (high - low) * 0.12;
    yMin = low - margin;
    yMax = high + margin;
  }

  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * innerW;
  const py = (y: number) => pad + (1 - (y - yMin!) / (yMax! - yMin!)) * innerH;
  const span = yMax - yMin;

  const paths = series.map((ys) => {
    let d = "";
    let drawing = false;
    let previous = Number.NaN;
    ys.forEach((y, index) => {
      const usable = Number.isFinite(y) && y > yMin! - span * 3 && y < yMax! + span * 3;
      // A huge jump between neighbours is an asymptote, not a steep line.
      const jump = drawing && Number.isFinite(previous) && Math.abs(y - previous) > span * 1.5;
      if (!usable || jump) {
        drawing = false;
        previous = y;
        if (!usable) return;
      }
      const clamped = Math.min(yMax! + span, Math.max(yMin! - span, y));
      d += `${drawing ? "L" : "M"}${px(xs[index]).toFixed(1)},${py(clamped).toFixed(1)}`;
      drawing = true;
      previous = y;
    });
    return d;
  });

  return {
    width,
    height,
    xMin,
    xMax,
    yMin,
    yMax,
    paths,
    xAxis: yMin <= 0 && yMax >= 0 ? py(0) : null,
    yAxis: xMin <= 0 && xMax >= 0 ? px(0) : null,
    xTicks: ticks(xMin, xMax, px, Math.max(3, Math.round(innerW / 70))),
    yTicks: ticks(yMin, yMax, py, Math.max(3, Math.round(innerH / 50))),
    points: (plot.points ?? [])
      .filter((point) => point.x >= xMin && point.x <= xMax && point.y >= yMin! && point.y <= yMax!)
      .map((point) => ({ px: px(point.x), py: py(point.y), label: point.label })),
  };
}

/** "2", "0.5", "-1.25", "1e+6": short tick labels. */
export function formatTick(value: number) {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e5 || abs < 1e-3) return value.toExponential(0);
  return String(Number(value.toPrecision(4)));
}
