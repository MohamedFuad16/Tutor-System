import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../memory/longterm.memory";
import {
  Terminal,
  Activity,
  Clock,
  ChevronRight,
  Menu,
  BookOpen,
  Network,
  Sparkles,
  Bug,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Square,
  Trash2,
  Gauge,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "../store";

type DebugRunSummary = {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  mode: string | null;
  scope: string | null;
  targetCount: number;
  completedCount: number;
  changedCount: number;
};

type DebugRunDetails = DebugRunSummary & {
  updatedAt?: string | null;
  activeTarget?: { name?: string; file?: string; kind?: string } | null;
  activePhase?: { title?: string; id?: string; description?: string } | null;
  processOrder?: Array<{ id: string; title: string; description?: string }>;
  debugLoop?: string[];
  events?: Array<{
    timestamp?: string;
    type?: string;
    message?: string;
    data?: unknown;
  }>;
  components?: Array<{
    target?: { name?: string; file?: string; kind?: string };
    componentName?: string;
    file?: string;
    kind?: string;
    changed?: boolean;
    reason?: string;
    whyChanged?: string;
    whatChanged?: string[];
    improvements?: string[];
    improvementSummary?: string;
    findings?: string[];
    changes?: string[];
    purpose?: string;
    technology?: string[];
    dependencyAnalysis?: string;
    bestPracticeComparison?: {
      status?: string;
      primaryEvidence?: string[];
      categories?: Record<string, number>;
    };
    auditPhases?: Array<{
      id: string;
      title: string;
      status: string;
      startedAt?: string;
      finishedAt?: string;
    }>;
    docsEvidence?: Array<{ id: string; file: string; role: string }>;
    commands?: Array<{
      command: string;
      ok: boolean;
      exitCode: number;
      startedAt?: string;
      finishedAt?: string;
    }>;
    finishedAt?: string;
  }>;
  finalCommands?: Array<{
    command: string;
    ok: boolean;
    exitCode: number;
    startedAt?: string;
    finishedAt?: string;
  }>;
  unresolvedRisks?: string[];
};

const compactCommand = (command: string) =>
  command
    .replace(/^npm run --silent /, "npm ")
    .replace(/^npm run /, "npm ")
    .replace(/^npx /, "npx ")
    .slice(0, 92);

type DebugComponentSummary = NonNullable<DebugRunDetails["components"]>[number];

const isCliConsoleFinding = (component: DebugComponentSummary, item: string) =>
  (/^(brain|scripts)\//.test(component.file || "") ||
    component.kind === "brain-tooling" ||
    component.target?.kind === "brain-tooling") &&
  /console output|Debug console output/.test(item);

const visibleAuditItems = (component: DebugComponentSummary, items: string[]) =>
  items.filter((item) => !isCliConsoleFinding(component, item));

const friendlyWhy = (component: DebugComponentSummary) => {
  const text =
    component.whyChanged ||
    component.reason ||
    "The target was audited against the debug process.";
  if (text.includes("Current source passed the guarded patch criteria")) {
    return "No automatic source patch was applied. Findings stay visible until a safe deterministic rule or model-backed refactor can change the file without guessing.";
  }
  return text;
};

const dateMs = (value?: string | null) => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

const formatDebugDuration = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const getDebugHealth = (details: DebugRunDetails) => {
  const targetCount = Math.max(1, details.targetCount || 0);
  const completedCount = Math.max(0, details.completedCount || 0);
  const completion = Math.min(1, completedCount / targetCount);
  const componentFailures = (details.components || []).reduce(
    (total, component) =>
      total +
      (component.commands || []).filter((command) => !command.ok).length,
    0,
  );
  const finalFailures = (details.finalCommands || []).filter(
    (command) => !command.ok,
  ).length;
  const unresolvedRiskCount = details.unresolvedRisks?.length || 0;
  const penalty =
    componentFailures * 7 + finalFailures * 15 + unresolvedRiskCount * 5;
  const score = Math.max(
    0,
    Math.min(100, Math.round(completion * 100 - penalty)),
  );
  const start = dateMs(details.startedAt);
  const finish = dateMs(details.finishedAt);
  const updated = dateMs(details.updatedAt);
  const durationMs = start ? (finish || updated || Date.now()) - start : 0;
  const trend =
    componentFailures + finalFailures + unresolvedRiskCount > 0
      ? "down"
      : details.status === "completed"
        ? "stable"
        : "live";

  return {
    score,
    completion,
    duration: formatDebugDuration(durationMs),
    failedGates: componentFailures + finalFailures,
    unresolvedRiskCount,
    trend,
  };
};

export function AdminView() {
  const { setActiveView, learnerName } = useStore();
  const logs = useLiveQuery(() =>
    db.traceLogs.orderBy("timestamp").reverse().toArray(),
  );
  const learningBooks =
    useLiveQuery(
      () => db.learningBooks.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const learningBookConcepts =
    useLiveQuery(
      () => db.learningBookConcepts.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const learningEntries =
    useLiveQuery(
      () =>
        db.learningEntries.orderBy("timestamp").reverse().limit(25).toArray(),
      [],
    ) || [];
  const [serverLogs, setServerLogs] = useState<
    { type: string; msg: string; time: number }[]
  >([]);
  const [debugRuns, setDebugRuns] = useState<DebugRunSummary[]>([]);
  const [activeDebugJobId, setActiveDebugJobId] = useState<string | null>(null);
  const [activeDebugRunId, setActiveDebugRunId] = useState<string | null>(null);
  const [debugRunDetails, setDebugRunDetails] =
    useState<DebugRunDetails | null>(null);
  const [debugRunsLoading, setDebugRunsLoading] = useState(false);
  const [debugActionPending, setDebugActionPending] = useState<
    "stop" | "delete" | null
  >(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const auditEventsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [serverLogs]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // When running under Vite dev server (e.g. port 5173), hardcode the server port to 3000
    // When running under production build, use the same host and port.
    const hostPort = import.meta.env.DEV
      ? `${window.location.hostname}:3000`
      : window.location.host;
    const ws = new WebSocket(`${protocol}//${hostPort}/ws/debug`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setServerLogs((prev) => [
          ...prev.slice(-99),
          {
            type: data.type || "log",
            msg: data.msg || "",
            time: data.timestamp || Date.now(),
          },
        ]);
      } catch (e) {
        // Fallback for non-JSON logs
        setServerLogs((prev) => [
          ...prev.slice(-99),
          {
            type: "log",
            msg: event.data,
            time: Date.now(),
          },
        ]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<"traces" | "console" | "debug">(
    "traces",
  );

  const loadDebugRuns = async () => {
    setDebugRunsLoading(true);
    try {
      const response = await fetch("/api/debug/runs");
      const data = await response.json();
      const runs = (data.runs || []) as DebugRunSummary[];
      setDebugRuns(runs);
      setActiveDebugJobId(data.activeRunId || null);
      setActiveDebugRunId((current) => {
        if (data.activeRunId) return data.activeRunId;
        if (current && runs.some((run) => run.id === current)) return current;
        return runs[0]?.id || null;
      });
    } catch (error) {
      console.warn("[AdminView] Failed to load debug runs:", error);
    } finally {
      setDebugRunsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "debug") {
      void loadDebugRuns();
      const timer = window.setInterval(loadDebugRuns, 5000);
      return () => window.clearInterval(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!activeDebugRunId || activeTab !== "debug") return;
    let cancelled = false;

    const loadDetails = async () => {
      try {
        const response = await fetch(
          `/api/debug/runs/${encodeURIComponent(activeDebugRunId)}`,
        );
        const details = await response.json();
        if (!cancelled) setDebugRunDetails(details);
      } catch (error) {
        if (!cancelled) {
          console.warn("[AdminView] Failed to load debug run details:", error);
        }
      }
    };

    void loadDetails();
    const timer = window.setInterval(loadDetails, 1800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeDebugRunId, activeTab]);

  useEffect(() => {
    if (activeTab !== "debug") return;
    const el = auditEventsRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [activeTab, activeDebugRunId, debugRunDetails?.events?.length]);

  const conceptsByBook = learningBookConcepts.reduce<
    Record<string, typeof learningBookConcepts>
  >((acc, concept) => {
    acc[concept.bookId] = acc[concept.bookId] || [];
    acc[concept.bookId].push(concept);
    return acc;
  }, {});
  const latestEntryByBook = learningEntries.reduce<
    Record<string, (typeof learningEntries)[number]>
  >((acc, entry) => {
    if (!acc[entry.bookId]) acc[entry.bookId] = entry;
    return acc;
  }, {});
  const traceCount = logs?.length || 0;
  const latestTrace = logs?.[0];
  const mappedConceptCount = learningBookConcepts.length;
  const tracedBookCount = learningBooks.filter(
    (book) => (conceptsByBook[book.id] || []).length > 0,
  ).length;
  const debugHealth = debugRunDetails ? getDebugHealth(debugRunDetails) : null;
  const liveAuditEvents = (debugRunDetails?.events || []).slice(-18);

  return (
    <div className="w-full h-full bg-[#faf9f6] text-zinc-900 flex flex-col overflow-y-auto custom-scroll pt-20 md:pt-0 relative font-serif">
      {/* Subtle Paper Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
        }}
      />

      <div className="min-h-full flex w-full relative z-10 pt-16 md:pt-20 shrink-0">
        {/* Sidebar Navigation */}
        <div className="sticky top-20 z-40 hidden h-[calc(100vh-80px)] min-h-[calc(100vh-80px)] w-64 flex-shrink-0 self-start overflow-y-auto border-r border-zinc-200/70 bg-[#faf9f6]/98 px-4 py-6 font-sans shadow-[12px_0_36px_rgba(255,255,255,0.72)] backdrop-blur-xl custom-scroll lg:block">
          <button
            onClick={() => setActiveView("study")}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-8 px-2"
          >
            <Menu size={16} /> Back to Library
          </button>

          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-6 px-3">
            Admin Center
          </div>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("traces")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "traces" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Activity size={16} />
              <span className="line-clamp-1 leading-snug">DeepSeek Trace</span>
            </button>
            <button
              onClick={() => setActiveTab("console")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "console" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Terminal size={16} />
              <span className="line-clamp-1 leading-snug">Server Console</span>
            </button>
            <button
              onClick={() => setActiveTab("debug")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "debug" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Bug size={16} />
              <span className="line-clamp-1 leading-snug">Debug Runs</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full relative font-sans">
          {/* Header for mobile */}
          <div className="sticky top-16 md:top-20 left-0 right-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md border-b border-zinc-200/50 px-6 py-4 flex items-center justify-between shadow-sm lg:hidden">
            <button
              onClick={() => setActiveView("study")}
              className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Menu size={16} /> Back
            </button>
            <div className="text-sm font-semibold text-zinc-800 tracking-wide truncate max-w-[200px] md:max-w-md">
              Admin Center
            </div>
            <div className="w-16"></div>
          </div>

          <div className="flex-1 p-6 md:p-12 lg:p-16 xl:p-24 relative isolate w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 font-serif pb-12"
              >
                {/* Admin Center Preface */}
                <div className="mb-12">
                  <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">
                    Admin Center
                  </h1>
                  <p className="text-zinc-600 leading-relaxed max-w-2xl text-sm font-serif">
                    Welcome to the Tutor System's central command. This
                    dashboard exposes recorded model actions, saved trace
                    explanations, and backend health signals. Use the{" "}
                    <strong>DeepSeek Trace</strong> to inspect persisted tutor
                    updates and tool context, or switch to the{" "}
                    <strong>Server Console</strong> to monitor live backend
                    traffic, WebSocket streams, and TTS generation logs.
                  </p>
                </div>

                <div className="mb-10 border-b border-zinc-200 pb-8 pt-4 font-sans cursor-default">
                  <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-zinc-400 mb-6 block font-medium">
                    <span className="text-blue-500 mr-2">#</span>
                    {activeTab === "traces"
                      ? "Diagnostics"
                      : activeTab === "debug"
                        ? "Version Tracker"
                        : "Runtime Environment"}
                  </span>
                  <div className="flex items-center justify-between">
                    <h1 className="text-3xl md:text-4xl lg:text-4xl font-medium tracking-tight text-zinc-900 mb-2 font-serif leading-[1.15]">
                      {activeTab === "traces"
                        ? "DeepSeek Trace Ledger"
                        : activeTab === "debug"
                          ? "Debug Run Ledger"
                          : "Live Server Console"}
                    </h1>
                    {activeTab === "console" && (
                      <div className="flex gap-1.5 items-center px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded-md shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider">
                          Connected
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="prose prose-zinc w-full max-w-none prose-sm md:prose-base font-serif prose-p:leading-[1.8] prose-p:text-zinc-800 prose-p:font-light prose-p:my-5 selection:bg-blue-200 selection:text-zinc-900">
                  {activeTab === "traces" ? (
                    <div className="flex flex-col gap-8 font-sans">
                      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500/70">
                              <Sparkles size={13} /> Trace Evidence
                            </div>
                            <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                              {learnerName}'s DeepSeek Trace Ledger
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                              This ledger shows persisted learning-book updates,
                              concept maps, and saved trace explanations. It
                              does not expose hidden chain-of-thought; each item
                              reflects records written by Tutor after a chat
                              action completes.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                            <div className="text-2xl font-semibold text-zinc-900">
                              {learningBooks.length}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                              Books mapped
                            </div>
                          </div>
                        </div>

                        <div className="mb-5 grid gap-3 md:grid-cols-4">
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              Trace Events
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                              {traceCount}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              Mapped Concepts
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                              {mappedConceptCount}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              Books With Graphs
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                              {tracedBookCount}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              Latest Action
                            </div>
                            <div className="mt-2 truncate font-mono text-sm font-semibold text-zinc-900">
                              {latestTrace?.action || "none"}
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-zinc-500">
                              {latestTrace?.timestamp
                                ? new Date(
                                    latestTrace.timestamp,
                                  ).toLocaleTimeString([], {
                                    hour12: false,
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "waiting"}
                            </div>
                          </div>
                        </div>

                        {learningBooks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No learning books yet. Complete a chat and the
                            learning-book agent will map it here.
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            {learningBooks.map((book, index) => {
                              const concepts = (
                                conceptsByBook[book.id] || []
                              ).slice(0, 8);
                              const latestEntry = latestEntryByBook[book.id];
                              const avgConfidence = concepts.length
                                ? concepts.reduce(
                                    (sum, concept) =>
                                      sum + (concept.confidence || 0),
                                    0,
                                  ) / concepts.length
                                : 0;
                              return (
                                <motion.article
                                  key={book.id}
                                  initial={{ opacity: 0, y: 16 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    delay: index * 0.04,
                                    type: "spring",
                                    stiffness: 360,
                                    damping: 28,
                                  }}
                                  className="relative overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm"
                                >
                                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_0%,rgba(255,110,0,0.04),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.03),transparent_38%)]" />
                                  <div className="relative">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-orange-500">
                                          <BookOpen size={18} />
                                        </div>
                                        <div>
                                          <h3 className="text-lg font-semibold leading-tight text-zinc-900">
                                            {book.title}
                                          </h3>
                                          <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                            {book.conversationCount} chats ·{" "}
                                            {book.agentModel ||
                                              "deepseek/deepseek-v4-flash"}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
                                        {Math.round(avgConfidence * 100)}%
                                      </div>
                                    </div>

                                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-600 font-serif">
                                      {book.overview ||
                                        book.knowledgeSummary ||
                                        book.summary ||
                                        "Knowledge summary pending."}
                                    </p>

                                    {(book.chapters || []).length > 0 && (
                                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                                          Chapters
                                        </div>
                                        <div className="space-y-2">
                                          {(book.chapters || [])
                                            .slice(-3)
                                            .map((chapter, chapterIndex) => (
                                              <div
                                                key={chapter.id}
                                                className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600"
                                              >
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 text-[10px] text-orange-500 font-medium">
                                                  {chapterIndex + 1}
                                                </span>
                                                <span>
                                                  <span className="text-zinc-800 font-medium">
                                                    {chapter.title}
                                                  </span>
                                                  {chapter.summary && (
                                                    <span className="text-zinc-500">
                                                      {" "}
                                                      · {chapter.summary}
                                                    </span>
                                                  )}
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {concepts.length === 0 ? (
                                        <span className="text-xs text-zinc-500 font-serif">
                                          No concepts mapped yet.
                                        </span>
                                      ) : (
                                        concepts.map((concept) => (
                                          <span
                                            key={concept.id}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-sm"
                                          >
                                            <Network
                                              size={11}
                                              className="text-blue-500"
                                            />
                                            {concept.name}
                                          </span>
                                        ))
                                      )}
                                    </div>

                                    {concepts.some(
                                      (concept) =>
                                        concept.childConcepts.length > 0 ||
                                        concept.parentConcepts.length > 0,
                                    ) && (
                                      <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3">
                                        {concepts
                                          .filter(
                                            (concept) =>
                                              concept.childConcepts.length >
                                                0 ||
                                              concept.parentConcepts.length > 0,
                                          )
                                          .slice(0, 3)
                                          .map((concept) => (
                                            <div
                                              key={`${concept.id}-branch`}
                                              className="text-xs text-zinc-500"
                                            >
                                              <span className="text-zinc-800 font-medium">
                                                {concept.name}
                                              </span>
                                              {concept.childConcepts.length >
                                                0 && (
                                                <span>
                                                  {" "}
                                                  branches to{" "}
                                                  {concept.childConcepts
                                                    .slice(0, 4)
                                                    .join(", ")}
                                                </span>
                                              )}
                                              {concept.childConcepts.length ===
                                                0 &&
                                                concept.parentConcepts.length >
                                                  0 && (
                                                  <span>
                                                    {" "}
                                                    sits under{" "}
                                                    {concept.parentConcepts
                                                      .slice(0, 3)
                                                      .join(", ")}
                                                  </span>
                                                )}
                                            </div>
                                          ))}
                                      </div>
                                    )}

                                    {latestEntry && (
                                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 font-serif">
                                        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-sans">
                                          Latest update ·{" "}
                                          {new Date(
                                            latestEntry.timestamp,
                                          ).toLocaleTimeString()}
                                        </div>
                                        {latestEntry.conversationSummary ||
                                          latestEntry.assistantSummary}
                                      </div>
                                    )}
                                  </div>
                                </motion.article>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      {!logs || logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-blue-600">
                            <Activity size={20} />
                          </div>
                          <div className="font-serif text-lg italic text-zinc-700">
                            No trace records yet.
                          </div>
                          <div className="max-w-md text-sm leading-relaxed text-zinc-500">
                            Saved trace explanations will appear here after
                            Tutor writes a trace log from a completed learning
                            action.
                          </div>
                        </div>
                      ) : (
                        logs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: Math.min(index * 0.05, 1),
                            }}
                            className="relative pl-8 pb-8"
                          >
                            <motion.div
                              className="absolute left-[0px] top-4 w-[2px] bg-zinc-200/60"
                              initial={{ height: 0 }}
                              animate={{ height: "100%" }}
                              transition={{
                                duration: 0.8,
                                ease: "easeInOut",
                                delay: Math.min(index * 0.05, 1),
                              }}
                            />
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: Math.min(index * 0.05, 1),
                              }}
                              className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-[#faf9f6] shadow-sm -left-[5px] top-1 z-10"
                            />

                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                                {log.action}
                              </span>
                              <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-mono">
                                <Clock size={12} />{" "}
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>

                            <div className="text-[15px] text-zinc-800 mb-4 leading-relaxed mt-3 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm font-serif">
                              {log.llmExplanation}
                            </div>

                            <details className="group">
                              <summary className="text-xs font-mono text-zinc-500 cursor-pointer hover:text-zinc-800 transition-colors flex items-center gap-1.5 select-none font-medium">
                                <ChevronRight
                                  size={14}
                                  className="group-open:rotate-90 transition-transform"
                                />
                                Raw JSON Payload
                              </summary>
                              <pre className="mt-3 text-[11px] text-zinc-600 bg-zinc-50 p-4 rounded-xl overflow-x-auto border border-zinc-200 font-mono shadow-inner">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </details>
                          </motion.div>
                        ))
                      )}
                    </div>
                  ) : activeTab === "debug" ? (
                    <div className="grid gap-6 font-sans xl:grid-cols-[340px_minmax(0,1fr)]">
                      <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm xl:sticky xl:top-28 xl:self-start">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500">
                              <Bug size={13} /> Debug Skill
                            </div>
                            <h2 className="mt-2 text-xl font-serif font-medium text-zinc-900">
                              Version Tracker
                            </h2>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to delete all debug history?",
                                  )
                                ) {
                                  setDebugActionPending("delete");
                                  try {
                                    await fetch("/api/debug/runs", {
                                      method: "DELETE",
                                    });
                                    setDebugRuns([]);
                                    setActiveDebugRunId(null);
                                    setDebugRunDetails(null);
                                    setActiveDebugJobId(null);
                                  } catch (e) {
                                    console.error(
                                      "Failed to delete debug runs:",
                                      e,
                                    );
                                  } finally {
                                    setDebugActionPending(null);
                                  }
                                }
                              }}
                              disabled={debugActionPending !== null}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-gradient-to-b from-red-500 to-red-600 px-3 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(239,68,68,0.22)] transition-[color,background-color,border-color,box-shadow,transform,opacity] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(239,68,68,0.26)] disabled:cursor-wait disabled:opacity-60"
                            >
                              <Trash2 size={13} />
                              Delete History
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={async () => {
                                setDebugActionPending("stop");
                                try {
                                  await fetch("/api/debug/stop", {
                                    method: "POST",
                                  });
                                  loadDebugRuns();
                                } catch (e) {
                                  console.error("Failed to stop debugging:", e);
                                } finally {
                                  setDebugActionPending(null);
                                }
                              }}
                              disabled={
                                !activeDebugJobId || debugActionPending !== null
                              }
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-100 to-orange-100 px-3 text-[11px] font-semibold text-orange-800 shadow-[0_10px_22px_rgba(251,146,60,0.18)] transition-[color,background-color,border-color,box-shadow,transform,opacity] hover:-translate-y-0.5 hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Square size={12} />
                              Stop Debugging
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={loadDebugRuns}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-[color,background-color,border-color,box-shadow,transform,opacity] hover:-translate-y-0.5 hover:bg-zinc-800"
                              aria-label="Refresh debug runs"
                            >
                              <RefreshCw
                                size={15}
                                className={
                                  debugRunsLoading ? "animate-spin" : ""
                                }
                              />
                            </motion.button>
                          </div>
                        </div>

                        {debugRuns.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm leading-relaxed text-zinc-500">
                            No debug runs recorded yet. Invoke the tutor-debug
                            skill with{" "}
                            <span className="font-mono text-zinc-700">
                              /debug
                            </span>{" "}
                            or run{" "}
                            <span className="font-mono text-zinc-700">
                              npm run brain:debug
                            </span>
                            .
                          </div>
                        ) : (
                          <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{
                              hidden: {},
                              show: { transition: { staggerChildren: 0.05 } },
                            }}
                            className="space-y-2"
                          >
                            {debugRuns.map((run, index) => (
                              <motion.button
                                key={run.id}
                                custom={index}
                                variants={{
                                  hidden: {
                                    opacity: 0,
                                    y: 10,
                                    filter: "blur(4px)",
                                  },
                                  show: {
                                    opacity: 1,
                                    y: 0,
                                    filter: "blur(0px)",
                                    transition: {
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 24,
                                    },
                                  },
                                }}
                                type="button"
                                onClick={() => setActiveDebugRunId(run.id)}
                                className={`w-full rounded-2xl border p-3 text-left transition-[color,background-color,border-color,box-shadow,transform,opacity] ${activeDebugRunId === run.id ? "border-blue-200 bg-blue-50 shadow-[0_14px_30px_rgba(59,130,246,0.16)]" : "border-zinc-200 bg-white hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-sm"}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate font-mono text-[11px] font-semibold text-zinc-800">
                                    {run.id}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${run.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : run.status?.includes("fail") ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}
                                  >
                                    {run.status || "unknown"}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-500">
                                  <span className="rounded-lg bg-zinc-50 px-2 py-1">
                                    {run.completedCount}/{run.targetCount}
                                  </span>
                                  <span className="rounded-lg bg-zinc-50 px-2 py-1">
                                    {run.changedCount} changed
                                  </span>
                                  <span className="rounded-lg bg-zinc-50 px-2 py-1">
                                    {run.mode || "fix"}
                                  </span>
                                </div>
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </section>

                      <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
                        {!debugRunDetails ? (
                          <div className="flex min-h-[360px] items-center justify-center text-sm text-zinc-500">
                            Select a debug run to inspect its change ledger.
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
                              <div>
                                <div className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                                  {debugRunDetails.scope || "all"} ·{" "}
                                  {debugRunDetails.mode || "fix"}
                                </div>
                                <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                                  {debugRunDetails.id}
                                </h2>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                                      debugRunDetails.status === "completed"
                                        ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                                        : debugRunDetails.status?.includes(
                                              "fail",
                                            )
                                          ? "border border-red-100 bg-red-50 text-red-700"
                                          : "border border-amber-100 bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {debugRunDetails.status || "unknown"}
                                  </span>
                                  {debugRunDetails.activeTarget && (
                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[11px] text-blue-700">
                                      Auditing{" "}
                                      {debugRunDetails.activeTarget.name ||
                                        debugRunDetails.activeTarget.file}
                                    </span>
                                  )}
                                  {debugRunDetails.activePhase && (
                                    <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 font-mono text-[11px] text-violet-700">
                                      Phase{" "}
                                      {debugRunDetails.activePhase.title ||
                                        debugRunDetails.activePhase.id}
                                    </span>
                                  )}
                                  {debugRunDetails.updatedAt && (
                                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-zinc-500">
                                      {new Date(
                                        debugRunDetails.updatedAt,
                                      ).toLocaleTimeString([], {
                                        hour12: false,
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-zinc-600 font-serif">
                                  The ledger records each completed target as
                                  soon as it finishes: component name, what
                                  changed, why it changed, improvement summary,
                                  official-doc evidence, validation, and
                                  regression signals.
                                </p>
                              </div>
                              <div className="grid w-full grid-cols-3 gap-2 text-center 2xl:w-auto 2xl:min-w-[360px]">
                                <div className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                                  <div className="text-xl font-semibold text-zinc-900">
                                    {debugRunDetails.completedCount || 0}
                                  </div>
                                  <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                                    Done
                                  </div>
                                </div>
                                <div className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                                  <div className="text-xl font-semibold text-zinc-900">
                                    {debugRunDetails.changedCount || 0}
                                  </div>
                                  <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                                    Changed
                                  </div>
                                </div>
                                <div className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                                  <div className="text-xl font-semibold text-zinc-900">
                                    {debugRunDetails.targetCount || 0}
                                  </div>
                                  <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                                    Targets
                                  </div>
                                </div>
                              </div>
                            </div>

                            {debugHealth && (
                              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                                      <ShieldCheck size={20} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                        <Gauge size={13} /> Debug Health
                                      </div>
                                      <div className="mt-1 text-sm text-zinc-600">
                                        Continuous uptime {debugHealth.duration}{" "}
                                        · {debugHealth.failedGates} failed gate
                                        {debugHealth.failedGates === 1
                                          ? ""
                                          : "s"}{" "}
                                        · {debugHealth.unresolvedRiskCount} open
                                        risk
                                        {debugHealth.unresolvedRiskCount === 1
                                          ? ""
                                          : "s"}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <div className="text-2xl font-semibold tabular-nums text-zinc-950">
                                        {debugHealth.score}%
                                      </div>
                                      <div
                                        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${debugHealth.trend === "down" ? "text-red-500" : debugHealth.trend === "live" ? "text-blue-600" : "text-emerald-600"}`}
                                      >
                                        {debugHealth.trend === "down"
                                          ? "Needs Review"
                                          : debugHealth.trend === "live"
                                            ? "Running"
                                            : "Stable"}
                                      </div>
                                    </div>
                                    <div className="relative h-12 w-28 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                                      <motion.div
                                        className={`absolute bottom-0 left-0 top-0 ${debugHealth.trend === "down" ? "bg-red-500" : "bg-blue-600"}`}
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${Math.max(6, debugHealth.score)}%`,
                                        }}
                                        transition={{
                                          duration: 0.65,
                                          ease: [0.16, 1, 0.3, 1],
                                        }}
                                      />
                                      <motion.div
                                        className="absolute inset-y-2 w-8 rounded-full bg-white/45 blur-md"
                                        animate={{
                                          x:
                                            debugHealth.trend === "down"
                                              ? [92, 12]
                                              : [0, 92],
                                          opacity: [0.2, 0.6, 0.2],
                                        }}
                                        transition={{
                                          repeat: Infinity,
                                          duration: 2.2,
                                          ease: "easeInOut",
                                        }}
                                      />
                                      <Timer
                                        size={15}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-800"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                                  <motion.div
                                    className="h-full rounded-full bg-zinc-950"
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.round(debugHealth.completion * 100)}%`,
                                    }}
                                    transition={{
                                      duration: 0.5,
                                      ease: [0.16, 1, 0.3, 1],
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {liveAuditEvents.length > 0 && (
                              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
                                  <Activity size={13} /> Live Audit Events
                                </div>
                                <div
                                  ref={auditEventsRef}
                                  className="max-h-56 space-y-2 overflow-y-auto pr-1 custom-scroll scroll-smooth"
                                >
                                  <AnimatePresence initial={false}>
                                    {liveAuditEvents.map((event, index) => (
                                      <motion.div
                                        key={`${event.timestamp}-${event.type}-${index}`}
                                        layout
                                        initial={{
                                          opacity: 0,
                                          y: 10,
                                          filter: "blur(6px)",
                                        }}
                                        animate={{
                                          opacity: 1,
                                          y: 0,
                                          filter: "blur(0px)",
                                        }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{
                                          duration: 0.24,
                                          ease: [0.16, 1, 0.3, 1],
                                        }}
                                        className="rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_8px_20px_rgba(59,130,246,0.07)]"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-mono text-[11px] font-semibold text-blue-800">
                                            {event.type || "event"}
                                          </span>
                                          <span className="font-mono text-[10px] text-zinc-500">
                                            {event.timestamp
                                              ? new Date(
                                                  event.timestamp,
                                                ).toLocaleTimeString([], {
                                                  hour12: false,
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  second: "2-digit",
                                                })
                                              : ""}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-700">
                                          {event.message}
                                        </div>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </div>
                              </div>
                            )}

                            <div className="space-y-4">
                              {(debugRunDetails.components || []).length ===
                              0 ? (
                                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                                  {debugRunDetails.activeTarget
                                    ? `Currently auditing ${debugRunDetails.activeTarget.name || debugRunDetails.activeTarget.file}. The first completed component will appear here automatically.`
                                    : "This run has not written component summaries yet."}
                                </div>
                              ) : (
                                (debugRunDetails.components || []).map(
                                  (component, index) => (
                                    <motion.article
                                      layout
                                      initial={{ opacity: 0, y: 14 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        duration: 0.28,
                                        delay: Math.min(index * 0.03, 0.24),
                                      }}
                                      key={`${component.file}-${index}`}
                                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm"
                                    >
                                      <details className="group" open={false}>
                                        <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-xl outline-none transition-colors hover:bg-white/60 sm:flex-row sm:items-start sm:justify-between">
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                                              {component.changed ? (
                                                <CheckCircle2
                                                  size={13}
                                                  className="text-emerald-600"
                                                />
                                              ) : (
                                                <Activity
                                                  size={13}
                                                  className="text-zinc-500"
                                                />
                                              )}
                                              {component.kind ||
                                                component.target?.kind ||
                                                "component"}
                                            </div>
                                            <h3 className="mt-1 truncate text-lg font-semibold text-zinc-900">
                                              {component.componentName ||
                                                component.target?.name ||
                                                component.file}
                                            </h3>
                                            <div className="mt-1 break-all font-mono text-[11px] text-zinc-500">
                                              {component.file}
                                            </div>
                                            {(component.technology || [])
                                              .length > 0 && (
                                              <div className="mt-3 flex flex-wrap gap-1.5">
                                                {(component.technology || [])
                                                  .slice(0, 8)
                                                  .map((tech) => (
                                                    <span
                                                      key={`${component.file}-${tech}`}
                                                      className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] text-zinc-500"
                                                    >
                                                      {tech}
                                                    </span>
                                                  ))}
                                              </div>
                                            )}
                                          </div>
                                          <span
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${component.changed ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-white text-zinc-600 border border-zinc-200"}`}
                                          >
                                            {component.changed
                                              ? "Changed"
                                              : "No source change"}
                                            <ChevronRight
                                              size={13}
                                              className="ml-1 inline-block transition-transform group-open:rotate-90"
                                            />
                                          </span>
                                        </summary>

                                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                          <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                              What Changed
                                            </div>
                                            <ul className="space-y-1 text-sm leading-relaxed text-zinc-700">
                                              {(
                                                component.whatChanged ||
                                                component.changes || [
                                                  "No source patch was applied.",
                                                ]
                                              ).map((item) => (
                                                <li key={item}>{item}</li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                              Why
                                            </div>
                                            <p className="text-sm leading-relaxed text-zinc-700">
                                              {friendlyWhy(component)}
                                            </p>
                                          </div>
                                          <div className="rounded-xl border border-zinc-200 bg-white p-3">
                                            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                              Improvements
                                            </div>
                                            <ul className="space-y-1 text-sm leading-relaxed text-zinc-700">
                                              {visibleAuditItems(
                                                component,
                                                component.improvements || [
                                                  component.improvementSummary ||
                                                    "No improvement summary was recorded.",
                                                ],
                                              )
                                                .slice(0, 4)
                                                .map((item) => (
                                                  <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                          </div>
                                        </div>

                                        {(component.purpose ||
                                          component.dependencyAnalysis ||
                                          component.bestPracticeComparison
                                            ?.status) && (
                                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                                            {component.purpose && (
                                              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-700">
                                                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                                  Purpose
                                                </div>
                                                {component.purpose}
                                              </div>
                                            )}
                                            {component.dependencyAnalysis && (
                                              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-700">
                                                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                                  Dependencies
                                                </div>
                                                {component.dependencyAnalysis}
                                              </div>
                                            )}
                                            {component.bestPracticeComparison
                                              ?.status && (
                                              <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm leading-relaxed text-zinc-700">
                                                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                                  Best Practices
                                                </div>
                                                {
                                                  component
                                                    .bestPracticeComparison
                                                    .status
                                                }
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {visibleAuditItems(
                                          component,
                                          component.findings || [],
                                        ).length > 0 && (
                                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                                              <AlertTriangle size={13} />{" "}
                                              Findings
                                            </div>
                                            <ul className="space-y-1 text-sm text-amber-900">
                                              {visibleAuditItems(
                                                component,
                                                component.findings || [],
                                              ).map((finding) => (
                                                <li key={finding}>{finding}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {(component.changes || []).length >
                                          0 && (
                                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                                              <CheckCircle2 size={13} /> Changes
                                            </div>
                                            <ul className="space-y-1 text-sm text-emerald-900">
                                              {(component.changes || []).map(
                                                (change) => (
                                                  <li key={change}>{change}</li>
                                                ),
                                              )}
                                            </ul>
                                          </div>
                                        )}

                                        {(component.docsEvidence || []).length >
                                          0 && (
                                          <div className="mt-4 flex flex-wrap gap-2">
                                            {(component.docsEvidence || []).map(
                                              (doc) => (
                                                <span
                                                  key={`${component.file}-${doc.id}`}
                                                  className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-mono text-[11px] text-blue-700"
                                                >
                                                  {doc.id}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        )}

                                        {(component.commands || []).length >
                                          0 && (
                                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                            {(component.commands || [])
                                              .slice(-6)
                                              .map((command, commandIndex) => (
                                                <div
                                                  key={`${component.file}-${command.command}-${commandIndex}`}
                                                  className={`rounded-xl border px-3 py-2 ${
                                                    command.ok
                                                      ? "border-emerald-100 bg-white text-zinc-700"
                                                      : "border-red-100 bg-red-50 text-red-800"
                                                  }`}
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-[11px] font-semibold">
                                                      {compactCommand(
                                                        command.command,
                                                      )}
                                                    </span>
                                                    <span
                                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                        command.ok
                                                          ? "bg-emerald-50 text-emerald-700"
                                                          : "bg-red-100 text-red-700"
                                                      }`}
                                                    >
                                                      {command.ok
                                                        ? "pass"
                                                        : `exit ${command.exitCode}`}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </details>
                                    </motion.article>
                                  ),
                                )
                              )}
                            </div>

                            {(debugRunDetails.finalCommands || []).length >
                              0 && (
                              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                                  <CheckCircle2 size={13} /> Final Gates
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {(debugRunDetails.finalCommands || []).map(
                                    (command, index) => (
                                      <div
                                        key={`${command.command}-${index}`}
                                        className={`rounded-xl border bg-white px-3 py-2 ${
                                          command.ok
                                            ? "border-emerald-100"
                                            : "border-red-100"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-mono text-[11px] font-semibold text-zinc-700">
                                            {compactCommand(command.command)}
                                          </span>
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                              command.ok
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-red-50 text-red-700"
                                            }`}
                                          >
                                            {command.ok
                                              ? "pass"
                                              : `exit ${command.exitCode}`}
                                          </span>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    </div>
                  ) : (
                    <div
                      ref={consoleRef}
                      className="bg-[#111] border border-zinc-800 rounded-2xl p-6 font-mono text-[11px] sm:text-xs leading-relaxed custom-scroll h-[600px] overflow-y-auto shadow-inner text-zinc-300"
                    >
                      {serverLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-zinc-500 italic">
                          Awaiting server output...
                        </div>
                      ) : (
                        serverLogs.map((log, i) => (
                          <div
                            key={i}
                            className="mb-2 flex gap-4 hover:bg-white/5 px-2 py-1.5 rounded transition-colors"
                          >
                            <span className="text-zinc-500 shrink-0 select-none">
                              {new Date(log.time).toLocaleTimeString([], {
                                hour12: false,
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                            <span
                              className={`break-words ${
                                log.type === "error"
                                  ? "text-red-400"
                                  : log.type === "warn"
                                    ? "text-yellow-400"
                                    : "text-zinc-300"
                              }`}
                            >
                              {log.msg}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
