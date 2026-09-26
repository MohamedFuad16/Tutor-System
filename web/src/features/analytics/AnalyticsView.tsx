/**
 * Analytics — "Your learning". A quiet, dark dashboard over the learner's
 * activity: KPI tiles, 14-day activity, mastery split, quiz accuracy, the
 * weakest concepts first, and progress per notebook. Everything is driven by
 * a single `useAnalytics()` summary from the server.
 *
 * This file is the composition root; panels, primitives, tokens and
 * formatting helpers live in sibling modules.
 */
import { ArrowRight, CircleCheck, Clock, Flame, Gauge, GraduationCap, Layers, MessagesSquare, Mic } from "lucide-react";
import { cx } from "@/components/ui";
import { useAnalytics } from "@/lib/queries";
import { useApp, useMotion } from "@/store/app";
import { AccuracyPanel } from "./AccuracyChart";
import { ActivityPanel } from "./ActivityChart";
import { ConceptsPanel } from "./ConceptTable";
import { DurationValue, KpiTile, Unit } from "./KpiTiles";
import { MasteryPanel } from "./MasteryDonut";
import { NotebooksPanel } from "./NotebookProgress";
import { clamp01, formatCount, formatDurationText } from "./format";
import { Reveal } from "./primitives";
import { AnalyticsError, AnalyticsSkeleton, FirstRun } from "./states";
import type { Summary } from "./tokens";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function AnalyticsView() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAnalytics();

  const empty = data ? data.totals.questions === 0 && data.totals.concepts === 0 : false;

  return (
    <div className="scroll-quiet relative h-full overflow-x-hidden overflow-y-auto bg-ink-950">
      <div className="mx-auto w-full max-w-6xl px-4 pt-24 pb-24 sm:px-6 lg:px-8">
        {isLoading ? (
          <AnalyticsSkeleton />
        ) : !data ? (
          <AnalyticsError
            message={
              isError && error instanceof Error ? error.message : "Something went wrong while fetching your summary."
            }
            retrying={isFetching}
            onRetry={() => refetch()}
          />
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <PageHeader streakDays={data.totals.streakDays} />
            {empty ? <FirstRun /> : <Dashboard data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}

function PageHeader({ streakDays }: { streakDays: number }) {
  const animated = useMotion();
  const active = streakDays > 0;
  return (
    <Reveal as="header" index={0} className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[2rem] leading-[1.05] text-fog-50 sm:text-[2.6rem]">Your learning</h1>
        <p className="mt-2 text-sm text-fog-400 sm:text-[0.95rem]">
          Where your time went, what’s sticking, and what to revisit next.
        </p>
      </div>
      <div
        className={cx(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ring-1",
          active ? "bg-signal/10 text-fog-50 ring-signal/30" : "bg-white/4 text-fog-400 ring-white/8",
        )}
        aria-label={active ? `${streakDays}-day study streak` : "No active streak yet"}
      >
        <Flame
          aria-hidden
          className={cx("size-4", active ? "text-signal" : "text-fog-500", active && animated && "animate-breathe")}
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.25 : 0}
        />
        {active ? (
          <span>
            <span className="font-display tabular-nums">{streakDays}</span>-day streak
          </span>
        ) : (
          <span>Start a streak today</span>
        )}
      </div>
    </Reveal>
  );
}

function Dashboard({ data }: { data: Summary }) {
  const setView = useApp((state) => state.setView);
  const { totals } = data;
  const averagePct = Math.round(clamp01(totals.averageMastery) * 100);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
        <KpiTile
          index={1}
          icon={<Clock className="size-3.5" />}
          label="Study time"
          value={totals.studyMinutes}
          render={(v) => <DurationValue minutes={v} />}
          srValue={formatDurationText(totals.studyMinutes)}
          sub="reading, chat, voice"
        />
        <KpiTile
          index={2}
          icon={<MessagesSquare className="size-3.5" />}
          label="Questions asked"
          value={totals.questions}
          render={(v) => formatCount(v)}
          srValue={formatCount(totals.questions)}
          sub="to your tutor"
        />
        <KpiTile
          index={3}
          icon={<Mic className="size-3.5" />}
          label="Voice minutes"
          value={totals.voiceMinutes}
          render={(v) => (
            <>
              {formatCount(v)}
              <Unit>min</Unit>
            </>
          )}
          srValue={`${formatCount(totals.voiceMinutes)} minutes`}
          sub="spoken aloud"
        />
        <KpiTile
          index={4}
          icon={<GraduationCap className="size-3.5" />}
          label="Concepts mastered"
          value={totals.masteredConcepts}
          render={(v) => (
            <>
              {formatCount(v)}
              <Unit>/ {formatCount(totals.concepts)}</Unit>
            </>
          )}
          srValue={`${totals.masteredConcepts} of ${totals.concepts}`}
          sub={`${formatCount(totals.concepts)} tracked`}
        />
        <KpiTile
          index={5}
          icon={<Gauge className="size-3.5" />}
          label="Average mastery"
          value={averagePct}
          render={(v) => (
            <>
              {Math.round(v)}
              <Unit>%</Unit>
            </>
          )}
          srValue={`${averagePct}%`}
          sub="all concepts"
        />
        <KpiTile
          index={6}
          icon={totals.cardsDue > 0 ? <Layers className="size-3.5" /> : <CircleCheck className="size-3.5" />}
          label="Cards due"
          value={totals.cardsDue}
          render={(v) => formatCount(v)}
          srValue={formatCount(totals.cardsDue)}
          emphasis={totals.cardsDue > 0}
          sub={
            totals.cardsDue > 0 ? (
              <button
                type="button"
                onClick={() => setView("revision")}
                className="group inline-flex items-center gap-1 rounded-full text-signal-soft transition-colors hover:text-signal"
              >
                Start review
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              "all caught up"
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <ActivityPanel daily={data.daily} className="lg:col-span-2" />
        <MasteryPanel buckets={data.masteryBuckets} total={totals.concepts} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        <AccuracyPanel trend={data.accuracyTrend} className="lg:col-span-3" />
        <NotebooksPanel books={data.books} className="lg:col-span-2" />
      </div>

      <ConceptsPanel concepts={data.concepts} books={data.books} now={data.generatedAt} />
    </>
  );
}
