import dotenv from "dotenv";
dotenv.config();
import express from "express";
import * as fs from "fs";
import path from "path";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import OpenAI from "openai";
import { WebSocketServer, WebSocket as WSWebSocket } from "ws";
import {
  detectFreshnessSearch,
  formatSourcesForPrompt,
  searchSerper,
  searchSerperImages,
  type NormalizedWebSource,
  type WebSearchMode,
} from "./server/web-search";

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
const LEARNING_AGENT_MODEL = "deepseek/deepseek-chat";

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
    chapterSummary: assistantMessage.slice(0, 500) || userMessage.slice(0, 500),
    conversationSummary:
      assistantMessage.slice(0, 420) || userMessage.slice(0, 420),
    knowledgeSummary: `Recent tutoring discussion about ${conceptName}.`,
    conceptsLearned: [conceptName],
    risks: [],
    confidence: 0.45,
    concepts: [
      {
        name: conceptName,
        summary:
          assistantMessage.slice(0, 320) ||
          userMessage.slice(0, 320) ||
          "Learning topic discussed in chat.",
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Log incoming requests for the Admin Server Console
  app.use((req, res, next) => {
    if (
      !req.url.startsWith("/src/") &&
      !req.url.startsWith("/node_modules/") &&
      !req.url.startsWith("/@")
    ) {
      console.log(`[HTTP] ${req.method} ${req.url}`);
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

  const debugRunsDir = path.join(process.cwd(), "brain/debug/runs");
  let activeDebugJob: {
    id: string;
    child: ChildProcessWithoutNullStreams;
  } | null = null;

  const readJsonFile = (file: string) => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  };

  const writeJsonFile = (file: string, value: unknown) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  };

  const readDebugEvents = (runDir: string) => {
    const eventsPath = path.join(runDir, "events.ndjson");
    if (!fs.existsSync(eventsPath)) return [];
    return fs
      .readFileSync(eventsPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  };

  const readDebugComponents = (runDir: string, summary: any = {}) => {
    const componentsDir = path.join(runDir, "components");
    const componentFiles = fs.existsSync(componentsDir)
      ? fs
          .readdirSync(componentsDir)
          .filter((file) => file.endsWith(".json"))
          .map((file) => readJsonFile(path.join(componentsDir, file)))
          .filter(Boolean)
      : [];
    const storedComponents = Array.isArray(summary.components)
      ? summary.components
      : [];
    return (componentFiles.length ? componentFiles : storedComponents).sort(
      (a: any, b: any) =>
        String(a.finishedAt || a.timestamp || "").localeCompare(
          String(b.finishedAt || b.timestamp || ""),
        ),
    );
  };

  const summarizeDebugRun = (id: string) => {
    const runDir = path.join(debugRunsDir, id);
    const summary =
      readJsonFile(path.join(runDir, "summary.json")) ||
      readJsonFile(path.join(runDir, "run.json")) ||
      {};
    const events = readDebugEvents(runDir);
    const components = readDebugComponents(runDir, summary);
    const startEvent = events.find(
      (event: any) => event.type === "run-started",
    );
    const completeEvent = [...events]
      .reverse()
      .find((event: any) => event.type === "run-completed");
    const active = activeDebugJob?.id === id;
    const status = active
      ? "running"
      : summary.status ||
        completeEvent?.data?.status ||
        (completeEvent ? "completed" : "unknown");

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
        summary.changedCount ??
          components.filter((item: any) => item.changed).length,
      ),
      activeTarget: active ? summary.activeTarget || null : null,
      components,
      events: events.slice(-160),
    };
  };

  const seedDebugRun = (runId: string, mode: string, scope: string) => {
    const now = new Date().toISOString();
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
      unresolvedRisks: [],
    };
    writeJsonFile(path.join(runDir, "summary.json"), seed);
    writeJsonFile(path.join(runDir, "run.json"), seed);
    fs.appendFileSync(
      path.join(runDir, "events.ndjson"),
      `${JSON.stringify({
        timestamp: now,
        type: "run-queued",
        message: `Debug run ${runId} queued by Admin`,
        data: { id: runId, mode, scope },
      })}\n`,
    );
  };

  const persistDebugExit = (runId: string, code: number | null) => {
    const runDir = path.join(debugRunsDir, runId);
    if (!fs.existsSync(runDir)) return;
    const current = summarizeDebugRun(runId) as any;
    if (current.status !== "running" && current.status !== "unknown") return;
    const { events: _events, ...persistable } = current;
    const finished = {
      ...persistable,
      status: code === 0 ? "completed" : "failed-process",
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeTarget: null,
    };
    writeJsonFile(path.join(runDir, "summary.json"), finished);
    writeJsonFile(path.join(runDir, "run.json"), finished);
  };

  const listDebugRuns = () => {
    if (!fs.existsSync(debugRunsDir)) return [];
    return fs
      .readdirSync(debugRunsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
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
          changedCount: summary.changedCount || 0,
        };
      })
      .sort((a, b) =>
        String(b.startedAt || b.id).localeCompare(String(a.startedAt || a.id)),
      );
  };

  app.get("/api/debug/runs", (_req, res) => {
    res.json({
      activeRunId: activeDebugJob?.id || null,
      runs: listDebugRuns(),
    });
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
        activeRunId: activeDebugJob.id,
      });
    const mode = req.body?.mode === "audit" ? "audit" : "fix";
    const scope =
      String(req.body?.scope || "all").replace(/[^a-zA-Z0-9_./:-]/g, "") ||
      "all";
    const runId = `debug-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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
        runId,
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    activeDebugJob = { id: runId, child };
    console.log(`[DEBUG] Started ${runId} (${mode}, ${scope})`);
    child.stdout.on("data", (data) =>
      console.log(`[DEBUG:${runId}] ${String(data).trim()}`),
    );
    child.stderr.on("data", (data) =>
      console.warn(`[DEBUG:${runId}] ${String(data).trim()}`),
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
      return res
        .status(404)
        .json({ error: "No active debug run with that id." });
    activeDebugJob.child.kill("SIGTERM");
    activeDebugJob = null;
    res.json({ ok: true, cancelled: safeId });
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

  // API Route to Generate Title
  // Image search for the voice agent's show_image function — returns a handful
  // of candidate images so the client can pick the first that loads.
  app.get("/api/image-search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        return res.status(400).json({ error: "Query 'q' is required." });
      }
      const serperKey =
        sanitizeApiKey(req.headers["x-serper-api-key"]) ||
        sanitizeApiKey(process.env.SERPER_API_KEY);
      if (!serperKey) {
        return res
          .status(400)
          .json({ error: "Image search is not configured." });
      }
      const images = await searchSerperImages(q, 8, serperKey);
      res.json({ images });
    } catch (error: any) {
      console.error("Image search error:", error?.message || error);
      res.status(502).json({ error: "Image search failed." });
    }
  });

  // Converts a plain-language diagram description into valid Mermaid code. The
  // voice agent never handles Mermaid itself (so it can never read code aloud) —
  // it only sends a natural-language `spec` here, and this endpoint produces the
  // actual diagram syntax.
  app.post("/api/generate-mermaid", async (req, res) => {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res
          .status(401)
          .json({ error: "OpenRouter API key is required." });
      }
      const spec = String(req.body?.spec || "").trim();
      if (!spec) {
        return res.status(400).json({ error: "spec is required." });
      }

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
      });

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You convert a description of a concept into a single clean Mermaid diagram. " +
              "Rules: Output ONLY raw Mermaid code — no markdown fences, no prose, no explanation. " +
              "Prefer 'flowchart TD' (use 'flowchart LR' for short linear pipelines, or 'sequenceDiagram' for interactions over time). " +
              "Use clear, human-readable node labels (e.g. Chat Server, Load Balancer, Message Queue) since these labels are what the learner sees and hears about. " +
              "Keep it focused: 4-10 nodes, concise labels, no styling/classDef, no comments. Ensure the syntax is valid Mermaid that renders without errors.",
          },
          {
            role: "user",
            content: `Create a diagram for: ${spec.slice(0, 1500)}`,
          },
        ],
      });

      let mermaid = completion.choices?.[0]?.message?.content || "";
      // Strip any accidental code fences or leading language hints.
      mermaid = mermaid
        .replace(/```(?:mermaid)?/gi, "")
        .replace(/```/g, "")
        .trim();
      if (!mermaid) {
        return res.status(502).json({ error: "Empty diagram." });
      }
      res.json({ mermaid });
    } catch (error: any) {
      console.error("generate-mermaid error:", error?.message || error);
      res.status(502).json({ error: "Diagram generation failed." });
    }
  });

  app.post("/api/title", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        return res
          .status(401)
          .json({ error: "OpenRouter API key is required." });
      }

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      const { image, text } = req.body;

      if (!image && !text) {
        return res.status(400).json({ error: "Image or text is required." });
      }

      const response = text
        ? await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You generate a very short (2-5 words) specific title summarizing the topic of a conversation. Output ONLY the title, with no quotes or punctuation.",
              },
              {
                role: "user",
                content: String(text).slice(0, 4000),
              },
            ],
          })
        : await openai.chat.completions.create({
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
      const authHeader = req.headers.authorization;
      const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey)
        return res
          .status(401)
          .json({ error: "OpenRouter API key is required." });

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
              "You are an expert prompt engineer. The user will give you a brief description of a persona for an AI Tutor. Write a highly detailed, professional System Prompt (in the first person or direct instruction) that the AI should follow to embody this persona. The output MUST ONLY be the raw system prompt text, nothing else. No prefixes like 'Here is the prompt'.",
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
    try {
      const authHeader = req.headers.authorization;
      const bearerMatch = (authHeader || "").match(/^Bearer\s+(.+)$/i);
      const headerKey = bearerMatch ? bearerMatch[1].trim() : "";
      const apiKey = headerKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey)
        return res
          .status(401)
          .json({ error: "OpenRouter API key is required." });

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      const { action, payload } = req.body;

      const response = await openai.chat.completions.create({
        model: "deepseek/deepseek-chat",
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

      res.json({ explanation: response.choices[0]?.message?.content?.trim() });
    } catch (error: any) {
      console.error("Trace API Error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to generate trace" });
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
        error: "OpenRouter API key is required for learning book updates.",
      });
    }

    const userMessage = String(body.userMessage || "").slice(0, 8000);
    const assistantMessage = String(body.assistantMessage || "").slice(
      0,
      12000,
    );
    if (!userMessage && !assistantMessage) {
      return res.status(400).json({ error: "Conversation text is required." });
    }

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
CRITICAL RULE: You MUST dynamically generate a specific, highly relevant \`chapterTitle\` based strictly on what the user actually asked about in this message (e.g. "List Comprehensions", "Promises and Async/Await", "Calculus Integrals"). DO NOT use generic chapter titles like "Conversation Notes". If the current book already exists, prefer continuing it and adding/refining chapters. Do not invent advanced concepts absent from the conversation.`,
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
              assistantMessage,
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      const parsed = extractJsonObject(content);
      res.json({
        ...parsed,
        userName: parsed.userName || body.userName || "Learner",
        bookTitle: parsed.bookTitle || body.activeProject || "General Study",
        model: LEARNING_AGENT_MODEL,
      });
    } catch (error) {
      console.warn(
        "[LEARNING_BOOK] DeepSeek update failed, using safe fallback:",
        error instanceof Error ? error.message : error,
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

    const content = String(body.content || "").slice(0, 8000);
    if (!content) {
      return res.status(400).json({ error: "Content is required." });
    }

    try {
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
                        back: { type: "string" },
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
          const parsed = JSON.parse(message.content);
          if (parsed.cards) cards = parsed.cards;
        } catch (e) {}
      }

      res.json({ cards });
    } catch (error) {
      console.warn("[FLASHCARDS] Generation failed:", error);
      res.status(500).json({ error: "Failed to generate flashcards" });
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
          : "aura-asteria-en";
      const ttsModel = /^aura-[a-z0-9-]+-en$/i.test(requestedVoice)
        ? requestedVoice
        : "aura-asteria-en";
      const billedText = text.slice(0, 4000);
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
    // Enable SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
      const authHeader = req.headers.authorization || "";
      // Robustly extract Bearer token: match "Bearer <token>" and extract <token>
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
      } = req.body;
      const serperRuntimeKey =
        sanitizeApiKey(req.headers["x-serper-api-key"]) ||
        sanitizeApiKey(bodySerperKey) ||
        sanitizeApiKey(process.env.SERPER_API_KEY);

      if (!apiKey) {
        sendEvent("error", {
          error: "OpenRouter API key is required. Please set it in Settings.",
        });
        return res.end();
      }

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
      });

      const requestedModel = aiModel || "deepseek/deepseek-chat";
      let usedModelForUsage = requestedModel;
      let inputTokens = 0;
      let outputTokens = 0;
      let usageEstimated = true;
      let webSources: NormalizedWebSource[] = [];
      const latestUserContent =
        [...(messages || [])].reverse().find((m: any) => m?.role === "user")
          ?.content || "";
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
        const searchId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

