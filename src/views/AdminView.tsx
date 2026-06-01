import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type ArtifactRecord,
  type CitationState,
  type CorrectionEvent,
  type EvidenceEvent,
  type MasteryDelta,
  type MemoryEvent,
  type ModelRun,
  type RetrievalEvent,
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
  RotateCcw,
  Search,
  SlidersHorizontal,
  Cpu,
  Flag,
  Trash2,
} from "lucide-react";
import { gsap } from "gsap";
import { useStore } from "../store";
import { useMotionPreference } from "../hooks/useMotionPreference";
import { recordCorrectionEvent } from "../memory/correction.events";
import {
  BRAIN_RUNTIME_SETTING_LIMITS,
  DEFAULT_BRAIN_RUNTIME_SETTINGS,
  type BrainRuntimeSettings,
  type BrainWebSearchPolicy,
} from "../lib/brainRuntimeSettings";

type ServerConsoleStatus = "idle" | "connecting" | "connected" | "unavailable";
type AdminTab =
  | "activity"
  | "models"
  | "memory"
  | "corrections"
  | "artifacts"
  | "retrieval"
  | "evidence"
  | "tuning"
  | "traces"
  | "console";
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

const webSearchPolicyOptions: {
  id: BrainWebSearchPolicy;
  label: string;
  description: string;
}[] = [
  {
    id: "source_first",
    label: "Source First",
    description: "Use local page, book, and memory context before web search.",
  },
  {
    id: "manual_only",
    label: "Manual Only",
    description: "Block automatic web search unless the Search skill is used.",
  },
  {
    id: "auto_freshness",
    label: "Auto Freshness",
    description: "Allow freshness-sensitive web retrieval when detected.",
  },
];

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
  if (
    status === "completed" ||
    status === "applied" ||
    status === "ready" ||
    status === "verified"
  )
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "failed" || status === "blocked" || status === "conflicting")
    return "border-red-200 bg-red-50 text-red-700";
  if (
    status === "fallback" ||
    status === "unavailable" ||
    status === "unsupported" ||
    status === "stale"
  )
    return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "dismissed")
    return "border-zinc-300 bg-zinc-100 text-zinc-600";
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
    systemPrompt,
    activeLearningBookId,
    activeProject,
    pricing,
    webSearchEvents,
    brainRuntimeSettings,
    setBrainRuntimeSettings,
    resetBrainRuntimeSettings,
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
  const modelRuns =
    useLiveQuery(
      () => db.modelRuns.orderBy("timestamp").reverse().limit(30).toArray(),
      [],
    ) || [];
  const memoryEvents =
    useLiveQuery(
      () => db.memoryEvents.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];
  const retrievalEvents =
    useLiveQuery(
      () =>
        db.retrievalEvents.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];
  const correctionEvents =
    useLiveQuery(
      () =>
        db.correctionEvents.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];
  const artifactRecords =
    useLiveQuery(
      () =>
        db.artifactRecords.orderBy("timestamp").reverse().limit(50).toArray(),
      [],
    ) || [];
  const citationStates =
    useLiveQuery(
      () =>
        db.citationStates.orderBy("timestamp").reverse().limit(50).toArray(),
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
  const modelRunCount = useLiveQuery(() => db.modelRuns.count(), []) || 0;
  const memoryEventCount = useLiveQuery(() => db.memoryEvents.count(), []) || 0;
  const retrievalEventCount =
    useLiveQuery(() => db.retrievalEvents.count(), []) || 0;
  const correctionEventCount =
    useLiveQuery(() => db.correctionEvents.count(), []) || 0;
  const artifactRecordCount =
    useLiveQuery(() => db.artifactRecords.count(), []) || 0;
  const citationStateCount =
    useLiveQuery(() => db.citationStates.count(), []) || 0;
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
  const [correctionAction, setCorrectionAction] =
    useState<CorrectionEvent["action"]>("mark_wrong");
  const [correctionTargetType, setCorrectionTargetType] =
    useState<CorrectionEvent["targetType"]>("memory_event");
  const [correctionTargetId, setCorrectionTargetId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionFeedback, setCorrectionFeedback] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [serverLogs]);

  useEffect(() => {
    if (activeTab !== "activity") return;

    let cancelled = false;
    let inFlight = false;
    const loadActivity = async (showLoading: boolean) => {
      if (inFlight) return;
      inFlight = true;
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
      } finally {
        inFlight = false;
      }
    };

    void loadActivity(true);
    const interval = window.setInterval(
      () => void loadActivity(false),
      brainRuntimeSettings.activityRefreshMs,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTab, activityRefreshKey, brainRuntimeSettings.activityRefreshMs]);

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
  const latestModelRun = modelRuns[0] as ModelRun | undefined;
  const latestMemoryEvent = memoryEvents[0] as MemoryEvent | undefined;
  const latestRetrievalEvent = retrievalEvents[0] as RetrievalEvent | undefined;
  const latestCorrectionEvent = correctionEvents[0] as
    | CorrectionEvent
    | undefined;
  const latestArtifactRecord = artifactRecords[0] as ArtifactRecord | undefined;
  const latestCitationState = citationStates[0] as CitationState | undefined;
  const completedModelRuns = modelRuns.filter(
    (run) => run.status === "completed",
  ).length;
  const blockedOrFailedModelRuns = modelRuns.filter(
    (run) => run.status === "blocked" || run.status === "failed",
  ).length;
  const fallbackModelRuns = modelRuns.filter(
    (run) => run.status === "fallback",
  ).length;
  const completedMemoryEvents = memoryEvents.filter(
    (event) => event.status === "completed",
  ).length;
  const failedMemoryEvents = memoryEvents.filter(
    (event) => event.status === "failed",
  ).length;
  const learningBookMemoryEvents = memoryEvents.filter(
    (event) => event.eventType === "learning_book_updated",
  ).length;
  const conceptMemoryEvents = memoryEvents.filter(
    (event) =>
      event.eventType === "learning_concept_updated" ||
      event.eventType === "graph_concept_updated",
  ).length;
  const memoryEventsByType = memoryEvents.reduce<Record<string, number>>(
    (acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    },
    {},
  );
  const completedRetrievalEvents = retrievalEvents.filter(
    (event) => event.status === "completed",
  ).length;
  const failedRetrievalEvents = retrievalEvents.filter(
    (event) => event.status === "failed",
  ).length;
  const retrievalContextChars = retrievalEvents.reduce(
    (sum, event) => sum + (event.contextChars || 0),
    0,
  );
  const retrievalSelectedConcepts = retrievalEvents.reduce(
    (sum, event) => sum + event.selectedConceptIds.length,
    0,
  );
  const openCorrectionEvents = correctionEvents.filter(
    (event) => event.status === "open",
  ).length;
  const appliedCorrectionEvents = correctionEvents.filter(
    (event) => event.status === "applied",
  ).length;
  const blockedCorrectionEvents = correctionEvents.filter(
    (event) => event.status === "blocked",
  ).length;
  const deleteRequestCorrectionEvents = correctionEvents.filter(
    (event) => event.action === "delete_request",
  ).length;
  const markWrongCorrectionEvents = correctionEvents.filter(
    (event) => event.action === "mark_wrong",
  ).length;
  const correctionEventsByTarget = correctionEvents.reduce<
    Record<string, number>
  >((acc, event) => {
    acc[event.targetType] = (acc[event.targetType] || 0) + 1;
    return acc;
  }, {});
  const sourceCardArtifacts = artifactRecords.filter(
    (record) => record.artifactType === "source_card",
  ).length;
  const readyArtifactRecords = artifactRecords.filter(
    (record) => record.status === "ready",
  ).length;
  const checkingCitationStates = citationStates.filter(
    (state) => state.state === "checking",
  ).length;
  const unavailableCitationStates = citationStates.filter(
    (state) => state.state === "unavailable",
  ).length;
  const verifiedCitationStates = citationStates.filter(
    (state) => state.state === "verified",
  ).length;
  const artifactRecordsByType = artifactRecords.reduce<Record<string, number>>(
    (acc, record) => {
      acc[record.artifactType] = (acc[record.artifactType] || 0) + 1;
      return acc;
    },
    {},
  );
  const citationStatesByState = citationStates.reduce<Record<string, number>>(
    (acc, state) => {
      acc[state.state] = (acc[state.state] || 0) + 1;
      return acc;
    },
    {},
  );
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
  const updateRuntimeSetting = <K extends keyof BrainRuntimeSettings>(
    key: K,
    value: BrainRuntimeSettings[K],
  ) =>
    setBrainRuntimeSettings({ [key]: value } as Partial<BrainRuntimeSettings>);
  const runtimeSettingsAreDefault =
    brainRuntimeSettings.activityRefreshMs ===
      DEFAULT_BRAIN_RUNTIME_SETTINGS.activityRefreshMs &&
    brainRuntimeSettings.memoryConceptLimit ===
      DEFAULT_BRAIN_RUNTIME_SETTINGS.memoryConceptLimit &&
    brainRuntimeSettings.toolIterationLimit ===
      DEFAULT_BRAIN_RUNTIME_SETTINGS.toolIterationLimit &&
    brainRuntimeSettings.webSearchPolicy ===
      DEFAULT_BRAIN_RUNTIME_SETTINGS.webSearchPolicy;

  const recordCorrectionRequest = async (input: {
    action: CorrectionEvent["action"];
    targetType: CorrectionEvent["targetType"];
    targetId: string;
    reason: string;
    targetSummary?: string;
    source: string;
    bookId?: string;
    conversationId?: string;
    conceptId?: string;
    relatedEventIds?: string[];
    metadata?: Record<string, unknown>;
  }) => {
    const targetId = input.targetId.trim();
    if (!targetId) {
      setCorrectionFeedback("");
      setCorrectionError("Choose a target before recording a correction.");
      return;
    }

    setCorrectionError("");
    const record = await recordCorrectionEvent({
      ...input,
      targetId,
      requestedBy: "admin",
      status: "open",
    });
    setCorrectionFeedback(
      `${record.action.replace(/_/g, " ")} recorded for ${record.targetType.replace(/_/g, " ")}.`,
    );
  };

  const submitManualCorrection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void recordCorrectionRequest({
      action: correctionAction,
      targetType: correctionTargetType,
      targetId: correctionTargetId,
      reason: correctionReason || "Admin requested correction review.",
      source: "admin_manual_correction",
    }).then(() => {
      if (correctionTargetId.trim()) {
        setCorrectionTargetId("");
        setCorrectionReason("");
      }
    });
  };

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    gsap.killTweensOf(content);
    const contentTween = gsap.fromTo(
      content,
      { autoAlpha: 0, x: 20 },
      {
        autoAlpha: 1,
        x: 0,
        duration: motionEnabled ? 0.24 : 0,
        ease: "power3.out",
      },
    );
    const visibilityFallback = window.setTimeout(() => {
      if (Number(gsap.getProperty(content, "opacity")) === 0) {
        gsap.set(content, { autoAlpha: 1, x: 0 });
      }
    }, 450);

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

    return () => {
      window.clearTimeout(visibilityFallback);
      contentTween.kill();
    };
  }, [
    activeTab,
    artifactRecords.length,
    citationStates.length,
    correctionEvents.length,
    evidenceEvents.length,
    learningBooks.length,
    logs?.length,
    masteryDeltas.length,
    memoryEvents.length,
    modelRuns.length,
    motionEnabled,
    recentSystemEvents.length,
    retrievalEvents.length,
    toolJobs.length,
  ]);

  return (
    <div className="w-full h-full bg-[#faf9f6] text-zinc-900 flex flex-col overflow-x-hidden overflow-y-auto custom-scroll pt-20 md:pt-0 relative font-serif">
      {/* Subtle Paper Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")',
        }}
      />

      <div className="min-h-full flex w-full min-w-0 relative z-10 pt-16 md:pt-20 shrink-0">
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
              onClick={() => setActiveTab("models")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "models" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Cpu size={16} />
              <span className="line-clamp-1 leading-snug">Model Runs</span>
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "memory" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Network size={16} />
              <span className="line-clamp-1 leading-snug">Memory Events</span>
            </button>
            <button
              onClick={() => setActiveTab("corrections")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "corrections" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Flag size={16} />
              <span className="line-clamp-1 leading-snug">
                Correction Requests
              </span>
            </button>
            <button
              onClick={() => setActiveTab("artifacts")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "artifacts" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <BookOpen size={16} />
              <span className="line-clamp-1 leading-snug">
                Source Artifacts
              </span>
            </button>
            <button
              onClick={() => setActiveTab("retrieval")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "retrieval" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <Search size={16} />
              <span className="line-clamp-1 leading-snug">
                Retrieval Events
              </span>
            </button>
            <button
              onClick={() => setActiveTab("evidence")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "evidence" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <BrainCircuit size={16} />
              <span className="line-clamp-1 leading-snug">Evidence Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab("tuning")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 flex items-center gap-2 ${activeTab === "tuning" ? "bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 border border-transparent"}`}
            >
              <SlidersHorizontal size={16} />
              <span className="line-clamp-1 leading-snug">Runtime Tuning</span>
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
        <div className="flex-1 min-w-0 flex flex-col relative font-sans">
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
                  observability ledger, <strong>Model Runs</strong> to inspect
                  provider behavior, fallbacks, tokens, and failures,{" "}
                  <strong>Memory Events</strong> to inspect learner memory
                  writes, <strong>Correction Requests</strong> to audit local
                  mark-wrong and deletion-review intents,{" "}
                  <strong>Source Artifacts</strong> to inspect captured web
                  source cards and citation states,{" "}
                  <strong>Retrieval Events</strong> to inspect semantic memory
                  context selection, <strong>Evidence Ledger</strong> to inspect
                  model-summary evidence and mastery deltas,{" "}
                  <strong>Runtime Tuning</strong> for local behavior controls,{" "}
                  <strong>DeepSeek Trace</strong> for persisted tutor updates,
                  or switch to the <strong>Server Console</strong> to monitor
                  live backend traffic, WebSocket streams, and TTS generation
                  logs.
                </p>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm sm:grid-cols-3 lg:hidden">
                {[
                  { id: "activity", label: "Activity", icon: Gauge },
                  { id: "models", label: "Models", icon: Cpu },
                  { id: "memory", label: "Memory", icon: Network },
                  { id: "corrections", label: "Correct", icon: Flag },
                  { id: "artifacts", label: "Sources", icon: BookOpen },
                  { id: "retrieval", label: "Retrieval", icon: Search },
                  { id: "evidence", label: "Evidence", icon: BrainCircuit },
                  {
                    id: "tuning",
                    label: "Tuning",
                    icon: SlidersHorizontal,
                  },
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
                    : activeTab === "models"
                      ? "Model Behavior"
                      : activeTab === "memory"
                        ? "Memory Audit"
                        : activeTab === "corrections"
                          ? "Memory Control"
                          : activeTab === "artifacts"
                            ? "Source Grounding"
                            : activeTab === "retrieval"
                              ? "Retrieval Audit"
                              : activeTab === "evidence"
                                ? "Learner Evidence"
                                : activeTab === "tuning"
                                  ? "Runtime Controls"
                                  : activeTab === "traces"
                                    ? "Diagnostics"
                                    : "Runtime Environment"}
                </span>
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl md:text-4xl lg:text-4xl font-medium tracking-tight text-zinc-900 mb-2 font-serif leading-[1.15]">
                    {activeTab === "activity"
                      ? "System Activity"
                      : activeTab === "models"
                        ? "Model Runs"
                        : activeTab === "memory"
                          ? "Memory Events"
                          : activeTab === "corrections"
                            ? "Correction Requests"
                            : activeTab === "artifacts"
                              ? "Artifacts & Citations"
                              : activeTab === "retrieval"
                                ? "Retrieval Events"
                                : activeTab === "evidence"
                                  ? "Evidence Ledger"
                                  : activeTab === "tuning"
                                    ? "Runtime Tuning"
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
                          Auto-refresh{" "}
                          {Math.round(
                            brainRuntimeSettings.activityRefreshMs / 1000,
                          )}
                          s
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
                            {learningEntries.length +
                              memoryEventCount +
                              artifactRecordCount +
                              citationStateCount +
                              retrievalEventCount +
                              traceCount}
                          </div>
                          <div className="mt-1 text-[10px] font-mono text-zinc-500">
                            entries + memory + sources + traces
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
                              ["Model runs", modelRunCount],
                              ["Memory events", memoryEventCount],
                              ["Source artifacts", artifactRecordCount],
                              ["Citation states", citationStateCount],
                              ["Retrieval events", retrievalEventCount],
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
                ) : activeTab === "models" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <Cpu size={13} /> Durable Model Behavior
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Chat model run ledger
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            Local records for chat model starts, fallbacks,
                            completions, blocked requests, and failures. These
                            rows make provider behavior auditable without
                            touching cloud deployment or the learner concept
                            graph.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                          <div className="text-2xl font-semibold text-zinc-900">
                            {modelRunCount}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Durable runs
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        {[
                          ["Recent completed", completedModelRuns],
                          ["Blocked or failed", blockedOrFailedModelRuns],
                          ["Fallbacks", fallbackModelRuns],
                          [
                            "Latest",
                            latestModelRun?.usedModel ||
                              latestModelRun?.requestedModel ||
                              "none",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 truncate text-lg font-semibold tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Recent runs
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500 font-serif">
                            Newest first. Runtime settings are captured per
                            request so tuning decisions can be compared against
                            model behavior.
                          </p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                          {formatTime(latestModelRun?.timestamp)}
                        </div>
                      </div>

                      {modelRuns.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                          No durable model runs yet. Send a chat request and the
                          stream will persist local model-run rows here,
                          including blocked API-key checks.
                        </div>
                      ) : (
                        <div className="grid gap-3 xl:grid-cols-2">
                          {modelRuns.map((run, index) => (
                            <article
                              key={run.id}
                              className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                      {run.usedModel ||
                                        run.requestedModel ||
                                        "unknown model"}
                                    </h4>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(run.status)}`}
                                    >
                                      {run.status}
                                    </span>
                                  </div>
                                  {run.requestedModel &&
                                    run.usedModel &&
                                    run.requestedModel !== run.usedModel && (
                                      <p className="mt-1 text-sm leading-relaxed text-orange-700 font-serif">
                                        Requested {run.requestedModel}; used{" "}
                                        {run.usedModel}.
                                      </p>
                                    )}
                                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600 font-serif">
                                    {run.error ||
                                      `${run.outputTokens || 0} output tokens, ${run.inputTokens || 0} input tokens${run.cost !== undefined ? `, $${run.cost.toFixed(6)}` : ""}.`}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                    {run.requestId && (
                                      <span className="max-w-[9rem] truncate">
                                        {run.requestId}
                                      </span>
                                    )}
                                    <span>{run.provider}</span>
                                    {run.durationMs !== undefined && (
                                      <span>{run.durationMs}ms</span>
                                    )}
                                    {run.iterations !== undefined && (
                                      <span>{run.iterations} loops</span>
                                    )}
                                    {run.webSources !== undefined && (
                                      <span>{run.webSources} sources</span>
                                    )}
                                    {run.estimated && <span>estimated</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                  {formatTime(run.timestamp)}
                                </div>
                              </div>

                              {(run.runtimeSettings || run.metadata) && (
                                <details className="group mt-3">
                                  <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                    <ChevronRight
                                      size={14}
                                      className="transition-transform group-open:rotate-90"
                                    />
                                    Runtime and metadata
                                  </summary>
                                  <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                    {JSON.stringify(
                                      {
                                        runtimeSettings: run.runtimeSettings,
                                        memoryContextChars:
                                          run.memoryContextChars,
                                        sourceMaterialRequest:
                                          run.sourceMaterialRequest,
                                        requestedWebSearch:
                                          run.requestedWebSearch,
                                        graphUpdates: run.graphUpdates,
                                        flashcards: run.flashcards,
                                        metadata: run.metadata,
                                      },
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </details>
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                ) : activeTab === "memory" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <Network size={13} /> Durable Memory Activity
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Learner memory event ledger
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            Append-only local records for memory sessions, saved
                            chat interactions, learning-book updates, concept
                            writes, and graph memory changes. This is the
                            user-brain runtime audit trail, separate from
                            Graphify's code architecture graph.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                          <div className="text-2xl font-semibold text-zinc-900">
                            {memoryEventCount}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Durable events
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        {[
                          ["Completed", completedMemoryEvents],
                          ["Failed", failedMemoryEvents],
                          ["Book updates", learningBookMemoryEvents],
                          ["Concept writes", conceptMemoryEvents],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 truncate text-lg font-semibold tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Recent memory writes
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Newest first. Rows are written from local memory
                              code paths so failures are visible without
                              blocking the learner flow.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(latestMemoryEvent?.timestamp)}
                          </div>
                        </div>

                        {memoryEvents.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No durable memory events yet. Opening Tutor starts a
                            local memory session; completed chats will add
                            interaction and learning-book rows.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {memoryEvents.map((event, index) => (
                              <article
                                key={event.id}
                                className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="flex min-w-0 gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600">
                                      <Network size={17} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                          {event.eventType.replace(/_/g, " ")}
                                        </h4>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(event.status)}`}
                                        >
                                          {event.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600 font-serif">
                                        {event.summary}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                        <span>{event.source}</span>
                                        {event.bookId && (
                                          <span className="max-w-[10rem] truncate">
                                            book {event.bookId}
                                          </span>
                                        )}
                                        {event.conceptId && (
                                          <span className="max-w-[10rem] truncate">
                                            concept {event.conceptId}
                                          </span>
                                        )}
                                        {event.conversationId && (
                                          <span className="max-w-[10rem] truncate">
                                            convo {event.conversationId}
                                          </span>
                                        )}
                                        {event.confidence !== undefined && (
                                          <span>
                                            confidence{" "}
                                            {(event.confidence * 100).toFixed(
                                              0,
                                            )}
                                            %
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                    <div>{formatTime(event.timestamp)}</div>
                                    {event.retentionPolicy && (
                                      <div className="mt-1">
                                        {event.retentionPolicy}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void recordCorrectionRequest({
                                        action: "mark_wrong",
                                        targetType: "memory_event",
                                        targetId: event.id,
                                        targetSummary: event.summary,
                                        reason:
                                          "Admin marked this memory event as wrong for review.",
                                        source: "admin_memory_events",
                                        bookId: event.bookId,
                                        conversationId: event.conversationId,
                                        conceptId: event.conceptId,
                                        relatedEventIds: [event.id],
                                        metadata: {
                                          eventType: event.eventType,
                                          eventStatus: event.status,
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                                  >
                                    <Flag size={12} />
                                    Mark wrong
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void recordCorrectionRequest({
                                        action: "delete_request",
                                        targetType: "memory_event",
                                        targetId: event.id,
                                        targetSummary: event.summary,
                                        reason:
                                          "Admin requested deletion review for this memory event.",
                                        source: "admin_memory_events",
                                        bookId: event.bookId,
                                        conversationId: event.conversationId,
                                        conceptId: event.conceptId,
                                        relatedEventIds: [event.id],
                                        metadata: {
                                          eventType: event.eventType,
                                          eventStatus: event.status,
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                                  >
                                    <Trash2 size={12} />
                                    Request deletion
                                  </button>
                                </div>
                                {(event.sourceIds?.length ||
                                  event.metadata) && (
                                  <details className="group mt-3">
                                    <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                      <ChevronRight
                                        size={14}
                                        className="transition-transform group-open:rotate-90"
                                      />
                                      Source ids and metadata
                                    </summary>
                                    <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                      {JSON.stringify(
                                        {
                                          sourceIds: event.sourceIds,
                                          metadata: event.metadata,
                                        },
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </details>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Event mix
                          </h3>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Object.keys(memoryEventsByType).length === 0 ? (
                              <span className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                                Waiting for memory writes.
                              </span>
                            ) : (
                              Object.entries(memoryEventsByType).map(
                                ([type, count]) => (
                                  <span
                                    key={type}
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                                  >
                                    {type.replace(/_/g, " ")}: {count}
                                  </span>
                                ),
                              )
                            )}
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Latest context
                          </h3>
                          <div className="mt-4 space-y-2">
                            {[
                              [
                                "Latest source",
                                latestMemoryEvent?.source || "none",
                              ],
                              [
                                "Latest status",
                                latestMemoryEvent?.status || "waiting",
                              ],
                              [
                                "Retention",
                                latestMemoryEvent?.retentionPolicy ||
                                  "local_indexeddb",
                              ],
                              [
                                "Active book",
                                latestMemoryEvent?.bookId ||
                                  activeLearningBookId ||
                                  "none",
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
                            Boundary
                          </h3>
                          <div className="mt-4 grid gap-2 text-sm text-zinc-600 font-serif">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              Memory Events describe the user-facing learner
                              brain runtime.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              Graphify remains the separate code architecture
                              graph for agents.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              AWS/cloud synchronization is still deferred until
                              beta testing.
                            </div>
                          </div>
                        </section>
                      </div>
                    </section>
                  </div>
                ) : activeTab === "corrections" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <Flag size={13} /> Local Memory Control
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Correction and deletion request ledger
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            Append-only local requests for marking learner-brain
                            records wrong, requesting deletion review, or
                            flagging entries that need a human correction pass.
                            This gives beta users a visible control path before
                            destructive propagation is automated.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                          <div className="text-2xl font-semibold text-zinc-900">
                            {correctionEventCount}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Requests
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        {[
                          ["Open", openCorrectionEvents],
                          ["Applied", appliedCorrectionEvents],
                          ["Blocked", blockedCorrectionEvents],
                          ["Marked wrong", markWrongCorrectionEvents],
                          ["Deletion review", deleteRequestCorrectionEvents],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 truncate text-lg font-semibold tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Recent correction requests
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Newest first. Memory rows can create these
                              requests directly; manual entries can target any
                              local learner-brain record.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(latestCorrectionEvent?.timestamp)}
                          </div>
                        </div>

                        {correctionEvents.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No correction requests yet. Use Memory Events to
                            mark a local memory write wrong or request deletion
                            review.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {correctionEvents.map((event, index) => (
                              <article
                                key={event.id}
                                className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="flex min-w-0 gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600">
                                      <Flag size={17} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                          {event.action.replace(/_/g, " ")}
                                        </h4>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(event.status)}`}
                                        >
                                          {event.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600 font-serif">
                                        {event.reason}
                                      </p>
                                      {event.targetSummary && (
                                        <p className="mt-2 line-clamp-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed text-zinc-500 font-serif">
                                          {event.targetSummary}
                                        </p>
                                      )}
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                        <span>{event.targetType}</span>
                                        <span className="max-w-[12rem] truncate">
                                          target {event.targetId}
                                        </span>
                                        {event.bookId && (
                                          <span className="max-w-[10rem] truncate">
                                            book {event.bookId}
                                          </span>
                                        )}
                                        {event.conceptId && (
                                          <span className="max-w-[10rem] truncate">
                                            concept {event.conceptId}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                    <div>{formatTime(event.timestamp)}</div>
                                    <div className="mt-1">{event.source}</div>
                                  </div>
                                </div>
                                {(event.relatedEventIds?.length ||
                                  event.metadata) && (
                                  <details className="group mt-3">
                                    <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                      <ChevronRight
                                        size={14}
                                        className="transition-transform group-open:rotate-90"
                                      />
                                      Related ids and metadata
                                    </summary>
                                    <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                      {JSON.stringify(
                                        {
                                          relatedEventIds:
                                            event.relatedEventIds,
                                          metadata: event.metadata,
                                        },
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </details>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Manual request
                          </h3>
                          <form
                            className="mt-4 grid gap-3"
                            onSubmit={submitManualCorrection}
                          >
                            <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                              Action
                              <select
                                value={correctionAction}
                                onChange={(event) =>
                                  setCorrectionAction(
                                    event.target
                                      .value as CorrectionEvent["action"],
                                  )
                                }
                                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-300 focus:bg-white"
                              >
                                <option value="mark_wrong">Mark wrong</option>
                                <option value="delete_request">
                                  Request deletion review
                                </option>
                                <option value="supersede">Supersede</option>
                                <option value="review">Review</option>
                              </select>
                            </label>
                            <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                              Target type
                              <select
                                value={correctionTargetType}
                                onChange={(event) =>
                                  setCorrectionTargetType(
                                    event.target
                                      .value as CorrectionEvent["targetType"],
                                  )
                                }
                                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-300 focus:bg-white"
                              >
                                <option value="memory_event">
                                  Memory event
                                </option>
                                <option value="retrieval_event">
                                  Retrieval event
                                </option>
                                <option value="evidence_event">
                                  Evidence event
                                </option>
                                <option value="mastery_delta">
                                  Mastery delta
                                </option>
                                <option value="model_run">Model run</option>
                                <option value="tool_job">Tool job</option>
                                <option value="artifact_record">
                                  Artifact record
                                </option>
                                <option value="citation_state">
                                  Citation state
                                </option>
                                <option value="concept">Concept</option>
                                <option value="interaction">Interaction</option>
                                <option value="learning_book">
                                  Learning book
                                </option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                            <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                              Target id
                              <input
                                value={correctionTargetId}
                                onChange={(event) =>
                                  setCorrectionTargetId(event.target.value)
                                }
                                placeholder="Paste a local event, concept, or book id"
                                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-300 focus:bg-white"
                              />
                            </label>
                            <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                              Reason
                              <textarea
                                value={correctionReason}
                                onChange={(event) =>
                                  setCorrectionReason(event.target.value)
                                }
                                placeholder="What is wrong, stale, sensitive, or ready for deletion review?"
                                className="min-h-24 resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-300 focus:bg-white"
                              />
                            </label>
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <Flag size={14} />
                              Record request
                            </button>
                          </form>
                          {(correctionFeedback || correctionError) && (
                            <p
                              className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                                correctionError
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-green-200 bg-green-50 text-green-700"
                              }`}
                            >
                              {correctionError || correctionFeedback}
                            </p>
                          )}
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Target mix
                          </h3>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Object.keys(correctionEventsByTarget).length ===
                            0 ? (
                              <span className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                                Waiting for correction requests.
                              </span>
                            ) : (
                              Object.entries(correctionEventsByTarget).map(
                                ([targetType, count]) => (
                                  <span
                                    key={targetType}
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                                  >
                                    {targetType.replace(/_/g, " ")}: {count}
                                  </span>
                                ),
                              )
                            )}
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Boundary
                          </h3>
                          <div className="mt-4 grid gap-2 text-sm text-zinc-600 font-serif">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              This phase records correction and deletion
                              requests; it does not destructively delete learner
                              data.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              Later propagation must mark derived summaries,
                              embeddings, graph facts, and mastery deltas as
                              superseded where practical.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              AWS/cloud synchronization remains deferred until
                              beta testing.
                            </div>
                          </div>
                        </section>
                      </div>
                    </section>
                  </div>
                ) : activeTab === "artifacts" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <BookOpen size={13} /> Local Source Grounding
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Artifact and citation state ledger
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            Durable local records for source cards and citation
                            states captured from chat web-search streams. Source
                            cards can be ready while their citations remain
                            checking; this tab intentionally avoids claiming
                            verification until a later verifier writes that
                            state.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                          <div className="text-2xl font-semibold text-zinc-900">
                            {artifactRecordCount}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Artifacts
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        {[
                          ["Source cards", sourceCardArtifacts],
                          ["Ready artifacts", readyArtifactRecords],
                          ["Checking", checkingCitationStates],
                          ["Unavailable", unavailableCitationStates],
                          ["Verified", verifiedCitationStates],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 truncate text-lg font-semibold tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Recent source artifacts
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Newest first. These rows are captured locally from
                              chat source streams and can be reviewed before
                              they influence generated artifacts.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(latestArtifactRecord?.timestamp)}
                          </div>
                        </div>

                        {artifactRecords.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No source artifacts yet. A chat web-search result or
                            final source list will persist source-card artifacts
                            here.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {artifactRecords.map((record, index) => (
                              <article
                                key={record.id}
                                className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="flex min-w-0 gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600">
                                      <BookOpen size={17} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                          {record.title}
                                        </h4>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(record.status)}`}
                                        >
                                          {record.status}
                                        </span>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(record.verificationState)}`}
                                        >
                                          {record.verificationState.replace(
                                            /_/g,
                                            " ",
                                          )}
                                        </span>
                                      </div>
                                      {record.summary && (
                                        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-600 font-serif">
                                          {record.summary}
                                        </p>
                                      )}
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                        <span>{record.artifactType}</span>
                                        <span>{record.source}</span>
                                        {record.domain && (
                                          <span>{record.domain}</span>
                                        )}
                                        {record.searchId && (
                                          <span className="max-w-[10rem] truncate">
                                            search {record.searchId}
                                          </span>
                                        )}
                                        {record.bookId && (
                                          <span className="max-w-[10rem] truncate">
                                            book {record.bookId}
                                          </span>
                                        )}
                                        {record.citationStateIds.length > 0 && (
                                          <span>
                                            {record.citationStateIds.length}{" "}
                                            citation states
                                          </span>
                                        )}
                                      </div>
                                      {record.url && (
                                        <a
                                          href={record.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-2 block max-w-full truncate text-xs font-semibold text-blue-600 no-underline hover:text-blue-800"
                                        >
                                          {record.url}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                    {formatTime(record.timestamp)}
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void recordCorrectionRequest({
                                        action: "review",
                                        targetType: "artifact_record",
                                        targetId: record.id,
                                        targetSummary:
                                          record.summary || record.title,
                                        reason:
                                          "Admin requested source artifact review.",
                                        source: "admin_source_artifacts",
                                        bookId: record.bookId,
                                        conversationId: record.conversationId,
                                        conceptId: record.conceptId,
                                        relatedEventIds: [record.id],
                                        metadata: {
                                          artifactType: record.artifactType,
                                          status: record.status,
                                          verificationState:
                                            record.verificationState,
                                          url: record.url,
                                        },
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                                  >
                                    <Flag size={12} />
                                    Request review
                                  </button>
                                </div>

                                {(record.sourceIds.length ||
                                  record.citationStateIds.length ||
                                  record.metadata) && (
                                  <details className="group mt-3">
                                    <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                      <ChevronRight
                                        size={14}
                                        className="transition-transform group-open:rotate-90"
                                      />
                                      Source ids, citation ids, and metadata
                                    </summary>
                                    <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                      {JSON.stringify(
                                        {
                                          sourceIds: record.sourceIds,
                                          citationStateIds:
                                            record.citationStateIds,
                                          metadata: record.metadata,
                                        },
                                        null,
                                        2,
                                      )}
                                    </pre>
                                  </details>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-serif font-medium text-zinc-900">
                                Citation states
                              </h3>
                              <p className="mt-1 text-sm text-zinc-500 font-serif">
                                State machine rows for source-card claims and
                                search failures.
                              </p>
                            </div>
                            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                              {formatTime(latestCitationState?.timestamp)}
                            </div>
                          </div>

                          {citationStates.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                              No citation states yet. Source capture writes
                              checking states; source failures write unavailable
                              states.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {citationStates.map((state, index) => (
                                <article
                                  key={state.id}
                                  className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                          {state.title || state.sourceRef}
                                        </h4>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(state.state)}`}
                                        >
                                          {state.state.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                      {state.failureReason && (
                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-orange-700 font-serif">
                                          {state.failureReason}
                                        </p>
                                      )}
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                        <span>{state.verifier}</span>
                                        {state.domain && (
                                          <span>{state.domain}</span>
                                        )}
                                        {state.artifactId && (
                                          <span className="max-w-[10rem] truncate">
                                            artifact {state.artifactId}
                                          </span>
                                        )}
                                        {state.checkedAt !== undefined && (
                                          <span>
                                            checked{" "}
                                            {formatTime(state.checkedAt)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                      {formatTime(state.timestamp)}
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void recordCorrectionRequest({
                                          action: "review",
                                          targetType: "citation_state",
                                          targetId: state.id,
                                          targetSummary:
                                            state.failureReason ||
                                            state.title ||
                                            state.sourceRef,
                                          reason:
                                            "Admin requested citation-state review.",
                                          source: "admin_citation_states",
                                          relatedEventIds: [state.id],
                                          metadata: {
                                            state: state.state,
                                            sourceRef: state.sourceRef,
                                            url: state.url,
                                            artifactId: state.artifactId,
                                          },
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                                    >
                                      <Flag size={12} />
                                      Request review
                                    </button>
                                  </div>
                                  {(state.metadata || state.url) && (
                                    <details className="group mt-3">
                                      <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                        <ChevronRight
                                          size={14}
                                          className="transition-transform group-open:rotate-90"
                                        />
                                        Source ref and metadata
                                      </summary>
                                      <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                        {JSON.stringify(
                                          {
                                            claimId: state.claimId,
                                            sourceRef: state.sourceRef,
                                            url: state.url,
                                            metadata: state.metadata,
                                          },
                                          null,
                                          2,
                                        )}
                                      </pre>
                                    </details>
                                  )}
                                </article>
                              ))}
                            </div>
                          )}
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            State mix
                          </h3>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Object.keys(citationStatesByState).length === 0 ? (
                              <span className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                                Waiting for citation states.
                              </span>
                            ) : (
                              Object.entries(citationStatesByState).map(
                                ([state, count]) => (
                                  <span
                                    key={state}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(state)}`}
                                  >
                                    {state.replace(/_/g, " ")}: {count}
                                  </span>
                                ),
                              )
                            )}
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Artifact mix
                          </h3>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {Object.keys(artifactRecordsByType).length === 0 ? (
                              <span className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                                Waiting for source artifacts.
                              </span>
                            ) : (
                              Object.entries(artifactRecordsByType).map(
                                ([type, count]) => (
                                  <span
                                    key={type}
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                                  >
                                    {type.replace(/_/g, " ")}: {count}
                                  </span>
                                ),
                              )
                            )}
                          </div>
                        </section>

                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Boundary
                          </h3>
                          <div className="mt-4 grid gap-2 text-sm text-zinc-600 font-serif">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              Source artifacts describe captured source cards,
                              generated artifacts, and citation state, not
                              learner concept mastery.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              A checking citation is not a verified citation.
                              Verification must be written by a future verifier
                              before Tutor can claim it.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              AWS/cloud synchronization remains deferred until
                              beta testing.
                            </div>
                          </div>
                        </section>
                      </div>
                    </section>
                  </div>
                ) : activeTab === "retrieval" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <Search size={13} /> Semantic Memory Retrieval
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Retrieval context ledger
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            Local records for semantic memory retrieval: query
                            summaries, active-book filters, selected concepts,
                            selected interactions, context size, latency, and
                            failures. This shows what Tutor put into the chat
                            context before a model request.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                          <div className="text-2xl font-semibold text-zinc-900">
                            {retrievalEventCount}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            Durable retrievals
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        {[
                          ["Completed", completedRetrievalEvents],
                          ["Failed", failedRetrievalEvents],
                          [
                            "Context chars",
                            latestRetrievalEvent?.contextChars || 0,
                          ],
                          [
                            "Selected concepts",
                            latestRetrievalEvent?.selectedConceptIds.length ||
                              0,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 truncate text-lg font-semibold tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-serif font-medium text-zinc-900">
                              Recent retrievals
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 font-serif">
                              Newest first. These rows explain which memory
                              candidates were available and which ones were
                              injected into Tutor's request context.
                            </p>
                          </div>
                          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                            {formatTime(latestRetrievalEvent?.timestamp)}
                          </div>
                        </div>

                        {retrievalEvents.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
                            No retrieval records yet. Send a chat message and
                            Tutor will persist the memory context selection
                            before the model request starts.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {retrievalEvents.map((event, index) => (
                              <article
                                key={event.id}
                                className={`rounded-2xl border border-zinc-200 bg-zinc-50 p-4 ${index < 16 ? "admin-animated-item" : ""}`}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="flex min-w-0 gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600">
                                      <Search size={17} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="m-0 truncate text-sm font-semibold text-zinc-900">
                                          {event.querySummary}
                                        </h4>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(event.status)}`}
                                        >
                                          {event.status}
                                        </span>
                                      </div>
                                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600 font-serif">
                                        {event.error ||
                                          `${event.selectedConceptIds.length} concepts and ${event.selectedInteractionIds.length} interactions selected from ${event.candidateConceptCount} concepts and ${event.candidateInteractionCount} interactions.`}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                        <span>{event.source}</span>
                                        {event.activeBookId && (
                                          <span className="max-w-[10rem] truncate">
                                            book {event.activeBookId}
                                          </span>
                                        )}
                                        {event.durationMs !== undefined && (
                                          <span>{event.durationMs}ms</span>
                                        )}
                                        <span>
                                          context {event.contextChars} chars
                                        </span>
                                        {event.topConceptScore !==
                                          undefined && (
                                          <span>
                                            top concept{" "}
                                            {event.topConceptScore.toFixed(2)}
                                          </span>
                                        )}
                                        {event.topInteractionScore !==
                                          undefined && (
                                          <span>
                                            top interaction{" "}
                                            {event.topInteractionScore.toFixed(
                                              2,
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      {event.selectedConceptNames.length >
                                        0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {event.selectedConceptNames.map(
                                            (name) => (
                                              <span
                                                key={`${event.id}-${name}`}
                                                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                                              >
                                                {name}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right text-[10px] font-mono text-zinc-500">
                                    <div>{formatTime(event.timestamp)}</div>
                                    {event.pageNumber !== undefined && (
                                      <div className="mt-1">
                                        page {event.pageNumber}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <details className="group mt-3">
                                  <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800">
                                    <ChevronRight
                                      size={14}
                                      className="transition-transform group-open:rotate-90"
                                    />
                                    Selected ids and metadata
                                  </summary>
                                  <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-600 shadow-inner">
                                    {JSON.stringify(
                                      {
                                        selectedConceptIds:
                                          event.selectedConceptIds,
                                        selectedInteractionIds:
                                          event.selectedInteractionIds,
                                        tutorInstructionChars:
                                          event.tutorInstructionChars,
                                        metadata: event.metadata,
                                      },
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </details>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                          <h3 className="text-xl font-serif font-medium text-zinc-900">
                            Retrieval meters
                          </h3>
                          <div className="mt-4 space-y-2">
                            {[
                              ["Total context chars", retrievalContextChars],
                              ["Selected concepts", retrievalSelectedConcepts],
                              [
                                "Latest status",
                                latestRetrievalEvent?.status || "waiting",
                              ],
                              [
                                "Latest source",
                                latestRetrievalEvent?.source || "none",
                              ],
                              [
                                "Active book",
                                latestRetrievalEvent?.activeBookId ||
                                  activeLearningBookId ||
                                  "none",
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
                            Boundary
                          </h3>
                          <div className="mt-4 grid gap-2 text-sm text-zinc-600 font-serif">
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              Retrieval Events describe local semantic memory
                              context selection, not web search results.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              Model-run rows still show how much memory context
                              was sent to the provider.
                            </div>
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                              AWS/cloud synchronization remains deferred until
                              beta testing.
                            </div>
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
                            Durable local rows from chat-stream tool execution,
                            plus the schema for future retries and dead-letter
                            review.
                          </p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-mono text-zinc-500">
                          {formatTime(latestToolJob?.timestamp)}
                        </div>
                      </div>

                      {toolJobs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                          No durable tool jobs yet. Ask the tutor to use web
                          search, inspect a page, update the graph, or generate
                          flashcards and the chat stream will persist tool
                          execution rows here.
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
                                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-500">
                                    {job.requestId && (
                                      <span className="max-w-[9rem] truncate">
                                        {job.requestId}
                                      </span>
                                    )}
                                    {job.durationMs !== undefined && (
                                      <span>{job.durationMs}ms</span>
                                    )}
                                    {job.source && <span>{job.source}</span>}
                                    {job.model && (
                                      <span className="max-w-[9rem] truncate">
                                        {job.model}
                                      </span>
                                    )}
                                  </div>
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
                ) : activeTab === "tuning" ? (
                  <div className="flex flex-col gap-8 font-sans">
                    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-500/70">
                            <SlidersHorizontal size={13} /> Local Runtime
                            Controls
                          </div>
                          <h2 className="mt-2 text-2xl font-serif font-medium text-zinc-900">
                            Tune the learner-brain runtime
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 font-serif">
                            These controls are stored locally and sent with chat
                            requests. They tune source-vs-web behavior, model
                            tool loops, memory context size, and Admin polling
                            without touching AWS or cloud deployment paths.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={resetBrainRuntimeSettings}
                          disabled={runtimeSettingsAreDefault}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <RotateCcw size={13} />
                          Reset defaults
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        {[
                          [
                            "Web Policy",
                            brainRuntimeSettings.webSearchPolicy.replace(
                              /_/g,
                              " ",
                            ),
                          ],
                          [
                            "Tool Loops",
                            brainRuntimeSettings.toolIterationLimit,
                          ],
                          [
                            "Memory Concepts",
                            brainRuntimeSettings.memoryConceptLimit,
                          ],
                          [
                            "Admin Refresh",
                            `${Math.round(brainRuntimeSettings.activityRefreshMs / 1000)}s`,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                              {label}
                            </div>
                            <div className="mt-2 truncate text-lg font-semibold capitalize tabular-nums text-zinc-900">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xl font-serif font-medium text-zinc-900">
                          Web and source policy
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-500 font-serif">
                          Controls when Tutor is allowed to leave the local
                          reading context for live web retrieval.
                        </p>
                        <div className="mt-4 grid gap-3">
                          {webSearchPolicyOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                updateRuntimeSetting(
                                  "webSearchPolicy",
                                  option.id,
                                )
                              }
                              className={`rounded-2xl border p-4 text-left transition-colors ${
                                brainRuntimeSettings.webSearchPolicy ===
                                option.id
                                  ? "border-blue-200 bg-blue-50 text-blue-900 shadow-sm"
                                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white"
                              }`}
                            >
                              <div className="text-sm font-semibold">
                                {option.label}
                              </div>
                              <div className="mt-1 text-xs leading-relaxed text-zinc-500 font-serif">
                                {option.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xl font-serif font-medium text-zinc-900">
                          Runtime budgets
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-500 font-serif">
                          Bounded local budgets keep tool calls and retrieved
                          concepts inspectable while preserving the tutor's
                          default behavior.
                        </p>

                        <div className="mt-5 space-y-5">
                          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                                Tool iteration limit
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-zinc-900">
                                {brainRuntimeSettings.toolIterationLimit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={
                                BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit
                                  .min
                              }
                              max={
                                BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit
                                  .max
                              }
                              step={
                                BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit
                                  .step
                              }
                              value={brainRuntimeSettings.toolIterationLimit}
                              onChange={(event) =>
                                updateRuntimeSetting(
                                  "toolIterationLimit",
                                  Number(event.currentTarget.value),
                                )
                              }
                              className="mt-3 w-full accent-blue-600"
                            />
                            <div className="mt-2 text-xs text-zinc-500 font-serif">
                              Sent to the server as the maximum model/tool
                              follow-up loop for a chat request.
                            </div>
                          </label>

                          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                                Memory concept limit
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-zinc-900">
                                {brainRuntimeSettings.memoryConceptLimit}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={
                                BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit
                                  .min
                              }
                              max={
                                BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit
                                  .max
                              }
                              step={
                                BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit
                                  .step
                              }
                              value={brainRuntimeSettings.memoryConceptLimit}
                              onChange={(event) =>
                                updateRuntimeSetting(
                                  "memoryConceptLimit",
                                  Number(event.currentTarget.value),
                                )
                              }
                              className="mt-3 w-full accent-blue-600"
                            />
                            <div className="mt-2 text-xs text-zinc-500 font-serif">
                              Controls how many active-book concepts ChatPanel
                              includes in local memory context.
                            </div>
                          </label>

                          <label className="block rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                                Activity refresh
                              </span>
                              <span className="text-sm font-semibold tabular-nums text-zinc-900">
                                {Math.round(
                                  brainRuntimeSettings.activityRefreshMs / 1000,
                                )}
                                s
                              </span>
                            </div>
                            <input
                              type="range"
                              min={
                                BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs
                                  .min
                              }
                              max={
                                BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs
                                  .max
                              }
                              step={
                                BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs
                                  .step
                              }
                              value={brainRuntimeSettings.activityRefreshMs}
                              onChange={(event) =>
                                updateRuntimeSetting(
                                  "activityRefreshMs",
                                  Number(event.currentTarget.value),
                                )
                              }
                              className="mt-3 w-full accent-blue-600"
                            />
                            <div className="mt-2 text-xs text-zinc-500 font-serif">
                              Controls the System Activity polling interval in
                              this Admin session.
                            </div>
                          </label>
                        </div>
                      </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xl font-serif font-medium text-zinc-900">
                          Model behavior context
                        </h3>
                        <div className="mt-4 space-y-2">
                          {[
                            ["Current model", aiModel],
                            [
                              "System prompt",
                              systemPrompt ? "custom prompt active" : "default",
                            ],
                            [
                              "Search policy",
                              brainRuntimeSettings.webSearchPolicy,
                            ],
                            [
                              "Settings source",
                              "localStorage brain_runtime_settings",
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
                      </div>

                      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xl font-serif font-medium text-zinc-900">
                          Local-only contract
                        </h3>
                        <div className="mt-4 grid gap-2 text-sm text-zinc-600 font-serif">
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            Runtime settings are persisted in the browser and
                            included in `/api/chat` request metadata.
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            The server normalizes bounds before applying tool
                            iteration and web-search policy controls.
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                            AWS/cloud rollout remains deferred; this is a local
                            beta tuning surface.
                          </div>
                        </div>
                      </div>
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
