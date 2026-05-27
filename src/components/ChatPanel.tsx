import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { ShikiHighlighter } from './ShikiHighlighter';
import { ArrowUp, Sparkles, Network, BookOpen, Layers, X, Check, Folder, ChevronDown, Volume2, Square, Zap, Mic, Activity, Plus, Minus, LoaderCircle, RotateCcw, Globe2, ExternalLink, Brain, Search, FileCode2, Copy, Play, Terminal, Image as ImageIcon, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { audio } from '../lib/audio';
import { SiriLiquidGlass } from './SiriLiquidGlass';
import { useStore, type NormalizedWebSource } from '../store';
import { brainOrchestrator } from '../memory/memory.orchestrator';
import { db } from '../memory/longterm.memory';
import type { Message } from '../types';
import { FloatingSkillsMenu } from './FloatingSkillsMenu';
import { recordBrainRuntime } from '../brain-runtime/runtimeTelemetry';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

const Mermaid = ({ chart }: { chart: string }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart).then((res) => {
        if (chartRef.current) chartRef.current.innerHTML = res.svg;
      }).catch(e => {
         console.warn("Mermaid error", e);
         if (chartRef.current) chartRef.current.innerHTML = `<pre class="text-red-400 text-xs">${e.message}</pre>`;
      });
    }
  }, [chart]);

  return <div ref={chartRef} className="my-4 flex justify-center bg-white/5 rounded-xl p-4 overflow-x-auto w-full" />;
};

const languageLabels: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  json: 'JSON',
  bash: 'Shell',
  sh: 'Shell',
  html: 'HTML',
  css: 'CSS',
};

const languageExtensions: Record<string, string> = {
  js: 'js',
  javascript: 'js',
  ts: 'ts',
  typescript: 'ts',
  py: 'py',
  python: 'py',
  json: 'json',
  bash: 'sh',
  sh: 'sh',
  html: 'html',
  css: 'css',
};

const codeLanguageLabel = (language: string) => languageLabels[language] || (language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Text');
const codeFileName = (language: string) => `snippet.${languageExtensions[language] || language || 'txt'}`;

const PremiumCodeShell = ({
  language,
  code,
  runnable,
  running = false,
  onRun,
  children,
  output,
  outputTone = 'default',
}: {
  language: string;
  code: string;
  runnable?: boolean;
  running?: boolean;
  onRun?: () => void;
  children: React.ReactNode;
  output?: string | null;
  outputTone?: 'default' | 'error';
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
            <div className="truncate font-mono text-[13px] text-zinc-300">{codeFileName(language)}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Executable block</div>
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
              {running ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={13} />}
              {running ? 'Running' : 'Run'}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#0c0c0d]"
          >
            <div className="px-4 py-3 font-mono">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                <Terminal size={13} />
                Console output
              </div>
              <pre className={`whitespace-pre-wrap text-[12px] leading-relaxed ${outputTone === 'error' ? 'text-red-300' : 'text-zinc-300'}`}>{output}</pre>
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
      log: (...args: any[]) => logs.push(args.join(' ')),
      error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
      warn: (...args: any[]) => logs.push('WARN: ' + args.join(' '))
    };
    try {
      const func = new Function('console', code);
      func(customConsole);
      setOutput(logs.join('\\n') || 'Executed without console output.');
    } catch (e: any) {
      setHasError(true);
      setOutput(e.toString());
    } finally {
      window.setTimeout(() => setIsRunning(false), 260);
    }
  };

  return (
    <PremiumCodeShell language="javascript" code={code} runnable running={isRunning} onRun={runCode} output={output} outputTone={hasError ? 'error' : 'default'}>
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
            (window as any).pyodideLoadingPromise = new Promise<void>((resolve, reject) => {
               const script = document.createElement('script');
               script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
               script.onload = () => resolve();
               script.onerror = reject;
               document.head.appendChild(script);
            });
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
       processedCode = processedCode.replace(/asyncio\.run\(([\s\S]*?)\)/g, 'await $1');
       
       await pyodide.runPythonAsync(processedCode);
       const out = await pyodide.runPythonAsync("sys.stdout.getvalue()");
       const err = await pyodide.runPythonAsync("sys.stderr.getvalue()");
       
       if (out || err) {
          setOutput((out + '\\n' + err).trim());
       } else {
          setOutput('Executed successfully.');
       }
    } catch (e: any) {
       setHasError(true);
       setOutput(e.message || e.toString());
    } finally {
       setIsRunning(false);
    }
  };

  return (
    <PremiumCodeShell language="python" code={code} runnable running={isRunning} onRun={runPython} output={output} outputTone={hasError ? 'error' : 'default'}>
      <ShikiHighlighter language="python" code={code} embedded />
    </PremiumCodeShell>
  );
};

const InteractiveCodeBlock = React.memo(({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  if (!inline && language === 'mermaid') {
    return <Mermaid chart={code} />;
  }

  // Interactive runnable JS
  if (!inline && language === 'javascript') {
    return <RunnableJS code={code} />;
  }

  // Interactive runnable Python
  if (!inline && (language === 'python' || language === 'py')) {
    return <RunnablePython code={code} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {!inline && match ? (
        <PremiumCodeShell language={language} code={code}>
          <ShikiHighlighter language={language} code={code} embedded />
        </PremiumCodeShell>
      ) : (
        <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[0.85em]" {...props}>
          {children}
        </code>
      )}
    </motion.div>
  );
});



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
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return displayed;
}

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '$0.00';
  // Always 2 decimal places, no trailing dots
  return `$${value.toFixed(2)}`;
};

