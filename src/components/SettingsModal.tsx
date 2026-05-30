import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Coins,
  Settings,
  X,
  Key,
  Loader2,
  Mic,
  AlertCircle,
  Globe2,
  UserRound,
  MessageSquare,
  RotateCcw,
  Search,
  Volume2,
} from "lucide-react";
import { useStore } from "../store";
import { SiriLiquidGlass } from "./SiriLiquidGlass";
import { useTranslation } from "../lib/translations";
import { useMotionPreference } from "../hooks/useMotionPreference";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatCount = (value: number) => {
  const n = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
};

const UsageGraphBar = ({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) => {
  const width = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 4;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <span>{label}</span>
        <span className="font-mono text-zinc-300">{formatCount(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
};

function UsageInsightsPanel() {
  const chatUsage = useStore((state) => state.chatUsage);
  const voiceUsage = useStore((state) => state.voiceUsage);
  const webUsage = useStore((state) => state.webUsage);
  const resetUsageAnalytics = useStore((state) => state.resetUsageAnalytics);

  const inputTokens = chatUsage.inputTokens;
  const outputTokens = chatUsage.outputTokens;
  const chatTotal = inputTokens + outputTokens;
  const voiceUnits =
    voiceUsage.connectionSeconds + voiceUsage.ttsCharacters / 80;
  const totalCost = chatUsage.cost + voiceUsage.cost + webUsage.cost;
  const maxGraphValue = Math.max(
    inputTokens,
    outputTokens,
    webUsage.requests,
    1,
  );
  const costSegments = [
    {
      key: "chat",
      label: "Chat",
      value: chatUsage.cost,
      color: "bg-[#ff6e00]",
    },
    {
      key: "voice",
      label: "Voice",
      value: voiceUsage.cost,
      color: "bg-violet-400",
    },
    {
      key: "search",
      label: "Search",
      value: webUsage.cost,
      color: "bg-cyan-300",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,110,0,0.22),transparent_34%),radial-gradient(circle_at_90%_110%,rgba(34,211,238,0.16),transparent_38%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                <Coins size={13} className="text-[#ff6e00]" />
                Session Cost
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {formatCurrency(totalCost)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {formatCount(chatTotal)} chat tokens ·{" "}
                {formatCount(webUsage.requests)} web calls
              </div>
            </div>
            <button
              type="button"
              onClick={resetUsageAnalytics}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="flex h-full w-full">
              {costSegments.map((segment) => (
                <motion.div
                  key={segment.key}
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      totalCost > 0
                        ? `${Math.max(3, (segment.value / totalCost) * 100)}%`
                        : "33.333%",
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={segment.color}
                  title={`${segment.label}: ${formatCurrency(segment.value)}`}
                />
              ))}
            </div>
          </div>
          <div className="relative mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
            {costSegments.map((segment) => (
              <span
                key={segment.key}
                className="inline-flex items-center gap-1.5"
              >
                <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                {segment.label} {formatCurrency(segment.value)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#121214] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <MessageSquare size={15} className="text-[#ff6e00]" />
            Chat Tokens
          </div>
          <div className="space-y-3">
            <UsageGraphBar
              label="Input"
              value={inputTokens}
              max={maxGraphValue}
              color="bg-[#ff6e00] shadow-[0_0_18px_rgba(255,110,0,0.45)]"
            />
            <UsageGraphBar
              label="Output"
              value={outputTokens}
              max={maxGraphValue}
              color="bg-white/80"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
            <div className="rounded-xl bg-white/[0.04] p-2">
              Model
              <div className="mt-1 truncate font-mono text-zinc-300">
                {chatUsage.model || "unknown"}
              </div>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-2">
              Requests
              <div className="mt-1 font-mono text-zinc-300">
                {formatCount(chatUsage.requests)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#121214] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Volume2 size={15} className="text-violet-400" />
              Voice
            </div>
            <div className="text-xl font-semibold text-white">
              {formatCount(Math.round(voiceUnits))}
            </div>
            <div className="text-xs text-zinc-500">billable units</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#121214] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Search size={15} className="text-cyan-300" />
              Search
            </div>
            <div className="text-xl font-semibold text-white">
              {formatCount(webUsage.sourcesReviewed)}
            </div>
            <div className="text-xs text-zinc-500">sources reviewed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const motionEnabled = useMotionPreference();
  const {
    apiKey,
    setApiKey,
    serperApiKey,
    setSerperApiKey,
    deepgramApiKey,
    setDeepgramApiKey,
    learnerName,
    setLearnerName,
    ttsVoice,
    setTtsVoice,
    aiModel,
    setAiModel,
    animationsEnabled,
    setAnimationsEnabled,
    systemPrompt,
    setSystemPrompt,
    language,
    setLanguage,
    activeView,
  } = useStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputSerperKey, setInputSerperKey] = useState(serperApiKey);
  const [inputDeepgramKey, setInputDeepgramKey] = useState(deepgramApiKey);
  const [inputLearnerName, setInputLearnerName] = useState(learnerName);
  const [inputVoice, setInputVoice] = useState(ttsVoice || "gpt-4o-mini-tts");
  const [inputModel, setInputModel] = useState(aiModel || "gpt-4o-mini");
  const [inputAnimations, setInputAnimations] = useState(animationsEnabled);
  const [inputPrompt, setInputPrompt] = useState(systemPrompt || "");
  const [inputLanguage, setInputLanguage] = useState(language || "en");
  const [personaDesc, setPersonaDesc] = useState("");
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [personaStatus, setPersonaStatus] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "persona" | "usage">(
    "general",
  );

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const TTS_VOICES = [
    { id: "gpt-4o-mini-tts", name: "OpenAI gpt-4o-mini-tts (Premium)" },
    { id: "aura-asteria-en", name: "Asteria (Clear)" },
    { id: "aura-luna-en", name: "Luna (Warm)" },
    { id: "aura-stella-en", name: "Stella (Bright)" },
    { id: "aura-athena-en", name: "Athena (Measured)" },
    { id: "aura-hera-en", name: "Hera (Expressive)" },
    { id: "aura-orion-en", name: "Orion (Male)" },
    { id: "aura-arcas-en", name: "Arcas (Deep)" },
    { id: "aura-perseus-en", name: "Perseus (Authoritative)" },
    { id: "aura-angus-en", name: "Angus (Friendly)" },
    { id: "aura-orpheus-en", name: "Orpheus (Narrator)" },
    { id: "aura-helios-en", name: "Helios (Crisp)" },
    { id: "aura-zeus-en", name: "Zeus (Bold)" },
  ];

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setInputKey(apiKey);
      setInputSerperKey(serperApiKey);
      setInputDeepgramKey(deepgramApiKey);
      setInputLearnerName(learnerName);
      setInputVoice(ttsVoice || "gpt-4o-mini-tts");
      setInputModel(aiModel || "gpt-4o-mini");
      setInputAnimations(animationsEnabled);
      setInputPrompt(systemPrompt || "");
      setInputLanguage(language || "en");
      setValidationError(null);
      setPersonaStatus(null);
    }
  }, [
    isOpen,
    apiKey,
    serperApiKey,
    deepgramApiKey,
    learnerName,
    ttsVoice,
    aiModel,
    animationsEnabled,
    systemPrompt,
    language,
  ]);

  const handleSave = async () => {
    setValidationError(null);
    const trimmedSerperKey = inputSerperKey.trim();
    const trimmedDeepgramKey = inputDeepgramKey.trim();

    // Auto-save if key is empty
    if (!inputKey || inputKey.trim() === "") {
      setApiKey("");
      setSerperApiKey(trimmedSerperKey);
      setDeepgramApiKey(trimmedDeepgramKey);
      setLearnerName(inputLearnerName);
      setTtsVoice(inputVoice);
      setAiModel(inputModel);
      setAnimationsEnabled(inputAnimations);
      setSystemPrompt(inputPrompt);
      setLanguage(inputLanguage);
      setIsOpen(false);
      return;
    }

    setIsValidating(true);
    try {
      setSerperApiKey(trimmedSerperKey);
      // Ping the models endpoint to verify API key integrity
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${inputKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "Cosmic Obsidian AI Tutor",
        },
      });

      if (!res.ok) {
        setValidationError("Invalid API Key or OpenRouter is unreachable.");
        setIsValidating(false);
        return;
      }

      setApiKey(inputKey);
      setSerperApiKey(trimmedSerperKey);
      setDeepgramApiKey(trimmedDeepgramKey);
      setLearnerName(inputLearnerName);
      setTtsVoice(inputVoice);
      setAiModel(inputModel);
      setAnimationsEnabled(inputAnimations);
      setSystemPrompt(inputPrompt);
      setLanguage(inputLanguage);
      setIsOpen(false);
    } catch (err: any) {
      setValidationError(
        err.message || "Network error. Failed to validate key.",
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Open app settings"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed right-4 top-[4.35rem] z-50 flex h-[42px] w-[42px] items-center justify-center overflow-visible rounded-full p-[1px] transition-[color,background-color,border-color,box-shadow,transform,opacity] focus:outline-none group sm:right-8 sm:top-8 sm:h-[46px] sm:w-[46px]"
        style={{
          boxShadow:
            "0 20px 50px -10px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.1)",
        }}
      >
        {/* Animated Liquid Metal Border */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
          style={{
            padding: "1px",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        >
          <motion.div
            animate={motionEnabled ? { rotate: 360 } : { rotate: 0 }}
            transition={{
              repeat: motionEnabled ? Infinity : 0,
              duration: motionEnabled ? 4 : 0,
              ease: "linear",
            }}
            className="absolute inset-[-50%] w-[200%] h-[200%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.1) 60%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
        </div>

        <div
          className="w-full h-full rounded-full flex items-center justify-center group-hover:bg-white/5 transition-colors relative"
          style={{
            background:
              activeView === "revision"
                ? "rgba(10, 10, 12, 0.85)"
                : "rgba(28, 28, 30, 0.4)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <Settings
            size={20}
            className="relative z-10 transition-[transform,color] group-hover:rotate-45 duration-700 ease-out text-zinc-400 group-hover:text-zinc-200 focus:outline-none"
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isValidating) setIsOpen(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-2xl px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-title"
            >
              <div className="relative overflow-hidden bg-[#09090b]/95 border border-white/10 rounded-[30px] p-6 shadow-[0_34px_110px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col gap-6 backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,110,0,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(124,58,237,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.055),transparent_42%)]" />
                <div className="flex justify-between items-center">
                  <h2
                    id="settings-modal-title"
                    className="relative z-10 text-xl font-medium tracking-tight text-white flex items-center gap-2"
                  >
                    <Settings size={20} className="text-[#ff6e00]" />
                    {t("app_settings")}
                  </h2>
                  <button
                    onClick={() => {
                      if (!isValidating) setIsOpen(false);
                    }}
                    className="relative z-10 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Close settings"
                    disabled={isValidating}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div
                  className="flex bg-white/[0.05] border border-white/10 rounded-full p-1 relative z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  role="tablist"
                  aria-label="Settings sections"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "general"}
                    onClick={() => setActiveTab("general")}
                    className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors relative z-20 ${activeTab === "general" ? "text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {activeTab === "general" && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 bg-white/[0.09] rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.25)] border border-white/10 z-[-1]"
                      />
                    )}
                    {t("general")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "usage"}
                    onClick={() => setActiveTab("usage")}
                    className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors relative z-20 ${activeTab === "usage" ? "text-[#ffb17a]" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {activeTab === "usage" && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 bg-[#ff6e00]/15 rounded-full shadow-[0_10px_26px_rgba(255,110,0,0.16)] border border-[#ff6e00]/20 z-[-1]"
                      />
                    )}
                    {t("usage")}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "persona"}
                    onClick={() => setActiveTab("persona")}
                    className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors relative z-20 ${activeTab === "persona" ? "text-emerald-300" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {activeTab === "persona" && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 bg-emerald-500/12 rounded-full shadow-[0_10px_26px_rgba(16,185,129,0.16)] border border-emerald-500/20 z-[-1]"
                      />
                    )}
                    {t("persona_studio")}
                  </button>
                </div>

                <div className="flex flex-col gap-5 overflow-y-auto overflow-x-hidden h-[420px] pr-2 custom-scrollbar relative">
                  <AnimatePresence mode="wait">
                    {activeTab === "general" && (
                      <motion.div
                        key="general"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex flex-col gap-5"
                      >
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Globe2 size={14} className="text-emerald-400" />
                            {t("language")}
                          </label>
                          <select
                            value={inputLanguage}
                            onChange={(e) => setInputLanguage(e.target.value)}
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="en">English (US)</option>
                            <option value="ja">日本語 (Japanese)</option>
                            <option value="ko">한국어 (Korean)</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <UserRound size={14} className="text-orange-400" />
                            {t("learner_name")}
                          </label>
                          <input
                            type="text"
                            value={inputLearnerName}
                            onChange={(e) =>
                              setInputLearnerName(e.target.value)
                            }
                            placeholder="Your name"
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] disabled:opacity-50"
                          />
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Used as the root node of your virtual brain map and
                            DeepSeek trace cards.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Key size={14} className="text-blue-400" />
                            {t("openrouter_key")}
                          </label>
                          <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] font-mono disabled:opacity-50"
                          />
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Your key is stored locally in your browser's
                            localStorage and is sent as a bearer key only for
                            your own AI requests. Hosted deployments use this
                            key by default; a server OpenRouter key is used only
                            when the deployment owner explicitly enables the
                            shared fallback.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Globe2 size={14} className="text-cyan-400" />
                            {t("serper_key")}
                          </label>
                          <input
                            type="password"
                            value={inputSerperKey}
                            onChange={(e) => setInputSerperKey(e.target.value)}
                            placeholder="SERPER_API_KEY"
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] font-mono disabled:opacity-50"
                          />
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Stored locally and sent only to this app's backend
                            when live web search is needed. Server environment
                            keys still work as a fallback.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Mic size={14} className="text-violet-400" />
                            {t("deepgram_key")}
                          </label>
                          <input
                            type="password"
                            value={inputDeepgramKey}
                            onChange={(e) =>
                              setInputDeepgramKey(e.target.value)
                            }
                            placeholder="DEEPGRAM_API_KEY"
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] font-mono disabled:opacity-50"
                          />
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Stored locally and sent only to this app's backend
                            for voice and Deepgram read-aloud requests. Server
                            environment keys still work as a fallback.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Mic size={14} className="text-violet-400" />
                            {t("tts_voice")}
                          </label>
                          <select
                            value={inputVoice}
                            onChange={(e) => setInputVoice(e.target.value)}
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {TTS_VOICES.map((voice) => (
                              <option key={voice.id} value={voice.id}>
                                {voice.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Settings size={14} className="text-pink-400" />
                            {t("ai_model")}
                          </label>
                          <select
                            value={inputModel}
                            onChange={(e) => setInputModel(e.target.value)}
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="gpt-4o-mini">
                              GPT-4o Mini (Fast/Cheap)
                            </option>
                            <option value="gpt-4o">GPT-4o (Smart)</option>
                            <option value="anthropic/claude-3.5-sonnet">
                              Claude 3.5 Sonnet
                            </option>
                            <option value="google/gemini-1.5-pro">
                              Gemini 1.5 Pro
                            </option>
                            <option value="deepseek/deepseek-v4-flash">
                              DeepSeek V4 Flash
                            </option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <div className="w-5 h-5 relative overflow-hidden rounded-full shrink-0">
                              <SiriLiquidGlass isActive={false} />
                            </div>
                            {t("ui_animations")}
                          </label>
                          <button
                            type="button"
                            onClick={() => setInputAnimations(!inputAnimations)}
                            role="switch"
                            aria-checked={inputAnimations}
                            aria-label="Toggle UI animations"
                            className={`w-11 h-6 rounded-full transition-colors relative ${inputAnimations ? "bg-blue-500" : "bg-zinc-700"}`}
                          >
                            <div
                              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${inputAnimations ? "translate-x-5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>

                        {validationError && (
                          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                            <AlertCircle size={16} />
                            <p>{validationError}</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "usage" && (
                      <motion.div
                        key="usage"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div className="mb-4 flex items-center gap-2">
                          <BarChart3 size={16} className="text-[#ff6e00]" />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              Usage analytics
                            </div>
                            <div className="text-xs text-zinc-500">
                              Tokens, requests, and cost for this browser.
                            </div>
                          </div>
                        </div>
                        <UsageInsightsPanel />
                      </motion.div>
                    )}

                    {activeTab === "persona" && (
                      <motion.div
                        key="persona"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex flex-col gap-5"
                      >
                        <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                          <div className="flex flex-col gap-3">
                            <label className="text-sm font-medium text-zinc-200 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <Settings
                                  size={14}
                                  className="text-emerald-400"
                                />
                                AI Persona Studio
                              </span>
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                                Live prompt
                              </span>
                            </label>
                            <p className="text-xs leading-relaxed text-zinc-500">
                              Describe the tutor you want. The generator writes
                              a professional system prompt, applies the no-emoji
                              tutor style, and saves it when you press Save.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                "Socratic Python mentor",
                                "Concise exam coach",
                                "Research paper tutor",
                              ].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setPersonaDesc(preset)}
                                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-zinc-400 transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <input
                              type="text"
                              value={personaDesc}
                              onChange={(e) => setPersonaDesc(e.target.value)}
                              placeholder="I want an AI tutor specialized in..."
                              className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-[color,background-color,border-color,box-shadow,transform,opacity]"
                            />
                            <button
                              onClick={async () => {
                                if (!personaDesc.trim()) return;
                                setIsGeneratingPersona(true);
                                try {
                                  const res = await fetch(
                                    "/api/generate-persona",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        ...(inputKey.trim()
                                          ? {
                                              Authorization: `Bearer ${inputKey.trim()}`,
                                            }
                                          : {}),
                                      },
                                      body: JSON.stringify({
                                        description: personaDesc,
                                      }),
                                    },
                                  );
                                  const data = await res.json();
                                  if (!res.ok || data.error) {
                                    throw new Error(
                                      data.error ||
                                        "Persona generation failed.",
                                    );
                                  }
                                  if (data.prompt) {
                                    setInputPrompt(data.prompt);
                                    setPersonaStatus(
                                      "Persona prompt generated. Press Save to apply it.",
                                    );
                                  }
                                } catch (e) {
                                  console.error(e);
                                  setPersonaStatus(
                                    e instanceof Error
                                      ? e.message
                                      : "Persona generation failed.",
                                  );
                                } finally {
                                  setIsGeneratingPersona(false);
                                }
                              }}
                              disabled={isGeneratingPersona}
                              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isGeneratingPersona ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : null}
                              Generate
                            </button>
                          </div>
                          {personaStatus && (
                            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-relaxed text-zinc-400">
                              {personaStatus}
                            </div>
                          )}
                          <textarea
                            value={inputPrompt}
                            onChange={(e) => setInputPrompt(e.target.value)}
                            placeholder="You are a precise, professional tutor. Use clear markdown, ask targeted questions, and do not use emojis unless explicitly requested."
                            className="mt-3 min-h-[170px] w-full resize-y rounded-xl border border-white/10 bg-[#121214] px-4 py-3 font-mono text-sm leading-relaxed text-white transition-[color,background-color,border-color,box-shadow,transform,opacity] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setIsOpen(false)}
                    disabled={isValidating}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isValidating}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50"
                  >
                    {isValidating && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {isValidating ? "Validating..." : t("save_changes")}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
