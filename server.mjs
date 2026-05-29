// server.ts
import dotenv from "dotenv";
import express from "express";
import * as fs from "fs";
import path from "path";
import {
  execFileSync,
  spawn
} from "child_process";
import compression from "compression";
import OpenAI from "openai";
import multer from "multer";
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";

// server/web-search.ts
var SERPER_ENDPOINTS = {
  search: "https://google.serper.dev/search",
  news: "https://google.serper.dev/news"
};
var CACHE_TTL_MS = 10 * 60 * 1e3;
var REQUEST_TIMEOUT_MS = 8e3;
var MAX_ATTEMPTS = 2;
var cache = /* @__PURE__ */ new Map();
var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var stableId = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i) | 0;
  }
  return `src_${Math.abs(hash).toString(36)}`;
};
var canonicalUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("utm_content");
    return parsed.toString();
  } catch {
    return url;
  }
};
var domainFromUrl = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
};
var faviconForDomain = (domain) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
var normalizeRows = (payload, mode, maxResults) => {
  const rows = [
    ...Array.isArray(payload?.organic) ? payload.organic : [],
    ...Array.isArray(payload?.news) ? payload.news : [],
    ...Array.isArray(payload?.topStories) ? payload.topStories : []
  ];
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  rows.forEach((row, index) => {
    const rawUrl = row.link || row.url || row.sourceUrl;
    const title = String(row.title || "").trim();
    if (!rawUrl || !title) return;
    const url = canonicalUrl(String(rawUrl));
    if (seen.has(url)) return;
    seen.add(url);
    const domain = domainFromUrl(url);
    results.push({
      id: stableId(`${mode}:${url}`),
      type: mode,
      title,
      url,
      domain,
      faviconUrl: faviconForDomain(domain),
      snippet: String(row.snippet || row.summary || row.description || "").trim(),
      date: row.date || row.publishedAt || void 0,
      position: Number(row.position || index + 1)
    });
  });
  return results.slice(0, maxResults);
};
function detectFreshnessSearch(text) {
  const value = text.toLowerCase();
  const sourceMaterialRequest = /\b(current|this|the)\s+(page|screen|document|pdf|chapter|section|slide|image|diagram|chart|figure)\b/.test(
    value
  ) || /\b(what'?s|what is|explain|summari[sz]e|describe)\s+(this|the)\b/.test(
    value
  ) || /\b(on the screen|visible|shown|source material|uploaded document|reading)\b/.test(
    value
  );
  const explicitExternal = /\b(search|browse|google|look up)\s+(the\s+)?(web|internet|online)\b/.test(
    value
  ) || /\b(web search|internet search|search online|from the web|on the web)\b/.test(
    value
  );
  if (sourceMaterialRequest && !explicitExternal) return null;
  const explicit = explicitExternal || /\b(search the web|browse the web)\b/.test(value);
  const fresh = /\b(latest|recent|today|yesterday|this week|this month|right now|breaking|news|trend|trending|pricing|price|release|released|ranking|rankings|best .*20\d{2}|who won|score|game|election|weather)\b/.test(
    value
  ) || /\bcurrent\s+(price|pricing|version|release|model|news|weather|score|ranking|rankings|ceo|president|law|rule|schedule)\b/.test(
    value
  );
  if (!explicit && !fresh) return null;
  const mode = /\b(news|today|headline|headlines|happened)\b/.test(value) ? "news" : "search";
  return { query: text.trim().slice(0, 240), mode };
}
async function searchSerper(options) {
  const query = options.query.trim();
  const mode = options.mode || "search";
  const maxResults = Math.min(Math.max(options.maxResults || 6, 1), 10);
  const key = options.apiKey || process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is not configured.");
  if (!query) return [];
  const cacheKey = `${mode}:${query.toLowerCase()}:${maxResults}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortListener = () => controller.abort();
    options.signal?.addEventListener("abort", abortListener, { once: true });
    try {
      const response = await fetch(SERPER_ENDPOINTS[mode], {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ q: query, num: maxResults }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`SERPER ${mode} failed with ${response.status}`);
      }
      const payload = await response.json();
      const results = normalizeRows(payload, mode, maxResults);
      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });
      return results;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await wait(250 * attempt);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortListener);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("SERPER search failed.");
}
function formatSourcesForPrompt(sources) {
  if (sources.length === 0) return "No web sources were returned.";
  return sources.map((source, index) => {
    const date = source.date ? ` | ${source.date}` : "";
    return `[${index + 1}] ${source.title} | ${source.domain}${date} | ${source.snippet} | ${source.url}`;
  }).join("\n");
}

// server.ts
dotenv.config();
var DEEPGRAM_PRICING = {
  voiceAgentPerMinute: 0.075,
  aura1Per1kCharacters: 0.015,
  aura2Per1kCharacters: 0.03,
  fluxEnglishPerHour: 4.5
};
var pricingCache = null;
var PRICING_CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
var PCM16_MONO_48K_BYTES_PER_SECOND = 48e3 * 2;
var DEFAULT_CHAT_MODEL = "deepseek/deepseek-v4-flash";
var LEARNING_AGENT_MODEL = "deepseek/deepseek-v4-flash";
var roundCost = (value) => Math.round((value || 0) * 1e6) / 1e6;
var estimateTokensFromText = (value) => {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return Math.max(1, Math.ceil(text.length / 4));
};
var ttsCostForModel = (model, characters) => {
  const rate = model.includes("aura-2") ? DEEPGRAM_PRICING.aura2Per1kCharacters : DEEPGRAM_PRICING.aura1Per1kCharacters;
  return roundCost(Math.max(0, characters) / 1e3 * rate);
};
var voiceAgentCostForSeconds = (seconds) => roundCost(Math.max(0, seconds) / 60 * DEEPGRAM_PRICING.voiceAgentPerMinute);
var rawByteLength = (data) => {
  if (Buffer.isBuffer(data)) return data.length;
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (Array.isArray(data))
    return data.reduce((sum, chunk) => sum + rawByteLength(chunk), 0);
  if (typeof data === "string") return Buffer.byteLength(data);
  return Buffer.byteLength(Buffer.from(data));
};
var sanitizeApiKey = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key || key === "undefined" || key === "null") return "";
  return key;
};
var firstHeader = (value) => Array.isArray(value) ? value[0] || "" : value || "";
var hostNameFromHeader = (host) => {
  const rawHost = firstHeader(host).trim().toLowerCase();
  if (!rawHost) return "";
  if (rawHost.startsWith("[")) {
    const end = rawHost.indexOf("]");
    return end > 0 ? rawHost.slice(1, end) : rawHost;
  }
  return rawHost.split(":")[0];
};
var isLoopbackHost = (host) => {
  const hostname = hostNameFromHeader(host);
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || hostname === "127.0.0.1";
};
var isLoopbackAddress = (address) => {
  const normalized = String(address || "").replace(/^::ffff:/, "");
  return normalized === "::1" || /^127(?:\.\d{1,3}){3}$/.test(normalized);
};
var debugAdminToken = sanitizeApiKey(
  process.env.TUTOR_DEBUG_TOKEN || process.env.ADMIN_DEBUG_TOKEN
);
var tokenFromAuthorization = (authorization) => {
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};
var debugTokenFromRequest = (request) => {
  const headerToken = sanitizeApiKey(
    request.headers["x-debug-token"] || request.headers["x-admin-token"] || tokenFromAuthorization(firstHeader(request.headers.authorization))
  );
  if (headerToken) return headerToken;
  try {
    const url = new URL(
      request.url || "",
      `http://${firstHeader(request.headers.host) || "localhost"}`
    );
    return sanitizeApiKey(url.searchParams.get("debugToken"));
  } catch {
    return "";
  }
};
var isAuthorizedDebugRequest = (request) => {
  const requestToken = debugTokenFromRequest(request);
  if (debugAdminToken && requestToken === debugAdminToken) return true;
  return process.env.NODE_ENV !== "production" && isLoopbackHost(request.headers.host) && isLoopbackAddress(request.socket.remoteAddress);
};
var redactSensitiveUrl = (url) => url.replace(
  /([?&](?:openRouterKey|apiKey|debugToken|token|key)=)[^&]*/gi,
  "$1[redacted]"
);
var normalizeVoiceLanguage = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const language = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return language === "ja" || language === "ko" ? language : "en";
};
var normalizeModelPricing = (raw) => {
  const models = {};
  const rows = Array.isArray(raw?.data) ? raw.data : [];
  rows.forEach((model) => {
    if (!model?.id || !model?.pricing) return;
    models[model.id] = {
      name: model.name,
      prompt: Number(model.pricing.prompt || 0),
      completion: Number(model.pricing.completion || 0)
    };
  });
  return models;
};
var fetchOpenRouterPricing = async (force = false) => {
  const now = Date.now();
  if (!force && pricingCache && now - pricingCache.fetchedAt < PRICING_CACHE_TTL_MS) {
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
      stale: false
    };
    return pricingCache;
  } catch (error) {
    console.warn("[PRICING] OpenRouter pricing fetch failed:", error);
    if (pricingCache) return { ...pricingCache, stale: true };
    pricingCache = { fetchedAt: now, models: {}, stale: true };
    return pricingCache;
  }
};
var openRouterCost = (pricing, model, inputTokens, outputTokens) => {
  const modelPricing = pricing[model] || pricing[model.replace(/^openai\//, "")] || pricing[`openai/${model}`];
  if (!modelPricing) return 0;
  return roundCost(
    inputTokens * modelPricing.prompt + outputTokens * modelPricing.completion
  );
};
var extractJsonObject = (value) => {
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
var fallbackLearningUpdate = (body) => {
  const project = String(body?.activeProject || "").trim();
  const userMessage = String(body?.userMessage || "").trim();
  const assistantMessage = String(body?.assistantMessage || "").trim();
  const cleanAssistant = assistantMessage.replace(/\bPrompt:\s*/gi, "").replace(/\bLearning note:\s*/gi, "").replace(/\bReview hook:[\s\S]*$/gi, "").replace(/\s+/g, " ").trim() || userMessage.replace(/\s+/g, " ").trim() || "The learner explored a tutor concept.";
  const title = project && project !== "General Study" ? project : userMessage.match(
    /\b(Python|JavaScript|React|TypeScript|Algorithms|System Design|Concurrency|Networking|Machine Learning|Calculus|History)\b/i
  )?.[0] || "General Study";
  const conceptName = title === "General Study" ? "General Conversation" : title;
  return {
    userName: String(body?.userName || "Learner").trim() || "Learner",
    bookTitle: title,
    bookSource: "chat",
    overview: `A session learning book collecting the learner's tutor conversations about ${title}.`,
    chapterTitle: title === "General Study" ? "Conversation Notes" : title,
    chapterSummary: `Key idea: ${cleanAssistant}

How to review it: restate the idea, identify the mechanism, and test it with a fresh example.`,
    conversationSummary: `Revision note: ${cleanAssistant}

Review check: explain the takeaway without looking, then apply it to a new example.`,
    knowledgeSummary: `Current learning focus: ${conceptName}. The learner should revise the core takeaway, the mechanism behind it, and one example application.`,
    conceptsLearned: [conceptName],
    risks: [],
    confidence: 0.45,
    concepts: [
      {
        name: conceptName,
        summary: `Key idea: ${cleanAssistant}

Application: turn the answer into a short explanation and one test example.`,
        mastery: 0.35,
        confidence: 0.45,
        parentConcepts: [],
        childConcepts: [],
        evidence: [userMessage.slice(0, 160)].filter(Boolean)
      }
    ],
    model: `${LEARNING_AGENT_MODEL} (local fallback)`
  };
};
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3e3);
  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  const uploadDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({ dest: uploadDir });
  app.use((req, res, next) => {
    if (!req.url.startsWith("/src/") && !req.url.startsWith("/node_modules/") && !req.url.startsWith("/@")) {
      console.log(`[HTTP] ${req.method} ${redactSensitiveUrl(req.url)}`);
    }
    next();
  });
  const requireDebugAccess = (req, res, next) => {
    if (isAuthorizedDebugRequest(req)) {
      next();
      return;
    }
    res.status(403).json({
      error: "Debug access denied. Use localhost in development or provide x-debug-token with TUTOR_DEBUG_TOKEN."
    });
  };
  const wssDebug = new WebSocketServer({ noServer: true });
  let debugClients = [];
  const logHistory = [];
  wssDebug.on("connection", (ws) => {
    debugClients.push(ws);
    logHistory.forEach((payload) => {
      if (ws.readyState === WSWebSocket.OPEN) ws.send(payload);
    });
    ws.on("close", () => {
      debugClients = debugClients.filter((c) => c !== ws);
    });
  });
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const broadcastLog = (type, args) => {
    const msg = args.map((a) => {
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
    }).join(" ");
    const payload = JSON.stringify({ type, timestamp: Date.now(), msg });
    logHistory.push(payload);
    if (logHistory.length > 100) logHistory.shift();
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
  const debugRunsDir = path.join(process.cwd(), "brain/debug/runs");
  let activeDebugJob = null;
  const appendDebugRunEvent = (runId, type, message, data = {}) => {
    const runDir = path.join(debugRunsDir, runId);
    if (!fs.existsSync(runDir)) return;
    fs.appendFileSync(
      path.join(runDir, "events.ndjson"),
      `${JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type,
        message,
        data
      })}
`
    );
  };
  const readJsonFile = (file) => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  };
  const writeJsonFile = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}
`);
  };
  const readDebugEvents = (runDir) => {
    const eventsPath = path.join(runDir, "events.ndjson");
    if (!fs.existsSync(eventsPath)) return [];
    return fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  };
  const readDebugComponents = (runDir, summary = {}) => {
    const componentsDir = path.join(runDir, "components");
    const componentFiles = fs.existsSync(componentsDir) ? fs.readdirSync(componentsDir).filter((file) => file.endsWith(".json")).map((file) => readJsonFile(path.join(componentsDir, file))).filter(Boolean) : [];
    const storedComponents = Array.isArray(summary.components) ? summary.components : [];
    return (componentFiles.length ? componentFiles : storedComponents).sort(
      (a, b) => String(a.finishedAt || a.timestamp || "").localeCompare(
        String(b.finishedAt || b.timestamp || "")
      )
    );
  };
  const summarizeDebugRun = (id) => {
    const runDir = path.join(debugRunsDir, id);
    const summary = readJsonFile(path.join(runDir, "summary.json")) || readJsonFile(path.join(runDir, "run.json")) || {};
    const events = readDebugEvents(runDir);
    const components = readDebugComponents(runDir, summary);
    const startEvent = events.find(
      (event) => event.type === "run-started"
    );
    const completeEvent = [...events].reverse().find((event) => event.type === "run-completed");
    const active = activeDebugJob?.id === id;
    const updatedAtMs = summary.updatedAt ? Date.parse(summary.updatedAt) : 0;
    const staleRunning = summary.status === "running" && !active && !completeEvent && (!updatedAtMs || Date.now() - updatedAtMs > 6e4);
    const status = active ? "running" : staleRunning ? "interrupted" : summary.status || completeEvent?.data?.status || (completeEvent ? "completed" : "unknown");
    return {
      ...summary,
      id,
      status,
      startedAt: summary.startedAt || startEvent?.timestamp || null,
      finishedAt: summary.finishedAt || completeEvent?.timestamp || null,
      updatedAt: summary.updatedAt || null,
      mode: summary.mode || startEvent?.data?.mode || null,
      scope: summary.scope || startEvent?.data?.scope || null,
      targetCount: Number(summary.targetCount || 0),
      completedCount: Number(summary.completedCount ?? components.length),
      changedCount: Number(
        summary.changedCount ?? components.filter((item) => item.changed).length
      ),
      activeTarget: active ? summary.activeTarget || null : null,
      components,
      events: events.slice(-160)
    };
  };
  const seedDebugRun = (runId, mode, scope) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const runDir = path.join(debugRunsDir, runId);
    fs.mkdirSync(path.join(runDir, "components"), { recursive: true });
    const seed = {
      id: runId,
      status: "running",
      startedAt: now,
      finishedAt: null,
      updatedAt: now,
      mode,
      scope,
      targetCount: 0,
      completedCount: 0,
      changedCount: 0,
      activeTarget: null,
      components: [],
      finalCommands: [],
      unresolvedRisks: []
    };
    writeJsonFile(path.join(runDir, "summary.json"), seed);
    writeJsonFile(path.join(runDir, "run.json"), seed);
    fs.appendFileSync(
      path.join(runDir, "events.ndjson"),
      `${JSON.stringify({
        timestamp: now,
        type: "run-queued",
        message: `Debug run ${runId} queued by Admin`,
        data: { id: runId, mode, scope }
      })}
`
    );
  };
  const persistDebugExit = (runId, code) => {
    const runDir = path.join(debugRunsDir, runId);
    if (!fs.existsSync(runDir)) return;
    const current = summarizeDebugRun(runId);
    if (current.status !== "running" && current.status !== "unknown") return;
    const { events: _events, ...persistable } = current;
    const finished = {
      ...persistable,
      status: code === 0 ? "completed" : code === null ? "cancelled" : "failed-process",
      finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      activeTarget: null
    };
    writeJsonFile(path.join(runDir, "summary.json"), finished);
    writeJsonFile(path.join(runDir, "run.json"), finished);
  };
  const stopExternalDebugProcesses = (runId) => {
    let killed = 0;
    try {
      const output = execFileSync("pgrep", ["-fl", runId], {
        encoding: "utf8"
      });
      for (const line of output.split("\n").filter(Boolean)) {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (!match) continue;
        const pid = Number(match[1]);
        const command = match[2] || "";
        const isDebugRunner = command.includes("brain:debug") || command.includes("debug-runner") || command.includes("--resume");
        if (!Number.isFinite(pid) || !isDebugRunner) continue;
        try {
          process.kill(pid, "SIGTERM");
          killed += 1;
        } catch (error) {
          console.warn(`[DEBUG] Failed to stop process ${pid}:`, error);
        }
      }
    } catch {
      return killed;
    }
    return killed;
  };
  const stopDebugRun = (runId) => {
    let stopped = false;
    if (activeDebugJob?.id === runId) {
      activeDebugJob.child.kill("SIGTERM");
      activeDebugJob = null;
      stopped = true;
    }
    const externalCount = stopExternalDebugProcesses(runId);
    stopped = stopped || externalCount > 0;
    persistDebugExit(runId, null);
    appendDebugRunEvent(runId, "run-cancelled", `Debug run ${runId} stopped`, {
      stopped,
      externalCount
    });
    return { stopped, externalCount };
  };
  const listDebugRuns = () => {
    if (!fs.existsSync(debugRunsDir)) return [];
    return fs.readdirSync(debugRunsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => {
      const summary = summarizeDebugRun(entry.name);
      return {
        id: entry.name,
        status: summary.status,
        startedAt: summary.startedAt || null,
        finishedAt: summary.finishedAt || null,
        mode: summary.mode || null,
        scope: summary.scope || null,
        targetCount: summary.targetCount || 0,
        completedCount: summary.completedCount || 0,
        changedCount: summary.changedCount || 0
      };
    }).sort(
      (a, b) => String(b.startedAt || b.id).localeCompare(String(a.startedAt || a.id))
    );
  };
  app.use("/api/debug", requireDebugAccess);
  app.get("/api/debug/runs", (_req, res) => {
    res.json({
      activeRunId: activeDebugJob?.id || null,
      runs: listDebugRuns()
    });
  });
  app.delete("/api/debug/runs", (_req, res) => {
    if (fs.existsSync(debugRunsDir)) {
      for (const entry of fs.readdirSync(debugRunsDir)) {
        const summary = summarizeDebugRun(entry);
        if (summary.status === "running" || activeDebugJob?.id === entry) {
          stopDebugRun(entry);
        }
        fs.rmSync(path.join(debugRunsDir, entry), {
          recursive: true,
          force: true
        });
      }
    }
    res.json({ ok: true, deleted: true });
  });
  app.delete("/api/debug/runs/:id", (req, res) => {
    const safeId = path.basename(req.params.id);
    const runDir = path.join(debugRunsDir, safeId);
    if (!fs.existsSync(runDir)) {
      return res.status(404).json({ error: "Debug run not found." });
    }
    const summary = summarizeDebugRun(safeId);
    if (summary.status === "running" || activeDebugJob?.id === safeId) {
      stopDebugRun(safeId);
    }
    fs.rmSync(runDir, { recursive: true, force: true });
    res.json({ ok: true, deleted: safeId });
  });
  app.get("/api/debug/runs/:id", (req, res) => {
    const safeId = path.basename(req.params.id);
    const runDir = path.join(debugRunsDir, safeId);
    if (!fs.existsSync(runDir))
      return res.status(404).json({ error: "Debug run not found." });
    res.json(summarizeDebugRun(safeId));
  });
  app.get("/api/debug/runs/:id/events", (req, res) => {
    const safeId = path.basename(req.params.id);
    const runDir = path.join(debugRunsDir, safeId);
    res.json({ events: readDebugEvents(runDir) });
  });
  app.post("/api/debug/run", (req, res) => {
    if (activeDebugJob)
      return res.status(409).json({
        error: "A debug run is already active.",
        activeRunId: activeDebugJob.id
      });
    const requestedMode = String(req.body?.mode || "fix");
    const mode = ["audit", "fix", "scan", "long-horizon"].includes(
      requestedMode
    ) ? requestedMode : "fix";
    const scope = (mode === "long-horizon" ? "all" : String(req.body?.scope || "changed").replace(
      /[^a-zA-Z0-9_./:-]/g,
      ""
    )) || "changed";
    const runId = `debug-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
    seedDebugRun(runId, mode, scope);
    const child = spawn(
      "npm",
      [
        "run",
        "brain:debug",
        "--",
        "--mode",
        mode,
        "--scope",
        scope,
        "--resume",
        runId
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    activeDebugJob = { id: runId, child };
    console.log(`[DEBUG] Started ${runId} (${mode}, ${scope})`);
    child.stdout.on(
      "data",
      (data) => console.log(`[DEBUG:${runId}] ${String(data).trim()}`)
    );
    child.stderr.on(
      "data",
      (data) => console.warn(`[DEBUG:${runId}] ${String(data).trim()}`)
    );
    child.on("exit", (code) => {
      console.log(`[DEBUG] ${runId} exited with code ${code}`);
      if (activeDebugJob?.id === runId) activeDebugJob = null;
      persistDebugExit(runId, code);
    });
    res.status(202).json({ ok: true, runId, mode, scope });
  });
  app.post("/api/debug/runs/:id/cancel", (req, res) => {
    const safeId = path.basename(req.params.id);
    const runDir = path.join(debugRunsDir, safeId);
    if (!fs.existsSync(runDir))
      return res.status(404).json({ error: "Debug run not found." });
    const result = stopDebugRun(safeId);
    res.json({ ok: true, cancelled: safeId, ...result });
  });
  app.post("/api/debug/stop", (_req, res) => {
    if (activeDebugJob) {
      const stopped = activeDebugJob.id;
      const result2 = stopDebugRun(stopped);
      return res.json({ ok: true, stopped, ...result2 });
    }
    const running = listDebugRuns().find((run) => run.status === "running");
    if (!running) return res.json({ ok: true, stopped: null });
    const result = stopDebugRun(running.id);
    res.json({ ok: true, stopped: running.id, ...result });
  });
  app.get("/api/pricing", async (_req, res) => {
    const openRouter = await fetchOpenRouterPricing();
    const fetchedAt = new Date(openRouter.fetchedAt).toISOString();
    res.json({
      fetchedAt,
      source: openRouter.stale ? "openrouter-cache-or-empty" : "openrouter-live",
      stale: openRouter.stale,
      openRouter: {
        fetchedAt,
        source: "https://openrouter.ai/api/v1/models",
        models: openRouter.models,
        stale: openRouter.stale
      },
      deepgram: {
        fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: "maintained-fallback",
        pricing: DEEPGRAM_PRICING
      }
    });
  });
  app.post("/api/documents/ingest", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const filePath = req.file.path;
    try {
      const { execFile } = await import("child_process");
      execFile(
        "python3",
        ["scripts/classify_and_extract.py", filePath],
        { maxBuffer: 1024 * 1024 * 96, timeout: 12e4 },
        async (error, stdout, stderr) => {
          fs.unlink(filePath, () => {
          });
          if (error) {
            console.error("Python Extraction Error:", stderr);
            return res.status(500).json({ error: "Failed to process document" });
          }
          let result;
          try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : stdout;
            result = JSON.parse(jsonStr);
          } catch (e) {
            console.error("Failed to parse JSON from Python script:", stdout);
            return res.status(500).json({ error: "Invalid response from python script" });
          }
          if (result.error) {
            return res.status(400).json({ error: result.error });
          }
          let extractedText = result.content || "";
          if (result.classification === "Scanned" || result.classification === "Mixed") {
            const authHeader = req.headers.authorization;
            const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
            const apiKey = bearerMatch ? bearerMatch[1].trim() : process.env.OPENROUTER_API_KEY;
            if (apiKey && result.images && result.images.length > 0) {
              try {
                const openai = new OpenAI({
                  baseURL: "https://openrouter.ai/api/v1",
                  apiKey
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
                            text: `Extract all readable text, diagrams, tables, and layout cues from page ${Number(img.page_num ?? 0) + 1}. Output concise markdown only from the provided source image; do not add outside facts.`
                          },
                          {
                            type: "image_url",
                            image_url: {
                              url: `data:${img.mime_type};base64,${img.data}`
                            }
                          }
                        ]
                      }
                    ]
                  });
                  const pageText = response.choices[0]?.message?.content?.trim();
                  if (pageText) {
                    extractedText += `

## OCR / Vision Page ${Number(img.page_num ?? 0) + 1}

${pageText}`;
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
            content: extractedText
          });
        }
      );
    } catch (e) {
      fs.unlink(filePath, () => {
      });
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/title", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "OpenRouter API key is required." });
      }
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey
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
                text: "Look at this page from a document. Generate a very short (2-4 words) specific topic or title for what this document is about. Output ONLY the title."
              },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ]
      });
      const title = response.choices[0]?.message?.content?.trim();
      res.json({ title: title || "General Study" });
    } catch (error) {
      console.error("Title API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate title" });
    }
  });
  app.post("/api/generate-persona", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey)
        return res.status(401).json({ error: "OpenRouter API key is required." });
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey
      });
      const { description } = req.body;
      if (!description)
        return res.status(400).json({ error: "Description is required." });
      const response = await openai.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        // Use Sonnet for high-quality prompt generation
        messages: [
          {
            role: "system",
            content: "You are an expert prompt engineer. The user will give you a brief description of a persona for an AI Tutor. Write a highly detailed, professional System Prompt that the AI should follow to embody this persona. The prompt must require clear professional language, no emojis unless the user explicitly asks for them, concise markdown, and a tutoring style that teaches without gimmicks. The output MUST ONLY be the raw system prompt text, nothing else. No prefixes like 'Here is the prompt'."
          },
          {
            role: "user",
            content: description
          }
        ]
      });
      res.json({ prompt: response.choices[0]?.message?.content?.trim() });
    } catch (error) {
      console.error("Persona Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate persona" });
    }
  });
  app.post("/api/trace", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey)
        return res.status(401).json({ error: "OpenRouter API key is required." });
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey
      });
      const { action, payload } = req.body;
      const response = await openai.chat.completions.create({
        model: LEARNING_AGENT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert system tracker tracing user actions and brain updates. The user provides a raw JSON payload of an action that just happened in the AI Tutor App. Your job is to output a single, neat, layman-readable paragraph explaining what just happened in the background."
          },
          {
            role: "user",
            content: `Action: ${action}
Payload: ${JSON.stringify(payload)}`
          }
        ]
      });
      res.json({ explanation: response.choices[0]?.message?.content?.trim() });
    } catch (error) {
      console.error("Trace API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate trace" });
    }
  });
  app.post("/api/learning-book-update", async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
    const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
    const body = req.body || {};
    if (!apiKey) {
      return res.status(401).json({
        error: "OpenRouter API key is required for learning book updates."
      });
    }
    const userMessage = String(body.userMessage || "").slice(0, 8e3);
    const assistantMessage = String(body.assistantMessage || "").slice(
      0,
      12e3
    );
    if (!userMessage && !assistantMessage) {
      return res.status(400).json({ error: "Conversation text is required." });
    }
    try {
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey
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
- If the current book already exists, prefer continuing it and adding/refining chapters. Do not invent advanced concepts absent from the conversation.`
          },
          {
            role: "user",
            content: JSON.stringify({
              userName: body.userName || "Learner",
              activeProject: body.activeProject || "General Study",
              currentSessionId: body.currentSessionId || "",
              currentBook: body.currentBook || null,
              recentBookTitles: body.recentBookTitles || [],
              userMessage,
              assistantMessage
            })
          }
        ]
      });
      const content = response.choices[0]?.message?.content || "";
      const parsed = extractJsonObject(content);
      res.json({
        ...parsed,
        userName: parsed.userName || body.userName || "Learner",
        bookTitle: parsed.bookTitle || body.activeProject || "General Study",
        model: LEARNING_AGENT_MODEL
      });
    } catch (error) {
      console.warn(
        "[LEARNING_BOOK] DeepSeek update failed, using safe fallback:",
        error instanceof Error ? error.message : error
      );
      res.json(fallbackLearningUpdate(body));
    }
  });
  app.post("/api/generate-flashcards", async (req, res) => {
    const authHeader = req.headers.authorization || "";
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
    const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
    const body = req.body || {};
    if (!apiKey) {
      return res.status(401).json({ error: "API key is required." });
    }
    const content = String(body.content || "").slice(0, 8e3);
    if (!content) {
      return res.status(400).json({ error: "Content is required." });
    }
    try {
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey
      });
      const response = await openai.chat.completions.create({
        model: LEARNING_AGENT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are an AI study assistant. Extract the key educational concepts from the provided text and generate 1-3 flashcards. Return ONLY a valid JSON object matching the schema. No markdown."
          },
          {
            role: "user",
            content: `Please generate flashcards from this text:

${content}`
          }
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
                        back: { type: "string" }
                      },
                      required: ["front", "back"]
                    }
                  }
                },
                required: ["cards"]
              }
            }
          }
        ],
        tool_choice: {
          type: "function",
          function: { name: "generate_flashcards" }
        }
      });
      const message = response.choices[0]?.message;
      let cards = [];
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        if (toolCall.function && toolCall.function.arguments) {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.cards) cards = args.cards;
        }
      } else if (message?.content) {
        try {
          const parsed = extractJsonObject(message.content);
          if (parsed.cards) cards = parsed.cards;
        } catch (e) {
        }
      }
      if (!Array.isArray(cards) || cards.length === 0) {
        const sentences = content.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 35).slice(0, 3);
        cards = (sentences.length ? sentences : [content.slice(0, 280)]).map(
          (sentence, index) => ({
            front: index === 0 ? "What is the core idea from this tutor answer?" : `What should you remember from note ${index + 1}?`,
            back: sentence.trim()
          })
        );
      }
      res.json({ cards });
    } catch (error) {
      console.warn("[FLASHCARDS] Generation failed:", error);
      const sentences = content.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 35).slice(0, 3);
      res.json({
        cards: (sentences.length ? sentences : [content.slice(0, 280)]).map(
          (sentence, index) => ({
            front: index === 0 ? "What is the core idea from this tutor answer?" : `What should you remember from note ${index + 1}?`,
            back: sentence.trim()
          })
        ),
        fallback: true
      });
    }
  });
  app.get("/api/tts", async (req, res) => {
    try {
      console.log(`[TTS] Request received for speech generation`);
      const text = req.query.text;
      if (!text) {
        return res.status(400).json({ error: "Text is required." });
      }
      const requestedVoice = typeof req.query.voice === "string" ? req.query.voice : "gpt-4o-mini-tts";
      const ttsModel = requestedVoice === "gpt-4o-mini-tts" ? requestedVoice : /^aura-[a-z0-9-]+-en$/i.test(requestedVoice) ? requestedVoice : "aura-asteria-en";
      const billedText = text.slice(0, 4e3);
      const inputCharacters = billedText.length;
      const estimatedCost = ttsCostForModel(ttsModel, inputCharacters);
      if (ttsModel === "gpt-4o-mini-tts") {
        try {
          const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "";
          if (!openaiKey) throw new Error("OpenAI API Key is missing");
          const openai = new OpenAI({
            apiKey: openaiKey
          });
          const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: billedText
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
            openaiErr
          );
        }
      }
      const ttsModelForDeepgram = ttsModel === "gpt-4o-mini-tts" ? "aura-asteria-en" : ttsModel;
      const deepgramKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramKey) throw new Error("Deepgram API Key is missing");
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${ttsModelForDeepgram}&encoding=mp3`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${deepgramKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: billedText
          })
        }
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
      const body = response.body;
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
    } catch (error) {
      console.error("TTS API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate audio" });
    }
  });
  app.post("/api/chat", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}

