/**
 * Composition root: builds every provider and service once and wires them
 * together. Routes and the voice gateway receive this context instead of
 * importing singletons, which keeps them testable with mock providers.
 */
import type { AppConfig } from "./config.js";
import { EventHub } from "./lib/events.js";
import { metrics } from "./lib/metrics.js";
import { createDeepgram, type SpeechProvider } from "./providers/deepgram.js";
import type { LlmProvider } from "./providers/llm.js";
import { createMockLlm, createMockSpeech } from "./providers/mock.js";
import { createSearch, type Search } from "./providers/search.js";
import { ZaiProvider } from "./providers/zai.js";
import { createGuideService } from "./services/guide.js";
import { createIngestService } from "./services/ingest.js";
import { createLearningService } from "./services/learning.js";
import { createTutor } from "./services/tutor.js";
import { createStore, type Store } from "./store/index.js";
import { createVoiceGateway } from "./voice/gateway.js";

export type ContextOverrides = {
  store?: Store;
  llm?: LlmProvider;
  speech?: SpeechProvider | null;
  search?: Search;
};

export function createContext(config: AppConfig, overrides: ContextOverrides = {}) {
  const store = overrides.store ?? createStore(config.dataDir);
  const llm: LlmProvider =
    overrides.llm ??
    (config.llm.provider === "zai" && config.llm.apiKey
      ? new ZaiProvider({
          apiKey: config.llm.apiKey,
          baseUrl: config.llm.baseUrl,
          models: { fast: config.llm.fastModel, smart: config.llm.smartModel, vision: config.llm.visionModel },
          concurrency: {
            fast: config.llm.fastConcurrency,
            smart: config.llm.smartConcurrency,
            vision: config.llm.visionConcurrency,
          },
          timeoutMs: config.llm.requestTimeoutMs,
          maxRetries: config.llm.maxRetries,
        })
      : createMockLlm());
  const speechProvider = (process.env.SPEECH_PROVIDER ?? "").toLowerCase();
  const speech: SpeechProvider | null =
    overrides.speech !== undefined
      ? overrides.speech
      : speechProvider === "mock"
        ? createMockSpeech()
        : config.speech.deepgramKey
          ? createDeepgram({
              apiKey: config.speech.deepgramKey,
              sttModel: config.speech.sttModel,
              sttMultilingualModel: config.speech.sttMultilingualModel,
              ttsVoice: config.speech.ttsVoice,
              eotThreshold: config.speech.eotThreshold,
              eagerEotThreshold: config.speech.eagerEotThreshold,
            })
          : null;
  const search =
    overrides.search ?? createSearch({ serperKey: config.search.serperKey, cacheTtlMs: config.search.cacheTtlMs });
  const events = new EventHub();

  const guide = createGuideService({
    store,
    llm,
    events,
    debounceMs: config.guide.debounceMs,
    maxPendingMessages: config.guide.maxPendingMessages,
  });
  const tutor = createTutor({
    store,
    llm,
    search,
    onTurnComplete: (userId, bookId, language) => guide.noteActivity(userId, bookId, language),
  });
  const ingest = createIngestService({ store, llm, events });
  const learning = createLearningService({ store, llm });
  const voice = createVoiceGateway({
    store,
    llm,
    search,
    speech,
    outputSampleRate: config.speech.ttsSampleRate,
    maxSessionMinutes: config.speech.maxSessionMinutes,
    allowedOrigins: config.allowedOrigins,
    onTurnComplete: (userId, bookId, language) => guide.noteActivity(userId, bookId, language),
  });

  // Persist per-learner model usage for analytics and cost tracking.
  const unsubscribeUsage = metrics.onLlmCall((record) => store.activity.recordLlmUsage(record));

  return {
    config,
    store,
    llm,
    speech,
    search,
    events,
    guide,
    tutor,
    ingest,
    learning,
    voice,
    shutdown() {
      unsubscribeUsage();
      guide.stop();
      voice.closeAll();
      store.close();
    },
  };
}

export type AppContext = ReturnType<typeof createContext>;
