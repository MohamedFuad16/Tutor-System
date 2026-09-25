/** "Mastery": donut of concepts split into New / Learning / Mastered, with a legend and shares. */
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { useMotion } from "@/store/app";
import { formatCount } from "./format";
import { ChartTooltipCard, ChartTooltipRow, Panel } from "./primitives";
import { BUCKET_COLORS, type Summary } from "./tokens";

export function MasteryPanel({ buckets, total }: { buckets: Summary["masteryBuckets"]; total: number }) {
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