`);
    };
    try {
      const authHeader = req.headers.authorization || "";
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
      const {
        messages,
        currentPageImage,
        memoryContext,
        aiModel,
        customPrompt,
        serperApiKey: bodySerperKey,
        language
      } = req.body;
      const serperRuntimeKey = sanitizeApiKey(req.headers["x-serper-api-key"]) || sanitizeApiKey(bodySerperKey) || sanitizeApiKey(process.env.SERPER_API_KEY);
      if (!apiKey) {
        sendEvent("error", {
          error: "OpenRouter API key is required. Please set it in Settings."
        });
        return res.end();
      }
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey
      });
      const requestedModel = aiModel === "deepseek/deepseek-chat" ? DEFAULT_CHAT_MODEL : aiModel || DEFAULT_CHAT_MODEL;
      let usedModelForUsage = requestedModel;
      let inputTokens = 0;
      let outputTokens = 0;
      let usageEstimated = true;
      let webSources = [];
      const latestUserContent = [...messages || []].reverse().find((m) => m?.role === "user")?.content || "";
      const sourceMaterialRequest = /\b(current|this|the)\s+(page|screen|document|pdf|chapter|section|slide|image|diagram|chart|figure)\b/i.test(
        latestUserContent
      ) || /\b(what'?s|what is|explain|summari[sz]e|describe)\s+(this|the)\b/i.test(
        latestUserContent
      ) || /\b(on the screen|visible|shown|source material|uploaded document|reading)\b/i.test(
        latestUserContent
      );
      const requestedWebSearch = Boolean(
        detectFreshnessSearch(latestUserContent)
      );
      const mergeWebSources = (sources) => {
        const byUrl = new Map(webSources.map((source) => [source.url, source]));
        sources.forEach((source) => byUrl.set(source.url, source));
        webSources = [...byUrl.values()].slice(0, 10);
        return sources;
      };
      const runWebSearch = async (query, mode = "search", maxResults = 6) => {
        const searchId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sendEvent("status", { phase: "web_search" });
        sendEvent("web_search_started", { searchId, query, mode });
        sendEvent("web_search_progress", {
          searchId,
          status: "Searching web..."
        });
        try {
          const sources = await searchSerper({
            query,
            mode,
            maxResults,
            apiKey: serperRuntimeKey || void 0
          });
          sendEvent("web_search_progress", {
            searchId,
            status: sources.length ? "Reviewing sources..." : "No recent sources found."
          });
          sources.forEach(
            (source) => sendEvent("web_result", { searchId, source })
          );
          mergeWebSources(sources);
          sendEvent("web_sources_complete", { searchId, sources });
          sendEvent("reasoning_summary", {
            content: sources.length ? `Reviewing ${sources.length} recent ${mode === "news" ? "news" : "web"} sources` : "No web sources were returned; continuing from internal context"
          });
          return sources;
        } catch (error) {
          console.warn(
            "[WEB_SEARCH] Search unavailable:",
            error instanceof Error ? error.message : error
          );
          sendEvent("info", {
            message: "Search temporarily unavailable \u2014 continuing with internal knowledge."
          });
          sendEvent("web_sources_complete", {
            searchId,
            sources: [],
            error: "Search temporarily unavailable"
          });
          sendEvent("reasoning_summary", {
            content: "Web search was unavailable, so I am continuing with internal knowledge"
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
        systemInstruction = `${customPrompt}

