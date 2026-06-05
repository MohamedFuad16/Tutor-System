import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { db, type PersistentConcept } from "../memory/longterm.memory";
import { gsap } from "gsap";
import { useTranslation } from "../lib/translations";
import { useMotionPreference } from "../hooks/useMotionPreference";

const COLORS = ["#3b82f6", "#a855f7", "#f97316"];
const MAX_VISIBLE_CONCEPTS = 12;
const UNTITLED_CONCEPT_LABEL = "Untitled concept";

type ConceptAnalyticsRecord = {
  id: string;
  name: string;
  mastery: number;
  confidence: number;
  lastReviewedAt: number;
};

type ConceptAnalyticsSource = Partial<
  Pick<
    PersistentConcept,
    "id" | "name" | "mastery" | "confidence" | "p_learn" | "lastReviewedAt"
  >
>;

type AnalyticsSnapshot = {
  status: "ready" | "error";
  concepts: ConceptAnalyticsRecord[];
  interactionCount: number;
  sessionCount: number;
  error?: string;
};

function clampUnitInterval(value: number | undefined, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(1, Math.max(0, numericValue));
}

function clampPercent(value: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.min(100, Math.max(0, numericValue));
}

function formatPercent(value: number) {
  return `${Math.round(clampPercent(value))}%`;
}

function shortConceptName(name: string) {
  const displayName = name.trim() || UNTITLED_CONCEPT_LABEL;
  return displayName.length > 18
    ? `${displayName.slice(0, 16)}...`
    : displayName;
}

function normalizeConceptForAnalytics(
  concept: ConceptAnalyticsSource,
): ConceptAnalyticsRecord {
  const id = String(concept.id || concept.name || UNTITLED_CONCEPT_LABEL);
  const name = String(concept.name || id).trim() || UNTITLED_CONCEPT_LABEL;
  const mastery = clampUnitInterval(
    concept.p_learn,
    clampUnitInterval(concept.mastery),
  );
  const confidence = clampUnitInterval(concept.confidence, mastery);
  const reviewedAt = Number(concept.lastReviewedAt);

  return {
    id,
    name,
    mastery,
    confidence,
    lastReviewedAt: Number.isFinite(reviewedAt) ? reviewedAt : 0,
  };
}

