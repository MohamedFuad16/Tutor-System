/** Shared analytics building blocks: staggered reveal, panel card, chart tooltips, mastery bar and "show all" toggle. */
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button, cx } from "@/components/ui";
import { useMotion } from "@/store/app";
import { clamp01, formatCount, masteryColor } from "./format";
import { EASE } from "./tokens";

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

export function Reveal({
  index = 0,
  as = "div",
  className,
  children,
  ...rest
}: {
  index?: number;
  as?: "div" | "section" | "header";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  const animated = useMotion();
  const Tag = as === "section" ? motion.section : as === "header" ? motion.header : motion.div;
  return (
    <Tag
      className={className}
      initial={animated ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: animated ? Math.min(index, 12) * 0.055 : 0 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

export function Panel({
  index,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  index: number;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Reveal
      as="section"
      index={index}
      aria-labelledby={headingId}
      className={cx("flex min-w-0 flex-col rounded-3xl bg-ink-850 p-5 ring-1 ring-white/6 sm:p-6", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-lg text-fog-50">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-fog-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">{children}</div>
    </Reveal>
  );
}

export function ChartTooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-[10.5rem] rounded-2xl bg-ink-800/95 px-3.5 py-2.5 text-xs shadow-[var(--shadow-float)] ring-1 ring-white/10 backdrop-blur-md">
      <p className="mb-1.5 font-medium text-fog-50">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function ChartTooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-fog-400">
      {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="flex-1">{label}</span>
      <span className="font-medium text-fog-50 tabular-nums">{value}</span>
    </div>
  );
}

export type TooltipLike = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown; name?: unknown; value?: unknown }>;
};

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

export function MasteryBar({ value, assessed = true, label }: { value: number; assessed?: boolean; label: string }) {
  const animated = useMotion();
  const pct = assessed ? clamp01(value) * 100 : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/6"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={assessed ? `${Math.round(pct)}%` : "Not assessed yet"}
    >
      {assessed && (
        <motion.div
          className="h-full rounded-full"
          style={{ background: masteryColor(value) }}
          initial={animated ? { width: "0%" } : false}
          animate={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      )}
    </div>
  );
}

export function ToggleMore({
  expanded,
  total,
  onToggle,
  controls,
}: {
  expanded: boolean;
  total: number;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle} aria-expanded={expanded} aria-controls={controls}>
      {expanded ? "Show less" : `Show all ${formatCount(total)}`}
      <ChevronDown className={cx("size-3.5 transition-transform duration-300", expanded && "rotate-180")} />
    </Button>
  );
}
