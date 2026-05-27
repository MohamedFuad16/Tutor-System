import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { db, PersistentConcept, SessionMemoryRecord, ConversationInteraction } from '../memory/longterm.memory';
import { motion } from 'motion/react';
import { useStore } from '../store';

export function AnalyticsView() {
  const [concepts, setConcepts] = useState<PersistentConcept[]>([]);
  const [interactions, setInteractions] = useState<ConversationInteraction[]>([]);
  const [sessions, setSessions] = useState<SessionMemoryRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setConcepts(await db.concepts.toArray());
      setInteractions(await db.interactions.toArray());
      setSessions(await db.sessions.toArray());
    };
    fetchData();
  }, []);

  const masteryData = concepts.map(c => ({
    name: c.name,
    mastery: Math.round(c.mastery * 100),
    confidence: Math.round(c.confidence * 100)
  }));

  const masteryCounts = {
    Mastered: concepts.filter(c => c.mastery > 0.7).length,
    Learning: concepts.filter(c => c.mastery > 0.4 && c.mastery <= 0.7).length,
    New: concepts.filter(c => c.mastery <= 0.4).length
  };

  const pieData = Object.entries(masteryCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#a855f7', '#f97316'];

  return (
    <div className="w-full h-full bg-[#030303] overflow-y-auto custom-scroll pt-24 px-4 md:px-8 pb-12 text-white">
      <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="max-w-6xl mx-auto space-y-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight mb-2 text-white">Cognitive Analytics</h1>
          <p className="text-zinc-400 text-sm">Visualizing your learning memory and retention over time.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group">
            <h3 className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex items-center gap-1">Total Concepts <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">i</span></h3>
            <p className="text-4xl font-semibold text-white">{concepts.length}</p>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 shadow-2xl">
              The number of unique academic concepts you have extracted and studied across all documents.
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group">
            <h3 className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex items-center gap-1">Interactions <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">i</span></h3>
            <p className="text-4xl font-semibold text-[#a855f7]">{interactions.length}</p>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 shadow-2xl">
              The total number of messages and voice queries you have exchanged with the AI Tutor.
            </div>
          </div>
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl relative group">
            <h3 className="text-sm font-medium text-zinc-400 mb-1 cursor-help flex items-center gap-1">Study Sessions <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">i</span></h3>
            <p className="text-4xl font-semibold text-[#3b82f6]">{sessions.length}</p>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48 shadow-2xl">
              Distinct study periods you have completed, tracking your cognitive load over time.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl h-96">
            <h3 className="text-sm font-medium text-white mb-6">Concept Mastery Levels</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={masteryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#666" fontSize={10} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                  <Bar dataKey="mastery" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="confidence" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#0A0A0B] border border-white/5 p-6 rounded-2xl shadow-xl h-96 flex flex-col relative group">
            <h3 className="text-sm font-medium text-white mb-6 cursor-help flex items-center gap-1 w-fit">Mastery Distribution <span className="text-[10px] text-zinc-600 border border-zinc-600 rounded-full w-3 h-3 flex items-center justify-center">i</span></h3>
            <div className="absolute top-14 left-6 bg-[#111] text-xs text-zinc-300 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-64 shadow-2xl">
              Shows how many concepts are fully Mastered (Blue), currently being Learned (Purple), or are New/Needs Review (Orange).
            </div>
            <div className="w-full flex-1 flex items-center justify-center min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
