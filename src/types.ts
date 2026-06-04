export type ChatPhase =
  | "idle"
  | "retrieving"
  | "thinking"
  | "tool_execution"
  | "synthesizing"
  | "streaming"
  | "complete"
  | "web_search";

export type Message = {
  id: string;
  requestId?: string;
  role: "user" | "assistant";
  content: string;
  isVoice?: boolean;
  hasFlashcards?: boolean;
  usage?: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    estimated: boolean;
  };
  phase?: ChatPhase;
  reasoningSteps?: { id: string; content: string }[];
  voiceSession?: {
    title?: string;
    turns: {
      id: string;
      role: "user" | "assistant";
      content: string;
    }[];
    visualFocuses?: {
      id: string;
      kind: "current_page" | "web_search" | "diagram";
      status: "ready" | "blocked" | "failed" | "empty";
      title: string;
      query?: string;
      summary?: string;
      focusedTarget?: string;
      activeDocumentId?: string;
      toolCallId?: string;
      imageCount?: number;
      sources?: any[];
      mermaid?: string;
      timestamp: number;
    }[];
    startedAt: number;
    durationSeconds: number;
  };
  webSearch?: {
    active: boolean;
    query?: string;
    mode?: string;
    status?: string;
    sources: any[];
    error?: string;
  };
  sources?: any[];
};

export type MindMapNode = {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  learned?: boolean;
};

export type MindMapLink = {
  source: string;
  target: string;
};
