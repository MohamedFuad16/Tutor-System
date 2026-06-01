import dotenv from "dotenv";
dotenv.config();
import express from "express";
import * as fs from "fs";
import path from "path";
import compression from "compression";
import OpenAI from "openai";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import type { IncomingHttpHeaders, Server as HttpServer } from "http";
import {
  detectFreshnessSearch,
  formatSourcesForPrompt,
  searchSerper,
  type NormalizedWebSource,
  type WebSearchMode,
} from "./server/web-search.js";
import {
  BRAIN_RUNTIME_SETTING_LIMITS,
  DEFAULT_BRAIN_RUNTIME_SETTINGS,
  WEB_SEARCH_POLICIES,
  normalizeBrainRuntimeSettings,
  type BrainRuntimeSettings,
} from "./src/lib/brainRuntimeSettings.js";

export {
  BRAIN_RUNTIME_SETTING_LIMITS,
  DEFAULT_BRAIN_RUNTIME_SETTINGS,
  WEB_SEARCH_POLICIES,
  normalizeBrainRuntimeSettings,
};

const DEEPGRAM_PRICING = {
  voiceAgentPerMinute: 0.075,
  aura1Per1kCharacters: 0.015,
  aura2Per1kCharacters: 0.03,
  fluxEnglishPerHour: 4.5,
};

type OpenRouterPricing = Record<
  string,
  { prompt: number; completion: number; name?: string }
>;

let pricingCache: {
  fetchedAt: number;
  models: OpenRouterPricing;
  stale: boolean;
} | null = null;

const PRICING_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PCM16_MONO_48K_BYTES_PER_SECOND = 48000 * 2;
const DEFAULT_CHAT_MODEL = "deepseek/deepseek-v4-flash";
const LEARNING_AGENT_MODEL = "deepseek/deepseek-v4-flash";
const OPENROUTER_SERVER_FALLBACK_FLAG = "ALLOW_SERVER_OPENROUTER_FALLBACK";
const MAX_DOCUMENT_UPLOAD_MB = 50;
const MAX_DOCUMENT_UPLOAD_BYTES = MAX_DOCUMENT_UPLOAD_MB * 1024 * 1024;

const roundCost = (value: number) =>
  Math.round((value || 0) * 1_000_000) / 1_000_000;

const estimateTokensFromText = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return Math.max(1, Math.ceil(text.length / 4));
};

const ttsCostForModel = (model: string, characters: number) => {
  const rate = model.includes("aura-2")
    ? DEEPGRAM_PRICING.aura2Per1kCharacters
    : DEEPGRAM_PRICING.aura1Per1kCharacters;
  return roundCost((Math.max(0, characters) / 1000) * rate);
};

const voiceAgentCostForSeconds = (seconds: number) =>
  roundCost((Math.max(0, seconds) / 60) * DEEPGRAM_PRICING.voiceAgentPerMinute);

const rawByteLength = (data: any) => {
  if (Buffer.isBuffer(data)) return data.length;
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (Array.isArray(data))
    return data.reduce((sum, chunk) => sum + rawByteLength(chunk), 0);
  if (typeof data === "string") return Buffer.byteLength(data);
  return Buffer.byteLength(Buffer.from(data));
};

const sanitizeApiKey = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key || key === "undefined" || key === "null") return "";
  return key;
};

const isTruthyEnv = (value: unknown) =>
  /^(1|true|yes|on)$/i.test(String(value || "").trim());

type RequestLike = {
  headers: IncomingHttpHeaders;
  socket: { remoteAddress?: string | null };
  url?: string;
};

const firstHeader = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const hostNameFromHeader = (host: string | string[] | undefined) => {
  const rawHost = firstHeader(host).trim().toLowerCase();
  if (!rawHost) return "";
  if (rawHost.startsWith("[")) {
    const end = rawHost.indexOf("]");
    return end > 0 ? rawHost.slice(1, end) : rawHost;
  }
  return rawHost.split(":")[0];
};

const isLoopbackHost = (host: string | string[] | undefined) => {
  const hostname = hostNameFromHeader(host);
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "127.0.0.1"
  );
};

const isLoopbackAddress = (address?: string | null) => {
  const normalized = String(address || "").replace(/^::ffff:/, "");
  return normalized === "::1" || /^127(?:\.\d{1,3}){3}$/.test(normalized);
};

const debugAdminToken = sanitizeApiKey(
  process.env.TUTOR_DEBUG_TOKEN || process.env.ADMIN_DEBUG_TOKEN,
);

const tokenFromAuthorization = (authorization: string) => {
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

const getOpenRouterServerFallbackKey = () =>
  isTruthyEnv(process.env[OPENROUTER_SERVER_FALLBACK_FLAG])
    ? sanitizeApiKey(process.env.OPENROUTER_API_KEY)
    : "";

const resolveOpenRouterApiKey = (headers: IncomingHttpHeaders) =>
  sanitizeApiKey(tokenFromAuthorization(firstHeader(headers.authorization))) ||
  getOpenRouterServerFallbackKey();

const openRouterRequiredMessage =
  "OpenRouter API key is required. Add your own key in Settings, or set ALLOW_SERVER_OPENROUTER_FALLBACK=true for a shared deployment fallback.";

const debugTokenFromRequest = (request: RequestLike) => {
  const headerToken = sanitizeApiKey(
    request.headers["x-debug-token"] ||
      request.headers["x-admin-token"] ||
      tokenFromAuthorization(firstHeader(request.headers.authorization)),
  );
  if (headerToken) return headerToken;

  try {
    const url = new URL(
      request.url || "",
      `http://${firstHeader(request.headers.host) || "localhost"}`,
    );
    return sanitizeApiKey(url.searchParams.get("debugToken"));
  } catch {
    return "";
  }
};

const isAuthorizedDebugRequest = (request: RequestLike) => {
  const requestToken = debugTokenFromRequest(request);
  if (debugAdminToken && requestToken === debugAdminToken) return true;

  return (
    process.env.NODE_ENV !== "production" &&
    isLoopbackHost(request.headers.host) &&
    isLoopbackAddress(request.socket.remoteAddress)
  );
};

const redactSensitiveUrl = (url: string) =>
  url.replace(
    /([?&](?:openRouterKey|deepgramKey|apiKey|debugToken|token|key)=)[^&]*/gi,
    "$1[redacted]",
  );

const normalizeVoiceLanguage = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const language = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return language === "ja" || language === "ko" ? language : "en";
};

const deepgramKeyFromRequest = (request: {
  headers: IncomingHttpHeaders;
  query?: Record<string, unknown>;
}) =>
  sanitizeApiKey(
    request.headers["x-deepgram-key"] ||
      request.headers["x-voice-key"] ||
      request.query?.deepgramKey,
  );

const normalizeModelPricing = (raw: any): OpenRouterPricing => {
  const models: OpenRouterPricing = {};
  const rows = Array.isArray(raw?.data) ? raw.data : [];
  rows.forEach((model: any) => {
    if (!model?.id || !model?.pricing) return;
    models[model.id] = {
      name: model.name,
      prompt: Number(model.pricing.prompt || 0),
      completion: Number(model.pricing.completion || 0),
    };
  });
  return models;
};

const fetchOpenRouterPricing = async (force = false) => {
  const now = Date.now();
  if (
    !force &&
    pricingCache &&
    now - pricingCache.fetchedAt < PRICING_CACHE_TTL_MS
  ) {
    return pricingCache;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok)
      throw new Error(`OpenRouter pricing failed: ${response.status}`);
    const payload = await response.json();
    pricingCache = {
      fetchedAt: now,
      models: normalizeModelPricing(payload),
      stale: false,
    };
    return pricingCache;
  } catch (error) {
    console.warn("[PRICING] OpenRouter pricing fetch failed:", error);
    if (pricingCache) return { ...pricingCache, stale: true };
    pricingCache = { fetchedAt: now, models: {}, stale: true };
    return pricingCache;
  }
};

