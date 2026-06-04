import React, {
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
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
  Clock,
} from "lucide-react";
import { gsap } from "gsap";
import { useLiveQuery } from "dexie-react-hooks";
import { audio } from "../lib/audio";
import { SiriLiquidGlass } from "./SiriLiquidGlass";
import { useStore, type NormalizedWebSource } from "../store";
import { brainOrchestrator } from "../memory/memory.orchestrator";
import { db, GENERAL_STUDY_BOOK_ID } from "../memory/longterm.memory";
import {
  recordGeneratedFlashcardsArtifact,
  recordUnavailableCitationState,
  recordWebSourceArtifact,
} from "../memory/artifact.records";
import { recordMemoryEvent } from "../memory/memory.events";
import { recordModelRunEvent } from "../memory/model.runs";
import { recordToolJobEvent } from "../memory/tool.jobs";
import { recordEvaluatedAnswerEvidenceBatch } from "../memory/answer.evidence";
import { createFlashcardForStorage } from "../memory/flashcard.concepts";
import type {
  BookChatThread,
  LearningDocument,
  MemoryEvent,
} from "../memory/longterm.memory";
import type { Message } from "../types";
import { FloatingSkillsMenu } from "./FloatingSkillsMenu";
import { useTranslation } from "../lib/translations";
import {
  estimateServiceMinutes,
  formatServiceTime,
  getPlanOption,
  serviceMilestones,
} from "../lib/accessPlans";
import {
  INTERACTION_THINKING_PAUSE_MS,
  type TutorInteractionMode,
} from "../lib/interactionModel";
import { buildBrainContextPacket } from "../memory/brain.context";
import {
  buildVoiceFunctionCallResponse,
  parseVoiceFunctionArguments,
  type VoiceAgentFunctionCall,
} from "../lib/voiceAgentTools";
import {
  chatTitleFromMessageSet,
  flattenChatMessagesForPrompt,
  hasLearnerChatTurn,
  meaningfulChatMessages,
  summarizeChatThreadPersistence,
} from "../lib/chatThreadUtils";

type MermaidApi = typeof import("mermaid").default;
type Variants = Record<string, Record<string, any>>;
type MotionTarget = string | false | null | undefined | Record<string, any>;
type MotionTransition = {
  delay?: number;
  duration?: number;
  ease?: string | number[];
  repeat?: number;
  type?: string;
};
type MotionLikeProps = {
  animate?: MotionTarget;
  exit?: MotionTarget;
  initial?: MotionTarget;
  layout?: boolean | string;
  layoutId?: string;
  transition?: MotionTransition;
  variants?: Variants;
  whileHover?: MotionTarget;
  whileTap?: MotionTarget;
};

const AnimatePresence = ({
  children,
}: {
  children: React.ReactNode;
  initial?: boolean;
  mode?: string;
}) => <>{children}</>;

const toMotionTarget = (target: MotionTarget, variants?: Variants) => {
  if (!target) return undefined;
  if (typeof target === "string") return variants?.[target];
  return target;
};

const normalizeGsapVars = (target?: Record<string, any>) => {
  if (!target) return undefined;
  return Object.entries(target).reduce<Record<string, any>>(
    (acc, [key, value]) => {
      if (value === undefined) return acc;
      acc[key] = Array.isArray(value) ? value[value.length - 1] : value;
      return acc;
    },
    {},
  );
};

const resolveEase = (transition?: MotionTransition) => {
  if (!transition?.ease) return "power3.out";
  if (Array.isArray(transition.ease)) return "power3.out";
  if (transition.ease === "linear") return "none";
  if (transition.ease === "easeInOut") return "power2.inOut";
  if (transition.ease === "easeOut") return "power3.out";
  if (transition.ease === "easeIn") return "power2.in";
  return transition.type === "spring" ? "power3.out" : transition.ease;
};

const transitionToGsap = (transition?: MotionTransition) => ({
  delay: transition?.delay ?? 0,
  duration:
    transition?.duration ?? (transition?.type === "spring" ? 0.34 : 0.24),
  ease: resolveEase(transition),
  repeat: transition?.repeat === Infinity ? -1 : transition?.repeat,
});

function createMotionElement(tag: string) {
  return React.forwardRef<HTMLElement, MotionLikeProps & Record<string, any>>(
    (
      {
        animate,
        children,
        exit: _exit,
        initial,
        layout: _layout,
        layoutId,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
        onMouseUp,
        transition,
        variants,
        whileHover,
        whileTap,
        ...rest
      }: any,
      forwardedRef,
    ) => {
      const localRef = useRef<HTMLElement | null>(null);
      const animateKey = JSON.stringify({ animate, transition, variants });
      const initialKey = JSON.stringify(initial);

      const assignRef = (node: HTMLElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLElement | null>).current =
            node;
        }
      };

      const animateTo = (target: MotionTarget) => {
        const node = localRef.current;
        if (!node) return;
        const vars = normalizeGsapVars(toMotionTarget(target, variants));
        if (!vars) return;
        gsap.to(node, {
          ...vars,
          ...transitionToGsap(transition),
          overwrite: "auto",
        });
      };

      useLayoutEffect(() => {
        const node = localRef.current;
        if (!node) return;
        const from = normalizeGsapVars(toMotionTarget(initial, variants));
        const to = normalizeGsapVars(toMotionTarget(animate, variants));
        gsap.killTweensOf(node);

        if (from && to) {
          gsap.fromTo(node, from, {
            ...to,
            ...transitionToGsap(transition),
            overwrite: "auto",
          });
          return;
        }

        if (to) {
          gsap.to(node, {
            ...to,
            ...transitionToGsap(transition),
            overwrite: "auto",
          });
        }
      }, [animateKey, initialKey]);

      return React.createElement(
        tag,
        {
          ...rest,
          "data-layout-id": layoutId,
          ref: assignRef,
          onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
            onMouseDown?.(event);
            animateTo(whileTap);
          },
          onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
            onMouseEnter?.(event);
            animateTo(whileHover);
          },
          onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
            onMouseLeave?.(event);
            animateTo(animate || initial);
          },
          onMouseUp: (event: React.MouseEvent<HTMLElement>) => {
            onMouseUp?.(event);
            animateTo(whileHover || animate || initial);
          },
        },
        children,
      );
    },
  );
}

const gsapMotion = {
  a: createMotionElement("a"),
  button: createMotionElement("button"),
  div: createMotionElement("div"),
  span: createMotionElement("span"),
  textarea: createMotionElement("textarea"),
};

type StreamingAssistantDraft = {
  id: string;
  content: string;
  usage?: NonNullable<Message["usage"]>;
};

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

type VoiceCaption = {
  role: "user" | "assistant";
  text: string;
} | null;
type VoiceSessionTurn = {
  role: "user" | "assistant";
  content: string;
};
type VoiceStudyContextPayload = {
  requestId?: string;
  proofAttemptId?: string;
  studyContext: string;
  studyContextChars: number;
  rawContextChars: number;
  memoryContextChars: number;
  activeBookContextChars: number;
  documentContextChars: number;
  documentCount: number;
  documentIds: string[];
  readyDocumentCount: number;
  readyDocumentIds: string[];
  contextDocumentIds: string[];
  unreadyDocumentCount: number;
  omittedReadyDocumentCount: number;
  contextCompacted: boolean;
};

const VOICE_AGENT_CONTEXT_CHAR_LIMIT = 7000;

const createTutorRequestId = (prefix: "chat" | "voice") => {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${randomPart}`
    .replace(/[^A-Za-z0-9_:-]/g, "-")
    .slice(0, 120);
};

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
  return `${d}Z`;
};

const chunkCaption = (text: string): string[] => {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const chunks: string[] = [];
  let current: string[] = [];
  words.forEach((word) => {
    current.push(word);
    const endsSentence = /[.!?,;:]$/.test(word);
    if (current.length >= 13 || (endsSentence && current.length >= 6)) {
      chunks.push(current.join(" "));
      current = [];
    }
  });
  if (current.length) chunks.push(current.join(" "));
  return chunks;
};

const END_INTENT_PATTERNS: RegExp[] = [
  /\b(i'?m|i am|we'?re|we are)\s+(done|finished|good|all set|all done)\b/,
  /\bthat'?s?\s+(all|it|enough)\b/,
  /\bno\s+(more|further)\s+questions\b/,
  /\b(good\s?bye|bye\s?bye|bye|see\s+(you|ya)|talk\s+later|catch\s+you\s+later)\b/,
  /\b(end|close|stop|finish|exit|quit)\s+(the\s+)?(call|conversation|chat|session|audio|voice)\b/,
  /\b(end|stop|close|finish)\s+(it|this|that)\b/,
  /\b(let'?s|let\s+us)\s+(stop|end|finish|wrap\s+(it\s+)?up)\b/,
  /\bwrap\s+(it|this)\s+up\b/,
  /\bi\s+(have\s+to|need\s+to|gotta|got\s+to)\s+go\b/,
  /\b(thanks|thank\s+you)[,!.\s]*(that'?s\s+(all|it)|bye|good\s?bye)\b/,
];
const STOP_COMMAND =
  /^(ok(ay)?|alright|yeah|yep|cool)?[,\s]*(please\s+)?(stop( it| now| talking)?|quiet|silence|enough|that'?s\s+enough)[\s,]*(now|please)?[.!]*$/;

const detectEndIntent = (raw: string): boolean => {
  const text = (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return false;
  return (
    STOP_COMMAND.test(text) || END_INTENT_PATTERNS.some((re) => re.test(text))
  );
};

const deriveFallbackTitle = (turns: VoiceSessionTurn[]): string => {
  const first =
    turns.find((turn) => turn.role === "user")?.content ||
    turns[0]?.content ||
    "";
  const words = first.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return "Voice conversation";
  const title = words.join(" ").replace(/[.,!?;:]+$/, "");
  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);
  return capitalized.length > 48
    ? `${capitalized.slice(0, 48)}...`
    : capitalized;
};

const compactVoiceEventText = (text: string, maxLength = 120) => {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
};

const voiceServerWsUrl = () => {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostPort =
    import.meta.env.DEV && /^517\d$/.test(window.location.port)
      ? `${window.location.hostname}:3000`
      : window.location.host;
  return `${wsProtocol}//${hostPort}`;
};

const captureCurrentPdfPageImage = () => {
  const canvas = document.querySelector(
    ".react-pdf__Page__canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas) return null;

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
    return offscreen.toDataURL("image/jpeg", 0.6);
  }
  return canvas.toDataURL("image/jpeg", 0.5);
};

const RollingSubtitle = ({ caption }: { caption: VoiceCaption }) => {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!caption?.text.trim()) {
      setDisplay("");
      return;
    }
    const chunks = chunkCaption(caption.text);
    if (!chunks.length) {
      setDisplay("");
      return;
    }
    let index = 0;
    setDisplay(chunks[0]);
    if (chunks.length === 1) return;

    let timer: ReturnType<typeof setTimeout>;
    const durationFor = (chunk: string) =>
      Math.max(1400, chunk.split(/\s+/).length * 360);
    const advance = () => {
      index += 1;
      if (index < chunks.length) {
        setDisplay(chunks[index]);
        timer = setTimeout(advance, durationFor(chunks[index]));
      }
    };
    timer = setTimeout(advance, durationFor(chunks[0]));
    return () => clearTimeout(timer);
  }, [caption?.role, caption?.text]);

  if (!display) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[15%] flex justify-center px-8">
      <p
        className={`max-w-xl text-balance text-center text-base font-medium leading-snug transition-opacity ${
          caption?.role === "assistant" ? "text-white" : "text-white/65"
        }`}
        style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}
      >
        {display}
      </p>
    </div>
  );
};

