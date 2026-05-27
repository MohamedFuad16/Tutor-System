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
  const {
    apiKey,
    setApiKey,
    serperApiKey,
    setSerperApiKey,
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
  } = useStore();
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputSerperKey, setInputSerperKey] = useState(serperApiKey);
  const [inputLearnerName, setInputLearnerName] = useState(learnerName);
  const [inputVoice, setInputVoice] = useState(ttsVoice || "aura-asteria-en");
  const [inputModel, setInputModel] = useState(aiModel || "gpt-4o-mini");
  const [inputAnimations, setInputAnimations] = useState(animationsEnabled);
  const [inputPrompt, setInputPrompt] = useState(systemPrompt || "");
  const [personaDesc, setPersonaDesc] = useState("");
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "persona" | "usage">(
    "general",
  );

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const TTS_VOICES = [
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
      setInputLearnerName(learnerName);
      setInputVoice(ttsVoice || "aura-asteria-en");
      setInputModel(aiModel || "gpt-4o-mini");
      setInputAnimations(animationsEnabled);
      setInputPrompt(systemPrompt || "");
      setValidationError(null);
    }
  }, [
    isOpen,
    apiKey,
    serperApiKey,
    learnerName,
    ttsVoice,
    aiModel,
    animationsEnabled,
    systemPrompt,
  ]);

  const handleSave = async () => {
    setValidationError(null);
    const trimmedSerperKey = inputSerperKey.trim();

    // Auto-save if key is empty
    if (!inputKey || inputKey.trim() === "") {
      setApiKey("");
      setSerperApiKey(trimmedSerperKey);
      setLearnerName(inputLearnerName);
      setTtsVoice(inputVoice);
      setAiModel(inputModel);
      setAnimationsEnabled(inputAnimations);
      setSystemPrompt(inputPrompt);
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
      setLearnerName(inputLearnerName);
      setTtsVoice(inputVoice);
      setAiModel(inputModel);
      setAnimationsEnabled(inputAnimations);
      setSystemPrompt(inputPrompt);
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-8 right-8 z-50 rounded-full w-[46px] h-[46px] flex items-center justify-center p-[1px] transition-all shadow-[0_8px_32px_rgba(0,0,0,0.8)] focus:outline-none group overflow-visible"
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
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-[-50%] w-[200%] h-[200%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.1) 60%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
        </div>

        <div className="w-full h-full rounded-full bg-[#111111] flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] group-hover:bg-[#1A1A1A] transition-colors relative">
          <Settings
            size={20}
            className="relative z-10 transition-transform group-hover:rotate-45 duration-700 ease-out text-white drop-shadow-md focus:outline-none"
          />
          <div
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121214] z-20 ${apiKey ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]" : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]"}`}
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
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-2xl px-4"
            >
              <div className="bg-[#0A0A0B] border border-white/10 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,1)] flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
                    <Settings size={20} className="text-zinc-400" />
                    App Settings
                  </h2>
                  <button
                    onClick={() => {
                      if (!isValidating) setIsOpen(false);
                    }}
                    className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                    disabled={isValidating}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex bg-[#121214] border border-white/10 rounded-lg p-1 relative z-10">
                  <button
                    onClick={() => setActiveTab("general")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative z-20 ${activeTab === "general" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {activeTab === "general" && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 bg-[#2a2a2a] rounded-md shadow z-[-1]"
                      />
                    )}
                    General
                  </button>
                  <button
                    onClick={() => setActiveTab("usage")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative z-20 ${activeTab === "usage" ? "text-[#ffb067]" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {activeTab === "usage" && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 bg-[#ff6e00]/15 rounded-md shadow border border-[#ff6e00]/25 z-[-1]"
                      />
                    )}
                    Usage
                  </button>
                  <button
                    onClick={() => setActiveTab("persona")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative z-20 ${activeTab === "persona" ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {activeTab === "persona" && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 bg-emerald-500/20 rounded-md shadow border border-emerald-500/30 z-[-1]"
                      />
                    )}
                    Persona Studio
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
                            <UserRound size={14} className="text-orange-400" />
                            Learner Name
                          </label>
                          <input
                            type="text"
                            value={inputLearnerName}
                            onChange={(e) =>
                              setInputLearnerName(e.target.value)
                            }
                            placeholder="Your name"
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                          />
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Used as the root node of your virtual brain map and
                            DeepSeek trace cards.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Key size={14} className="text-blue-400" />
                            OpenRouter API Key
                          </label>
                          <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono disabled:opacity-50"
                          />
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            Your key is stored locally in your browser's
                            localStorage and is only sent directly to the AI
                            service. Required for Chat via OpenRouter.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Globe2 size={14} className="text-cyan-400" />
                            Serper API Key
                          </label>
                          <input
                            type="password"
                            value={inputSerperKey}
                            onChange={(e) => setInputSerperKey(e.target.value)}
                            placeholder="SERPER_API_KEY"
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono disabled:opacity-50"
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
                            TTS Voice Selection
                          </label>
                          <select
                            value={inputVoice}
                            onChange={(e) => setInputVoice(e.target.value)}
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            AI Model
                          </label>
                          <select
                            value={inputModel}
                            onChange={(e) => setInputModel(e.target.value)}
                            disabled={isValidating}
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <option value="deepseek/deepseek-chat">
                              DeepSeek V4 Flash
                            </option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <div className="w-5 h-5 relative overflow-hidden rounded-full shrink-0">
                              <SiriLiquidGlass isActive={false} />
                            </div>
                            UI Animations & Transitions
                          </label>
                          <button
                            type="button"
                            onClick={() => setInputAnimations(!inputAnimations)}
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
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Settings
                                size={14}
                                className="text-emerald-400"
                              />
                              AI Persona Studio
                            </span>
                          </label>
                          <p className="text-xs text-zinc-500 mb-1">
                            Describe your ideal tutor (e.g. "Python expert with
                            10 years experience"). We will generate a structured
                            persona prompt based on best practices.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={personaDesc}
                              onChange={(e) => setPersonaDesc(e.target.value)}
                              placeholder="I want an AI tutor specialized in..."
                              className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
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
                                      },
                                      body: JSON.stringify({
                                        description: personaDesc,
                                      }),
                                    },
                                  );
                                  const data = await res.json();
                                  if (data.prompt) setInputPrompt(data.prompt);
                                } catch (e) {
                                  console.error(e);
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
                          <textarea
                            value={inputPrompt}
                            onChange={(e) => setInputPrompt(e.target.value)}
                            placeholder="You are a strict, Socratic tutor who NEVER gives direct answers. Ask questions."
                            className="bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono min-h-[120px]"
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
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isValidating}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50"
                  >
                    {isValidating && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {isValidating ? "Validating..." : "Save Changes"}
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
