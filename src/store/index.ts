import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Message } from '../types';

export type ViewState = 'study' | 'brain' | 'analytics' | 'revision' | 'admin';

export interface Concept {
  id: string;
  name: string;
  confidence: number;
  description: string;
  related: string[];
  project: string;
}

export interface Annotation {
  id: string;
  pageNumber: number;
  rects: { x: number; y: number; width: number; height: number; pageIndex: number }[];
  text: string;
  color: string;
  note?: string;
  type?: 'highlight' | 'underline' | 'strikethrough' | 'sticky';
}

export interface ChatUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  estimated: boolean;
  requests: number;
}

export interface WebUsage {
  provider: string;
  requests: number;
  searchRequests: number;
  newsRequests: number;
  sourcesReviewed: number;
  failures: number;
  cost: number;
  estimated: boolean;
}

export interface VoiceUsage {
  provider: string;
  voiceAgentModel: string;
  ttsModel: string;
  listenModel: string;
  speakModel: string;
  connectionSeconds: number;
  inputAudioSeconds: number;
  outputAudioSeconds: number;
  ttsCharacters: number;
  cost: number;
  estimated: boolean;
  sessions: number;
}

export interface PricingState {
  openRouterModels: Record<string, { prompt: number; completion: number; name?: string }>;
  deepgram: {
    voiceAgentPerMinute: number;
    aura1Per1kCharacters: number;
    aura2Per1kCharacters: number;
    fluxEnglishPerHour?: number;
  };
  fetchedAt: string | null;
  source: string;
  stale: boolean;
}

export type WebSearchMode = 'search' | 'news';

export interface NormalizedWebSource {
  id: string;
  type: WebSearchMode;
  title: string;
  url: string;
  domain: string;
  faviconUrl: string;
  snippet: string;
  date?: string;
  position: number;
}

export interface WebSearchEvent {
  id: string;
  type: 'started' | 'progress' | 'result' | 'complete' | 'error';
  searchId: string;
  query?: string;
  mode?: WebSearchMode;
  status?: string;
  source?: NormalizedWebSource;
  sources?: NormalizedWebSource[];
  timestamp: number;
}

const emptyChatUsage: ChatUsage = {
  provider: 'openrouter',
  model: 'deepseek/deepseek-chat',
  inputTokens: 0,
  outputTokens: 0,
  cost: 0,
  estimated: false,
  requests: 0,
};

const emptyWebUsage: WebUsage = {
  provider: 'serper',
  requests: 0,
  searchRequests: 0,
  newsRequests: 0,
  sourcesReviewed: 0,
  failures: 0,
  cost: 0,
  estimated: true,
};

const emptyVoiceUsage: VoiceUsage = {
  provider: 'deepgram',
  voiceAgentModel: 'Deepgram Voice Agent',
  ttsModel: 'aura-asteria-en',
  listenModel: 'flux-general-en',
  speakModel: 'aura-asteria-en',
  connectionSeconds: 0,
  inputAudioSeconds: 0,
  outputAudioSeconds: 0,
  ttsCharacters: 0,
  cost: 0,
  estimated: false,
  sessions: 0,
};

const emptyPricing: PricingState = {
  openRouterModels: {},
  deepgram: {
    voiceAgentPerMinute: 0.075,
    aura1Per1kCharacters: 0.015,
    aura2Per1kCharacters: 0.03,
    fluxEnglishPerHour: 4.5,
  },
  fetchedAt: null,
  source: 'fallback',
  stale: true,
};

const usageStorageKey = 'usage_analytics_v1';

const readStoredUsage = () => {
  try {
    const raw = localStorage.getItem(usageStorageKey);
    if (!raw) return { chatUsage: emptyChatUsage, voiceUsage: emptyVoiceUsage, webUsage: emptyWebUsage, pricing: emptyPricing };
    const parsed = JSON.parse(raw);
    return {
      chatUsage: { ...emptyChatUsage, ...(parsed.chatUsage || {}) },
      voiceUsage: { ...emptyVoiceUsage, ...(parsed.voiceUsage || {}) },
      webUsage: { ...emptyWebUsage, ...(parsed.webUsage || {}) },
      pricing: {
        ...emptyPricing,
        ...(parsed.pricing || {}),
        deepgram: { ...emptyPricing.deepgram, ...(parsed.pricing?.deepgram || {}) },
        openRouterModels: parsed.pricing?.openRouterModels || {},
      },
    };
  } catch {
    return { chatUsage: emptyChatUsage, voiceUsage: emptyVoiceUsage, webUsage: emptyWebUsage, pricing: emptyPricing };
  }
};

