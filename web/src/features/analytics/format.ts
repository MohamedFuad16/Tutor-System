/** Number, duration and date formatting plus small value helpers shared by the analytics panels. */
import type { ConceptState } from "@shared/types";

const plainNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(value: number) {
  return Math.abs(value) >= 10_000 ? compactNumber.format(value) : plainNumber.format(Math.round(value));
}

export function formatOneDecimal(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatDurationText(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, date || 1);
}

export function shortDay(day: string) {
  const date = parseDay(day);
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`;
}

export function longDay(day: string) {
  return parseDay(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function masteryColor(value: number) {
  return value >= 0.8 ? "#34d399" : value >= 0.4 ? "#fbbf24" : "#fb923c";
}

export function dueStatus(dueAt: number | null, now: number): { text: string; due: boolean } {
  if (dueAt == null) return { text: "—", due: false };
  const diff = dueAt - now;
  if (diff <= 0) return { text: "Review now", due: true };
  const hours = diff / 3_600_000;
  if (hours < 1) return { text: "in <1h", due: false };
  if (hours < 24) return { text: `in ${Math.round(hours)}h`, due: false };
  return { text: `in ${Math.round(hours / 24)}d`, due: false };
}

/** Weakest assessed concepts first (ascending mastery), then the unassessed ones. */
export function sortConcepts(concepts: ConceptState[]) {
  return [...concepts].sort((a, b) => {
    const aAssessed = a.attempts > 0;
    const bAssessed = b.attempts > 0;
    if (aAssessed !== bAssessed) return aAssessed ? -1 : 1;
    if (!aAssessed) return 0; // keep server order (most recently seen first)
    return a.mastery - b.mastery || b.attempts - a.attempts;
  });
}