const openRouterCost = (
  pricing: OpenRouterPricing,
  model: string,
  inputTokens: number,
  outputTokens: number,
) => {
  const modelPricing =
    pricing[model] ||
    pricing[model.replace(/^openai\//, "")] ||
    pricing[`openai/${model}`];
  if (!modelPricing) return 0;
  return roundCost(
    inputTokens * modelPricing.prompt + outputTokens * modelPricing.completion,
  );
};

type SystemActivityKind =
  | "system"
  | "model"
  | "tool"
  | "retrieval"
  | "memory"
  | "web"
  | "error";

type SystemActivityStatus =
  | "started"
  | "progress"
  | "completed"
  | "failed"
  | "fallback"
  | "blocked";

type SystemActivityEvent = {
  id: string;
  timestamp: number;
  kind: SystemActivityKind;
  status: SystemActivityStatus;
  title: string;
  detail?: string;
  requestId?: string;
  model?: string;
  toolName?: string;
  phase?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

type SystemActivityInput = Omit<SystemActivityEvent, "id" | "timestamp">;

const SYSTEM_ACTIVITY_LIMIT = 250;

const activityId = () =>
  `activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const safeActivityMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) return undefined;
  const safe: Record<string, unknown> = {};
  Object.entries(metadata).forEach(([key, value]) => {
    if (/key|token|authorization|secret|password/i.test(key)) {
      safe[key] = "[redacted]";
      return;
    }
    if (typeof value === "string") {
      safe[key] = value.length > 420 ? `${value.slice(0, 417)}...` : value;
      return;
    }
    safe[key] = value;
  });
  return safe;
};

const compactRuntimeSettings = (settings: BrainRuntimeSettings) => ({
  webSearchPolicy: settings.webSearchPolicy,
  toolIterationLimit: settings.toolIterationLimit,
  memoryConceptLimit: settings.memoryConceptLimit,
  activityRefreshMs: settings.activityRefreshMs,
});

const stripWebSearchSystemPrefix = (text: string) =>
  text
    .replace(
      /^\[SYSTEM:\s*The user has explicitly selected the Web Search skill\.[^\]]*\]\s*/i,
      "",
    )
    .trim();

const searchDetectionForExplicitRequest = (
  text: string,
): { query: string; mode: WebSearchMode } => {
  const cleanText = stripWebSearchSystemPrefix(text) || text;
  const explicitSearch = detectFreshnessSearch(`search the web ${cleanText}`);
  if (explicitSearch) {
    return {
      ...explicitSearch,
      query: cleanText.trim().slice(0, 240),
    };
  }
  const mode: WebSearchMode = /\b(news|today|headline|headlines)\b/i.test(
    cleanText,
  )
    ? "news"
    : "search";
  return { query: cleanText.trim().slice(0, 240), mode };
};

const slugifyId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "general-study";

const extractJsonObject = (value: string) => {
  const trimmed = value.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : trimmed;

  try {
    return JSON.parse(jsonStr);
  } catch {
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(jsonStr.slice(start, end + 1));
    }
    throw new Error("Learning agent returned non-JSON content.");
  }
};

const fallbackLearningUpdate = (body: any) => {
  const project = String(body?.activeProject || "").trim();
  const userMessage = String(body?.userMessage || "").trim();
  const assistantMessage = String(body?.assistantMessage || "").trim();
  const cleanAssistant =
    assistantMessage
      .replace(/\bPrompt:\s*/gi, "")
      .replace(/\bLearning note:\s*/gi, "")
      .replace(/\bReview hook:[\s\S]*$/gi, "")
      .replace(/\s+/g, " ")
      .trim() ||
    userMessage.replace(/\s+/g, " ").trim() ||
    "The learner explored a tutor concept.";
  const title =
    project && project !== "General Study"
      ? project
      : userMessage.match(
          /\b(Python|JavaScript|React|TypeScript|Algorithms|System Design|Concurrency|Networking|Machine Learning|Calculus|History)\b/i,
        )?.[0] || "General Study";
  const conceptName =
    title === "General Study" ? "General Conversation" : title;
  return {
    userName: String(body?.userName || "Learner").trim() || "Learner",
    bookTitle: title,
    bookSource: "chat",
    overview: `A session learning book collecting the learner's tutor conversations about ${title}.`,
    chapterTitle: title === "General Study" ? "Conversation Notes" : title,
    chapterSummary: `Key idea: ${cleanAssistant}\n\nHow to review it: restate the idea, identify the mechanism, and test it with a fresh example.`,
    conversationSummary: `Revision note: ${cleanAssistant}\n\nReview check: explain the takeaway without looking, then apply it to a new example.`,
    knowledgeSummary: `Current learning focus: ${conceptName}. The learner should revise the core takeaway, the mechanism behind it, and one example application.`,
    conceptsLearned: [conceptName],
    risks: [],
    confidence: 0.45,
    concepts: [
      {
        name: conceptName,
        summary: `Key idea: ${cleanAssistant}\n\nApplication: turn the answer into a short explanation and one test example.`,
        mastery: 0.35,
        confidence: 0.45,
        parentConcepts: [],
        childConcepts: [],
        evidence: [userMessage.slice(0, 160)].filter(Boolean),
      },
    ],
    model: `${LEARNING_AGENT_MODEL} (local fallback)`,
  };
};

type TutorServerAppOptions = {
  serveClient?: boolean;
};

export async function createTutorServerApp(
  options: TutorServerAppOptions = {},
) {
  const app = express();

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  const uploadDir =
    process.env.TUTOR_UPLOAD_DIR ||
    (process.env.VERCEL
      ? path.join("/tmp", "tutor-uploads")
      : path.join(process.cwd(), "uploads"));
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: MAX_DOCUMENT_UPLOAD_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      const originalName = file.originalname.toLowerCase();
      const mimeType = file.mimetype.toLowerCase();
      const isPdf =
        originalName.endsWith(".pdf") &&
        [
          "application/pdf",
          "application/x-pdf",
          "application/octet-stream",
        ].includes(mimeType);
      if (!isPdf) {
        cb(new Error("Only PDF documents are supported."));
        return;
      }
      cb(null, true);
    },
  });

  const documentUpload: express.RequestHandler = (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? `Document is too large. Upload a PDF up to ${MAX_DOCUMENT_UPLOAD_MB} MB.`
            : error.message;
        res.status(status).json({ error: message });
        return;
      }

      res.status(400).json({
        error:
          error instanceof Error ? error.message : "Invalid document upload.",
      });
    });
  };

  // Log incoming requests for the Admin Server Console
  app.use((req, res, next) => {
    if (
      !req.url.startsWith("/src/") &&
      !req.url.startsWith("/node_modules/") &&
      !req.url.startsWith("/@")
    ) {
      console.log(`[HTTP] ${req.method} ${redactSensitiveUrl(req.url)}`);
    }
    next();
  });

  // WebSocket Server for Console Broadcaster
  const wssDebug = new WebSocketServer({ noServer: true });
  let debugClients: WSWebSocket[] = [];
  const logHistory: string[] = []; // Buffer to store last 100 logs

  wssDebug.on("connection", (ws) => {
    debugClients.push(ws);
    // Flush history to newly connected client
    logHistory.forEach((payload) => {
      if (ws.readyState === WSWebSocket.OPEN) ws.send(payload);
    });

    ws.on("close", () => {
      debugClients = debugClients.filter((c) => c !== ws);
    });
  });

  // Override console methods to broadcast
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const broadcastLog = (type: "log" | "error" | "warn", args: any[]) => {
    const msg = args
      .map((a) => {
        if (a instanceof Error) {
          return a.stack || a.message;
        }
        if (typeof a === "object" && a !== null) {
          try {
            return JSON.stringify(a);
          } catch (e) {
            return "[Circular object]";
          }
        }
        return String(a);
      })
      .join(" ");
    const payload = JSON.stringify({ type, timestamp: Date.now(), msg });
    logHistory.push(payload);
    if (logHistory.length > 100) logHistory.shift(); // Keep only last 100

    debugClients.forEach((c) => {
      if (c.readyState === WSWebSocket.OPEN) c.send(payload);
    });
  };

  console.log = (...args) => {
    broadcastLog("log", args);
    originalLog.apply(console, args);
  };
  console.error = (...args) => {
    broadcastLog("error", args);
    originalError.apply(console, args);
  };
  console.warn = (...args) => {
    broadcastLog("warn", args);
    originalWarn.apply(console, args);
  };

  const systemActivityEvents: SystemActivityEvent[] = [];
  const recordSystemActivity = (input: SystemActivityInput) => {
    const event: SystemActivityEvent = {
      id: activityId(),
      timestamp: Date.now(),
      ...input,
      metadata: safeActivityMetadata(input.metadata),
    };
    systemActivityEvents.unshift(event);
    if (systemActivityEvents.length > SYSTEM_ACTIVITY_LIMIT) {
      systemActivityEvents.length = SYSTEM_ACTIVITY_LIMIT;
    }
    return event;
  };
  const summarizeSystemActivity = () => {
    const byKind: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let latestError: SystemActivityEvent | null = null;

    systemActivityEvents.forEach((event) => {
      byKind[event.kind] = (byKind[event.kind] || 0) + 1;
      byStatus[event.status] = (byStatus[event.status] || 0) + 1;
      if (
        !latestError &&
        (event.kind === "error" || event.status === "failed")
      ) {
        latestError = event;
      }
    });

    return {
      total: systemActivityEvents.length,
      byKind,
      byStatus,
      latestError,
      latestEventAt: systemActivityEvents[0]?.timestamp || null,
      retentionLimit: SYSTEM_ACTIVITY_LIMIT,
    };
  };
  const debugRequestLike = (req: express.Request): RequestLike => ({
    headers: req.headers,
    socket: { remoteAddress: req.socket.remoteAddress },
    url: req.originalUrl || req.url,
  });
  const applyDebugCors = (req: express.Request, res: express.Response) => {
    const origin = firstHeader(req.headers.origin);
    if (!origin) return;

    let allowed = false;
    if (origin === "null") {
      allowed = process.env.NODE_ENV !== "production";
    } else {
      try {
        allowed = isLoopbackHost(new URL(origin).host);
      } catch {
        allowed = false;
      }
    }

    if (!allowed) return;

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Debug-Token, X-Admin-Token",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  };

  recordSystemActivity({
    kind: "system",
    status: "completed",
    title: "Local system activity ledger initialized",
    detail:
      "Admin can inspect recent local model, tool, retrieval, memory, and error events.",
    metadata: {
      runtime: process.env.VERCEL ? "vercel" : "node",
      localOnly: true,
      retentionLimit: SYSTEM_ACTIVITY_LIMIT,
    },
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "tutor-server",
      runtime: process.env.VERCEL ? "vercel" : "node",
      providers: {
        openRouter: Boolean(getOpenRouterServerFallbackKey()),
        openRouterByok: true,
        serper: Boolean(sanitizeApiKey(process.env.SERPER_API_KEY)),
        deepgram: Boolean(sanitizeApiKey(process.env.DEEPGRAM_API_KEY)),
      },
    });
  });

  app.options("/api/debug/system-activity", (req, res) => {
    applyDebugCors(req, res);
    res.status(204).end();
  });

  app.get("/api/debug/system-activity", (req, res) => {
    applyDebugCors(req, res);
    if (!isAuthorizedDebugRequest(debugRequestLike(req))) {
      return res.status(403).json({
        error:
          "Debug activity requires a trusted local request or debug token.",
      });
    }

    res.json({
      ok: true,
      service: "tutor-system-activity",
      generatedAt: new Date().toISOString(),
      localOnly: true,
      retention: {
        limit: SYSTEM_ACTIVITY_LIMIT,
        strategy: "newest-first in-memory ring buffer",
      },
      summary: summarizeSystemActivity(),
      meters: {
        providers: {
          openRouter: Boolean(getOpenRouterServerFallbackKey()),
          openRouterByok: true,
          serper: Boolean(sanitizeApiKey(process.env.SERPER_API_KEY)),
          deepgram: Boolean(sanitizeApiKey(process.env.DEEPGRAM_API_KEY)),
        },
        graph: {
          codeArchitecture: "Graphify",
          learnerBrain: "local Dexie learning book and concept records",
        },
        tuning: {
          defaultChatModel: DEFAULT_CHAT_MODEL,
          learningAgentModel: LEARNING_AGENT_MODEL,
          toolIterationLimitDefault:
            DEFAULT_BRAIN_RUNTIME_SETTINGS.toolIterationLimit,
          toolIterationLimitRange: `${BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit.min}-${BRAIN_RUNTIME_SETTING_LIMITS.toolIterationLimit.max}`,
          memoryConceptLimitDefault:
            DEFAULT_BRAIN_RUNTIME_SETTINGS.memoryConceptLimit,
          memoryConceptLimitRange: `${BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit.min}-${BRAIN_RUNTIME_SETTING_LIMITS.memoryConceptLimit.max}`,
          activityRefreshMsDefault:
            DEFAULT_BRAIN_RUNTIME_SETTINGS.activityRefreshMs,
          activityRefreshMsRange: `${BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs.min}-${BRAIN_RUNTIME_SETTING_LIMITS.activityRefreshMs.max}`,
          webSearchPolicyDefault:
            DEFAULT_BRAIN_RUNTIME_SETTINGS.webSearchPolicy,
          webSearchPolicies: WEB_SEARCH_POLICIES.join(", "),
          websocketDebugPath: "/ws/debug",
        },
      },
      events: systemActivityEvents,
    });
  });

  app.get("/api/pricing", async (_req, res) => {
    const openRouter = await fetchOpenRouterPricing();
    const fetchedAt = new Date(openRouter.fetchedAt).toISOString();
    res.json({
      fetchedAt,
      source: openRouter.stale
        ? "openrouter-cache-or-empty"
        : "openrouter-live",
      stale: openRouter.stale,
      openRouter: {
        fetchedAt,
        source: "https://openrouter.ai/api/v1/models",
        models: openRouter.models,
        stale: openRouter.stale,
      },
      deepgram: {
        fetchedAt: new Date().toISOString(),
        source: "maintained-fallback",
        pricing: DEEPGRAM_PRICING,
      },
    });
  });

  // API Route to Ingest and Classify Documents
  app.post("/api/documents/ingest", documentUpload, async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const filePath = req.file.path;
    try {
      const { execFile } = await import("child_process");
      execFile(
        "python3",
        ["scripts/classify_and_extract.py", filePath],
        { maxBuffer: 1024 * 1024 * 96, timeout: 120_000 },
        async (error, stdout, stderr) => {
          // Clean up the uploaded file
          fs.unlink(filePath, () => {});
          if (error) {
            console.error("Python Extraction Error:", stderr);
            return res
              .status(500)
              .json({ error: "Failed to process document" });
          }

          let result;
          try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : stdout;
            result = JSON.parse(jsonStr);
          } catch (e) {
            console.error("Failed to parse JSON from Python script:", stdout);
            return res
              .status(500)
              .json({ error: "Invalid response from python script" });
          }

          if (result.error) {
            return res.status(400).json({ error: result.error });
          }

          let extractedText = result.content || "";

          // If Scanned or Mixed, perform Vision Parsing on page images.
          if (
            result.classification === "Scanned" ||
            result.classification === "Mixed"
          ) {
            const apiKey = resolveOpenRouterApiKey(req.headers);

            if (apiKey && result.images && result.images.length > 0) {
              try {
                const openai = new OpenAI({
                  baseURL: "https://openrouter.ai/api/v1",
                  apiKey: apiKey,
                });

                for (const img of result.images) {
                  const response = await openai.chat.completions.create({
                    model: "qwen/qwen2.5-vl-72b-instruct",
                    messages: [
                      {
                        role: "user",
                        content: [
                          {
                            type: "text",
                            text: `Extract all readable text, diagrams, tables, and layout cues from page ${Number(img.page_num ?? 0) + 1}. Output concise markdown only from the provided source image; do not add outside facts.`,
                          },
                          {
                            type: "image_url",
                            image_url: {
                              url: `data:${img.mime_type};base64,${img.data}`,
                            },
                          },
                        ],
                      },
                    ],
                  });

                  const pageText =
                    response.choices[0]?.message?.content?.trim();
                  if (pageText) {
                    extractedText += `\n\n## OCR / Vision Page ${Number(img.page_num ?? 0) + 1}\n\n${pageText}`;
                  }
                }
              } catch (visionError) {
                console.error("Vision API Error:", visionError);
              }
            }
          }

          res.json({
            classification: result.classification,
            extractionMode: result.extraction_mode,
            totalPages: result.total_pages,
            pagesWithText: result.pages_with_text,
            renderedImagePages: result.images?.length || 0,
            content: extractedText,
          });
        },
      );
    } catch (e: any) {
      fs.unlink(filePath, () => {});
      res.status(500).json({ error: e.message });
    }
  });

  // API Route to Generate Title
  app.post("/api/title", async (req, res) => {
    try {
      const apiKey = resolveOpenRouterApiKey(req.headers);

      if (!apiKey) {
        return res.status(401).json({ error: openRouterRequiredMessage });
      }

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Image is required." });
      }

      const response = await openai.chat.completions.create({
        model: "qwen/qwen2.5-vl-72b-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Look at this page from a document. Generate a very short (2-4 words) specific topic or title for what this document is about. Output ONLY the title.",
              },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      });

      const title = response.choices[0]?.message?.content?.trim();
      res.json({ title: title || "General Study" });
    } catch (error: any) {
      console.error("Title API Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate title" });
    }
  });

  // API Route to Generate Persona
  app.post("/api/generate-persona", async (req, res) => {
    try {
      const apiKey = resolveOpenRouterApiKey(req.headers);
      if (!apiKey)
        return res.status(401).json({ error: openRouterRequiredMessage });

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      const { description } = req.body;
      if (!description)
        return res.status(400).json({ error: "Description is required." });

      const response = await openai.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet", // Use Sonnet for high-quality prompt generation
        messages: [
          {
            role: "system",
            content:
              "You are an expert prompt engineer. The user will give you a brief description of a persona for an AI Tutor. Write a highly detailed, professional System Prompt that the AI should follow to embody this persona. The prompt must require clear professional language, no emojis unless the user explicitly asks for them, concise markdown, and a tutoring style that teaches without gimmicks. The output MUST ONLY be the raw system prompt text, nothing else. No prefixes like 'Here is the prompt'.",
          },
          {
            role: "user",
            content: description,
          },
        ],
      });

      res.json({ prompt: response.choices[0]?.message?.content?.trim() });
    } catch (error: any) {
      console.error("Persona Generation Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate persona" });
    }
  });

  // API Route to Trace Action (DeepSeek via OpenRouter)
  app.post("/api/trace", async (req, res) => {
    const activityStartedAt = Date.now();
    const requestId = activityId();
    try {
      const apiKey = resolveOpenRouterApiKey(req.headers);
      if (!apiKey) {
        recordSystemActivity({
          kind: "memory",
          status: "blocked",
          title: "Trace explanation blocked",
          detail:
            "OpenRouter API key is required before a model can explain the trace.",
          requestId,
          model: LEARNING_AGENT_MODEL,
          durationMs: Date.now() - activityStartedAt,
        });
        return res.status(401).json({ error: openRouterRequiredMessage });
      }

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      const { action, payload } = req.body;
      recordSystemActivity({
        kind: "memory",
        status: "started",
        title: "Trace explanation requested",
        detail: String(action || "unknown action"),
        requestId,
        model: LEARNING_AGENT_MODEL,
        metadata: {
          action,
          payloadKeys:
            payload && typeof payload === "object"
              ? Object.keys(payload).slice(0, 12)
              : [],
        },
      });

      const response = await openai.chat.completions.create({
        model: LEARNING_AGENT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an expert system tracker tracing user actions and brain updates. The user provides a raw JSON payload of an action that just happened in the AI Tutor App. Your job is to output a single, neat, layman-readable paragraph explaining what just happened in the background.",
          },
          {
            role: "user",
            content: `Action: ${action}\nPayload: ${JSON.stringify(payload)}`,
          },
        ],
      });

      recordSystemActivity({
        kind: "memory",
        status: "completed",
        title: "Trace explanation generated",
        detail: String(action || "unknown action"),
        requestId,
        model: LEARNING_AGENT_MODEL,
        durationMs: Date.now() - activityStartedAt,
      });

      res.json({ explanation: response.choices[0]?.message?.content?.trim() });
    } catch (error: any) {
      recordSystemActivity({
        kind: "error",
        status: "failed",
        title: "Trace explanation failed",
        detail: error.message || "Failed to generate trace",
        requestId,
        model: LEARNING_AGENT_MODEL,
        durationMs: Date.now() - activityStartedAt,
      });
      console.error("Trace API Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate trace" });
    }
  });

  app.post("/api/learning-book-update", async (req, res) => {
    const activityStartedAt = Date.now();
    const requestId = activityId();
    const apiKey = resolveOpenRouterApiKey(req.headers);
    const body = req.body || {};

    if (!apiKey) {
      recordSystemActivity({
        kind: "memory",
        status: "blocked",
        title: "Learning-book update blocked",
        detail:
          "OpenRouter API key is required before the local learning book can be model-refined.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        metadata: {
          activeBookId: body.activeBookId || "",
          activeDocumentId: body.activeDocumentId || "",
          fallbackAvailable: true,
        },
        durationMs: Date.now() - activityStartedAt,
      });
      return res.status(401).json({
        error: openRouterRequiredMessage,
      });
    }

    const userMessage = String(body.userMessage || "").slice(0, 8000);
    const assistantMessage = String(body.assistantMessage || "").slice(
      0,
      12000,
    );
    if (!userMessage && !assistantMessage) {
      recordSystemActivity({
        kind: "memory",
        status: "blocked",
        title: "Learning-book update skipped",
        detail: "Conversation text was empty.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        durationMs: Date.now() - activityStartedAt,
      });
      return res.status(400).json({ error: "Conversation text is required." });
    }

    recordSystemActivity({
      kind: "memory",
      status: "started",
      title: "Learning-book update started",
      detail:
        "The local learner book agent is summarizing the completed tutor turn.",
      requestId,
      model: LEARNING_AGENT_MODEL,
      metadata: {
        activeBookId: body.activeBookId || "",
        activeDocumentId: body.activeDocumentId || "",
        documentCount: Array.isArray(body.documentContexts)
          ? body.documentContexts.length
          : 0,
        userMessageChars: userMessage.length,
        assistantMessageChars: assistantMessage.length,
      },
    });

    try {
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
      });

      const response = await openai.chat.completions.create({
        model: LEARNING_AGENT_MODEL,
        temperature: 0.15,
        messages: [
          {
            role: "system",
            content: `You are the DeepSeek V4 Flash learning-book agent for an AI tutor.
After each chat, update the learner's virtual brain.
Return ONLY valid JSON. No markdown.
Schema:
{
  "userName": "string",
  "bookTitle": "string",
  "bookSource": "chat|pdf|library|mixed",
  "overview": "stable overview of the whole session learning book",
  "chapterTitle": "short chapter title for this conversation",
  "chapterSummary": "dense study notes for this conversation: 4-8 sentences that capture definitions, mechanisms, examples, mistakes, and how to apply the idea",
  "conversationSummary": "notebook-quality learning note, not a chat recap: write the actual takeaways a learner would review later",
  "knowledgeSummary": "cumulative notes on what the learner now appears to know, including precise concept relationships",
  "conceptsLearned": ["plain names of concepts learned or practiced"],
  "risks": ["misconceptions or weak spots"],
  "confidence": 0.0,
  "concepts": [
    {
      "name": "atomic concept name",
      "summary": "what the learner discussed or learned",
      "mastery": 0.0,
      "confidence": 0.0,
      "parentConcepts": ["larger concept"],
      "childConcepts": ["subconcept"],
      "evidence": ["short evidence from conversation"]
    }
  ]
}
Maintain one learning book for the current session. Use bookTitle as the broad session title (e.g. "Python Programming"). 
CRITICAL RULES:
- You MUST dynamically generate a specific, highly relevant \`chapterTitle\` based strictly on what the user actually asked about in this message (e.g. "List Comprehensions", "Promises and Async/Await", "Calculus Integrals"). DO NOT use generic chapter titles like "Conversation Notes".
- The summaries must be substantial study notes. Avoid one-line summaries. Capture the actual learning, key distinctions, worked examples, misconceptions, and next review hooks.
- Each concept summary should be useful by itself when shown in the Revision library. Include how the concept works, not just that it was mentioned.
- If the current book already exists, prefer continuing it and adding/refining chapters. Do not invent advanced concepts absent from the conversation.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              userName: body.userName || "Learner",
              activeProject: body.activeProject || "General Study",
              currentSessionId: body.currentSessionId || "",
              activeBookId: body.activeBookId || "",
              activeDocumentId: body.activeDocumentId || "",
              conversationId: body.conversationId || "",
              documentContexts: Array.isArray(body.documentContexts)
                ? body.documentContexts.slice(0, 6)
                : [],
              currentBook: body.currentBook || null,
              recentBookTitles: body.recentBookTitles || [],
              userMessage,
              assistantMessage,
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      const parsed = extractJsonObject(content);
      recordSystemActivity({
        kind: "memory",
        status: "completed",
        title: "Learning-book update completed",
        detail: String(
          parsed.bookTitle || body.activeProject || "General Study",
        ),
        requestId,
        model: LEARNING_AGENT_MODEL,
        metadata: {
          conceptCount: Array.isArray(parsed.concepts)
            ? parsed.concepts.length
            : 0,
          riskCount: Array.isArray(parsed.risks) ? parsed.risks.length : 0,
          confidence: parsed.confidence,
        },
        durationMs: Date.now() - activityStartedAt,
      });
      res.json({
        ...parsed,
        userName: parsed.userName || body.userName || "Learner",
        bookTitle: parsed.bookTitle || body.activeProject || "General Study",
        model: LEARNING_AGENT_MODEL,
      });
    } catch (error) {
      recordSystemActivity({
        kind: "memory",
        status: "fallback",
        title: "Learning-book update used local fallback",
        detail:
          error instanceof Error
            ? error.message
            : "Model refinement failed; safe fallback JSON was returned.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        durationMs: Date.now() - activityStartedAt,
      });
      console.warn(
        "[LEARNING_BOOK] DeepSeek update failed, using safe fallback:",
        error instanceof Error ? error.message : error,
      );
      res.json(fallbackLearningUpdate(body));
    }
  });

  app.post("/api/generate-flashcards", async (req, res) => {
    const activityStartedAt = Date.now();
    const requestId = activityId();
    const apiKey = resolveOpenRouterApiKey(req.headers);
    const body = req.body || {};

    if (!apiKey) {
      recordSystemActivity({
        kind: "tool",
        status: "blocked",
        title: "Flashcard generation blocked",
        detail:
          "OpenRouter API key is required before flashcards can be model-generated.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        toolName: "generate_flashcards",
        durationMs: Date.now() - activityStartedAt,
      });
      return res.status(401).json({ error: openRouterRequiredMessage });
    }

    const content = String(body.content || "").slice(0, 8000);
    if (!content) {
      recordSystemActivity({
        kind: "tool",
        status: "blocked",
        title: "Flashcard generation skipped",
        detail: "No content was provided.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        toolName: "generate_flashcards",
        durationMs: Date.now() - activityStartedAt,
      });
      return res.status(400).json({ error: "Content is required." });
    }

    try {
      recordSystemActivity({
        kind: "tool",
        status: "started",
        title: "Flashcard generation started",
        detail:
          "The study-card tool is extracting recall cards from tutor content.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        toolName: "generate_flashcards",
        metadata: { contentChars: content.length },
      });
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
      });

      const response = await openai.chat.completions.create({
        model: LEARNING_AGENT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an AI study assistant. Extract the key educational concepts from the provided text and generate 1-3 flashcards. Return ONLY a valid JSON object matching the schema. No markdown.",
          },
          {
            role: "user",
            content: `Please generate flashcards from this text:\n\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_flashcards",
              description: "Generates study flashcards based on the text.",
              parameters: {
                type: "object",
                properties: {
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { type: "string" },
                        back: { type: "string" },
                        conceptId: {
                          type: "string",
                          description:
                            "Optional existing concept id if the source text names one clearly; otherwise omit.",
                        },
                      },
                      required: ["front", "back"],
                    },
                  },
                },
                required: ["cards"],
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "generate_flashcards" },
        },
      });

      const message = response.choices[0]?.message;
      let cards = [];
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0] as any;
        if (toolCall.function && toolCall.function.arguments) {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.cards) cards = args.cards;
        }
      } else if (message?.content) {
        try {
          const parsed = extractJsonObject(message.content);
          if (parsed.cards) cards = parsed.cards;
        } catch (e) {}
      }

      if (!Array.isArray(cards) || cards.length === 0) {
        const sentences = content
          .replace(/\s+/g, " ")
          .split(/(?<=[.!?])\s+/)
          .filter((sentence) => sentence.trim().length > 35)
          .slice(0, 3);
        cards = (sentences.length ? sentences : [content.slice(0, 280)]).map(
          (sentence, index) => ({
            front:
              index === 0
                ? "What is the core idea from this tutor answer?"
                : `What should you remember from note ${index + 1}?`,
            back: sentence.trim(),
          }),
        );
      }

      recordSystemActivity({
        kind: "tool",
        status: "completed",
        title: "Flashcard generation completed",
        detail: `${cards.length} card${cards.length === 1 ? "" : "s"} prepared.`,
        requestId,
        model: LEARNING_AGENT_MODEL,
        toolName: "generate_flashcards",
        durationMs: Date.now() - activityStartedAt,
      });
      res.json({ cards });
    } catch (error) {
      recordSystemActivity({
        kind: "tool",
        status: "fallback",
        title: "Flashcard generation used fallback",
        detail:
          error instanceof Error
            ? error.message
            : "Model card generation failed; local sentence fallback was returned.",
        requestId,
        model: LEARNING_AGENT_MODEL,
        toolName: "generate_flashcards",
        durationMs: Date.now() - activityStartedAt,
      });
      console.warn("[FLASHCARDS] Generation failed:", error);
      const sentences = content
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => sentence.trim().length > 35)
        .slice(0, 3);
      res.json({
        cards: (sentences.length ? sentences : [content.slice(0, 280)]).map(
          (sentence, index) => ({
            front:
              index === 0
                ? "What is the core idea from this tutor answer?"
                : `What should you remember from note ${index + 1}?`,
            back: sentence.trim(),
          }),
        ),
        fallback: true,
      });
    }
  });

  // API Route for chat TTS
  app.get("/api/tts", async (req, res) => {
    try {
      console.log(`[TTS] Request received for speech generation`);

      const text = req.query.text as string;
      if (!text) {
        return res.status(400).json({ error: "Text is required." });
      }
      const requestedVoice =
        typeof req.query.voice === "string"
          ? req.query.voice
          : "gpt-4o-mini-tts";
      const ttsModel =
        requestedVoice === "gpt-4o-mini-tts"
          ? requestedVoice
          : /^aura-[a-z0-9-]+-en$/i.test(requestedVoice)
            ? requestedVoice
            : "aura-asteria-en";
      const billedText = text.slice(0, 4000);
      const inputCharacters = billedText.length;
      const estimatedCost = ttsCostForModel(ttsModel, inputCharacters);

      if (ttsModel === "gpt-4o-mini-tts") {
        try {
          const openaiKey = sanitizeApiKey(process.env.OPENAI_API_KEY);
          if (!openaiKey) throw new Error("OpenAI API Key is missing");
          const openai = new OpenAI({
            apiKey: openaiKey,
          });
          const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: billedText,
          });
          const buffer = Buffer.from(await mp3.arrayBuffer());
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("X-Usage-Provider", "openai");
          res.setHeader("X-Usage-Model", "gpt-4o-mini-tts");
          res.setHeader("X-Usage-Unit", "characters");
          res.setHeader("X-Usage-Input-Chars", String(inputCharacters));
          res.setHeader("X-Usage-Cost", String(estimatedCost));
          res.setHeader("X-Usage-Estimated", "false");
          res.send(buffer);
          return;
        } catch (openaiErr) {
          console.warn(
            "[TTS] OpenAI TTS failed, falling back to Deepgram default:",
            openaiErr,
          );
        }
      }

      const ttsModelForDeepgram =
        ttsModel === "gpt-4o-mini-tts" ? "aura-asteria-en" : ttsModel;
      const deepgramKey =
        deepgramKeyFromRequest(req) || process.env.DEEPGRAM_API_KEY;
      if (!deepgramKey) throw new Error("Deepgram API Key is missing");

      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${ttsModelForDeepgram}&encoding=mp3`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${deepgramKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: billedText,
          }),
        },
      );

      console.log(`[TTS] Deepgram response status: ${response.status}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`TTS error ${response.status}: ${JSON.stringify(err)}`);
      }

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("X-Usage-Provider", "deepgram");
      res.setHeader("X-Usage-Model", ttsModel);
      res.setHeader("X-Usage-Unit", "characters");
      res.setHeader("X-Usage-Input-Chars", String(inputCharacters));
      res.setHeader("X-Usage-Cost", String(estimatedCost));
      res.setHeader("X-Usage-Estimated", "false");

      const body = response.body as any;
      if (body && typeof body.pipe === "function") {
        body.pipe(res);
      } else if (body && body.getReader) {
        try {
          for await (const chunk of body) {
            if (res.writableEnded) break;
            res.write(chunk);
          }
        } catch (e) {
          console.warn("[TTS] Client stream disconnected during write.");
        }
        if (!res.writableEnded) res.end();
      } else {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.send(buffer);
      }
    } catch (error: any) {
      console.error("TTS API Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate audio" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const activityStartedAt = Date.now();
    const requestId = activityId();
    let requestedModelForRun = DEFAULT_CHAT_MODEL;
    let usedModelForRun = DEFAULT_CHAT_MODEL;
    let runtimeSettingsForRun: Record<string, string | number> | undefined;
    // Enable SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, requestId, ...data })}\n\n`);
    };
    const compactToolText = (value: unknown, fallback: string) => {
      const text =
        typeof value === "string"
          ? value
          : value === undefined || value === null
            ? ""
            : JSON.stringify(value);
      return (text || fallback).replace(/\s+/g, " ").trim().slice(0, 320);
    };
    const summarizeToolArguments = (toolName: string, rawArguments: string) => {
      try {
        const args = JSON.parse(rawArguments || "{}");
        if (toolName === "web_search") {
          return compactToolText(args.query, "web_search requested");
        }
        if (toolName === "look_at_current_page") {
          return compactToolText(args.query, "current page inspection");
        }
        if (toolName === "update_graph") {
          return compactToolText(args.name, "learning graph update");
        }
        if (toolName === "generate_flashcards") {
          const cardCount = Array.isArray(args.cards) ? args.cards.length : 0;
          return `${cardCount} flashcard${cardCount === 1 ? "" : "s"} requested`;
        }
      } catch {
        return "Tool arguments could not be parsed.";
      }
      return compactToolText(rawArguments, `${toolName || "tool"} requested`);
    };
    const sendToolJobEvent = (data: {
      status: "running" | "completed" | "failed" | "blocked";
      toolName: string;
      inputSummary?: string;
      outputSummary?: string;
      error?: string;
      model?: string;
      durationMs?: number;
      metadata?: Record<string, unknown>;
    }) => {
      sendEvent("tool_job", {
        timestamp: Date.now(),
        source: "chat_stream",
        ...data,
        metadata: safeActivityMetadata(data.metadata || {}),
      });
    };
    const sendModelRunEvent = (data: {
      status: "started" | "completed" | "failed" | "blocked" | "fallback";
      requestedModel?: string;
      usedModel?: string;
      inputTokens?: number;
      outputTokens?: number;
      cost?: number;
      estimated?: boolean;
      durationMs?: number;
      memoryContextChars?: number;
      sourceMaterialRequest?: boolean;
      requestedWebSearch?: boolean;
      webSources?: number;
      graphUpdates?: number;
      flashcards?: number;
      iterations?: number;
      error?: string;
      runtimeSettings?: Record<string, string | number>;
      metadata?: Record<string, unknown>;
    }) => {
      sendEvent("model_run", {
        id: `model-run:chat_stream:${requestId}`,
        timestamp: Date.now(),
        provider: "openrouter",
        source: "chat_stream",
        ...data,
        metadata: safeActivityMetadata(data.metadata || {}),
      });
    };

    try {
      const apiKey = resolveOpenRouterApiKey(req.headers);
      const {
        messages,
        currentPageImage,
        memoryContext,
        aiModel,
        customPrompt,
        runtimeSettings: rawRuntimeSettings,
        webSearchExplicit,
        serperApiKey: bodySerperKey,
        language,
      } = req.body;
      const runtimeSettings = normalizeBrainRuntimeSettings(rawRuntimeSettings);
      const runtimeSettingsSnapshot = compactRuntimeSettings(runtimeSettings);
      runtimeSettingsForRun = runtimeSettingsSnapshot;
      const serperRuntimeKey =
        sanitizeApiKey(req.headers["x-serper-api-key"]) ||
        sanitizeApiKey(bodySerperKey) ||
        sanitizeApiKey(process.env.SERPER_API_KEY);
      const requestedModel =
        aiModel === "deepseek/deepseek-chat"
          ? DEFAULT_CHAT_MODEL
          : aiModel || DEFAULT_CHAT_MODEL;
      requestedModelForRun = requestedModel;
      usedModelForRun = requestedModel;

      if (!apiKey) {
        recordSystemActivity({
          kind: "model",
          status: "blocked",
          title: "Chat request blocked",
          detail:
            "OpenRouter API key is required before the tutor can call a model.",
          requestId,
          durationMs: Date.now() - activityStartedAt,
          metadata: {
            messageCount: Array.isArray(messages) ? messages.length : 0,
            aiModel: aiModel || DEFAULT_CHAT_MODEL,
            runtimeSettings: runtimeSettingsSnapshot,
          },
        });
        sendModelRunEvent({
          status: "blocked",
          requestedModel,
          usedModel: requestedModel,
          durationMs: Date.now() - activityStartedAt,
          error: openRouterRequiredMessage,
          runtimeSettings: runtimeSettingsSnapshot,
          metadata: {
            messageCount: Array.isArray(messages) ? messages.length : 0,
          },
        });
        sendEvent("error", {
          error: openRouterRequiredMessage,
        });
        return res.end();
      }

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      let usedModelForUsage = requestedModel;
      let inputTokens = 0;
      let outputTokens = 0;
      let usageEstimated = true;
      let webSources: NormalizedWebSource[] = [];
      const latestUserContent =
        [...(messages || [])].reverse().find((m: any) => m?.role === "user")
          ?.content || "";
      recordSystemActivity({
        kind: "model",
        status: "started",
        title: "Chat request started",
        detail: "Tutor is preparing local context and model streaming.",
        requestId,
        model: requestedModel,
        phase: "request",
        metadata: {
          messageCount: Array.isArray(messages) ? messages.length : 0,
          memoryContextChars:
            typeof memoryContext === "string" ? memoryContext.length : 0,
          hasCurrentPageImage: Boolean(currentPageImage),
          language: language || "en",
          runtimeSettings: runtimeSettingsSnapshot,
        },
      });
      const sourceMaterialRequest =
        /\b(current|this|the)\s+(page|screen|document|pdf|chapter|section|slide|image|diagram|chart|figure)\b/i.test(
          latestUserContent,
        ) ||
        /\b(what'?s|what is|explain|summari[sz]e|describe)\s+(this|the)\b/i.test(
          latestUserContent,
        ) ||
        /\b(on the screen|visible|shown|source material|uploaded document|reading)\b/i.test(
          latestUserContent,
        );
      const explicitWebSearch = Boolean(webSearchExplicit);
      const automaticFreshnessSearch =
        runtimeSettings.webSearchPolicy === "manual_only"
          ? null
          : detectFreshnessSearch(latestUserContent);
      const freshnessSearch = explicitWebSearch
        ? searchDetectionForExplicitRequest(latestUserContent)
        : automaticFreshnessSearch;
      const requestedWebSearch = Boolean(freshnessSearch);
      sendModelRunEvent({
        status: "started",
        requestedModel,
        usedModel: requestedModel,
        memoryContextChars:
          typeof memoryContext === "string" ? memoryContext.length : 0,
        sourceMaterialRequest,
        requestedWebSearch,
        runtimeSettings: runtimeSettingsSnapshot,
        metadata: {
          messageCount: Array.isArray(messages) ? messages.length : 0,
          hasCurrentPageImage: Boolean(currentPageImage),
          language: language || "en",
        },
      });
      if (memoryContext) {
        recordSystemActivity({
          kind: "retrieval",
          status: "completed",
          title: "Local memory context attached",
          detail:
            "Tutor request includes local book, selected text, document, or interaction context.",
          requestId,
          phase: "context",
          metadata: {
            memoryContextChars:
              typeof memoryContext === "string" ? memoryContext.length : 0,
            sourceMaterialRequest,
            explicitWebSearch,
            requestedWebSearch,
            runtimeSettings: runtimeSettingsSnapshot,
          },
        });
      }
      const mergeWebSources = (sources: NormalizedWebSource[]) => {
        const byUrl = new Map(webSources.map((source) => [source.url, source]));
        sources.forEach((source) => byUrl.set(source.url, source));
        webSources = [...byUrl.values()].slice(0, 10);
        return sources;
      };
      const runWebSearch = async (
        query: string,
        mode: WebSearchMode = "search",
        maxResults = 6,
      ) => {
        const searchStartedAt = Date.now();
        const searchId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        recordSystemActivity({
          kind: "web",
          status: "started",
          title: "Web search started",
          detail: query,
          requestId,
          toolName: "web_search",
          phase: "web_search",
          metadata: { searchId, mode, maxResults },
        });
        sendEvent("status", { phase: "web_search" });
        sendEvent("web_search_started", { searchId, query, mode });
        sendEvent("web_search_progress", {
          searchId,
          status: "Searching web...",
        });
        try {
          const sources = await searchSerper({
            query,
            mode,
            maxResults,
            apiKey: serperRuntimeKey || undefined,
          });
          sendEvent("web_search_progress", {
            searchId,
            status: sources.length
              ? "Reviewing sources..."
              : "No recent sources found.",
          });
          sources.forEach((source) =>
            sendEvent("web_result", { searchId, source }),
          );
          mergeWebSources(sources);
          recordSystemActivity({
            kind: "web",
            status: "completed",
            title: "Web search completed",
            detail: `${sources.length} source${sources.length === 1 ? "" : "s"} returned.`,
            requestId,
            toolName: "web_search",
            phase: "web_search",
            durationMs: Date.now() - searchStartedAt,
            metadata: {
              searchId,
              mode,
              sourceCount: sources.length,
              domains: sources.map((source) => source.domain).slice(0, 8),
            },
          });
          sendEvent("web_sources_complete", { searchId, sources });
          sendEvent("reasoning_summary", {
            content: sources.length
              ? `Reviewing ${sources.length} recent ${mode === "news" ? "news" : "web"} sources`
              : "No web sources were returned; continuing from internal context",
          });
          return sources;
        } catch (error) {
          console.warn(
            "[WEB_SEARCH] Search unavailable:",
            error instanceof Error ? error.message : error,
          );
          sendEvent("info", {
            message:
              "Search temporarily unavailable — continuing with internal knowledge.",
          });
          sendEvent("web_sources_complete", {
            searchId,
            sources: [],
            error: "Search temporarily unavailable",
          });
          recordSystemActivity({
            kind: "web",
            status: "failed",
            title: "Web search unavailable",
            detail:
              error instanceof Error
                ? error.message
                : "Search temporarily unavailable",
            requestId,
            toolName: "web_search",
            phase: "web_search",
            durationMs: Date.now() - searchStartedAt,
            metadata: { searchId, mode },
          });
          sendEvent("reasoning_summary", {
            content:
              "Web search was unavailable, so I am continuing with internal knowledge",
          });
          return [];
        }
      };

      let systemInstruction = `You are a high-level modern AI tutor specialized in computer science, programming, and textbook concepts. 
Your goal is to teach concepts precisely and accurately with proper explanations. 
When asked about concepts, act as a conversational pair programmer and educator.
Format your responses beautifully using markdown, bold emphasis for keywords, and clear, structured explanations. Avoid unnecessary prefixing or fluff, get straight to the point.
Break down complex subjects into mental models and use analogies where appropriate.
Keep the tone professional and do not use emojis unless the user explicitly asks for them.

IMPORTANT TOOL USAGE INSTRUCTIONS:
1. If the user asks questions about "the current page", "this chapter", "the document", "the screen", or asks you to explain something visible in what they are reading, use the provided screenshot context when present. If you need an additional page inspection and the \`look_at_current_page\` tool is available, call it. Do NOT claim you cannot see the screen when screenshot context is attached.
2. If the user requests flashcards, active recall questions, or revision cards, YOU MUST forcefully use the \`generate_flashcards\` tool to create them. NEVER simply write out the flashcards in text. ALWAYS use the tool. Start your message slightly confirming you generated them and suggest they navigate to the Revision tab.
3. Source-material questions come first. If the user asks "what is this about", "what's on the screen", "what is this page about", "explain this page", "summarize this document", or similar reading-context questions, answer from selected text, active library context, and the page image via \`look_at_current_page\` when available. Do not use \`web_search\` for these questions unless the user explicitly asks to search the web.
4. Use \`web_search\` only when the user explicitly asks for web/internet/online search, or when the answer depends on fresh external facts such as latest/current/recent news, rankings, pricing, releases, trends, sports scores, elections, weather, laws, schedules, or named people/company roles. When using web sources, cite freshness-sensitive claims with compact references like [1] and [2]. Do not dump raw URLs in the answer body.`;

      if (customPrompt) {
        systemInstruction = `${customPrompt}\n\n${systemInstruction}`;
      }

      systemInstruction += `\n\nADMIN RUNTIME TUNING:
- Web search policy: ${runtimeSettings.webSearchPolicy}
- Tool iteration budget: ${runtimeSettings.toolIterationLimit}
- Memory concept budget supplied by client: ${runtimeSettings.memoryConceptLimit}`;

      if (
        runtimeSettings.webSearchPolicy === "manual_only" &&
        !explicitWebSearch
      ) {
        systemInstruction +=
          "\n- Web search is manual-only for this turn. Do not call web_search unless the user explicitly selected the Web Search skill.";
      } else if (runtimeSettings.webSearchPolicy === "source_first") {
        systemInstruction +=
          "\n- Prefer local source material and memory context before any web retrieval. Source-material questions must stay local unless web search was explicitly selected.";
      }

      if (memoryContext) {
        systemInstruction += `\n\n${memoryContext}`;
      }

      if (currentPageImage && sourceMaterialRequest) {
        systemInstruction += `\n\nCURRENT PAGE IMAGE IS ATTACHED THROUGH THE look_at_current_page TOOL. For this source-material request, call look_at_current_page before answering and answer from the page image plus selected/library context. Do not use web_search unless the user explicitly asks for web search.`;
      }

      if (language === "ja") {
        systemInstruction += `\n\nCRITICAL LANGUAGE REQUIREMENT: You must think, reason, and respond natively in Japanese (日本語). Ensure all educational explanations, conceptual analogies, and technical feedback are phrased naturally in fluent Japanese. Keep the professional academic tone with no emojis.`;
      } else if (language === "ko") {
        systemInstruction += `\n\nCRITICAL LANGUAGE REQUIREMENT: You must think, reason, and respond natively in Korean (한국어). Ensure all educational explanations, conceptual analogies, and technical feedback are phrased naturally in fluent Korean. Keep the professional academic tone with no emojis.`;
      }

      // Eager vision prefetch removed. Vision tool look_at_current_page is registered if currentPageImage is present.

      if (freshnessSearch) {
        sendEvent("reasoning_summary", {
          content: "Detecting freshness requirement",
        });
        const sources = await runWebSearch(
          freshnessSearch.query,
          freshnessSearch.mode,
          6,
        );
        if (sources.length > 0) {
          systemInstruction += `\n\nLIVE WEB SOURCES:\n${formatSourcesForPrompt(sources)}\n\nUse these sources for current factual claims and cite them with bracketed source numbers.`;
        }
      }

      const formattedMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const tools: any = [
        {
          type: "function",
          function: {
            name: "update_graph",
            description:
              "Updates the learning knowledge graph with a new key concept. Ensure the 'name' contains ONLY the exact, atomic key concept (no unwanted words, no full sentences).",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description:
                    "The name of the key concept. Keep it extremely concise (e.g., 'Monkey Patching', 'V8 Engine').",
                },
                description: {
                  type: "string",
                  description: "A short, accurate description of the concept.",
                },
                understandingDelta: {
                  type: "number",
                  description:
                    "A value from -0.2 to 0.2 representing the change in the user's understanding of this concept based on the conversation.",
                },
              },
              required: ["name", "description", "understandingDelta"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "generate_flashcards",
            description:
              "Generates study flashcards based on the current discussion.",
            parameters: {
              type: "object",
              properties: {
                cards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      front: {
                        type: "string",
                        description:
                          "Front side of the flashcard (the question or concept)",
                      },
                      back: {
                        type: "string",
                        description:
                          "Back side of the flashcard (the answer or explanation)",
                      },
                      conceptId: {
                        type: "string",
                        description:
                          "Optional existing concept id when the card clearly maps to a known concept; otherwise omit.",
                      },
                    },
                    required: ["front", "back"],
                  },
                },
              },
              required: ["cards"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the live web only when the user explicitly asks for web/internet/online search or needs fresh external facts. Do not use for current page, screen, document, PDF, selected text, uploaded source material, or active library questions.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The concise web search query.",
                },
                mode: {
                  type: "string",
                  enum: ["search", "news"],
                  description:
                    "Use news for current events/headlines; use search for general web retrieval.",
                },
                maxResults: {
                  type: "number",
                  description: "Number of sources to retrieve, from 1 to 10.",
                },
              },
              required: ["query"],
            },
          },
        },
      ];

      if (currentPageImage) {
        tools.push({
          type: "function",
          function: {
            name: "look_at_current_page",
            description:
              "Look at the current PDF page the user is viewing and extract information, explain concepts, or answer questions based on its visual content.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description:
                    "Specific question or analysis request about the page to ask the vision model.",
                },
              },
              required: ["query"],
            },
          },
        });
      }

      // Eager vision pre-fetch removed to drastically improve latency.
      // The AI can still use the 'look_at_current_page' tool if it needs to see the document.

      let graphUpdates: any[] = [];
      let flashcardsUpdates: any[] = [];

      let iterations = 0;
      const MAX_ITERATIONS = runtimeSettings.toolIterationLimit;
      let finalContent = "";

      // Model fallback chain: try primary, then fallbacks on failure
      const FALLBACK_MODELS = [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "openai/gpt-4o-mini",
        "meta-llama/llama-4-maverick",
      ];

      while (iterations < MAX_ITERATIONS) {
        if (iterations === 0) sendEvent("status", { phase: "thinking" });
        const primaryModel = requestedModel;
        const modelsToTry = [
          primaryModel,
          ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
        ];
        let stream: any = null;
        let usedModel = primaryModel;

        for (const model of modelsToTry) {
          try {
            recordSystemActivity({
              kind: "model",
              status: "progress",
              title: "Opening model stream",
              detail: model,
              requestId,
              model,
              phase: iterations === 0 ? "thinking" : "tool_followup",
              metadata: {
                attempt: modelsToTry.indexOf(model) + 1,
                iteration: iterations + 1,
                toolCount: tools.length,
              },
            });
            stream = await openai.chat.completions.create({
              model: model,
              messages: formattedMessages as any,
              tools: tools,
              stream: true,
              stream_options: { include_usage: true } as any,
            } as any);
            usedModel = model;
            usedModelForUsage = model;
            usedModelForRun = model;
            if (iterations === 0 && model !== primaryModel) {
              recordSystemActivity({
                kind: "model",
                status: "fallback",
                title: "Chat model fallback selected",
                detail: `${primaryModel} unavailable; streaming with ${model}.`,
                requestId,
                model,
                phase: "model_fallback",
                metadata: { requestedModel: primaryModel, usedModel: model },
              });
              console.log(
                `[CHAT] Primary model "${primaryModel}" unavailable, fell back to "${model}"`,
              );
              sendEvent("info", {
                message: `Model ${primaryModel} unavailable — using ${model}`,
              });
              sendModelRunEvent({
                status: "fallback",
                requestedModel: primaryModel,
                usedModel: model,
                durationMs: Date.now() - activityStartedAt,
                runtimeSettings: runtimeSettingsSnapshot,
                metadata: {
                  iteration: iterations + 1,
                  fallbackChain: modelsToTry,
                },
              });
            }
            break; // Success — use this stream
          } catch (modelErr: any) {
            const status = modelErr?.status || modelErr?.code;
            const isRetryable = [401, 402, 403, 429, 500, 502, 503].includes(
              status,
            );
            console.warn(
              `[CHAT] Model "${model}" failed (${status}): ${modelErr.message}`,
            );
            recordSystemActivity({
              kind: "model",
              status:
                isRetryable && model !== modelsToTry[modelsToTry.length - 1]
                  ? "fallback"
                  : "failed",
              title: "Model stream attempt failed",
              detail: modelErr.message || String(status || "unknown failure"),
              requestId,
              model,
              phase: "model_attempt",
              metadata: {
                status,
                retryable: isRetryable,
                attempt: modelsToTry.indexOf(model) + 1,
              },
            });
            if (!isRetryable || model === modelsToTry[modelsToTry.length - 1]) {
              // Not retryable OR last model — rethrow
              throw modelErr;
            }
            // Otherwise, try next model in fallback chain
          }
        }

        if (!stream)
          throw new Error(
            "All models failed. Please check your API key and try again.",
          );

        let isToolCall = false;
        let currentToolCalls: any[] = [];
        let assistantContent = "";

        for await (const chunk of stream) {
          const usage = (chunk as any).usage;
          if (usage) {
            inputTokens += Number(
              usage.prompt_tokens ?? usage.input_tokens ?? 0,
            );
            outputTokens += Number(
              usage.completion_tokens ?? usage.output_tokens ?? 0,
            );
            usageEstimated = false;
          }
          const delta = chunk.choices?.[0]?.delta;

          if (delta?.tool_calls) {
            isToolCall = true;
            for (const tc of delta.tool_calls) {
              if (!currentToolCalls[tc.index]) {
                currentToolCalls[tc.index] = {
                  id: tc.id || `call_${Date.now()}_${tc.index}`,
                  type: "function",
                  function: { name: tc.function?.name || "", arguments: "" },
                };
              }
              if (
                tc.function?.name &&
                !currentToolCalls[tc.index].function.name
              ) {
                currentToolCalls[tc.index].function.name = tc.function.name;
              }
              if (tc.function?.arguments) {
                currentToolCalls[tc.index].function.arguments +=
                  tc.function.arguments;
              }
            }
          }

          if (delta?.content) {
            assistantContent += delta.content;
            finalContent += delta.content;
            sendEvent("chunk", { content: delta.content });
          }
        }

        if (!isToolCall) {
          break; // Done!
        }

        // We have tool calls
        sendEvent("status", { phase: "tool_execution" });
        const validToolCalls = currentToolCalls.filter(Boolean);
        recordSystemActivity({
          kind: "tool",
          status: "started",
          title: "Tool execution requested",
          detail: validToolCalls
            .map((tool) => tool.function.name)
            .filter(Boolean)
            .join(", "),
          requestId,
          phase: "tool_execution",
          metadata: {
            toolCount: validToolCalls.length,
            iteration: iterations + 1,
            toolNames: validToolCalls
              .map((tool) => tool.function.name)
              .filter(Boolean),
          },
        });
        validToolCalls.forEach((t) => {
          sendEvent("reasoning_summary", {
            content: `Using tool: ${t.function.name}`,
          });
        });

        formattedMessages.push({
          role: "assistant",
          content: assistantContent || null,
          tool_calls: validToolCalls,
        });

        for (const toolCall of validToolCalls) {
          const toolStartedAt = Date.now();
          const functionName = toolCall.function.name;
          const functionArguments = toolCall.function.arguments;
          const inputSummary = summarizeToolArguments(
            functionName,
            functionArguments,
          );
          sendToolJobEvent({
            status: "running",
            toolName: functionName,
            inputSummary,
            metadata: {
              toolCallId: toolCall.id,
              iteration: iterations + 1,
            },
          });

          if (functionName === "look_at_current_page" && currentPageImage) {
            try {
              sendEvent("reasoning_summary", {
                content: "Looking at current page",
              });
              const args = JSON.parse(functionArguments);
              const visionResponse = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: args.query || "Describe this page.",
                      },
                      {
                        type: "image_url",
                        image_url: { url: currentPageImage },
                      },
                    ],
                  },
                ],
              });
              const visionText =
                visionResponse.choices[0]?.message?.content ||
                "Empty response from vision model.";
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: visionText,
              });
              recordSystemActivity({
                kind: "tool",
                status: "completed",
                title: "Current page vision completed",
                detail: "The tutor inspected the current PDF page image.",
                requestId,
                model: "openai/gpt-4o-mini",
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
              });
              sendToolJobEvent({
                status: "completed",
                toolName: functionName,
                inputSummary,
                outputSummary:
                  "The tutor inspected the current PDF page image.",
                model: "openai/gpt-4o-mini",
                durationMs: Date.now() - toolStartedAt,
                metadata: { toolCallId: toolCall.id },
              });
            } catch (err: any) {
              console.error("Vision Error:", err);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error: Could not analyze the page image.",
              });
              recordSystemActivity({
                kind: "tool",
                status: "failed",
                title: "Current page vision failed",
                detail: err.message || "Could not analyze the page image.",
                requestId,
                model: "openai/gpt-4o-mini",
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
              });
              sendToolJobEvent({
                status: "failed",
                toolName: functionName,
                inputSummary,
                error: err.message || "Could not analyze the page image.",
                model: "openai/gpt-4o-mini",
                durationMs: Date.now() - toolStartedAt,
                metadata: { toolCallId: toolCall.id },
              });
            }
          } else if (functionName === "web_search") {
            try {
              if (!requestedWebSearch) {
                const blockReason =
                  runtimeSettings.webSearchPolicy === "manual_only"
                    ? "Admin runtime tuning is set to manual web search only."
                    : "The turn looked source-local, so Tutor stayed with selected text, page, memory, and document context.";
                formattedMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content:
                    "Web search denied for this turn. Answer from the provided source material, selected text, memory context, and page image if available.",
                });
                recordSystemActivity({
                  kind: "tool",
                  status: "blocked",
                  title: "Web search denied",
                  detail: blockReason,
                  requestId,
                  toolName: functionName,
                  phase: "tool_execution",
                  durationMs: Date.now() - toolStartedAt,
                  metadata: {
                    runtimeSettings: runtimeSettingsSnapshot,
                    explicitWebSearch,
                  },
                });
                sendToolJobEvent({
                  status: "blocked",
                  toolName: functionName,
                  inputSummary,
                  outputSummary: blockReason,
                  durationMs: Date.now() - toolStartedAt,
                  metadata: {
                    toolCallId: toolCall.id,
                    runtimeSettings: runtimeSettingsSnapshot,
                  },
                });
                continue;
              }
              sendEvent("reasoning_summary", {
                content: "Searching live web sources",
              });
              const args = JSON.parse(functionArguments || "{}");
              const query = String(
                args.query || latestUserContent || "",
              ).trim();
              const requestedMode = args.mode === "news" ? "news" : "search";
              const maxResults = Number.isFinite(Number(args.maxResults))
                ? Number(args.maxResults)
                : 6;
              const sources = query
                ? await runWebSearch(query, requestedMode, maxResults)
                : [];
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: formatSourcesForPrompt(sources),
              });
              recordSystemActivity({
                kind: "tool",
                status: "completed",
                title: "Web search tool completed",
                detail: `${sources.length} source${sources.length === 1 ? "" : "s"} supplied to the model.`,
                requestId,
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
                metadata: { query, sourceCount: sources.length },
              });
              sendToolJobEvent({
                status: "completed",
                toolName: functionName,
                inputSummary,
                outputSummary: `${sources.length} source${sources.length === 1 ? "" : "s"} supplied to the model.`,
                durationMs: Date.now() - toolStartedAt,
                metadata: {
                  toolCallId: toolCall.id,
                  sourceCount: sources.length,
                },
              });
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Search temporarily unavailable.",
              });
              recordSystemActivity({
                kind: "tool",
                status: "failed",
                title: "Web search tool failed",
                detail:
                  e instanceof Error
                    ? e.message
                    : "Search temporarily unavailable.",
                requestId,
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
              });
              sendToolJobEvent({
                status: "failed",
                toolName: functionName,
                inputSummary,
                error:
                  e instanceof Error
                    ? e.message
                    : "Search temporarily unavailable.",
                durationMs: Date.now() - toolStartedAt,
                metadata: { toolCallId: toolCall.id },
              });
            }
          } else if (functionName === "update_graph") {
            try {
              sendEvent("reasoning_summary", {
                content: "Updating learning knowledge graph",
              });
              const args = JSON.parse(functionArguments);
              graphUpdates.push(args);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Graph updated successfully.",
              });
              recordSystemActivity({
                kind: "memory",
                status: "completed",
                title: "Learning graph tool staged update",
                detail: args.name || "update_graph",
                requestId,
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
                metadata: {
                  understandingDelta: args.understandingDelta,
                  hasDescription: Boolean(args.description),
                },
              });
              sendToolJobEvent({
                status: "completed",
                toolName: functionName,
                inputSummary,
                outputSummary: args.name || "Learning graph update staged.",
                durationMs: Date.now() - toolStartedAt,
                metadata: {
                  toolCallId: toolCall.id,
                  understandingDelta: args.understandingDelta,
                  hasDescription: Boolean(args.description),
                },
              });
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error parsing arguments.",
              });
              recordSystemActivity({
                kind: "memory",
                status: "failed",
                title: "Learning graph tool parse failed",
                detail:
                  e instanceof Error ? e.message : "Error parsing arguments.",
                requestId,
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
              });
              sendToolJobEvent({
                status: "failed",
                toolName: functionName,
                inputSummary,
                error:
                  e instanceof Error ? e.message : "Error parsing arguments.",
                durationMs: Date.now() - toolStartedAt,
                metadata: { toolCallId: toolCall.id },
              });
            }
          } else if (functionName === "generate_flashcards") {
            try {
              sendEvent("reasoning_summary", {
                content: "Generating flashcards",
              });
              const args = JSON.parse(functionArguments);
              if (args && args.cards) flashcardsUpdates.push(...args.cards);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Flashcards created successfully.",
              });
              recordSystemActivity({
                kind: "tool",
                status: "completed",
                title: "Flashcards tool staged cards",
                detail: `${Array.isArray(args?.cards) ? args.cards.length : 0} card${Array.isArray(args?.cards) && args.cards.length === 1 ? "" : "s"} prepared.`,
                requestId,
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
              });
              sendToolJobEvent({
                status: "completed",
                toolName: functionName,
                inputSummary,
                outputSummary: `${Array.isArray(args?.cards) ? args.cards.length : 0} card${Array.isArray(args?.cards) && args.cards.length === 1 ? "" : "s"} prepared.`,
                durationMs: Date.now() - toolStartedAt,
                metadata: {
                  toolCallId: toolCall.id,
                  cardCount: Array.isArray(args?.cards) ? args.cards.length : 0,
                },
              });
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error parsing arguments.",
              });
              recordSystemActivity({
                kind: "tool",
                status: "failed",
                title: "Flashcards tool parse failed",
                detail:
                  e instanceof Error ? e.message : "Error parsing arguments.",
                requestId,
                toolName: functionName,
                phase: "tool_execution",
                durationMs: Date.now() - toolStartedAt,
              });
              sendToolJobEvent({
                status: "failed",
                toolName: functionName,
                inputSummary,
                error:
                  e instanceof Error ? e.message : "Error parsing arguments.",
                durationMs: Date.now() - toolStartedAt,
                metadata: { toolCallId: toolCall.id },
              });
            }
          } else {
            formattedMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Unsupported tool.",
            });
            recordSystemActivity({
              kind: "tool",
              status: "blocked",
              title: "Unsupported tool blocked",
              detail: functionName || "unknown tool",
              requestId,
              toolName: functionName,
              phase: "tool_execution",
              durationMs: Date.now() - toolStartedAt,
            });
            sendToolJobEvent({
              status: "blocked",
              toolName: functionName,
              inputSummary,
              error: "Unsupported tool.",
              durationMs: Date.now() - toolStartedAt,
              metadata: { toolCallId: toolCall.id },
            });
          }
        }
        iterations++;
        if (iterations < MAX_ITERATIONS && validToolCalls.length > 0) {
          sendEvent("status", { phase: "synthesizing" });
        }
      }

      if (inputTokens === 0 && outputTokens === 0) {
        inputTokens = estimateTokensFromText(formattedMessages);
        outputTokens = estimateTokensFromText(finalContent);
        usageEstimated = true;
      }
      const pricing = await fetchOpenRouterPricing();
      const cost = openRouterCost(
        pricing.models,
        usedModelForUsage,
        inputTokens,
        outputTokens,
      );

      sendEvent("status", { phase: "streaming" });
      sendModelRunEvent({
        status: "completed",
        requestedModel,
        usedModel: usedModelForUsage,
        inputTokens,
        outputTokens,
        cost,
        estimated: usageEstimated || cost === 0,
        durationMs: Date.now() - activityStartedAt,
        memoryContextChars:
          typeof memoryContext === "string" ? memoryContext.length : 0,
        sourceMaterialRequest,
        requestedWebSearch,
        webSources: webSources.length,
        graphUpdates: graphUpdates.length,
        flashcards: flashcardsUpdates.length,
        iterations: iterations + 1,
        runtimeSettings: runtimeSettingsSnapshot,
      });
      recordSystemActivity({
        kind: "model",
        status: "completed",
        title: "Chat request completed",
        detail: `${outputTokens} output token${outputTokens === 1 ? "" : "s"} from ${usedModelForUsage}.`,
        requestId,
        model: usedModelForUsage,
        phase: "complete",
        durationMs: Date.now() - activityStartedAt,
        metadata: {
          requestedModel,
          usedModel: usedModelForUsage,
          inputTokens,
          outputTokens,
          cost,
          estimated: usageEstimated || cost === 0,
          graphUpdates: graphUpdates.length,
          flashcards: flashcardsUpdates.length,
          webSources: webSources.length,
          iterations: iterations + 1,
          runtimeSettings: runtimeSettingsSnapshot,
        },
      });
      sendEvent("done", {
        content: finalContent,
        graphUpdates,
        flashcardsUpdates,
        sources: webSources,
        usage: {
          provider: "openrouter",
          requestedModel,
          usedModel: usedModelForUsage,
          inputTokens,
          outputTokens,
          estimated: usageEstimated || cost === 0,
          cost,
          pricingSource: pricing.stale
            ? "openrouter-cache-or-empty"
            : "openrouter-live",
        },
      });
      res.end();
    } catch (error: any) {
      sendModelRunEvent({
        status: "failed",
        requestedModel: requestedModelForRun,
        usedModel: usedModelForRun,
        durationMs: Date.now() - activityStartedAt,
        error: error.message || "Failed to generate response",
        runtimeSettings: runtimeSettingsForRun,
      });
      recordSystemActivity({
        kind: "error",
        status: "failed",
        title: "Chat request failed",
        detail: error.message || "Failed to generate response",
        requestId,
        phase: "error",
        durationMs: Date.now() - activityStartedAt,
      });
      console.error("Chat API Error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", requestId, error: error.message || "Failed to generate response" })}\n\n`,
      );
      res.end();
    }
  });

  if (options.serveClient !== false) {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  const attachWebSockets = (server: HttpServer) => {
    console.log(`[SYS] WebSocket trace broadcaster active on /ws/debug`);

    // WebSocket Servers
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      const pathname = new URL(
        request.url || "",
        `http://${request.headers.host}`,
      ).pathname;

      if (pathname === "/api/voice-agent") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else if (pathname === "/ws/debug") {
        if (!isAuthorizedDebugRequest(request)) {
          socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
        wssDebug.handleUpgrade(request, socket, head, (ws) => {
          wssDebug.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on("connection", (ws, req) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      let language = normalizeVoiceLanguage(url.searchParams.get("language"));
      let dgWs: WSWebSocket | null = null;
      let isDeepgramReady = false;
      let messageBuffer: Array<{ data: any; isBinary: boolean }> = [];
      let isVoiceSessionStarted = false;
      let usageInterval: ReturnType<typeof setInterval> | null = null;
      const voiceStartedAt = Date.now();
      let lastUsageAt = voiceStartedAt;
      let clientInputBytes = 0;
      let deepgramOutputBytes = 0;

      const sendVoiceUsage = (sessions = 0) => {
        if (ws.readyState !== ws.OPEN) return;
        const now = Date.now();
        const deltaSeconds = Math.max(0, (now - lastUsageAt) / 1000);
        const connectionSeconds = Math.max(0, (now - voiceStartedAt) / 1000);
        lastUsageAt = now;
        ws.send(
          JSON.stringify({
            type: "usage",
            usage: {
              provider: "deepgram",
              voiceAgentModel: "Deepgram Voice Agent Standard",
              listenModel:
                language === "ja" || language === "ko"
                  ? "flux-general-multi"
                  : "flux-general-en",
              speakModel: "gpt-4o-mini-tts",
              ttsModel: "gpt-4o-mini-tts",
              connectionSeconds,
              inputAudioSeconds:
                clientInputBytes / PCM16_MONO_48K_BYTES_PER_SECOND,
              outputAudioSeconds:
                deepgramOutputBytes / PCM16_MONO_48K_BYTES_PER_SECOND,
              cost: voiceAgentCostForSeconds(deltaSeconds),
              estimated: false,
              sessions,
            },
          }),
        );
      };

      const parseVoiceAuth = (data: any, isBinary: boolean) => {
        if (isBinary) return null;
        const text = Buffer.isBuffer(data)
          ? data.toString("utf8")
          : String(data);
        try {
          const payload = JSON.parse(text);
          return payload?.type === "voice_auth" ? payload : null;
        } catch {
          return null;
        }
      };

      const startVoiceSession = (
        providedOpenRouterKey: string,
        selectedLanguage: string,
        providedDeepgramKey = "",
      ) => {
        if (isVoiceSessionStarted) return true;

        const openRouterKey =
          sanitizeApiKey(providedOpenRouterKey) ||
          getOpenRouterServerFallbackKey();
        if (!openRouterKey) {
          ws.close(1008, openRouterRequiredMessage);
          return false;
        }

        const deepgramKey =
          sanitizeApiKey(providedDeepgramKey) ||
          sanitizeApiKey(process.env.DEEPGRAM_API_KEY);
        if (!deepgramKey) {
          ws.close(1011, "Deepgram API Key is missing");
          return false;
        }

        language = normalizeVoiceLanguage(selectedLanguage);
        isVoiceSessionStarted = true;
        usageInterval = setInterval(() => sendVoiceUsage(0), 1000);

        try {
          const dgUrl = "wss://agent.deepgram.com/v1/agent/converse";
          console.log(`Connecting to Deepgram at: ${dgUrl}`);
          dgWs = new WSWebSocket(dgUrl, {
            headers: {
              Authorization: `Token ${deepgramKey}`,
            },
          });

          dgWs.on("open", () => {
            // Send initial configuration
            const listenModel =
              language === "ja" || language === "ko"
                ? "flux-general-multi"
                : "flux-general-en";
            const listenProvider: any = {
              type: "deepgram",
              model: listenModel,
              version: "v2",
            };
            if (language === "ja" || language === "ko") {
              listenProvider.language_hints = ["en", "ja", "ko"];
            }

            let thinkPrompt =
              "You are an expert Computer Science and Programming tutor named Aria. You are currently helping a student who is studying technical material. Explain concepts like a senior engineer mentoring a junior developer. Use real-world analogies. Keep responses to 3-5 sentences. Never use bullet points, markdown, or code blocks — you are speaking out loud. Spell symbols verbally. End each reply with a follow-up question or offer to elaborate.";
            let greeting =
              "Hello! I am Aria, your CS tutor. What are you studying today?";

            if (language === "ja") {
              thinkPrompt =
                "あなたはAriaという名前の優秀なコンピュータサイエンスおよびプログラミングのチューターです。現在、技術的な内容を学習している学生をサポートしています。シニアエンジニアがジュニアデベロッパーを指導するように概念を説明してください。現実世界の例え話を使用してください。回答は3〜5文に抑えてください。音声での対話であるため、箇条書き、マークダウン、コードブロックは絶対に使用しないでください。記号は言葉で説明してください。最後は必ず次の質問をするか、詳しく説明することを提案して終えてください。必ず日本語で自然に会話してください。";
              greeting =
                "こんにちは！CSチューターのAriaです。今日は何を勉強しますか？";
            } else if (language === "ko") {
              thinkPrompt =
                "당신은 Aria라는 이름의 우수한 컴퓨터 과학 및 프로그래밍 튜터입니다. 현재 기술적인 내용을 학습하고 있는 학생을 돕고 있습니다. 시니어 엔지니어가 주니어 개발자를 멘토링하듯이 개념을 설명해 주세요. 현실 세계의 비유를 사용해 주세요. 답변은 3~5문장으로 제한해 주세요. 음성으로 대화 중이므로 글머리 기호, 마크다운, 코드 블록은 절대 사용하지 마세요. 기호는 말로 설명해 주세요. 각 답변의 끝에는 후속 질문을 하거나 더 자세히 설명하겠다고 제안해 주세요. 반드시 한국어로 자연스럽게 대화해 주세요.";
              greeting =
                "안녕하세요! CS 튜터 Aria입니다. 오늘 어떤 내용을 공부하시겠어요?";
            }

            const config = {
              type: "Settings",
              audio: {
                input: {
                  encoding: "linear16",
                  sample_rate: 48000,
                },
                output: {
                  encoding: "linear16",
                  sample_rate: 48000,
                  container: "none",
                },
              },
              agent: {
                listen: {
                  provider: listenProvider,
                },
                think: {
                  provider: {
                    type: "open_ai",
                    model: "gpt-4o-mini",
                  },
                  prompt: thinkPrompt,
                },
                speak: {
                  provider: {
                    type: "open_ai",
                    model: "gpt-4o-mini-tts",
                  },
                },
                greeting: greeting,
              },
            };
            console.log(
              "Sending Deepgram settings config:",
              JSON.stringify(config, null, 2),
            );
            dgWs?.send(JSON.stringify(config));
          });

          dgWs.on("unexpected-response", (req, res) => {
            console.error(
              `Deepgram WS Unexpected Response: ${res.statusCode} ${res.statusMessage}`,
            );
            console.error(
              "Deepgram Headers:",
              JSON.stringify(res.headers, null, 2),
            );
            if (res.statusCode === 404) {
              console.error(
                "This usually means the Deepgram API key does not have access to the Voice Agent API, or the endpoint is incorrect.",
              );
            }

            let body = "";
            res.on("data", (chunk) => {
              body += chunk;
            });
            res.on("end", () => {
              if (body) console.error("Deepgram Error Body:", body);
              if (ws.readyState === ws.OPEN) {
                ws.close(1011, `Deepgram returned ${res.statusCode}`);
              }
            });
          });

          dgWs.on("message", (data, isBinary) => {
            if (ws.readyState === ws.OPEN) {
              if (isBinary) {
                deepgramOutputBytes += rawByteLength(data);
                ws.send(data);
              } else {
                const messageStr = data.toString();
                try {
                  const parsed = JSON.parse(messageStr);
                  if (
                    parsed.type === "SettingsApplied" ||
                    parsed.type === "Welcome"
                  ) {
                    isDeepgramReady = true;
                    messageBuffer.forEach((msg) => {
                      if (dgWs?.readyState === WSWebSocket.OPEN) {
                        dgWs.send(msg.data);
                      }
                    });
                    messageBuffer = [];
                  }
                } catch (e) {}
                ws.send(messageStr);
              }
            }
          });

          dgWs.on("close", () => {
            if (ws.readyState === ws.OPEN) {
              sendVoiceUsage(1);
              ws.close();
            }
          });

          dgWs.on("error", (error) => {
            console.error("Deepgram WS Error:", error);
            if (ws.readyState === ws.OPEN) {
              ws.close();
            }
          });
        } catch (e) {
          if (usageInterval) {
            clearInterval(usageInterval);
            usageInterval = null;
          }
          console.error("Failed to connect to Deepgram", e);
          ws.close(1011, "Failed to connect to Deepgram");
        }

        return true;
      };

      const forwardClientMessage = (data: any, isBinary: boolean) => {
        if (isBinary) {
          clientInputBytes += rawByteLength(data);
        }
        // Proxy messages to Deepgram once ready
        if (isDeepgramReady && dgWs && dgWs.readyState === dgWs.OPEN) {
          dgWs.send(data);
        } else {
          messageBuffer.push({ data, isBinary });
        }
      };

      ws.on("message", (data, isBinary) => {
        if (!isVoiceSessionStarted) {
          const authPayload = parseVoiceAuth(data, isBinary);
          if (authPayload) {
            startVoiceSession(
              sanitizeApiKey(authPayload.openRouterKey),
              authPayload.language || language,
              sanitizeApiKey(authPayload.deepgramKey),
            );
            return;
          }

          const started = startVoiceSession("", language);
          if (!started) return;
        }

        forwardClientMessage(data, isBinary);
      });

      ws.on("close", () => {
        if (usageInterval) clearInterval(usageInterval);
        if (dgWs && dgWs.readyState === dgWs.OPEN) {
          dgWs.close();
        }
      });
    });
  };

  return { app, attachWebSockets };
}

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  const { app, attachWebSockets } = await createTutorServerApp({
    serveClient: true,
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYS] Server running on http://localhost:${PORT}`);
  });
  attachWebSockets(server);
}

const isDirectRun =
  !process.env.VERCEL &&
  /(?:^|[/\\])server\.(?:ts|js|mjs|cjs)$/.test(process.argv[1] || "");

if (isDirectRun) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
