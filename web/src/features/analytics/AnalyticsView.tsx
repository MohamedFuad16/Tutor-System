/**
 * Analytics — "Your learning". A quiet, dark dashboard over the learner's
 * activity: KPI tiles, 14-day activity, mastery split, quiz accuracy, the
 * weakest concepts first, and progress per notebook. Everything is driven by
 * a single `useAnalytics()` summary from the server.
 */
import { animate as animateValue, motion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  Clock,
  Flame,
  Gauge,
  GraduationCap,
  Layers,
  MessagesSquare,
  Mic,
  RotateCw,
  Target,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsSummary, ConceptState } from "@shared/types";
import { Button, EmptyState, MasteryRing, cx } from "@/components/ui";
import { DotMatrix } from "@/components/PatternCard";
import { useAnalytics } from "@/lib/queries";
import { useApp, useMotion } from "@/store/app";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const;
const SURFACE = "#0f0f11"; // ink-850, the chart card surface
const AXIS_TEXT = "#7c7c83"; // fog-500
const GRID = "rgba(255,255,255,0.05)";
const ACCURACY_COLOR = "#3b82f6"; // aura-blue

const SERIES = [
  { key: "chat", label: "Questions", color: "#ff6e00", unit: "" },
  { key: "voice", label: "Voice", color: "#8b5cf6", unit: " min" },
  { key: "reviews", label: "Reviews", color: "#22d3ee", unit: "" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

const BUCKET_COLORS: Record<string, string> = {
  New: "#fb923c",
  Learning: "#fbbf24",
  Mastered: "#34d399",
};

const CONCEPTS_PREVIEW = 12;
const BOOKS_PREVIEW = 5;

type Summary = AnalyticsSummary;
type ActivityRow = Summary["daily"][number] & { label: string };
type AccuracyRow = { day: string; label: string; pct: number; attempts: number };

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const plainNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

function formatCount(value: number) {
  return Math.abs(value) >= 10_000 ? compactNumber.format(value) : plainNumber.format(Math.round(value));
}

function formatOneDecimal(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDurationText(minutes: number) {
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

function shortDay(day: string) {
  const date = parseDay(day);
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`;
}

function longDay(day: string) {
  return parseDay(day).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function masteryColor(value: number) {
  return value >= 0.8 ? "#34d399" : value >= 0.4 ? "#fbbf24" : "#fb923c";
}

function dueStatus(dueAt: number | null, now: number): { text: string; due: boolean } {
  if (dueAt == null) return { text: "—", due: false };
  const diff = dueAt - now;
  if (diff <= 0) return { text: "Review now", due: true };
  const hours = diff / 3_600_000;
  if (hours < 1) return { text: "in <1h", due: false };
  if (hours < 24) return { text: `in ${Math.round(hours)}h`, due: false };
  return { text: `in ${Math.round(hours / 24)}d`, due: false };
}

/** Weakest assessed concepts first (ascending mastery), then the unassessed ones. */
function sortConcepts(concepts: ConceptState[]) {
  return [...concepts].sort((a, b) => {
    const aAssessed = a.attempts > 0;
    const bAssessed = b.attempts > 0;
    if (aAssessed !== bAssessed) return aAssessed ? -1 : 1;
    if (!aAssessed) return 0; // keep server order (most recently seen first)
    return a.mastery - b.mastery || b.attempts - a.attempts;
  });
}

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

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

function Reveal({
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
          <div className="rounded-3xl bg-ink-850 ring-1 ring-white/6">
            <EmptyState
              icon={<TriangleAlert className="size-5" />}
              title="Couldn’t load your learning analytics"
              body={
                isError && error instanceof Error ? error.message : "Something went wrong while fetching your summary."
              }
              action={
                <Button variant="dark" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RotateCw className={cx("size-3.5", isFetching && "animate-spin")} />
                  Try again
                </Button>
              }
            />
          </div>
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

function FirstRun() {
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

/* ------------------------------------------------------------------ */
/* KPI tiles                                                           */
/* ------------------------------------------------------------------ */

function Unit({ children }: { children: ReactNode }) {
  return <span className="ml-0.5 text-[0.5em] font-normal tracking-normal text-fog-400">{children}</span>;
}

function DurationValue({ minutes }: { minutes: number }) {
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

function KpiTile({
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

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

function Panel({
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

function ChartTooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-[10.5rem] rounded-2xl bg-ink-800/95 px-3.5 py-2.5 text-xs shadow-[var(--shadow-float)] ring-1 ring-white/10 backdrop-blur-md">
      <p className="mb-1.5 font-medium text-fog-50">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ChartTooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-fog-400">
      {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="flex-1">{label}</span>
      <span className="font-medium text-fog-50 tabular-nums">{value}</span>
    </div>
  );
}

type TooltipLike = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown; name?: unknown; value?: unknown }>;
};

/* ---------- Activity (stacked bars) ---------- */

function topRoundedPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `A${r},${r} 0 0 1 ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    "Z",
  ].join(" ");
}

/**
 * One stacked segment. The top-most non-empty segment gets 4px rounded
 * corners; every other segment leaves a 2px surface gap above it.
 */
function makeSegmentShape(key: SeriesKey) {
  const order = SERIES.findIndex((series) => series.key === key);
  return function Segment(props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
    payload?: ActivityRow;
  }) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
    if (!payload || height <= 0 || width <= 0) return null;
    const isTop = SERIES.slice(order + 1).every((series) => !(payload[series.key] > 0));
    if (isTop) return <path d={topRoundedPath(x, y, width, height, 4)} fill={fill} />;
    const gap = Math.min(2, Math.max(0, height - 1));
    return <rect x={x} y={y + gap} width={width} height={height - gap} fill={fill} />;
  };
}

const SEGMENT_SHAPES = {
  chat: makeSegmentShape("chat"),
  voice: makeSegmentShape("voice"),
  reviews: makeSegmentShape("reviews"),
} satisfies Record<SeriesKey, unknown>;

function ActivityTooltip({ active, payload }: TooltipLike) {
  const row = payload?.[0]?.payload as ActivityRow | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard title={longDay(row.day)}>
      {SERIES.map((series) => (
        <ChartTooltipRow
          key={series.key}
          color={series.color}
          label={series.label}
          value={`${series.key === "voice" ? formatOneDecimal(row.voice) : formatCount(row[series.key])}${series.unit}`}
        />
      ))}
      {row.minutes > 0 && (
        <div className="mt-1.5 border-t border-white/8 pt-1.5">
          <ChartTooltipRow label="Study time" value={formatDurationText(row.minutes)} />
        </div>
      )}
    </ChartTooltipCard>
  );
}

