import React, { useCallback, useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShikiHighlighter } from "./ShikiHighlighter";
import {
  PendingIcon,
  ProgressIcon,
  SubmittedIcon,
  ReviewIcon,
  SuccessIcon,
  ExpiredIcon,
  StatusBadge,
} from "./StatusBadge";
import {
  ArrowUp,
  Sparkles,
  Network,
  BookOpen,
  Layers,
  X,
  Check,
  Folder,
  ChevronDown,
  Volume2,
  Square,
  Zap,
  Mic,
  Activity,
  Plus,
  Minus,
  LoaderCircle,
  RotateCcw,
  Globe2,
  ExternalLink,
  Brain,
  Search,
  FileCode2,
  Copy,
  Play,
  Terminal,
  Image as ImageIcon,
  Code2,
  Workflow,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { audio } from "../lib/audio";
import { SiriLiquidGlass } from "./SiriLiquidGlass";
import { useStore, type NormalizedWebSource } from "../store";
import { brainOrchestrator } from "../memory/memory.orchestrator";
import { db } from "../memory/longterm.memory";
import type { Message } from "../types";
import { FloatingSkillsMenu } from "./FloatingSkillsMenu";
import { recordBrainRuntime } from "../brain-runtime/runtimeTelemetry";

type MermaidApi = typeof import("mermaid").default;

let mermaidPromise: Promise<MermaidApi> | null = null;

const loadMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((module) => {
      const mermaid = module.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
        fontFamily: "Inter, sans-serif",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
};

const Mermaid = ({ chart }: { chart: string }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!chartRef.current) return;
    chartRef.current.textContent = "";

    loadMermaid()
      .then((mermaid) =>
        mermaid.render(
          `mermaid-${Math.random().toString(36).substring(7)}`,
          chart,
        ),
      )
      .then((res) => {
        if (!cancelled && chartRef.current)
          chartRef.current.innerHTML = res.svg;
      })
      .catch((error) => {
        console.warn("Mermaid error", error);
        if (!cancelled && chartRef.current) {
          chartRef.current.textContent =
            error instanceof Error ? error.message : String(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div
      ref={chartRef}
      className="my-4 flex justify-center bg-white/5 rounded-xl p-4 overflow-x-auto w-full"
    />
  );
};

type DiagramStep = { nodeIds: string[]; caption: string };
type VoiceDiagramData = {
  title?: string;
  mermaid: string;
  steps: DiagramStep[];
};
type VoiceImageData = {
  url: string;
  caption?: string;
  query: string;
};
type VoiceImageSeqData = {
  items: { url: string; caption: string; query: string }[];
};

const languageLabels: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  json: "JSON",
  bash: "Shell",
  sh: "Shell",
  html: "HTML",
  css: "CSS",
};

const languageExtensions: Record<string, string> = {
  js: "js",
  javascript: "js",
  ts: "ts",
  typescript: "ts",
  py: "py",
  python: "py",
  json: "json",
  bash: "sh",
  sh: "sh",
  html: "html",
  css: "css",
};

const codeLanguageLabel = (language: string) =>
  languageLabels[language] ||
  (language ? language.charAt(0).toUpperCase() + language.slice(1) : "Text");
const codeFileName = (language: string) =>
  `snippet.${languageExtensions[language] || language || "txt"}`;

const PremiumCodeShell = ({
  language,
  code,
  runnable,
  running = false,
  onRun,
  children,
  output,
  outputTone = "default",
}: {
  language: string;
  code: string;
  runnable?: boolean;
  running?: boolean;
  onRun?: () => void;
  children: React.ReactNode;
  output?: string | null;
  outputTone?: "default" | "error";
}) => {
  const [copied, setCopied] = useState(false);
  const label = codeLanguageLabel(language);

  const copyCode = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      className="not-prose my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#050505] text-zinc-100 shadow-[0_18px_54px_rgba(0,0,0,0.22)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#18181a] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-400">
            <FileCode2 size={15} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-mono text-[13px] text-zinc-300">
              {codeFileName(language)}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Executable block
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] font-medium text-zinc-400 sm:inline-flex">
            {label}
          </span>
          {runnable && (
            <button
              type="button"
              onClick={onRun}
              disabled={running}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#ff6e00]/20 bg-[#ff6e00]/10 px-3 text-[12px] font-semibold text-[#ffb066] transition-colors hover:bg-[#ff6e00]/16 disabled:cursor-wait disabled:opacity-60"
            >
              {running ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
              {running ? "Running" : "Run"}
            </button>
          )}
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white"
            aria-label="Copy code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff6e00]/60 to-transparent" />
        {children}
      </div>
      <AnimatePresence>
        {output !== undefined && output !== null && (
          <motion.div
            data-reasoning-steps
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#0c0c0d]"
          >
            <div className="px-4 py-3 font-mono">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                <Terminal size={13} />
                Console output
              </div>
              <pre
                className={`whitespace-pre-wrap text-[12px] leading-relaxed ${outputTone === "error" ? "text-red-300" : "text-zinc-300"}`}
              >
                {output}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const RunnableJS = ({ code }: { code: string }) => {
  const [output, setOutput] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const runCode = () => {
    setIsRunning(true);
    setHasError(false);
    const logs: any[] = [];
    const customConsole = {
      log: (...args: any[]) => logs.push(args.join(" ")),
      error: (...args: any[]) => logs.push("ERROR: " + args.join(" ")),
      warn: (...args: any[]) => logs.push("WARN: " + args.join(" ")),
    };
    try {
      const func = new Function("console", code);
      func(customConsole);
      setOutput(logs.join("\\n") || "Executed without console output.");
    } catch (e: any) {
      setHasError(true);
      setOutput(e.toString());
    } finally {
      window.setTimeout(() => setIsRunning(false), 260);
    }
  };

  return (
    <PremiumCodeShell
      language="javascript"
      code={code}
      runnable
      running={isRunning}
      onRun={runCode}
      output={output}
      outputTone={hasError ? "error" : "default"}
    >
      <ShikiHighlighter language="javascript" code={code} embedded />
    </PremiumCodeShell>
  );
};

const RunnablePython = ({ code }: { code: string }) => {
  const [output, setOutput] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const runPython = async () => {
    setIsRunning(true);
    setOutput(null);
    setHasError(false);
    try {
      if (!(window as any).loadPyodide) {
        if (!(window as any).pyodideLoadingPromise) {
          (window as any).pyodideLoadingPromise = new Promise<void>(
            (resolve, reject) => {
              const script = document.createElement("script");
              script.src =
                "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
              script.onload = () => resolve();
              script.onerror = reject;
              document.head.appendChild(script);
            },
          );
        }
        await (window as any).pyodideLoadingPromise;
      }

      if (!(window as any).pyodide) {
        (window as any).pyodide = await (window as any).loadPyodide({});
      }

      const pyodide = (window as any).pyodide;

      // Setup stdout/stderr capturing and window.prompt for input
      await pyodide.runPythonAsync(`
import sys
import io
import js
import builtins
import asyncio
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
def custom_input(prompt=""):
    return js.prompt(prompt) or ""
builtins.input = custom_input

# Monkey-patch asyncio.run to just run in the current loop if needed, or we'll regex replace it.
`);

      let processedCode = code;
      // Pyodide's runPythonAsync is already in an event loop, so asyncio.run will fail.
      // We replace asyncio.run(...) with await ...
      processedCode = processedCode.replace(
        /asyncio\.run\(([\s\S]*?)\)/g,
        "await $1",
      );

      await pyodide.runPythonAsync(processedCode);
      const out = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      const err = await pyodide.runPythonAsync("sys.stderr.getvalue()");

      if (out || err) {
        setOutput((out + "\\n" + err).trim());
      } else {
        setOutput("Executed successfully.");
      }
    } catch (e: any) {
      setHasError(true);
      setOutput(e.message || e.toString());
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <PremiumCodeShell
      language="python"
      code={code}
      runnable
      running={isRunning}
      onRun={runPython}
      output={output}
      outputTone={hasError ? "error" : "default"}
    >
      <ShikiHighlighter language="python" code={code} embedded />
    </PremiumCodeShell>
  );
};

const InteractiveCodeBlock = React.memo(
  ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    const code = String(children).replace(/\n$/, "");

    if (!inline && language === "mermaid") {
      return <Mermaid chart={code} />;
    }

    // Interactive runnable JS
    if (!inline && language === "javascript") {
      return <RunnableJS code={code} />;
    }

    // Interactive runnable Python
    if (!inline && (language === "python" || language === "py")) {
      return <RunnablePython code={code} />;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {!inline && match ? (
          <PremiumCodeShell language={language} code={code}>
            <ShikiHighlighter language={language} code={code} embedded />
          </PremiumCodeShell>
        ) : (
          <code
            className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[0.85em]"
            {...props}
          >
            {children}
          </code>
        )}
      </motion.div>
    );
  },
);

const INITIAL_MESSAGE = `**Hello. I'm your AI Tutor.**

I'm ready to help you explore concepts, discuss code, and break down complex subjects. Here are a few things we can do:
- **Analyze Documents:** Upload a PDF and ask me questions about specific pages.
- **Discuss Code:** Paste code snippets and we can debug or refactor them.
- **Learn Concepts:** Ask me general programming and computer science questions.

What would you like to learn today?`;

// ─── Smooth animated counter ──────────────────────────────────────────────────
function useAnimatedNumber(target: number, duration = 600): number {
  const [displayed, setDisplayed] = useState(target);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "$0.00";
  // Always 2 decimal places, no trailing dots
  return `$${value.toFixed(2)}`;
};

const formatCount = (value: number): string => {
  const n = Math.round(value || 0);
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
};

const formatSeconds = (value: number) => {
  if (!value) return "0s";
  if (value < 60) return `${Math.round(value)}s`;
  return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
};

const compactModel = (model: string) => {
  if (!model) return "unknown";
  if (model === "deepseek/deepseek-chat") return "DeepSeek V4 Flash";
  const parts = model.split("/");
  return parts[parts.length - 1] || model;
};

const AnimatedNumberText = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.span
    animate={{ opacity: 1 }}
    transition={{ duration: 0.16, ease: "easeOut" }}
    className={`inline-block min-w-[3ch] tabular-nums ${className}`}
  >
    {children}
  </motion.span>
);

export const UsageAnalyticsStrip = () => {
  const chatUsage = useStore((state) => state.chatUsage);
  const voiceUsage = useStore((state) => state.voiceUsage);
  const webUsage = useStore((state) => state.webUsage);
  const pricing = useStore((state) => state.pricing);
  const setPricing = useStore((state) => state.setPricing);
  const resetUsageAnalytics = useStore((state) => state.resetUsageAnalytics);
  const isVoiceActive = useStore((state) => state.isVoiceActive);
  const [expanded, setExpanded] = useState(false);

  // Live-animating counters
  const animInputTokens = useAnimatedNumber(chatUsage.inputTokens, 700);
  const animOutputTokens = useAnimatedNumber(chatUsage.outputTokens, 700);
  const animTtsChars = useAnimatedNumber(voiceUsage.ttsCharacters, 700);
  const animWebRequests = useAnimatedNumber(webUsage.requests, 400);
  const animSources = useAnimatedNumber(webUsage.sourcesReviewed, 400);

  // Voice seconds: tick +1 every second while connected (approximated by checking if voiceUsage is changing)
  const [liveVoiceSec, setLiveVoiceSec] = useState(
    voiceUsage.connectionSeconds,
  );
  const liveVoiceRef = useRef(voiceUsage.connectionSeconds);

  // Sync to store value whenever it jumps significantly (more than 2 seconds difference)
  useEffect(() => {
    if (Math.abs(voiceUsage.connectionSeconds - liveVoiceRef.current) > 2) {
      setLiveVoiceSec(voiceUsage.connectionSeconds);
      liveVoiceRef.current = voiceUsage.connectionSeconds;
    }
  }, [voiceUsage.connectionSeconds]);

  // Live ticker
  useEffect(() => {
    if (!isVoiceActive) return;
    const interval = setInterval(() => {
      setLiveVoiceSec((prev) => {
        const next = prev + 1;
        liveVoiceRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVoiceActive]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pricing")
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("Pricing unavailable")),
      )
      .then((data) => {
        if (cancelled) return;
        setPricing({
          openRouterModels: data.openRouter?.models || {},
          deepgram: data.deepgram?.pricing || pricing.deepgram,
          fetchedAt:
            data.fetchedAt ||
            data.openRouter?.fetchedAt ||
            new Date().toISOString(),
          source: data.source || "server",
          stale: Boolean(data.stale),
        });
      })
      .catch(() => {
        if (!cancelled) setPricing({ ...pricing, stale: true });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chatTotal = chatUsage.inputTokens + chatUsage.outputTokens;
  const voiceBillable =
    voiceUsage.connectionSeconds + voiceUsage.ttsCharacters / 80;
  const chatWidth = `${Math.max(6, Math.min(100, (chatTotal / 1_000_000) * 100))}%`;
  const voiceWidth = `${Math.max(6, Math.min(100, (voiceBillable / 3600) * 100))}%`;
  const totalCost = chatUsage.cost + voiceUsage.cost + webUsage.cost;

  return (
    <motion.div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0a] text-[#fefefe] shadow-[0_18px_54px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_16%_0%,rgba(255,110,0,0.28),transparent_36%),radial-gradient(circle_at_90%_110%,rgba(255,255,255,0.13),transparent_38%)]" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.22) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="relative w-full px-4 py-3 text-left focus:outline-none"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-bold">
                Usage
              </div>
              <div className="text-[13px] font-semibold text-white truncate">
                {formatCurrency(totalCost)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:min-w-[390px] sm:grid-cols-3">
            {/* Chat Card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                <span>Chat</span>
                <span>{formatCurrency(chatUsage.cost)}</span>
              </div>
              <div className="mt-1 grid grid-cols-[minmax(3.5ch,auto)_auto] gap-x-1 text-[12px] font-mono text-white/85 tabular-nums">
                <div className="text-right">
                  <AnimatedNumberText>
                    {formatCount(animInputTokens)}
                  </AnimatedNumberText>
                </div>
                <span>in</span>
                <div className="text-right">
                  <AnimatedNumberText>
                    {formatCount(animOutputTokens)}
                  </AnimatedNumberText>
                </div>
                <span>out</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#ff6e00] shadow-[0_0_14px_rgba(255,110,0,0.55)]"
                  animate={{ width: chatWidth }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
            {/* Voice Card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                <span>Voice</span>
                <span>{formatCurrency(voiceUsage.cost)}</span>
              </div>
              <div className="mt-1 text-[12px] font-mono text-white/85 tabular-nums">
                <AnimatedNumberText>
                  {formatSeconds(liveVoiceSec)}
                </AnimatedNumberText>
                {" / "}
                <AnimatedNumberText>
                  {formatCount(animTtsChars)}
                </AnimatedNumberText>
                {" chars"}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.42)]"
                  animate={{ width: voiceWidth }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
            {/* Search Card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                <span>Search</span>
                <span>
                  <AnimatedNumberText>
                    {formatCount(animWebRequests)}
                  </AnimatedNumberText>{" "}
                  / 2500
                </span>
              </div>
              <div className="mt-1 text-[12px] font-mono text-white/85 tabular-nums">
                <AnimatedNumberText>
                  {formatCount(animSources)}
                </AnimatedNumberText>
                {" sources"}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white/60 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  animate={{
                    width: `${Math.max(6, Math.min(100, (webUsage.requests / 2500) * 100))}%`,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden border-t border-white/10"
          >
            <div className="grid gap-2 p-3 text-[11px] text-white/55 md:grid-cols-3">
              <div className="rounded-xl bg-white/[0.06] p-3 border border-white/10">
                <div className="font-semibold text-white mb-1">
                  Chat · OpenRouter
                </div>
                <div>
                  Model:{" "}
                  <span className="font-mono text-white/85">
                    {compactModel(chatUsage.model)}
                  </span>
                </div>
                <div>
                  Requests:{" "}
                  <AnimatedNumberText>
                    {formatCount(chatUsage.requests)}
                  </AnimatedNumberText>
                </div>
                <div>
                  Tokens:{" "}
                  <AnimatedNumberText>
                    {formatCount(animInputTokens)}
                  </AnimatedNumberText>{" "}
                  input,{" "}
                  <AnimatedNumberText>
                    {formatCount(animOutputTokens)}
                  </AnimatedNumberText>{" "}
                  output
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-3 border border-white/10">
                <div className="font-semibold text-white mb-1">
                  Voice · Deepgram
                </div>
                <div>
                  Agent:{" "}
                  <span className="font-mono text-white/85">
                    {voiceUsage.voiceAgentModel}
                  </span>
                </div>
                <div>
                  Listen/Speak: {voiceUsage.listenModel} /{" "}
                  {voiceUsage.speakModel}
                </div>
                <div>
                  TTS: {voiceUsage.ttsModel},{" "}
                  <AnimatedNumberText>
                    {formatCount(animTtsChars)}
                  </AnimatedNumberText>{" "}
                  chars
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-3 border border-white/10">
                <div className="font-semibold text-white mb-1">
                  Search · Serper
                </div>
                <div>
                  Requests:{" "}
                  <AnimatedNumberText>
                    {formatCount(animWebRequests)}
                  </AnimatedNumberText>
                </div>
                <div>
                  Search/News:{" "}
                  <AnimatedNumberText>
                    {formatCount(webUsage.searchRequests)}
                  </AnimatedNumberText>{" "}
                  /{" "}
                  <AnimatedNumberText>
                    {formatCount(webUsage.newsRequests)}
                  </AnimatedNumberText>
                </div>
                <div>
                  Sources reviewed:{" "}
                  <AnimatedNumberText>
                    {formatCount(animSources)}
                  </AnimatedNumberText>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={resetUsageAnalytics}
              className="mx-3 mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/55 hover:text-white hover:bg-white/[0.1] transition-colors"
            >
              <RotateCcw size={12} /> Reset usage
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const GeminiVoicePill = ({
  state,
}: {
  state: "listening" | "speaking" | "idle";
}) => {
  const [vol, setVol] = useState(0);

  useEffect(() => {
    if (state !== "listening") {
      setVol(0);
      return;
    }
    const handler = (e: any) => {
      setVol((prev) => prev + (e.detail - prev) * 0.3);
    };
    window.addEventListener("mic-volume", handler);
    return () => window.removeEventListener("mic-volume", handler);
  }, [state]);

  useEffect(() => {
    if (state === "speaking") {
      const interval = setInterval(() => {
        setVol(0.3 + Math.random() * 0.4);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [state]);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 50, opacity: 0, scale: 0.9 }}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center justify-center overflow-hidden rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-[#050505]/90 backdrop-blur-3xl border border-white/10 z-[100]"
      style={{
        width: state === "speaking" ? "300px" : "240px",
        height: "64px",
        transition: "width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden mix-blend-screen blur-[8px] opacity-80">
        <motion.div
          className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
          animate={{ rotate: 360 }}
          transition={{
            duration: state === "speaking" ? 3 : 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="absolute top-[10%] right-[30%] w-[40%] h-[40%] bg-[#0a84ff] rounded-full mix-blend-screen"
            animate={{ scale: 1 + vol * 1.5, x: vol * 10, y: vol * 10 }}
            transition={{ type: "spring", bounce: 0.5 }}
          />
          <motion.div
            className="absolute bottom-[30%] right-[10%] w-[45%] h-[45%] bg-[#bf5af2] rounded-full mix-blend-screen"
            animate={{ scale: 1 + vol * 1.2, x: -(vol * 10) }}
            transition={{ type: "spring", bounce: 0.5 }}
          />
          <motion.div
            className="absolute bottom-[10%] left-[30%] w-[50%] h-[50%] bg-[#ff375f] rounded-full mix-blend-screen"
            animate={{ scale: 1 + vol * 1.4, y: -(vol * 15) }}
            transition={{ type: "spring", bounce: 0.5 }}
          />
        </motion.div>
      </div>

      <div className="relative z-10 text-white font-medium tracking-wide flex items-center gap-3 bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/5 shadow-inner">
        {state === "speaking" ? (
          <>
            <Activity size={18} className="text-blue-400 animate-pulse" />
            <span>Aria is speaking...</span>
          </>
        ) : (
          <>
            <Mic size={18} className="text-emerald-400 animate-pulse" />
            <span>Listening...</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

// Builds a smooth closed SVG path through points using a Catmull-Rom spline.
const buildBlobPath = (pts: Array<[number, number]>) => {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)} `;
  }
  return d + "Z";
};

// Detects when the learner semantically signals they want to end the voice
// session (e.g. "I'm done", "stop it", "that's all", "goodbye").
const END_INTENT_PATTERNS: RegExp[] = [
  /\b(i'?m|i am|we'?re|we are)\s+(done|finished|good|all set|all done)\b/,
  /\bthat'?s?\s+(all|it|enough)\b/,
  /\bno\s+(more|further)\s+questions\b/,
  /\b(good\s?bye|bye\s?bye|bye|see\s+(you|ya)|talk\s+later|catch\s+you\s+later)\b/,
  /\b(end|close|stop|finish|exit|quit)\s+(the\s+)?(call|conversation|chat|session|audio|voice)\b/,
  /\b(end|stop|close|finish|cut|kill)\s+(it|this|that)\b/,
  /\b(let'?s|let\s+us)\s+(stop|end|finish|wrap\s+(it\s+)?up)\b/,
  /\bwrap\s+(it|this)\s+up\b/,
  /\bi\s+(have\s+to|need\s+to|gotta|got\s+to)\s+go\b/,
  /\b(thanks|thank\s+you)[,!.\s]*(that'?s\s+(all|it)|bye|good\s?bye)\b/,
];
const STOP_COMMAND =
  /^(ok(ay)?|alright|yeah|yep|cool)?[,\s]*(please\s+)?(stop( it| now| talking)?|quiet|silence|enough|that'?s\s+enough)[\s,]*(now|please)?[.!]*$/;

// Quick client-side title so the session card never shows the generic label,
// even before (or if) the AI title returns.
const deriveFallbackTitle = (
  turns: { role: "user" | "assistant"; content: string }[],
): string => {
  const first =
    turns.find((t) => t.role === "user")?.content ||
    turns[0]?.content ||
    "";
  const words = first.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length === 0) return "Voice conversation";
  let title = words.join(" ").replace(/[.,!?;:]+$/, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.length > 48 ? `${title.slice(0, 48)}…` : title;
};

const detectEndIntent = (raw: string): boolean => {
  const text = (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return false;
  if (STOP_COMMAND.test(text)) return true;
  return END_INTENT_PATTERNS.some((re) => re.test(text));
};

// An organic gradient blob whose outline morphs continuously and expands with
// the live audio level (mic input + Aria's voice).
const MorphBlob = ({ speaking }: { speaking: boolean }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const glow2Ref = useRef<SVGPathElement>(null);
  const auraRef = useRef<SVGCircleElement>(null);
  const sheenRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGPathElement>(null);
  const gradRef = useRef<SVGRadialGradientElement>(null);
  const spotARef = useRef<SVGCircleElement>(null);
  const spotBRef = useRef<SVGCircleElement>(null);
  const spotCRef = useRef<SVGCircleElement>(null);
  const micRef = useRef(0);
  const ttsRef = useRef(0);
  const levelRef = useRef(0);

  useEffect(() => {
    const onMic = (e: any) => {
      micRef.current = Math.min(1, e.detail || 0);
    };
    const onTts = (e: any) => {
      ttsRef.current = Math.min(1, e.detail || 0);
    };
    window.addEventListener("mic-volume", onMic);
    window.addEventListener("tts-volume", onTts);

    const POINTS = 12;
    const CX = 160;
    const CY = 160;
    const BASE_R = 92;
    const seeds = Array.from(
      { length: POINTS },
      (_, i) => i * 1.7 + Math.sin(i) * 2,
    );

    let raf = 0;
    const animate = (t: number) => {
      const target = Math.max(micRef.current, ttsRef.current);
      levelRef.current += (target - levelRef.current) * 0.18;
      const lvl = levelRef.current;
      const time = t / 1000;
      const amp = 0.07 + lvl * 0.28;
      const expand = 1 + lvl * 0.2;

      const pts: Array<[number, number]> = [];
      for (let i = 0; i < POINTS; i++) {
        const angle = (i / POINTS) * Math.PI * 2;
        const noise =
          Math.sin(time * 1.1 + seeds[i]) * 0.5 +
          Math.sin(time * 1.9 + seeds[i] * 1.7) * 0.3 +
          Math.sin(time * 0.6 + angle * 3) * 0.2;
        const r = BASE_R * expand * (1 + noise * amp);
        pts.push([CX + Math.cos(angle) * r, CY + Math.sin(angle) * r]);
      }
      const d = buildBlobPath(pts);
      pathRef.current?.setAttribute("d", d);
      glowRef.current?.setAttribute("d", d);
      glow2Ref.current?.setAttribute("d", d);
      sheenRef.current?.setAttribute("d", d);
      clipRef.current?.setAttribute("d", d);

      // Pulsing outer aura — the bloom that makes it glow.
      if (auraRef.current) {
        const pulse = 0.5 + Math.sin(time * 1.4) * 0.12;
        auraRef.current.setAttribute("r", `${118 * (1 + lvl * 0.28)}`);
        auraRef.current.setAttribute(
          "opacity",
          `${Math.min(1, pulse + lvl * 0.45)}`,
        );
      }

      // Continuously drift the gradient so the colors flow across the blob.
      if (gradRef.current) {
        const gx = 50 + Math.sin(time * 0.35) * 18;
        const gy = 44 + Math.cos(time * 0.45) * 15;
        gradRef.current.setAttribute("cx", `${gx}%`);
        gradRef.current.setAttribute("cy", `${gy}%`);
        gradRef.current.setAttribute("fx", `${gx + Math.sin(time * 0.7) * 9}%`);
        gradRef.current.setAttribute("fy", `${gy + Math.cos(time * 0.6) * 9}%`);
      }

      // Drift the inner glow wisps on slow lissajous orbits — the "soul" lights.
      const moveSpot = (
        el: SVGCircleElement | null,
        rx: number,
        ry: number,
        sp: number,
        ph: number,
        baseR: number,
      ) => {
        if (!el) return;
        el.setAttribute(
          "cx",
          `${CX + Math.sin(time * sp + ph) * rx + Math.sin(time * 1.3 + ph) * 6}`,
        );
        el.setAttribute(
          "cy",
          `${CY + Math.cos(time * sp * 0.85 + ph) * ry + Math.cos(time * 1.1 + ph) * 6}`,
        );
        el.setAttribute("r", `${baseR * (1 + lvl * 0.5)}`);
        el.setAttribute(
          "opacity",
          `${0.55 + Math.sin(time * 1.6 + ph) * 0.2 + lvl * 0.25}`,
        );
      };
      moveSpot(spotARef.current, 34, 28, 0.5, 0, 40);
      moveSpot(spotBRef.current, 40, 34, 0.37, 2.1, 30);
      moveSpot(spotCRef.current, 26, 38, 0.62, 4.2, 24);

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mic-volume", onMic);
      window.removeEventListener("tts-volume", onTts);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <motion.svg
      viewBox="0 0 320 320"
      className="h-[380px] w-[380px] overflow-visible"
      style={{
        filter:
          "saturate(1.2) brightness(1.06) drop-shadow(0 0 48px rgba(124,92,255,0.55)) drop-shadow(0 0 90px rgba(91,108,240,0.4))",
      }}
      animate={{ y: [0, -16, 0, 12, 0], x: [0, 8, 0, -8, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id="blob-aura">
          <stop offset="0%" stopColor="#b18cff" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#6a6cff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6a6cff" stopOpacity="0" />
        </radialGradient>
        <filter id="aura-blur" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="20" />
        </filter>
        <radialGradient ref={gradRef} id="blob-fill" cx="55%" cy="42%" r="72%">
          <stop offset="0%" stopColor="#c45cf2" />
          <stop offset="42%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#3f5bf0" />
        </radialGradient>
        <linearGradient id="blob-sheen" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#bcd4ff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Inner soul-light wisps */}
        <radialGradient id="spot-a">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="spot-b">
          <stop offset="0%" stopColor="#bfe3ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#bfe3ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="spot-c">
          <stop offset="0%" stopColor="#ffc8f5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffc8f5" stopOpacity="0" />
        </radialGradient>
        <filter id="spot-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        {/* Animated film grain */}
        <filter id="blob-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            stitchTiles="stitch"
            result="noise"
          >
            <animate
              attributeName="seed"
              values="1;2;3;4;5;6;7;8"
              dur="0.7s"
              repeatCount="indefinite"
              calcMode="discrete"
            />
          </feTurbulence>
          <feColorMatrix in="noise" type="saturate" values="0" />
        </filter>
        <clipPath id="blob-clip">
          <path ref={clipRef} />
        </clipPath>
      </defs>
      {/* Pulsing outer aura bloom */}
      <circle
        ref={auraRef}
        cx={160}
        cy={160}
        r={118}
        fill="url(#blob-aura)"
        filter="url(#aura-blur)"
      />
      {/* Wide soft halo */}
      <path
        ref={glow2Ref}
        fill="url(#blob-fill)"
        opacity={0.5}
        style={{ filter: "blur(50px)" }}
      />
      {/* Soft glow halo (blurred duplicate) */}
      <path
        ref={glowRef}
        fill="url(#blob-fill)"
        opacity={speaking ? 0.85 : 0.7}
        style={{ filter: "blur(26px)" }}
      />
      {/* Main blob body */}
      <path ref={pathRef} fill="url(#blob-fill)" />
      {/* Floating soul-light wisps, clipped to the blob */}
      <g clipPath="url(#blob-clip)" style={{ mixBlendMode: "screen" }}>
        <circle
          ref={spotBRef}
          cx={160}
          cy={160}
          r={30}
          fill="url(#spot-b)"
          filter="url(#spot-blur)"
        />
        <circle
          ref={spotCRef}
          cx={160}
          cy={160}
          r={24}
          fill="url(#spot-c)"
          filter="url(#spot-blur)"
        />
        <circle
          ref={spotARef}
          cx={160}
          cy={160}
          r={40}
          fill="url(#spot-a)"
          filter="url(#spot-blur)"
        />
      </g>
      {/* Grainy texture, clipped to the blob */}
      <g clipPath="url(#blob-clip)">
        <rect
          x="0"
          y="0"
          width="320"
          height="320"
          filter="url(#blob-grain)"
          opacity={0.28}
          style={{ mixBlendMode: "overlay" }}
        />
      </g>
      {/* Glossy top-left sheen */}
      <path
        ref={sheenRef}
        fill="url(#blob-sheen)"
        style={{ mixBlendMode: "screen" }}
      />
    </motion.svg>
  );
};

// Splits a spoken utterance into short caption chunks (~2 lines each), breaking
// on sentence boundaries so subtitles roll naturally as the audio plays.
const chunkCaption = (text: string): string[] => {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    const endsSentence = /[.!?,;:]$/.test(w);
    if (cur.length >= 13 || (endsSentence && cur.length >= 6)) {
      chunks.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur.join(" "));
  return chunks;
};

// Rolling movie-style subtitle: shows ~2 lines at a time and advances through
// the utterance at an estimated speaking pace.
const RollingSubtitle = ({
  caption,
  onChunk,
}: {
  caption: { role: "user" | "assistant"; text: string } | null;
  onChunk?: (text: string, role: "user" | "assistant" | null) => void;
}) => {
  const [display, setDisplay] = useState("");
  // Keep the latest callback without retriggering the timing effect.
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  useEffect(() => {
    const report = (text: string) =>
      onChunkRef.current?.(text, text ? caption?.role ?? null : null);
    if (!caption || !caption.text.trim()) {
      setDisplay("");
      report("");
      return;
    }
    const chunks = chunkCaption(caption.text);
    if (chunks.length === 0) {
      setDisplay("");
      report("");
      return;
    }
    let i = 0;
    setDisplay(chunks[0]);
    report(chunks[0]);
    if (chunks.length === 1) return;

    let timer: ReturnType<typeof setTimeout>;
    const durationFor = (chunk: string) =>
      Math.max(1400, chunk.split(/\s+/).length * 360);
    const advance = () => {
      i += 1;
      if (i < chunks.length) {
        setDisplay(chunks[i]);
        report(chunks[i]);
        timer = setTimeout(advance, durationFor(chunks[i]));
      }
    };
    timer = setTimeout(advance, durationFor(chunks[0]));
    return () => clearTimeout(timer);
  }, [caption?.text, caption?.role]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[15%] flex justify-center px-10">
      <AnimatePresence mode="wait">
        {display &&
          (() => {
            // Short captions ("Yes", "Great!") read poorly with the diffused
            // blur transition — keep those crisp with a simple fade.
            const isShort = display.trim().length <= 16;
            return (
              <motion.p
                key={display}
                initial={{
                  opacity: 0,
                  y: isShort ? 0 : 8,
                  filter: isShort ? "blur(0px)" : "blur(5px)",
                }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{
                  opacity: 0,
                  y: isShort ? 0 : -6,
                  filter: isShort ? "blur(0px)" : "blur(5px)",
                }}
                transition={{ duration: isShort ? 0.16 : 0.3, ease: "easeOut" }}
                className={`max-w-xl text-balance text-center text-base font-medium leading-snug ${
                  caption?.role === "assistant" ? "text-white" : "text-white/65"
                }`}
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}
              >
                {display}
              </motion.p>
            );
          })()}
      </AnimatePresence>
    </div>
  );
};

// Extracts the logical source id from a Mermaid-rendered node <g>. Mermaid v11
// ids look like "<renderId>-flowchart-<NodeId>-<index>", e.g.
// "voice-diagram-abc-flowchart-Chat-7" → "chat". (Verified against mermaid 11.15.)
const nodeKey = (el: Element): string => {
  const raw = (el.id || "").toLowerCase();
  const m = raw.match(/flowchart-(.+?)-\d+$/);
  return (m ? m[1] : raw.replace(/-\d+$/, "")).trim();
};

const matchesNodeId = (el: Element, id: string): boolean => {
  const target = id.trim().toLowerCase();
  if (!target) return false;
  const key = nodeKey(el);
  const elId = (el.id || "").toLowerCase();
  return (
    key === target ||
    elId.includes(`-${target}-`) ||
    elId.endsWith(`flowchart-${target}`) ||
    el.getAttribute("data-id")?.toLowerCase() === target
  );
};

type DiagramShot = { els: SVGGElement[]; caption: string };
type NodeInfo = { el: SVGGElement; label: string; tokens: string[] };

// Lightweight tokenizer used to match Aria's live spoken caption against node
// labels and step captions. Drops punctuation and common filler words so the
// remaining tokens are the meaningful, topic-bearing ones.
const DIAGRAM_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
  "are", "be", "this", "that", "these", "those", "it", "its", "as", "at", "by",
  "from", "into", "then", "than", "so", "we", "you", "i", "our", "your", "they",
  "them", "he", "she", "his", "her", "will", "would", "can", "could", "should",
  "may", "might", "do", "does", "did", "has", "have", "had", "but", "not", "if",
  "when", "while", "also", "here", "there", "now", "let", "lets", "about",
  "which", "what", "how", "why", "where", "who", "get", "gets", "got", "one",
  "two", "each", "via", "use", "used", "using", "like", "such", "very", "just",
  "some", "any", "all", "more", "most", "first", "next", "last", "out", "over",
  "between", "through", "across", "going", "talk", "talking", "look", "looking",
  "see", "part", "step", "called", "basically", "really", "kind", "sort",
]);

const tokenizeWords = (text: string): string[] =>
  (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !DIAGRAM_STOPWORDS.has(w));

// Renders a Mermaid diagram and drives a lively, self-running "camera" that
// zooms + highlights each part of the diagram in turn while Aria narrates. It
// derives the walkthrough from the LLM's step→node mapping, but if that mapping
// doesn't line up with the rendered nodes it falls back to touring every node,
// so the explanation is never static. A constant subtle drift keeps it alive.
const clampScale = (s: number) => Math.max(0.35, Math.min(6, s));

const VoiceDiagram = ({
  data,
  playing,
  spokenText,
  onError,
  onReady,
}: {
  data: VoiceDiagramData;
  playing: boolean;
  // Aria's live subtitle text (the chunk currently on screen). Focus tracks
  // this so the camera lands on exactly what she is describing right now.
  spokenText: string;
  onError?: () => void;
  onReady?: () => void;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const shotsRef = useRef<DiagramShot[]>([]);
  const nodeInfosRef = useRef<NodeInfo[]>([]);
  // Signature of the currently-focused element set, so the same match doesn't
  // re-trigger the focus animation repeatedly.
  const lastFocusKeyRef = useRef<string>("");

  // Current camera transform. The speech-driven focus and the user's manual
  // pan/zoom both write here; whoever acted last wins.
  const viewRef = useRef({ s: 1, tx: 0, ty: 0 });
  const userControlledRef = useRef(false);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const [userControlled, setUserControlled] = useState(false);
  const [tourNonce, setTourNonce] = useState(0);

  const applyView = (animate: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    const { s, tx, ty } = viewRef.current;
    stage.style.transition = animate
      ? "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  };

  // Camera + highlight primitive. `els = null` → settle on the full chart with
  // every node fully lit. Otherwise glow the given node(s), softly dim the rest,
  // and nudge a gentle zoom toward them while keeping the whole chart in view.
  const focusEls = useCallback((els: SVGGElement[] | null) => {
    const host = hostRef.current;
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!host || !stage || !content) return;
    if (userControlledRef.current) return;

    const FOCUS_SCALE = 1.16;
    const PAN_FACTOR = 0.45;
    const nodes = Array.from(content.querySelectorAll<SVGGElement>("g.node"));
    const hasFocus = !!els && els.length > 0;
    nodes.forEach((node) => {
      if (!hasFocus) {
        node.style.opacity = "1";
        node.style.filter = "none";
      } else if (els!.includes(node)) {
        node.style.opacity = "1";
        node.style.filter =
          "drop-shadow(0 0 12px rgba(139,92,246,0.95)) drop-shadow(0 0 26px rgba(59,130,246,0.6))";
      } else {
        node.style.opacity = "0.45";
        node.style.filter = "none";
      }
    });

    if (!hasFocus) {
      viewRef.current = { s: 1, tx: 0, ty: 0 };
      applyView(true);
      return;
    }

    // Measure focus center at identity without painting it.
    stage.style.transition = "none";
    stage.style.transform = "translate(0px, 0px) scale(1)";
    const hostRect = host.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    els!.forEach((el) => {
      const r = el.getBoundingClientRect();
      minX = Math.min(minX, r.left - hostRect.left);
      minY = Math.min(minY, r.top - hostRect.top);
      maxX = Math.max(maxX, r.right - hostRect.left);
      maxY = Math.max(maxY, r.bottom - hostRect.top);
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const s = FOCUS_SCALE;
    const txCenter = (hostRect.width / 2) * (1 - s);
    const tyCenter = (hostRect.height / 2) * (1 - s);
    const txFocus = hostRect.width / 2 - cx * s;
    const tyFocus = hostRect.height / 2 - cy * s;
    viewRef.current = {
      s,
      tx: txCenter + (txFocus - txCenter) * PAN_FACTOR,
      ty: tyCenter + (tyFocus - tyCenter) * PAN_FACTOR,
    };
    applyView(true);
  }, []);

  // The smart link between speech and visuals: given Aria's live caption text,
  // figure out which node(s) she is actually talking about and focus them.
  // It only moves the camera on a confident match, so it never wanders off on
  // its own — if nothing matches, the current focus is held.
  const focusForSpokenText = useCallback(
    (text: string) => {
      if (userControlledRef.current) return;
      const spoken = text.trim();
      if (!spoken) return;
      const spokenLower = spoken.toLowerCase();
      const spokenTokens = new Set(tokenizeWords(spoken));
      if (spokenTokens.size === 0) return;

      const nodeInfos = nodeInfosRef.current;
      const shots = shotsRef.current;

      // 1) Direct node-label mentions — the strongest, most precise signal.
      //    e.g. Aria says "the load balancer routes requests" and a node is
      //    labeled "Load Balancer".
      const labelHits: SVGGElement[] = [];
      let bestNode: { el: SVGGElement; score: number } | null = null;
      for (const info of nodeInfos) {
        if (!info.label) continue;
        if (info.label.length >= 4 && spokenLower.includes(info.label)) {
          labelHits.push(info.el);
          continue;
        }
        let overlap = 0;
        for (const t of info.tokens) if (spokenTokens.has(t)) overlap += 1;
        if (overlap > 0 && (!bestNode || overlap > bestNode.score)) {
          bestNode = { el: info.el, score: overlap };
        }
      }

      // 2) Step-caption overlap — the LLM-authored walkthrough captions.
      let bestShot: { els: SVGGElement[]; score: number } | null = null;
      for (const shot of shots) {
        if (!shot.caption || shot.els.length === 0) continue;
        const ctoks = tokenizeWords(shot.caption);
        if (!ctoks.length) continue;
        let overlap = 0;
        for (const t of ctoks) if (spokenTokens.has(t)) overlap += 1;
        if (overlap < 2) continue;
        const score = overlap / Math.sqrt(ctoks.length);
        if (!bestShot || score > bestShot.score) {
          bestShot = { els: shot.els, score };
        }
      }

      let target: SVGGElement[] | null = null;
      if (labelHits.length) {
        target = Array.from(new Set(labelHits));
      } else if (bestShot) {
        target = bestShot.els;
      } else if (bestNode && bestNode.score >= 2) {
        target = [bestNode.el];
      }

      // No confident match → keep the current focus rather than guessing.
      if (!target || target.length === 0) return;

      const key = target
        .map((e) => e.id || "")
        .sort()
        .join("|");
      if (key === lastFocusKeyRef.current) return;
      lastFocusKeyRef.current = key;
      focusEls(target);
    },
    [focusEls],
  );

  // First manual interaction takes over the camera and halts speech-driven focus.
  const grabControl = () => {
    if (!userControlledRef.current) {
      userControlledRef.current = true;
      setUserControlled(true);
    }
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    const v = viewRef.current;
    const ns = clampScale(v.s * factor);
    // Keep the point under (px,py) fixed while scaling.
    viewRef.current = {
      s: ns,
      tx: px - ((px - v.tx) / v.s) * ns,
      ty: py - ((py - v.ty) / v.s) * ns,
    };
    applyView(false);
  };

  const resetView = () => {
    userControlledRef.current = false;
    setUserControlled(false);
    draggingRef.current = null;
    viewRef.current = { s: 1, tx: 0, ty: 0 };
    applyView(true);
    setTourNonce((n) => n + 1); // restart the guided walkthrough
  };

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    loadMermaid()
      .then((mermaid) =>
        mermaid.render(
          `voice-diagram-${Math.random().toString(36).slice(2)}`,
          data.mermaid,
        ),
      )
      .then((res) => {
        if (!cancelled) setSvg(res.svg);
      })
      .catch((error) => {
        console.warn("Voice diagram render failed:", error);
        if (!cancelled) onError?.();
      });
    return () => {
      cancelled = true;
    };
  }, [data.mermaid, onError]);

  // A new diagram resets any manual camera state.
  useEffect(() => {
    userControlledRef.current = false;
    setUserControlled(false);
    viewRef.current = { s: 1, tx: 0, ty: 0 };
  }, [data.mermaid]);

  // Inject the SVG, soften nodes, and pre-compute the walkthrough "shots".
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !svg) return;
    content.innerHTML = svg;
    const el = content.querySelector("svg");
    if (!el) return;
    el.removeAttribute("width");
    el.removeAttribute("height");
    el.style.maxWidth = "92%";
    el.style.maxHeight = "88%";

    const nodes = Array.from(el.querySelectorAll<SVGGElement>("g.node"));
    nodes.forEach((node) => {
      node.style.transition = "opacity 0.5s ease, filter 0.5s ease";
    });

    // Index every node's visible label so spoken text can be matched to it.
    nodeInfosRef.current = nodes.map((n) => {
      const label = (n.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      return { el: n, label, tokens: tokenizeWords(label) };
    });

    // Prefer the LLM's mapping; keep only steps that actually hit a node. These
    // captions are matched against Aria's live speech to drive the focus.
    shotsRef.current = (data.steps || [])
      .map((s) => ({
        els: nodes.filter((n) => s.nodeIds.some((id) => matchesNodeId(n, id))),
        caption: s.caption || "",
      }))
      .filter((s) => s.els.length > 0);

    onReady?.();
  }, [svg, data.steps, onReady]);

  // Settle on the full chart whenever a new diagram mounts or playback stops, so
  // the speech-driven focus always starts from a clean, fully-lit overview.
  useEffect(() => {
    if (!svg) return;
    lastFocusKeyRef.current = "";
    if (userControlledRef.current) return;
    focusEls(null);
  }, [svg, playing, tourNonce, data.steps, focusEls]);

  // The smart link: every time Aria's live subtitle advances, re-evaluate which
  // node(s) she is describing and focus them. The camera only moves on a
  // confident match, so it stays locked on whatever she is actually explaining
  // and never wanders on an independent timer.
  useEffect(() => {
    if (!svg || !playing) return;
    if (userControlledRef.current) return;
    focusForSpokenText(spokenText || "");
  }, [spokenText, svg, playing, tourNonce, focusForSpokenText]);

  // Wheel zoom (attached non-passively so we can prevent page scroll).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      grabControl();
      const rect = host.getBoundingClientRect();
      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        Math.exp(-e.deltaY * 0.0015),
      );
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // Stop the browser from starting a text selection on the SVG while panning.
    e.preventDefault();
    grabControl();
    draggingRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const last = draggingRef.current;
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    draggingRef.current = { x: e.clientX, y: e.clientY };
    viewRef.current = {
      ...viewRef.current,
      tx: viewRef.current.tx + dx,
      ty: viewRef.current.ty + dy,
    };
    applyView(false);
  };
  const endDrag = (e: React.PointerEvent) => {
    draggingRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const centerZoom = (factor: number) => {
    const host = hostRef.current;
    if (!host) return;
    grabControl();
    const rect = host.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  };

  // Host is confined to the open area between the audio header and the input
  // footer (both z-[140]) so the title and zoom controls never tuck behind
  // them — everything stays inside the diagram's own region.
  return (
    <motion.div
      ref={hostRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      className="absolute inset-x-0 top-[84px] bottom-[116px] select-none overflow-hidden"
      style={{
        cursor: userControlled
          ? draggingRef.current
            ? "grabbing"
            : "grab"
          : "default",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* stage = zoom/pan camera; content = constant subtle drift for life. */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{ transformOrigin: "0 0", willChange: "transform" }}
      >
        <motion.div
          ref={contentRef}
          className="flex h-full w-full items-center justify-center"
          animate={
            userControlled
              ? { scale: 1, x: 0, y: 0 }
              : { scale: [1, 1.025, 1], x: [0, 7, -5, 0], y: [0, -6, 4, 0] }
          }
          transition={
            userControlled
              ? { duration: 0.4 }
              : { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>

      {/* Pan/zoom controls */}
      <div
        className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => centerZoom(1.25)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
          aria-label="Zoom in"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={() => centerZoom(0.8)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
          aria-label="Zoom out"
        >
          <Minus size={16} />
        </button>
        <AnimatePresence>
          {userControlled && (
            <motion.button
              type="button"
              onClick={resetView}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-400/30 bg-violet-500/20 text-violet-100 backdrop-blur-md transition hover:bg-violet-500/35"
              aria-label="Reset view and resume tour"
            >
              <RotateCcw size={15} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// A pair of luminous arcs that orbit the blob while a diagram is being
// prepared, so the blob seamlessly reads as "thinking / sketching".
const DiagramLoadingRing = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.div
        initial={{ opacity: 0, scale: 0.78 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.15 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      >
        <motion.svg
          width="360"
          height="360"
          viewBox="0 0 360 360"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "linear" }}
          style={{ filter: "drop-shadow(0 0 14px rgba(139,92,246,0.8))" }}
        >
          <defs>
            <linearGradient id="ring-grad-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
              <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="180"
            cy="180"
            r="138"
            fill="none"
            stroke="url(#ring-grad-a)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="210 660"
          />
        </motion.svg>
        <motion.svg
          width="360"
          height="360"
          viewBox="0 0 360 360"
          className="absolute"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 3.8, ease: "linear" }}
          style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,0.7))" }}
        >
          <circle
            cx="180"
            cy="180"
            r="112"
            fill="none"
            stroke="#38bdf8"
            strokeOpacity="0.65"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="60 520"
          />
        </motion.svg>
      </motion.div>
    )}
  </AnimatePresence>
);

const VoiceUniverse = ({
  state,
  caption,
  diagram,
  diagramLoading,
  image,
  imageSeq,
  imageLoading,
  onDiagramError,
  onDiagramReady,
}: {
  state: "listening" | "speaking" | "idle";
  caption: { role: "user" | "assistant"; text: string } | null;
  diagram: VoiceDiagramData | null;
  diagramLoading: boolean;
  image: VoiceImageData | null;
  imageSeq: VoiceImageSeqData | null;
  imageLoading: boolean;
  onDiagramError?: () => void;
  onDiagramReady?: () => void;
}) => {
  const speaking = state === "speaking";
  // A visual only takes the stage once it has finished rendering; while
  // loading we keep the blob centered and morph it into a loading orb.
  const diagramVisible = !!diagram && !diagramLoading;
  const imageVisible = !!image && !imageLoading;
  const seqVisible = !!imageSeq && imageSeq.items.length > 0 && !imageLoading;
  const visualVisible = diagramVisible || imageVisible || seqVisible;
  const visualLoading = diagramLoading || imageLoading;

  // The subtitle chunk Aria is speaking right now (assistant only). The diagram
  // uses this to focus exactly the node(s) she is currently describing.
  const [spokenChunk, setSpokenChunk] = useState("");
  const handleSubtitleChunk = useCallback(
    (text: string, role: "user" | "assistant" | null) => {
      setSpokenChunk(role === "assistant" ? text : "");
    },
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-[130] flex flex-col items-center justify-center overflow-hidden bg-black"
    >
      {/* Diagram stage — mounted while Aria teaches with a visual. It stays
          invisible until rendered (diagramVisible) so the reveal is seamless. */}
      <AnimatePresence>
        {diagram && (
          <motion.div
            key={diagram.mermaid}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: diagramVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <VoiceDiagram
              data={diagram}
              playing={diagramVisible}
              spokenText={spokenChunk}
              onError={onDiagramError}
              onReady={onDiagramReady}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image stage — a real photo/illustration fetched from the internet. */}
      <AnimatePresence>
        {image && (
          <motion.div
            key={image.url}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: imageVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <VoiceImageStage data={image} visible={imageVisible} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image-sequence stage — reveals each image as Aria narrates its caption,
          so a story/timeline advances step by step instead of all at once. */}
      <AnimatePresence>
        {imageSeq && imageSeq.items.length > 0 && (
          <motion.div
            key={imageSeq.items.map((i) => i.url).join("|")}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: seqVisible ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <VoiceImageSequence
              data={imageSeq}
              spokenText={spokenChunk}
              visible={seqVisible}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The morphing audio-reactive blob. Centered while talking; when a
          visual is on stage it shrinks and tucks into the top-left corner
          (just below the audio nav); while a visual is loading it stays
          centered and gains an orbiting loading ring. */}
      <motion.div
        className="absolute flex items-center justify-center"
        style={{
          width: 380,
          height: 380,
          transformOrigin: "top left",
          zIndex: 5,
          pointerEvents: "none",
        }}
        initial={false}
        animate={
          visualVisible
            ? { top: "12%", left: "4%", x: "0%", y: "0%", scale: 0.26, opacity: 0.95 }
            : { top: "50%", left: "50%", x: "-50%", y: "-50%", scale: 1, opacity: 1 }
        }
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <MorphBlob speaking={speaking} />
        <DiagramLoadingRing active={visualLoading} />
      </motion.div>

      {/* Rolling movie-style subtitles */}
      <RollingSubtitle caption={caption} onChunk={handleSubtitleChunk} />
    </motion.div>
  );
};

// A real internet image displayed on the voice stage, with a gentle Ken Burns
// drift and a glass caption. Mirrors the diagram stage layout/positioning.
const VoiceImageStage = ({
  data,
  visible,
}: {
  data: VoiceImageData;
  visible: boolean;
}) => (
  <div className="absolute inset-x-0 top-[84px] bottom-[116px] flex items-center justify-center px-[6%]">
    <div className="relative flex max-h-full max-w-[78%] flex-col items-center">
      <motion.img
        src={data.url}
        alt={data.caption || data.query}
        draggable={false}
        className="max-h-[62vh] w-auto rounded-2xl border border-white/10 object-contain shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
        initial={{ scale: 1.04 }}
        animate={
          visible
            ? { scale: [1.04, 1.0, 1.04] }
            : { scale: 1.04 }
        }
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {data.caption && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: visible ? 1 : 0, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-4 max-w-[34rem] rounded-full border border-white/10 bg-white/[0.06] px-5 py-2 text-center text-sm text-white/80 backdrop-blur-md"
        >
          {data.caption}
        </motion.div>
      )}
    </div>
  </div>
);

// An ordered set of internet images revealed one at a time, advancing as Aria's
// live subtitle matches each item's caption — so a story/timeline plays out step
// by step in sync with her narration instead of all images appearing at once.
const VoiceImageSequence = ({
  data,
  spokenText,
  visible,
}: {
  data: VoiceImageSeqData;
  spokenText: string;
  visible: boolean;
}) => {
  const [idx, setIdx] = useState(0);
  // Progress bar dots count; reset to the first image whenever the set changes.
  useEffect(() => {
    setIdx(0);
  }, [data]);

  // Advance to whichever upcoming item best matches what Aria is saying now.
  // Movement is forward-only so the story never jumps backward on a stray word.
  useEffect(() => {
    const spoken = (spokenText || "").trim();
    if (!spoken) return;
    const spokenTokens = new Set(tokenizeWords(spoken));
    if (spokenTokens.size === 0) return;
    let bestIdx = idx;
    let bestScore = 0;
    for (let i = idx; i < data.items.length; i += 1) {
      const ctoks = tokenizeWords(data.items[i].caption);
      if (!ctoks.length) continue;
      let overlap = 0;
      for (const t of ctoks) if (spokenTokens.has(t)) overlap += 1;
      const score = overlap / Math.sqrt(ctoks.length);
      if (overlap >= 2 && score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx > idx) setIdx(bestIdx);
  }, [spokenText, data, idx]);

  const current = data.items[Math.min(idx, data.items.length - 1)];
  if (!current) return null;

  return (
    <div className="absolute inset-x-0 top-[84px] bottom-[116px] flex items-center justify-center px-[6%]">
      <div className="relative flex max-h-full max-w-[78%] flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.url}
            src={current.url}
            alt={current.caption || current.query}
            draggable={false}
            className="max-h-[58vh] w-auto rounded-2xl border border-white/10 object-contain shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </AnimatePresence>
        {current.caption && (
          <motion.div
            key={`cap-${current.url}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: visible ? 1 : 0, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 max-w-[34rem] rounded-full border border-white/10 bg-white/[0.06] px-5 py-2 text-center text-sm text-white/80 backdrop-blur-md"
          >
            {current.caption}
          </motion.div>
        )}
        {/* Step dots */}
        <div className="mt-3 flex items-center gap-1.5">
          {data.items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-5 bg-white/80" : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SearchProgressIndicator = ({ active }: { active: boolean }) => (
  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-white border border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
    <Globe2 size={14} className="relative z-10" />
    {active && (
      <motion.div
        className="absolute inset-[-3px] rounded-[14px] border border-[#ff6e00]/55"
        animate={{ rotate: 360, opacity: [0.25, 0.8, 0.25] }}
        transition={{
          rotate: { repeat: Infinity, duration: 2.4, ease: "linear" },
          opacity: { repeat: Infinity, duration: 1.6 },
        }}
      />
    )}
  </div>
);

const SourceCards = ({
  sources,
  compact = false,
  tone = "light",
}: {
  sources: NormalizedWebSource[];
  compact?: boolean;
  tone?: "light" | "dark";
}) => {
  if (!sources.length) return null;
  const dark = tone === "dark";
  return (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : ""}`}>
      {sources.slice(0, compact ? 6 : 4).map((source, index) => (
        <motion.a
          key={source.id || source.url}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.25 }}
          className={`group block rounded-xl p-3 transition-colors ${dark ? "border border-white/10 bg-white/[0.06] hover:bg-white/[0.09]" : "border border-black/5 bg-white/80 shadow-[0_10px_24px_rgba(0,0,0,0.06)] hover:bg-white"}`}
        >
          <div className="flex items-start gap-2.5">
            <img
              src={source.faviconUrl}
              alt=""
              className="mt-0.5 h-4 w-4 rounded-sm"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-zinc-500" : "text-zinc-400"}`}
              >
                <span className="truncate">{source.domain}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${dark ? "bg-white/10 text-zinc-400" : "bg-zinc-950/[0.06] text-zinc-500"}`}
                >
                  {index + 1}
                </span>
              </div>
              <div
                className={`mt-1 line-clamp-2 text-[12px] font-semibold leading-snug ${dark ? "text-zinc-200 group-hover:text-white" : "text-zinc-800 group-hover:text-zinc-950"}`}
              >
                {source.title}
              </div>
              {source.snippet && (
                <div
                  className={`mt-1.5 line-clamp-2 text-[11px] leading-snug ${dark ? "text-zinc-500" : "text-zinc-500"}`}
                >
                  {source.snippet}
                </div>
              )}
            </div>
            <ExternalLink
              size={12}
              className={`mt-0.5 shrink-0 ${dark ? "text-zinc-600 group-hover:text-zinc-300" : "text-zinc-300 group-hover:text-zinc-500"}`}
            />
          </div>
        </motion.a>
      ))}
    </div>
  );
};

const SearchActivityPanel = ({
  webSearch,
}: {
  webSearch?: Message["webSearch"];
}) => {
  if (
    !webSearch ||
    (!webSearch.query && webSearch.sources.length === 0 && !webSearch.status)
  )
    return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
    >
      <div className="flex items-start gap-3">
        <SearchProgressIndicator active={webSearch.active} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff6e00]">
              Web Search
            </span>
            {webSearch.mode && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                {webSearch.mode}
              </span>
            )}
          </div>
          {webSearch.query && (
            <div className="mt-1 text-[13px] font-semibold leading-snug text-zinc-200">
              "{webSearch.query}"
            </div>
          )}
          {webSearch.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {webSearch.sources.slice(0, 4).map((source) => (
                <motion.a
                  key={`chip-${source.id || source.url}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/[0.09] px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-white/[0.14] hover:text-white"
                >
                  <img
                    src={source.faviconUrl}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm"
                    loading="lazy"
                  />
                  <span className="truncate">{source.domain}</span>
                </motion.a>
              ))}
            </div>
          )}
          <div className="mt-1 flex items-center gap-2 text-[12px] text-zinc-500">
            {webSearch.active && (
              <LoaderCircle size={12} className="animate-spin text-[#ff6e00]" />
            )}
            <span>
              {webSearch.error ||
                webSearch.status ||
                "Preparing live retrieval..."}
            </span>
          </div>
          {webSearch.sources.length > 0 && (
            <div className="mt-3">
              <SourceCards sources={webSearch.sources} tone="dark" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const FinalSourcesPanel = ({ sources }: { sources: NormalizedWebSource[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="not-prose mt-5 overflow-hidden rounded-2xl border border-black/5 bg-zinc-50/80">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus:outline-none"
      >
        <span className="flex items-center gap-2 text-[12px] font-semibold text-zinc-700">
          <Globe2 size={14} className="text-indigo-500" />
          {sources.length} source{sources.length === 1 ? "" : "s"} reviewed
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown size={14} className="text-zinc-400" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-black/5 p-3"
          >
            <SourceCards sources={sources} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const thoughtStepMeta = (content: string, phase: string) => {
  const value = content.toLowerCase();
  if (
    value.includes("web") ||
    value.includes("source") ||
    value.includes("search")
  )
    return {
      icon: ProgressIcon,
      label: "Search",
      bg: "bg-[#E7F3FF]",
      text: "text-[#0A7DFF]",
    };
  if (
    value.includes("page") ||
    value.includes("screen") ||
    value.includes("screenshot") ||
    value.includes("visual")
  )
    return {
      icon: SubmittedIcon,
      label: "Vision",
      bg: "bg-[#F1EAFC]",
      text: "text-[#6929F4]",
    };
  if (value.includes("tool") || value.includes("execut"))
    return {
      icon: SuccessIcon,
      label: "Tool",
      bg: "bg-[#E6F8EA]",
      text: "text-[#36AA55]",
    };
  if (value.includes("graph") || value.includes("concept"))
    return {
      icon: PendingIcon,
      label: "Graph",
      bg: "bg-[#FDF1E8]",
      text: "text-[#D87A2C]",
    };
  if (value.includes("flashcard") || value.includes("revision"))
    return {
      icon: ReviewIcon,
      label: "Recall",
      bg: "bg-[#FDF4DD]",
      text: "text-[#D49B23]",
    };
  if (value.includes("synth") || phase === "synthesizing")
    return {
      icon: SubmittedIcon,
      label: "Synthesis",
      bg: "bg-[#F1EAFC]",
      text: "text-[#6929F4]",
    };
  return {
    icon: ExpiredIcon,
    label: "Reasoning",
    bg: "bg-[#F3F3F3]",
    text: "text-[#6A6A6A]",
  };
};

const getStatusBadge = (
  phase: string,
  isComplete: boolean,
  hasError?: boolean,
) => {
  if (hasError) return "failed";
  if (isComplete) return "success";
  if (phase === "retrieving" || phase === "web_search") return "review";
  if (phase === "idle" && !isComplete) return "pending";
  return "progress";
};

const reasoningTraceEase: [number, number, number, number] = [0.16, 1, 0.3, 1];
const reasoningTraceStepGap = 0.48;
const reasoningTraceDelay = (index: number, offset = 0) =>
  index * reasoningTraceStepGap + offset;

const reasoningStepVariants: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.24,
      ease: reasoningTraceEase,
      delay: reasoningTraceDelay(index),
    },
  }),
};

const reasoningIconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.34, rotate: -16, y: 2 },
  show: (index: number) => ({
    opacity: 1,
    scale: 0.6,
    rotate: [-14, 9, -3, 0],
    y: [1, -1, 0],
    transition: {
      opacity: {
        duration: 0.14,
        delay: reasoningTraceDelay(index, 0.02),
      },
      scale: {
        type: "spring",
        stiffness: 560,
        damping: 21,
        delay: reasoningTraceDelay(index, 0.02),
      },
      rotate: {
        duration: 0.42,
        ease: "easeOut",
        delay: reasoningTraceDelay(index, 0.03),
      },
      y: {
        duration: 0.3,
        ease: "easeOut",
        delay: reasoningTraceDelay(index, 0.03),
      },
    },
  }),
};

const reasoningLineVariants: Variants = {
  hidden: { scaleY: 0, opacity: 0 },
  show: (index: number) => ({
    scaleY: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: reasoningTraceEase,
      delay: reasoningTraceDelay(index, 0.18),
    },
  }),
};

const reasoningTextVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -3,
    backgroundPosition: "155% 50%",
  },
  show: (index: number) => ({
    opacity: 1,
    x: 0,
    backgroundPosition: ["155% 50%", "45% 50%", "-70% 50%"],
    transition: {
      opacity: {
        duration: 0.16,
        delay: reasoningTraceDelay(index, 0.11),
      },
      x: {
        duration: 0.22,
        ease: reasoningTraceEase,
        delay: reasoningTraceDelay(index, 0.11),
      },
      backgroundPosition: {
        duration: 0.72,
        ease: "easeInOut",
        delay: reasoningTraceDelay(index, 0.12),
      },
    },
  }),
};

const reasoningShimmerTextStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(100deg, #52525b 0%, #52525b 34%, #111827 45%, #a1a1aa 52%, #52525b 66%, #52525b 100%)",
  backgroundSize: "240% 100%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  willChange: "background-position, opacity, transform",
};

const ThinkingPanel = ({
  phase,
  steps,
  isComplete,
  webSearch,
  hasError,
}: {
  phase: string;
  steps: any[];
  isComplete: boolean;
  webSearch?: Message["webSearch"];
  hasError?: boolean;
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isComplete) {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isComplete, steps.length, webSearch?.sources.length]);

  if (phase === "idle" && steps.length === 0) return null;
  const latestStep = steps[steps.length - 1];
  const latestMeta = thoughtStepMeta(latestStep?.content || phase, phase);
  const LatestIcon = latestMeta.icon;
  const activeLabel =
    phase === "retrieving"
      ? "Searching"
      : phase === "web_search"
        ? "Reviewing"
        : phase === "tool_execution"
          ? "Running"
          : phase === "synthesizing"
            ? "Synthesizing"
            : isComplete
              ? "Complete"
              : "Thinking";
  const stepCount = steps.length + (webSearch?.sources.length ? 1 : 0);

  return (
    <div
      ref={panelRef}
      data-reasoning-dropdown
      className="not-prose mb-5 mt-2 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 font-sans shadow-[0_18px_45px_rgba(0,0,0,0.06)]"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none transition-colors hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${latestMeta.bg} ${latestMeta.text}`}
          >
            <motion.div
              animate={
                !isComplete
                  ? { rotate: [0, -6, 6, 0], y: [0, -1, 0] }
                  : { rotate: 0, y: 0 }
              }
              transition={{
                repeat: !isComplete ? Infinity : 0,
                duration: 1.45,
                ease: "easeInOut",
              }}
              className="scale-[0.68]"
            >
              <LatestIcon />
            </motion.div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-zinc-900">
                Reasoning trace
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                {activeLabel}
              </span>
              {stepCount > 0 && (
                <span className="text-[11px] text-zinc-400">
                  {stepCount} step{stepCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[12px] leading-snug text-zinc-500">
              {latestStep?.content ||
                webSearch?.status ||
                "Preparing the reasoning trace..."}
            </div>
          </div>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown size={16} className="text-zinc-400" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-zinc-100"
          >
            <motion.div
              key={`reasoning-trace-open-${stepCount}-${steps.map((step) => step.id).join("-")}`}
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: {} }}
              className="space-y-1 px-3 py-3 text-[13px] text-zinc-500"
            >
              {steps.map((step, idx) => {
                const meta = thoughtStepMeta(step.content, phase);
                const active =
                  !isComplete &&
                  idx === steps.length - 1 &&
                  phase !== "complete";
                return (
                  <motion.div
                    key={step.id}
                    custom={idx}
                    variants={reasoningStepVariants}
                    className="group/step relative flex flex-col items-start gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                  >
                    {idx < steps.length - 1 && (
                      <motion.div
                        custom={idx}
                        variants={reasoningLineVariants}
                        className="absolute bottom-[-12px] left-[26px] top-10 w-px origin-top bg-black/10 will-change-transform"
                      />
                    )}

                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-[11px] font-medium tracking-tight ${meta.bg} ${meta.text}`}
                      >
                        <motion.div
                          custom={idx}
                          variants={reasoningIconVariants}
                          className="-mx-1 flex origin-center items-center justify-center"
                        >
                          <meta.icon />
                        </motion.div>
                        {meta.label}
                      </div>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shadow-sm animate-pulse" />
                      )}
                    </div>

                    <motion.div
                      custom={idx}
                      variants={reasoningTextVariants}
                      style={reasoningShimmerTextStyle}
                      className="mt-1 pl-[32px] text-[12px] leading-relaxed tracking-tight transition-colors"
                    >
                      {step.content}
                    </motion.div>
                  </motion.div>
                );
              })}
              <SearchActivityPanel webSearch={webSearch} />

              {!isComplete && (
                <motion.div
                  custom={steps.length}
                  variants={reasoningStepVariants}
                  className="group/step relative flex flex-col items-start gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#E7F3FF] px-3 py-1.5 text-[11px] font-medium tracking-tight text-[#0A7DFF]">
                      <motion.div
                        custom={steps.length}
                        variants={reasoningIconVariants}
                        className="-mx-1 flex origin-center items-center justify-center"
                      >
                        <ProgressIcon />
                      </motion.div>
                      {activeLabel}
                    </div>
                  </div>

                  <motion.div
                    custom={steps.length}
                    variants={reasoningTextVariants}
                    style={reasoningShimmerTextStyle}
                    className="mt-1 pl-[32px] text-[12px] italic tracking-tight"
                  >
                    Loading...
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const markdownComponents = {
  p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  blockquote: ({ children, ...props }: any) => (
    <blockquote {...props}>{children}</blockquote>
  ),
  code: InteractiveCodeBlock,
};

const AnimatedMarkdown = React.memo(
  ({
    content,
    isVoice,
    animationsEnabled = true,
    isStreaming = false,
  }: {
    content: string;
    isVoice?: boolean;
    animationsEnabled?: boolean;
    isStreaming?: boolean;
  }) => {
    const showCursor =
      animationsEnabled && !isVoice && isStreaming && content.length > 0;

    return (
      <div className={`streaming-text ${showCursor ? "typing-active" : ""}`}>
        <style>{`
        .streaming-text.typing-active > *:last-child::after {
          content: '';
          display: inline-block;
          width: 6px;
          height: 18px;
          background-color: #a1a1aa; /* zinc-400 */
          vertical-align: text-bottom;
          margin-left: 4px;
          border-radius: 1px;
          animation: terminalBlink 1s step-start infinite;
          transition: opacity 0.2s ease;
        }
        @keyframes terminalBlink { 
          50% { opacity: 0; } 
        }
      `}</style>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
);

const MessageUsageFooter = ({
  usage,
}: {
  usage: NonNullable<Message["usage"]>;
}) => {
  const input = Math.max(0, Math.round(usage.inputTokens || 0));
  const output = Math.max(0, Math.round(usage.outputTokens || 0));
  const total = input + output;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="not-prose mt-2 flex justify-end text-[10px] font-medium tracking-tight text-zinc-400"
    >
      <span className="rounded-full bg-zinc-50/80 px-2 py-1 tabular-nums">
        {formatCount(total)} tokens · {formatCurrency(usage.cost || 0)}
      </span>
    </motion.div>
  );
};

const MessageItem = React.memo(
  ({
    msg,
    sendState,
    isLast,
    animationsEnabled,
    isPlayingTTS,
    onSendMessage,
    onHandleTTS,
    onSetActiveView,
    setMessages,
    apiKey,
    activeBookId,
    activeBookTitle,
  }: {
    msg: any;
    sendState: string;
    isLast?: boolean;
    animationsEnabled: boolean;
    isPlayingTTS: string | null;
    onSendMessage: (msg: string) => void;
    onHandleTTS: (id: string, content: string) => void;
    onSetActiveView: (view: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<any[]>>;
    apiKey: string;
    activeBookId: string | null;
    activeBookTitle: string;
  }) => {
    const [isGeneratingFlashcards, setIsGeneratingFlashcards] =
      React.useState(false);
    const [isVoiceSessionOpen, setIsVoiceSessionOpen] = React.useState(false);

    const handleGenerateFlashcards = async () => {
      setIsGeneratingFlashcards(true);
      try {
        const openRouterKey =
          apiKey ||
          localStorage.getItem("openrouter_api_key") ||
          localStorage.getItem("api_key") ||
          "";
        const response = await fetch("/api/generate-flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: openRouterKey ? `Bearer ${openRouterKey}` : "",
          },
          body: JSON.stringify({ content: msg.content }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Flashcard generation failed");
        }
        const data = await response.json();

        const cards = Array.isArray(data.cards) ? data.cards : [];
        const validCards = cards.filter(
          (card: any) => card?.front && card?.back,
        );
        if (validCards.length > 0) {
          await Promise.all(
            validCards.map((card: any) =>
              db.flashcards.add({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                conceptId: card.conceptId || "general",
                bookId: activeBookId || undefined,
                bookTitle: activeBookTitle || undefined,
                front: String(card.front),
                back: String(card.back),
                nextReviewAt: Date.now(),
              }),
            ),
          );

          setMessages((prev) => {
            const newM = [...prev];
            const idx = newM.findIndex((m) => m.id === msg.id);
            if (idx !== -1) {
              newM[idx] = { ...newM[idx], hasFlashcards: true };
            }
            return newM;
          });
        } else {
          throw new Error("No flashcards were returned.");
        }
      } catch (e) {
        console.warn("Flashcard generation failed:", e);
      } finally {
        setIsGeneratingFlashcards(false);
      }
    };

    if (msg.voiceSession) {
      const session = msg.voiceSession;
      const turns = session.turns || [];
      const secs = Math.max(0, Math.round(session.durationSeconds || 0));
      const elapsed = `${Math.floor(secs / 60)}:${(secs % 60)
        .toString()
        .padStart(2, "0")}`;
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.15 }}
          className="flex w-full flex-col items-start"
        >
          <div className="w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={() => setIsVoiceSessionOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus:outline-none"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-500">
                <Mic size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-zinc-800">
                  {session.title || "Voice conversation"}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Voice · {turns.length} message
                  {turns.length === 1 ? "" : "s"} · {elapsed}
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`shrink-0 text-zinc-400 transition-transform duration-300 ${
                  isVoiceSessionOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isVoiceSessionOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-black/5"
                >
                  <div className="space-y-3 px-4 py-3.5">
                    {turns.length === 0 && (
                      <div className="text-[12px] text-zinc-400">
                        No transcript captured.
                      </div>
                    )}
                    {turns.map(
                      (t: {
                        id: string;
                        role: "user" | "assistant";
                        content: string;
                        diagram?: { title?: string; mermaid: string };
                        image?: { url: string; caption?: string };
                      }) =>
                        t.diagram ? (
                          <div key={t.id} className="flex flex-col items-start">
                            <span className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                              <Workflow size={10} />
                              {t.diagram.title || "Diagram"}
                            </span>
                            <div className="w-full overflow-hidden rounded-xl border border-black/10 bg-[#0b0b0f]">
                              <Mermaid chart={t.diagram.mermaid} />
                            </div>
                          </div>
                        ) : t.image ? (
                          <div key={t.id} className="flex flex-col items-start">
                            <span className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                              <ImageIcon size={10} />
                              {t.image.caption || "Image"}
                            </span>
                            <div className="w-full overflow-hidden rounded-xl border border-black/10 bg-[#0b0b0f]">
                              <img
                                src={t.image.url}
                                alt={t.image.caption || "Reference image"}
                                className="max-h-64 w-full object-contain"
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            key={t.id}
                            className={`flex flex-col ${
                              t.role === "user" ? "items-end" : "items-start"
                            }`}
                          >
                            <span className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                              {t.role === "user" ? "You" : "Aria"}
                            </span>
                            <div
                              className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] font-medium leading-relaxed ${
                                t.role === "user"
                                  ? "rounded-br-sm bg-[#1C1C1E] text-white"
                                  : "rounded-bl-sm bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              {t.content}
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{
          opacity: 0,
          y: msg.role === "user" ? 15 : 10,
          scale: msg.role === "user" ? 0.98 : 1,
        }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", bounce: 0.15, mass: 0.8 }}
        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} w-full`}
      >
        <div
          className={`${msg.role === "user" ? "max-w-[85%] bg-[#1C1C1E] text-white border border-[#2c2c2e] px-4 py-2.5 rounded-2xl rounded-br-sm" : "w-full max-w-full"}`}
        >
          {msg.role === "assistant" && msg.isVoice && (
            <div className="flex items-center gap-3 mb-2">
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
                <Mic size={8} /> Voice
              </span>
            </div>
          )}
          {msg.role === "user" && msg.isVoice && (
            <div className="flex items-center justify-end gap-1 mb-2">
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
                <Mic size={8} /> Voice
              </span>
            </div>
          )}

          <div
            className={`prose max-w-none text-[13px] font-medium leading-relaxed tracking-tight ${msg.role === "user" ? "prose-p:leading-snug prose-p:my-0" : "prose-p:leading-[1.6] prose-p:mb-4 prose-p:last:mb-0"} prose-headings:tracking-tight prose-headings:leading-tight prose-headings:font-medium prose-pre:my-2 prose-pre:border prose-code:text-blue-500 ${msg.role === "user" ? "prose-invert text-white prose-pre:bg-[#0A0A0A] prose-pre:border-white/5" : "text-[#050505] prose-headings:text-zinc-900 prose-pre:bg-zinc-100 prose-pre:border-black/5"}`}
          >
            {msg.role === "assistant" &&
              msg.reasoningSteps &&
              msg.reasoningSteps.length > 0 && (
                <ThinkingPanel
                  phase={msg.phase || "idle"}
                  steps={msg.reasoningSteps}
                  isComplete={
                    sendState === "success" ||
                    (msg.phase !== undefined &&
                      msg.phase === "complete" &&
                      msg.content.length > 0)
                  }
                  webSearch={msg.webSearch}
                  hasError={!!msg.error}
                />
              )}
            <AnimatedMarkdown
              content={msg.content}
              isVoice={msg.isVoice}
              animationsEnabled={animationsEnabled}
              isStreaming={
                isLast && sendState !== "success" && sendState !== "idle"
              }
            />
            {msg.role === "assistant" && (
              <FinalSourcesPanel sources={msg.sources || []} />
            )}
          </div>
          {msg.role === "assistant" && msg.usage && (
            <MessageUsageFooter usage={msg.usage} />
          )}

          {msg.hasFlashcards && (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Zap size={14} />
                <span className="text-xs font-medium">
                  Flashcards successfully generated!
                </span>
              </div>
              <button
                onClick={() => {
                  if (activeBookId) {
                    localStorage.setItem("revision_open_book_id", activeBookId);
                  }
                  onSetActiveView("revision");
                }}
                className="text-xs font-semibold px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              >
                View Book
              </button>
            </div>
          )}
        </div>
        {msg.role === "assistant" && (
          <div className="mt-4 flex flex-wrap gap-2 w-full">
            <button
              onClick={() =>
                onSendMessage(
                  `Extract the core atomic concept from this, describe it briefly, and explicitly call the update_graph tool to add it to the learning graph:\n\n"${msg.content}"`,
                )
              }
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors border border-black/10 shadow-sm"
            >
              <Network size={13} /> Add to Graph
            </button>

            {msg.phase === "complete" && !msg.hasFlashcards && (
              <button
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingFlashcards}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors text-xs font-medium border border-black/10 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isGeneratingFlashcards ? (
                  <Activity size={13} className="animate-spin" />
                ) : (
                  <BookOpen size={13} />
                )}
                {isGeneratingFlashcards ? "Generating..." : "Create Flashcard"}
              </button>
            )}

            <button
              onClick={() => onHandleTTS(msg.id, msg.content)}
              className={`flex items-center gap-1.5 text-xs font-medium ml-auto px-3 py-1.5 rounded-lg transition-colors border shadow-sm ${
                isPlayingTTS === msg.id
                  ? "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
                  : "text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border-black/10"
              }`}
            >
              {isPlayingTTS === msg.id ? (
                <>
                  <Square size={12} className="fill-current" /> Stop Reading
                </>
              ) : (
                <>
                  <Volume2 size={12} /> Read Aloud
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.msg === nextProps.msg &&
      prevProps.sendState === nextProps.sendState &&
      prevProps.animationsEnabled === nextProps.animationsEnabled &&
      prevProps.isPlayingTTS === nextProps.isPlayingTTS &&
      prevProps.apiKey === nextProps.apiKey &&
      prevProps.activeBookId === nextProps.activeBookId &&
      prevProps.activeBookTitle === nextProps.activeBookTitle
    );
  },
);

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const apiKey = useStore((state) => state.apiKey);
  const serperApiKey = useStore((state) => state.serperApiKey);
  const learnerName = useStore((state) => state.learnerName);
  const askTutorQuery = useStore((state) => state.askTutorQuery);
  const setAskTutorQuery = useStore((state) => state.setAskTutorQuery);
  const activeProject = useStore((state) => state.activeProject);
  const setActiveProject = useStore((state) => state.setActiveProject);
  const activeLearningBookId = useStore((state) => state.activeLearningBookId);
  const setActiveLearningBookId = useStore(
    (state) => state.setActiveLearningBookId,
  );
  const ttsVoice = useStore((state) => state.ttsVoice);
  const setActiveView = useStore((state) => state.setActiveView);
  const aiModel = useStore((state) => state.aiModel);
  const animationsEnabled = useStore((state) => state.animationsEnabled);
  const systemPrompt = useStore((state) => state.systemPrompt);
  const recordChatUsage = useStore((state) => state.recordChatUsage);
  const recordVoiceUsage = useStore((state) => state.recordVoiceUsage);
  const recordWebUsage = useStore((state) => state.recordWebUsage);
  const recordWebSearchEvent = useStore((state) => state.recordWebSearchEvent);
  const cacheWebSources = useStore((state) => state.cacheWebSources);
  const selectedTextContext = useStore((state) => state.selectedTextContext);
  const setSelectedTextContext = useStore(
    (state) => state.setSelectedTextContext,
  );
  const messages = useStore((state) => state.messages);
  const setMessages = useStore((state) => state.setMessages);
  const setIsVoiceActive = useStore((state) => state.setIsVoiceActive);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearchSkillActive, setIsSearchSkillActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveringContainer, setIsHoveringContainer] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sendState, setSendState] = useState<"idle" | "sending" | "success">(
    "idle",
  );
  const [isPlayingTTS, setIsPlayingTTS] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollPaused = useRef(false);
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);

  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "speaking"
  >("idle");
  const [voiceCaption, setVoiceCaption] = useState<{
    role: "user" | "assistant";
    text: string;
  } | null>(null);
  // Diagram Aria is currently teaching with (rendered as Mermaid), plus the
  // ordered walkthrough steps and which step the camera is focused on.
  const [voiceDiagram, setVoiceDiagram] = useState<VoiceDiagramData | null>(
    null,
  );
  // True from the moment Aria requests a diagram until it has finished
  // rendering, so the blob can morph into a loading state and the diagram can
  // fade in seamlessly.
  const [diagramLoading, setDiagramLoading] = useState(false);
  const diagramLoadStartRef = useRef(0);
  // Real internet image Aria is currently showing, plus its loading state.
  const [voiceImage, setVoiceImage] = useState<VoiceImageData | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  // An ordered image sequence (story/timeline) revealed step-by-step in sync
  // with Aria's narration.
  const [voiceImageSeq, setVoiceImageSeq] = useState<VoiceImageSeqData | null>(
    null,
  );
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);
  // Counts consecutive loud mic frames while Aria is speaking, used to trigger
  // an instant local barge-in without waiting for Deepgram's round-trip.
  const bargeInFramesRef = useRef(0);
  // Adaptive ambient-noise floor (EMA of quiet frames). Barge-in must clear this
  // by a margin, so a noisy room or auto-gain hiss never falsely interrupts Aria.
  const noiseFloorRef = useRef(0.06);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputRafRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const voiceTurnsRef = useRef<
    {
      role: "user" | "assistant";
      content: string;
      diagram?: { title?: string; mermaid: string };
      image?: { url: string; caption?: string };
    }[]
  >([]);

  const forceScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      requestAnimationFrame(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;
        scrollEl.scrollTo({
          top: scrollEl.scrollHeight,
          behavior,
        });
      });
    },
    [],
  );

  useEffect(() => {
    setIsVoiceActive(voiceState !== "idle" || isPlayingTTS !== null);
  }, [voiceState, isPlayingTTS, setIsVoiceActive]);
  const lastVoiceUserMessageRef = useRef("");
  const learningBooks =
    useLiveQuery(
      () => db.learningBooks.orderBy("updatedAt").reverse().toArray(),
      [],
    ) || [];
  const activeLearningBook = activeLearningBookId
    ? learningBooks.find((book) => book.id === activeLearningBookId)
    : undefined;

  useEffect(() => {
    if (learningBooks.length === 0) return;
    const selectedBook = activeLearningBookId
      ? learningBooks.find((book) => book.id === activeLearningBookId)
      : undefined;
    if (selectedBook) return;

    const matchingBook = learningBooks.find(
      (book) => book.title.toLowerCase() === activeProject.toLowerCase(),
    );
    const nextBook = matchingBook || learningBooks[0];
    setActiveLearningBookId(nextBook.id);
    setActiveProject(nextBook.title);
  }, [
    activeLearningBookId,
    activeProject,
    learningBooks,
    setActiveLearningBookId,
    setActiveProject,
  ]);

  useEffect(() => {
    const handleLearningBookUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ bookId?: string; title?: string }>)
        .detail;
      if (!detail?.bookId || !detail?.title) return;
      setActiveLearningBookId(detail.bookId);
      setActiveProject(detail.title);
    };
    window.addEventListener("learning-book-updated", handleLearningBookUpdate);
    return () =>
      window.removeEventListener(
        "learning-book-updated",
        handleLearningBookUpdate,
      );
  }, [setActiveLearningBookId, setActiveProject]);

  useEffect(() => {
    return () => {
      // @ts-ignore
      if (window.currentAudio) {
        // @ts-ignore
        window.currentAudio.pause();
        // @ts-ignore
        window.currentAudio = null;
      }
    };
  }, []);

  const isProjectDropdownOpenState = useState(false);
  const isProjectDropdownOpen = isProjectDropdownOpenState[0];
  const setIsProjectDropdownOpen = isProjectDropdownOpenState[1];

  const isValid =
    input.length === 0 || /^[a-zA-Z0-9\s.,!?'"()\-:;\n]*$/.test(input);
  const isActive = input.length > 0;

  const thinkingSteps = [
    "Reading context...",
    "Linking concepts...",
    "Synthesizing answer...",
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sendState === "sending") {
      setThinkingStep(0);
      interval = setInterval(() => {
        setThinkingStep((s) => (s + 1) % 3);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [sendState]);

  const generateVoiceTitle = async (sessionId: string, transcript: string) => {
    try {
      const res = await fetch("/api/title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey ? `Bearer ${apiKey}` : "",
        },
        body: JSON.stringify({ text: transcript }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const title = (data?.title || "").trim();
      if (!title) return;
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === sessionId);
        if (idx === -1 || !prev[idx].voiceSession) return prev;
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          voiceSession: { ...copy[idx].voiceSession, title },
        };
        return copy;
      });
    } catch (e) {
      console.warn("[ChatPanel] Voice title generation failed:", e);
    }
  };

  const handleDiagramError = useCallback(() => {
    setVoiceDiagram(null);
    setDiagramLoading(false);
  }, []);

  // The diagram finished rendering. Keep the loading state visible for a brief
  // minimum so the blob→diagram hand-off always feels intentional (never a
  // flash), then reveal the diagram — the walkthrough then self-runs.
  const handleDiagramReady = useCallback(() => {
    const elapsed = Date.now() - diagramLoadStartRef.current;
    const remaining = Math.max(0, 900 - elapsed);
    setTimeout(() => setDiagramLoading(false), remaining);
  }, []);

  const stopVoice = () => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
    setVoiceDiagram(null);
    setDiagramLoading(false);
    setVoiceImage(null);
    setVoiceImageSeq(null);
    setImageLoading(false);
    endingRef.current = false;
    if (outputRafRef.current !== null) {
      cancelAnimationFrame(outputRafRef.current);
      outputRafRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    outputGainRef.current = null;
    outputAnalyserRef.current = null;
    activeAudioNodesRef.current = [];
    // Reset reactive blob levels.
    window.dispatchEvent(new CustomEvent("mic-volume", { detail: 0 }));
    window.dispatchEvent(new CustomEvent("tts-volume", { detail: 0 }));
    setVoiceCaption(null);

    // Finalize the voice session: stamp the elapsed time, or drop it if empty.
    const sessionId = voiceSessionIdRef.current;
    if (sessionId) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === sessionId);
        if (idx === -1) return prev;
        const session = prev[idx].voiceSession;
        if (!session || session.turns.length === 0) {
          return prev.filter((m) => m.id !== sessionId);
        }
        const durationSeconds = Math.max(
          session.durationSeconds,
          Math.round((Date.now() - session.startedAt) / 1000),
        );
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          voiceSession: {
            ...session,
            durationSeconds,
            title: session.title || deriveFallbackTitle(session.turns),
          },
        };
        return copy;
      });

      // Generate a concise title for the collapsed session card.
      const turns = voiceTurnsRef.current;
      if (turns.length > 0) {
        const transcript = turns
          .map(
            (t) =>
              `${t.role === "user" ? "Student" : "Tutor"}: ${t.content}`,
          )
          .join("\n");
        void generateVoiceTitle(sessionId, transcript);
      }
      voiceSessionIdRef.current = null;
    }
    voiceTurnsRef.current = [];

    setVoiceState("idle");
  };

  // Appends a turn to the active voice session (dedupes identical consecutive
  // turns, e.g. when Deepgram echoes an injected text message).
  const appendVoiceTurn = (role: "user" | "assistant", content: string) => {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId || !content) return;
    const last = voiceTurnsRef.current[voiceTurnsRef.current.length - 1];
    if (last && last.role === role && last.content.trim() === content.trim()) {
      return;
    }
    voiceTurnsRef.current = [...voiceTurnsRef.current, { role, content }];
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === sessionId);
      if (idx === -1) return prev;
      const session = prev[idx].voiceSession || {
        turns: [],
        startedAt: Date.now(),
        durationSeconds: 0,
      };
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        voiceSession: {
          ...session,
          turns: [
            ...session.turns,
            { id: Date.now().toString() + Math.random(), role, content },
          ],
          durationSeconds: Math.max(
            session.durationSeconds,
            Math.round((Date.now() - session.startedAt) / 1000),
          ),
        },
      };
      return copy;
    });
  };

  // Records a diagram Aria drew as an inline entry in the session transcript, so
  // the chat keeps the visual context after the voice session ends.
  const appendVoiceDiagram = (diagram: { title?: string; mermaid: string }) => {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId || !diagram.mermaid) return;
    const last = voiceTurnsRef.current[voiceTurnsRef.current.length - 1];
    if (last?.diagram?.mermaid === diagram.mermaid) return;
    voiceTurnsRef.current = [
      ...voiceTurnsRef.current,
      { role: "assistant", content: "", diagram },
    ];
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === sessionId);
      if (idx === -1) return prev;
      const session = prev[idx].voiceSession || {
        turns: [],
        startedAt: Date.now(),
        durationSeconds: 0,
      };
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        voiceSession: {
          ...session,
          turns: [
            ...session.turns,
            {
              id: Date.now().toString() + Math.random(),
              role: "assistant",
              content: "",
              diagram,
            },
          ],
        },
      };
      return copy;
    });
  };

  // Records an internet image Aria showed as an inline entry in the session
  // transcript, so the chat keeps the visual context after the session ends.
  const appendVoiceImage = (image: { url: string; caption?: string }) => {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId || !image.url) return;
    const last = voiceTurnsRef.current[voiceTurnsRef.current.length - 1];
    if (last?.image?.url === image.url) return;
    voiceTurnsRef.current = [
      ...voiceTurnsRef.current,
      { role: "assistant", content: "", image },
    ];
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === sessionId);
      if (idx === -1) return prev;
      const session = prev[idx].voiceSession || {
        turns: [],
        startedAt: Date.now(),
        durationSeconds: 0,
      };
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        voiceSession: {
          ...session,
          turns: [
            ...session.turns,
            {
              id: Date.now().toString() + Math.random(),
              role: "assistant",
              content: "",
              image,
            },
          ],
        },
      };
      return copy;
    });
  };

  // Fetches a real image from the internet for Aria's show_image function. Tries
  // the candidate results in order and resolves the first that actually loads,
  // so broken/hotlink-blocked URLs are skipped gracefully.
  const fetchAndPreloadImage = async (query: string): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(
        `/api/image-search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      ).finally(() => clearTimeout(timeout));
      if (!res.ok) return null;
      const data = await res.json();
      const candidates: string[] = (data.images || [])
        .map((img: any) => img?.imageUrl)
        .filter((u: any) => typeof u === "string" && /^https?:\/\//.test(u));
      for (const url of candidates.slice(0, 5)) {
        const ok = await new Promise<boolean>((resolve) => {
          const probe = new Image();
          const done = (v: boolean) => {
            probe.onload = null;
            probe.onerror = null;
            resolve(v);
          };
          probe.onload = () => done(probe.naturalWidth > 0);
          probe.onerror = () => done(false);
          probe.src = url;
          setTimeout(() => done(false), 6000);
        });
        if (ok) return url;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Turns Aria's plain-English diagram description into Mermaid code via the
  // server, so the voice model itself never produces (or speaks) any code.
  const generateMermaid = async (spec: string): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch("/api/generate-mermaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      if (!res.ok) return null;
      const data = await res.json();
      const mermaid = typeof data?.mermaid === "string" ? data.mermaid.trim() : "";
      return mermaid || null;
    } catch {
      return null;
    }
  };

  // Sends a typed message during a voice session — treated as the learner's
  // spoken turn via Deepgram's InjectUserMessage.
  const sendVoiceText = (text: string) => {
    const trimmed = text.trim();
    const ws = wsRef.current;
    if (!trimmed || !ws || ws.readyState !== WebSocket.OPEN) return;
    appendVoiceTurn("user", trimmed);
    lastVoiceUserMessageRef.current = trimmed;
    setVoiceCaption({ role: "user", text: trimmed });
    if (!endingRef.current && detectEndIntent(trimmed)) {
      endingRef.current = true;
      activeAudioNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch (err) {}
      });
      activeAudioNodesRef.current = [];
      setVoiceCaption(null);
      endTimerRef.current = setTimeout(() => stopVoice(), 250);
      return;
    }
    ws.send(JSON.stringify({ type: "InjectUserMessage", content: trimmed }));
  };

  const startVoice = async () => {
    if (!apiKey) {
      alert(
        "Please configure your OpenRouter API Key in the settings (top right) before using Voice features.",
      );
      return;
    }

    try {
      endingRef.current = false;
      voiceTurnsRef.current = [];
      // Open a single collapsible session entry that all turns append into.
      const sessionId = `voice-${Date.now()}`;
      voiceSessionIdRef.current = sessionId;
      setMessages((prev) => [
        ...prev,
        {
          id: sessionId,
          role: "assistant",
          content: "",
          isVoice: true,
          voiceSession: {
            turns: [],
            startedAt: Date.now(),
            durationSeconds: 0,
          },
        },
      ]);
      setVoiceState("listening");
      // Echo cancellation lets the mic stay live while Aria speaks without
      // feeding her own voice back in — this is what enables barge-in.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Output chain: TTS sources -> gain -> analyser -> speakers. The analyser
      // lets us read the agent's voice level so the universe blob can react to
      // Aria speaking, mirroring how mic volume drives it while listening.
      const outputGain = audioContext.createGain();
      const outputAnalyser = audioContext.createAnalyser();
      outputAnalyser.fftSize = 256;
      outputAnalyser.smoothingTimeConstant = 0.6;
      outputGain.connect(outputAnalyser);
      outputAnalyser.connect(audioContext.destination);
      outputGainRef.current = outputGain;
      outputAnalyserRef.current = outputAnalyser;

      const outputBuffer = new Uint8Array(outputAnalyser.fftSize);
      const sampleOutput = () => {
        const analyser = outputAnalyserRef.current;
        if (analyser) {
          analyser.getByteTimeDomainData(outputBuffer);
          let sum = 0;
          for (let i = 0; i < outputBuffer.length; i++) {
            const v = (outputBuffer[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / outputBuffer.length);
          window.dispatchEvent(
            new CustomEvent("tts-volume", { detail: Math.min(1, rms * 3.5) }),
          );
        }
        outputRafRef.current = requestAnimationFrame(sampleOutput);
      };
      outputRafRef.current = requestAnimationFrame(sampleOutput);

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/voice-agent?openRouterKey=${encodeURIComponent(apiKey)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(1, rms * 8); // Scale
        window.dispatchEvent(new CustomEvent("mic-volume", { detail: volume }));

        // Continuously learn the room's ambient noise level from quiet frames so
        // the barge-in threshold tracks the environment (auto-gain hiss, fans,
        // typing) instead of a fixed value that's too sensitive in noisy rooms.
        if (volume < 0.28) {
          noiseFloorRef.current = noiseFloorRef.current * 0.95 + volume * 0.05;
        }

        // Instant local barge-in: if Aria is currently playing audio and the
        // learner clearly starts talking over her, cut her off rather than
        // waiting for Deepgram's server-side UserStartedSpeaking. To avoid false
        // triggers from ambient noise/echo, the mic must rise well above the
        // learned noise floor (and an absolute floor) for ~0.5s of sustained
        // frames before we treat it as real speech.
        const bargeThreshold = Math.max(
          0.46,
          noiseFloorRef.current * 2.5 + 0.24,
        );
        if (activeAudioNodesRef.current.length > 0) {
          if (volume > bargeThreshold) {
            bargeInFramesRef.current += 1;
            if (bargeInFramesRef.current >= 6) {
              activeAudioNodesRef.current.forEach((node) => {
                try {
                  node.stop();
                } catch (err) {}
              });
              activeAudioNodesRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
              setVoiceCaption(null);
              setVoiceState("listening");
              bargeInFramesRef.current = 0;
            }
          } else {
            bargeInFramesRef.current = 0;
          }
        } else {
          bargeInFramesRef.current = 0;
        }

        // Always stream mic audio — even while Aria is speaking — so Deepgram
        // can detect barge-in and interrupt her mid-sentence to listen.
        if (ws.readyState === WebSocket.OPEN) {
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
          }
          ws.send(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      ws.onopen = () => {
        console.log("Connected to Deepgram proxy");
        // Settings config is sent by the proxy. We just stream audio now.
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === "usage" && msg.usage) {
              recordVoiceUsage(msg.usage);
            } else if (msg.type === "SettingsApplied") {
              console.log("Deepgram SettingsApplied");
            } else if (msg.type === "ConversationText") {
              if (msg.content) {
                setVoiceCaption({
                  role: msg.role === "user" ? "user" : "assistant",
                  text: msg.content,
                });
              }
              if (msg.role === "user") {
                lastVoiceUserMessageRef.current = msg.content || "";
                appendVoiceTurn("user", msg.content || "");
                // Semantically end the session if the learner signals they're
                // done — close straight away, no further conversation.
                if (!endingRef.current && detectEndIntent(msg.content || "")) {
                  endingRef.current = true;
                  // Silence Aria instantly if she's mid-sentence.
                  activeAudioNodesRef.current.forEach((node) => {
                    try {
                      node.stop();
                    } catch (err) {}
                  });
                  activeAudioNodesRef.current = [];
                  setVoiceCaption(null);
                  endTimerRef.current = setTimeout(() => stopVoice(), 250);
                  return;
                }
              } else if (msg.role === "assistant") {
                appendVoiceTurn("assistant", msg.content || "");
                if (lastVoiceUserMessageRef.current && msg.content) {
                  const userMessage = lastVoiceUserMessageRef.current;
                  lastVoiceUserMessageRef.current = "";
                  brainOrchestrator.trackInteraction(userMessage, msg.content);
                  void brainOrchestrator
                    .updateLearningBookFromConversation({
                      userName: learnerName,
                      activeProject,
                      activeBookId: activeLearningBookId,
                      userMessage,
                      assistantMessage: msg.content,
                      apiKey,
                    })
                    .catch((error) => {
                      console.warn(
                        "[ChatPanel] Voice learning book update failed:",
                        error,
                      );
                    });
                }
              }
            } else if (msg.type === "UserStartedSpeaking") {
              // Interrupt playing
              activeAudioNodesRef.current.forEach((node) => {
                try {
                  node.stop();
                } catch (e) {}
              });
              activeAudioNodesRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
              // Clear the previous caption — the user is talking now.
              setVoiceCaption(null);
              setVoiceState("listening");
            } else if (msg.type === "FunctionCallRequest") {
              // Aria wants to draw something. Render it and acknowledge so she
              // continues into the spoken walkthrough.
              const calls: any[] = Array.isArray(msg.functions)
                ? msg.functions
                : msg.function_name
                  ? [
                      {
                        id: msg.function_call_id || msg.id,
                        name: msg.function_name,
                        arguments: msg.input ?? msg.arguments,
                      },
                    ]
                  : [];
              for (const call of calls) {
                const parseArgs = () => {
                  try {
                    return typeof call.arguments === "string"
                      ? JSON.parse(call.arguments)
                      : call.arguments || {};
                  } catch {
                    return {};
                  }
                };
                if (call?.name === "render_diagram") {
                  // The voice model only sends a plain-English `spec`; we turn it
                  // into Mermaid server-side so the model never touches (or can
                  // read aloud) any diagram code. Async, like show_image.
                  const args = parseArgs();
                  const spec = String(args.spec || args.mermaid || "").trim();
                  const title = args.title ? String(args.title) : undefined;
                  const steps: DiagramStep[] = Array.isArray(args.steps)
                    ? args.steps
                        .map((s: any) => ({
                          nodeIds: Array.isArray(s?.nodeIds)
                            ? s.nodeIds.map(String)
                            : [],
                          caption: String(s?.caption || ""),
                        }))
                        .filter((s: DiagramStep) => s.caption)
                    : [];
                  // A diagram replaces any image currently on stage.
                  setVoiceImage(null);
                  setVoiceImageSeq(null);
                  setImageLoading(false);
                  if (spec) {
                    diagramLoadStartRef.current = Date.now();
                    setDiagramLoading(true);
                    // PARALLEL: acknowledge immediately so Aria starts speaking
                    // right away, and generate/render the diagram in the
                    // background so it appears alongside her narration instead of
                    // blocking her response while we build it.
                    if (ws.readyState === WebSocket.OPEN && call?.id) {
                      ws.send(
                        JSON.stringify({
                          type: "FunctionCallResponse",
                          id: call.id,
                          name: call.name,
                          content:
                            "The diagram is being prepared and will appear on screen momentarily — start explaining the concept now, part by part.",
                        }),
                      );
                    }
                    (async () => {
                      const mermaid = await generateMermaid(spec);
                      if (mermaid) {
                        setVoiceDiagram({ title, mermaid, steps });
                        appendVoiceDiagram({ title, mermaid });
                      } else {
                        setDiagramLoading(false);
                        setVoiceDiagram(null);
                      }
                    })();
                    continue;
                  } else if (ws.readyState === WebSocket.OPEN && call?.id) {
                    ws.send(
                      JSON.stringify({
                        type: "FunctionCallResponse",
                        id: call.id,
                        name: call.name,
                        content: "No description provided; continue without a diagram.",
                      }),
                    );
                  }
                  // render_diagram responds asynchronously; skip the sync ack.
                  continue;
                } else if (call?.name === "show_image") {
                  // Async: fetch a real image, then acknowledge once resolved so
                  // Aria narrates only after the picture is on screen.
                  const args = parseArgs();
                  const query = String(args.query || "").trim();
                  const caption = args.caption
                    ? String(args.caption)
                    : undefined;
                  // A new image replaces any diagram currently on stage.
                  setVoiceDiagram(null);
                  setDiagramLoading(false);
                  if (query) {
                    setVoiceImageSeq(null);
                    setImageLoading(true);
                    // PARALLEL: acknowledge now so Aria starts describing it
                    // immediately; the image loads in the background.
                    if (ws.readyState === WebSocket.OPEN && call?.id) {
                      ws.send(
                        JSON.stringify({
                          type: "FunctionCallResponse",
                          id: call.id,
                          name: call.name,
                          content:
                            "The image is being pulled up and will appear momentarily — start describing what it shows now.",
                        }),
                      );
                    }
                    (async () => {
                      const url = await fetchAndPreloadImage(query);
                      if (url) {
                        setVoiceImage({ url, caption, query });
                        setImageLoading(false);
                        appendVoiceImage({ url, caption });
                      } else {
                        setImageLoading(false);
                        setVoiceImage(null);
                      }
                    })();
                  } else if (ws.readyState === WebSocket.OPEN && call?.id) {
                    ws.send(
                      JSON.stringify({
                        type: "FunctionCallResponse",
                        id: call.id,
                        name: call.name,
                        content: "No query provided; continue without an image.",
                      }),
                    );
                  }
                  // show_image responds asynchronously; skip the sync ack below.
                  continue;
                } else if (call?.name === "show_images") {
                  // Async: fetch the whole ordered set up front, then reveal them
                  // one at a time in sync with narration (handled by the client).
                  const args = parseArgs();
                  const rawItems: { query: string; caption: string }[] =
                    Array.isArray(args.items)
                      ? args.items
                          .map((it: any) => ({
                            query: String(it?.query || "").trim(),
                            caption: String(it?.caption || "").trim(),
                          }))
                          .filter((it: any) => it.query)
                      : [];
                  setVoiceDiagram(null);
                  setDiagramLoading(false);
                  setVoiceImage(null);
                  if (rawItems.length > 0) {
                    setImageLoading(true);
                    // PARALLEL: acknowledge now so Aria starts narrating the
                    // sequence immediately; images preload in the background and
                    // each reveals as she reaches its caption.
                    if (ws.readyState === WebSocket.OPEN && call?.id) {
                      ws.send(
                        JSON.stringify({
                          type: "FunctionCallResponse",
                          id: call.id,
                          name: call.name,
                          content:
                            "The images are being prepared and will reveal one at a time as you speak — start narrating each caption in order now.",
                        }),
                      );
                    }
                    (async () => {
                      const resolved = (
                        await Promise.all(
                          rawItems.map(async (it) => {
                            const url = await fetchAndPreloadImage(it.query);
                            return url
                              ? { url, caption: it.caption, query: it.query }
                              : null;
                          }),
                        )
                      ).filter(
                        (r): r is { url: string; caption: string; query: string } =>
                          !!r,
                      );
                      if (resolved.length > 0) {
                        setVoiceImageSeq({ items: resolved });
                        setImageLoading(false);
                        // Keep every image in the transcript for later context.
                        resolved.forEach((r) =>
                          appendVoiceImage({ url: r.url, caption: r.caption }),
                        );
                      } else {
                        setImageLoading(false);
                        setVoiceImageSeq(null);
                      }
                    })();
                  } else if (ws.readyState === WebSocket.OPEN && call?.id) {
                    ws.send(
                      JSON.stringify({
                        type: "FunctionCallResponse",
                        id: call.id,
                        name: call.name,
                        content: "No items provided; continue without images.",
                      }),
                    );
                  }
                  // show_images responds asynchronously; skip the sync ack below.
                  continue;
                } else if (call?.name === "clear_diagram") {
                  // Aria is done with the visual — tuck it away and bring the
                  // blob back to center.
                  setVoiceDiagram(null);
                  setDiagramLoading(false);
                  setVoiceImage(null);
                  setVoiceImageSeq(null);
                  setImageLoading(false);
                }
                if (ws.readyState === WebSocket.OPEN && call?.id) {
                  ws.send(
                    JSON.stringify({
                      type: "FunctionCallResponse",
                      id: call.id,
                      name: call.name,
                      content:
                        call.name === "clear_diagram"
                          ? "Visual cleared."
                          : "Diagram rendered on the learner's screen.",
                    }),
                  );
                }
              }
            } else if (msg.type === "AgentStartedSpeaking") {
              setVoiceState("speaking");
            } else if (msg.type === "AgentFinishedSpeaking") {
              setVoiceState("listening");
            } else if (msg.type === "Error") {
              console.error("Deepgram Error", msg);
              stopVoice();
            }
          } catch (e) {
            console.log("Non-JSON message from Deepgram:", event.data);
          }
        } else if (event.data instanceof Blob) {
          // It's binary playing back from TTS
          const arrayBuffer = await event.data.arrayBuffer();
          const buffer = new Int16Array(arrayBuffer);
          const float32Data = new Float32Array(buffer.length);
          for (let i = 0; i < buffer.length; i++) {
            float32Data[i] = buffer[i] / 0x7fff;
          }

          if (audioContextRef.current) {
            const audioBuffer = audioContextRef.current.createBuffer(
              1,
              float32Data.length,
              48000,
            );
            audioBuffer.copyToChannel(float32Data, 0);

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(
              outputGainRef.current || audioContextRef.current.destination,
            );

            activeAudioNodesRef.current.push(source);
            source.onended = () => {
              activeAudioNodesRef.current = activeAudioNodesRef.current.filter(
                (n) => n !== source,
              );
            };

            if (
              nextPlayTimeRef.current <
              audioContextRef.current.currentTime + 0.05
            ) {
              nextPlayTimeRef.current =
                audioContextRef.current.currentTime + 0.15;
            }

            source.start(nextPlayTimeRef.current);
            nextPlayTimeRef.current += audioBuffer.duration;
          }
        }
      };

      ws.onclose = () => {
        stopVoice();
      };

      ws.onerror = (e) => {
        console.error("WS error: ", e);
        stopVoice();
      };
    } catch (err) {
      console.error("Voice start error", err);
      stopVoice();
    }
  };

  const toggleVoice = () => {
    if (voiceState === "idle") {
      startVoice();
    } else {
      stopVoice();
    }
  };

  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  const handleTTS = async (msgId: string, text: string) => {
    // @ts-ignore
    if (isPlayingTTS === msgId) {
      // @ts-ignore
      if (window.currentAudio) {
        // @ts-ignore
        window.currentAudio.pause();
        // @ts-ignore
        window.currentAudio = null;
      }
      setIsPlayingTTS(null);
      return;
    }

    // @ts-ignore
    if (window.currentAudio) {
      // @ts-ignore
      window.currentAudio.pause();
      // @ts-ignore
      if (window.currentAudio.src) URL.revokeObjectURL(window.currentAudio.src);
      // @ts-ignore
      window.currentAudio = null;
    }

    try {
      setIsPlayingTTS(msgId);
      // Strip markdown more thoroughly
      const cleanText = text
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/[*_#~>]/g, "")
        .trim();

      const safeText =
        cleanText.length > 1500
          ? cleanText.substring(0, 1500) + "..."
          : cleanText;
      const res = await fetch(
        `/api/tts?text=${encodeURIComponent(safeText)}&voice=${encodeURIComponent(ttsVoice || "aura-asteria-en")}`,
      );
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `TTS failed: ${res.status}` }));
        throw new Error(err.error || `TTS failed: ${res.status}`);
      }

      const usageCost = Number(res.headers.get("X-Usage-Cost") || 0);
      const usageChars = Number(
        res.headers.get("X-Usage-Input-Chars") || safeText.length,
      );
      const usageModel =
        res.headers.get("X-Usage-Model") || ttsVoice || "aura-asteria-en";
      recordVoiceUsage({
        provider: res.headers.get("X-Usage-Provider") || "deepgram",
        ttsModel: usageModel,
        ttsCharacters: usageChars,
        cost: usageCost,
        estimated: res.headers.get("X-Usage-Estimated") === "true",
      });

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audioObj = new Audio(objectUrl);

      // @ts-ignore
      window.currentAudio = audioObj;

      audioObj.onended = () => {
        setIsPlayingTTS(null);
        // @ts-ignore
        window.currentAudio = null;
        URL.revokeObjectURL(objectUrl);
      };

      audioObj.onerror = () => {
        setIsPlayingTTS(null);
        // @ts-ignore
        window.currentAudio = null;
        URL.revokeObjectURL(objectUrl);
      };

      await audioObj.play();
    } catch (err) {
      console.error(err);
      setIsPlayingTTS(null);
    }
  };

  const estimateTokens = (value: string) =>
    Math.max(1, Math.ceil(value.length / 4));

  const sendMessage = async (text: string) => {
    if (!text.trim() || sendState !== "idle") return;
    if (!apiKey) {
      alert(
        "Please configure your OpenRouter API Key in the settings (top right).",
      );
      return;
    }

    audio.playClick();
    setSendState("sending");

    const searchPrefix = isSearchSkillActive
      ? `[SYSTEM: The user has explicitly selected the Web Search skill. You MUST use the web_search tool to answer this query.]\n\n`
      : ``;

    const userMsgContent =
      searchPrefix +
      (selectedTextContext
        ? `Regarding this selected text:\n\n> ${selectedTextContext}\n\n${text.trim()}`
        : text.trim());

    setSelectedTextContext("");
    setInput("");
    setIsSearchSkillActive(false);

    const newMessages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: userMsgContent,
      },
    ];
    const assistantMsgId = crypto.randomUUID();
    setMessages([
      ...newMessages,
      {
        id: assistantMsgId,
        role: "assistant" as const,
        content: "",
        hasFlashcards: false,
        phase: "retrieving" as const,
        reasoningSteps: [
          {
            id: crypto.randomUUID(),
            content: "Retrieving relevant contextual knowledge...",
          },
        ],
        webSearch: { active: false, sources: [] },
        sources: [],
      },
    ]);
    isAutoScrollPaused.current = false;
    forceScrollToBottom("smooth");
    setIsTyping(true);

    try {
      const canvas = document.querySelector(
        ".react-pdf__Page__canvas",
      ) as HTMLCanvasElement;
      let currentPageImage = null;
      const needsVision =
        /page|this|image|look|what|read|pdf|diagram|chart|graph|screen|visible|shown|display|see|seeing/i.test(
          userMsgContent,
        );
      if (needsVision && canvas) {
        try {
          const MAX_SIZE = 1024;
          let width = canvas.width;
          let height = canvas.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          const offscreen = document.createElement("canvas");
          offscreen.width = width;
          offscreen.height = height;
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, width, height);
            currentPageImage = offscreen.toDataURL("image/jpeg", 0.6);
          } else {
            currentPageImage = canvas.toDataURL("image/jpeg", 0.5);
          }
        } catch (visionErr) {
          console.warn("Could not extract vision image:", visionErr);
        }
      }

      const relatedMemoryContext =
        await brainOrchestrator.getRelevantContext(userMsgContent);
      let activeBookContext = "";
      if (activeLearningBookId) {
        const book = await db.learningBooks
          .get(activeLearningBookId)
          .catch(() => undefined);
        if (book) {
          const bookConcepts = await db.learningBookConcepts
            .where("bookId")
            .equals(book.id)
            .limit(12)
            .toArray()
            .catch(() => []);
          activeBookContext = [
            "### Active Library Book Context",
            `Book: ${book.title}`,
            `Overview: ${book.overview || "Pending"}`,
            `Knowledge Summary: ${book.knowledgeSummary || book.summary || "Pending"}`,
            `Chapters: ${
              (book.chapters || [])
                .slice(-5)
                .map((chapter) => chapter.title)
                .join(", ") || "None yet"
            }`,
            bookConcepts.length
              ? `Mapped Concepts: ${bookConcepts.map((concept) => `${concept.name} (${Math.round((concept.confidence || 0) * 100)}%)`).join(", ")}`
              : "Mapped Concepts: None yet",
          ].join("\n");
        }
      }
      const memoryContext = [relatedMemoryContext, activeBookContext]
        .filter(Boolean)
        .join("\n\n");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                phase: "thinking",
                reasoningSteps: [
                  ...(m.reasoningSteps || []),
                  { id: crypto.randomUUID(), content: "Linking concepts..." },
                ],
              }
            : m,
        ),
      );

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(serperApiKey ? { "X-Serper-API-Key": serperApiKey } : {}),
        },
        body: JSON.stringify({
          // Flatten grouped voice sessions back into individual turns so the
          // model still sees the full conversation context.
          messages: newMessages.flatMap((m: any) =>
            m.voiceSession
              ? m.voiceSession.turns.map((t: any) => ({
                  role: t.role,
                  content: t.content,
                }))
              : [m],
          ),
          currentPageImage,
          memoryContext,
          aiModel,
          customPrompt: systemPrompt,
          activeProject: activeLearningBook?.title || activeProject,
          activeBookId: activeLearningBookId,
          serperApiKey: serperApiKey || undefined,
        }),
      });

      if (!res.ok) {
        let errorData = { error: "Failed to fetch response" };
        try {
          errorData = await res.json();
        } catch (e) {
          errorData.error = `HTTP Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorData.error || "Failed to fetch response");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                phase: "synthesizing",
                reasoningSteps: [
                  ...(m.reasoningSteps || []),
                  {
                    id: crypto.randomUUID(),
                    content: "Synthesizing final answer...",
                  },
                ],
              }
            : m,
        ),
      );

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream from chat API");

      const decoder = new TextDecoder("utf-8");
      let currentContent = "";
      let buffer = "";
      let lastUpdateTime = Date.now();
      const liveInputEstimate = estimateTokens(userMsgContent);
      let liveOutputEstimate = 0;
      let messageUsage: NonNullable<Message["usage"]> = {
        provider: "openrouter",
        model: aiModel,
        inputTokens: liveInputEstimate,
        outputTokens: 0,
        cost: 0,
        estimated: true,
      };
      recordChatUsage({
        provider: "openrouter",
        model: aiModel,
        inputTokens: liveInputEstimate,
        outputTokens: 0,
        cost: 0,
        estimated: true,
        requests: 1,
      });
      const mergeSources = (
        current: NormalizedWebSource[] = [],
        incoming: NormalizedWebSource[] = [],
      ) => {
        const byUrl = new Map(current.map((source) => [source.url, source]));
        incoming.forEach((source) => byUrl.set(source.url, source));
        return Array.from(byUrl.values()).slice(0, 10);
      };
      const patchAssistantMessage = (
        patcher: (message: Message) => Message,
      ) => {
        setMessages((prev) => {
          const newM = [...prev];
          const msgIndex = newM.findIndex((m) => m.id === assistantMsgId);
          if (msgIndex !== -1) {
            newM[msgIndex] = patcher(newM[msgIndex]);
          }
          return newM;
        });
      };
      patchAssistantMessage((message) => ({
        ...message,
        usage: messageUsage,
      }));
      const recordWebTelemetry = (
        name: string,
        metadata: Record<string, unknown>,
      ) => {
        recordBrainRuntime({
          type: "web_search",
          name,
          metadata,
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE events are separated by double newlines (\n\n)
        const events = buffer.split("\n\n");
        // Keep the last (potentially incomplete) chunk in the buffer
        buffer = events.pop() || "";

        for (const event of events) {
          // Each SSE event can have multiple lines; find the 'data:' line
          const lines = event.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim(); // Remove "data:" prefix
            if (!jsonStr) continue;

            let data: any;
            try {
              data = JSON.parse(jsonStr);
            } catch {
              // Incomplete JSON fragment — skip silently
              continue;
            }

            if (data.type === "chunk") {
              currentContent += data.content;
              const nextLiveOutputEstimate = estimateTokens(currentContent);
              const outputDelta = nextLiveOutputEstimate - liveOutputEstimate;
              if (outputDelta > 0) {
                liveOutputEstimate = nextLiveOutputEstimate;
                messageUsage = {
                  ...messageUsage,
                  outputTokens: liveOutputEstimate,
                  estimated: true,
                };
                recordChatUsage({
                  provider: "openrouter",
                  model: aiModel,
                  outputTokens: outputDelta,
                  cost: 0,
                  estimated: true,
                  requests: 0,
                });
              }
              const now = Date.now();
              if (now - lastUpdateTime > 50) {
                lastUpdateTime = now;
                setMessages((prev) => {
                  const newM = [...prev];
                  const msgIndex = newM.findIndex(
                    (m) => m.id === assistantMsgId,
                  );
                  if (msgIndex !== -1) {
                    newM[msgIndex] = {
                      ...newM[msgIndex],
                      content: currentContent,
                      usage: messageUsage,
                    };
                  }
                  return newM;
                });
                forceScrollToBottom("auto");
              }
            } else if (data.type === "web_search_started") {
              recordWebSearchEvent({
                type: "started",
                searchId: data.searchId,
                query: data.query,
                mode: data.mode,
              });
              recordWebUsage({
                provider: "serper",
                requests: 1,
                searchRequests: data.mode === "news" ? 0 : 1,
                newsRequests: data.mode === "news" ? 1 : 0,
                estimated: true,
              });
              recordWebTelemetry(data.query || "web_search", {
                event: "started",
                searchId: data.searchId,
                mode: data.mode,
              });
              patchAssistantMessage((message) => ({
                ...message,
                phase: "web_search",
                webSearch: {
                  active: true,
                  query: data.query,
                  mode: data.mode,
                  status: "Searching web...",
                  sources: [],
                },
              }));
            } else if (data.type === "web_search_progress") {
              recordWebSearchEvent({
                type: "progress",
                searchId: data.searchId,
                status: data.status,
              });
              recordWebTelemetry(data.searchId || "web_search", {
                event: "progress",
                searchId: data.searchId,
                status: data.status,
              });
              patchAssistantMessage((message) => ({
                ...message,
                phase: "web_search",
                webSearch: {
                  active: true,
                  query: message.webSearch?.query,
                  mode: message.webSearch?.mode,
                  status: data.status,
                  sources: message.webSearch?.sources || [],
                },
              }));
            } else if (data.type === "web_result") {
              const source = data.source as NormalizedWebSource | undefined;
              if (!source) continue;
              recordWebSearchEvent({
                type: "result",
                searchId: data.searchId,
                source,
              });
              cacheWebSources([source]);
              recordWebTelemetry(source.domain || "web_result", {
                event: "result",
                searchId: data.searchId,
                url: source.url,
              });
              patchAssistantMessage((message) => {
                const sources = mergeSources(message.webSearch?.sources || [], [
                  source,
                ]);
                return {
                  ...message,
                  phase: "web_search",
                  webSearch: {
                    active: true,
                    query: message.webSearch?.query,
                    mode: message.webSearch?.mode,
                    status: `Reviewing ${sources.length} source${sources.length === 1 ? "" : "s"}...`,
                    sources,
                  },
                  sources: mergeSources(message.sources || [], [source]),
                };
              });
            } else if (data.type === "web_sources_complete") {
              const sources = (data.sources || []) as NormalizedWebSource[];
              recordWebSearchEvent({
                type: data.error ? "error" : "complete",
                searchId: data.searchId,
                sources,
                status:
                  data.error ||
                  `Reviewed ${sources.length} source${sources.length === 1 ? "" : "s"}`,
              });
              recordWebUsage({
                provider: "serper",
                sourcesReviewed: sources.length,
                failures: data.error ? 1 : 0,
                estimated: true,
              });
              if (sources.length) cacheWebSources(sources);
              recordWebTelemetry(data.searchId || "web_search", {
                event: data.error ? "error" : "complete",
                searchId: data.searchId,
                sourceCount: sources.length,
                error: data.error,
              });
              patchAssistantMessage((message) => {
                const mergedSources = mergeSources(
                  message.webSearch?.sources || [],
                  sources,
                );
                return {
                  ...message,
                  webSearch: {
                    active: false,
                    query: message.webSearch?.query,
                    mode: message.webSearch?.mode,
                    status:
                      data.error ||
                      (mergedSources.length
                        ? `Reviewed ${mergedSources.length} sources`
                        : "No web sources returned"),
                    sources: mergedSources,
                    error: data.error,
                  },
                  sources: mergeSources(message.sources || [], mergedSources),
                };
              });
            } else if (data.type === "done") {
              setSendState("success");
              const hasFlashcards =
                data.flashcardsUpdates && data.flashcardsUpdates.length > 0;
              const finalSources = (data.sources ||
                []) as NormalizedWebSource[];
              if (finalSources.length) cacheWebSources(finalSources);
              if (data.usage) {
                messageUsage = {
                  provider: data.usage.provider || "openrouter",
                  model:
                    data.usage.usedModel ||
                    data.usage.model ||
                    data.usage.requestedModel ||
                    aiModel,
                  inputTokens: Number(
                    data.usage.inputTokens || messageUsage.inputTokens || 0,
                  ),
                  outputTokens: Number(
                    data.usage.outputTokens || messageUsage.outputTokens || 0,
                  ),
                  cost: Number(data.usage.cost || 0),
                  estimated: Boolean(data.usage.estimated),
                };
                recordChatUsage({
                  provider: data.usage.provider || "openrouter",
                  model:
                    data.usage.usedModel ||
                    data.usage.model ||
                    data.usage.requestedModel ||
                    aiModel,
                  inputTokens:
                    Number(data.usage.inputTokens || 0) - liveInputEstimate,
                  outputTokens:
                    Number(data.usage.outputTokens || 0) - liveOutputEstimate,
                  cost: Number(data.usage.cost || 0),
                  estimated: Boolean(data.usage.estimated),
                  requests: 0,
                });
              } else {
                messageUsage = {
                  ...messageUsage,
                  outputTokens:
                    liveOutputEstimate || estimateTokens(data.content || ""),
                  estimated: true,
                };
              }
              setMessages((prev) => {
                const newM = [...prev];
                const msgIndex = newM.findIndex((m) => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  newM[msgIndex] = {
                    ...newM[msgIndex],
                    content: data.content,
                    hasFlashcards: hasFlashcards,
                    phase: "complete",
                    usage: messageUsage,
                    webSearch: newM[msgIndex].webSearch
                      ? {
                          ...newM[msgIndex].webSearch,
                          active: false,
                          sources: mergeSources(
                            newM[msgIndex].webSearch.sources,
                            finalSources,
                          ),
                        }
                      : undefined,
                    sources: mergeSources(
                      newM[msgIndex].sources || [],
                      finalSources,
                    ),
                  };
                }
                return newM;
              });

              brainOrchestrator.trackInteraction(userMsgContent, data.content);
              void brainOrchestrator
                .updateLearningBookFromConversation({
                  userName: learnerName,
                  activeProject,
                  activeBookId: activeLearningBookId,
                  userMessage: userMsgContent,
                  assistantMessage: data.content,
                  apiKey,
                })
                .catch((error) => {
                  console.warn(
                    "[ChatPanel] Learning book update failed:",
                    error,
                  );
                });

              if (data.graphUpdates && data.graphUpdates.length > 0) {
                data.graphUpdates.forEach((update: any) => {
                  brainOrchestrator.addOrUpdateConcept(
                    update.name,
                    update.description,
                    update.understandingDelta,
                  );
                });
              }

              if (data.flashcardsUpdates && data.flashcardsUpdates.length > 0) {
                data.flashcardsUpdates.forEach((card: any) => {
                  db.flashcards
                    .add({
                      id: Math.random().toString(36).substring(2, 15),
                      conceptId: card.conceptId || "general",
                      bookId: activeLearningBookId || undefined,
                      bookTitle:
                        activeLearningBook?.title || activeProject || undefined,
                      front: card.front,
                      back: card.back,
                      nextReviewAt: Date.now(),
                    })
                    .catch(console.error);
                });
              }
            } else if (data.type === "status") {
              setMessages((prev) => {
                const newM = [...prev];
                const msgIndex = newM.findIndex((m) => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  newM[msgIndex] = { ...newM[msgIndex], phase: data.phase };
                }
                return newM;
              });
            } else if (data.type === "reasoning_summary") {
              setMessages((prev) => {
                const newM = [...prev];
                const msgIndex = newM.findIndex((m) => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  const currentSteps = newM[msgIndex].reasoningSteps || [];
                  newM[msgIndex] = {
                    ...newM[msgIndex],
                    reasoningSteps: [
                      ...currentSteps,
                      { id: crypto.randomUUID(), content: data.content },
                    ],
                  };
                }
                return newM;
              });
            } else if (data.type === "info") {
              currentContent += `> ⚠️ ${data.message}\n\n`;
              setMessages((prev) => {
                const newM = [...prev];
                const msgIndex = newM.findIndex((m) => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  newM[msgIndex] = {
                    ...newM[msgIndex],
                    content: currentContent,
                  };
                }
                return newM;
              });
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          }
        }
      }

      setSendState("idle");
    } catch (err: any) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `**Error:** ${err.message}`, phase: "complete" }
            : m,
        ),
      );
      setSendState("idle");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    // During a voice session, typed text counts as the learner's spoken turn.
    if (
      voiceState !== "idle" &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      sendVoiceText(currentInput);
      return;
    }
    sendMessage(currentInput);
  };

  useEffect(() => {
    if (askTutorQuery) {
      setInput((prev) =>
        prev ? prev + "\n\n" + askTutorQuery : askTutorQuery,
      );
      setAskTutorQuery("");
    }
  }, [askTutorQuery, setAskTutorQuery]);

  // When selectedTextContext changes (from PDF "Ask Tutor" button), auto-focus input
  useEffect(() => {
    if (selectedTextContext) {
      setInput("");
    }
  }, [selectedTextContext]);

  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (
      sendState !== "idle" ||
      (lastMessage?.role === "assistant" &&
        lastMessage.id !== "1" &&
        lastMessage.content.length > 0)
    ) {
      isAutoScrollPaused.current = false;
      forceScrollToBottom(sendState === "sending" ? "smooth" : "auto");
    }
  }, [
    forceScrollToBottom,
    lastMessage?.content,
    lastMessage?.id,
    lastMessage?.phase,
    lastMessage?.role,
    sendState,
  ]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Track manual scrolling to pause auto-scroll
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      isAutoScrollPaused.current = !isNearBottom;
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    // Use ResizeObserver to detect content height changes (like streaming text)
    const resizeObserver = new ResizeObserver(() => {
      if (!isAutoScrollPaused.current || sendState !== "idle") {
        scrollEl.scrollTo({
          top: scrollEl.scrollHeight,
          behavior: sendState === "idle" ? "smooth" : "auto",
        });
      }
    });

    // Observe the single direct child (the inner container) or the scrollEl itself
    resizeObserver.observe(scrollEl);
    if (scrollEl.firstElementChild) {
      resizeObserver.observe(scrollEl.firstElementChild);
    }

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [sendState]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // During voice mode the panel becomes the dark "universe" — the chrome turns
  // to glass/black instead of jarring white.
  const voiceActive = voiceState !== "idle";

  return (
    <div className="flex flex-col h-full bg-transparent relative z-10 w-full overflow-hidden">
      {/* Dynamic Header */}
      <div
        data-tutor-chat-header
        className={`absolute top-0 w-full px-6 py-4 pt-6 shrink-0 border-b backdrop-blur-xl flex items-center justify-between pointer-events-none transition-colors duration-500 ${
          voiceActive
            ? "z-[140] border-white/10 bg-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
            : "z-40 border-zinc-200/70 bg-[rgba(253,253,253,0.98)] shadow-[0_12px_36px_rgba(255,255,255,0.92)]"
        }`}
      >
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors duration-500 ${
                voiceActive
                  ? "bg-white/10 border border-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
                  : "bg-white border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
              }`}
            >
              <Sparkles
                size={14}
                className={voiceActive ? "text-white/80" : "text-zinc-600"}
              />
            </div>
            <span
              className={`text-[15px] font-semibold transition-colors duration-500 ${
                voiceActive ? "text-white/90" : "text-zinc-800"
              }`}
            >
              Tutor
            </span>
          </div>

          <div
            className={`h-4 w-px transition-colors duration-500 ${
              voiceActive ? "bg-white/15" : "bg-black/10"
            }`}
          />

          {/* Context/Project Pill */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors group focus:outline-none font-medium ${
                voiceActive
                  ? "bg-white/10 hover:bg-white/15 border-white/15 text-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "bg-white hover:bg-zinc-50 border-black/10 text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              }`}
            >
              <Folder
                size={12}
                className={`transition-colors ${
                  voiceActive
                    ? "text-white/70"
                    : "text-zinc-600 group-hover:text-zinc-800"
                }`}
              />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={activeLearningBook?.id || activeProject}
                  initial={animationsEnabled ? { opacity: 0, y: 5 } : undefined}
                  animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                  exit={animationsEnabled ? { opacity: 0, y: -5 } : undefined}
                  className="text-xs font-medium whitespace-nowrap inline-block"
                >
                  {activeLearningBook?.title || activeProject}
                </motion.span>
              </AnimatePresence>
              <ChevronDown
                size={12}
                className={voiceActive ? "text-white/60" : "text-zinc-500"}
              />
            </button>

            <AnimatePresence>
              {isProjectDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-[260px] p-1 bg-white/95 backdrop-blur-xl border border-black/5 rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden z-50 origin-top-left"
                >
                  <div className="px-3 py-2 border-b border-black/5 mb-1">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Library Context (Press Enter to Rename)
                    </span>
                  </div>
                  <div className="px-2 py-1.5 mb-1 bg-black/5 rounded-lg">
                    <input
                      type="text"
                      placeholder="Rename current book..."
                      className="w-full bg-transparent text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          e.currentTarget.value.trim() !== ""
                        ) {
                          const nextTitle = e.currentTarget.value.trim();
                          void brainOrchestrator
                            .updateSessionBookTitle(
                              nextTitle,
                              learnerName,
                              "chat",
                            )
                            .then((book) => {
                              setActiveLearningBookId(book.id);
                              setActiveProject(book.title);
                            })
                            .catch((error) => {
                              console.warn(
                                "[ChatPanel] Active book rename failed:",
                                error,
                              );
                              setActiveProject(nextTitle);
                            });
                          setIsProjectDropdownOpen(false);
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {learningBooks.length === 0 && (
                      <div className="px-3 py-3 text-[12px] leading-relaxed text-zinc-500">
                        Library book will appear when this session initializes.
                      </div>
                    )}
                    {learningBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          setActiveLearningBookId(book.id);
                          setActiveProject(book.title);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left focus:outline-none ${
                          activeLearningBookId === book.id
                            ? "bg-black/5 text-zinc-800"
                            : "text-zinc-500 hover:bg-black/5 hover:text-zinc-700"
                        }`}
                      >
                        <Folder size={14} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {book.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                            {book.conversationCount} chats ·{" "}
                            {book.chapters?.length || 0} chapters
                          </span>
                        </span>
                        {activeLearningBookId === book.id && (
                          <Check size={14} className="ml-auto text-zinc-800" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to clear the chat history?",
                )
              ) {
                setMessages([
                  {
                    id: "1",
                    role: "assistant",
                    content: INITIAL_MESSAGE,
                  },
                ]);
              }
            }}
            title="Clear Chat History"
            className={`p-1.5 rounded-full transition-colors focus:outline-none ${
              voiceActive
                ? "text-white/50 hover:bg-white/10 hover:text-white"
                : "text-[#9a9a9f] hover:bg-black/5 hover:text-zinc-800"
            }`}
          >
            <RotateCcw size={15} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors focus:outline-none ${
                voiceActive
                  ? "text-white/50 hover:bg-white/10 hover:text-white"
                  : "text-zinc-400 hover:bg-black/5 hover:text-zinc-600"
              }`}
            >
              <Minus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-6 pt-[112px] py-4 pb-52 space-y-8 custom-scroll"
        ref={scrollRef}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              sendState={sendState}
              isLast={index === messages.length - 1}
              animationsEnabled={animationsEnabled}
              isPlayingTTS={isPlayingTTS}
              onSendMessage={sendMessage}
              onHandleTTS={handleTTS}
              onSetActiveView={setActiveView}
              setMessages={setMessages}
              apiKey={apiKey}
              activeBookId={activeLearningBookId}
              activeBookTitle={activeLearningBook?.title || activeProject}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div
        className={`absolute bottom-0 w-full p-4 shrink-0 transition-colors duration-500 ${
          voiceActive
            ? "z-[140] bg-gradient-to-t from-black via-black to-transparent"
            : "z-40 bg-gradient-to-t from-[#fdfdfd] via-[#fdfdfd]/90 to-transparent"
        }`}
      >
        {/* Selected Text Context Chip */}
        <AnimatePresence>
          {selectedTextContext && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className="w-full max-w-3xl mx-auto mb-2"
            >
              <div
                className="relative flex items-start gap-3 p-3 rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(18, 18, 20, 0.95)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* Animated conic-gradient border — same as FloatingSkillsMenu action bar */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
                  style={{
                    padding: "1px",
                    WebkitMask:
                      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 5,
                      ease: "linear",
                    }}
                    className="absolute inset-[-50%] w-[200%] h-[200%]"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.05) 60%, transparent 100%)",
                    }}
                  />
                </div>

                {/* Left icon */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/10 mt-0.5">
                  <Sparkles size={11} className="text-zinc-300" />
                </div>

                {/* Label + text */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-0.5">
                    From PDF Selection
                  </div>
                  <p className="max-h-24 overflow-y-auto pr-2 text-[12px] text-zinc-200 leading-snug whitespace-pre-wrap break-words font-medium custom-scrollbar">
                    "{selectedTextContext}"
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => setSelectedTextContext("")}
                  className="shrink-0 p-1.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors focus:outline-none mt-0.5"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end w-full max-w-3xl mx-auto bg-[#18181b] rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] mb-2 overflow-visible">
          {/* Menu Trigger Button */}
          <div className="relative flex items-center justify-center shrink-0 z-50 ml-2 mb-2 rounded-full h-[48px] w-[48px] p-[2px]">
            <motion.button
              onClick={() => setIsSkillsMenuOpen(!isSkillsMenuOpen)}
              className="relative flex items-center justify-center w-full h-full rounded-full group focus:outline-none shrink-0"
              whileHover="hover"
              whileTap="tap"
              initial="idle"
              animate={isSkillsMenuOpen ? "hover" : "idle"}
              variants={{
                idle: { scale: 1, opacity: 0.8 },
                hover: { scale: 1.02, opacity: 1 },
                tap: { scale: 0.95 },
              }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <div className="absolute inset-[-1.5px] rounded-full bg-[#000000] shadow-[0_4px_16px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.05)]" />
              <div className="absolute inset-[0.5px] rounded-full overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#333] to-[#111]" />
                  {isSkillsMenuOpen && (
                    <SiriLiquidGlass
                      isActive={true}
                      isHovered={true}
                      isValid={true}
                    />
                  )}
                  <div
                    className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)",
                      backgroundSize: "4px 4px",
                    }}
                  />
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.3)] pointer-events-none mix-blend-screen" />
                </div>
              </div>
              <motion.div
                className="absolute z-10 flex items-center justify-center rounded-full group-hover:brightness-110 overflow-hidden"
                variants={{
                  idle: {
                    inset: "3.5px",
                    boxShadow:
                      "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                    borderRadius: "50%",
                  },
                  hover: {
                    inset: "3.5px",
                    boxShadow:
                      "inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                    borderRadius: "50%",
                  },
                  tap: {
                    inset: "4.5px",
                    boxShadow:
                      "inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                    borderRadius: "50%",
                  },
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{
                  background:
                    "linear-gradient(180deg, #262626 0%, #1a1a1a 45%, #080808 100%)",
                }}
              >
                <motion.div
                  className="absolute z-20 flex items-center justify-center"
                  animate={{ rotate: isSkillsMenuOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Plus
                    size={18}
                    className={
                      isSkillsMenuOpen ? "text-white" : "text-zinc-300"
                    }
                    strokeWidth={isSkillsMenuOpen ? 3 : 2.5}
                    style={{
                      filter: isSkillsMenuOpen
                        ? "drop-shadow(0 0 4px rgba(255,255,255,0.4))"
                        : "none",
                    }}
                  />
                </motion.div>
              </motion.div>
            </motion.button>
            <FloatingSkillsMenu
              isOpen={isSkillsMenuOpen}
              onClose={() => setIsSkillsMenuOpen(false)}
              onSelectSkill={(skill) => {
                if (skill === "Search") setIsSearchSkillActive(true);
              }}
            />
          </div>

          <div className="relative flex-1 flex items-center justify-center min-h-[60px]">
            {isSearchSkillActive && (
              <div className="absolute top-2 left-4 flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md text-[10px] font-bold uppercase tracking-wider z-20">
                <Search size={10} strokeWidth={3} /> Web Search
                <button
                  onClick={() => setIsSearchSkillActive(false)}
                  className="ml-1 hover:text-white transition-colors"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                voiceActive
                  ? "Type to talk to Aria..."
                  : isSearchSkillActive
                    ? "Search the web..."
                    : "Ask anything about the document..."
              }
              className={`w-full h-full bg-transparent border-none outline-none text-[15px] px-4 ${isSearchSkillActive ? "pt-8 pb-3" : "py-5"} max-h-[200px] min-h-[60px] resize-none text-zinc-100 placeholder:text-zinc-500 caret-white custom-scroll z-10`}
              rows={1}
              style={{ fieldSizing: "content" } as any}
            />
          </div>
          <div className="relative flex items-center gap-2 shrink-0 z-50 mr-2 mb-2">
            <div className="relative flex items-center justify-center shrink-0 rounded-full h-[48px] w-[48px] p-[2px]">
              <motion.button
                className="relative flex items-center justify-center w-full h-full rounded-full group focus:outline-none shrink-0"
                onClick={toggleVoice}
                whileHover="hover"
                whileTap="tap"
                animate={voiceState === "idle" ? "idle" : "sending"}
                variants={{
                  idle: { scale: 1, opacity: 0.8 },
                  hover: { scale: 1.02, opacity: 1 },
                  tap: { scale: 0.95 },
                  sending: { scale: 0.95, borderRadius: "50%" },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <div className="absolute inset-[-1.5px] rounded-full bg-[#000000] shadow-[0_4px_16px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.05)]" />

                <div className="absolute inset-[0.5px] rounded-full overflow-hidden">
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#333] to-[#111]" />
                    {voiceState !== "idle" && (
                      <SiriLiquidGlass
                        isActive={true}
                        isHovered={true}
                        isValid={true}
                      />
                    )}
                    <div
                      className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)",
                        backgroundSize: "4px 4px",
                      }}
                    />
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.3)] pointer-events-none mix-blend-screen" />
                  </div>
                </div>

                <motion.div
                  className="absolute z-10 flex items-center justify-center rounded-full group-hover:brightness-110 overflow-hidden"
                  variants={{
                    idle: {
                      inset: "3.5px",
                      boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                      borderRadius: "50%",
                    },
                    hover: {
                      inset: "3.5px",
                      boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                      borderRadius: "50%",
                    },
                    tap: {
                      inset: "4.5px",
                      boxShadow:
                        "inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                      borderRadius: "50%",
                    },
                    sending: { inset: "4.5px", borderRadius: "50%" },
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    background:
                      "linear-gradient(180deg, #262626 0%, #1a1a1a 45%, #080808 100%)",
                  }}
                >
                  <motion.div className="absolute z-20 flex items-center justify-center">
                    {voiceState === "idle" ? (
                      <Mic size={18} className="text-zinc-300" />
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-[-4px] rounded-full bg-red-500/20 blur animate-pulse" />
                        <X
                          size={18}
                          strokeWidth={3}
                          className="relative z-10 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                        />
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </motion.button>
            </div>

            <div className="relative flex items-center justify-center shrink-0 z-50 rounded-full h-[48px] w-[48px] p-[2px]">
              <motion.button
                className="relative flex items-center justify-center w-full h-full rounded-full group focus:outline-none shrink-0"
                onMouseEnter={() => {
                  setIsHovered(true);
                  if (isActive) audio.playHover();
                }}
                onMouseLeave={() => setIsHovered(false)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                whileHover="hover"
                whileTap="tap"
                animate={sendState}
                variants={{
                  idle: { scale: 1, opacity: isActive ? 1 : 0.6 },
                  hover: { scale: 1.02, opacity: 1 },
                  tap: { scale: 0.95 },
                  sending: { scale: 0.95, borderRadius: "50%" },
                  success: {
                    scale: 1,
                    transition: { type: "spring", stiffness: 500, damping: 12 },
                    borderRadius: "50%",
                  },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <AnimatePresence>
                  {sendState === "sending" && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.6, borderWidth: "2px" }}
                      animate={{ scale: 2.2, opacity: 0, borderWidth: "0px" }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border border-[rgba(255,255,255,0.8)] pointer-events-none z-0 mix-blend-screen"
                    />
                  )}
                </AnimatePresence>

                <div className="absolute inset-[-1.5px] rounded-full bg-[#000000] shadow-[0_4px_16px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.05)]" />

                <div className="absolute inset-[0.5px] rounded-full overflow-hidden">
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#333] to-[#111]" />
                    {isActive && (
                      <SiriLiquidGlass
                        isActive={isActive}
                        isHovered={isHovered}
                        isValid={isValid}
                      />
                    )}
                    <div
                      className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)",
                        backgroundSize: "4px 4px",
                      }}
                    />
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.3)] pointer-events-none mix-blend-screen" />
                  </div>
                </div>

                <motion.div
                  className="absolute z-10 flex items-center justify-center rounded-full group-hover:brightness-110 overflow-hidden"
                  variants={{
                    idle: {
                      inset: "3.5px",
                      boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                      borderRadius: "50%",
                    },
                    hover: {
                      inset: "3.5px",
                      boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                      borderRadius: "50%",
                    },
                    tap: {
                      inset: "4.5px",
                      boxShadow:
                        "inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)",
                      borderRadius: "50%",
                    },
                    sending: { inset: "4.5px", borderRadius: "50%" },
                    success: { inset: "3.5px", borderRadius: "50%" },
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    background:
                      "linear-gradient(180deg, #262626 0%, #1a1a1a 45%, #080808 100%)",
                  }}
                >
                  <motion.div
                    variants={{
                      idle: { y: 0, opacity: 1, scale: 1 },
                      hover: { y: 0, opacity: 1, scale: 1 },
                      tap: { y: 2, opacity: 1, scale: 0.9 },
                      sending: { y: -30, opacity: 0, scale: 0.5 },
                      success: { y: 30, opacity: 0, scale: 0.5 },
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute z-20 flex items-center justify-center"
                  >
                    <ArrowUp
                      className="w-[18px] h-[18px] transition-all duration-300"
                      color={isActive && isValid ? "#ECECEC" : "#555555"}
                      style={{
                        filter:
                          isActive && isValid
                            ? "drop-shadow(0 0 4px rgba(255,255,255,0.4))"
                            : "drop-shadow(0 1px 2px rgba(0,0,0,1))",
                      }}
                      strokeWidth={2.5}
                    />
                  </motion.div>

                  <motion.div
                    variants={{
                      idle: { opacity: 0, scale: 0.5 },
                      hover: { opacity: 0, scale: 0.5 },
                      tap: { opacity: 0, scale: 0.5 },
                      sending: { opacity: 1, scale: 1 },
                      success: { opacity: 0, scale: 1.5 },
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-30 flex items-center justify-center mix-blend-screen"
                  >
                    <motion.div
                      animate={{ rotate: sendState === "sending" ? 360 : 0 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="flex items-center justify-center"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-[18px] h-[18px]"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </motion.div>
                  </motion.div>

                  <motion.div
                    variants={{
                      idle: { opacity: 0, scale: 0.5, y: -20 },
                      hover: { opacity: 0, scale: 0.5, y: -20 },
                      tap: { opacity: 0, scale: 0.5, y: -20 },
                      sending: { opacity: 0, scale: 0.5, y: -20 },
                      success: { opacity: 1, scale: 1, y: 0 },
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute z-40 flex items-center justify-center"
                  >
                    <Check
                      className="w-[18px] h-[18px] text-white"
                      strokeWidth={3}
                    />
                  </motion.div>
                </motion.div>
              </motion.button>
            </div>

            <AnimatePresence>
              {!isValid && (
                <motion.div
                  initial={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="absolute -top-10 left-6 text-[#ff4d4d] text-xs font-medium tracking-wide flex items-center gap-1.5"
                >
                  <X size={12} strokeWidth={3} />
                  Special characters are limited.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {voiceState !== "idle" && (
          <VoiceUniverse
            state={voiceState}
            caption={voiceCaption}
            diagram={voiceDiagram}
            diagramLoading={diagramLoading}
            image={voiceImage}
            imageSeq={voiceImageSeq}
            imageLoading={imageLoading}
            onDiagramError={handleDiagramError}
            onDiagramReady={handleDiagramReady}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