IMPORTANT TOOL USAGE INSTRUCTIONS:
1. If the user asks questions about "the current page", "this chapter", "the document", "the screen", or asks you to explain something visible in what they are reading, use the provided screenshot context when present. If you need an additional page inspection and the \`look_at_current_page\` tool is available, call it. Do NOT claim you cannot see the screen when screenshot context is attached.
2. If the user requests flashcards, active recall questions, or revision cards, YOU MUST forcefully use the \`generate_flashcards\` tool to create them. NEVER simply write out the flashcards in text. ALWAYS use the tool. Start your message slightly confirming you generated them and suggest they navigate to the Revision tab.
3. If the user asks for latest, current, recent, news, rankings, pricing, releases, trends, sports scores, or explicitly asks to search the web, use the \`web_search\` tool unless live web sources are already provided in the prompt. When using web sources, cite freshness-sensitive claims with compact references like [1] and [2]. Do not dump raw URLs in the answer body.`;

      if (customPrompt) {
        systemInstruction = `${customPrompt}\n\n${systemInstruction}`;
      }

      if (memoryContext) {
        systemInstruction += `\n\n${memoryContext}`;
      }

      // Eager vision prefetch removed. Vision tool look_at_current_page is registered if currentPageImage is present.

      const freshnessSearch = detectFreshnessSearch(latestUserContent);
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
              "Search the live web when the user needs current, recent, external, or freshness-sensitive information. Use news for headlines or events.",
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
      const MAX_ITERATIONS = 5;
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
            stream = await openai.chat.completions.create({
              model: model,
              messages: formattedMessages as any,
              tools: tools,
              stream: true,
              stream_options: { include_usage: true } as any,
            } as any);
            usedModel = model;
            usedModelForUsage = model;
            if (iterations === 0 && model !== primaryModel) {
              console.log(
                `[CHAT] Primary model "${primaryModel}" unavailable, fell back to "${model}"`,
              );
              sendEvent("info", {
                message: `Model ${primaryModel} unavailable — using ${model}`,
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
          const functionName = toolCall.function.name;
          const functionArguments = toolCall.function.arguments;

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
            } catch (err: any) {
              console.error("Vision Error:", err);
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error: Could not analyze the page image.",
              });
            }
          } else if (functionName === "web_search") {
            try {
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
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Search temporarily unavailable.",
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
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error parsing arguments.",
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
            } catch (e) {
              formattedMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Error parsing arguments.",
              });
            }
          } else {
            formattedMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Unsupported tool.",
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
      console.error("Chat API Error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", error: error.message || "Failed to generate response" })}\n\n`,
      );
      res.end();
    }
  });

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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SYS] Server running on http://localhost:${PORT}`);
    console.log(`[SYS] WebSocket trace broadcaster active on /ws/debug`);
  });

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
      wssDebug.handleUpgrade(request, socket, head, (ws) => {
        wssDebug.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    // Extract openRouterKey from query params
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const openRouterKey =
      url.searchParams.get("openRouterKey") || process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      ws.close(1008, "OpenRouter API key is required");
      return;
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      ws.close(1011, "Deepgram API Key is missing");
      return;
    }
    let dgWs: WSWebSocket | null = null;
    let isDeepgramReady = false;
    let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
    let messageBuffer: Array<{ data: any; isBinary: boolean }> = [];
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
            listenModel: "flux-general-en",
            speakModel: "aura-asteria-en",
            ttsModel: "aura-asteria-en",
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

    const usageInterval = setInterval(() => sendVoiceUsage(0), 1000);

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
              provider: {
                type: "deepgram",
                model: "flux-general-en",
                version: "v2",
                // Require higher confidence before ending the user's turn so the
                // agent waits a beat longer instead of cutting off mid-thought.
                eot_threshold: 0.8,
                // Allow longer natural pauses before forcing end-of-turn.
                eot_timeout_ms: 8000,
              },
            },
            think: {
              provider: {
                type: "open_ai",
                model: "gpt-4o-mini",
              },
              prompt:
                "You are an expert Computer Science and Programming tutor named Aria. You are currently helping a student who is studying technical material. Explain concepts like a senior engineer mentoring a junior developer. Use real-world analogies. Keep responses to 3-5 sentences. Never use bullet points, markdown, or code blocks — you are speaking out loud. Spell symbols verbally. End each reply with a follow-up question or offer to elaborate. " +
                "Be a visual-first teacher who actually DRAWS things, not just talks about them. The render_diagram and show_image functions are the ONLY way anything appears on the learner's screen. If you describe a diagram, its boxes, or its steps without calling render_diagram, the learner sees a blank screen — that is a failure. So whenever a concept lands better visually — any process, flow, architecture, hierarchy, sequence of steps, relationship, comparison, or anything spatial/structural — you MUST call render_diagram; and whenever a real photo, picture, or illustration would help, you MUST call show_image. Do this proactively, on your own initiative, without being asked. " +
                "HARD RULES, follow exactly: (1) The moment you decide to teach something visually, calling the function is MANDATORY and must be the FIRST thing you do that turn, before you explain any part of it. (2) NEVER narrate, walk through, or reference the steps/parts of a diagram unless you have actually called render_diagram in this very same turn — talking through a diagram you didn't draw is forbidden. (3) You may say ONE short, warm lead-in sentence so you're not silent while it loads (e.g. 'Let me show you this so it's crystal clear — one sec.'), but the function call must still happen in that same turn. " +
                "For render_diagram you NEVER write diagram code of any kind. You only fill in 'spec' with a plain-English description of what the diagram should show, and 'steps' with the sentences you will speak about each part. The system turns your description into the picture for you. After the visual appears, narrate the walkthrough by speaking each step's caption in order, mentioning each part by its plain name so the screen highlights whatever you're describing. Use show_image for real-world imagery and render_diagram for structural/relational visuals. Only skip visuals for simple one-line factual answers where a picture genuinely adds nothing. " +
                "When your answer involves SEVERAL images shown in sequence — a story, a timeline, a step-by-step process, or anything where pictures should appear one after another — do NOT fire multiple show_image calls (that dumps every image on screen at once). Instead call show_images ONCE with the ordered list of {query, caption} items, then narrate the captions out loud in that exact order: the screen reveals each image precisely as you speak its caption, so it advances step by step in sync with your story. " +
                "CRITICAL — you are speaking out loud to a person. NEVER read code, syntax, or markup aloud. Never say words like 'Mermaid', 'flowchart', 'graph TD', 'node', 'arrow', 'syntax', or 'code', and never speak symbols like '-->', brackets, or ids. Never describe the mechanics of building or generating the visual. Out loud you only ever give the natural, human explanation of the concept itself — talk about the ideas the boxes represent, never the drawing or anything technical behind it. " +
                "When you have finished teaching with a visual and the conversation moves on to something it no longer helps with, call clear_diagram to remove whatever diagram or image is showing so the conversation returns to normal.",
              functions: [
                {
                  name: "render_diagram",
                  description:
                    "Draw a diagram on the learner's screen to teach a concept visually. You do NOT write any diagram code — you only describe, in plain English, what the diagram should show; the system turns your description into the picture. Call this whenever a visual would help, then narrate the parts in order.",
                  parameters: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "Short title for the diagram (3-6 words).",
                      },
                      spec: {
                        type: "string",
                        description:
                          "A plain-English description of the diagram to draw: the components/steps/entities and how they connect or flow. Example: 'WhatsApp high-level architecture: mobile and web clients connect to a load balancer, which routes to chat servers; chat servers push to a message queue and read/write a database, and use a notification service for offline users.' Do NOT write Mermaid or any code here — just describe it.",
                      },
                      steps: {
                        type: "array",
                        description:
                          "Ordered walkthrough captions. Each is a sentence you will speak aloud about one part of the diagram, in the order you will say them. The screen highlights whatever you are describing as you speak.",
                        items: {
                          type: "object",
                          properties: {
                            caption: {
                              type: "string",
                              description:
                                "A sentence you will speak aloud about this part. Mention the component by its plain name (e.g. 'the load balancer') so the screen can highlight it.",
                            },
                          },
                          required: ["caption"],
                        },
                      },
                    },
                    required: ["spec"],
                  },
                },
                {
                  name: "show_image",
                  description:
                    "Fetch a real image from the internet and show it on the learner's screen to aid understanding (a real-world object, place, person, device, scientific/anatomical image, screenshot, etc.). Call this when an actual photo or illustration helps more than a drawn diagram, then describe what is shown.",
                  parameters: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description:
                          "Focused image search query, e.g. 'Alan Turing portrait' or 'human heart anatomy labeled diagram'.",
                      },
                      caption: {
                        type: "string",
                        description:
                          "Short caption describing what the image shows (3-10 words).",
                      },
                    },
                    required: ["query"],
                  },
                },
                {
                  name: "show_images",
                  description:
                    "Show an ORDERED SEQUENCE of real internet images that the learner should see one at a time, in step with your narration — perfect for stories, timelines, processes, or any multi-part explanation. Call this ONCE with all the steps in order; the screen reveals each image exactly when you speak its caption, so you must then narrate the captions out loud in the same order. Do NOT call show_image multiple times for a sequence — use this instead so the images don't all appear at once.",
                  parameters: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        description:
                          "The ordered images. The learner sees item 1 first, then each next item as you speak its caption.",
                        items: {
                          type: "object",
                          properties: {
                            query: {
                              type: "string",
                              description:
                                "Focused image search query for this step.",
                            },
                            caption: {
                              type: "string",
                              description:
                                "The sentence you will speak aloud while this image is shown. The screen advances to this image when your speech matches it, so keep it distinctive.",
                            },
                          },
                          required: ["query", "caption"],
                        },
                      },
                    },
                    required: ["items"],
                  },
                },
                {
                  name: "clear_diagram",
                  description:
                    "Remove the diagram or image currently shown on the learner's screen and return to the normal conversation view. Call this once you have finished explaining a visual and are moving on to a topic where it is no longer relevant.",
                  parameters: {
                    type: "object",
                    properties: {},
                  },
                },
              ],
            },
            speak: {
              provider: {
                type: "deepgram",
                model: "aura-asteria-en",
              },
            },
            // No greeting — the learner speaks first.
          },
        };
        console.log(
          "Sending Deepgram settings config:",
          JSON.stringify(config, null, 2),
        );
        dgWs?.send(JSON.stringify(config));

        // Deepgram closes idle sockets. While the agent is speaking the client
        // stops streaming mic audio, so without a heartbeat the connection
        // drops mid-conversation ("suddenly turns off"). Send KeepAlive every
        // 7s to hold the session open regardless of audio flow.
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        keepAliveInterval = setInterval(() => {
          if (dgWs && dgWs.readyState === WSWebSocket.OPEN) {
            dgWs.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 7000);
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
                    dgWs.send(
                      msg.isBinary ? msg.data : msg.data.toString(),
                      { binary: msg.isBinary },
                    );
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
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        if (ws.readyState === ws.OPEN) {
          sendVoiceUsage(1);
          ws.close();
        }
      });

      dgWs.on("error", (error) => {
        console.error("Deepgram WS Error:", error);
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
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
      // Proxy messages to Deepgram once ready. Preserve the frame type:
      // binary audio stays binary, text control messages (e.g.
      // InjectUserMessage) must be sent as text so Deepgram parses them.
      if (isDeepgramReady && dgWs && dgWs.readyState === dgWs.OPEN) {
        dgWs.send(isBinary ? data : data.toString(), { binary: isBinary });
      } else {
        messageBuffer.push({ data, isBinary });
      }
    });

    ws.on("close", () => {
      clearInterval(usageInterval);
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
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