function ChartMessage({
  title,
  detail,
  role = "status",
}: {
  title: string;
  detail: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className="flex h-full min-h-[17rem] flex-col items-center justify-center px-6 text-center"
    >
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function InfoDot({
  label,
  describedBy,
}: {
  label: string;
  describedBy: string;
}) {
  return (
    <button
      type="button"
      aria-describedby={describedBy}
      aria-label={label}
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-600 text-[10px] leading-none text-zinc-500 motion-safe:transition-colors hover:border-zinc-400 hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      i
    </button>
  );
}

export function AnalyticsView() {
  const { t, language } = useTranslation();
  const motionEnabled = useMotionPreference();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const analyticsSnapshot =
    useLiveQuery(async (): Promise<AnalyticsSnapshot> => {
      try {
        const [conceptList, interactionTotal, sessionTotal] = await Promise.all(
          [db.concepts.toArray(), db.interactions.count(), db.sessions.count()],
        );

        return {
          status: "ready",
          concepts: conceptList.map(normalizeConceptForAnalytics),
          interactionCount: interactionTotal,
          sessionCount: sessionTotal,
        };
      } catch (error) {
        console.error("Failed to load analytics data", error);
        return {
          status: "error",
          concepts: [],
          interactionCount: 0,
          sessionCount: 0,
          error: "Analytics data could not be loaded.",
        };
      }
    }, []);
  const concepts = analyticsSnapshot?.concepts ?? [];
  const interactionCount = analyticsSnapshot?.interactionCount ?? 0;
  const sessionCount = analyticsSnapshot?.sessionCount ?? 0;
  const isLoading = analyticsSnapshot === undefined;
  const loadError =
    analyticsSnapshot?.status === "error" ? analyticsSnapshot.error : null;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        content,
        { autoAlpha: 0, y: 20 },
        {
          autoAlpha: 1,
          y: 0,
          duration: motionEnabled ? 0.42 : 0,
          ease: "power3.out",
        },
      );
    }, content);

    return () => context.revert();
  }, [motionEnabled]);

  const masteryLabel = t("mastery");
  const confidenceLabel = t("confidence");
  const masteredLabel = t("mastered");
  const learningLabel = t("learning");
  const newLabel = t("new");

  const emptyCopy = {
    en: {
      loading: "Loading analytics...",
      loadingDetail: "Gathering learning memory, interactions, and sessions.",
      error: loadError || "Analytics data could not be loaded.",
      errorDetail: "Try again after the local learning memory is available.",
      noConcepts: "No concept mastery data yet",
      noConceptsDetail:
        "Study a document or discuss concepts with the tutor to populate this chart.",
      noDistribution: "No mastery distribution yet",
      noDistributionDetail:
        "The distribution will appear once at least one concept is tracked.",
    },
    ja: {
      loading: "分析を読み込み中...",
      loadingDetail: "学習記憶、会話、セッションを集計しています。",
      error: loadError || "分析データを読み込めませんでした。",
      errorDetail: "ローカル学習メモリが利用可能になったら再試行してください。",
      noConcepts: "概念の熟練度データはまだありません",
      noConceptsDetail:
        "文書を学習するか、チューターと概念について会話すると表示されます。",
      noDistribution: "熟練度分布はまだありません",
      noDistributionDetail:
        "少なくとも1つの概念が記録されると分布が表示されます。",
    },
    ko: {
      loading: "분석을 불러오는 중...",
      loadingDetail: "학습 기억, 상호작용, 세션을 모으고 있습니다.",
      error: loadError || "분석 데이터를 불러오지 못했습니다.",
      errorDetail: "로컬 학습 메모리를 사용할 수 있게 되면 다시 시도하세요.",
      noConcepts: "아직 개념 숙련도 데이터가 없습니다",
      noConceptsDetail:
        "문서를 학습하거나 튜터와 개념을 논의하면 이 차트가 채워집니다.",
      noDistribution: "아직 숙련도 분포가 없습니다",
      noDistributionDetail: "하나 이상의 개념이 추적되면 분포가 표시됩니다.",
    },
  }[language];

  const visibleConcepts = useMemo(
    () =>
      [...concepts]
        .sort((a, b) => (b.lastReviewedAt || 0) - (a.lastReviewedAt || 0))
        .slice(0, MAX_VISIBLE_CONCEPTS),
    [concepts],
  );

  const masteryData = useMemo(
    () =>
      visibleConcepts.map((concept) => ({
        name: shortConceptName(concept.name),
        fullName: concept.name,
        mastery: Math.round(concept.mastery * 100),
        confidence: Math.round(concept.confidence * 100),
      })),
    [visibleConcepts],
  );

  const masteryCounts = useMemo(
    () => ({
      [masteredLabel]: concepts.filter((concept) => concept.mastery > 0.7)
        .length,
      [learningLabel]: concepts.filter(
        (concept) => concept.mastery > 0.4 && concept.mastery <= 0.7,
      ).length,
      [newLabel]: concepts.filter((concept) => concept.mastery <= 0.4).length,
    }),
    [concepts, learningLabel, masteredLabel, newLabel],
  );

  const pieData = useMemo(
    () =>
      Object.entries(masteryCounts).map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      })),
    [masteryCounts],
  );

  const hasConceptData = masteryData.length > 0;
  const hasDistributionData = pieData.some((entry) => entry.value > 0);
  const chartMessage = isLoading
    ? {
        title: emptyCopy.loading,
        detail: emptyCopy.loadingDetail,
        role: "status" as const,
      }
    : loadError
      ? {
          title: emptyCopy.error,
          detail: emptyCopy.errorDetail,
          role: "alert" as const,
        }
      : {
          title: emptyCopy.noConcepts,
          detail: emptyCopy.noConceptsDetail,
          role: "status" as const,
        };
  const distributionMessage = isLoading
    ? {
        title: emptyCopy.loading,
        detail: emptyCopy.loadingDetail,
        role: "status" as const,
      }
    : loadError
      ? {
          title: emptyCopy.error,
          detail: emptyCopy.errorDetail,
          role: "alert" as const,
        }
      : {
          title: emptyCopy.noDistribution,
          detail: emptyCopy.noDistributionDetail,
          role: "status" as const,
        };
  const masteryChartSummary = masteryData
    .map(
      (concept) =>
        `${concept.fullName}: ${masteryLabel} ${formatPercent(
          concept.mastery,
        )}, ${confidenceLabel} ${formatPercent(concept.confidence)}`,
    )
    .join("; ");
  const distributionSummary = pieData
    .filter((entry) => entry.value > 0)
    .map((entry) => `${entry.name}: ${entry.value}`)
    .join("; ");

  return (
    <div
      className="w-full h-full bg-[#030303] overflow-y-auto custom-scroll pt-24 px-4 md:px-8 pb-12 text-white"
      aria-busy={isLoading}
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-12">
        <header>
          <h1
            id="analytics-heading"
            className="text-3xl font-semibold tracking-tight mb-2 text-white"
          >
            {t("cognitive_analytics")}
          </h1>
          <p className="text-zinc-400 text-sm">
            {t("visualizing_learning_memory")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group min-w-0">
            <h3
              className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex min-w-0 flex-wrap items-center gap-1"
              title={t("total_concepts_desc")}
            >
              {t("total_concepts")}{" "}
              <InfoDot
                describedBy="analytics-total-concepts-help"
                label={t("total_concepts_desc")}
              />
            </h3>
            <p className="break-words text-4xl font-semibold tabular-nums text-white">
              {concepts.length}
            </p>
            <div
              id="analytics-total-concepts-help"
              role="tooltip"
              className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity pointer-events-none z-10 w-48 shadow-2xl"
            >
              {t("total_concepts_desc")}
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group min-w-0">
            <h3
              className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex min-w-0 flex-wrap items-center gap-1"
              title={t("interactions_desc")}
            >
              {t("interactions")}{" "}
              <InfoDot
                describedBy="analytics-interactions-help"
                label={t("interactions_desc")}
              />
            </h3>
            <p className="break-words text-4xl font-semibold tabular-nums text-[#a855f7]">
              {interactionCount}
            </p>
            <div
              id="analytics-interactions-help"
              role="tooltip"
              className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity pointer-events-none z-10 w-48 shadow-2xl"
            >
              {t("interactions_desc")}
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group min-w-0">
            <h3
              className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex min-w-0 flex-wrap items-center gap-1"
              title={t("study_sessions_desc")}
            >
              {t("study_sessions")}{" "}
              <InfoDot
                describedBy="analytics-study-sessions-help"
                label={t("study_sessions_desc")}
              />
            </h3>
            <p className="break-words text-4xl font-semibold tabular-nums text-[#3b82f6]">
              {sessionCount}
            </p>
            <div
              id="analytics-study-sessions-help"
              role="tooltip"
              className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity pointer-events-none z-10 w-48 shadow-2xl"
            >
              {t("study_sessions_desc")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl min-h-[24rem] min-w-0"
            role="region"
            aria-labelledby="analytics-mastery-chart-title"
            aria-describedby={
              hasConceptData ? "analytics-mastery-chart-summary" : undefined
            }
          >
            <h3
              id="analytics-mastery-chart-title"
              className="text-sm font-medium text-white mb-6"
            >
              {t("concept_mastery_levels")}
            </h3>
            <div className="h-[300px] w-full min-w-0">
              {hasConceptData ? (
                <>
                  <p id="analytics-mastery-chart-summary" className="sr-only">
                    {masteryChartSummary}
                  </p>
                  <div className="h-full" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={masteryData}
                        barCategoryGap="24%"
                        margin={{ top: 10, right: 8, left: 0, bottom: 12 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#222"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#71717a"
                          fontSize={10}
                          angle={-35}
                          textAnchor="end"
                          height={68}
                          interval={
                            masteryData.length > 7 ? "preserveStartEnd" : 0
                          }
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#71717a"
                          fontSize={10}
                          tickFormatter={formatPercent}
                          width={36}
                        />
                        <RechartsTooltip
                          formatter={(value, name) => [
                            formatPercent(Number(value)),
                            name,
                          ]}
                          labelFormatter={(_label, payload) =>
                            payload?.[0]?.payload?.fullName || _label
                          }
                          contentStyle={{
                            backgroundColor: "#111",
                            borderColor: "#333",
                            borderRadius: 8,
                          }}
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        />
                        <Bar
                          dataKey="mastery"
                          name={masteryLabel}
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                          isAnimationActive={motionEnabled}
                        />
                        <Bar
                          dataKey="confidence"
                          name={confidenceLabel}
                          fill="#a855f7"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={36}
                          isAnimationActive={motionEnabled}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <ChartMessage {...chartMessage} />
              )}
            </div>
          </div>

          <div
            className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl min-h-[24rem] min-w-0 flex flex-col relative group"
            role="region"
            aria-labelledby="analytics-distribution-chart-title"
            aria-describedby={
              hasDistributionData
                ? "analytics-distribution-chart-summary"
                : undefined
            }
          >
            <h3
              id="analytics-distribution-chart-title"
              className="text-sm font-medium text-white mb-6 cursor-help flex min-w-0 flex-wrap items-center gap-1 w-fit"
              title={t("mastery_distribution_desc")}
            >
              {t("mastery_distribution")}{" "}
              <InfoDot
                describedBy="analytics-mastery-distribution-help"
                label={t("mastery_distribution_desc")}
              />
            </h3>
            <div
              id="analytics-mastery-distribution-help"
              role="tooltip"
              className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:transition-opacity pointer-events-none z-10 w-64 shadow-2xl"
            >
              {t("mastery_distribution_desc")}
            </div>
            <div className="w-full min-w-0 flex-1">
              {hasDistributionData ? (
                <>
                  <p
                    id="analytics-distribution-chart-summary"
                    className="sr-only"
                  >
                    {distributionSummary}
                  </p>
                  <div className="h-[250px] min-w-0">
                    <div className="h-full" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius="48%"
                            outerRadius="76%"
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={motionEnabled}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#111",
                              borderColor: "#333",
                              borderRadius: 8,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-3">
                    {pieData.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex min-w-0 items-center gap-2 text-xs text-zinc-400"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="truncate">{entry.name}</span>
                        <span className="ml-auto tabular-nums text-zinc-200">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <ChartMessage {...distributionMessage} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
