import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type EvidenceEvent,
  type MasteryDelta,
  type ToolJob,
} from "../memory/longterm.memory";
import {
  Terminal,
  Activity,
  Clock,
  ChevronRight,
  Menu,
  BookOpen,
  Network,
  Sparkles,
  BrainCircuit,
  Wrench,
  Gauge,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { gsap } from "gsap";
import { useStore } from "../store";
import { useMotionPreference } from "../hooks/useMotionPreference";

type ServerConsoleStatus = "idle" | "connecting" | "connected" | "unavailable";
type AdminTab = "activity" | "evidence" | "traces" | "console";
type ActivityStatus = "idle" | "loading" | "ready" | "error";
const TRACE_PAGE_SIZE = 100;

type SystemActivityEvent = {
  id: string;
  timestamp: number;
  kind: string;
  status: string;
  title: string;
  detail?: string;
  requestId?: string;
  model?: string;
  toolName?: string;
  phase?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

type SystemActivityPayload = {
  generatedAt: string;
  localOnly: boolean;
  retention: { limit: number; strategy: string };
  summary: {
    total: number;
    byKind: Record<string, number>;
    byStatus: Record<string, number>;
    latestError: SystemActivityEvent | null;
    latestEventAt: number | null;
    retentionLimit: number;
  };
  meters: {
    providers: Record<string, boolean>;
    graph: Record<string, string>;
    tuning: Record<string, string | number>;
  };
  events: SystemActivityEvent[];
};

const serverBaseUrl = () => {
  const httpProtocol =
    window.location.protocol === "https:" ? "https:" : "http:";
  const hostPort =
    import.meta.env.DEV && /^517\d$/.test(window.location.port)
      ? `${window.location.hostname}:3000`
      : window.location.host;
  return `${httpProtocol}//${hostPort}`;
};

const serverWsUrl = () => {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostPort =
    import.meta.env.DEV && /^517\d$/.test(window.location.port)
      ? `${window.location.hostname}:3000`
      : window.location.host;
  return `${wsProtocol}//${hostPort}`;
};

const serverApiUrl = (path: string) =>
  import.meta.env.DEV ? `${serverBaseUrl()}${path}` : path;

const readDebugToken = () => {
  try {
    return window.localStorage?.getItem("tutor_debug_token") || "";
  } catch {
    return "";
  }
};

const formatTime = (timestamp?: number | null) =>
  timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "waiting";

const statusTone = (status: string) => {
  if (status === "completed")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (status === "fallback")
    return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "blocked") return "border-zinc-300 bg-zinc-100 text-zinc-600";
  return "border-blue-200 bg-blue-50 text-blue-700";
};

const kindIcon = (kind: string) => {
  if (kind === "model") return BrainCircuit;
  if (kind === "tool") return Wrench;
  if (kind === "memory" || kind === "retrieval") return Network;
  if (kind === "error") return AlertTriangle;
  return Activity;
};

export function AdminView() {
  const {
    setActiveView,
    learnerName,
    chatUsage,
    voiceUsage,
    webUsage,
    aiModel,
    activeLearningBookId,
    activeProject,
    pricing,
    webSearchEvents,
  } = useStore();
  const motionEnabled = useMotionPreference();
  const [traceLimit, setTraceLimit] = useState(TRACE_PAGE_SIZE);
  const logs = useLiveQuery(
    () =>
      db.traceLogs.orderBy("timestamp").reverse().limit(traceLimit).toArray(),
    [traceLimit],
  );
  const totalTraceCount = useLiveQuery(() => db.traceLogs.count(), []) || 0;
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
  const evidenceEvents =
    useLiveQuery(
      () =>
        db.evidenceEvents.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];
  const masteryDeltas =
    useLiveQuery(
      () => db.masteryDeltas.orderBy("timestamp").reverse().limit(30).toArray(),
      [],
    ) || [];
  const toolJobs =
    useLiveQuery(
      () => db.toolJobs.orderBy("timestamp").reverse().limit(20).toArray(),
      [],
    ) || [];
  const evidenceEventCount =
    useLiveQuery(() => db.evidenceEvents.count(), []) || 0;
  const verifiedEvidenceCount =
    useLiveQuery(
      () => db.evidenceEvents.filter((event) => event.verified).count(),
      [],
    ) || 0;
  const modelSummaryEvidenceCount =
    useLiveQuery(
      () =>
        db.evidenceEvents.where("evidenceType").equals("model_summary").count(),
      [],
    ) || 0;
  const masteryDeltaCount =
    useLiveQuery(() => db.masteryDeltas.count(), []) || 0;
  const toolJobCount = useLiveQuery(() => db.toolJobs.count(), []) || 0;
  const [serverLogs, setServerLogs] = useState<
    { type: string; msg: string; time: number }[]
  >([]);
  const [serverConsoleStatus, setServerConsoleStatus] =
    useState<ServerConsoleStatus>("idle");
  const [activityPayload, setActivityPayload] =
    useState<SystemActivityPayload | null>(null);
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>("idle");
  const [activityError, setActivityError] = useState("");
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("activity");

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [serverLogs]);

  useEffect(() => {
    if (activeTab !== "activity") return;

    let cancelled = false;
    const loadActivity = async (showLoading: boolean) => {
      if (showLoading) setActivityStatus("loading");
      setActivityError("");
      try {
        const debugToken = readDebugToken();
        const response = await fetch(
          serverApiUrl("/api/debug/system-activity"),
          {
            cache: "no-store",
            headers: {
              ...(debugToken ? { "X-Debug-Token": debugToken } : {}),
            },
          },
        );
        if (!response.ok) {
          throw new Error(`System activity unavailable (${response.status})`);
        }
        const payload = (await response.json()) as SystemActivityPayload;
        if (!cancelled) {
          setActivityPayload(payload);
          setActivityStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setActivityStatus("error");
          setActivityError(
            error instanceof Error
              ? error.message
              : "System activity unavailable",
          );
        }
      }
    };

    void loadActivity(true);
    const interval = window.setInterval(() => void loadActivity(false), 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTab, activityRefreshKey]);

  useEffect(() => {
    if (activeTab !== "console") {
      setServerConsoleStatus("idle");
      return;
    }

    let cancelled = false;
    let ws: WebSocket | null = null;
    const appendLog = (entry: { type: string; msg: string; time: number }) => {
      setServerLogs((prev) => [...prev.slice(-99), entry]);
    };

    const connect = async () => {
      setServerConsoleStatus("connecting");

      try {
        const response = await fetch(`${serverBaseUrl()}/api/health`, {
          cache: "no-store",
          mode: import.meta.env.DEV ? "no-cors" : "same-origin",
        });
        if (!response.ok && response.type !== "opaque") {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch {
        if (!cancelled) {
          setServerConsoleStatus("unavailable");
          appendLog({
            type: "warn",
            msg: "Server console is offline. Start the Tutor backend to stream live logs.",
            time: Date.now(),
          });
        }
        return;
      }

      if (cancelled) return;

      ws = new WebSocket(`${serverWsUrl()}/ws/debug`);

      ws.onopen = () => {
        if (!cancelled) {
          setServerConsoleStatus("connected");
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          appendLog({
            type: data.type || "log",
            msg: data.msg || "",
            time: data.timestamp || Date.now(),
          });
        } catch (e) {
          appendLog({
            type: "log",
            msg: event.data,
            time: Date.now(),
          });
        }
      };

      ws.onerror = () => {
        ws?.close();
      };

      ws.onclose = () => {
        if (!cancelled) {
          setServerConsoleStatus("unavailable");
        }
      };
    };

    void connect();

    return () => {
      cancelled = true;
      ws?.close();
    };
  }, [activeTab]);

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
  const traceCount = totalTraceCount || logs?.length || 0;
  const latestTrace = logs?.[0];
  const latestEvidence = evidenceEvents[0] as EvidenceEvent | undefined;
  const latestMasteryDelta = masteryDeltas[0] as MasteryDelta | undefined;
  const latestToolJob = toolJobs[0] as ToolJob | undefined;
  const mappedConceptCount = learningBookConcepts.length;
  const tracedBookCount = learningBooks.filter(
    (book) => (conceptsByBook[book.id] || []).length > 0,
  ).length;
  const systemEvents = activityPayload?.events || [];
  const systemSummary = activityPayload?.summary;
  const recentSystemEvents = systemEvents.slice(0, 40);
  const totalChatTokens = chatUsage.inputTokens + chatUsage.outputTokens;
  const totalEstimatedCost = chatUsage.cost + voiceUsage.cost + webUsage.cost;
  const localProviderCount = activityPayload
    ? Object.values(activityPayload.meters.providers).filter(Boolean).length
    : 0;
  const serverConsoleLabel =
    serverConsoleStatus === "connected"
      ? "Connected"
      : serverConsoleStatus === "connecting"
        ? "Connecting"
        : "Offline";
  const serverConsoleTone =
    serverConsoleStatus === "connected"
      ? "border-green-200 bg-green-50 text-green-600"
      : serverConsoleStatus === "connecting"
        ? "border-blue-200 bg-blue-50 text-blue-600"
        : "border-zinc-200 bg-zinc-50 text-zinc-500";
  const activityLabel =
    activityStatus === "ready"
      ? "Live"
      : activityStatus === "loading"
        ? "Loading"
        : activityStatus === "error"
          ? "Offline"
          : "Idle";
  const activityTone =
    activityStatus === "ready"
      ? "border-green-200 bg-green-50 text-green-600"
      : activityStatus === "loading"
        ? "border-blue-200 bg-blue-50 text-blue-600"
        : activityStatus === "error"
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-zinc-200 bg-zinc-50 text-zinc-500";

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    gsap.killTweensOf(content);
    gsap.fromTo(
      content,
      { autoAlpha: 0, x: 20 },
      {
        autoAlpha: 1,
        x: 0,
        duration: motionEnabled ? 0.24 : 0,
        ease: "power3.out",
      },
    );

    const animatedItems = Array.from(
      content.querySelectorAll<HTMLElement>(".admin-animated-item"),
    );
    if (animatedItems.length) {
      gsap.fromTo(
        animatedItems,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: motionEnabled ? 0.26 : 0,
          stagger: motionEnabled ? 0.035 : 0,
          ease: "power2.out",
        },
      );
    }
  }, [
    activeTab,
    evidenceEvents.length,
    learningBooks.length,
    logs?.length,
    masteryDeltas.length,
    motionEnabled,
    recentSystemEvents.length,
    toolJobs.length,
  ]);

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
              onClick={() => setActiveTab("activity")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "activity" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Gauge size={16} />
              <span className="line-clamp-1 leading-snug">System Activity</span>
            </button>
            <button
              onClick={() => setActiveTab("evidence")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "evidence" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <BrainCircuit size={16} />
              <span className="line-clamp-1 leading-snug">Evidence Ledger</span>
            </button>
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
            <div
              ref={contentRef}
              key={activeTab}
              className="relative z-10 font-serif pb-12"
            >
              {/* Admin Center Preface */}
              <div className="mb-12">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">
                  Admin Center
                </h1>
                <p className="text-zinc-600 leading-relaxed max-w-2xl text-sm font-serif">
                  Welcome to the Tutor System's central command. This dashboard
                  exposes behind-the-scenes model activity, tool calls, local
                  memory updates, saved trace explanations, and backend health
                  signals. Use <strong>System Activity</strong> for the live
                  observability ledger, <strong>Evidence Ledger</strong> to
                  inspect model-summary evidence and mastery deltas,{" "}
                  <strong>DeepSeek Trace</strong> for persisted tutor updates,
                  or switch to the <strong>Server Console</strong> to monitor
                  live backend traffic, WebSocket streams, and TTS generation
                  logs.
                </p>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm sm:grid-cols-3 lg:hidden">
                {[
                  { id: "activity", label: "Activity", icon: Gauge },
                  { id: "evidence", label: "Evidence", icon: BrainCircuit },
                  { id: "traces", label: "Traces", icon: Activity },
                  { id: "console", label: "Console", icon: Terminal },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as AdminTab)}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                        activeTab === tab.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mb-10 border-b border-zinc-200 pb-8 pt-4 font-sans cursor-default">
                <span className="text-[11px] uppercase tracking-[0.2em] font-mono text-zinc-400 mb-6 block font-medium">
                  <span className="text-blue-500 mr-2">#</span>
                  {activeTab === "activity"
                    ? "Observability"
                    : activeTab === "evidence"
                      ? "Learner Evidence"
                      : activeTab === "traces"
                        ? "Diagnostics"
                        : "Runtime Environment"}
                </span>
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl md:text-4xl lg:text-4xl font-medium tracking-tight text-zinc-900 mb-2 font-serif leading-[1.15]">
                    {activeTab === "activity"
                      ? "System Activity"
                      : activeTab === "evidence"
                        ? "Evidence Ledger"
                        : activeTab === "traces"
                          ? "DeepSeek Trace Ledger"
                          : "Live Server Console"}
                  </h1>
                  {activeTab === "activity" && (
                    <div
                      className={`flex gap-1.5 items-center px-2 py-1 border rounded-md shadow-sm ${activityTone}`}
                    >
                      <span className="relative flex h-2 w-2">
                        {activityStatus === "ready" && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            activityStatus === "ready"
                              ? "bg-green-500"
                              : activityStatus === "loading"
                                ? "bg-blue-500"
                                : activityStatus === "error"
                                  ? "bg-red-500"
                                  : "bg-zinc-400"
                          }`}
                        ></span>
                      </span>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider">
                        {activityLabel}
                      </span>
                    </div>
                  )}
                  {activeTab === "console" && (
                    <div
                      className={`flex gap-1.5 items-center px-2 py-1 border rounded-md shadow-sm ${serverConsoleTone}`}
                    >
                      <span className="relative flex h-2 w-2">
                        {serverConsoleStatus === "connected" && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            serverConsoleStatus === "connected"
                              ? "bg-green-500"
                              : serverConsoleStatus === "connecting"
                                ? "bg-blue-500"
                                : "bg-zinc-400"
                          }`}
                        ></span>
                      </span>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider">
                        {serverConsoleLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="prose prose-zinc w-full max-w-none prose-sm md:prose-base font-serif prose-p:leading-[1.8] prose-p:text-zinc-800 prose-p:font-light prose-p:my-5 selection:bg-blue-200 selection:text-zinc-900">
                {activeTab === "activity" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <Gauge size={13} /> Local Observability
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Behind-the-scenes activity
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            A local in-memory ledger for model calls, tool
                            execution, web retrieval, learning-book updates,
                            fallbacks, and errors. It is separate from the
                            learner brain graph and from Graphify's code
                            architecture graph.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActivityRefreshKey((key) => key + 1);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900"
                        >
                          <RefreshCw size={13} />
                          Auto-refresh 5s
                        </button>
                      </div>

                      {activityStatus === "error" ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          {activityError ||
                            "System activity is unavailable. Start the Tutor backend and reopen Admin."}
                        </div>
                      ) : null}

                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            Activity Events
                          </div>
                          <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                            {systemSummary?.total || 0}
                          </div>
                          <div className="mt-1 text-[10px] font-mono text-zinc-500">
                            limit {systemSummary?.retentionLimit || 250}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            Current Model
                          </div>
                          <div className="mt-2 truncate text-sm font-semibold text-zinc-900">
                            {aiModel}
                          </div>
                          <div className="mt-1 text-[10px] font-mono text-zinc-500">
                            {chatUsage.requests} chat requests
                          </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            Local Memory
                          </div>
                          <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                            {learningEntries.length + traceCount}
                          </div>
                          <div className="mt-1 text-[10px] font-mono text-zinc-500">
                            entries + traces
                          </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                            Providers Ready
                          </div>
                          <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                            {localProviderCount}
                          </div>
                          <div className="mt-1 text-[10px] font-mono text-zinc-500">
                            local config meters
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Event stream
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Newest first, redacted server-side, retained in
                              memory for this local backend process.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(systemSummary?.latestEventAt)}
                          </div>
                        </div>

                        {activityStatus === "loading" && !activityPayload ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            Loading system activity...
                          </div>
                        ) : recentSystemEvents.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No activity events yet. Start a chat, trigger a
                            tool, or generate learning-book notes to fill the
                            ledger.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {recentSystemEvents.map((event, index) => {
                              const Icon = kindIcon(event.kind);
                              return (
                                <article
                                  key={event.id}
                                  className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="flex min-w-0 gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600">
                                        <Icon size={17} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h4 className="m-0 text-sm font-semibold text-zinc-900">
                                            {event.title}
                                          </h4>
                                          <span
                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(event.status)}`}
                                          >
                                            {event.status}
                                          </span>
                                        </div>
                                        {event.detail && (
                                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600 font-serif">
                                            {event.detail}
                                          </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                          <span>{event.kind}</span>
                                          {event.phase && (
                                            <span>phase {event.phase}</span>
                                          )}
                                          {event.toolName && (
                                            <span>tool {event.toolName}</span>
                                          )}
                                          {event.model && (
                                            <span className="max-w-[220px] truncate">
                                              model {event.model}
                                            </span>
                                          )}
                                          {event.durationMs !== undefined && (
                                            <span>{event.durationMs}ms</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                      <div>{formatTime(event.timestamp)}</div>
                                      {event.requestId && (
                                        <div className="mt-1 max-w-[140px] truncate">
                                          {event.requestId}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {event.metadata && (
                                    <details className="group mt-3">
                                      <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                        <ChevronRight
                                          size={14}
                                          className="transition-transform group-open:rotate-90"
                                        />
                                        Metadata
                                      </summary>
                                      <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                        {JSON.stringify(
                                          event.metadata,
                                          null,
                                          2,
                                        )}
                                      </pre>
                                    </details>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Meters
                          </h3>
                          <div className="mt-4 grid gap-3">
                            {[
                              ["Tokens", totalChatTokens.toLocaleString()],
                              [
                                "Estimated cost",
                                `$${totalEstimatedCost.toFixed(4)}`,
                              ],
                              ["Web searches", webUsage.requests],
                              ["Web events", webSearchEvents.length],
                              ["Voice sessions", voiceUsage.sessions],
                              ["Books", learningBooks.length],
                              ["Mapped concepts", mappedConceptCount],
                              ["Evidence events", evidenceEventCount],
                              ["Mastery deltas", masteryDeltaCount],
                              ["Tool jobs", toolJobCount],
                              ["Active book", activeLearningBookId || "none"],
                              ["Project", activeProject],
                              [
                                "Pricing",
                                pricing.stale ? "fallback/stale" : "live",
                              ],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                              >
                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                  {label}
                                </span>
                                <span className="min-w-0 truncate text-right text-xs font-semibold text-zinc-900">
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Event mix
                          </h3>
                          <div className="mt-4 space-y-4">
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                By kind
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(
                                  systemSummary?.byKind || {},
                                ).map(([kind, count]) => (
                                  <span
                                    key={kind}
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                                  >
                                    {kind}: {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                By status
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(
                                  systemSummary?.byStatus || {},
                                ).map(([status, count]) => (
                                  <span
                                    key={status}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(status)}`}
                                  >
                                    {status}: {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Tuning snapshot
                          </h3>
                          <div className="mt-4 space-y-2 text-xs text-zinc-600">
                            {activityPayload ? (
                              Object.entries(activityPayload.meters.tuning).map(
                                ([label, value]) => (
                                  <div
                                    key={label}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                                  >
                                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                                      {label}
                                    </span>
                                    <span className="truncate text-right font-semibold text-zinc-900">
                                      {value}
                                    </span>
                                  </div>
                                ),
                              )
                            ) : (
                              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-zinc-500">
                                Waiting for backend meters.
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    </section>
                  </div>
                ) : activeTab === "evidence" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500/70">
                            <BrainCircuit size={13} /> Local Learner Evidence
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Evidence and mastery audit trail
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            Durable local records for model-summary evidence,
                            explicit recall attempts, and BKT mastery changes.
                            Model summaries can explain why a memory exists;
                            only recall evidence should create mastery deltas.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                          <div className="text-2xl font-semibold text-zinc-900">
                            {verifiedEvidenceCount}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Verified events shown
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        {[
                          ["Evidence Events", evidenceEventCount],
                          ["Model Summaries", modelSummaryEvidenceCount],
                          ["Mastery Deltas", masteryDeltaCount],
                          ["Tool Jobs", toolJobCount],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Mastery deltas
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Changes created by explicit BKT recall evidence.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(latestMasteryDelta?.timestamp)}
                          </div>
                        </div>

                        {masteryDeltas.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No mastery deltas yet. Complete a recall attempt
                            tied to a concept to create the first audited BKT
                            update.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {masteryDeltas.map((delta, index) => (
                              <article
                                key={delta.id}
                                className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 12 ? "admin-animated-item" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                        {delta.conceptId}
                                      </h4>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                                          delta.correct
                                            ? "border-green-200 bg-green-50 text-green-700"
                                            : "border-orange-200 bg-orange-50 text-orange-700"
                                        }`}
                                      >
                                        {delta.correct ? "correct" : "review"}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 font-serif">
                                      {delta.reason}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                      <span>{delta.evidenceType}</span>
                                      <span>
                                        mastery{" "}
                                        {(delta.previousMastery * 100).toFixed(
                                          0,
                                        )}
                                        % to{" "}
                                        {(delta.nextMastery * 100).toFixed(0)}%
                                      </span>
                                      <span>
                                        delta {delta.delta >= 0 ? "+" : ""}
                                        {(delta.delta * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                    {formatTime(delta.timestamp)}
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Evidence events
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Model summaries are retained as evidence, but
                              marked unverified for mastery.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(latestEvidence?.timestamp)}
                          </div>
                        </div>

                        {evidenceEvents.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No durable evidence records yet. Chat graph updates,
                            learning-book updates, and recall attempts will
                            appear here.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {evidenceEvents.map((event, index) => (
                              <article
                                key={event.id}
                                className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 12 ? "admin-animated-item" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                        {event.conceptId ||
                                          event.bookId ||
                                          event.source}
                                      </h4>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                                          event.verified
                                            ? "border-green-200 bg-green-50 text-green-700"
                                            : "border-zinc-300 bg-zinc-100 text-zinc-600"
                                        }`}
                                      >
                                        {event.verified
                                          ? "verified"
                                          : "not mastery evidence"}
                                      </span>
                                    </div>
                                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600 font-serif">
                                      {event.summary}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                      <span>{event.evidenceType}</span>
                                      <span>{event.source}</span>
                                      {event.confidence !== undefined && (
                                        <span>
                                          confidence{" "}
                                          {(event.confidence * 100).toFixed(0)}%
                                        </span>
                                      )}
                                      {event.correct !== undefined && (
                                        <span>
                                          {event.correct
                                            ? "correct"
                                            : "incorrect"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                    {formatTime(event.timestamp)}
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Tool jobs
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500 font-serif">
                            Local durable table for future tool execution jobs,
                            retries, and dead-letter review.
                          </p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                          {formatTime(latestToolJob?.timestamp)}
                        </div>
                      </div>

                      {toolJobs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                          Tool job schema is ready. Runtime tool execution still
                          uses the in-memory system activity ledger until the
                          next worker-queue slice.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {toolJobs.map((job) => (
                            <article
                              key={job.id}
                              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                    {job.toolName}
                                  </h4>
                                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600 font-serif">
                                    {job.outputSummary ||
                                      job.inputSummary ||
                                      job.error ||
                                      "No summary recorded."}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(job.status)}`}
                                >
                                  {job.status}
                                </span>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                ) : activeTab === "traces" ? (
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
                            concept maps, and saved trace explanations. It does
                            not expose hidden chain-of-thought; each item
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
                              <article
                                key={book.id}
                                className={`relative overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm ${index < 12 ? "admin-animated-item" : ""}`}
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
                                            concept.childConcepts.length > 0 ||
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
                              </article>
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
                          Saved trace explanations will appear here after Tutor
                          writes a trace log from a completed learning action.
                        </div>
                      </div>
                    ) : (
                      logs.map((log, index) => {
                        const animateTraceRow = index < 24;
                        return (
                          <div
                            key={log.id}
                            className={`relative pl-8 pb-8 ${animateTraceRow ? "admin-animated-item" : ""}`}
                          >
                            <div
                              className="absolute left-[0px] top-4 w-[2px] bg-zinc-200/60"
                              style={{ height: "100%" }}
                            />
                            <div className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-[#faf9f6] shadow-sm -left-[5px] top-1 z-10" />

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
                          </div>
                        );
                      })
                    )}
                    {logs && logs.length > 0 && logs.length < traceCount && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setTraceLimit((limit) => limit + TRACE_PAGE_SIZE)
                          }
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                        >
                          Load more traces
                        </button>
                      </div>
                    )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