const persistUsage = (chatUsage: ChatUsage, voiceUsage: VoiceUsage, webUsage: WebUsage, pricing: PricingState) => {
  localStorage.setItem(usageStorageKey, JSON.stringify({ chatUsage, voiceUsage, webUsage, pricing }));
};

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
  serperApiKey: string;
  setSerperApiKey: (key: string) => void;
  learnerName: string;
  setLearnerName: (name: string) => void;
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  
  pdfUrl: string | null;
  setPdfUrl: (url: string | null) => void;
  pdfScale: number;
  setPdfScale: (scale: number) => void;
  pdfPage: number;
  setPdfPage: (page: number) => void;
  pdfTotalPages: number;
  setPdfTotalPages: (total: number) => void;
  
  annotations: Annotation[];
  addAnnotation: (ann: Annotation) => void;
  
  concepts: Concept[];
  setConcepts: (concepts: Concept[]) => void;
  addConcept: (concept: Concept) => void;

  askTutorQuery: string;
  setAskTutorQuery: (query: string) => void;

  ttsVoice: string;
  setTtsVoice: (voice: string) => void;

  aiModel: string;
  setAiModel: (model: string) => void;

  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;

  activeProject: string;
  setActiveProject: (project: string) => void;
  activeLearningBookId: string | null;
  setActiveLearningBookId: (bookId: string | null) => void;

  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;

  totalTokens: number;
  estimatedCost: number;
  addTokens: (tokens: number, cost: number) => void;
  resetAnalytics: () => void;
  chatUsage: ChatUsage;
  voiceUsage: VoiceUsage;
  webUsage: WebUsage;
  pricing: PricingState;
  setPricing: (pricing: PricingState) => void;
  recordChatUsage: (usage: Partial<ChatUsage>) => void;
  recordVoiceUsage: (usage: Partial<VoiceUsage>) => void;
  recordWebUsage: (usage: Partial<WebUsage>) => void;
  resetUsageAnalytics: () => void;
  webSourceCache: Record<string, NormalizedWebSource>;
  webSearchEvents: WebSearchEvent[];
  recordWebSearchEvent: (event: Omit<WebSearchEvent, 'id' | 'timestamp'>) => void;
  cacheWebSources: (sources: NormalizedWebSource[]) => void;
  selectedTextContext: string;
  setSelectedTextContext: (text: string) => void;
  messages: Message[];
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void;
  /** True while voice agent is connected or TTS is playing */
  isVoiceActive: boolean;
  setIsVoiceActive: (active: boolean) => void;
}

