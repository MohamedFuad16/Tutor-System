// server.ts
import dotenv from "dotenv";
import express from "express";
import * as fs from "fs";
import path from "path";
import { spawn } from "child_process";
import compression from "compression";
import OpenAI from "openai";
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
  const explicit = /\b(search|web|browse|internet|google|look up)\b/.test(value);
  const fresh = /\b(latest|current|recent|today|yesterday|this week|this month|now|new|news|trend|trending|pricing|price|release|released|ranking|rankings|best .*20\d{2}|who won|score|game|election|weather)\b/.test(value);
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
var LEARNING_AGENT_MODEL = "deepseek/deepseek-chat";
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
    chapterSummary: assistantMessage.slice(0, 500) || userMessage.slice(0, 500),
    conversationSummary: assistantMessage.slice(0, 420) || userMessage.slice(0, 420),
    knowledgeSummary: `Recent tutoring discussion about ${conceptName}.`,
    conceptsLearned: [conceptName],
    risks: [],
    confidence: 0.45,
    concepts: [
      {
        name: conceptName,
        summary: assistantMessage.slice(0, 320) || userMessage.slice(0, 320) || "Learning topic discussed in chat.",
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
  app.use((req, res, next) => {
    if (!req.url.startsWith("/src/") && !req.url.startsWith("/node_modules/") && !req.url.startsWith("/@")) {
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });
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
    const status = active ? "running" : summary.status || completeEvent?.data?.status || (completeEvent ? "completed" : "unknown");
    return {
      ...summary,
      id,
      status,
      startedAt: summary.startedAt || startEvent?.timestamp || null,
      finishedAt: summary.finishedAt || completeEvent?.timestamp || null,
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
  app.get("/api/debug/runs", (_req, res) => {
    res.json({
      activeRunId: activeDebugJob?.id || null,
      runs: listDebugRuns()
    });
  });
  app.delete("/api/debug/runs", (_req, res) => {
    if (activeDebugJob) {
      activeDebugJob.child.kill("SIGTERM");
      persistDebugExit(activeDebugJob.id, null);
      activeDebugJob = null;
    }
    if (fs.existsSync(debugRunsDir)) {
      for (const entry of fs.readdirSync(debugRunsDir)) {
        fs.rmSync(path.join(debugRunsDir, entry), {
          recursive: true,
          force: true
        });
      }
    }
    res.json({ ok: true, deleted: true });
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
    const mode = req.body?.mode === "audit" ? "audit" : "fix";
    const scope = String(req.body?.scope || "all").replace(/[^a-zA-Z0-9_./:-]/g, "") || "all";
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
    if (!activeDebugJob || activeDebugJob.id !== safeId)
      return res.status(404).json({ error: "No active debug run with that id." });
    activeDebugJob.child.kill("SIGTERM");
    activeDebugJob = null;
    res.json({ ok: true, cancelled: safeId });
  });
  app.post("/api/debug/stop", (_req, res) => {
    if (!activeDebugJob) return res.json({ ok: true, stopped: null });
    const stopped = activeDebugJob.id;
    activeDebugJob.child.kill("SIGTERM");
    persistDebugExit(stopped, null);
    activeDebugJob = null;
    res.json({ ok: true, stopped });
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
        model: "deepseek/deepseek-chat",
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
  "chapterSummary": "chapter-level note that can be merged into the book",
  "conversationSummary": "one concise paragraph",
  "knowledgeSummary": "what the learner now appears to know",
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
CRITICAL RULE: You MUST dynamically generate a specific, highly relevant \`chapterTitle\` based strictly on what the user actually asked about in this message (e.g. "List Comprehensions", "Promises and Async/Await", "Calculus Integrals"). DO NOT use generic chapter titles like "Conversation Notes". If the current book already exists, prefer continuing it and adding/refining chapters. Do not invent advanced concepts absent from the conversation.`
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
        response_format: { type: "json_object" },
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
          const parsed = JSON.parse(message.content);
          if (parsed.cards) cards = parsed.cards;
        } catch (e) {
        }
      }
      res.json({ cards });
    } catch (error) {
      console.warn("[FLASHCARDS] Generation failed:", error);
      res.status(500).json({ error: "Failed to generate flashcards" });
    }
  });
  app.get("/api/tts", async (req, res) => {
    try {
      console.log(`[TTS] Request received for speech generation`);
      const text = req.query.text;
      if (!text) {
        return res.status(400).json({ error: "Text is required." });
      }
      const requestedVoice = typeof req.query.voice === "string" ? req.query.voice : "aura-asteria-en";
      const ttsModel = /^aura-[a-z0-9-]+-en$/i.test(requestedVoice) ? requestedVoice : "aura-asteria-en";
      const billedText = text.slice(0, 4e3);
      const inputCharacters = billedText.length;
      const estimatedCost = ttsCostForModel(ttsModel, inputCharacters);
      const deepgramKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramKey) throw new Error("Deepgram API Key is missing");
      const response = await fetch(
        `https://api.deepgram.com/v1/speak?model=${ttsModel}&encoding=mp3`,
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
        serperApiKey: bodySerperKey
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
      const requestedModel = aiModel || "deepseek/deepseek-chat";
      let usedModelForUsage = requestedModel;
      let inputTokens = 0;
      let outputTokens = 0;
      let usageEstimated = true;
      let webSources = [];
      const latestUserContent = [...messages || []].reverse().find((m) => m?.role === "user")?.content || "";
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
3. If the user asks for latest, current, recent, news, rankings, pricing, releases, trends, sports scores, or explicitly asks to search the web, use the \`web_search\` tool unless live web sources are already provided in the prompt. When using web sources, cite freshness-sensitive claims with compact references like [1] and [2]. Do not dump raw URLs in the answer body.`;
      if (customPrompt) {
        systemInstruction = `${customPrompt}

${systemInstruction}`;
      }
      if (memoryContext) {
        systemInstruction += `

${memoryContext}`;
      }
      const freshnessSearch = detectFreshnessSearch(latestUserContent);
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
            description: "Search the live web when the user needs current, recent, external, or freshness-sensitive information. Use news for headlines or events.",
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
      wssDebug.handleUpgrade(request, socket, head, (ws) => {
        wssDebug.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const openRouterKey = url.searchParams.get("openRouterKey") || process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      ws.close(1008, "OpenRouter API key is required");
      return;
    }
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      ws.close(1011, "Deepgram API Key is missing");
      return;
    }
    let dgWs = null;
    let isDeepgramReady = false;
    let messageBuffer = [];
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
            listenModel: "flux-general-en",
            speakModel: "aura-asteria-en",
            ttsModel: "aura-asteria-en",
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
    const usageInterval = setInterval(() => sendVoiceUsage(0), 1e3);
    try {
      const dgUrl = "wss://agent.deepgram.com/v1/agent/converse";
      console.log(`Connecting to Deepgram at: ${dgUrl}`);
      dgWs = new WSWebSocket(dgUrl, {
        headers: {
          Authorization: `Token ${deepgramKey}`
        }
      });
      dgWs.on("open", () => {
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
              provider: {
                type: "deepgram",
                model: "flux-general-en",
                version: "v2"
              }
            },
            think: {
              provider: {
                type: "open_ai",
                model: "gpt-4o-mini"
              },
              prompt: "You are an expert Computer Science and Programming tutor named Aria. You are currently helping a student who is studying technical material. Explain concepts like a senior engineer mentoring a junior developer. Use real-world analogies. Keep responses to 3-5 sentences. Never use bullet points, markdown, or code blocks \u2014 you are speaking out loud. Spell symbols verbally. End each reply with a follow-up question or offer to elaborate."
            },
            speak: {
              provider: {
                type: "deepgram",
                model: "aura-asteria-en"
              }
            },
            greeting: "Hello! I am Aria, your CS tutor. What are you studying today?"
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
      console.error("Failed to connect to Deepgram", e);
      ws.close(1011, "Failed to connect to Deepgram");
    }
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        clientInputBytes += rawByteLength(data);
      }
      if (isDeepgramReady && dgWs && dgWs.readyState === dgWs.OPEN) {
        dgWs.send(data);
      } else {
        messageBuffer.push({ data, isBinary });
      }
    });
    ws.on("close", () => {
      clearInterval(usageInterval);
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