const MorphBlob = ({ speaking }: { speaking: boolean }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const sheenRef = useRef<SVGPathElement>(null);
  const auraRef = useRef<SVGCircleElement>(null);
  const micRef = useRef(0);
  const ttsRef = useRef(0);
  const levelRef = useRef(0);

  useEffect(() => {
    const onMic = (event: Event) => {
      micRef.current = Math.min(
        1,
        Number((event as CustomEvent<number>).detail || 0),
      );
    };
    const onTts = (event: Event) => {
      ttsRef.current = Math.min(
        1,
        Number((event as CustomEvent<number>).detail || 0),
      );
    };
    window.addEventListener("mic-volume", onMic);
    window.addEventListener("tts-volume", onTts);

    const points = 12;
    const center = 160;
    const baseRadius = 92;
    const seeds = Array.from(
      { length: points },
      (_, index) => index * 1.7 + Math.sin(index) * 2,
    );
    let frame = 0;
    const animate = (timestamp: number) => {
      const target = Math.max(micRef.current, ttsRef.current);
      levelRef.current += (target - levelRef.current) * 0.18;
      const level = levelRef.current;
      const time = timestamp / 1000;
      const amp = 0.07 + level * 0.28;
      const expand = 1 + level * 0.2;
      const pts: Array<[number, number]> = [];
      for (let index = 0; index < points; index += 1) {
        const angle = (index / points) * Math.PI * 2;
        const noise =
          Math.sin(time * 1.1 + seeds[index]) * 0.5 +
          Math.sin(time * 1.9 + seeds[index] * 1.7) * 0.3 +
          Math.sin(time * 0.6 + angle * 3) * 0.2;
        const radius = baseRadius * expand * (1 + noise * amp);
        pts.push([
          center + Math.cos(angle) * radius,
          center + Math.sin(angle) * radius,
        ]);
      }
      const path = buildBlobPath(pts);
      pathRef.current?.setAttribute("d", path);
      glowRef.current?.setAttribute("d", path);
      sheenRef.current?.setAttribute("d", path);
      if (auraRef.current) {
        auraRef.current.setAttribute("r", `${118 * (1 + level * 0.28)}`);
        auraRef.current.setAttribute(
          "opacity",
          `${Math.min(0.95, 0.52 + level * 0.42)}`,
        );
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("mic-volume", onMic);
      window.removeEventListener("tts-volume", onTts);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      viewBox="0 0 320 320"
      className="h-72 w-72 overflow-visible sm:h-[380px] sm:w-[380px]"
      style={{
        filter:
          "saturate(1.2) brightness(1.06) drop-shadow(0 0 48px rgba(124,92,255,0.55)) drop-shadow(0 0 90px rgba(91,108,240,0.4))",
      }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="voice-blob-aura">
          <stop offset="0%" stopColor="#b18cff" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#6a6cff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6a6cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="voice-blob-fill" cx="55%" cy="42%" r="72%">
          <stop offset="0%" stopColor="#c45cf2" />
          <stop offset="42%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#3f5bf0" />
        </radialGradient>
        <linearGradient id="voice-blob-sheen" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#bcd4ff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter
          id="voice-aura-blur"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="20" />
        </filter>
      </defs>
      <circle
        ref={auraRef}
        cx={160}
        cy={160}
        r={118}
        fill="url(#voice-blob-aura)"
        filter="url(#voice-aura-blur)"
      />
      <path
        ref={glowRef}
        fill="url(#voice-blob-fill)"
        opacity={speaking ? 0.84 : 0.66}
        style={{ filter: "blur(26px)" }}
      />
      <path ref={pathRef} fill="url(#voice-blob-fill)" />
      <path
        ref={sheenRef}
        fill="url(#voice-blob-sheen)"
        opacity={0.35}
        style={{ mixBlendMode: "screen" }}
      />
    </svg>
  );
};

const VoiceUniverse = ({
  state,
  caption,
}: {
  state: "listening" | "speaking";
  caption: VoiceCaption;
}) => {
  const label = state === "speaking" ? "Aria is speaking" : "Listening";
  return (
    <gsapMotion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-[#030303]"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(124,92,255,0.24),transparent_34%),radial-gradient(circle_at_18%_70%,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_82%_72%,rgba(255,110,0,0.12),transparent_26%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-24">
        <div className="mb-5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/55 backdrop-blur-xl">
          {label}
        </div>
        <MorphBlob speaking={state === "speaking"} />
      </div>
      <RollingSubtitle caption={caption} />
    </gsapMotion.div>
  );
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
    <gsapMotion.div
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
          <gsapMotion.div
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
          </gsapMotion.div>
        )}
      </AnimatePresence>
    </gsapMotion.div>
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
      <gsapMotion.div
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
      </gsapMotion.div>
    );
  },
);

const INITIAL_MESSAGE = `**Hello. I'm your AI Tutor.**

I'm ready to help you explore concepts, discuss code, and break down complex subjects. Here are a few things we can do:
- **Analyze Documents:** Upload a PDF and ask me questions about specific pages.
- **Discuss Code:** Paste code snippets and we can debug or refactor them.
- **Learn Concepts:** Ask me general programming and computer science questions.

What would you like to learn today?`;

type ChatArchive = {
  id: string;
  title: string;
  bookId: string | null;
  bookTitle: string;
  updatedAt: number;
  messages: Message[];
};

const CHAT_ARCHIVE_KEY = "learning_ai_chat_archives_v1";
const RESERVED_LIBRARY_CONTEXT_PATTERN =
  /\b(admin\s*dashboard|app\s*design|system\s*architecture|tutor\s*system\s*architecture)\b/i;

const isReservedLibraryContext = (title?: string | null) =>
  RESERVED_LIBRARY_CONTEXT_PATTERN.test(String(title || ""));

const isGenericLibraryTitle = (title?: string | null) =>
  /^(general study|conversation notes|study session)$/i.test(
    String(title || "").trim(),
  );

const readChatArchives = (): ChatArchive[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_ARCHIVE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
};

const writeChatArchives = (archives: ChatArchive[]) => {
  localStorage.setItem(CHAT_ARCHIVE_KEY, JSON.stringify(archives.slice(0, 20)));
};

const archiveChatSnapshot = (
  items: Message[],
  bookId: string | null,
  bookTitle: string,
) => {
  const archivedMessages = meaningfulChatMessages(items);
  if (!archivedMessages.some(hasLearnerChatTurn)) return [];
  const title = chatTitleFromMessageSet(archivedMessages, bookTitle, 64);
  const snapshot: ChatArchive = {
    id: bookId || `chat:${Date.now()}`,
    title,
    bookId,
    bookTitle: bookTitle || "General Study",
    updatedAt: Date.now(),
    messages: [
      {
        id: "1",
        role: "assistant",
        content: INITIAL_MESSAGE,
      },
      ...archivedMessages,
    ],
  };
  const next = [
    snapshot,
    ...readChatArchives().filter((archive) => archive.id !== snapshot.id),
  ].slice(0, 20);
  writeChatArchives(next);
  return next;
};

const defaultChatMessages = (): Message[] => [
  {
    id: "1",
    role: "assistant",
    content: INITIAL_MESSAGE,
  },
];

const normalizeChatMessages = (items?: Message[] | null): Message[] => {
  if (!Array.isArray(items) || items.length === 0) return defaultChatMessages();
  const hasGreeting = items.some((item) => item.id === "1");
  return hasGreeting ? items : [...defaultChatMessages(), ...items];
};

const chatThreadIdForBook = (bookId: string) => `thread:${bookId}`;

const chatTitleFromMessages = (items: Message[], fallback: string) => {
  return chatTitleFromMessageSet(items, fallback, 72);
};

const shouldRecordBookChatThreadSave = (
  existing: BookChatThread | undefined,
  thread: BookChatThread,
) => {
  const summary = summarizeChatThreadPersistence(thread.messages);
  if (summary.meaningfulMessageCount === 0 || summary.mode === "empty") {
    return null;
  }
  if (existing) {
    const previous = summarizeChatThreadPersistence(existing.messages);
    if (previous.signature === summary.signature) return null;
  }
  return summary;
};

const recordBookChatThreadSaveEvent = async (
  thread: BookChatThread,
  summary: NonNullable<ReturnType<typeof shouldRecordBookChatThreadSave>>,
  proofAttemptId?: string,
) => {
  await recordMemoryEvent({
    eventType: "book_chat_thread_saved",
    status: "completed",
    source: "book_chat_thread_persistence",
    sessionId: summary.mode === "voice" ? summary.lastRequestId : undefined,
    bookId: thread.bookId,
    conversationId: thread.id,
    traceId: summary.lastRequestId || undefined,
    summary: `Saved ${summary.mode} study thread "${thread.title}" with ${summary.meaningfulMessageCount} meaningful messages.`,
    retentionPolicy: "local_indexeddb",
    metadata: {
      mode: summary.mode,
      requestId: summary.lastRequestId || undefined,
      proofAttemptId,
      requestIds: summary.requestIds,
      requestCorrelated: summary.requestCorrelated,
      hasTypedChat: summary.hasTypedChat,
      hasVoiceSession: summary.hasVoiceSession,
      messageCount: summary.messageCount,
      meaningfulMessageCount: summary.meaningfulMessageCount,
      typedTurnCount: summary.typedTurnCount,
      voiceSessionCount: summary.voiceSessionCount,
      voiceTurnCount: summary.voiceTurnCount,
      lastMessageId: summary.lastMessageId,
      persistenceSignature: summary.signature,
      threadId: thread.id,
      threadTitle: thread.title,
      bookTitle: thread.bookTitle,
    },
  });
};

const persistBookChatThread = async (
  bookId: string | null | undefined,
  bookTitle: string,
  items: Message[],
  proofAttemptId?: string,
) => {
  if (!bookId) return null;
  const now = Date.now();
  const id = chatThreadIdForBook(bookId);
  const existing = await db.bookChatThreads.get(id).catch(() => undefined);
  const thread: BookChatThread = {
    id,
    bookId,
    bookTitle: bookTitle || "General Study",
    title: chatTitleFromMessages(items, bookTitle),
    messages: normalizeChatMessages(items),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const persistenceSummary = shouldRecordBookChatThreadSave(existing, thread);
  await db.bookChatThreads.put(thread);
  if (persistenceSummary) {
    await recordBookChatThreadSaveEvent(
      thread,
      persistenceSummary,
      proofAttemptId,
    );
  }
  return thread;
};

// ─── Smooth animated counter ──────────────────────────────────────────────────
function useAnimatedNumber(target: number, duration = 600): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayedRef.current;
    const to = target;
    if (from === to) return;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const next = Math.round(from + (to - from) * eased);
      displayedRef.current = next;
      setDisplayed(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        displayedRef.current = to;
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
  if (
    model === "deepseek/deepseek-v4-flash" ||
    model === "deepseek/deepseek-chat"
  )
    return "DeepSeek V4 Flash";
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
  <span
    className={`inline-block min-w-[3ch] text-right tabular-nums transition-[color,opacity] duration-200 ${className}`}
    style={{ fontVariantNumeric: "tabular-nums" }}
  >
    {children}
  </span>
);

export const UsageAnalyticsStrip = () => {
  const accessMode = useStore((state) => state.accessMode);
  const planTier = useStore((state) => state.planTier);
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
    if (accessMode !== "admin") return;
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
  }, [accessMode]);

  const chatTotal = chatUsage.inputTokens + chatUsage.outputTokens;
  const voiceBillable =
    voiceUsage.connectionSeconds + voiceUsage.ttsCharacters / 80;
  const chatWidth = `${Math.max(6, Math.min(100, (chatTotal / 1_000_000) * 100))}%`;
  const voiceWidth = `${Math.max(6, Math.min(100, (voiceBillable / 3600) * 100))}%`;
  const totalCost = chatUsage.cost + voiceUsage.cost + webUsage.cost;
  const plan = getPlanOption(planTier);
  const usedRequests = chatUsage.requests + webUsage.requests;
  const remainingRequests = Math.max(0, plan.dailyRequests - usedRequests);
  const requestWidth = `${Math.max(6, Math.min(100, (usedRequests / plan.dailyRequests) * 100))}%`;
  const serviceMinutes = estimateServiceMinutes({
    chatRequests: chatUsage.requests,
    webRequests: webUsage.requests,
    voiceSeconds: liveVoiceSec,
  });
  const serviceWidth = `${Math.max(6, Math.min(100, (serviceMinutes / 180) * 100))}%`;

  if (accessMode === "user") {
    return (
      <gsapMotion.div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0a] text-[#fefefe] shadow-[0_18px_54px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_16%_0%,rgba(255,110,0,0.26),transparent_36%),radial-gradient(circle_at_90%_110%,rgba(34,211,238,0.12),transparent_38%)]" />
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
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ff6e00]/25 bg-[#ff6e00]/12 text-[#ffb17a]">
                <Clock size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {plan.name} plan
                </div>
                <div className="truncate text-[13px] font-semibold text-white">
                  {formatCount(remainingRequests)} requests left
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:min-w-[390px] sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  <span>Rate limit</span>
                  <span>
                    {formatCount(usedRequests)} /{" "}
                    {formatCount(plan.dailyRequests)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <gsapMotion.div
                    className="h-full rounded-full bg-[#ff6e00] shadow-[0_0_14px_rgba(255,110,0,0.55)]"
                    animate={{ width: requestWidth }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 backdrop-blur">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  <span>Study time</span>
                  <span>{formatServiceTime(serviceMinutes)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <gsapMotion.div
                    className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.42)]"
                    animate={{ width: serviceWidth }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <gsapMotion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative overflow-hidden border-t border-white/10"
            >
              <div className="grid gap-2 p-3 text-[11px] text-white/55 md:grid-cols-3">
                {serviceMilestones.map((milestone) => {
                  const reached = serviceMinutes >= milestone.minutes;
                  return (
                    <div
                      key={milestone.label}
                      className="rounded-xl border border-white/10 bg-white/[0.06] p-3"
                    >
                      <div
                        className={`mb-2 h-2 rounded-full ${
                          reached
                            ? "bg-[#ff6e00] shadow-[0_0_14px_rgba(255,110,0,0.45)]"
                            : "bg-white/10"
                        }`}
                      />
                      <div className="font-semibold text-white">
                        {milestone.label}
                      </div>
                      <div>
                        {reached ? "Milestone reached" : "Keep studying"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </gsapMotion.div>
          )}
        </AnimatePresence>
      </gsapMotion.div>
    );
  }

  return (
    <gsapMotion.div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0a] text-[#fefefe] shadow-[0_18px_54px_rgba(0,0,0,0.34)]">
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
                <gsapMotion.div
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
                <gsapMotion.div
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
                <gsapMotion.div
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
          <gsapMotion.div
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
          </gsapMotion.div>
        )}
      </AnimatePresence>
    </gsapMotion.div>
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
    <gsapMotion.div
      initial={{ y: 50, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 50, opacity: 0, scale: 0.9 }}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center justify-center overflow-hidden rounded-[28px] border border-zinc-200/70 bg-[#faf9f6]/95 shadow-[0_24px_70px_rgba(24,24,27,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-3xl z-[100]"
      style={{
        width: state === "speaking" ? "300px" : "240px",
        height: "64px",
        transition: "width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden blur-[10px] opacity-70">
        <gsapMotion.div
          className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
          animate={{ rotate: 360 }}
          transition={{
            duration: state === "speaking" ? 3 : 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <gsapMotion.div
            className="absolute top-[10%] right-[30%] w-[40%] h-[40%] bg-[#0a84ff] rounded-full mix-blend-screen"
            animate={{ scale: 1 + vol * 1.5, x: vol * 10, y: vol * 10 }}
            transition={{ type: "spring", bounce: 0.5 }}
          />
          <gsapMotion.div
            className="absolute bottom-[30%] right-[10%] w-[45%] h-[45%] bg-[#bf5af2] rounded-full mix-blend-screen"
            animate={{ scale: 1 + vol * 1.2, x: -(vol * 10) }}
            transition={{ type: "spring", bounce: 0.5 }}
          />
          <gsapMotion.div
            className="absolute bottom-[10%] left-[30%] w-[50%] h-[50%] bg-[#ff375f] rounded-full mix-blend-screen"
            animate={{ scale: 1 + vol * 1.4, y: -(vol * 15) }}
            transition={{ type: "spring", bounce: 0.5 }}
          />
        </gsapMotion.div>
      </div>

      <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 px-6 py-2 font-medium tracking-wide text-zinc-950 shadow-[0_12px_34px_rgba(24,24,27,0.12)] backdrop-blur-md">
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
    </gsapMotion.div>
  );
};

const sourceToneForDomain = (domain = "") => {
  const value = domain.toLowerCase();
  if (value.includes("youtube"))
    return {
      label: "YT",
      className: "bg-[#ff0033] text-white",
      icon: Play,
    };
  if (value.includes("reddit"))
    return { label: "R", className: "bg-[#ff4500] text-white", icon: null };
  if (value.includes("ncbi") || value.includes("nih") || value.includes("pmc"))
    return {
      label: "P",
      className: "bg-slate-800 text-white",
      icon: BookOpen,
    };
  if (value.includes("investopedia"))
    return {
      label: "I",
      className: "bg-[#29364f] text-white",
      icon: Activity,
    };
  return {
    label: (domain || "?").slice(0, 1).toUpperCase(),
    className: "bg-zinc-900 text-white",
    icon: Globe2,
  };
};

const SourceGlyph = ({
  domain,
  className = "h-5 w-5",
}: {
  domain: string;
  className?: string;
}) => {
  const tone = sourceToneForDomain(domain);
  const Icon = tone.icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md text-[10px] font-black shadow-sm ${tone.className} ${className}`}
      aria-hidden="true"
    >
      {Icon ? <Icon size={12} strokeWidth={2.5} /> : tone.label}
    </span>
  );
};

const SearchProgressIndicator = ({
  active,
  error,
}: {
  active: boolean;
  error?: boolean;
}) => (
  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
    {active ? (
      <LoaderCircle
        size={15}
        className="relative z-10 animate-spin text-[#ff6e00]"
      />
    ) : error ? (
      <X size={15} className="relative z-10 text-red-500" />
    ) : (
      <Check size={15} className="relative z-10 text-[#36AA55]" />
    )}
    {active && (
      <gsapMotion.div
        className="absolute inset-[-3px] rounded-[18px] border border-[#ff6e00]/55"
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
        <gsapMotion.a
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
            <SourceGlyph domain={source.domain} className="mt-0.5 h-5 w-5" />
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
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${dark ? "bg-blue-400/10 text-blue-200" : "bg-blue-50 text-blue-600"}`}
                >
                  citation checking
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
        </gsapMotion.a>
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
  const completed = !webSearch.active && !webSearch.error;
  const status =
    webSearch.error ||
    (completed
      ? webSearch.status ||
        `Reviewed ${webSearch.sources.length} source${webSearch.sources.length === 1 ? "" : "s"}`
      : webSearch.status || "Searching web...");
  return (
    <gsapMotion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 shadow-[0_12px_34px_rgba(0,0,0,0.05)]"
    >
      <div className="flex items-start gap-3">
        <SearchProgressIndicator
          active={webSearch.active}
          error={Boolean(webSearch.error)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff6e00]">
              Web Search
            </span>
            {webSearch.mode && (
              <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-500">
                {webSearch.mode}
              </span>
            )}
            {completed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                <Check size={11} /> Done
              </span>
            )}
          </div>
          {webSearch.query && (
            <div className="mt-1 text-[13px] font-semibold leading-snug text-zinc-800">
              "{webSearch.query}"
            </div>
          )}
          {webSearch.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {webSearch.sources.slice(0, 4).map((source) => (
                <gsapMotion.a
                  key={`chip-${source.id || source.url}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-950"
                >
                  <SourceGlyph domain={source.domain} className="h-4 w-4" />
                  <span className="truncate">{source.domain}</span>
                </gsapMotion.a>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[12px] text-zinc-500">
            {webSearch.active ? (
              <LoaderCircle size={12} className="animate-spin text-[#ff6e00]" />
            ) : completed ? (
              <Check size={12} className="text-[#36AA55]" />
            ) : null}
            <span>{status}</span>
          </div>
          {webSearch.sources.length > 0 && (
            <div className="mt-3">
              <SourceCards sources={webSearch.sources} tone="light" />
            </div>
          )}
        </div>
      </div>
    </gsapMotion.div>
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
        <gsapMotion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown size={14} className="text-zinc-400" />
        </gsapMotion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <gsapMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-black/5 p-3"
          >
            <SourceCards sources={sources} compact />
          </gsapMotion.div>
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
  const [expanded, setExpanded] = useState(false);

  if (phase === "idle" && steps.length === 0) return null;
  const { t } = useTranslation();
  const visibleSteps = isComplete
    ? steps.filter(
        (step) => !/synthesizing\s+(final\s+)?answer/i.test(step.content),
      )
    : steps;
  const latestStep = visibleSteps[visibleSteps.length - 1] || steps[0];
  const latestMeta = thoughtStepMeta(latestStep?.content || phase, phase);
  const LatestIcon = latestMeta.icon;
  const activeLabel = isComplete
    ? "Complete"
    : phase === "retrieving"
      ? "Searching"
      : phase === "web_search"
        ? "Reviewing"
        : phase === "tool_execution"
          ? "Running"
          : phase === "synthesizing"
            ? "Synthesizing"
            : t("thinking_process");
  const traceKey = `${visibleSteps.map((step) => step.id).join("-")}-${webSearch?.sources.length || 0}`;
  const previewText = isComplete
    ? webSearch?.status && webSearch.sources.length > 0
      ? webSearch.status
      : "Answer ready."
    : latestStep?.content ||
      webSearch?.status ||
      "Preparing the reasoning trace...";

  return (
    <div
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
            <gsapMotion.div
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
            </gsapMotion.div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-zinc-900">
                Reasoning trace
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                {activeLabel}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12px] leading-snug text-zinc-500">
              {previewText}
            </div>
          </div>
        </div>
        <gsapMotion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown size={16} className="text-zinc-400" />
        </gsapMotion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <gsapMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-zinc-100"
          >
            <gsapMotion.div
              key={`reasoning-trace-open-${traceKey}`}
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: {} }}
              className="space-y-1 px-3 py-3 text-[13px] text-zinc-500"
            >
              {visibleSteps.map((step, idx) => {
                const meta = thoughtStepMeta(step.content, phase);
                const active =
                  !isComplete &&
                  idx === visibleSteps.length - 1 &&
                  phase !== "complete";
                return (
                  <gsapMotion.div
                    key={step.id}
                    custom={idx}
                    variants={reasoningStepVariants}
                    className="group/step relative flex flex-col items-start gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                  >
                    {idx < visibleSteps.length - 1 && (
                      <gsapMotion.div
                        custom={idx}
                        variants={reasoningLineVariants}
                        className="absolute bottom-[-12px] left-[26px] top-10 w-px origin-top bg-black/10"
                      />
                    )}

                    <div className="flex items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-[12px] px-3 py-1.5 text-[11px] font-medium tracking-tight ${meta.bg} ${meta.text}`}
                      >
                        <gsapMotion.div
                          custom={idx}
                          variants={reasoningIconVariants}
                          className="-mx-1 flex origin-center items-center justify-center"
                        >
                          <meta.icon />
                        </gsapMotion.div>
                        {meta.label}
                      </div>
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 shadow-sm animate-pulse" />
                      )}
                    </div>

                    <gsapMotion.div
                      custom={idx}
                      variants={reasoningTextVariants}
                      style={reasoningShimmerTextStyle}
                      className="mt-1 pl-[32px] text-[12px] leading-relaxed tracking-tight transition-colors"
                    >
                      {step.content}
                    </gsapMotion.div>
                  </gsapMotion.div>
                );
              })}
              {webSearch && (
                <gsapMotion.div
                  custom={steps.length}
                  variants={reasoningStepVariants}
                >
                  <SearchActivityPanel webSearch={webSearch} />
                </gsapMotion.div>
              )}

              {!isComplete && (
                <gsapMotion.div
                  custom={steps.length}
                  variants={reasoningStepVariants}
                  className="group/step relative flex flex-col items-start gap-1.5 rounded-2xl px-2 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#E7F3FF] px-3 py-1.5 text-[11px] font-medium tracking-tight text-[#0A7DFF]">
                      <gsapMotion.div
                        custom={steps.length}
                        variants={reasoningIconVariants}
                        className="-mx-1 flex origin-center items-center justify-center"
                      >
                        <ProgressIcon />
                      </gsapMotion.div>
                      {activeLabel}
                    </div>
                  </div>

                  <gsapMotion.div
                    custom={steps.length}
                    variants={reasoningTextVariants}
                    style={reasoningShimmerTextStyle}
                    className="mt-1 pl-[32px] text-[12px] italic tracking-tight"
                  >
                    Loading...
                  </gsapMotion.div>
                </gsapMotion.div>
              )}
            </gsapMotion.div>
          </gsapMotion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const markdownComponents = {
  p: ({ children, ...props }: any) => (
    <div className="mb-2 last:mb-0" {...props}>
      {children}
    </div>
  ),
  li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  blockquote: ({ children, ...props }: any) => (
    <blockquote {...props}>{children}</blockquote>
  ),
  code: InteractiveCodeBlock,
};

function useSmoothStreamingText(
  rawContent: string,
  isStreaming: boolean,
): string {
  const [displayedContent, setDisplayedContent] = useState(
    isStreaming ? "" : rawContent,
  );
  const queueRef = useRef<string>(rawContent);
  const displayedRef = useRef<string>(isStreaming ? "" : rawContent);
  const rafRef = useRef<number | null>(null);

  const wasStreamingRef = useRef(isStreaming);
  if (isStreaming) {
    wasStreamingRef.current = true;
  }

  useEffect(() => {
    queueRef.current = rawContent;

    if (!wasStreamingRef.current) {
      displayedRef.current = rawContent;
      setDisplayedContent(rawContent);
      return;
    }

    if (!isStreaming) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      displayedRef.current = rawContent;
      setDisplayedContent(rawContent);
      return;
    }

    if (rafRef.current === null) {
      const tick = () => {
        const target = queueRef.current;
        const current = displayedRef.current;

        if (current !== target) {
          let nextContent = target;
          if (target.startsWith(current) && target.length > current.length) {
            const diff = target.length - current.length;
            // Base speed 3 chars/frame (~180 chars/sec).
            // If lagging, speed up but cap at 12 chars/frame (~720 chars/sec)
            // so it ALWAYS looks like smooth typing and never jumps in huge blocks.
            const speed = diff > 30 ? Math.min(12, Math.ceil(diff / 15)) : 3;
            const charsToAdd = Math.min(diff, speed);
            nextContent = target.slice(0, current.length + charsToAdd);
          } else {
            nextContent = target;
          }
          displayedRef.current = nextContent;
          setDisplayedContent(nextContent);
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [rawContent, isStreaming]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return displayedContent;
}

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
    const smoothContent =
      animationsEnabled && !isVoice
        ? useSmoothStreamingText(content, isStreaming)
        : content;

    const showCursor =
      animationsEnabled && !isVoice && isStreaming && smoothContent.length > 0;

    return (
      <div className={`streaming-text ${showCursor ? "typing-active" : ""}`}>
        <style>{`
        .streaming-text {
          overflow-wrap: anywhere;
          text-rendering: geometricPrecision;
          contain: content;
        }
        .streaming-text.typing-active .streaming-plain::after {
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
        {isStreaming ? (
          <div className="streaming-plain whitespace-pre-wrap leading-relaxed">
            {smoothContent}
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {smoothContent}
          </ReactMarkdown>
        )}
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
  const animatedTotal = useAnimatedNumber(total, 1100);

  return (
    <gsapMotion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="not-prose mt-2 flex justify-end text-[10px] font-medium tracking-tight text-zinc-400"
      aria-live="polite"
    >
      <span className="flex min-w-[10.25rem] items-center justify-end gap-1 rounded-full bg-zinc-50/95 px-2 py-1 tabular-nums">
        <AnimatedNumberText className="min-w-[4.5ch]">
          {formatCount(animatedTotal)}
        </AnimatedNumberText>{" "}
        tokens · {formatCurrency(usage.cost || 0)}
      </span>
    </gsapMotion.div>
  );
};

const READ_ALOUD_VOICE_LABELS: Record<string, string> = {
  "miso-tts-8b": "MisoTTS 8B",
  "gpt-4o-mini-tts": "OpenAI TTS",
  "aura-asteria-en": "Asteria",
  "aura-luna-en": "Luna",
  "aura-stella-en": "Stella",
  "aura-athena-en": "Athena",
};

const getReadAloudVoiceLabel = (voice?: string) => {
  return READ_ALOUD_VOICE_LABELS[voice || ""] || voice || "Asteria";
};

const getReadAloudVoiceTooltip = (voice?: string) => {
  const label = getReadAloudVoiceLabel(voice);
  if (voice === "miso-tts-8b") {
    return "Read Aloud voice: MisoTTS 8B via local HTTP TTS. Live Voice still uses Deepgram.";
  }
  return `Read Aloud voice: ${label}.`;
};

const MessageItem = React.memo(
  ({
    msg,
    sendState,
    isLast,
    animationsEnabled,
    isPlayingTTS,
    ttsVoice,
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
    ttsVoice: string;
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
    const readAloudVoiceLabel = getReadAloudVoiceLabel(ttsVoice);
    const readAloudVoiceTooltip = getReadAloudVoiceTooltip(ttsVoice);
    const isMisoReadAloudVoice = ttsVoice === "miso-tts-8b";

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
          const storedFlashcards = await Promise.all(
            validCards.map(async (card: any) => {
              const { flashcard } = await createFlashcardForStorage(card, {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                bookId: activeBookId || undefined,
                bookTitle: activeBookTitle || undefined,
              });
              await db.flashcards.add(flashcard);
              return flashcard;
            }),
          );
          void recordGeneratedFlashcardsArtifact({
            batchId: `${msg.id}:manual-flashcards`,
            cards: storedFlashcards,
            source: "manual_message_flashcard_generation",
            sourceMessageId: msg.id,
            messageId: msg.id,
            conversationId: activeBookId
              ? chatThreadIdForBook(activeBookId)
              : undefined,
            bookId: activeBookId || undefined,
            bookTitle: activeBookTitle || undefined,
            metadata: {
              generationPath: "message_action",
              sourceRole: msg.role,
            },
          });

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
      const session = msg.voiceSession as NonNullable<Message["voiceSession"]>;
      const turns = session.turns || [];
      const seconds = Math.max(0, Math.round(session.durationSeconds || 0));
      const elapsed = `${Math.floor(seconds / 60)}:${(seconds % 60)
        .toString()
        .padStart(2, "0")}`;
      return (
        <gsapMotion.div
          data-message-id={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, type: "spring", bounce: 0.15 }}
          className="flex w-full flex-col items-start"
        >
          <div className="w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={() => setIsVoiceSessionOpen((open) => !open)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus:outline-none"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-500">
                <Mic size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-zinc-800">
                  {session.title || "Voice conversation"}
                </span>
                <span className="block text-[11px] text-zinc-500">
                  Voice · {turns.length} message
                  {turns.length === 1 ? "" : "s"} · {elapsed}
                </span>
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-zinc-400 transition-transform duration-300 ${
                  isVoiceSessionOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isVoiceSessionOpen && (
                <gsapMotion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden border-t border-black/5"
                >
                  <div className="space-y-3 px-4 py-3.5">
                    {turns.length === 0 && (
                      <div className="text-[12px] text-zinc-400">
                        No transcript captured.
                      </div>
                    )}
                    {turns.map((turn) => (
                      <div
                        key={turn.id}
                        className={`flex flex-col ${
                          turn.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <span className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          {turn.role === "user" ? "You" : "Aria"}
                        </span>
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] font-medium leading-relaxed ${
                            turn.role === "user"
                              ? "rounded-br-sm bg-[#1C1C1E] text-white"
                              : "rounded-bl-sm bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {turn.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </gsapMotion.div>
              )}
            </AnimatePresence>
          </div>
        </gsapMotion.div>
      );
    }

    return (
      <gsapMotion.div
        data-message-id={msg.id}
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
              aria-label={
                isPlayingTTS === msg.id
                  ? `Stop reading with ${readAloudVoiceLabel}`
                  : `Read aloud with ${readAloudVoiceLabel}`
              }
              title={readAloudVoiceTooltip}
              className={`ml-auto flex max-w-full flex-wrap items-center justify-end gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                isPlayingTTS === msg.id
                  ? "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
                  : "text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border-black/10"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isPlayingTTS === msg.id ? (
                  <>
                    <Square size={12} className="fill-current" /> Stop Reading
                  </>
                ) : (
                  <>
                    <Volume2 size={12} /> Read Aloud
                  </>
                )}
              </span>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  isMisoReadAloudVoice
                    ? "border-orange-200 bg-orange-50 text-orange-600"
                    : "border-black/5 bg-zinc-50 text-zinc-400"
                }`}
              >
                {readAloudVoiceLabel}
              </span>
            </button>
          </div>
        )}
      </gsapMotion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.msg === nextProps.msg &&
      prevProps.sendState === nextProps.sendState &&
      prevProps.animationsEnabled === nextProps.animationsEnabled &&
      prevProps.isPlayingTTS === nextProps.isPlayingTTS &&
      prevProps.ttsVoice === nextProps.ttsVoice &&
      prevProps.apiKey === nextProps.apiKey &&
      prevProps.activeBookId === nextProps.activeBookId &&
      prevProps.activeBookTitle === nextProps.activeBookTitle
    );
  },
);

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const language = useStore((state) => state.language);
  const apiKey = useStore((state) => state.apiKey);
  const serperApiKey = useStore((state) => state.serperApiKey);
  const deepgramApiKey = useStore((state) => state.deepgramApiKey);
  const learnerName = useStore((state) => state.learnerName);
  const askTutorQuery = useStore((state) => state.askTutorQuery);
  const setAskTutorQuery = useStore((state) => state.setAskTutorQuery);
  const activeProject = useStore((state) => state.activeProject);
  const setActiveProject = useStore((state) => state.setActiveProject);
  const activeLearningBookId = useStore((state) => state.activeLearningBookId);
  const setActiveLearningBookId = useStore(
    (state) => state.setActiveLearningBookId,
  );
  const activeBetaProofAttemptId = useStore(
    (state) => state.activeBetaProofAttemptId,
  );
  const betaProofTrafficApproval = useStore(
    (state) => state.betaProofTrafficApproval,
  );
  const activeDocumentId = useStore((state) => state.activeDocumentId);
  const ttsVoice = useStore((state) => state.ttsVoice);
  const misoTtsApiUrl = useStore((state) => state.misoTtsApiUrl);
  const setActiveView = useStore((state) => state.setActiveView);
  const aiModel = useStore((state) => state.aiModel);
  const animationsEnabled = useStore((state) => state.animationsEnabled);
  const systemPrompt = useStore((state) => state.systemPrompt);
  const brainRuntimeSettings = useStore((state) => state.brainRuntimeSettings);
  const recordChatUsage = useStore((state) => state.recordChatUsage);
  const recordVoiceUsage = useStore((state) => state.recordVoiceUsage);
  const recordVoiceAgentEvent = useStore(
    (state) => state.recordVoiceAgentEvent,
  );
  const recordWebUsage = useStore((state) => state.recordWebUsage);
  const recordWebSearchEvent = useStore((state) => state.recordWebSearchEvent);
  const cacheWebSources = useStore((state) => state.cacheWebSources);
  const selectedTextContext = useStore((state) => state.selectedTextContext);
  const setSelectedTextContext = useStore(
    (state) => state.setSelectedTextContext,
  );
  const setPdfUrl = useStore((state) => state.setPdfUrl);
  const setPdfPage = useStore((state) => state.setPdfPage);
  const setPdfTotalPages = useStore((state) => state.setPdfTotalPages);
  const messages = useStore((state) => state.messages);
  const setMessages = useStore((state) => state.setMessages);
  const setIsVoiceActive = useStore((state) => state.setIsVoiceActive);
  const [streamingAssistant, setStreamingAssistant] =
    useState<StreamingAssistantDraft | null>(null);
  const streamingAssistantRef = useRef<StreamingAssistantDraft | null>(null);
  const streamingFrameRef = useRef<number | null>(null);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [interactionMode, setInteractionMode] =
    useState<TutorInteractionMode>("idle");
  const lastInputAtRef = useRef<number | null>(null);
  const lastSubmitAtRef = useRef<number | null>(null);
  const thinkingPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
  const [chatArchives, setChatArchives] = useState<ChatArchive[]>(() =>
    readChatArchives(),
  );
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollPaused = useRef(false);
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);
  const loadedThreadBookIdRef = useRef<string | null>(null);
  const latestMessagesRef = useRef<Message[]>(messages);
  const latestBookTitleRef = useRef(activeProject);

  const flushStreamingAssistant = useCallback(() => {
    streamingFrameRef.current = null;
    setStreamingAssistant(streamingAssistantRef.current);
  }, []);

  const scheduleStreamingAssistant = useCallback(
    (draft: StreamingAssistantDraft) => {
      streamingAssistantRef.current = draft;
      if (streamingFrameRef.current !== null) return;
      if (typeof requestAnimationFrame === "undefined") {
        flushStreamingAssistant();
        return;
      }
      streamingFrameRef.current = requestAnimationFrame(
        flushStreamingAssistant,
      );
    },
    [flushStreamingAssistant],
  );

  const clearStreamingAssistant = useCallback(() => {
    if (streamingFrameRef.current !== null) {
      cancelAnimationFrame(streamingFrameRef.current);
      streamingFrameRef.current = null;
    }
    streamingAssistantRef.current = null;
    setStreamingAssistant(null);
  }, []);

  useEffect(() => clearStreamingAssistant, [clearStreamingAssistant]);

  const displayMessages = React.useMemo(() => {
    if (!streamingAssistant) return messages;
    return messages.map((message) =>
      message.id === streamingAssistant.id
        ? {
            ...message,
            content: streamingAssistant.content,
            usage: streamingAssistant.usage || message.usage,
          }
        : message,
    );
  }, [messages, streamingAssistant]);

  const [voiceState, setVoiceState] = useState<
    "idle" | "listening" | "speaking"
  >("idle");
  const [voiceCaption, setVoiceCaption] = useState<VoiceCaption>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputRafRef = useRef<number | null>(null);
  const bargeInFramesRef = useRef(0);
  const noiseFloorRef = useRef(0.06);
  const endingRef = useRef(false);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const voiceStartedAtRef = useRef<number | null>(null);
  const voiceSessionCountedRef = useRef(false);
  const voiceSessionErrorRef = useRef<string | null>(null);
  const voiceTurnsRef = useRef<VoiceSessionTurn[]>([]);
  const voiceStudyContextRef = useRef<VoiceStudyContextPayload | null>(null);
  const voiceProofAttemptIdRef = useRef<string | null>(null);
  const pendingVoiceProofScriptRef = useRef<string | null>(null);
  const getVoiceProofAttemptId = useCallback(() => {
    return (
      voiceStudyContextRef.current?.proofAttemptId ||
      voiceProofAttemptIdRef.current ||
      activeBetaProofAttemptId ||
      undefined
    );
  }, [activeBetaProofAttemptId]);

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
  const dedupedLearningBooks = React.useMemo(() => {
    const general =
      learningBooks.find((book) => book.id === GENERAL_STUDY_BOOK_ID) ||
      learningBooks.find((book) => /^general study$/i.test(book.title.trim()));
    const seen = new Set<string>();
    const result = [];
    if (general) {
      result.push(general);
      seen.add(general.id);
    }
    learningBooks.forEach((book) => {
      if (seen.has(book.id)) return;
      if (/^general study$/i.test(book.title.trim())) return;
      result.push(book);
      seen.add(book.id);
    });
    return result;
  }, [learningBooks]);
  const libraryContextBooks = React.useMemo(
    () =>
      dedupedLearningBooks.filter(
        (book) => !isReservedLibraryContext(book.title),
      ),
    [dedupedLearningBooks],
  );
  const generalStudyBook =
    libraryContextBooks.find((book) => book.id === GENERAL_STUDY_BOOK_ID) ||
    libraryContextBooks.find(
      (book) => book.title.toLowerCase() === "general study",
    );
  const activeLearningBook = activeLearningBookId
    ? libraryContextBooks.find((book) => book.id === activeLearningBookId)
    : generalStudyBook;
  const activeLearningBookTitle = activeLearningBook?.title || activeProject;
  const canonicalActiveBookId = activeLearningBook?.id || activeLearningBookId;
  const activeBookDocuments = useLiveQuery(
    () =>
      canonicalActiveBookId
        ? db.learningDocuments
            .where("bookId")
            .equals(canonicalActiveBookId)
            .toArray()
        : Promise.resolve([]),
    [canonicalActiveBookId],
  );
  const orderedBookDocuments = React.useMemo(() => {
    const documents = [...(activeBookDocuments || [])].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    if (!activeDocumentId) return documents;
    return documents.sort((a, b) =>
      a.id === activeDocumentId ? -1 : b.id === activeDocumentId ? 1 : 0,
    );
  }, [activeBookDocuments, activeDocumentId]);
  const readyProofDocuments = React.useMemo(
    () =>
      orderedBookDocuments.filter(
        (document) =>
          document.processingStatus === "ready" &&
          Boolean(document.extractedText?.trim()),
      ),
    [orderedBookDocuments],
  );
  const activeProofTrafficApprovalEvents =
    useLiveQuery(
      () =>
        activeBetaProofAttemptId
          ? db.memoryEvents
              .where("eventType")
              .equals("beta_provider_traffic_approved")
              .toArray()
          : Promise.resolve([]),
      [activeBetaProofAttemptId],
    ) || [];
  const hasDurableActiveProofTrafficApproval = React.useMemo(
    () =>
      Boolean(
        activeBetaProofAttemptId &&
          activeProofTrafficApprovalEvents.some((event: MemoryEvent) => {
            const metadata = event.metadata || {};
            return (
              event.status === "completed" &&
              metadata.proofAttemptId === activeBetaProofAttemptId
            );
          }),
      ),
    [activeBetaProofAttemptId, activeProofTrafficApprovalEvents],
  );
  const hasLoadedProofPrompt = Boolean(
    activeBetaProofAttemptId && /Provider-key proof turn/i.test(input),
  );
  const hasLoadedVoiceProofScript = Boolean(
    activeBetaProofAttemptId && /Provider-key voice proof turn/i.test(input),
  );
  const isActiveProofTrafficApproved = Boolean(
    activeBetaProofAttemptId &&
      betaProofTrafficApproval?.attemptId === activeBetaProofAttemptId &&
      hasDurableActiveProofTrafficApproval,
  );
  const hasPendingProofTrafficApproval = Boolean(
    activeBetaProofAttemptId &&
      betaProofTrafficApproval?.attemptId === activeBetaProofAttemptId &&
      !hasDurableActiveProofTrafficApproval,
  );
  const activeBetaProofTrafficLocked = Boolean(
    activeBetaProofAttemptId && !isActiveProofTrafficApproved,
  );
  const alertProofTrafficApprovalNeeded = useCallback(() => {
    alert(
      "Approve provider traffic for this proof attempt in Admin and wait for the local approval event before running provider-key chat or live voice proof.",
    );
  }, []);
  const buildVoiceStudyContext = useCallback(async () => {
    const contextQuery = [
      `Voice tutoring session for ${activeLearningBookTitle || activeProject}.`,
      activeDocumentId ? `Active document id: ${activeDocumentId}.` : "",
      selectedTextContext ? `Selected text: ${selectedTextContext}` : "",
      orderedBookDocuments[0]?.title
        ? `Current document: ${orderedBookDocuments[0].title}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    const voiceRequestId = voiceSessionIdRef.current || undefined;
    const packet = await buildBrainContextPacket({
      requestId: voiceRequestId,
      proofAttemptId:
        voiceProofAttemptIdRef.current || activeBetaProofAttemptId || undefined,
      mode: "voice",
      agentLayer: "voice_realtime",
      query: contextQuery,
      getRelevantContext:
        brainOrchestrator.getRelevantContext.bind(brainOrchestrator),
      activeBookId: canonicalActiveBookId,
      activeBookTitle: activeLearningBookTitle || activeProject,
      activeProject,
      activeDocumentId,
      documents: orderedBookDocuments,
      runtimeSettings: brainRuntimeSettings,
      maxContextChars: VOICE_AGENT_CONTEXT_CHAR_LIMIT,
      interaction: {
        mode: "listening",
        text: contextQuery,
        selectedTextAttached: Boolean(selectedTextContext),
        webSearchSelected: false,
        voiceState: "listening",
        sendState: "idle",
        lastInputAt: lastInputAtRef.current,
        lastSubmitAt: lastSubmitAtRef.current,
      },
    });
    return {
      requestId: packet.requestId,
      proofAttemptId: packet.proofAttemptId,
      studyContext: packet.context,
      studyContextChars: packet.contextChars,
      rawContextChars: packet.rawContextChars,
      memoryContextChars: packet.memoryContextChars,
      activeBookContextChars: packet.activeBookContextChars,
      documentContextChars: packet.documentContextChars,
      documentCount: packet.documentCount,
      documentIds: packet.documentIds,
      readyDocumentCount: packet.readyDocumentCount,
      readyDocumentIds: packet.readyDocumentIds,
      contextDocumentIds: packet.contextDocumentIds,
      unreadyDocumentCount: packet.unreadyDocumentCount,
      omittedReadyDocumentCount: packet.omittedReadyDocumentCount,
      contextCompacted: packet.compacted,
    };
  }, [
    activeDocumentId,
    activeBetaProofAttemptId,
    activeLearningBookTitle,
    activeProject,
    brainRuntimeSettings,
    canonicalActiveBookId,
    orderedBookDocuments,
    selectedTextContext,
  ]);
  const visibleChatArchives = chatArchives.filter(
    (archive) =>
      archive.bookId === canonicalActiveBookId &&
      !isReservedLibraryContext(archive.bookTitle) &&
      !isReservedLibraryContext(archive.title),
  );

  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    latestBookTitleRef.current = activeLearningBookTitle;
  }, [activeLearningBookTitle]);

  const clearStudyDocumentContext = useCallback(() => {
    const currentPdfUrl = useStore.getState().pdfUrl;
    if (currentPdfUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(currentPdfUrl);
    }
    setPdfUrl(null);
    setPdfPage(1);
    setPdfTotalPages(0);
    setSelectedTextContext("");
  }, [setPdfPage, setPdfTotalPages, setPdfUrl, setSelectedTextContext]);

  const saveCurrentChatArchive = useCallback(() => {
    const currentMessages = useStore.getState().messages;
    void persistBookChatThread(
      useStore.getState().activeLearningBookId || canonicalActiveBookId,
      activeLearningBookTitle,
      currentMessages,
      activeBetaProofAttemptId || undefined,
    ).catch((error) =>
      console.warn("[ChatPanel] Book chat archive failed:", error),
    );
    const next = archiveChatSnapshot(
      currentMessages,
      useStore.getState().activeLearningBookId || canonicalActiveBookId || null,
      activeLearningBookTitle,
    );
    if (next.length) setChatArchives(next);
  }, [
    activeBetaProofAttemptId,
    activeLearningBookTitle,
    canonicalActiveBookId,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      archiveChatSnapshot(
        useStore.getState().messages,
        useStore.getState().activeLearningBookId ||
          canonicalActiveBookId ||
          null,
        activeLearningBookTitle,
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeLearningBookTitle, canonicalActiveBookId]);

  useEffect(() => {
    if (libraryContextBooks.length === 0) return;
    const selectedBook = activeLearningBookId
      ? libraryContextBooks.find((book) => book.id === activeLearningBookId)
      : undefined;
    if (selectedBook) return;

    const matchingBook = libraryContextBooks.find(
      (book) => book.title.toLowerCase() === activeProject.toLowerCase(),
    );
    const nextBook = matchingBook || generalStudyBook || libraryContextBooks[0];
    setActiveLearningBookId(nextBook.id);
    setActiveProject(nextBook.title);
  }, [
    activeLearningBookId,
    activeProject,
    generalStudyBook,
    libraryContextBooks,
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
    if (!canonicalActiveBookId) return;
    let cancelled = false;
    const previousBookId = loadedThreadBookIdRef.current;
    if (previousBookId && previousBookId !== canonicalActiveBookId) {
      void persistBookChatThread(
        previousBookId,
        latestBookTitleRef.current,
        latestMessagesRef.current,
        activeBetaProofAttemptId || undefined,
      ).catch((error) =>
        console.warn("[ChatPanel] Previous book chat save failed:", error),
      );
    }

    setIsThreadLoading(true);
    clearStreamingAssistant();
    void db.bookChatThreads
      .get(chatThreadIdForBook(canonicalActiveBookId))
      .then((thread) => {
        if (cancelled) return;
        loadedThreadBookIdRef.current = canonicalActiveBookId;
        setMessages(normalizeChatMessages(thread?.messages));
        requestAnimationFrame(() => forceScrollToBottom("auto"));
      })
      .catch((error) => {
        console.warn("[ChatPanel] Book chat load failed:", error);
        if (!cancelled) {
          loadedThreadBookIdRef.current = canonicalActiveBookId;
          setMessages(defaultChatMessages());
        }
      })
      .finally(() => {
        if (!cancelled) setIsThreadLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeBetaProofAttemptId,
    canonicalActiveBookId,
    clearStreamingAssistant,
    forceScrollToBottom,
    setMessages,
  ]);

  useEffect(() => {
    if (!canonicalActiveBookId || isThreadLoading) return;
    const timeout = window.setTimeout(() => {
      void persistBookChatThread(
        canonicalActiveBookId,
        activeLearningBookTitle,
        messages,
        activeBetaProofAttemptId || undefined,
      ).catch((error) =>
        console.warn("[ChatPanel] Book chat save failed:", error),
      );
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [
    activeLearningBookTitle,
    activeBetaProofAttemptId,
    canonicalActiveBookId,
    isThreadLoading,
    messages,
  ]);

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

  const clearThinkingPauseTimer = useCallback(() => {
    if (thinkingPauseTimerRef.current) {
      clearTimeout(thinkingPauseTimerRef.current);
      thinkingPauseTimerRef.current = null;
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      lastInputAtRef.current = Date.now();
      clearThinkingPauseTimer();

      if (!value.trim()) {
        setInteractionMode("idle");
        return;
      }

      setInteractionMode("composing");
      thinkingPauseTimerRef.current = setTimeout(() => {
        setInteractionMode((current) =>
          current === "composing" ? "thinking_pause" : current,
        );
      }, INTERACTION_THINKING_PAUSE_MS);
    },
    [clearThinkingPauseTimer],
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const maxHeight = 150;
    textarea.style.height = "0px";
    const nextHeight = Math.min(maxHeight, Math.max(52, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input, isSearchSkillActive]);

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

  useEffect(() => () => clearThinkingPauseTimer(), [clearThinkingPauseTimer]);

  useEffect(() => {
    if (voiceState === "listening") {
      setInteractionMode("listening");
    } else if (voiceState === "speaking") {
      setInteractionMode("speaking");
    } else if (sendState === "sending") {
      setInteractionMode("awaiting_response");
    } else if (!input.trim()) {
      setInteractionMode("idle");
    }
  }, [input, sendState, voiceState]);

  const generateVoiceTitle = async (sessionId: string, transcript: string) => {
    try {
      const response = await fetch("/api/title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ text: transcript }),
      });
      if (!response.ok) return;
      const data = await response.json();
      const title = (data?.title || "").trim();
      if (!title) return;
      setMessages((prev) => {
        const index = prev.findIndex((message) => message.id === sessionId);
        if (index === -1 || !prev[index].voiceSession) return prev;
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          voiceSession: { ...copy[index].voiceSession, title },
        };
        return copy;
      });
    } catch (error) {
      console.warn("[ChatPanel] Voice title generation failed:", error);
    }
  };

  const appendVoiceTurn = (role: "user" | "assistant", content: string) => {
    const cleanContent = content.trim();
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId || !cleanContent) return;
    const last = voiceTurnsRef.current[voiceTurnsRef.current.length - 1];
    if (last && last.role === role && last.content === cleanContent) return;
    voiceTurnsRef.current = [
      ...voiceTurnsRef.current,
      { role, content: cleanContent },
    ];
    setMessages((prev) => {
      const index = prev.findIndex((message) => message.id === sessionId);
      if (index === -1) return prev;
      const session = prev[index].voiceSession || {
        turns: [],
        startedAt: Date.now(),
        durationSeconds: 0,
      };
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        voiceSession: {
          ...session,
          turns: [
            ...session.turns,
            {
              id: Date.now().toString() + Math.random(),
              role,
              content: cleanContent,
            },
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

  const recordVoiceModelRun = (
    status: "started" | "completed" | "failed",
    sessionId: string,
    metadata: Record<string, unknown> = {},
  ) => {
    const context = voiceStudyContextRef.current;
    const startedAt = voiceStartedAtRef.current;
    void recordModelRunEvent({
      status,
      provider: "deepgram",
      source: "voice_agent",
      requestId: sessionId,
      requestedModel: "Deepgram Voice Agent",
      usedModel: "Deepgram Voice Agent",
      estimated: true,
      durationMs:
        status === "started" || !startedAt ? undefined : Date.now() - startedAt,
      memoryContextChars: context?.studyContextChars,
      iterations: voiceTurnsRef.current.length,
      error:
        status === "failed"
          ? voiceSessionErrorRef.current || undefined
          : undefined,
      runtimeSettings: { ...brainRuntimeSettings },
      metadata: {
        activeBookId: canonicalActiveBookId || undefined,
        activeBookTitle: activeLearningBookTitle || activeProject,
        activeDocumentId: activeDocumentId || undefined,
        proofAttemptId: getVoiceProofAttemptId(),
        channel: "websocket",
        documentCount: context?.documentCount,
        memoryContextChars: context?.memoryContextChars,
        activeBookContextChars: context?.activeBookContextChars,
        documentContextChars: context?.documentContextChars,
        ...metadata,
      },
    }).catch((error) => {
      console.warn("[ChatPanel] Voice model run write failed:", error);
    });
  };

  const stopVoice = () => {
    if (endTimerRef.current) {
      clearTimeout(endTimerRef.current);
      endTimerRef.current = null;
    }
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
    window.dispatchEvent(new CustomEvent("mic-volume", { detail: 0 }));
    window.dispatchEvent(new CustomEvent("tts-volume", { detail: 0 }));
    setVoiceCaption(null);

    const sessionId = voiceSessionIdRef.current;
    if (sessionId) {
      const turns = voiceTurnsRef.current;
      const durationSeconds = Math.max(
        0,
        Math.round(
          (Date.now() - (voiceStartedAtRef.current || Date.now())) / 1000,
        ),
      );
      recordVoiceAgentEvent({
        type: "session_ended",
        status: voiceSessionErrorRef.current ? "failed" : "completed",
        sessionId,
        summary: voiceSessionErrorRef.current
          ? `Voice session ended after an error: ${compactVoiceEventText(voiceSessionErrorRef.current)}`
          : turns.length > 0
            ? `Voice session ended with ${turns.length} transcript turn${turns.length === 1 ? "" : "s"}.`
            : "Voice session ended before transcript turns were captured.",
        metadata: {
          durationSeconds,
          turnCount: turns.length,
          proofAttemptId: getVoiceProofAttemptId(),
          error: voiceSessionErrorRef.current || undefined,
        },
      });
      recordVoiceModelRun(
        voiceSessionErrorRef.current ? "failed" : "completed",
        sessionId,
        {
          phase: "session_ended",
          durationSeconds,
          turnCount: turns.length,
        },
      );
      if (!voiceSessionCountedRef.current) {
        recordVoiceUsage({ sessions: 1 });
        voiceSessionCountedRef.current = true;
      }
      setMessages((prev) => {
        const index = prev.findIndex((message) => message.id === sessionId);
        if (index === -1) return prev;
        const session = prev[index].voiceSession;
        if (!session || session.turns.length === 0) {
          return prev.filter((message) => message.id !== sessionId);
        }
        const persistedDurationSeconds = Math.max(
          session.durationSeconds,
          durationSeconds,
        );
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          voiceSession: {
            ...session,
            durationSeconds: persistedDurationSeconds,
            title: session.title || deriveFallbackTitle(turns),
          },
        };
        return copy;
      });

      if (turns.length > 0) {
        const transcript = turns
          .map(
            (turn) =>
              `${turn.role === "user" ? "Student" : "Tutor"}: ${turn.content}`,
          )
          .join("\n");
        void generateVoiceTitle(sessionId, transcript);
      }
      voiceSessionIdRef.current = null;
    }
    voiceStartedAtRef.current = null;
    voiceStudyContextRef.current = null;
    voiceProofAttemptIdRef.current = null;
    pendingVoiceProofScriptRef.current = null;
    voiceSessionCountedRef.current = false;
    voiceSessionErrorRef.current = null;
    voiceTurnsRef.current = [];
    setVoiceState("idle");
  };

  const sendVoiceText = (text: string) => {
    const trimmed = text.trim();
    const ws = wsRef.current;
    if (!trimmed || !ws || ws.readyState !== WebSocket.OPEN) return;
    appendVoiceTurn("user", trimmed);
    lastVoiceUserMessageRef.current = trimmed;
    setVoiceCaption({ role: "user", text: trimmed });
    recordVoiceAgentEvent({
      type: "user_turn",
      status: "running",
      sessionId: voiceSessionIdRef.current || undefined,
      summary: `Typed voice turn injected: ${compactVoiceEventText(trimmed)}`,
      metadata: {
        source: "typed",
        characterCount: trimmed.length,
        proofAttemptId: getVoiceProofAttemptId(),
      },
    });
    if (!endingRef.current && detectEndIntent(trimmed)) {
      endingRef.current = true;
      activeAudioNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch {}
      });
      activeAudioNodesRef.current = [];
      setVoiceCaption(null);
      endTimerRef.current = setTimeout(() => stopVoice(), 250);
      return;
    }
    ws.send(JSON.stringify({ type: "InjectUserMessage", content: trimmed }));
  };

  const handleVoiceFunctionCallRequest = useCallback(
    async (msg: { functions?: VoiceAgentFunctionCall[] }, ws: WebSocket) => {
      const functionCalls = Array.isArray(msg.functions) ? msg.functions : [];
      const sessionId = voiceSessionIdRef.current || `voice-${Date.now()}`;
      const proofAttemptId = getVoiceProofAttemptId();

      for (const call of functionCalls) {
        const toolName = call.name || "unknown_tool";
        const toolCallId = call.id || `${toolName}-${Date.now()}`;
        const startedAt = Date.now();
        const rawArgs = call.arguments ?? call.input ?? "{}";
        const inputSummary = compactVoiceEventText(
          `${toolName}: ${rawArgs}`,
          180,
        );

        if (call.client_side === false) {
          recordVoiceAgentEvent({
            type: "tool_call",
            status: "completed",
            sessionId,
            summary: `Voice tool handled by provider: ${toolName}`,
            metadata: {
              toolCallId,
              clientSide: false,
              proofAttemptId,
            },
          });
          continue;
        }

        recordVoiceAgentEvent({
          type: "tool_call",
          status: "running",
          sessionId,
          summary: `Voice tool requested: ${toolName}`,
          metadata: {
            toolCallId,
            inputSummary,
            proofAttemptId,
          },
        });
        await recordToolJobEvent({
          toolName,
          status: "running",
          requestId: sessionId,
          source: "voice_agent",
          inputSummary,
          metadata: {
            toolCallId,
            voiceSessionId: sessionId,
            proofAttemptId,
          },
        });

        try {
          const args = parseVoiceFunctionArguments(call);
          let result: Record<string, unknown>;
          let toolCompletionStatus: "completed" | "blocked" = "completed";

          if (toolName === "look_at_study_context") {
            const contextPayload =
              voiceStudyContextRef.current || (await buildVoiceStudyContext());
            voiceStudyContextRef.current = contextPayload;
            result = {
              status: "ready",
              question: String(args.question || "").slice(0, 500),
              activeBookId: canonicalActiveBookId || "",
              activeBookTitle: activeLearningBookTitle || activeProject,
              activeDocumentId: activeDocumentId || "",
              documentCount: contextPayload.documentCount,
              contextChars: contextPayload.studyContextChars,
              context: contextPayload.studyContext,
            };
          } else if (toolName === "update_graph") {
            const name = String(args.name || "").trim();
            const description = String(args.description || "").trim();
            if (!name || !description) {
              throw new Error("update_graph requires name and description.");
            }
            const understandingDelta = Math.max(
              -0.2,
              Math.min(0.2, Number(args.understandingDelta || 0)),
            );
            await brainOrchestrator.addOrUpdateConcept(
              name,
              description,
              understandingDelta,
              undefined,
              {
                requestId: sessionId,
                proofAttemptId,
                mode: "voice",
                agentLayer: "voice_realtime",
                bookId: canonicalActiveBookId,
                conversationId: canonicalActiveBookId
                  ? chatThreadIdForBook(canonicalActiveBookId)
                  : undefined,
                documentId: activeDocumentId,
                toolCallId,
                source: "voice_graph_update",
              },
            );
            result = {
              status: "stored",
              concept: name,
              understandingDelta,
              activeBookId: canonicalActiveBookId || "",
            };
          } else if (toolName === "generate_flashcards") {
            const cards = Array.isArray(args.cards)
              ? args.cards
                  .filter((card: any) => card?.front && card?.back)
                  .slice(0, 8)
              : [];
            if (!cards.length) {
              throw new Error(
                "generate_flashcards requires at least one card.",
              );
            }
            const storedFlashcards = await Promise.all(
              cards.map(async (card: any) => {
                const { flashcard } = await createFlashcardForStorage(card, {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                  bookId: canonicalActiveBookId || undefined,
                  bookTitle:
                    activeLearningBookTitle || activeProject || undefined,
                });
                await db.flashcards.add(flashcard);
                return flashcard;
              }),
            );
            await recordGeneratedFlashcardsArtifact({
              batchId: `${sessionId}:${toolCallId}:voice-flashcards`,
              cards: storedFlashcards,
              source: "voice_tool_flashcard_generation",
              sourceMessageId: sessionId,
              messageId: sessionId,
              conversationId: canonicalActiveBookId
                ? chatThreadIdForBook(canonicalActiveBookId)
                : undefined,
              bookId: canonicalActiveBookId || undefined,
              bookTitle: activeLearningBookTitle || activeProject || undefined,
              metadata: {
                generationPath: "voice_agent_function_call",
                toolCallId,
                voiceSessionId: sessionId,
                proofAttemptId,
              },
            });
            setMessages((prev) =>
              prev.map((message) =>
                message.id === sessionId
                  ? { ...message, hasFlashcards: true }
                  : message,
              ),
            );
            result = {
              status: "stored",
              cardCount: storedFlashcards.length,
              activeBookId: canonicalActiveBookId || "",
            };
          } else if (toolName === "evaluate_answer") {
            const results = await recordEvaluatedAnswerEvidenceBatch([args], {
              bookId: canonicalActiveBookId || undefined,
              bookTitle: activeLearningBookTitle || activeProject || undefined,
              conversationId: canonicalActiveBookId
                ? chatThreadIdForBook(canonicalActiveBookId)
                : undefined,
              requestId: sessionId,
              sourceId: toolCallId,
              source: "voice_tool_evaluate_answer",
              evaluator: "model_rubric",
              metadata: {
                toolCallId,
                voiceSessionId: sessionId,
                agentLayer: "voice_realtime",
                mode: "voice",
                proofAttemptId,
              },
            });
            const recordedCount = results.filter(
              (item) => item.status === "recorded",
            ).length;
            if (recordedCount === 0) {
              toolCompletionStatus = "blocked";
            }
            result = {
              status: recordedCount > 0 ? "stored" : "skipped",
              recordedCount,
              evaluations: results,
              activeBookId: canonicalActiveBookId || "",
            };
          } else if (toolName === "look_at_current_page") {
            const query = String(
              args.query ||
                lastVoiceUserMessageRef.current ||
                "Describe this page.",
            )
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 500);
            let image: string | null = null;
            try {
              image = captureCurrentPdfPageImage();
            } catch (visionErr) {
              console.warn("Could not extract voice vision image:", visionErr);
            }
            if (!image) {
              toolCompletionStatus = "blocked";
              result = {
                status: "blocked",
                query,
                reason:
                  "No rendered PDF page image was available for voice current-page inspection.",
                activeDocumentId: activeDocumentId || "",
              };
            } else {
              const response = await fetch("/api/voice-current-page", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
                body: JSON.stringify({
                  requestId: sessionId,
                  query,
                  image,
                }),
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(
                  payload.error || "Voice current-page vision unavailable.",
                );
              }
              result = {
                status: "ready",
                query,
                model: payload.model || "openai/gpt-4o-mini",
                result: payload.result || "",
                activeDocumentId: activeDocumentId || "",
              };
            }
          } else if (toolName === "web_search") {
            const query = String(args.query || "")
              .replace(/\s+/g, " ")
              .trim();
            if (!query) {
              throw new Error("web_search requires a query.");
            }
            const mode = args.mode === "news" ? "news" : "search";
            const maxResults = Math.min(
              Math.max(Number(args.maxResults || 6) || 6, 1),
              10,
            );
            const intentText = `${lastVoiceUserMessageRef.current} ${query}`;
            const explicitWebIntent =
              /\b(web|internet|online|search|google|look up|browse)\b/i.test(
                intentText,
              );
            const freshnessIntent =
              /\b(latest|current|recent|today|yesterday|news|price|pricing|release|ranking|rankings|weather|score|schedule|trend|trending)\b/i.test(
                intentText,
              );
            const sourceLocalIntent =
              /\b(current page|this page|screen|document|pdf|selected text|uploaded|active book|study context|chapter)\b/i.test(
                intentText,
              );
            const allowed =
              explicitWebIntent ||
              (freshnessIntent && !sourceLocalIntent) ||
              (brainRuntimeSettings.webSearchPolicy !== "manual_only" &&
                freshnessIntent);

            if (!allowed) {
              toolCompletionStatus = "blocked";
              result = {
                status: "blocked",
                query,
                reason:
                  "Voice web search stayed local because the turn looked like a source-material or memory-context question.",
                policy: brainRuntimeSettings.webSearchPolicy,
              };
            } else {
              const searchStartedAt = Date.now();
              const response = await fetch("/api/voice-web-search", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(serperApiKey ? { "X-Serper-API-Key": serperApiKey } : {}),
                },
                body: JSON.stringify({
                  requestId: sessionId,
                  query,
                  mode,
                  maxResults,
                  serperApiKey: serperApiKey || undefined,
                }),
              });
              const payload = await response.json().catch(() => ({}));
              const searchId =
                typeof payload.searchId === "string"
                  ? payload.searchId
                  : `voice_web_${Date.now()}`;
              const sources = Array.isArray(payload.sources)
                ? (payload.sources as NormalizedWebSource[])
                : [];

              recordWebSearchEvent({
                type: "started",
                searchId,
                query,
                mode,
              });
              recordWebUsage({
                provider: "serper",
                requests: 1,
                searchRequests: mode === "news" ? 0 : 1,
                newsRequests: mode === "news" ? 1 : 0,
                estimated: true,
              });

              if (!response.ok) {
                recordWebSearchEvent({
                  type: "error",
                  searchId,
                  status: payload.error || "Voice web search unavailable.",
                });
                recordWebUsage({
                  provider: "serper",
                  failures: 1,
                  estimated: true,
                });
                await recordUnavailableCitationState({
                  searchId,
                  query,
                  reason: payload.error || "Voice web search unavailable.",
                  source: "voice_web_search",
                  metadata: {
                    toolCallId,
                    voiceSessionId: sessionId,
                    proofAttemptId,
                  },
                });
                throw new Error(
                  payload.error || "Voice web search unavailable.",
                );
              }

              if (sources.length) {
                cacheWebSources(sources);
              }
              recordWebSearchEvent({
                type: "complete",
                searchId,
                sources,
                status: `Reviewed ${sources.length} source${sources.length === 1 ? "" : "s"}`,
              });
              recordWebUsage({
                provider: "serper",
                sourcesReviewed: sources.length,
                estimated: true,
              });
              sources.forEach(
                (source) =>
                  void recordWebSourceArtifact({
                    webSource: source,
                    searchId,
                    query,
                    eventSource: "voice_web_search",
                    messageId: sessionId,
                    conversationId: canonicalActiveBookId
                      ? chatThreadIdForBook(canonicalActiveBookId)
                      : undefined,
                    bookId: canonicalActiveBookId || undefined,
                    metadata: {
                      toolCallId,
                      voiceSessionId: sessionId,
                      durationMs: Date.now() - searchStartedAt,
                      proofAttemptId,
                    },
                  }),
              );
              if (!sources.length) {
                await recordUnavailableCitationState({
                  searchId,
                  query,
                  reason: "No web sources returned.",
                  source: "voice_web_search",
                  metadata: {
                    toolCallId,
                    voiceSessionId: sessionId,
                    proofAttemptId,
                  },
                });
              }
              result = {
                status: sources.length ? "ready" : "empty",
                query,
                mode,
                sourceCount: sources.length,
                sources: sources.slice(0, 6).map((source) => ({
                  title: source.title,
                  url: source.url,
                  domain: source.domain,
                  snippet: source.snippet,
                  date: source.date,
                })),
              };
            }
          } else {
            throw new Error(`Unsupported voice tool: ${toolName}`);
          }

          ws.send(JSON.stringify(buildVoiceFunctionCallResponse(call, result)));
          recordVoiceAgentEvent({
            type: "tool_call",
            status: "completed",
            sessionId,
            summary: `Voice tool ${toolCompletionStatus}: ${toolName}`,
            metadata: {
              toolCallId,
              result,
              proofAttemptId,
            },
          });
          await recordToolJobEvent({
            toolName,
            status: toolCompletionStatus,
            requestId: sessionId,
            source: "voice_agent",
            inputSummary,
            outputSummary:
              typeof result.status === "string"
                ? String(result.status)
                : "Voice tool completed.",
            durationMs: Date.now() - startedAt,
            metadata: {
              toolCallId,
              voiceSessionId: sessionId,
              proofAttemptId,
              result,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          ws.send(
            JSON.stringify(
              buildVoiceFunctionCallResponse(call, {
                status: "failed",
                error: message,
              }),
            ),
          );
          recordVoiceAgentEvent({
            type: "tool_call",
            status: "failed",
            sessionId,
            summary: `Voice tool failed: ${toolName}`,
            metadata: {
              toolCallId,
              error: message,
              proofAttemptId,
            },
          });
          await recordToolJobEvent({
            toolName,
            status: "failed",
            requestId: sessionId,
            source: "voice_agent",
            inputSummary,
            error: message,
            durationMs: Date.now() - startedAt,
            metadata: {
              toolCallId,
              voiceSessionId: sessionId,
              proofAttemptId,
            },
          });
        }
      }
    },
    [
      activeDocumentId,
      activeLearningBookTitle,
      activeProject,
      apiKey,
      brainRuntimeSettings.webSearchPolicy,
      buildVoiceStudyContext,
      cacheWebSources,
      canonicalActiveBookId,
      getVoiceProofAttemptId,
      recordVoiceAgentEvent,
      recordWebSearchEvent,
      recordWebUsage,
      serperApiKey,
      setMessages,
    ],
  );

  const startVoice = async () => {
    if (!apiKey) {
      alert(
        "Please configure your OpenRouter API Key in the settings (top right) before using Voice features.",
      );
      return;
    }
    if (activeBetaProofTrafficLocked) {
      alertProofTrafficApprovalNeeded();
      return;
    }
    if (window.location.hostname.endsWith(".vercel.app")) {
      alert(
        "Live Voice uses a WebSocket backend, which cannot run inside this Vercel deployment. Read Aloud still works through the HTTP TTS route; deploy the Node server separately for live voice.",
      );
      return;
    }

    try {
      endingRef.current = false;
      voiceTurnsRef.current = [];
      const sessionId = `voice-${Date.now()}`;
      voiceSessionIdRef.current = sessionId;
      voiceProofAttemptIdRef.current = activeBetaProofAttemptId || null;
      voiceStartedAtRef.current = Date.now();
      voiceSessionCountedRef.current = false;
      voiceSessionErrorRef.current = null;
      recordVoiceAgentEvent({
        type: "session_started",
        status: "started",
        sessionId,
        summary: `Voice session starting for ${activeLearningBookTitle}.`,
        metadata: {
          language,
          bookId: canonicalActiveBookId,
          documentId: activeDocumentId,
          proofAttemptId: getVoiceProofAttemptId(),
        },
      });
      recordVoiceModelRun("started", sessionId, {
        phase: "session_started",
        language,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: sessionId,
          requestId: sessionId,
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
      const voiceContextPayload = await buildVoiceStudyContext().catch(
        (error) => {
          console.warn("[ChatPanel] Voice study context failed:", error);
          recordVoiceAgentEvent({
            type: "context_attached",
            status: "failed",
            sessionId,
            summary:
              "Voice context injection failed; continuing with base voice prompt.",
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              bookId: canonicalActiveBookId,
              documentId: activeDocumentId,
              proofAttemptId: getVoiceProofAttemptId(),
            },
          });
          return null;
        },
      );
      voiceStudyContextRef.current = voiceContextPayload;
      if (voiceContextPayload?.studyContext) {
        recordVoiceAgentEvent({
          type: "context_attached",
          status: "completed",
          sessionId,
          summary: `Attached ${voiceContextPayload.studyContextChars.toLocaleString()} chars of local book, memory, and document context to voice mode.`,
          metadata: {
            bookId: canonicalActiveBookId,
            activeBookTitle: activeLearningBookTitle,
            documentId: activeDocumentId,
            documentCount: voiceContextPayload.documentCount,
            documentIds: voiceContextPayload.documentIds,
            readyDocumentCount: voiceContextPayload.readyDocumentCount,
            readyDocumentIds: voiceContextPayload.readyDocumentIds,
            contextDocumentIds: voiceContextPayload.contextDocumentIds,
            unreadyDocumentCount: voiceContextPayload.unreadyDocumentCount,
            omittedReadyDocumentCount:
              voiceContextPayload.omittedReadyDocumentCount,
            memoryContextChars: voiceContextPayload.memoryContextChars,
            activeBookContextChars: voiceContextPayload.activeBookContextChars,
            documentContextChars: voiceContextPayload.documentContextChars,
            rawContextChars: voiceContextPayload.rawContextChars,
            contextCompacted: voiceContextPayload.contextCompacted,
            proofAttemptId:
              voiceContextPayload.proofAttemptId || getVoiceProofAttemptId(),
          },
        });
        recordVoiceModelRun("started", sessionId, {
          phase: "context_attached",
          language,
          contextAttached: true,
          rawContextChars: voiceContextPayload.rawContextChars,
        });
      }
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
            const value = (outputBuffer[i] - 128) / 128;
            sum += value * value;
          }
          const rms = Math.sqrt(sum / outputBuffer.length);
          window.dispatchEvent(
            new CustomEvent("tts-volume", { detail: Math.min(1, rms * 3.5) }),
          );
        }
        outputRafRef.current = requestAnimationFrame(sampleOutput);
      };
      outputRafRef.current = requestAnimationFrame(sampleOutput);

      const wsUrl = `${voiceServerWsUrl()}/api/voice-agent?language=${encodeURIComponent(language)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let hasSentVoiceAuth = false;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volume = Math.min(1, rms * 8); // Scale
        window.dispatchEvent(new CustomEvent("mic-volume", { detail: volume }));

        if (volume < 0.28) {
          noiseFloorRef.current = noiseFloorRef.current * 0.95 + volume * 0.05;
        }

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
                } catch {}
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

        if (ws.readyState === WebSocket.OPEN && hasSentVoiceAuth) {
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
        const proofAttemptId = getVoiceProofAttemptId();
        ws.send(
          JSON.stringify({
            type: "voice_auth",
            voiceSessionId: sessionId,
            requestId: sessionId,
            proofAttemptId,
            openRouterKey: apiKey,
            deepgramKey: deepgramApiKey,
            language,
            studyContext: voiceContextPayload?.studyContext || "",
            activeBookId: canonicalActiveBookId || "",
            activeBookTitle: activeLearningBookTitle || activeProject,
            activeDocumentId: activeDocumentId || "",
            documentIds: voiceContextPayload?.documentIds || [],
            documentCount: voiceContextPayload?.documentCount || 0,
            readyDocumentIds: voiceContextPayload?.readyDocumentIds || [],
            readyDocumentCount: voiceContextPayload?.readyDocumentCount || 0,
            contextDocumentIds: voiceContextPayload?.contextDocumentIds || [],
            unreadyDocumentCount:
              voiceContextPayload?.unreadyDocumentCount || 0,
            omittedReadyDocumentCount:
              voiceContextPayload?.omittedReadyDocumentCount || 0,
            studyContextChars: voiceContextPayload?.studyContextChars || 0,
            studyContextMetadata: {
              mode: "voice",
              agentLayer: "voice_realtime",
              proofAttemptId,
              documentIds: voiceContextPayload?.documentIds || [],
              readyDocumentIds: voiceContextPayload?.readyDocumentIds || [],
              contextDocumentIds: voiceContextPayload?.contextDocumentIds || [],
              readyDocumentCount: voiceContextPayload?.readyDocumentCount || 0,
              unreadyDocumentCount:
                voiceContextPayload?.unreadyDocumentCount || 0,
              omittedReadyDocumentCount:
                voiceContextPayload?.omittedReadyDocumentCount || 0,
              contextCompacted: voiceContextPayload?.contextCompacted || false,
              rawContextChars: voiceContextPayload?.rawContextChars || 0,
              memoryContextChars: voiceContextPayload?.memoryContextChars || 0,
              activeBookContextChars:
                voiceContextPayload?.activeBookContextChars || 0,
              documentContextChars:
                voiceContextPayload?.documentContextChars || 0,
            },
          }),
        );
        hasSentVoiceAuth = true;
        const pendingVoiceProofScript = pendingVoiceProofScriptRef.current;
        if (pendingVoiceProofScript) {
          pendingVoiceProofScriptRef.current = null;
          sendVoiceText(pendingVoiceProofScript);
          handleInputChange("");
        }
        // Settings config is sent by the proxy after auth. We just stream audio now.
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            const proofAttemptId = getVoiceProofAttemptId();

            if (msg.type === "usage" && msg.usage) {
              if (Number(msg.usage.sessions || 0) > 0) {
                voiceSessionCountedRef.current = true;
              }
              recordVoiceUsage(msg.usage);
            } else if (msg.type === "SettingsApplied") {
              console.log("Deepgram SettingsApplied");
              recordVoiceAgentEvent({
                type: "settings_applied",
                status: "completed",
                sessionId: voiceSessionIdRef.current || undefined,
                summary: "Deepgram voice-agent settings applied.",
                metadata: {
                  language,
                  proofAttemptId,
                },
              });
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
                recordVoiceAgentEvent({
                  type: "user_turn",
                  status: "running",
                  sessionId: voiceSessionIdRef.current || undefined,
                  summary: `Student said: ${compactVoiceEventText(msg.content || "")}`,
                  metadata: {
                    source: "microphone",
                    characterCount: String(msg.content || "").length,
                    proofAttemptId,
                  },
                });
                if (!endingRef.current && detectEndIntent(msg.content || "")) {
                  endingRef.current = true;
                  activeAudioNodesRef.current.forEach((node) => {
                    try {
                      node.stop();
                    } catch {}
                  });
                  activeAudioNodesRef.current = [];
                  setVoiceCaption(null);
                  endTimerRef.current = setTimeout(() => stopVoice(), 250);
                  return;
                }
              } else if (msg.role === "assistant") {
                appendVoiceTurn("assistant", msg.content || "");
                recordVoiceAgentEvent({
                  type: "assistant_turn",
                  status: "completed",
                  sessionId: voiceSessionIdRef.current || undefined,
                  summary: `Aria replied: ${compactVoiceEventText(msg.content || "")}`,
                  metadata: {
                    characterCount: String(msg.content || "").length,
                    proofAttemptId,
                  },
                });
                if (lastVoiceUserMessageRef.current && msg.content) {
                  const userMessage = lastVoiceUserMessageRef.current;
                  lastVoiceUserMessageRef.current = "";
                  brainOrchestrator.trackInteraction(
                    userMessage,
                    msg.content,
                    undefined,
                    {
                      bookId: canonicalActiveBookId,
                      conversationId: canonicalActiveBookId
                        ? chatThreadIdForBook(canonicalActiveBookId)
                        : undefined,
                      documentId: activeDocumentId,
                      requestId: voiceSessionIdRef.current || undefined,
                      proofAttemptId,
                      mode: "voice",
                      agentLayer: "voice_realtime",
                    },
                  );
                  void brainOrchestrator
                    .updateLearningBookFromConversation({
                      userName: learnerName,
                      activeProject,
                      activeBookId: canonicalActiveBookId,
                      activeDocumentId,
                      requestId: voiceSessionIdRef.current || undefined,
                      proofAttemptId,
                      mode: "voice",
                      agentLayer: "voice_realtime",
                      conversationId: canonicalActiveBookId
                        ? chatThreadIdForBook(canonicalActiveBookId)
                        : undefined,
                      documentContexts: orderedBookDocuments,
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
            } else if (msg.type === "FunctionCallRequest") {
              await handleVoiceFunctionCallRequest(msg, ws);
            } else if (msg.type === "UserStartedSpeaking") {
              // Interrupt playing
              recordVoiceAgentEvent({
                type: "barge_in",
                status: "running",
                sessionId: voiceSessionIdRef.current || undefined,
                summary:
                  "Student started speaking; current playback was interrupted.",
                metadata: {
                  activeAudioNodes: activeAudioNodesRef.current.length,
                  proofAttemptId,
                },
              });
              activeAudioNodesRef.current.forEach((node) => {
                try {
                  node.stop();
                } catch (e) {}
              });
              activeAudioNodesRef.current = [];
              if (audioContextRef.current) {
                nextPlayTimeRef.current = audioContextRef.current.currentTime;
              }
              setVoiceCaption(null);
              setVoiceState("listening");
            } else if (msg.type === "AgentStartedSpeaking") {
              recordVoiceAgentEvent({
                type: "agent_started_speaking",
                status: "running",
                sessionId: voiceSessionIdRef.current || undefined,
                summary: "Aria started speaking.",
                metadata: {
                  proofAttemptId,
                },
              });
              setVoiceState("speaking");
            } else if (msg.type === "AgentFinishedSpeaking") {
              recordVoiceAgentEvent({
                type: "agent_finished_speaking",
                status: "completed",
                sessionId: voiceSessionIdRef.current || undefined,
                summary: "Aria finished speaking; listening resumed.",
                metadata: {
                  proofAttemptId,
                },
              });
              setVoiceState("listening");
            } else if (msg.type === "Error") {
              console.error("Deepgram Error", msg);
              voiceSessionErrorRef.current = compactVoiceEventText(
                String(msg.message || msg.error || "unknown error"),
              );
              recordVoiceAgentEvent({
                type: "error",
                status: "failed",
                sessionId: voiceSessionIdRef.current || undefined,
                summary: `Deepgram voice-agent error: ${voiceSessionErrorRef.current}`,
                metadata: {
                  rawType: msg.type,
                  proofAttemptId,
                },
              });
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

      ws.onclose = (event) => {
        if (event.code !== 1000 && event.reason) {
          console.warn("Voice connection closed:", event.reason);
          voiceSessionErrorRef.current = compactVoiceEventText(event.reason);
          recordVoiceAgentEvent({
            type: "error",
            status: "failed",
            sessionId: voiceSessionIdRef.current || undefined,
            summary: `Voice websocket closed: ${voiceSessionErrorRef.current}`,
            metadata: {
              code: event.code,
              proofAttemptId: getVoiceProofAttemptId(),
            },
          });
          window.alert(event.reason);
        }
        stopVoice();
      };

      ws.onerror = (e) => {
        console.error("WS error: ", e);
        voiceSessionErrorRef.current = "Voice websocket could not connect.";
        recordVoiceAgentEvent({
          type: "error",
          status: "failed",
          sessionId: voiceSessionIdRef.current || undefined,
          summary: "Voice websocket could not connect.",
          metadata: {
            proofAttemptId: getVoiceProofAttemptId(),
          },
        });
        window.alert(
          "Voice mode could not connect. Check the voice service keys and try again.",
        );
        stopVoice();
      };
    } catch (err) {
      console.error("Voice start error", err);
      voiceSessionErrorRef.current = compactVoiceEventText(
        err instanceof Error ? err.message : String(err),
      );
      recordVoiceAgentEvent({
        type: "error",
        status: "failed",
        sessionId: voiceSessionIdRef.current || undefined,
        summary: `Voice start failed: ${voiceSessionErrorRef.current}`,
        metadata: {
          proofAttemptId: getVoiceProofAttemptId(),
        },
      });
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
      const ttsHeaders: Record<string, string> = {};
      if (deepgramApiKey) {
        ttsHeaders["x-deepgram-key"] = deepgramApiKey;
      }
      if (ttsVoice === "miso-tts-8b" && misoTtsApiUrl.trim()) {
        ttsHeaders["x-miso-tts-api-url"] = misoTtsApiUrl.trim();
      }
      const res = await fetch(
        `/api/tts?text=${encodeURIComponent(safeText)}&voice=${encodeURIComponent(ttsVoice || "aura-asteria-en")}`,
        Object.keys(ttsHeaders).length
          ? {
              headers: ttsHeaders,
            }
          : undefined,
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
    if (activeBetaProofTrafficLocked) {
      alertProofTrafficApprovalNeeded();
      return;
    }

    audio.playClick();
    clearThinkingPauseTimer();
    lastSubmitAtRef.current = Date.now();
    setInteractionMode("submitted");
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

    const chatRequestId = createTutorRequestId("chat");
    const newMessages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        requestId: chatRequestId,
        role: "user" as const,
        content: userMsgContent,
      },
    ];
    const assistantMsgId = crypto.randomUUID();
    setMessages([
      ...newMessages,
      {
        id: assistantMsgId,
        requestId: chatRequestId,
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
    clearStreamingAssistant();
    isAutoScrollPaused.current = false;
    forceScrollToBottom("smooth");
    setIsTyping(true);

    try {
      let currentPageImage = null;
      const needsVision =
        /page|this|image|look|what|read|pdf|diagram|chart|graph|screen|visible|shown|display|see|seeing/i.test(
          userMsgContent,
        );
      if (needsVision) {
        try {
          currentPageImage = captureCurrentPdfPageImage();
        } catch (visionErr) {
          console.warn("Could not extract vision image:", visionErr);
        }
      }

      const brainContextPacket = await buildBrainContextPacket({
        requestId: chatRequestId,
        proofAttemptId: activeBetaProofAttemptId || undefined,
        mode: "chat",
        agentLayer: "chat_stream",
        query: userMsgContent,
        getRelevantContext:
          brainOrchestrator.getRelevantContext.bind(brainOrchestrator),
        activeBookId: canonicalActiveBookId,
        activeBookTitle: activeLearningBook?.title || activeProject,
        activeProject,
        activeDocumentId,
        documents: orderedBookDocuments,
        runtimeSettings: brainRuntimeSettings,
        interaction: {
          mode: interactionMode === "idle" ? "submitted" : interactionMode,
          text,
          selectedTextAttached: Boolean(selectedTextContext),
          webSearchSelected: isSearchSkillActive,
          voiceState,
          sendState: "sending",
          lastInputAt: lastInputAtRef.current,
          lastSubmitAt: lastSubmitAtRef.current,
        },
      });
      const requestMemoryContext = brainContextPacket.context;

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
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(serperApiKey ? { "X-Serper-API-Key": serperApiKey } : {}),
        },
        body: JSON.stringify({
          messages: flattenChatMessagesForPrompt(newMessages),
          requestId: chatRequestId,
          currentPageImage,
          memoryContext: requestMemoryContext,
          brainContextMetadata: {
            proofAttemptId: brainContextPacket.proofAttemptId,
            documentIds: brainContextPacket.documentIds,
            readyDocumentIds: brainContextPacket.readyDocumentIds,
            contextDocumentIds: brainContextPacket.contextDocumentIds,
            documentCount: brainContextPacket.documentCount,
            readyDocumentCount: brainContextPacket.readyDocumentCount,
            unreadyDocumentCount: brainContextPacket.unreadyDocumentCount,
            omittedReadyDocumentCount:
              brainContextPacket.omittedReadyDocumentCount,
            rawContextChars: brainContextPacket.rawContextChars,
            memoryContextChars: brainContextPacket.memoryContextChars,
            activeBookContextChars: brainContextPacket.activeBookContextChars,
            documentContextChars: brainContextPacket.documentContextChars,
            contextCompacted: brainContextPacket.compacted,
          },
          aiModel,
          customPrompt: systemPrompt,
          runtimeSettings: brainRuntimeSettings,
          webSearchExplicit: isSearchSkillActive,
          activeProject: activeLearningBook?.title || activeProject,
          activeBookId: canonicalActiveBookId,
          activeDocumentId,
          documentContexts: orderedBookDocuments.map((document) => ({
            id: document.id,
            title: document.title,
            classification: document.classification,
            extractionMode: document.extractionMode,
          })),
          serperApiKey: serperApiKey || undefined,
          language: language || "en",
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
        _name: string,
        _metadata: Record<string, unknown>,
      ) => {};
      const webSearchQueriesById = new Map<string, string>();
      const sourceLedgerContext = {
        messageId: assistantMsgId,
        conversationId: canonicalActiveBookId
          ? chatThreadIdForBook(canonicalActiveBookId)
          : undefined,
        bookId: canonicalActiveBookId || undefined,
      };
      const recordSourceArtifact = (
        source: NormalizedWebSource,
        options: {
          event: string;
          searchId?: string;
          sourceCount?: number;
          error?: unknown;
        },
      ) => {
        const searchId =
          typeof options.searchId === "string" ? options.searchId : undefined;
        void recordWebSourceArtifact({
          webSource: source,
          searchId,
          query: searchId ? webSearchQueriesById.get(searchId) : undefined,
          eventSource: options.event,
          ...sourceLedgerContext,
          metadata: {
            event: options.event,
            sourceCount: options.sourceCount,
            error: options.error,
          },
        });
      };
      const recordUnavailableCitation = (options: {
        event: string;
        searchId?: string;
        sourceCount?: number;
        reason?: unknown;
      }) => {
        const searchId =
          typeof options.searchId === "string" ? options.searchId : undefined;
        void recordUnavailableCitationState({
          searchId,
          query: searchId ? webSearchQueriesById.get(searchId) : undefined,
          reason: options.reason || "No web sources returned.",
          source: options.event,
          metadata: {
            event: options.event,
            sourceCount: options.sourceCount,
          },
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
              scheduleStreamingAssistant({
                id: assistantMsgId,
                content: currentContent,
                usage: messageUsage,
              });
            } else if (data.type === "web_search_started") {
              if (data.searchId && data.query) {
                webSearchQueriesById.set(
                  String(data.searchId),
                  String(data.query),
                );
              }
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
              recordSourceArtifact(source, {
                event: "chat_web_result",
                searchId: data.searchId,
              });
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
              sources.forEach((source) =>
                recordSourceArtifact(source, {
                  event: "chat_web_sources_complete",
                  searchId: data.searchId,
                  sourceCount: sources.length,
                  error: data.error,
                }),
              );
              if (!sources.length || data.error) {
                recordUnavailableCitation({
                  event: "chat_web_sources_complete",
                  searchId: data.searchId,
                  sourceCount: sources.length,
                  reason: data.error || "No web sources returned.",
                });
              }
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
            } else if (data.type === "tool_job") {
              void recordToolJobEvent({
                id: data.id,
                timestamp: data.timestamp,
                toolName: data.toolName,
                status: data.status,
                requestId: data.requestId,
                model: data.model,
                source: data.source || "chat_stream",
                inputSummary: data.inputSummary,
                outputSummary: data.outputSummary,
                error: data.error,
                durationMs: data.durationMs,
                metadata: {
                  ...(data.metadata || {}),
                  proofAttemptId: activeBetaProofAttemptId || undefined,
                },
              });
            } else if (data.type === "model_run") {
              void recordModelRunEvent({
                id: data.id,
                timestamp: data.timestamp,
                status: data.status,
                provider: data.provider,
                source: data.source || "chat_stream",
                requestId: data.requestId,
                requestedModel: data.requestedModel,
                usedModel: data.usedModel,
                inputTokens: data.inputTokens,
                outputTokens: data.outputTokens,
                cost: data.cost,
                estimated: data.estimated,
                durationMs: data.durationMs,
                memoryContextChars: data.memoryContextChars,
                sourceMaterialRequest: data.sourceMaterialRequest,
                requestedWebSearch: data.requestedWebSearch,
                webSources: data.webSources,
                graphUpdates: data.graphUpdates,
                flashcards: data.flashcards,
                iterations: data.iterations,
                error: data.error,
                runtimeSettings: data.runtimeSettings,
                metadata: {
                  ...(data.metadata || {}),
                  proofAttemptId: activeBetaProofAttemptId || undefined,
                },
              });
            } else if (data.type === "done") {
              setSendState("success");
              clearStreamingAssistant();
              const hasFlashcards =
                data.flashcardsUpdates && data.flashcardsUpdates.length > 0;
              const evaluatedAnswerPayloads = Array.isArray(
                data.evaluatedAnswers,
              )
                ? data.evaluatedAnswers
                : [];
              const finalSources = (data.sources ||
                []) as NormalizedWebSource[];
              if (finalSources.length) cacheWebSources(finalSources);
              finalSources.forEach((source) =>
                recordSourceArtifact(source, {
                  event: "chat_done_sources",
                  searchId: data.searchId,
                  sourceCount: finalSources.length,
                }),
              );
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
                    reasoningSteps: (newM[msgIndex].reasoningSteps || [])
                      .filter(
                        (step) =>
                          !/synthesizing\s+(final\s+)?answer/i.test(
                            step.content,
                          ),
                      )
                      .concat({
                        id: crypto.randomUUID(),
                        content: "Ready with the final answer.",
                      }),
                    usage: messageUsage,
                    webSearch: newM[msgIndex].webSearch
                      ? {
                          ...newM[msgIndex].webSearch,
                          active: false,
                          status:
                            finalSources.length ||
                            newM[msgIndex].webSearch.sources.length
                              ? `Reviewed ${
                                  mergeSources(
                                    newM[msgIndex].webSearch.sources,
                                    finalSources,
                                  ).length
                                } sources`
                              : newM[msgIndex].webSearch.status,
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

              brainOrchestrator.trackInteraction(
                userMsgContent,
                data.content,
                undefined,
                {
                  bookId: canonicalActiveBookId,
                  conversationId: canonicalActiveBookId
                    ? chatThreadIdForBook(canonicalActiveBookId)
                    : undefined,
                  documentId: activeDocumentId,
                  requestId: chatRequestId,
                  proofAttemptId: activeBetaProofAttemptId || undefined,
                  mode: "chat",
                  agentLayer: "chat_stream",
                },
              );
              void brainOrchestrator
                .updateLearningBookFromConversation({
                  userName: learnerName,
                  activeProject,
                  activeBookId: canonicalActiveBookId,
                  activeDocumentId,
                  requestId: chatRequestId,
                  proofAttemptId: activeBetaProofAttemptId || undefined,
                  mode: "chat",
                  agentLayer: "chat_stream",
                  conversationId: canonicalActiveBookId
                    ? chatThreadIdForBook(canonicalActiveBookId)
                    : undefined,
                  documentContexts: orderedBookDocuments,
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
              setChatArchives(
                archiveChatSnapshot(
                  useStore.getState().messages,
                  canonicalActiveBookId || null,
                  activeLearningBook?.title || activeProject,
                ),
              );

              if (data.graphUpdates && data.graphUpdates.length > 0) {
                data.graphUpdates.forEach((update: any) => {
                  brainOrchestrator.addOrUpdateConcept(
                    update.name,
                    update.description,
                    update.understandingDelta,
                    undefined,
                    {
                      requestId: chatRequestId,
                      proofAttemptId: activeBetaProofAttemptId || undefined,
                      mode: "chat",
                      agentLayer: "chat_stream",
                      bookId: canonicalActiveBookId,
                      conversationId: canonicalActiveBookId
                        ? chatThreadIdForBook(canonicalActiveBookId)
                        : undefined,
                      documentId: activeDocumentId,
                      source: "chat_graph_update",
                    },
                  );
                });
              }

              if (evaluatedAnswerPayloads.length > 0) {
                void recordEvaluatedAnswerEvidenceBatch(
                  evaluatedAnswerPayloads,
                  {
                    bookId: canonicalActiveBookId || undefined,
                    bookTitle:
                      activeLearningBook?.title || activeProject || undefined,
                    conversationId: canonicalActiveBookId
                      ? chatThreadIdForBook(canonicalActiveBookId)
                      : undefined,
                    requestId: chatRequestId,
                    source: "chat_tool_evaluate_answer",
                    evaluator: "model_rubric",
                    metadata: {
                      agentLayer: "chat_stream",
                      mode: "chat",
                      proofAttemptId: activeBetaProofAttemptId || undefined,
                      activeDocumentId: activeDocumentId || undefined,
                      sourceUserMessage: userMsgContent.slice(0, 240),
                    },
                  },
                ).catch((error) => {
                  console.warn(
                    "[ChatPanel] Evaluated answer evidence failed:",
                    error,
                  );
                });
              }

              if (data.flashcardsUpdates && data.flashcardsUpdates.length > 0) {
                const flashcardBatchId = `${assistantMsgId}:stream-flashcards`;
                void Promise.all(
                  data.flashcardsUpdates.map(async (card: any) => {
                    const { flashcard } = await createFlashcardForStorage(
                      card,
                      {
                        id: Math.random().toString(36).substring(2, 15),
                        bookId: canonicalActiveBookId || undefined,
                        bookTitle:
                          activeLearningBook?.title ||
                          activeProject ||
                          undefined,
                      },
                    );
                    await db.flashcards.add(flashcard);
                    return flashcard;
                  }),
                )
                  .then((storedFlashcards) =>
                    recordGeneratedFlashcardsArtifact({
                      batchId: flashcardBatchId,
                      cards: storedFlashcards,
                      source: "chat_tool_flashcard_generation",
                      sourceMessageId: assistantMsgId,
                      messageId: assistantMsgId,
                      conversationId: canonicalActiveBookId
                        ? chatThreadIdForBook(canonicalActiveBookId)
                        : undefined,
                      bookId: canonicalActiveBookId || undefined,
                      bookTitle:
                        activeLearningBook?.title || activeProject || undefined,
                      metadata: {
                        generationPath: "chat_stream_done",
                        sourceUserMessage: userMsgContent.slice(0, 240),
                      },
                    }),
                  )
                  .catch(console.error);
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
              currentContent += `> Note: ${data.message}\n\n`;
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
      setInteractionMode("idle");
    } catch (err: any) {
      console.error(err);
      clearStreamingAssistant();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `**Error:** ${err.message}`, phase: "complete" }
            : m,
        ),
      );
      setSendState("idle");
      setInteractionMode(input.trim() ? "composing" : "idle");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (hasLoadedVoiceProofScript && voiceState === "idle") {
      if (activeBetaProofTrafficLocked) {
        alertProofTrafficApprovalNeeded();
        textareaRef.current?.focus();
        return;
      }
      pendingVoiceProofScriptRef.current = input.trim();
      startVoice();
      textareaRef.current?.focus();
      return;
    }
    const currentInput = input;
    handleInputChange("");
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
      const focusTextarea = () => textareaRef.current?.focus();
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(focusTextarea);
      } else {
        setTimeout(focusTextarea, 0);
      }
      lastInputAtRef.current = Date.now();
      setInteractionMode("composing");
      setAskTutorQuery("");
    }
  }, [askTutorQuery, setAskTutorQuery]);

  // When selectedTextContext changes (from PDF "Ask Tutor" button), auto-focus input
  useEffect(() => {
    if (selectedTextContext) {
      handleInputChange("");
    }
  }, [handleInputChange, selectedTextContext]);

  const lastMessage = displayMessages[displayMessages.length - 1];
  const lastAutoScrolledMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastMessage) return;
    const isNewMessage =
      lastMessage.id !== lastAutoScrolledMessageIdRef.current;
    if (isNewMessage) {
      lastAutoScrolledMessageIdRef.current = lastMessage.id;
      isAutoScrollPaused.current = false;
      forceScrollToBottom("smooth");
      return;
    }
    if (sendState !== "idle" && !isAutoScrollPaused.current) {
      forceScrollToBottom("auto");
    }
  }, [
    forceScrollToBottom,
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

    let scrollFrame: number | null = null;
    // Use ResizeObserver to detect content height changes (like streaming text)
    const resizeObserver = new ResizeObserver(() => {
      if ((isAutoScrollPaused.current && sendState === "idle") || scrollFrame) {
        return;
      }
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = null;
        scrollEl.scrollTo({
          top: scrollEl.scrollHeight,
          behavior: "auto",
        });
      });
    });

    const activeBubble = lastMessage
      ? scrollEl.querySelector(`[data-message-id="${lastMessage.id}"]`)
      : null;
    resizeObserver.observe((activeBubble as Element | null) || scrollEl);

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
    };
  }, [lastMessage?.id, sendState]);

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
      <div
        data-tutor-chat-header
        className="absolute top-0 w-full px-6 py-4 pt-6 shrink-0 z-40 border-b border-zinc-200/70 bg-[rgba(253,253,253,0.98)] shadow-[0_12px_36px_rgba(255,255,255,0.92)] backdrop-blur-xl flex items-center justify-between pointer-events-none"
      >
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.08)] bg-white border border-black/5 flex items-center justify-center">
              <Sparkles size={14} className="text-zinc-600" />
            </div>
            <span className="text-[15px] font-semibold text-zinc-800">
              Tutor
            </span>
          </div>

          <div className="h-4 w-px bg-black/10" />

          {/* Context/Project Pill */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-zinc-50 border border-black/10 text-zinc-800 transition-colors group focus:outline-none shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-medium"
            >
              <Folder
                size={12}
                className="text-zinc-600 group-hover:text-zinc-800 transition-colors"
              />
              <AnimatePresence mode="popLayout">
                <gsapMotion.span
                  key={activeLearningBook?.id || activeProject}
                  initial={animationsEnabled ? { opacity: 0, y: 5 } : undefined}
                  animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
                  exit={animationsEnabled ? { opacity: 0, y: -5 } : undefined}
                  className="text-xs font-medium whitespace-nowrap inline-block"
                >
                  {activeLearningBook?.title || activeProject}
                </gsapMotion.span>
              </AnimatePresence>
              <ChevronDown size={12} className="text-zinc-500" />
            </button>

            <AnimatePresence>
              {isProjectDropdownOpen && (
                <gsapMotion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-[280px] sm:w-[320px] p-2 bg-white border border-black/10 rounded-2xl shadow-[0_16px_50px_-10px_rgba(0,0,0,0.3)] overflow-hidden z-50 origin-top-left"
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
                            .updateLearningBookTitle(
                              canonicalActiveBookId || GENERAL_STUDY_BOOK_ID,
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
                    {libraryContextBooks.length === 0 && (
                      <div className="px-3 py-3 text-[12px] leading-relaxed text-zinc-500">
                        Library book will appear when this session initializes.
                      </div>
                    )}
                    {libraryContextBooks.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          saveCurrentChatArchive();
                          setActiveLearningBookId(book.id);
                          setActiveProject(book.title);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left focus:outline-none ${
                          canonicalActiveBookId === book.id
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
                        {canonicalActiveBookId === book.id && (
                          <Check size={14} className="ml-auto text-zinc-800" />
                        )}
                      </button>
                    ))}
                  </div>
                  {visibleChatArchives.length > 0 && (
                    <>
                      <div className="mt-2 px-3 py-2 border-t border-black/5">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Previous Chats
                        </span>
                      </div>
                      <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto pr-1 custom-scroll">
                        {visibleChatArchives.map((archive) => (
                          <button
                            key={archive.id}
                            type="button"
                            onClick={() => {
                              saveCurrentChatArchive();
                              setMessages(archive.messages);
                              if (archive.bookId) {
                                if (
                                  isGenericLibraryTitle(archive.bookTitle) &&
                                  archive.title.trim()
                                ) {
                                  void db.learningBooks
                                    .update(archive.bookId, {
                                      title: archive.title,
                                      updatedAt: Date.now(),
                                    })
                                    .catch((error) =>
                                      console.warn(
                                        "[ChatPanel] Archived book title sync failed:",
                                        error,
                                      ),
                                    );
                                }
                                setActiveLearningBookId(archive.bookId);
                              } else {
                                setActiveLearningBookId(null);
                              }
                              setActiveProject(
                                archive.bookTitle &&
                                  archive.bookTitle !== "General Study"
                                  ? archive.bookTitle
                                  : archive.title,
                              );
                              setIsProjectDropdownOpen(false);
                              requestAnimationFrame(() =>
                                forceScrollToBottom("auto"),
                              );
                            }}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-800 focus:outline-none"
                          >
                            <Clock size={14} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">
                                {archive.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                                {archive.bookTitle}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </gsapMotion.div>
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
                saveCurrentChatArchive();
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
            className="p-1.5 rounded-full hover:bg-black/5 text-[#9a9a9f] hover:text-zinc-800 transition-colors focus:outline-none"
          >
            <RotateCcw size={15} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tutor chat"
              title="Close tutor chat"
              className="p-1.5 rounded-full hover:bg-black/5 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
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
          {displayMessages.map((msg, index) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              sendState={sendState}
              isLast={index === displayMessages.length - 1}
              animationsEnabled={animationsEnabled}
              isPlayingTTS={isPlayingTTS}
              ttsVoice={ttsVoice}
              onSendMessage={sendMessage}
              onHandleTTS={handleTTS}
              onSetActiveView={setActiveView}
              setMessages={setMessages}
              apiKey={apiKey}
              activeBookId={canonicalActiveBookId || null}
              activeBookTitle={activeLearningBook?.title || activeProject}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full p-4 shrink-0 bg-gradient-to-t from-[#fdfdfd] via-[#fdfdfd]/90 to-transparent z-40">
        <AnimatePresence>
          {activeBetaProofAttemptId && (
            <gsapMotion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="w-full max-w-3xl mx-auto mb-2"
            >
              <div className="rounded-2xl border border-cyan-300/25 bg-[#101014]/95 px-3 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">
                      <Brain size={12} />
                      Live proof capture
                    </div>
                    <p className="mt-1 truncate text-[11px] leading-relaxed text-zinc-300">
                      Chat and voice rows will save under attempt{" "}
                      <span className="font-mono text-zinc-100">
                        {activeBetaProofAttemptId}
                      </span>{" "}
                      for {activeLearningBookTitle || activeProject}.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        readyProofDocuments.length >= 2
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-300/30 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      Ready PDFs {readyProofDocuments.length}
                    </span>
                    <span className="rounded-full border border-blue-300/25 bg-blue-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-200">
                      Chat capture on
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        isActiveProofTrafficApproved
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-300/30 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {isActiveProofTrafficApproved
                        ? "Provider traffic approved"
                        : hasPendingProofTrafficApproval
                          ? "Approval ledger pending"
                          : "Approve traffic in Admin"}
                    </span>
                    {hasLoadedProofPrompt && (
                      <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                        Proof prompt loaded
                      </span>
                    )}
                    {hasLoadedVoiceProofScript && (
                      <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-200">
                        Voice script loaded
                      </span>
                    )}
                    {hasLoadedVoiceProofScript && voiceState === "idle" && (
                      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">
                        Start voice first
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        voiceState !== "idle"
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : "border-violet-300/25 bg-violet-400/10 text-violet-200"
                      }`}
                    >
                      {voiceState !== "idle"
                        ? "Voice live"
                        : "Voice capture ready"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        apiKey.trim()
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-300/30 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {apiKey.trim()
                        ? "OpenRouter key set"
                        : "OpenRouter key missing"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        deepgramApiKey.trim()
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-300/30 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {deepgramApiKey.trim()
                        ? "Deepgram key set"
                        : "Deepgram key missing"}
                    </span>
                  </div>
                </div>
              </div>
            </gsapMotion.div>
          )}
        </AnimatePresence>

        {/* Selected Text Context Chip */}
        <AnimatePresence>
          {selectedTextContext && (
            <gsapMotion.div
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
                  <gsapMotion.div
                    animate={
                      animationsEnabled ? { rotate: 360 } : { rotate: 0 }
                    }
                    transition={{
                      repeat: animationsEnabled ? Infinity : 0,
                      duration: animationsEnabled ? 5 : 0,
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
            </gsapMotion.div>
          )}
        </AnimatePresence>

        <div className="relative mx-auto mb-2 flex w-full max-w-3xl items-end overflow-visible rounded-[32px] bg-[#18181b] shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-[height,min-height] duration-200 ease-out">
          {/* Menu Trigger Button */}
          <div className="relative flex items-center justify-center shrink-0 z-50 ml-2 mb-2 rounded-full h-[48px] w-[48px] p-[2px]">
            <gsapMotion.button
              onClick={() => setIsSkillsMenuOpen(!isSkillsMenuOpen)}
              className="relative flex items-center justify-center w-full h-full rounded-full group focus:outline-none shrink-0"
              aria-label="Open tutor tools"
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
              <gsapMotion.div
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
                <gsapMotion.div
                  className="absolute z-20 flex items-center justify-center"
                  animate={{ rotate: isSkillsMenuOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Plus
                    size={18}
                    className={
                      isSkillsMenuOpen
                        ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                        : "text-zinc-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                    }
                    strokeWidth={isSkillsMenuOpen ? 3 : 2.5}
                    style={{
                      filter: isSkillsMenuOpen
                        ? "drop-shadow(0 0 4px rgba(255,255,255,0.4))"
                        : "drop-shadow(0 1px 3px rgba(0,0,0,0.9))",
                    }}
                  />
                </gsapMotion.div>
              </gsapMotion.div>
              <gsapMotion.div
                className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center"
                animate={{ rotate: isSkillsMenuOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <span className="absolute h-7 w-7 rounded-full bg-black/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_2px_8px_rgba(0,0,0,0.55)]" />
                <Plus
                  size={19}
                  className="relative z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.52)]"
                  strokeWidth={isSkillsMenuOpen ? 3 : 2.65}
                  aria-hidden="true"
                />
              </gsapMotion.div>
            </gsapMotion.button>
            <FloatingSkillsMenu
              isOpen={isSkillsMenuOpen}
              onClose={() => setIsSkillsMenuOpen(false)}
              onSelectSkill={(skill) => {
                if (skill === "Search") setIsSearchSkillActive(true);
              }}
            />
          </div>

          <div className="relative flex min-h-[60px] flex-1 items-end justify-center">
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
            <gsapMotion.textarea
              key="text-input"
              ref={textareaRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                voiceState !== "idle"
                  ? "Type to talk to Aria..."
                  : isSearchSkillActive
                    ? "Search the web..."
                    : "Ask about the document..."
              }
              className={`custom-scroll z-10 w-full resize-none border-none bg-transparent px-4 text-[15px] leading-[1.42] text-zinc-100 outline-none transition-[height] duration-200 ease-out caret-white placeholder:text-zinc-500 ${isSearchSkillActive ? "pt-8 pb-3" : "py-[18px]"}`}
              rows={1}
            />
          </div>
          <div className="relative flex items-center gap-2 shrink-0 z-50 mr-2 mb-2">
            <div className="relative flex items-center justify-center shrink-0 rounded-full h-[48px] w-[48px] p-[2px]">
              <gsapMotion.button
                className="relative flex items-center justify-center w-full h-full rounded-full group focus:outline-none shrink-0"
                onClick={toggleVoice}
                aria-label={
                  voiceState === "idle" ? "Start voice input" : "Voice input"
                }
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

                <gsapMotion.div
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
                  <gsapMotion.div className="absolute z-20 flex items-center justify-center">
                    {voiceState === "idle" ? (
                      <Mic
                        size={18}
                        className="text-zinc-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                      />
                    ) : voiceState === "listening" ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-50" />
                        <div className="absolute inset-[-4px] rounded-full bg-emerald-500/20 blur animate-pulse" />
                        <Mic
                          size={18}
                          className="relative z-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        />
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-[-4px] rounded-full bg-blue-500/20 blur animate-pulse" />
                        <Activity
                          size={18}
                          className="relative z-10 animate-pulse text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                        />
                      </div>
                    )}
                  </gsapMotion.div>
                </gsapMotion.div>
                <div className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center">
                  <span className="absolute h-7 w-7 rounded-full bg-black/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_2px_8px_rgba(0,0,0,0.55)]" />
                  {voiceState === "idle" ? (
                    <Mic
                      size={19}
                      className="relative z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.52)]"
                      aria-hidden="true"
                    />
                  ) : voiceState === "listening" ? (
                    <Mic
                      size={19}
                      className="relative z-10 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Activity
                      size={19}
                      className="relative z-10 text-blue-300 drop-shadow-[0_0_10px_rgba(96,165,250,0.85)]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </gsapMotion.button>
            </div>

            <div className="relative flex items-center justify-center shrink-0 z-50 rounded-full h-[48px] w-[48px] p-[2px]">
              <gsapMotion.button
                className="relative flex items-center justify-center w-full h-full rounded-full group focus:outline-none shrink-0"
                aria-label="Send message"
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
                  idle: { scale: 1, opacity: isActive ? 1 : 0.78 },
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
                    <gsapMotion.div
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
                {sendState === "idle" && (
                  <div className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center">
                    <span className="absolute h-7 w-7 rounded-full bg-black/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_2px_8px_rgba(0,0,0,0.55)]" />
                    <ArrowUp
                      className={`h-[19px] w-[19px] ${
                        isActive && isValid ? "text-white" : "text-zinc-200"
                      } relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.52)]`}
                      stroke="currentColor"
                      strokeWidth={2.75}
                      aria-hidden="true"
                    />
                  </div>
                )}

                <gsapMotion.div
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
                  <gsapMotion.div
                    variants={{
                      idle: { y: 0, opacity: 1, scale: 1 },
                      hover: { y: 0, opacity: 1, scale: 1 },
                      tap: { y: 2, opacity: 1, scale: 0.9 },
                      sending: { y: -30, opacity: 0, scale: 0.5 },
                      success: { y: 30, opacity: 0, scale: 0.5 },
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={
                      sendState === "idle"
                        ? "absolute z-20 flex items-center justify-center"
                        : "hidden"
                    }
                  >
                    <ArrowUp
                      className={`h-[18px] w-[18px] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ${
                        isActive && isValid ? "text-zinc-50" : "text-zinc-400"
                      }`}
                      stroke="currentColor"
                      style={{
                        filter:
                          isActive && isValid
                            ? "drop-shadow(0 0 6px rgba(255,255,255,0.34))"
                            : "drop-shadow(0 1px 3px rgba(0,0,0,1))",
                      }}
                      strokeWidth={2.5}
                    />
                  </gsapMotion.div>

                  <gsapMotion.div
                    variants={{
                      idle: { opacity: 0, scale: 0.5 },
                      hover: { opacity: 0, scale: 0.5 },
                      tap: { opacity: 0, scale: 0.5 },
                      sending: { opacity: 1, scale: 1 },
                      success: { opacity: 0, scale: 1.5 },
                    }}
                    transition={{ duration: 0.2 }}
                    className={
                      sendState === "sending"
                        ? "absolute z-30 flex items-center justify-center mix-blend-screen"
                        : "hidden"
                    }
                  >
                    <gsapMotion.div
                      animate={{ rotate: sendState === "sending" ? 360 : 0 }}
                      transition={{
                        repeat:
                          animationsEnabled && sendState === "sending"
                            ? Infinity
                            : 0,
                        duration: animationsEnabled ? 1 : 0,
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
                    </gsapMotion.div>
                  </gsapMotion.div>

                  <gsapMotion.div
                    variants={{
                      idle: { opacity: 0, scale: 0.5, y: -20 },
                      hover: { opacity: 0, scale: 0.5, y: -20 },
                      tap: { opacity: 0, scale: 0.5, y: -20 },
                      sending: { opacity: 0, scale: 0.5, y: -20 },
                      success: { opacity: 1, scale: 1, y: 0 },
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className={
                      sendState === "success"
                        ? "absolute z-40 flex items-center justify-center"
                        : "hidden"
                    }
                  >
                    <Check
                      className="w-[18px] h-[18px] text-white"
                      strokeWidth={3}
                    />
                  </gsapMotion.div>
                </gsapMotion.div>
              </gsapMotion.button>
            </div>

            <AnimatePresence>
              {!isValid && (
                <gsapMotion.div
                  initial={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="absolute -top-10 left-6 text-[#ff4d4d] text-xs font-medium tracking-wide flex items-center gap-1.5"
                >
                  <X size={12} strokeWidth={3} />
                  Special characters are limited.
                </gsapMotion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {voiceState !== "idle" && (
          <VoiceUniverse state={voiceState} caption={voiceCaption} />
        )}
      </AnimatePresence>
    </div>
  );
}