const formatCount = (value: number): string => {
  const n = Math.round(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toString();
};

const formatSeconds = (value: number) => {
  if (!value) return '0s';
  if (value < 60) return `${Math.round(value)}s`;
  return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`;
};

const compactModel = (model: string) => {
  if (!model) return 'unknown';
  if (model === 'deepseek/deepseek-chat') return 'DeepSeek V4 Flash';
  const parts = model.split('/');
  return parts[parts.length - 1] || model;
};

const AnimatedNumberText = ({ children }: { children: React.ReactNode }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={String(children)}
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -8, opacity: 0, position: 'absolute' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="inline-block"
    >
      {children}
    </motion.span>
  </AnimatePresence>
);

export const UsageAnalyticsStrip = () => {
  const chatUsage = useStore(state => state.chatUsage);
  const voiceUsage = useStore(state => state.voiceUsage);
  const webUsage = useStore(state => state.webUsage);
  const pricing = useStore(state => state.pricing);
  const setPricing = useStore(state => state.setPricing);
  const resetUsageAnalytics = useStore(state => state.resetUsageAnalytics);
  const isVoiceActive = useStore(state => state.isVoiceActive);
  const [expanded, setExpanded] = useState(false);

  // Live-animating counters
  const animInputTokens  = useAnimatedNumber(chatUsage.inputTokens, 700);
  const animOutputTokens = useAnimatedNumber(chatUsage.outputTokens, 700);
  const animTtsChars     = useAnimatedNumber(voiceUsage.ttsCharacters, 700);
  const animWebRequests  = useAnimatedNumber(webUsage.requests, 400);
  const animSources      = useAnimatedNumber(webUsage.sourcesReviewed, 400);

  // Voice seconds: tick +1 every second while connected (approximated by checking if voiceUsage is changing)
  const [liveVoiceSec, setLiveVoiceSec] = useState(voiceUsage.connectionSeconds);
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
      setLiveVoiceSec(prev => {
        const next = prev + 1;
        liveVoiceRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVoiceActive]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pricing')
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Pricing unavailable')))
      .then(data => {
        if (cancelled) return;
        setPricing({
          openRouterModels: data.openRouter?.models || {},
          deepgram: data.deepgram?.pricing || pricing.deepgram,
          fetchedAt: data.fetchedAt || data.openRouter?.fetchedAt || new Date().toISOString(),
          source: data.source || 'server',
          stale: Boolean(data.stale),
        });
      })
      .catch(() => { if (!cancelled) setPricing({ ...pricing, stale: true }); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chatTotal = chatUsage.inputTokens + chatUsage.outputTokens;
  const voiceBillable = voiceUsage.connectionSeconds + voiceUsage.ttsCharacters / 80;
  const chatWidth = `${Math.max(6, Math.min(100, (chatTotal / 1_000_000) * 100))}%`;
  const voiceWidth = `${Math.max(6, Math.min(100, (voiceBillable / 3600) * 100))}%`;
  const totalCost = chatUsage.cost + voiceUsage.cost + webUsage.cost;

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0a] text-[#fefefe] shadow-[0_18px_54px_rgba(0,0,0,0.34)]"
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_16%_0%,rgba(255,110,0,0.28),transparent_36%),radial-gradient(circle_at_90%_110%,rgba(255,255,255,0.13),transparent_38%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.22) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="relative w-full px-4 py-3 text-left focus:outline-none"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-bold">Usage</div>
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
              <div className="mt-1 flex flex-col text-[12px] font-mono text-white/85 tabular-nums">
                <div><AnimatedNumberText>{formatCount(animInputTokens)}</AnimatedNumberText>{" in"}</div>
                <div><AnimatedNumberText>{formatCount(animOutputTokens)}</AnimatedNumberText>{" out"}</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#ff6e00] shadow-[0_0_14px_rgba(255,110,0,0.55)]"
                  animate={{ width: chatWidth }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
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
                <AnimatedNumberText>{formatSeconds(liveVoiceSec)}</AnimatedNumberText>{" / "}
                <AnimatedNumberText>{formatCount(animTtsChars)}</AnimatedNumberText>{" chars"}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.42)]"
                  animate={{ width: voiceWidth }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
            {/* Search Card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                <span>Search</span>
                <span><AnimatedNumberText>{formatCount(animWebRequests)}</AnimatedNumberText> / 2500</span>
              </div>
              <div className="mt-1 text-[12px] font-mono text-white/85 tabular-nums">
                <AnimatedNumberText>{formatCount(animSources)}</AnimatedNumberText>{" sources"}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white/60 shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  animate={{ width: `${Math.max(6, Math.min(100, (webUsage.requests / 2500) * 100))}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden border-t border-white/10"
          >
            <div className="grid gap-2 p-3 text-[11px] text-white/55 md:grid-cols-3">
              <div className="rounded-xl bg-white/[0.06] p-3 border border-white/10">
                <div className="font-semibold text-white mb-1">Chat · OpenRouter</div>
                <div>Model: <span className="font-mono text-white/85">{compactModel(chatUsage.model)}</span></div>
                <div>Requests: <AnimatedNumberText>{formatCount(chatUsage.requests)}</AnimatedNumberText></div>
                <div>Tokens: <AnimatedNumberText>{formatCount(animInputTokens)}</AnimatedNumberText> input, <AnimatedNumberText>{formatCount(animOutputTokens)}</AnimatedNumberText> output</div>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-3 border border-white/10">
                <div className="font-semibold text-white mb-1">Voice · Deepgram</div>
                <div>Agent: <span className="font-mono text-white/85">{voiceUsage.voiceAgentModel}</span></div>
                <div>Listen/Speak: {voiceUsage.listenModel} / {voiceUsage.speakModel}</div>
                <div>TTS: {voiceUsage.ttsModel}, <AnimatedNumberText>{formatCount(animTtsChars)}</AnimatedNumberText> chars</div>
              </div>
              <div className="rounded-xl bg-white/[0.06] p-3 border border-white/10">
                <div className="font-semibold text-white mb-1">Search · Serper</div>
                <div>Requests: <AnimatedNumberText>{formatCount(animWebRequests)}</AnimatedNumberText></div>
                <div>Search/News: <AnimatedNumberText>{formatCount(webUsage.searchRequests)}</AnimatedNumberText> / <AnimatedNumberText>{formatCount(webUsage.newsRequests)}</AnimatedNumberText></div>
                <div>Sources reviewed: <AnimatedNumberText>{formatCount(animSources)}</AnimatedNumberText></div>
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

const GeminiVoicePill = ({ state }: { state: 'listening' | 'speaking' | 'idle' }) => {
  const [vol, setVol] = useState(0);

  useEffect(() => {
    if (state !== 'listening') {
      setVol(0);
      return;
    }
    const handler = (e: any) => {
      setVol(prev => prev + (e.detail - prev) * 0.3);
    };
    window.addEventListener('mic-volume', handler);
    return () => window.removeEventListener('mic-volume', handler);
  }, [state]);

  useEffect(() => {
    if (state === 'speaking') {
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
         style={{ width: state === 'speaking' ? '300px' : '240px', height: '64px', transition: 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
      
      <div className="absolute inset-0 overflow-hidden mix-blend-screen blur-[8px] opacity-80">
        <motion.div
           className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
           animate={{ rotate: 360 }}
           transition={{ duration: state === 'speaking' ? 3 : 8, repeat: Infinity, ease: "linear" }}
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
        {state === 'speaking' ? (
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

const SearchProgressIndicator = ({ active }: { active: boolean }) => (
  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-white border border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
    <Globe2 size={14} className="relative z-10" />
    {active && (
      <motion.div
        className="absolute inset-[-3px] rounded-[14px] border border-[#ff6e00]/55"
        animate={{ rotate: 360, opacity: [0.25, 0.8, 0.25] }}
        transition={{ rotate: { repeat: Infinity, duration: 2.4, ease: "linear" }, opacity: { repeat: Infinity, duration: 1.6 } }}
      />
    )}
  </div>
);

const SourceCards = ({ sources, compact = false, tone = "light" }: { sources: NormalizedWebSource[]; compact?: boolean; tone?: "light" | "dark" }) => {
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
            <img src={source.faviconUrl} alt="" className="mt-0.5 h-4 w-4 rounded-sm" loading="lazy" />
            <div className="min-w-0 flex-1">
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
                <span className="truncate">{source.domain}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${dark ? "bg-white/10 text-zinc-400" : "bg-zinc-950/[0.06] text-zinc-500"}`}>{index + 1}</span>
              </div>
              <div className={`mt-1 line-clamp-2 text-[12px] font-semibold leading-snug ${dark ? "text-zinc-200 group-hover:text-white" : "text-zinc-800 group-hover:text-zinc-950"}`}>
                {source.title}
              </div>
              {source.snippet && (
                <div className={`mt-1.5 line-clamp-2 text-[11px] leading-snug ${dark ? "text-zinc-500" : "text-zinc-500"}`}>{source.snippet}</div>
              )}
            </div>
            <ExternalLink size={12} className={`mt-0.5 shrink-0 ${dark ? "text-zinc-600 group-hover:text-zinc-300" : "text-zinc-300 group-hover:text-zinc-500"}`} />
          </div>
        </motion.a>
      ))}
    </div>
  );
};

const SearchActivityPanel = ({ webSearch }: { webSearch?: Message['webSearch'] }) => {
  if (!webSearch || (!webSearch.query && webSearch.sources.length === 0 && !webSearch.status)) return null;
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
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff6e00]">Web Search</span>
            {webSearch.mode && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">{webSearch.mode}</span>}
          </div>
          {webSearch.query && <div className="mt-1 text-[13px] font-semibold leading-snug text-zinc-200">"{webSearch.query}"</div>}
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
                  <img src={source.faviconUrl} alt="" className="h-3.5 w-3.5 rounded-sm" loading="lazy" />
                  <span className="truncate">{source.domain}</span>
                </motion.a>
              ))}
            </div>
          )}
          <div className="mt-1 flex items-center gap-2 text-[12px] text-zinc-500">
            {webSearch.active && <LoaderCircle size={12} className="animate-spin text-[#ff6e00]" />}
            <span>{webSearch.error || webSearch.status || "Preparing live retrieval..."}</span>
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
  if (value.includes('web') || value.includes('source') || value.includes('search')) return { icon: Search, label: 'Search', bg: 'bg-[#E7F3FF]', text: 'text-[#0A7DFF]' };
  if (value.includes('page') || value.includes('screen') || value.includes('screenshot') || value.includes('visual')) return { icon: ImageIcon, label: 'Vision', bg: 'bg-[#F1EAFC]', text: 'text-[#6929F4]' };
  if (value.includes('tool') || value.includes('execut')) return { icon: Code2, label: 'Tool', bg: 'bg-[#E6F8EA]', text: 'text-[#36AA55]' };
  if (value.includes('graph') || value.includes('concept')) return { icon: Network, label: 'Graph', bg: 'bg-[#FDF1E8]', text: 'text-[#D87A2C]' };
  if (value.includes('flashcard') || value.includes('revision')) return { icon: BookOpen, label: 'Recall', bg: 'bg-[#FDF4DD]', text: 'text-[#D49B23]' };
  if (value.includes('synth') || phase === 'synthesizing') return { icon: Sparkles, label: 'Synthesis', bg: 'bg-[#FEEDED]', text: 'text-[#EF4C43]' };
  return { icon: Brain, label: 'Reasoning', bg: 'bg-[#F3F3F3]', text: 'text-[#6A6A6A]' };
};

import { StatusBadge } from './StatusBadge';

const getStatusBadge = (phase: string, isComplete: boolean, hasError?: boolean) => {
  if (hasError) return 'failed';
  if (isComplete) return 'success';
  if (phase === "retrieving" || phase === "web_search") return "review";
  if (phase === "idle" && !isComplete) return "pending";
  return "progress";
};



const ThinkingPanel = ({ phase, steps, isComplete, webSearch, hasError }: { phase: string, steps: any[], isComplete: boolean, webSearch?: Message['webSearch'], hasError?: boolean }) => {
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const expanded = userExpanded !== null ? userExpanded : false;

  useEffect(() => {
    if (isComplete && userExpanded === null) {
      setUserExpanded(false);
    }
  }, [isComplete, userExpanded]);

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [expanded, steps.length, webSearch?.sources.length]);

  if (phase === "idle" && steps.length === 0) return null;

  return (
    <div ref={panelRef} className="not-prose mb-5 mt-2 overflow-hidden font-sans transition-all duration-300">
       <button 
         onClick={() => setUserExpanded(!expanded)} 
         className="group relative flex w-full items-center gap-3 overflow-hidden bg-transparent py-2 text-left transition-all focus:outline-none"
       >
          <div className="relative min-w-0 flex-1">
            <StatusBadge status={getStatusBadge(phase, isComplete, hasError)} />
          </div>
          <motion.div className="relative ml-auto" animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 20 }}>
            <ChevronDown size={18} className="text-zinc-400 opacity-70 group-hover:text-zinc-600 group-hover:opacity-100" />
          </motion.div>
       </button>
       
       <AnimatePresence initial={false}>
         {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
               <div className="mt-1 bg-transparent py-2 text-[13px] text-zinc-500 pl-2">
                 <div className="space-y-1">
                 {steps.map((step, idx) => {
                   const meta = thoughtStepMeta(step.content, phase);
                   const active = !isComplete && idx === steps.length - 1 && phase !== 'complete';
                   const complete = isComplete || idx < steps.length - 1;
                   return (
                   <motion.div 
                     key={step.id} 
                     initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                     animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                     transition={{ delay: idx * 0.045, duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                     className="group/step relative flex flex-col items-start gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                   >
                     {idx < steps.length - 1 && (
                       <motion.div 
                         initial={{ scaleY: 0 }} 
                         animate={{ scaleY: 1 }} 
                         transition={{ duration: 0.4, ease: "easeOut" }}
                         className="absolute left-[26px] top-10 bottom-[-12px] w-px bg-black/10 origin-top" 
                       />
                     )}
                     
                     <div className="flex items-center gap-2">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[11px] font-semibold tracking-tight ${meta.bg} ${meta.text}`}>
                         <meta.icon size={12} strokeWidth={2.5} />
                         {meta.label}
                       </div>
                       {active && <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse shadow-sm" />}
                     </div>
                     
                     <div className="pl-1 mt-0.5 text-[12px] leading-relaxed tracking-tight text-zinc-600 transition-colors group-hover/step:text-zinc-900">
                       {step.content}
                     </div>
                   </motion.div>
                 );})}
                 <SearchActivityPanel webSearch={webSearch} />
                 
                 {!isComplete && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      className="group/step relative flex flex-col items-start gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                    >
                      {steps.length > 0 && (
                        <motion.div 
                          initial={{ scaleY: 0 }} 
                          animate={{ scaleY: 1 }} 
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="absolute left-[26px] top-[-12px] bottom-[30px] w-px bg-black/10 origin-top" 
                        />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[11px] font-semibold tracking-tight bg-[#E7F3FF] text-[#0A7DFF]">
                          <LoaderCircle size={12} strokeWidth={2.5} className="animate-spin" />
                          {phase === "retrieving" ? "Searching" : 
                           phase === "web_search" ? "Reviewing" :
                           phase === "tool_execution" ? "Running" : 
                           phase === "synthesizing" ? "Synthesizing" : "Thinking"}
                        </div>
                      </div>
                      
                      <div className="pl-1 mt-0.5 text-[12px] italic tracking-tight text-zinc-500 transition-colors">
                        Loading...
                      </div>
                    </motion.div>
                  )}
                 </div>
               </div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  )
}

const markdownComponents = {
  p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  blockquote: ({ children, ...props }: any) => <blockquote {...props}>{children}</blockquote>,
  code: InteractiveCodeBlock
};

const AnimatedMarkdown = React.memo(({ content, isVoice, animationsEnabled = true, isStreaming = false }: { content: string, isVoice?: boolean, animationsEnabled?: boolean, isStreaming?: boolean }) => {
  const showCursor = animationsEnabled && !isVoice && isStreaming && content.length > 0;

  return (
    <div className={`streaming-text ${showCursor ? 'typing-active' : ''}`}>
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
});

const MessageItem = React.memo(({ 
  msg, 
  sendState, 
  isLast,
  animationsEnabled, 
  isPlayingTTS, 
  onSendMessage, 
  onHandleTTS, 
  onSetActiveView,
  setMessages
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
}) => {
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = React.useState(false);

  const handleGenerateFlashcards = async () => {
    setIsGeneratingFlashcards(true);
    try {
      const apiKey = localStorage.getItem('api_key') || '';
      const response = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : ''
        },
        body: JSON.stringify({ content: msg.content })
      });
      const data = await response.json();
      
      if (data.cards && data.cards.length > 0) {
        data.cards.forEach((card: any) => {
          db.flashcards.add({
            id: Date.now().toString() + Math.random(),
            conceptId: card.conceptId || 'general',
            front: card.front,
            back: card.back,
            nextReviewAt: Date.now()
          }).catch(console.warn);
        });

        setMessages(prev => {
          const newM = [...prev];
          const idx = newM.findIndex(m => m.id === msg.id);
          if (idx !== -1) {
            newM[idx] = { ...newM[idx], hasFlashcards: true };
          }
          return newM;
        });
      }
    } catch (e) {
      console.warn("Flashcard generation failed:", e);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: msg.role === 'user' ? 15 : 10, scale: msg.role === 'user' ? 0.98 : 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.15, mass: 0.8 }}
      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}
    >
      <div className={`${msg.role === 'user' ? 'max-w-[85%] bg-[#1C1C1E] text-white border border-[#2c2c2e] px-4 py-2.5 rounded-2xl rounded-br-sm' : 'w-full max-w-full'}`}>
        {msg.role === 'assistant' && msg.isVoice && (
          <div className="flex items-center gap-3 mb-2">
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
              <Mic size={8} /> Voice
            </span>
          </div>
        )}
        {msg.role === 'user' && msg.isVoice && (
          <div className="flex items-center justify-end gap-1 mb-2">
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
              <Mic size={8} /> Voice
            </span>
          </div>
        )}
        
        <div className={`prose max-w-none text-[13px] font-medium leading-relaxed tracking-tight ${msg.role === 'user' ? 'prose-p:leading-snug prose-p:my-0' : 'prose-p:leading-[1.6] prose-p:mb-4 prose-p:last:mb-0'} prose-headings:tracking-tight prose-headings:leading-tight prose-headings:font-medium prose-pre:my-2 prose-pre:border prose-code:text-blue-500 ${msg.role === 'user' ? 'prose-invert text-white prose-pre:bg-[#0A0A0A] prose-pre:border-white/5' : 'text-[#050505] prose-headings:text-zinc-900 prose-pre:bg-zinc-100 prose-pre:border-black/5'}`}>
          {msg.role === 'assistant' && msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
             <ThinkingPanel 
               phase={msg.phase || 'idle'} 
               steps={msg.reasoningSteps} 
               isComplete={sendState === "success" || (msg.phase !== undefined && msg.phase === 'complete' && msg.content.length > 0)} 
               webSearch={msg.webSearch}
               hasError={!!msg.error}
             />
          )}
          <AnimatedMarkdown content={msg.content} isVoice={msg.isVoice} animationsEnabled={animationsEnabled} isStreaming={isLast && sendState !== 'success' && sendState !== 'idle'} />
          {msg.role === 'assistant' && <FinalSourcesPanel sources={msg.sources || []} />}
        </div>

        {msg.hasFlashcards && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400">
              <Zap size={14} />
              <span className="text-xs font-medium">Flashcards successfully generated!</span>
            </div>
            <button 
              onClick={() => onSetActiveView('revision')}
              className="text-xs font-semibold px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              View Deck
            </button>
          </div>
        )}
      </div>
      {msg.role === 'assistant' && (
        <div className="mt-4 flex flex-wrap gap-2 w-full">
          <button 
            onClick={() => onSendMessage(`Extract the core atomic concept from this, describe it briefly, and explicitly call the update_graph tool to add it to the learning graph:\n\n"${msg.content}"`)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors border border-black/10 shadow-sm"
          >
            <Network size={13} /> Add to Graph
          </button>
          
          {msg.phase === 'complete' && !msg.hasFlashcards && (
            <button
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors text-xs font-medium border border-black/10 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isGeneratingFlashcards ? <Activity size={13} className="animate-spin" /> : <BookOpen size={13} />}
              {isGeneratingFlashcards ? "Generating..." : "Create Flashcard"}
            </button>
          )}
          
          <button 
            onClick={() => onHandleTTS(msg.id, msg.content)}
            className={`flex items-center gap-1.5 text-xs font-medium ml-auto px-3 py-1.5 rounded-lg transition-colors border shadow-sm ${
              isPlayingTTS === msg.id 
                ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' 
                : 'text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border-black/10'
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
}, (prevProps, nextProps) => {
  return prevProps.msg === nextProps.msg &&
         prevProps.sendState === nextProps.sendState &&
         prevProps.animationsEnabled === nextProps.animationsEnabled &&
         prevProps.isPlayingTTS === nextProps.isPlayingTTS;
});

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const apiKey = useStore(state => state.apiKey);
  const serperApiKey = useStore(state => state.serperApiKey);
  const learnerName = useStore(state => state.learnerName);
  const askTutorQuery = useStore(state => state.askTutorQuery);
  const setAskTutorQuery = useStore(state => state.setAskTutorQuery);
  const activeProject = useStore(state => state.activeProject);
  const setActiveProject = useStore(state => state.setActiveProject);
  const activeLearningBookId = useStore(state => state.activeLearningBookId);
  const setActiveLearningBookId = useStore(state => state.setActiveLearningBookId);
  const ttsVoice = useStore(state => state.ttsVoice);
  const setActiveView = useStore(state => state.setActiveView);
  const aiModel = useStore(state => state.aiModel);
  const animationsEnabled = useStore(state => state.animationsEnabled);
  const systemPrompt = useStore(state => state.systemPrompt);
  const recordChatUsage = useStore(state => state.recordChatUsage);
  const recordVoiceUsage = useStore(state => state.recordVoiceUsage);
  const recordWebUsage = useStore(state => state.recordWebUsage);
  const recordWebSearchEvent = useStore(state => state.recordWebSearchEvent);
  const cacheWebSources = useStore(state => state.cacheWebSources);
  const selectedTextContext = useStore(state => state.selectedTextContext);
  const setSelectedTextContext = useStore(state => state.setSelectedTextContext);
  const messages = useStore(state => state.messages);
  const setMessages = useStore(state => state.setMessages);
  const setIsVoiceActive = useStore(state => state.setIsVoiceActive);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearchSkillActive, setIsSearchSkillActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveringContainer, setIsHoveringContainer] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sendState, setSendState] = useState<"idle" | "sending" | "success">("idle");
  const [isPlayingTTS, setIsPlayingTTS] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);
  
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "speaking">("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    setIsVoiceActive(voiceState !== "idle" || isPlayingTTS !== null);
  }, [voiceState, isPlayingTTS, setIsVoiceActive]);
  const lastVoiceUserMessageRef = useRef('');
  const learningBooks = useLiveQuery(() => db.learningBooks.orderBy('updatedAt').reverse().toArray(), []) || [];
  const activeLearningBook = activeLearningBookId
    ? learningBooks.find(book => book.id === activeLearningBookId)
    : undefined;

  useEffect(() => {
    if (learningBooks.length === 0) return;
    const selectedBook = activeLearningBookId
      ? learningBooks.find(book => book.id === activeLearningBookId)
      : undefined;
    if (selectedBook) return;

    const matchingBook = learningBooks.find(book => book.title.toLowerCase() === activeProject.toLowerCase());
    const nextBook = matchingBook || learningBooks[0];
    setActiveLearningBookId(nextBook.id);
    setActiveProject(nextBook.title);
  }, [activeLearningBookId, activeProject, learningBooks, setActiveLearningBookId, setActiveProject]);

  useEffect(() => {
    const handleLearningBookUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ bookId?: string; title?: string }>).detail;
      if (!detail?.bookId || !detail?.title) return;
      setActiveLearningBookId(detail.bookId);
      setActiveProject(detail.title);
    };
    window.addEventListener('learning-book-updated', handleLearningBookUpdate);
    return () => window.removeEventListener('learning-book-updated', handleLearningBookUpdate);
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
  
  const isValid = input.length === 0 || /^[a-zA-Z0-9\s.,!?'"()\-:;\n]*$/.test(input);
  const isActive = input.length > 0;

  const thinkingSteps = ['Reading context...', 'Linking concepts...', 'Synthesizing answer...'];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sendState === 'sending') {
      setThinkingStep(0);
      interval = setInterval(() => {
        setThinkingStep((s) => (s + 1) % 3);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [sendState]);

  const stopVoice = () => {
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
    activeAudioNodesRef.current = [];
    setVoiceState("idle");
  };

  const startVoice = async () => {
    if (!apiKey) {
      alert("Please configure your OpenRouter API Key in the settings (top right) before using Voice features.");
      return;
    }

    try {
      setVoiceState("listening");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

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
        window.dispatchEvent(new CustomEvent('mic-volume', { detail: volume }));

        if (ws.readyState === WebSocket.OPEN && voiceStateRef.current === "listening") {
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
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
              if (msg.role === "user") {
                lastVoiceUserMessageRef.current = msg.content || '';
                setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), role: "user", content: msg.content, isVoice: true }]);
              } else if (msg.role === "assistant") {
                setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), role: "assistant", content: msg.content, isVoice: true }]);
                if (lastVoiceUserMessageRef.current && msg.content) {
                  const userMessage = lastVoiceUserMessageRef.current;
                  lastVoiceUserMessageRef.current = '';
                  brainOrchestrator.trackInteraction(userMessage, msg.content);
                  void brainOrchestrator.updateLearningBookFromConversation({
                    userName: learnerName,
                    activeProject,
                    activeBookId: activeLearningBookId,
                    userMessage,
                    assistantMessage: msg.content,
                    apiKey
                  }).catch((error) => {
                    console.warn('[ChatPanel] Voice learning book update failed:', error);
                  });
                }
              }
            } else if (msg.type === "UserStartedSpeaking") {
               // Interrupt playing
               activeAudioNodesRef.current.forEach(node => {
                 try { node.stop(); } catch(e){}
               });
               activeAudioNodesRef.current = [];
               if (audioContextRef.current) {
                 nextPlayTimeRef.current = audioContextRef.current.currentTime;
               }
               setVoiceState("listening");
            } else if (msg.type === "AgentStartedSpeaking") {
               setVoiceState("speaking");
            } else if (msg.type === "AgentFinishedSpeaking") {
               setVoiceState("listening");
            } else if (msg.type === "Error") {
               console.error("Deepgram Error", msg);
               stopVoice();
            }
          } catch(e) {
            console.log("Non-JSON message from Deepgram:", event.data);
          }
        } else if (event.data instanceof Blob) {
          // It's binary playing back from TTS
          const arrayBuffer = await event.data.arrayBuffer();
          const buffer = new Int16Array(arrayBuffer);
          const float32Data = new Float32Array(buffer.length);
          for (let i = 0; i < buffer.length; i++) {
            float32Data[i] = buffer[i] / 0x7FFF;
          }

          if (audioContextRef.current) {
            const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 48000);
            audioBuffer.copyToChannel(float32Data, 0);

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            activeAudioNodesRef.current.push(source);
            source.onended = () => {
              activeAudioNodesRef.current = activeAudioNodesRef.current.filter(n => n !== source);
            };

            if (nextPlayTimeRef.current < audioContextRef.current.currentTime + 0.05) {
              nextPlayTimeRef.current = audioContextRef.current.currentTime + 0.15;
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

  const voiceStateRef = useRef(voiceState);
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

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
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_#~>]/g, '')
        .trim();
      
      const safeText = cleanText.length > 1500 ? cleanText.substring(0, 1500) + "..." : cleanText;
      const res = await fetch(`/api/tts?text=${encodeURIComponent(safeText)}&voice=${encodeURIComponent(ttsVoice || 'aura-asteria-en')}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `TTS failed: ${res.status}` }));
        throw new Error(err.error || `TTS failed: ${res.status}`);
      }

      const usageCost = Number(res.headers.get('X-Usage-Cost') || 0);
      const usageChars = Number(res.headers.get('X-Usage-Input-Chars') || safeText.length);
      const usageModel = res.headers.get('X-Usage-Model') || ttsVoice || 'aura-asteria-en';
      recordVoiceUsage({
        provider: res.headers.get('X-Usage-Provider') || 'deepgram',
        ttsModel: usageModel,
        ttsCharacters: usageChars,
        cost: usageCost,
        estimated: res.headers.get('X-Usage-Estimated') === 'true',
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

  const estimateTokens = (value: string) => Math.max(1, Math.ceil(value.length / 4));

  const sendMessage = async (text: string) => {
    if (!text.trim() || sendState !== "idle") return;
    if (!apiKey) {
      alert("Please configure your OpenRouter API Key in the settings (top right).");
      return;
    }

    audio.playClick();
    setSendState("sending");
    
    const searchPrefix = isSearchSkillActive 
      ? `[SYSTEM: The user has explicitly selected the Web Search skill. You MUST use the web_search tool to answer this query.]\n\n` 
      : ``;
      
    const userMsgContent = searchPrefix + (selectedTextContext
      ? `Regarding this selected text:\n\n> ${selectedTextContext}\n\n${text.trim()}`
      : text.trim());
      
    setSelectedTextContext('');
    setInput('');
    setIsSearchSkillActive(false);
    
    const newMessages = [...messages, { id: crypto.randomUUID(), role: 'user' as const, content: userMsgContent }];
    const assistantMsgId = crypto.randomUUID();
    setMessages([
      ...newMessages, 
      { 
        id: assistantMsgId, 
        role: 'assistant' as const, 
        content: '', 
        hasFlashcards: false,
        phase: 'retrieving' as const,
        reasoningSteps: [{ id: crypto.randomUUID(), content: 'Retrieving relevant contextual knowledge...' }],
        webSearch: { active: false, sources: [] },
        sources: []
      }
    ]);
    setIsTyping(true);

    try {
      const canvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
      let currentPageImage = null;
      const needsVision = /page|this|image|look|what|read|pdf|diagram|chart|graph|screen|visible|shown|display|see|seeing/i.test(userMsgContent);
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
          
          const offscreen = document.createElement('canvas');
          offscreen.width = width;
          offscreen.height = height;
          const ctx = offscreen.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, width, height);
            currentPageImage = offscreen.toDataURL('image/jpeg', 0.6);
          } else {
            currentPageImage = canvas.toDataURL('image/jpeg', 0.5);
          }
        } catch (visionErr) {
          console.warn("Could not extract vision image:", visionErr);
        }
      }

      const relatedMemoryContext = await brainOrchestrator.getRelevantContext(userMsgContent);
      let activeBookContext = '';
      if (activeLearningBookId) {
        const book = await db.learningBooks.get(activeLearningBookId).catch(() => undefined);
        if (book) {
          const bookConcepts = await db.learningBookConcepts
            .where('bookId')
            .equals(book.id)
            .limit(12)
            .toArray()
            .catch(() => []);
          activeBookContext = [
            '### Active Library Book Context',
            `Book: ${book.title}`,
            `Overview: ${book.overview || 'Pending'}`,
            `Knowledge Summary: ${book.knowledgeSummary || book.summary || 'Pending'}`,
            `Chapters: ${(book.chapters || []).slice(-5).map(chapter => chapter.title).join(', ') || 'None yet'}`,
            bookConcepts.length
              ? `Mapped Concepts: ${bookConcepts.map(concept => `${concept.name} (${Math.round((concept.confidence || 0) * 100)}%)`).join(', ')}`
              : 'Mapped Concepts: None yet'
          ].join('\n');
        }
      }
      const memoryContext = [relatedMemoryContext, activeBookContext].filter(Boolean).join('\n\n');
      
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        phase: 'thinking',
        reasoningSteps: [...(m.reasoningSteps || []), { id: crypto.randomUUID(), content: 'Linking concepts...' }]
      } : m));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(serperApiKey ? { 'X-Serper-API-Key': serperApiKey } : {})
        },
        body: JSON.stringify({ 
          messages: newMessages,
          currentPageImage,
          memoryContext,
          aiModel,
          customPrompt: systemPrompt,
          activeProject: activeLearningBook?.title || activeProject,
          activeBookId: activeLearningBookId,
          serperApiKey: serperApiKey || undefined
        })
      });

      if (!res.ok) {
        let errorData = { error: 'Failed to fetch response' };
        try {
          errorData = await res.json();
        } catch (e) {
          errorData.error = `HTTP Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorData.error || 'Failed to fetch response');
      }
      
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        phase: 'synthesizing',
        reasoningSteps: [...(m.reasoningSteps || []), { id: crypto.randomUUID(), content: 'Synthesizing final answer...' }]
      } : m));
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream from chat API");
      
      const decoder = new TextDecoder("utf-8");
      let currentContent = "";
      let buffer = "";
      let lastUpdateTime = Date.now();
      const liveInputEstimate = estimateTokens(userMsgContent);
      let liveOutputEstimate = 0;
      recordChatUsage({
        provider: 'openrouter',
        model: aiModel,
        inputTokens: liveInputEstimate,
        outputTokens: 0,
        cost: 0,
        estimated: true,
        requests: 1,
      });
      const mergeSources = (current: NormalizedWebSource[] = [], incoming: NormalizedWebSource[] = []) => {
        const byUrl = new Map(current.map((source) => [source.url, source]));
        incoming.forEach((source) => byUrl.set(source.url, source));
        return Array.from(byUrl.values()).slice(0, 10);
      };
      const patchAssistantMessage = (patcher: (message: Message) => Message) => {
        setMessages(prev => {
          const newM = [...prev];
          const msgIndex = newM.findIndex(m => m.id === assistantMsgId);
          if (msgIndex !== -1) {
            newM[msgIndex] = patcher(newM[msgIndex]);
          }
          return newM;
        });
      };
      const recordWebTelemetry = (name: string, metadata: Record<string, unknown>) => {
        recordBrainRuntime({
          type: "web_search",
          name,
          metadata
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

            if (data.type === 'chunk') {
              currentContent += data.content;
              const nextLiveOutputEstimate = estimateTokens(currentContent);
              const outputDelta = nextLiveOutputEstimate - liveOutputEstimate;
              if (outputDelta > 0) {
                liveOutputEstimate = nextLiveOutputEstimate;
                recordChatUsage({
                  provider: 'openrouter',
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
                setMessages(prev => {
                  const newM = [...prev];
                  const msgIndex = newM.findIndex(m => m.id === assistantMsgId);
                  if (msgIndex !== -1) {
                    newM[msgIndex] = { ...newM[msgIndex], content: currentContent };
                  }
                  return newM;
                });
              }
            } else if (data.type === 'web_search_started') {
              recordWebSearchEvent({
                type: 'started',
                searchId: data.searchId,
                query: data.query,
                mode: data.mode
              });
              recordWebUsage({
                provider: 'serper',
                requests: 1,
                searchRequests: data.mode === 'news' ? 0 : 1,
                newsRequests: data.mode === 'news' ? 1 : 0,
                estimated: true,
              });
              recordWebTelemetry(data.query || 'web_search', {
                event: 'started',
                searchId: data.searchId,
                mode: data.mode
              });
              patchAssistantMessage((message) => ({
                ...message,
                phase: 'web_search',
                webSearch: {
                  active: true,
                  query: data.query,
                  mode: data.mode,
                  status: 'Searching web...',
                  sources: []
                }
              }));
            } else if (data.type === 'web_search_progress') {
              recordWebSearchEvent({
                type: 'progress',
                searchId: data.searchId,
                status: data.status
              });
              recordWebTelemetry(data.searchId || 'web_search', {
                event: 'progress',
                searchId: data.searchId,
                status: data.status
              });
              patchAssistantMessage((message) => ({
                ...message,
                phase: 'web_search',
                webSearch: {
                  active: true,
                  query: message.webSearch?.query,
                  mode: message.webSearch?.mode,
                  status: data.status,
                  sources: message.webSearch?.sources || []
                }
              }));
            } else if (data.type === 'web_result') {
              const source = data.source as NormalizedWebSource | undefined;
              if (!source) continue;
              recordWebSearchEvent({
                type: 'result',
                searchId: data.searchId,
                source
              });
              cacheWebSources([source]);
              recordWebTelemetry(source.domain || 'web_result', {
                event: 'result',
                searchId: data.searchId,
                url: source.url
              });
              patchAssistantMessage((message) => {
                const sources = mergeSources(message.webSearch?.sources || [], [source]);
                return {
                  ...message,
                  phase: 'web_search',
                  webSearch: {
                    active: true,
                    query: message.webSearch?.query,
                    mode: message.webSearch?.mode,
                    status: `Reviewing ${sources.length} source${sources.length === 1 ? '' : 's'}...`,
                    sources
                  },
                  sources: mergeSources(message.sources || [], [source])
                };
              });
            } else if (data.type === 'web_sources_complete') {
              const sources = (data.sources || []) as NormalizedWebSource[];
              recordWebSearchEvent({
                type: data.error ? 'error' : 'complete',
                searchId: data.searchId,
                sources,
                status: data.error || `Reviewed ${sources.length} source${sources.length === 1 ? '' : 's'}`
              });
              recordWebUsage({
                provider: 'serper',
                sourcesReviewed: sources.length,
                failures: data.error ? 1 : 0,
                estimated: true,
              });
              if (sources.length) cacheWebSources(sources);
              recordWebTelemetry(data.searchId || 'web_search', {
                event: data.error ? 'error' : 'complete',
                searchId: data.searchId,
                sourceCount: sources.length,
                error: data.error
              });
              patchAssistantMessage((message) => {
                const mergedSources = mergeSources(message.webSearch?.sources || [], sources);
                return {
                  ...message,
                  webSearch: {
                    active: false,
                    query: message.webSearch?.query,
                    mode: message.webSearch?.mode,
                    status: data.error || (mergedSources.length ? `Reviewed ${mergedSources.length} sources` : 'No web sources returned'),
                    sources: mergedSources,
                    error: data.error
                  },
                  sources: mergeSources(message.sources || [], mergedSources)
                };
              });
            } else if (data.type === 'done') {
              setSendState("success");
              const hasFlashcards = data.flashcardsUpdates && data.flashcardsUpdates.length > 0;
              const finalSources = (data.sources || []) as NormalizedWebSource[];
              if (finalSources.length) cacheWebSources(finalSources);
              if (data.usage) {
                recordChatUsage({
                  provider: data.usage.provider || 'openrouter',
                  model: data.usage.usedModel || data.usage.model || data.usage.requestedModel || aiModel,
                  inputTokens: Number(data.usage.inputTokens || 0) - liveInputEstimate,
                  outputTokens: Number(data.usage.outputTokens || 0) - liveOutputEstimate,
                  cost: Number(data.usage.cost || 0),
                  estimated: Boolean(data.usage.estimated),
                  requests: 0,
                });
              }
              setMessages(prev => {
                const newM = [...prev];
                const msgIndex = newM.findIndex(m => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  newM[msgIndex] = { 
                    ...newM[msgIndex], 
                    content: data.content,
                    hasFlashcards: hasFlashcards,
                    phase: 'complete',
                    webSearch: newM[msgIndex].webSearch
                      ? { ...newM[msgIndex].webSearch, active: false, sources: mergeSources(newM[msgIndex].webSearch.sources, finalSources) }
                      : undefined,
                    sources: mergeSources(newM[msgIndex].sources || [], finalSources)
                  };
                }
                return newM;
              });
              
              brainOrchestrator.trackInteraction(userMsgContent, data.content);
              void brainOrchestrator.updateLearningBookFromConversation({
                userName: learnerName,
                activeProject,
                activeBookId: activeLearningBookId,
                userMessage: userMsgContent,
                assistantMessage: data.content,
                apiKey
              }).catch((error) => {
                console.warn('[ChatPanel] Learning book update failed:', error);
              });
              
              if (data.graphUpdates && data.graphUpdates.length > 0) {
                data.graphUpdates.forEach((update: any) => {
                  brainOrchestrator.addOrUpdateConcept(update.name, update.description, update.understandingDelta);
                });
              }
              
              if (data.flashcardsUpdates && data.flashcardsUpdates.length > 0) {
                data.flashcardsUpdates.forEach((card: any) => {
                  db.flashcards.add({
                    id: Math.random().toString(36).substring(2, 15),
                    front: card.front,
                    back: card.back,
                    nextReviewAt: Date.now()
                  }).catch(console.error);
                });
              }
            } else if (data.type === 'status') {
              setMessages(prev => {
                const newM = [...prev];
                const msgIndex = newM.findIndex(m => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  newM[msgIndex] = { ...newM[msgIndex], phase: data.phase };
                }
                return newM;
              });
            } else if (data.type === 'reasoning_summary') {
              setMessages(prev => {
                const newM = [...prev];
                const msgIndex = newM.findIndex(m => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  const currentSteps = newM[msgIndex].reasoningSteps || [];
                  newM[msgIndex] = { 
                    ...newM[msgIndex], 
                    reasoningSteps: [...currentSteps, { id: crypto.randomUUID(), content: data.content }]
                  };
                }
                return newM;
              });
            } else if (data.type === 'info') {
              currentContent += `> ⚠️ ${data.message}\n\n`;
              setMessages(prev => {
                const newM = [...prev];
                const msgIndex = newM.findIndex(m => m.id === assistantMsgId);
                if (msgIndex !== -1) {
                  newM[msgIndex] = { ...newM[msgIndex], content: currentContent };
                }
                return newM;
              });
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
      
      setSendState("idle");
    } catch (err: any) {
       console.error(err);
       setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: `**Error:** ${err.message}`, phase: 'complete' } : m));
       setSendState("idle");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput('');
    sendMessage(currentInput);
  };

  useEffect(() => {
    if (askTutorQuery) {
      setInput(prev => prev ? prev + '\n\n' + askTutorQuery : askTutorQuery);
      setAskTutorQuery('');
    }
  }, [askTutorQuery, setAskTutorQuery]);

  // When selectedTextContext changes (from PDF "Ask Tutor" button), auto-focus input
  useEffect(() => {
    if (selectedTextContext) {
      setInput('');
    }
  }, [selectedTextContext]);

  const isAutoScrollPaused = useRef(false);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Track manual scrolling to pause auto-scroll
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      isAutoScrollPaused.current = !isNearBottom;
    };
    
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    // Use ResizeObserver to detect content height changes (like streaming text)
    const resizeObserver = new ResizeObserver(() => {
      if (!isAutoScrollPaused.current) {
        scrollEl.scrollTo({
          top: scrollEl.scrollHeight,
          behavior: 'smooth'
        });
      }
    });

    // Observe the single direct child (the inner container) or the scrollEl itself
    resizeObserver.observe(scrollEl);
    if (scrollEl.firstElementChild) {
      resizeObserver.observe(scrollEl.firstElementChild);
    }

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative z-10 w-full overflow-hidden">
      {/* Dynamic Header */}
      <div className="absolute top-0 w-full px-6 py-4 pt-6 shrink-0 z-40 bg-gradient-to-b from-[#fdfdfd] via-[#fdfdfd]/90 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.08)] bg-white border border-black/5 flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-600" />
            </div>
            <span className="text-[15px] font-semibold text-zinc-800">Tutor</span>
          </div>
          
          <div className="h-4 w-px bg-black/10" />

          {/* Context/Project Pill */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-zinc-50 border border-black/10 text-zinc-800 transition-colors group focus:outline-none shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-medium"
            >
              <Folder size={12} className="text-zinc-600 group-hover:text-zinc-800 transition-colors" />
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
              <ChevronDown size={12} className="text-zinc-500" />
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
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Library Context (Press Enter to Rename)</span>
                  </div>
                  <div className="px-2 py-1.5 mb-1 bg-black/5 rounded-lg">
                    <input 
                      type="text" 
                      placeholder="Rename current book..." 
                      className="w-full bg-transparent text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                          const nextTitle = e.currentTarget.value.trim();
                          void brainOrchestrator.updateSessionBookTitle(nextTitle, learnerName, 'chat')
                            .then((book) => {
                              setActiveLearningBookId(book.id);
                              setActiveProject(book.title);
                            })
                            .catch((error) => {
                              console.warn('[ChatPanel] Active book rename failed:', error);
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
                          <span className="block truncate text-[13px] font-medium">{book.title}</span>
                          <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                            {book.conversationCount} chats · {book.chapters?.length || 0} chapters
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
              if (window.confirm("Are you sure you want to clear the chat history?")) {
                setMessages([{
                  id: '1',
                  role: 'assistant',
                  content: INITIAL_MESSAGE
                }]);
              }
            }}
            title="Clear Chat History"
            className="p-1.5 rounded-full hover:bg-black/5 text-[#9a9a9f] hover:text-zinc-800 transition-colors focus:outline-none"
          >
            <RotateCcw size={15} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
            >
              <Minus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-[90px] py-4 pb-52 space-y-8 custom-scroll" ref={scrollRef}>
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
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full p-4 shrink-0 bg-gradient-to-t from-[#fdfdfd] via-[#fdfdfd]/90 to-transparent z-40">
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
              <div className="relative flex items-start gap-3 p-3 rounded-2xl overflow-hidden"
                style={{ background: 'rgba(18, 18, 20, 0.95)', backdropFilter: 'blur(20px)' }}
              >
                {/* Animated conic-gradient border — same as FloatingSkillsMenu action bar */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden" style={{
                  padding: '1px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude'
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                    className="absolute inset-[-50%] w-[200%] h-[200%]"
                    style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.05) 60%, transparent 100%)' }}
                  />
                </div>

                {/* Left icon */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/10 mt-0.5">
                  <Sparkles size={11} className="text-zinc-300" />
                </div>

                {/* Label + text */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-0.5">From PDF Selection</div>
                  <p className="max-h-24 overflow-y-auto pr-2 text-[12px] text-zinc-200 leading-snug whitespace-pre-wrap break-words font-medium custom-scrollbar">
                    "{selectedTextContext}"
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => setSelectedTextContext('')}
                  className="shrink-0 p-1.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors focus:outline-none mt-0.5"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="relative flex items-end w-full max-w-3xl mx-auto bg-[#18181b] rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] mb-2 overflow-visible"
        >
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
                    <SiriLiquidGlass isActive={true} isHovered={true} isValid={true} />
                  )}
                  <div
                    className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)',
                      backgroundSize: '4px 4px'
                    }}
                  />
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.3)] pointer-events-none mix-blend-screen" />
                </div>
              </div>
              <motion.div
                className="absolute z-10 flex items-center justify-center rounded-full group-hover:brightness-110 overflow-hidden"
                variants={{
                  idle: { inset: "3.5px", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                  hover: { inset: "3.5px", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                  tap: { inset: "4.5px", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ background: "linear-gradient(180deg, #262626 0%, #1a1a1a 45%, #080808 100%)" }}
              >
                <motion.div 
                  className="absolute z-20 flex items-center justify-center"
                  animate={{ rotate: isSkillsMenuOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Plus size={18} className={isSkillsMenuOpen ? "text-white" : "text-zinc-300"} strokeWidth={isSkillsMenuOpen ? 3 : 2.5} style={{ filter: isSkillsMenuOpen ? 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' : 'none' }} />
                </motion.div>
              </motion.div>
            </motion.button>
            <FloatingSkillsMenu isOpen={isSkillsMenuOpen} onClose={() => setIsSkillsMenuOpen(false)} onSelectSkill={(skill) => { if (skill === 'Search') setIsSearchSkillActive(true); }} />
          </div>

          <div className="relative flex-1 flex items-center justify-center min-h-[60px]">
            {isSearchSkillActive && (
              <div className="absolute top-2 left-4 flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md text-[10px] font-bold uppercase tracking-wider z-20">
                <Search size={10} strokeWidth={3} /> Web Search
                <button onClick={() => setIsSearchSkillActive(false)} className="ml-1 hover:text-white transition-colors"><X size={10} strokeWidth={3} /></button>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {voiceState === "idle" ? (
                <motion.textarea
                  key="text-input"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  transition={{ duration: 0.2 }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isSearchSkillActive ? "Search the web..." : "Ask anything about the document..."}
                  className={`w-full h-full bg-transparent border-none outline-none text-[15px] px-4 ${isSearchSkillActive ? 'pt-8 pb-3' : 'py-5'} max-h-[200px] min-h-[60px] resize-none text-zinc-100 placeholder:text-zinc-500 caret-white custom-scroll z-10`}
                  rows={1}
                  style={{ fieldSizing: 'content' } as any}
                />
              ) : (
                <motion.div
                  key="voice-pill"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  <GeminiVoicePill state={voiceState} />
                </motion.div>
              )}
            </AnimatePresence>
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
                      <SiriLiquidGlass isActive={true} isHovered={true} isValid={true} />
                    )}
                    <div
                      className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
                      style={{
                        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)',
                        backgroundSize: '4px 4px'
                      }}
                    />
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.3)] pointer-events-none mix-blend-screen" />
                  </div>
                </div>

                <motion.div
                  className="absolute z-10 flex items-center justify-center rounded-full group-hover:brightness-110 overflow-hidden"
                  variants={{
                    idle: { inset: "3.5px", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                    hover: { inset: "3.5px", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                    tap: { inset: "4.5px", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                    sending: { inset: "4.5px", borderRadius: "50%" },
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{ background: "linear-gradient(180deg, #262626 0%, #1a1a1a 45%, #080808 100%)" }}
                >
                  <motion.div
                    className="absolute z-20 flex items-center justify-center"
                  >
                    {voiceState === "idle" ? (
                      <Mic size={18} className="text-zinc-300" />
                    ) : voiceState === "listening" ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-50" />
                        <div className="absolute inset-[-4px] rounded-full bg-emerald-500/20 blur animate-pulse" />
                        <Mic size={18} className="relative z-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-[-4px] rounded-full bg-blue-500/20 blur animate-pulse" />
                        <Activity size={18} className="relative z-10 animate-pulse text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
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
                success: { scale: 1, transition: { type: "spring", stiffness: 500, damping: 12 }, borderRadius: "50%" },
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
                    <SiriLiquidGlass isActive={isActive} isHovered={isHovered} isValid={isValid} />
                  )}
                  <div
                    className="absolute inset-0 mix-blend-overlay opacity-[0.35] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1px, transparent 1px)',
                      backgroundSize: '4px 4px'
                    }}
                  />
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.3)] pointer-events-none mix-blend-screen" />
                </div>
              </div>

              <motion.div
                className="absolute z-10 flex items-center justify-center rounded-full group-hover:brightness-110 overflow-hidden"
                variants={{
                  idle: { inset: "3.5px", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                  hover: { inset: "3.5px", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                  tap: { inset: "4.5px", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.9)", borderRadius: "50%" },
                  sending: { inset: "4.5px", borderRadius: "50%" },
                  success: { inset: "3.5px", borderRadius: "50%" },
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ background: "linear-gradient(180deg, #262626 0%, #1a1a1a 45%, #080808 100%)" }}
              >
                <motion.div
                  variants={{
                    idle: { y: 0, opacity: 1, scale: 1 }, hover: { y: 0, opacity: 1, scale: 1 }, tap: { y: 2, opacity: 1, scale: 0.9 }, sending: { y: -30, opacity: 0, scale: 0.5 }, success: { y: 30, opacity: 0, scale: 0.5 },
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute z-20 flex items-center justify-center"
                >
                  <ArrowUp
                    className="w-[18px] h-[18px] transition-all duration-300"
                    color={isActive && isValid ? "#ECECEC" : "#555555"}
                    style={{ filter: isActive && isValid ? 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' : 'drop-shadow(0 1px 2px rgba(0,0,0,1))' }}
                    strokeWidth={2.5}
                  />
                </motion.div>

                <motion.div
                  variants={{
                    idle: { opacity: 0, scale: 0.5 }, hover: { opacity: 0, scale: 0.5 }, tap: { opacity: 0, scale: 0.5 }, sending: { opacity: 1, scale: 1 }, success: { opacity: 0, scale: 1.5 },
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-30 flex items-center justify-center mix-blend-screen"
                >
                  <motion.div
                    animate={{ rotate: sendState === "sending" ? 360 : 0 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </motion.div>
                </motion.div>

                <motion.div
                  variants={{
                    idle: { opacity: 0, scale: 0.5, y: -20 }, hover: { opacity: 0, scale: 0.5, y: -20 }, tap: { opacity: 0, scale: 0.5, y: -20 }, sending: { opacity: 0, scale: 0.5, y: -20 }, success: { opacity: 1, scale: 1, y: 0 },
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute z-40 flex items-center justify-center"
                >
                  <Check className="w-[18px] h-[18px] text-white" strokeWidth={3} />
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
    </div>
  );
}
