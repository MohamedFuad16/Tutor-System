/** KPI tile with a count-up value, plus the unit and duration renderers used inside tiles. */
import { animate as animateValue } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { useMotion } from "@/store/app";
import { formatCount } from "./format";
import { Reveal } from "./primitives";
import { EASE } from "./tokens";

/** Counts from the previous value to `target`; returns the target directly when motion is off. */
function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const controls = animateValue(last.current, target, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (latest) => {
        last.current = latest;
        setValue(latest);
      },
    });
    return () => controls.stop();
  }, [target, enabled]);
  return enabled ? value : target;
}

export function Unit({ children }: { children: ReactNode }) {
  return <span className="ml-0.5 text-[0.5em] font-normal tracking-normal text-fog-400">{children}</span>;
}

export function DurationValue({ minutes }: { minutes: number }) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) {
    return (
      <>
        {rest}
        <Unit>m</Unit>
      </>
    );
  }
  return (
    <>
      {formatCount(hours)}
      <Unit>h</Unit>
      {rest > 0 && hours < 100 && (
        <>
          {" "}
          {rest}
          <Unit>m</Unit>
        </>
      )}
    </>
  );
}

export function KpiTile({
  index,
  icon,
  label,
  value,
  render,
  srValue,
  sub,
  emphasis,
}: {
  index: number;
  icon: ReactNode;
  label: string;
  value: number;
  render: (value: number) => ReactNode;
  srValue: string;
  sub?: ReactNode;
  emphasis?: boolean;
}) {
  const animated = useMotion();
  const current = useCountUp(value, animated);
  return (
    <Reveal
      index={index}
      className={cx(
        "relative flex min-w-0 flex-col overflow-hidden rounded-3xl bg-ink-850 p-4 ring-1 sm:p-5",
        emphasis ? "ring-signal/35" : "ring-white/6",
      )}
    >
      {emphasis && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(255,110,0,0.28) 0%, transparent 70%)" }}
        />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <span className="text-xs leading-snug text-fog-400">{label}</span>
        <span
          aria-hidden
          className={cx(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            emphasis ? "bg-signal/15 text-signal-soft" : "bg-white/5 text-fog-400",
          )}
        >
          {icon}
        </span>
      </div>
      <div
        aria-hidden
        className="relative mt-auto pt-4 font-display text-[1.75rem] leading-none font-medium tracking-tight whitespace-nowrap text-fog-50 sm:text-[2.05rem]"
      >
        {render(current)}
      </div>
      <span className="sr-only">
        {label}: {srValue}
      </span>
      {sub && <div className="relative mt-2.5 truncate text-xs text-fog-500">{sub}</div>}
    </Reveal>
  );
}