const storedUsage = readStoredUsage();

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeView: 'study',
      setActiveView: (view) => set({ activeView: view }),
      apiKey: localStorage.getItem('openrouter_api_key') || '',
      setApiKey: (key) => {
        localStorage.setItem('openrouter_api_key', key);
        set({ apiKey: key });
      },
      serperApiKey: localStorage.getItem('serper_api_key') || '',
      setSerperApiKey: (key: string) => {
        localStorage.setItem('serper_api_key', key);
        set({ serperApiKey: key });
      },
      learnerName: localStorage.getItem('learner_name') || 'Learner',
      setLearnerName: (name: string) => {
        const cleanName = name.trim() || 'Learner';
        localStorage.setItem('learner_name', cleanName);
        set({ learnerName: cleanName });
      },
      pdfUrl: null,
      setPdfUrl: (url) => set({ pdfUrl: url }),
  pdfScale: 1,
  setPdfScale: (scale) => set({ pdfScale: scale }),
  pdfPage: 1,
  setPdfPage: (page) => set({ pdfPage: page }),
  pdfTotalPages: 0,
  setPdfTotalPages: (total) => set({ pdfTotalPages: total }),
  
  annotations: [],
  addAnnotation: (ann) => set((state) => ({ annotations: [...state.annotations, ann] })),
  
  concepts: [],
  setConcepts: (concepts) => set({ concepts }),
  addConcept: (concept) => set((state) => ({ concepts: [...state.concepts, concept] })),
  
  askTutorQuery: '',
  setAskTutorQuery: (query) => set({ askTutorQuery: query }),

  ttsVoice: localStorage.getItem('tts_voice') || 'aura-asteria-en',
  setTtsVoice: (voice) => {
    localStorage.setItem('tts_voice', voice);
    set({ ttsVoice: voice });
  },

  aiModel: localStorage.getItem('ai_model') || 'deepseek/deepseek-chat',
  setAiModel: (model) => {
    localStorage.setItem('ai_model', model);
    set({ aiModel: model });
  },

  animationsEnabled: localStorage.getItem('animations_enabled') !== 'false',
  setAnimationsEnabled: (enabled) => {
    localStorage.setItem('animations_enabled', String(enabled));
    set({ animationsEnabled: enabled });
  },

  activeProject: localStorage.getItem('active_project') || 'General Study',
  setActiveProject: (project) => {
    const cleanProject = project.trim() || 'General Study';
    localStorage.setItem('active_project', cleanProject);
    set({ activeProject: cleanProject });
  },
  activeLearningBookId: localStorage.getItem('active_learning_book_id') || null,
  setActiveLearningBookId: (bookId) => {
    if (bookId) {
      localStorage.setItem('active_learning_book_id', bookId);
    } else {
      localStorage.removeItem('active_learning_book_id');
    }
    set({ activeLearningBookId: bookId });
  },

  systemPrompt: localStorage.getItem('system_prompt') || '',
  setSystemPrompt: (prompt) => {
    localStorage.setItem('system_prompt', prompt);
    set({ systemPrompt: prompt });
  },

  totalTokens: storedUsage.chatUsage.inputTokens + storedUsage.chatUsage.outputTokens,
  estimatedCost: storedUsage.chatUsage.cost + storedUsage.voiceUsage.cost + storedUsage.webUsage.cost,
  addTokens: (tokens, cost) => set((state) => {
    const chatUsage = {
      ...state.chatUsage,
      outputTokens: state.chatUsage.outputTokens + tokens,
      cost: state.chatUsage.cost + cost,
      estimated: true,
    };
    const totalTokens = chatUsage.inputTokens + chatUsage.outputTokens;
    const estimatedCost = chatUsage.cost + state.voiceUsage.cost + state.webUsage.cost;
    persistUsage(chatUsage, state.voiceUsage, state.webUsage, state.pricing);
    return { chatUsage, totalTokens, estimatedCost };
  }),
  resetAnalytics: () => get().resetUsageAnalytics(),

  chatUsage: storedUsage.chatUsage,
  voiceUsage: storedUsage.voiceUsage,
  webUsage: storedUsage.webUsage,
  pricing: storedUsage.pricing,
  setPricing: (pricing) => set((state) => {
    persistUsage(state.chatUsage, state.voiceUsage, state.webUsage, pricing);
    return { pricing };
  }),
  recordChatUsage: (usage) => set((state) => {
    const chatUsage = {
      ...state.chatUsage,
      provider: usage.provider || state.chatUsage.provider,
      model: usage.model || state.chatUsage.model,
      inputTokens: state.chatUsage.inputTokens + (usage.inputTokens || 0),
      outputTokens: state.chatUsage.outputTokens + (usage.outputTokens || 0),
      cost: state.chatUsage.cost + (usage.cost || 0),
      estimated: Boolean(usage.estimated || state.chatUsage.estimated),
      requests: state.chatUsage.requests + (usage.requests ?? 1),
    };
    const totalTokens = chatUsage.inputTokens + chatUsage.outputTokens;
    const estimatedCost = chatUsage.cost + state.voiceUsage.cost + state.webUsage.cost;
    persistUsage(chatUsage, state.voiceUsage, state.webUsage, state.pricing);
    return { chatUsage, totalTokens, estimatedCost };
  }),
  recordVoiceUsage: (usage) => set((state) => {
    const voiceUsage = {
      ...state.voiceUsage,
      provider: usage.provider || state.voiceUsage.provider,
      voiceAgentModel: usage.voiceAgentModel || state.voiceUsage.voiceAgentModel,
      ttsModel: usage.ttsModel || state.voiceUsage.ttsModel,
      listenModel: usage.listenModel || state.voiceUsage.listenModel,
      speakModel: usage.speakModel || state.voiceUsage.speakModel,
      connectionSeconds: Math.max(state.voiceUsage.connectionSeconds, usage.connectionSeconds || 0),
      inputAudioSeconds: Math.max(state.voiceUsage.inputAudioSeconds, usage.inputAudioSeconds || 0),
      outputAudioSeconds: Math.max(state.voiceUsage.outputAudioSeconds, usage.outputAudioSeconds || 0),
      ttsCharacters: state.voiceUsage.ttsCharacters + (usage.ttsCharacters || 0),
      cost: state.voiceUsage.cost + (usage.cost || 0),
      estimated: Boolean(usage.estimated || state.voiceUsage.estimated),
      sessions: state.voiceUsage.sessions + (usage.sessions || 0),
    };
    const estimatedCost = state.chatUsage.cost + voiceUsage.cost + state.webUsage.cost;
    persistUsage(state.chatUsage, voiceUsage, state.webUsage, state.pricing);
    return { voiceUsage, estimatedCost };
  }),
  recordWebUsage: (usage) => set((state) => {
    const webUsage = {
      ...state.webUsage,
      provider: usage.provider || state.webUsage.provider,
      requests: state.webUsage.requests + (usage.requests || 0),
      searchRequests: state.webUsage.searchRequests + (usage.searchRequests || 0),
      newsRequests: state.webUsage.newsRequests + (usage.newsRequests || 0),
      sourcesReviewed: state.webUsage.sourcesReviewed + (usage.sourcesReviewed || 0),
      failures: state.webUsage.failures + (usage.failures || 0),
      cost: state.webUsage.cost + (usage.cost || 0),
      estimated: Boolean(usage.estimated ?? state.webUsage.estimated),
    };
    const estimatedCost = state.chatUsage.cost + state.voiceUsage.cost + webUsage.cost;
    persistUsage(state.chatUsage, state.voiceUsage, webUsage, state.pricing);
    return { webUsage, estimatedCost };
  }),
  resetUsageAnalytics: () => set((state) => {
    persistUsage(emptyChatUsage, emptyVoiceUsage, emptyWebUsage, state.pricing);
    return {
      chatUsage: emptyChatUsage,
      voiceUsage: emptyVoiceUsage,
      webUsage: emptyWebUsage,
      totalTokens: 0,
      estimatedCost: 0,
    };
  }),
  webSourceCache: {},
  webSearchEvents: [],
  recordWebSearchEvent: (event) => set((state) => ({
    webSearchEvents: [
      {
        ...event,
        id: `${event.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      },
      ...state.webSearchEvents,
    ].slice(0, 100),
  })),
  cacheWebSources: (sources) => set((state) => {
    const webSourceCache = { ...state.webSourceCache };
    sources.forEach((source) => {
      webSourceCache[source.id || source.url] = source;
    });
    return { webSourceCache };
  }),

  selectedTextContext: '',
  setSelectedTextContext: (text) => set({ selectedTextContext: text }),
  messages: [{ 
    id: '1', 
    role: 'assistant', 
    content: `**Hello. I'm your AI Tutor.**

I'm ready to help you explore concepts, discuss code, and break down complex subjects. Here are a few things we can do:
- **Analyze Documents:** Upload a PDF and ask me questions about specific pages.
- **Discuss Code:** Paste code snippets and we can debug or refactor them.
- **Learn Concepts:** Ask me general programming and computer science questions.

What would you like to learn today?` 
  }],
  setMessages: (updater) => set((state) => ({
    messages: typeof updater === 'function' ? updater(state.messages) : updater
  })),
  isVoiceActive: false,
  setIsVoiceActive: (active) => set({ isVoiceActive: active }),
}), {
  name: 'learning-ai-store',
  partialize: (state) => ({
    messages: state.messages,
    activeProject: state.activeProject,
    activeLearningBookId: state.activeLearningBookId,
    activeView: state.activeView
  })
}));
