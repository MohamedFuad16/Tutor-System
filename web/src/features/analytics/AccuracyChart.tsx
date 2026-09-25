/** "Quiz accuracy": daily share of correct quiz/review answers as an area chart, with an overall figure. */
import { Target } from "lucide-react";
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMotion } from "@/store/app";
import { clamp01, formatCount, longDay, shortDay } from "./format";
import { ChartTooltipCard, ChartTooltipRow, Panel, type TooltipLike } from "./primitives";
import { ACCURACY_COLOR, AXIS_TEXT, GRID, SURFACE, type Summary } from "./tokens";

type AccuracyRow = { day: string; label: string; pct: number; attempts: number };

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

export function AccuracyPanel({ trend, className }: { trend: Summary["accuracyTrend"]; className?: string }) {
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
