import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  db,
  PersistentConcept,
  SessionMemoryRecord,
  ConversationInteraction,
} from "../memory/longterm.memory";
import { gsap } from "gsap";
import { useStore } from "../store";
import { useTranslation } from "../lib/translations";
import { useMotionPreference } from "../hooks/useMotionPreference";

export function AnalyticsView() {
  const { t } = useTranslation();
  const motionEnabled = useMotionPreference();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [concepts, setConcepts] = useState<PersistentConcept[]>([]);
  const [interactions, setInteractions] = useState<ConversationInteraction[]>(
    [],
  );
  const [sessions, setSessions] = useState<SessionMemoryRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setConcepts(await db.concepts.toArray());
      setInteractions(await db.interactions.toArray());
      setSessions(await db.sessions.toArray());
    };
    fetchData();
  }, []);

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current,
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        duration: motionEnabled ? 0.42 : 0,
        ease: "power3.out",
      },
    );
  }, [motionEnabled]);

  const masteryData = concepts.map((c) => ({
    name: c.name,
    [t("mastery")]: Math.round(c.mastery * 100),
    [t("confidence")]: Math.round(c.confidence * 100),
  }));

  const masteryCounts = {
    [t("mastered")]: concepts.filter((c) => c.mastery > 0.7).length,
    [t("learning")]: concepts.filter((c) => c.mastery > 0.4 && c.mastery <= 0.7)
      .length,
    [t("new")]: concepts.filter((c) => c.mastery <= 0.4).length,
  };

  const pieData = Object.entries(masteryCounts).map(([name, value]) => ({
    name,
    value,
  }));
  const COLORS = ["#3b82f6", "#a855f7", "#f97316"];

  return (
    <div className="w-full h-full bg-[#030303] overflow-y-auto custom-scroll pt-24 px-4 md:px-8 pb-12 text-white">
      <div
        ref={contentRef}
        className="max-w-6xl mx-auto space-y-12"
      >
        <header>
          <h1 className="text-3xl font-semibold tracking-tight mb-2 text-white">
            {t("cognitive_analytics")}
          </h1>
          <p className="text-zinc-400 text-sm">
            {t("visualizing_learning_memory")}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group">
            <h3 className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex items-center gap-1">
              {t("total_concepts")}{" "}
              <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">
                i
              </span>
            </h3>
            <p className="text-4xl font-semibold text-white">
              {concepts.length}
            </p>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 shadow-2xl">
              {t("total_concepts_desc")}
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group">
            <h3 className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex items-center gap-1">
              {t("interactions")}{" "}
              <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">
                i
              </span>
            </h3>
            <p className="text-4xl font-semibold text-[#a855f7]">
              {interactions.length}
            </p>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 shadow-2xl">
              {t("interactions_desc")}
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group">
            <h3 className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex items-center gap-1">
              {t("study_sessions")}{" "}
              <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">
                i
              </span>
            </h3>
            <p className="text-4xl font-semibold text-[#3b82f6]">
              {sessions.length}
            </p>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 shadow-2xl">
              {t("study_sessions_desc")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl h-96">
            <h3 className="text-sm font-medium text-white mb-6">
              {t("concept_mastery_levels")}
            </h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
              >
                <BarChart
                  data={masteryData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#222"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#666"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#666" fontSize={10} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#111",
                      borderColor: "#333",
                    }}
                  />
                  <Bar
                    dataKey={t("mastery")}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={t("confidence")}
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl h-96 flex flex-col relative group">
            <h3 className="text-sm font-medium text-white mb-6 cursor-help flex items-center gap-1 w-fit">
              {t("mastery_distribution")}{" "}
              <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">
                i
              </span>
            </h3>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64 shadow-2xl">
              {t("mastery_distribution_desc")}
            </div>
            <div className="w-full flex-1 flex items-center justify-center min-h-[250px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#111",
                      borderColor: "#333",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
