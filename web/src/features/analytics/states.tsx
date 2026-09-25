/** Non-dashboard analytics states: loading skeleton, load error with retry, and the first-run empty state. */
import { ArrowRight, RotateCw, TriangleAlert } from "lucide-react";
import { Button, EmptyState, cx } from "@/components/ui";
import { DotMatrix } from "@/components/PatternCard";
import { useApp, useMotion } from "@/store/app";
import { Reveal } from "./primitives";

/* ------------------------------------------------------------------ */
/* Error                                                               */
/* ------------------------------------------------------------------ */

export function AnalyticsError({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-3xl bg-ink-850 ring-1 ring-white/6">
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        title="Couldn’t load your learning analytics"
        body={message}
        action={
          <Button variant="dark" size="sm" onClick={() => onRetry()} disabled={retrying}>
            <RotateCw className={cx("size-3.5", retrying && "animate-spin")} />
            Try again
          </Button>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* First run (empty)                                                   */
/* ------------------------------------------------------------------ */

export function FirstRun() {
  const setView = useApp((state) => state.setView);
  const animated = useMotion();
  return (
    <Reveal index={1} className="relative overflow-hidden rounded-3xl bg-ink-850 ring-1 ring-white/6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/2 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255,110,0,0.12) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
        }}
      />
      <div className="relative py-4">
        <EmptyState
          icon={<DotMatrix pattern={1} color="#ff6e00" size={22} animate={animated} />}
          title="Your learning story starts here"
          body="Open Study, add a paper or textbook and ask your tutor a question. Study time, mastered concepts and your review streak will build up on this page."
          action={
            <Button variant="primary" className="mt-2" onClick={() => setView("study")}>
              Open Study
              <ArrowRight className="size-4" />
            </Button>
          }
        />
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

export function AnalyticsSkeleton() {
  const animated = useMotion();
  const block = cx("bg-white/[0.04]", animated && "animate-pulse");
  return (
    <div aria-busy="true" className="space-y-6 sm:space-y-8">
      <span className="sr-only" role="status">
        Loading your learning analytics…
      </span>
      <div className="flex flex-wrap items-end justify-between gap-4" aria-hidden>
        <div className="space-y-3">
          <div className={cx(block, "h-9 w-52 rounded-xl sm:h-11 sm:w-64")} />
          <div className={cx(block, "h-4 w-72 max-w-[80vw] rounded-lg")} />
        </div>
        <div className={cx(block, "h-8 w-32 rounded-full")} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-3xl bg-ink-850 p-4 ring-1 ring-white/6 sm:p-5">
            <div className={cx(block, "h-3 w-20 rounded-md")} />
            <div className={cx(block, "mt-5 h-8 w-16 rounded-lg")} />
            <div className={cx(block, "mt-3 h-3 w-24 max-w-full rounded-md")} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3" aria-hidden>
        <div className="rounded-3xl bg-ink-850 p-6 ring-1 ring-white/6 lg:col-span-2">
          <div className={cx(block, "h-5 w-48 rounded-lg")} />
          <div className="mt-8 flex h-52 items-end gap-2">
            {Array.from({ length: 14 }, (_, i) => (
              <div
                key={i}
                className={cx(block, "flex-1 rounded-t-md")}
                style={{ height: `${22 + ((i * 37) % 70)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-ink-850 p-6 ring-1 ring-white/6">
          <div className={cx(block, "h-5 w-24 rounded-lg")} />
          <div className="mt-6 flex justify-center">
            <div className={cx(block, "size-44 rounded-full")} />
          </div>
        </div>
      </div>
      <div className={cx(block, "h-72 rounded-3xl")} aria-hidden />
    </div>
  );
}