function ActivityPanel({ daily, className }: { daily: Summary["daily"]; className?: string }) {
  const animated = useMotion();
  const rows = useMemo<ActivityRow[]>(() => daily.map((row) => ({ ...row, label: shortDay(row.day) })), [daily]);
  const sums = useMemo(
    () => ({
      chat: daily.reduce((sum, row) => sum + row.chat, 0),
      voice: daily.reduce((sum, row) => sum + row.voice, 0),
      reviews: daily.reduce((sum, row) => sum + row.reviews, 0),
    }),
    [daily],
  );
  const quiet = sums.chat + sums.voice + sums.reviews === 0;
  const summary = `${formatCount(sums.chat)} questions, ${formatOneDecimal(sums.voice)} voice minutes and ${formatCount(sums.reviews)} reviews in the last ${daily.length} days.`;

  return (
    <Panel
      index={7}
      className={className}
      title="Activity — last 14 days"
      subtitle="Questions, voice minutes and reviews per day"
      action={
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" aria-label="Legend">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5 text-fog-400">
              <span aria-hidden className="size-2 rounded-full" style={{ background: series.color }} />
              {series.label}
              <span className="font-medium text-fog-50 tabular-nums">
                {series.key === "voice" ? `${formatOneDecimal(sums.voice)} min` : formatCount(sums[series.key])}
              </span>
            </li>
          ))}
        </ul>
      }
    >
      <figure className="relative -mx-1 min-h-60 flex-1" aria-label={`Stacked bar chart of daily activity. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 240 }}>
          <BarChart data={rows} margin={{ top: 6, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              tickMargin={8}
              minTickGap={10}
              interval="preserveStartEnd"
            />
            <YAxis
              width={34}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS_TEXT, fontSize: 11 }}
              tickFormatter={(value: number) => formatCount(value)}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.035)" }}
              isAnimationActive={false}
              wrapperStyle={{ outline: "none" }}
              content={(props) => <ActivityTooltip active={props.active} payload={props.payload} />}
            />
            {SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="activity"
                fill={series.color}
                maxBarSize={22}
                shape={SEGMENT_SHAPES[series.key]}
                isAnimationActive={animated}
                animationDuration={800}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {quiet && (
          <figcaption className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
            <span className="rounded-full bg-ink-800/90 px-3 py-1.5 text-xs text-fog-400 ring-1 ring-white/8">
              No activity in the last two weeks
            </span>
          </figcaption>
        )}
      </figure>
      <div className="sr-only">
        <table>
          <caption>Daily activity, last {daily.length} days</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Questions</th>
              <th scope="col">Voice minutes</th>
              <th scope="col">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.day}>
                <th scope="row">{longDay(row.day)}</th>
                <td>{row.chat}</td>
                <td>{formatOneDecimal(row.voice)}</td>
                <td>{row.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------- Mastery (donut) ---------- */

function MasteryPanel({ buckets, total }: { buckets: Summary["masteryBuckets"]; total: number }) {
  const animated = useMotion();
  const size = 184;
  const bucketTotal = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const slices = buckets
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => ({ label: bucket.label, count: bucket.count, color: BUCKET_COLORS[bucket.label] ?? "#a1a1a6" }));
  const share = (count: number) => (bucketTotal > 0 ? Math.round((count / bucketTotal) * 100) : 0);
  const description = buckets.map((bucket) => `${bucket.label}: ${bucket.count}`).join(", ");

  return (
    <Panel index={8} title="Mastery" subtitle="How far each concept has come">
      <div className="flex flex-col items-center gap-6">
        <figure
          className="relative"
          style={{ width: size, height: size }}
          aria-label={`Donut chart of ${total} concepts by mastery. ${description}.`}
        >
          {slices.length > 0 ? (
            <PieChart width={size} height={size}>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={86}
                startAngle={90}
                endAngle={-270}
                paddingAngle={slices.length > 1 ? 3 : 0}
                cornerRadius={4}
                stroke="none"
                isAnimationActive={animated}
                animationDuration={900}
              >
                {slices.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                isAnimationActive={false}
                wrapperStyle={{ outline: "none", zIndex: 10 }}
                content={(props) => {
                  const entry = props.payload?.[0];
                  if (!props.active || !entry) return null;
                  const slice = slices.find((item) => item.label === String(entry.name));
                  if (!slice) return null;
                  return (
                    <ChartTooltipCard title={slice.label}>
                      <ChartTooltipRow color={slice.color} label="Concepts" value={formatCount(slice.count)} />
                      <ChartTooltipRow label="Share" value={`${share(slice.count)}%`} />
                    </ChartTooltipCard>
                  );
                }}
              />
            </PieChart>
          ) : (
            <svg width={size} height={size} aria-hidden>
              <circle cx={size / 2} cy={size / 2} r={75} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={22} />
            </svg>
          )}
          <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[2.1rem] leading-none text-fog-50">{formatCount(total)}</span>
            <span className="mt-1 text-xs text-fog-500">{total === 1 ? "concept" : "concepts"}</span>
          </figcaption>
        </figure>

        <ul className="w-full space-y-2.5" aria-label="Mastery legend">
          {buckets.map((bucket) => (
            <li key={bucket.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: BUCKET_COLORS[bucket.label] ?? "#a1a1a6" }}
              />
              <span className="flex-1 text-fog-200">{bucket.label}</span>
              <span className="font-medium text-fog-50 tabular-nums">{formatCount(bucket.count)}</span>
              <span className="w-10 text-right text-xs text-fog-500 tabular-nums">{share(bucket.count)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ---------- Quiz accuracy (area) ---------- */

function AccuracyTooltip({ active, payload }: TooltipLike) {
  const row = payload?.[0]?.payload as AccuracyRow | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard title={longDay(row.day)}>
      <ChartTooltipRow color={ACCURACY_COLOR} label="Accuracy" value={`${row.pct}%`} />
      <ChartTooltipRow label="Attempts" value={formatCount(row.attempts)} />
    </ChartTooltipCard>
  );
}

function AccuracyPanel({ trend, className }: { trend: Summary["accuracyTrend"]; className?: string }) {
  const animated = useMotion();
  const gradientId = `acc-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rows = useMemo<AccuracyRow[]>(
    () =>
      trend.map((point) => ({
        day: point.day,
        label: shortDay(point.day),
        pct: Math.round(clamp01(point.accuracy) * 100),
        attempts: point.attempts,
      })),
    [trend],
  );
  const attempts = trend.reduce((sum, point) => sum + point.attempts, 0);
  const overall =
    attempts > 0
      ? Math.round((trend.reduce((sum, point) => sum + clamp01(point.accuracy) * point.attempts, 0) / attempts) * 100)
      : null;
  const latest = rows.at(-1);

  return (
    <Panel
      index={9}
      className={className}
      title="Quiz accuracy"
      subtitle="Share of quiz and review answers you got right, per day"
      action={
        overall != null ? (
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl leading-none text-fog-50">
              {overall}
              <span className="ml-0.5 text-sm text-fog-400">%</span>
            </span>
            <span className="text-xs text-fog-500">
              overall · {formatCount(attempts)} {attempts === 1 ? "answer" : "answers"}
            </span>
          </div>
        ) : undefined
      }
    >
      {rows.length < 2 ? (
        <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 px-6 py-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-white/5 text-fog-400">
            <Target className="size-5" />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-fog-400">
            {latest
              ? `${latest.pct}% on ${longDay(latest.day)}. Answer a few more quiz questions on another day to see your trend.`
              : "Answer a few quiz questions in Study or Revision — your accuracy trend will appear here after two active days."}
          </p>
        </div>
      ) : (
        <>
          <figure
            className="-mx-1 min-h-56 flex-1"
            aria-label={`Area chart of quiz accuracy over ${rows.length} days${latest ? `, latest ${latest.pct}%` : ""}${overall != null ? `, ${overall}% overall` : ""}.`}
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
              <AreaChart data={rows} margin={{ top: 8, right: 10, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCURACY_COLOR} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={ACCURACY_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                  tickMargin={8}
                  minTickGap={12}
                  interval="preserveStartEnd"
                />
                <YAxis
                  width={40}
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
                  isAnimationActive={false}
                  wrapperStyle={{ outline: "none" }}
                  content={(props) => <AccuracyTooltip active={props.active} payload={props.payload} />}
                />
                <Area
                  type="monotone"
                  dataKey="pct"
                  name="Accuracy"
                  stroke={ACCURACY_COLOR}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={`url(#${gradientId})`}
                  dot={{ r: 4, fill: ACCURACY_COLOR, stroke: SURFACE, strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: ACCURACY_COLOR, stroke: SURFACE, strokeWidth: 2 }}
                  isAnimationActive={animated}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </figure>
          <div className="sr-only">
            <table>
              <caption>Quiz accuracy per day</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.day}>
                    <th scope="row">{longDay(row.day)}</th>
                    <td>{row.pct}%</td>
                    <td>{row.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

/* ---------- Shared bits ---------- */

function MasteryBar({ value, assessed = true, label }: { value: number; assessed?: boolean; label: string }) {
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

function ToggleMore({
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

/* ---------- Notebooks ---------- */

function NotebooksPanel({ books, className }: { books: Summary["books"]; className?: string }) {
  const animated = useMotion();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? books : books.slice(0, BOOKS_PREVIEW);

  return (
    <Panel
      index={10}
      className={className}
      title="Notebooks"
      subtitle="Average concept mastery in each notebook"
      action={
        books.length > 0 ? (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-fog-400 tabular-nums">{books.length}</span>
        ) : undefined
      }
    >
      {books.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/8 px-5 py-10 text-center text-sm text-fog-400">
          Create a notebook in Study to track progress per subject.
        </p>
      ) : (
        <>
          <ul id={listId} className="space-y-2.5">
            {visible.map((book, i) => {
              const pct = Math.round(clamp01(book.mastery) * 100);
              return (
                <li key={book.id} className="rounded-2xl bg-white/[0.025] p-3.5 ring-1 ring-white/5">
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-950 ring-1 ring-white/6"
                    >
                      <DotMatrix pattern={i} color="#ff6e00" size={18} animate={animated} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fog-50">{book.title || "Untitled notebook"}</p>
                      <p className="mt-0.5 truncate text-xs text-fog-500">
                        {formatCount(book.concepts)} {book.concepts === 1 ? "concept" : "concepts"} ·{" "}
                        {formatCount(book.messages)} {book.messages === 1 ? "message" : "messages"}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-sm text-fog-200 tabular-nums">
                      {book.concepts > 0 ? `${pct}%` : "—"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <MasteryBar
                      value={book.mastery}
                      assessed={book.concepts > 0}
                      label={`${book.title} average mastery`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {books.length > BOOKS_PREVIEW && (
            <div className="mt-4 flex justify-center">
              <ToggleMore
                expanded={expanded}
                total={books.length}
                onToggle={() => setExpanded((v) => !v)}
                controls={listId}
              />
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ---------- Concepts ---------- */

function DueBadge({ dueAt, now, hideEmpty }: { dueAt: number | null; now: number; hideEmpty?: boolean }) {
  const status = dueStatus(dueAt, now);
  if (dueAt == null && hideEmpty) return null;
  if (status.due) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-signal/12 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-signal-soft ring-1 ring-signal/25">
        <span aria-hidden className="size-1.5 rounded-full bg-signal" />
        {status.text}
      </span>
    );
  }
  return <span className="text-xs whitespace-nowrap text-fog-400 tabular-nums">{status.text}</span>;
}

function ConceptsPanel({ concepts, books, now }: { concepts: ConceptState[]; books: Summary["books"]; now: number }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const sorted = useMemo(() => sortConcepts(concepts), [concepts]);
  const bookTitles = useMemo(() => new Map(books.map((book) => [book.id, book.title])), [books]);
  const visible = expanded ? sorted : sorted.slice(0, CONCEPTS_PREVIEW);
  const dueCount = concepts.filter((concept) => concept.dueAt != null && concept.dueAt <= now).length;

  return (
    <Panel
      index={11}
      title="Concepts"
      subtitle="Weakest first — the best places to spend your next session"
      action={
        concepts.length > 0 ? (
          <div className="flex items-center gap-2 text-xs">
            {dueCount > 0 && (
              <span className="rounded-full bg-signal/10 px-2.5 py-1 text-signal-soft ring-1 ring-signal/20 tabular-nums">
                {formatCount(dueCount)} due
              </span>
            )}
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-fog-400 tabular-nums">
              {formatCount(concepts.length)} tracked
            </span>
          </div>
        ) : undefined
      }
    >
      {concepts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/8 px-5 py-10 text-center text-sm text-fog-400">
          Concepts appear as you study — ask questions and your tutor maps what you’re learning.
        </p>
      ) : (
        <div id={listId}>
          {/* Desktop: table */}
          <table className="hidden w-full table-fixed text-sm md:table">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.12em] text-fog-500 uppercase">
                <th scope="col" className="w-[36%] pb-3 font-medium">
                  Concept
                </th>
                <th scope="col" className="w-[20%] pb-3 pl-4 font-medium">
                  Notebook
                </th>
                <th scope="col" className="w-[22%] pb-3 pl-4 font-medium">
                  Mastery
                </th>
                <th scope="col" className="w-[10%] pb-3 pl-4 text-right font-medium">
                  Correct
                </th>
                <th scope="col" className="w-[12%] pb-3 pl-4 text-right font-medium">
                  Review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 border-t border-white/5">
              {visible.map((concept) => {
                const assessed = concept.attempts > 0;
                return (
                  <tr key={concept.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <MasteryRing
                          value={assessed ? concept.mastery : -1}
                          size={28}
                          className="shrink-0 text-fog-400"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fog-50" title={concept.name}>
                            {concept.name}
                          </p>
                          {concept.summary && (
                            <p className="truncate text-xs text-fog-500" title={concept.summary}>
                              {concept.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pl-4">
                      <p className="truncate text-fog-400" title={bookTitles.get(concept.bookId)}>
                        {bookTitles.get(concept.bookId) ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <MasteryBar value={concept.mastery} assessed={assessed} label={`${concept.name} mastery`} />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs text-fog-200 tabular-nums">
                          {assessed ? `${Math.round(clamp01(concept.mastery) * 100)}%` : "New"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right text-xs text-fog-200 tabular-nums">
                      {assessed ? (
                        <>
                          {concept.correct}
                          <span className="text-fog-500">/{concept.attempts}</span>
                        </>
                      ) : (
                        <span className="text-fog-500">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <DueBadge dueAt={concept.dueAt} now={now} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile: cards */}
          <ul className="space-y-2.5 md:hidden">
            {visible.map((concept) => {
              const assessed = concept.attempts > 0;
              return (
                <li key={concept.id} className="rounded-2xl bg-white/[0.025] p-4 ring-1 ring-white/5">
                  <div className="flex items-start gap-3">
                    <MasteryRing
                      value={assessed ? concept.mastery : -1}
                      size={32}
                      className="mt-0.5 shrink-0 text-fog-400"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm leading-snug font-medium break-words text-fog-50">
                        {concept.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-fog-500">{bookTitles.get(concept.bookId) ?? "—"}</p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-xs text-fog-200 tabular-nums">
                      {assessed ? `${Math.round(clamp01(concept.mastery) * 100)}%` : "New"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <MasteryBar value={concept.mastery} assessed={assessed} label={`${concept.name} mastery`} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-fog-500 tabular-nums">
                      {assessed ? `${concept.correct}/${concept.attempts} correct` : "Not assessed yet"}
                    </span>
                    <DueBadge dueAt={concept.dueAt} now={now} hideEmpty />
                  </div>
                </li>
              );
            })}
          </ul>

          {sorted.length > CONCEPTS_PREVIEW && (
            <div className="mt-4 flex justify-center">
              <ToggleMore
                expanded={expanded}
                total={sorted.length}
                onToggle={() => setExpanded((v) => !v)}
                controls={listId}
              />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function AnalyticsSkeleton() {
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