${systemInstruction}`;
      }
      if (memoryContext) {
        systemInstruction += `

${memoryContext}`;
      }
      if (currentPageImage && sourceMaterialRequest) {
        systemInstruction += `

CURRENT PAGE IMAGE IS ATTACHED THROUGH THE look_at_current_page TOOL. For this source-material request, call look_at_current_page before answering and answer from the page image plus selected/library context. Do not use web_search unless the user explicitly asks for web search.`;
      }
      if (language === "ja") {
        systemInstruction += `

CRITICAL LANGUAGE REQUIREMENT: You must think, reason, and respond natively in Japanese (\u65E5\u672C\u8A9E). Ensure all educational explanations, conceptual analogies, and technical feedback are phrased naturally in fluent Japanese. Keep the professional academic tone with no emojis.`;
      } else if (language === "ko") {
        systemInstruction += `

CRITICAL LANGUAGE REQUIREMENT: You must think, reason, and respond natively in Korean (\uD55C\uAD6D\uC5B4). Ensure all educational explanations, conceptual analogies, and technical feedback are phrased naturally in fluent Korean. Keep the professional academic tone with no emojis.`;
      }
      const freshnessSearch = requestedWebSearch ? detectFreshnessSearch(latestUserContent) : null;
      if (freshnessSearch) {
        sendEvent("reasoning_summary", {
          content: "Detecting freshness requirement"
        });
        const sources = await runWebSearch(
          freshnessSearch.query,
          freshnessSearch.mode,
          6
        );
        if (sources.length > 0) {
          systemInstruction += `

