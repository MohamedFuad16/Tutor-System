/** "Activity — last 14 days": stacked daily bars of questions, voice minutes and reviews. */
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMotion } from "@/store/app";
import { formatCount, formatDurationText, formatOneDecimal, longDay, shortDay } from "./format";
import { ChartTooltipCard, ChartTooltipRow, Panel, type TooltipLike } from "./primitives";
import { AXIS_TEXT, GRID, SERIES, type SeriesKey, type Summary } from "./tokens";

type ActivityRow = Summary["daily"][number] & { label: string };

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

export function ActivityPanel({ daily, className }: { daily: Summary["daily"]; className?: string }) {
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
