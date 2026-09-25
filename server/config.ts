/**
 * Single source of truth for runtime configuration. Everything the server
 * reads from the environment is parsed, defaulted and validated here, once.
 */
import "dotenv/config";
import path from "node:path";

const str = (name: string, fallback = "") => (process.env[name] ?? "").trim() || fallback;

const int = (name: string, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const raw = Number.parseInt(str(name), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
};

const list = (name: string) =>
  str(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const env = str("NODE_ENV", "development");
  return {
    env,
    isProduction: env === "production",
    port: int("PORT", 3000, 1, 65535),
    host: str("HOST", "0.0.0.0"),
    dataDir: path.resolve(str("DATA_DIR", "./data")),
    /** Browser origins allowed to open cross-origin API and voice connections. */
    allowedOrigins: list("ALLOWED_ORIGINS"),
    /** Optional shared access code; when set every API call must present it. */
    accessCode: str("ACCESS_CODE"),

    llm: {
      /** "zai" talks to Z.AI; "mock" is a deterministic offline provider for dev/tests. */
      provider: (str("LLM_PROVIDER") || (str("ZAI_API_KEY") ? "zai" : "mock")) as "zai" | "mock",
      apiKey: str("ZAI_API_KEY"),
      /**
       * Pay-as-you-go endpoint by default. The GLM Coding Plan endpoint
       * (https://api.z.ai/api/coding/paas/v4) only accepts Coding Plan keys,
       * and Z.AI's plan terms limit those keys to supported coding tools.
       */
      baseUrl: str("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4").replace(/\/+$/, ""),
      /** Low-latency model: typed chat and the live voice foreground. */
      fastModel: str("ZAI_FAST_MODEL", "glm-5.3-flash"),
      /** Strongest model: delegated background work, study-guide synthesis, deep answers. */
      smartModel: str("ZAI_SMART_MODEL", "glm-5.3"),
      /** Multimodal model for scanned pages and figures (GLM-5.3-Flash is natively multimodal). */
      visionModel: str("ZAI_VISION_MODEL", "glm-5.3-flash"),
      fastConcurrency: int("ZAI_FAST_CONCURRENCY", 3, 1, 64),
      smartConcurrency: int("ZAI_SMART_CONCURRENCY", 2, 1, 64),
      visionConcurrency: int("ZAI_VISION_CONCURRENCY", 1, 1, 16),
      requestTimeoutMs: int("ZAI_TIMEOUT_MS", 90_000, 5_000, 600_000),
      maxRetries: int("ZAI_MAX_RETRIES", 3, 0, 8),
    },

    speech: {
      deepgramKey: str("DEEPGRAM_API_KEY"),
      /** Streaming STT model. flux-general-en has native turn detection (English). */
      sttModel: str("VOICE_STT_MODEL", "flux-general-en"),
      /** Fallback STT for non-English sessions (Flux is English-only). */
      sttMultilingualModel: str("VOICE_STT_MULTILINGUAL_MODEL", "nova-3"),
      ttsVoice: str("VOICE_TTS_VOICE", "aura-2-thalia-en"),
      ttsSampleRate: int("VOICE_TTS_SAMPLE_RATE", 24_000, 8_000, 48_000),
      /** Flux end-of-turn confidence; higher waits longer before replying. */
      eotThreshold: Number(str("VOICE_EOT_THRESHOLD", "0.75")) || 0.75,
      /** Flux eager end-of-turn threshold (speculative reply start). 0 disables. */
      eagerEotThreshold: Number(str("VOICE_EAGER_EOT_THRESHOLD", "0.5")) || 0,
      maxSessionMinutes: int("VOICE_MAX_SESSION_MINUTES", 30, 1, 240),
    },

    search: {
      serperKey: str("SERPER_API_KEY"),
      braveKey: str("BRAVE_API_KEY"),
      cacheTtlMs: int("SEARCH_CACHE_TTL_MS", 15 * 60_000, 0),
    },

    limits: {
      uploadMaxMb: int("UPLOAD_MAX_MB", 60, 1, 500),
      /** Per-user LLM request budget per minute (token bucket). */
      userRequestsPerMinute: int("USER_REQUESTS_PER_MINUTE", 30, 1, 10_000),
    },

    guide: {
      /** Idle time after the last exchange before the study guide re-syncs. */
      debounceMs: int("GUIDE_DEBOUNCE_MS", 12_000, 0, 600_000),
      /** Force a sync after this many unsynced messages even without idle time. */
      maxPendingMessages: int("GUIDE_MAX_PENDING_MESSAGES", 8, 1, 200),
    },
  };
}

export const config = loadConfig();