LIVE WEB SOURCES:
${formatSourcesForPrompt(sources)}

Use these sources for current factual claims and cite them with bracketed source numbers.`;
        }
      }
      const formattedMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      ];
      const tools = [
        {
          type: "function",
          function: {
            name: "update_graph",
            description: "Updates the learning knowledge graph with a new key concept. Ensure the 'name' contains ONLY the exact, atomic key concept (no unwanted words, no full sentences).",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The name of the key concept. Keep it extremely concise (e.g., 'Monkey Patching', 'V8 Engine')."
                },
                description: {
                  type: "string",
                  description: "A short, accurate description of the concept."
                },
                understandingDelta: {
                  type: "number",
                  description: "A value from -0.2 to 0.2 representing the change in the user's understanding of this concept based on the conversation."
                }
              },
              required: ["name", "description", "understandingDelta"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generate_flashcards",
            description: "Generates study flashcards based on the current discussion.",
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
                        description: "Front side of the flashcard (the question or concept)"
                      },
                      back: {
                        type: "string",
                        description: "Back side of the flashcard (the answer or explanation)"
                      }
                    },
                    required: ["front", "back"]
                  }
                }
              },
              required: ["cards"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the live web only when the user explicitly asks for web/internet/online search or needs fresh external facts. Do not use for current page, screen, document, PDF, selected text, uploaded source material, or active library questions.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The concise web search query."
                },
                mode: {
                  type: "string",
                  enum: ["search", "news"],
                  description: "Use news for current events/headlines; use search for general web retrieval."
                },
                maxResults: {
                  type: "number",
                  description: "Number of sources to retrieve, from 1 to 10."
                }
              },
              required: ["query"]
            }
          }
        }
      ];
      if (currentPageImage) {
        tools.push({
          type: "function",
          function: {
            name: "look_at_current_page",
            description: "Look at the current PDF page the user is viewing and extract information, explain concepts, or answer questions based on its visual content.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Specific question or analysis request about the page to ask the vision model."
                }
              },
              required: ["query"]
            }
          }
        });
      }
      let graphUpdates = [];
      let flashcardsUpdates = [];
      let iterations = 0;
      const MAX_ITERATIONS = 5;
      let finalContent = "";
      const FALLBACK_MODELS = [
        "google/gemini-2.5-flash",
        "anthropic/claude-3.5-haiku",
        "openai/gpt-4o-mini",
        "meta-llama/llama-4-maverick"
      ];
      while (iterations < MAX_ITERATIONS) {
        if (iterations === 0) sendEvent("status", { phase: "thinking" });
        const primaryModel = requestedModel;
        const modelsToTry = [
          primaryModel,
          ...FALLBACK_MODELS.filter((m) => m !== primaryModel)
        ];
        let stream = null;
        let usedModel = primaryModel;
        for (const model of modelsToTry) {
          try {
            stream = await openai.chat.completions.create({
              model,
              messages: formattedMessages,
              tools,
              stream: true,
              stream_options: { include_usage: true }
            });
            usedModel = model;
            usedModelForUsage = model;
            if (iterations === 0 && model !== primaryModel) {
              console.log(
                `[CHAT] Primary model "${primaryModel}" unavailable, fell back to "${model}"`
              );
              sendEvent("info", {
                message: `Model ${primaryModel} unavailable \u2014 using ${model}`
              });
            }
            break;
          } catch (modelErr) {
            const status = modelErr?.status || modelErr?.code;
            const isRetryable = [401, 402, 403, 429, 500, 502, 503].includes(
              status
            );
            console.warn(
              `[CHAT] Model "${model}" failed (${status}): ${modelErr.message}`
            );
            if (!isRetryable || model === modelsToTry[modelsToTry.length - 1]) {
              throw modelErr;
            }
          }
        }
        if (!stream)
          throw new Error(
            "All models failed. Please check your API key and try again."
          );
        let isToolCall = false;
        let currentToolCalls = [];
        let assistantContent = "";
        for await (const chunk of stream) {
          const usage = chunk.usage;
          if (usage) {
            inputTokens += Number(
              usage.prompt_tokens ?? usage.input_tokens ?? 0
            );
            outputTokens += Number(
              usage.completion_tokens ?? usage.output_tokens ?? 0
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
                  function: { name: tc.function?.name || "", arguments: "" }
                };
              }
              if (tc.function?.name && !currentToolCalls[tc.index].function.name) {
                currentToolCalls[tc.index].function.name = tc.function.name;
              }
              if (tc.function?.arguments) {
                currentToolCalls[tc.index].function.arguments += tc.function.arguments;
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
          break;
        }
        sendEvent("status", { phase: "tool_execution" });
        const validToolCalls = currentToolCalls.filter(Boolean);
        validToolCalls.forEach((t) => {
          sendEvent("reasoning_summary", {
            content: `Using tool: ${t.function.name}`
          });
        });
        formattedMessages.push({
          role: "assistant",
          content: assistantContent || null,
          tool_calls: validToolCalls
        });
        for (const toolCall of validToolCalls) {
          const functionName = toolCall.function.name;
          const functionArguments = toolCall.function.arguments;
          if (functionName === "look_at_current_page" && currentPageImage) {
            try {
              sendEvent("reasoning_summary", {
                content: "Looking at current page"
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
                        text: args.query || "Describe this page."
                      },
                      {
                        type: "image_url",
                        image_url: { url: currentPageImage }
                      }
                    ]
                  }
                ]
              });
              const visionText = visionResponse.choices[0]?.message?.content || "Empty response from vision model.";
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: visionText
              });
            } catch (err) {
              console.error("Vision Error:", err);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error: Could not analyze the page image."
              });
            }
          } else if (functionName === "web_search") {
            try {
              if (!requestedWebSearch) {
                formattedMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: "Web search denied for this turn. Answer from the provided source material, selected text, memory context, and page image if available."
                });
                continue;
              }
              sendEvent("reasoning_summary", {
                content: "Searching live web sources"
              });
              const args = JSON.parse(functionArguments || "{}");
              const query = String(
                args.query || latestUserContent || ""
              ).trim();
              const requestedMode = args.mode === "news" ? "news" : "search";
              const maxResults = Number.isFinite(Number(args.maxResults)) ? Number(args.maxResults) : 6;
              const sources = query ? await runWebSearch(query, requestedMode, maxResults) : [];
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: formatSourcesForPrompt(sources)
              });
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Search temporarily unavailable."
              });
            }
          } else if (functionName === "update_graph") {
            try {
              sendEvent("reasoning_summary", {
                content: "Updating learning knowledge graph"
              });
              const args = JSON.parse(functionArguments);
              graphUpdates.push(args);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Graph updated successfully."
              });
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error parsing arguments."
              });
            }
          } else if (functionName === "generate_flashcards") {
            try {
              sendEvent("reasoning_summary", {
                content: "Generating flashcards"
              });
              const args = JSON.parse(functionArguments);
              if (args && args.cards) flashcardsUpdates.push(...args.cards);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Flashcards created successfully."
              });
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error parsing arguments."
              });
            }
          } else {
            formattedMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Unsupported tool."
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
        outputTokens
      );
      sendEvent("status", { phase: "streaming" });
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
          pricingSource: pricing.stale ? "openrouter-cache-or-empty" : "openrouter-live"
        }
      });
      res.end();
    } catch (error) {
      console.error("Chat API Error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", error: error.message || "Failed to generate response" })}

`
      );
      res.end();
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYS] Server running on http://localhost:${PORT}`);
    console.log(`[SYS] WebSocket trace broadcaster active on /ws/debug`);
  });
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(
      request.url || "",
      `http://${request.headers.host}`
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
    let dgWs = null;
    let isDeepgramReady = false;
    let messageBuffer = [];
    let isVoiceSessionStarted = false;
    let usageInterval = null;
    const voiceStartedAt = Date.now();
    let lastUsageAt = voiceStartedAt;
    let clientInputBytes = 0;
    let deepgramOutputBytes = 0;
    const sendVoiceUsage = (sessions = 0) => {
      if (ws.readyState !== ws.OPEN) return;
      const now = Date.now();
      const deltaSeconds = Math.max(0, (now - lastUsageAt) / 1e3);
      const connectionSeconds = Math.max(0, (now - voiceStartedAt) / 1e3);
      lastUsageAt = now;
      ws.send(
        JSON.stringify({
          type: "usage",
          usage: {
            provider: "deepgram",
            voiceAgentModel: "Deepgram Voice Agent Standard",
            listenModel: language === "ja" || language === "ko" ? "flux-general-multi" : "flux-general-en",
            speakModel: "gpt-4o-mini-tts",
            ttsModel: "gpt-4o-mini-tts",
            connectionSeconds,
            inputAudioSeconds: clientInputBytes / PCM16_MONO_48K_BYTES_PER_SECOND,
            outputAudioSeconds: deepgramOutputBytes / PCM16_MONO_48K_BYTES_PER_SECOND,
            cost: voiceAgentCostForSeconds(deltaSeconds),
            estimated: false,
            sessions
          }
        })
      );
    };
    const parseVoiceAuth = (data, isBinary) => {
      if (isBinary) return null;
      const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
      try {
        const payload = JSON.parse(text);
        return payload?.type === "voice_auth" ? payload : null;
      } catch {
        return null;
      }
    };
    const startVoiceSession = (providedOpenRouterKey, selectedLanguage) => {
      if (isVoiceSessionStarted) return true;
      const openRouterKey = sanitizeApiKey(providedOpenRouterKey) || sanitizeApiKey(process.env.OPENROUTER_API_KEY);
      if (!openRouterKey) {
        ws.close(1008, "OpenRouter API key is required");
        return false;
      }
      const deepgramKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramKey) {
        ws.close(1011, "Deepgram API Key is missing");
        return false;
      }
      language = normalizeVoiceLanguage(selectedLanguage);
      isVoiceSessionStarted = true;
      usageInterval = setInterval(() => sendVoiceUsage(0), 1e3);
      try {
        const dgUrl = "wss://agent.deepgram.com/v1/agent/converse";
        console.log(`Connecting to Deepgram at: ${dgUrl}`);
        dgWs = new WSWebSocket(dgUrl, {
          headers: {
            Authorization: `Token ${deepgramKey}`
          }
        });
        dgWs.on("open", () => {
          const listenModel = language === "ja" || language === "ko" ? "flux-general-multi" : "flux-general-en";
          const listenProvider = {
            type: "deepgram",
            model: listenModel,
            version: "v2"
          };
          if (language === "ja" || language === "ko") {
            listenProvider.language_hints = ["en", "ja", "ko"];
          }
          let thinkPrompt = "You are an expert Computer Science and Programming tutor named Aria. You are currently helping a student who is studying technical material. Explain concepts like a senior engineer mentoring a junior developer. Use real-world analogies. Keep responses to 3-5 sentences. Never use bullet points, markdown, or code blocks \u2014 you are speaking out loud. Spell symbols verbally. End each reply with a follow-up question or offer to elaborate.";
          let greeting = "Hello! I am Aria, your CS tutor. What are you studying today?";
          if (language === "ja") {
            thinkPrompt = "\u3042\u306A\u305F\u306FAria\u3068\u3044\u3046\u540D\u524D\u306E\u512A\u79C0\u306A\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30B5\u30A4\u30A8\u30F3\u30B9\u304A\u3088\u3073\u30D7\u30ED\u30B0\u30E9\u30DF\u30F3\u30B0\u306E\u30C1\u30E5\u30FC\u30BF\u30FC\u3067\u3059\u3002\u73FE\u5728\u3001\u6280\u8853\u7684\u306A\u5185\u5BB9\u3092\u5B66\u7FD2\u3057\u3066\u3044\u308B\u5B66\u751F\u3092\u30B5\u30DD\u30FC\u30C8\u3057\u3066\u3044\u307E\u3059\u3002\u30B7\u30CB\u30A2\u30A8\u30F3\u30B8\u30CB\u30A2\u304C\u30B8\u30E5\u30CB\u30A2\u30C7\u30D9\u30ED\u30C3\u30D1\u30FC\u3092\u6307\u5C0E\u3059\u308B\u3088\u3046\u306B\u6982\u5FF5\u3092\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u73FE\u5B9F\u4E16\u754C\u306E\u4F8B\u3048\u8A71\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u56DE\u7B54\u306F3\u301C5\u6587\u306B\u6291\u3048\u3066\u304F\u3060\u3055\u3044\u3002\u97F3\u58F0\u3067\u306E\u5BFE\u8A71\u3067\u3042\u308B\u305F\u3081\u3001\u7B87\u6761\u66F8\u304D\u3001\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u3001\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306F\u7D76\u5BFE\u306B\u4F7F\u7528\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u8A18\u53F7\u306F\u8A00\u8449\u3067\u8AAC\u660E\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u6700\u5F8C\u306F\u5FC5\u305A\u6B21\u306E\u8CEA\u554F\u3092\u3059\u308B\u304B\u3001\u8A73\u3057\u304F\u8AAC\u660E\u3059\u308B\u3053\u3068\u3092\u63D0\u6848\u3057\u3066\u7D42\u3048\u3066\u304F\u3060\u3055\u3044\u3002\u5FC5\u305A\u65E5\u672C\u8A9E\u3067\u81EA\u7136\u306B\u4F1A\u8A71\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
            greeting = "\u3053\u3093\u306B\u3061\u306F\uFF01CS\u30C1\u30E5\u30FC\u30BF\u30FC\u306EAria\u3067\u3059\u3002\u4ECA\u65E5\u306F\u4F55\u3092\u52C9\u5F37\u3057\u307E\u3059\u304B\uFF1F";
          } else if (language === "ko") {
            thinkPrompt = "\uB2F9\uC2E0\uC740 Aria\uB77C\uB294 \uC774\uB984\uC758 \uC6B0\uC218\uD55C \uCEF4\uD4E8\uD130 \uACFC\uD559 \uBC0F \uD504\uB85C\uADF8\uB798\uBC0D \uD29C\uD130\uC785\uB2C8\uB2E4. \uD604\uC7AC \uAE30\uC220\uC801\uC778 \uB0B4\uC6A9\uC744 \uD559\uC2B5\uD558\uACE0 \uC788\uB294 \uD559\uC0DD\uC744 \uB3D5\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uC2DC\uB2C8\uC5B4 \uC5D4\uC9C0\uB2C8\uC5B4\uAC00 \uC8FC\uB2C8\uC5B4 \uAC1C\uBC1C\uC790\uB97C \uBA58\uD1A0\uB9C1\uD558\uB4EF\uC774 \uAC1C\uB150\uC744 \uC124\uBA85\uD574 \uC8FC\uC138\uC694. \uD604\uC2E4 \uC138\uACC4\uC758 \uBE44\uC720\uB97C \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694. \uB2F5\uBCC0\uC740 3~5\uBB38\uC7A5\uC73C\uB85C \uC81C\uD55C\uD574 \uC8FC\uC138\uC694. \uC74C\uC131\uC73C\uB85C \uB300\uD654 \uC911\uC774\uBBC0\uB85C \uAE00\uBA38\uB9AC \uAE30\uD638, \uB9C8\uD06C\uB2E4\uC6B4, \uCF54\uB4DC \uBE14\uB85D\uC740 \uC808\uB300 \uC0AC\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694. \uAE30\uD638\uB294 \uB9D0\uB85C \uC124\uBA85\uD574 \uC8FC\uC138\uC694. \uAC01 \uB2F5\uBCC0\uC758 \uB05D\uC5D0\uB294 \uD6C4\uC18D \uC9C8\uBB38\uC744 \uD558\uAC70\uB098 \uB354 \uC790\uC138\uD788 \uC124\uBA85\uD558\uACA0\uB2E4\uACE0 \uC81C\uC548\uD574 \uC8FC\uC138\uC694. \uBC18\uB4DC\uC2DC \uD55C\uAD6D\uC5B4\uB85C \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB300\uD654\uD574 \uC8FC\uC138\uC694.";
            greeting = "\uC548\uB155\uD558\uC138\uC694! CS \uD29C\uD130 Aria\uC785\uB2C8\uB2E4. \uC624\uB298 \uC5B4\uB5A4 \uB0B4\uC6A9\uC744 \uACF5\uBD80\uD558\uC2DC\uACA0\uC5B4\uC694?";
          }
          const config = {
            type: "Settings",
            audio: {
              input: {
                encoding: "linear16",
                sample_rate: 48e3
              },
              output: {
                encoding: "linear16",
                sample_rate: 48e3,
                container: "none"
              }
            },
            agent: {
              listen: {
                provider: listenProvider
              },
              think: {
                provider: {
                  type: "open_ai",
                  model: "gpt-4o-mini"
                },
                prompt: thinkPrompt
              },
              speak: {
                provider: {
                  type: "open_ai",
                  model: "gpt-4o-mini-tts"
                }
              },
              greeting
            }
          };
          console.log(
            "Sending Deepgram settings config:",
            JSON.stringify(config, null, 2)
          );
          dgWs?.send(JSON.stringify(config));
        });
        dgWs.on("unexpected-response", (req2, res) => {
          console.error(
            `Deepgram WS Unexpected Response: ${res.statusCode} ${res.statusMessage}`
          );
          console.error(
            "Deepgram Headers:",
            JSON.stringify(res.headers, null, 2)
          );
          if (res.statusCode === 404) {
            console.error(
              "This usually means the Deepgram API key does not have access to the Voice Agent API, or the endpoint is incorrect."
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
                if (parsed.type === "SettingsApplied" || parsed.type === "Welcome") {
                  isDeepgramReady = true;
                  messageBuffer.forEach((msg) => {
                    if (dgWs?.readyState === WSWebSocket.OPEN) {
                      dgWs.send(msg.data);
                    }
                  });
                  messageBuffer = [];
                }
              } catch (e) {
              }
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
    const forwardClientMessage = (data, isBinary) => {
      if (isBinary) {
        clientInputBytes += rawByteLength(data);
      }
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
            authPayload.language || language
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
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
