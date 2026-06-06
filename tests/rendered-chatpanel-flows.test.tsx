import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Message } from "../src/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "../src/components/ChatPanel";
import {
  db,
  type LearningBook,
  type LearningDocument,
} from "../src/memory/longterm.memory";
import { useStore } from "../src/store";

const brainContextPacket = {
  requestId: "chat-render-test",
  proofAttemptId: undefined as string | undefined,
  context: "Mocked brain context for rendered ChatPanel tests.",
  contextChars: 48,
  documentIds: ["doc:active"],
  readyDocumentIds: ["doc:active"],
  contextDocumentIds: ["doc:active"],
  documentCount: 1,
  readyDocumentCount: 1,
  unreadyDocumentCount: 0,
  omittedReadyDocumentCount: 0,
  rawContextChars: 48,
  memoryContextChars: 12,
  activeBookContextChars: 18,
  documentContextChars: 18,
  compacted: false,
};

vi.mock("../src/lib/audio", () => ({
  audio: {
    playClick: vi.fn(),
    playHover: vi.fn(),
  },
}));

vi.mock("../src/memory/brain.context", () => ({
  buildBrainContextPacket: vi.fn(async () => brainContextPacket),
}));

vi.mock("../src/memory/memory.orchestrator", () => ({
  brainOrchestrator: {
    addOrUpdateConcept: vi.fn(),
    getRelevantContext: vi.fn(async () => ""),
    trackInteraction: vi.fn(),
    updateLearningBookFromConversation: vi.fn(async () => undefined),
    updateLearningBookTitle: vi.fn(async (_bookId: string, title: string) => ({
      id: "book:active",
      title,
    })),
  },
}));

vi.mock("../src/memory/artifact.records", () => ({
  recordGeneratedFlashcardsArtifact: vi.fn(async () => undefined),
  recordUnavailableCitationState: vi.fn(async () => undefined),
  recordWebSourceArtifact: vi.fn(async () => undefined),
}));

vi.mock("../src/memory/memory.events", () => ({
  recordMemoryEvent: vi.fn(async () => undefined),
}));

vi.mock("../src/memory/model.runs", () => ({
  recordModelRunEvent: vi.fn(async () => undefined),
}));

vi.mock("../src/memory/tool.jobs", () => ({
  recordToolJobEvent: vi.fn(async () => undefined),
}));

vi.mock("../src/memory/answer.evidence", () => ({
  recordEvaluatedAnswerEvidenceBatch: vi.fn(async () => undefined),
}));

vi.mock("../src/memory/flashcard.concepts", () => ({
  createFlashcardForStorage: vi.fn(async () => ({
    flashcard: {
      id: "card:rendered",
      front: "Rendered front",
      back: "Rendered back",
      nextReviewAt: Date.now(),
    },
  })),
}));

const baseMessages = (): Message[] => [
  {
    id: "assistant:init",
    role: "assistant",
    content: "Ready to study.",
  },
];

const learningBook = (): LearningBook => ({
  id: "book:active",
  sessionId: "session:rendered-chat",
  title: "Rendered Chat Book",
  userName: "Learner",
  source: "chat",
  overview: "",
  summary: "",
  knowledgeSummary: "",
  chapters: [],
  conceptIds: [],
  conversationCount: 0,
  activeDocumentId: "doc:active",
  documentIds: ["doc:active"],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const learningDocument = (): LearningDocument => ({
  id: "doc:active",
  bookId: "book:active",
  title: "Rendered PDF",
  mimeType: "application/pdf",
  size: 128,
  extractedText: "Retrieval practice strengthens recall.",
  classification: "paper",
  extractionMode: "test",
  processingStatus: "ready",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const makeChatStream = () => {
  const encoder = new TextEncoder();
  const events = [
    { type: "chunk", content: "Mock " },
    {
      type: "done",
      content: "Mock tutor answer.",
      usage: {
        provider: "openrouter",
        model: "test-model",
        inputTokens: 12,
        outputTokens: 4,
        cost: 0,
        estimated: true,
      },
    },
  ];

  return new ReadableStream<Uint8Array>({
    start(controller) {
      events.forEach((event) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      });
      controller.close();
    },
  });
};

let chatRequestBodies: string[] = [];
let fetchMock: ReturnType<typeof vi.fn>;

const resetChatStore = () => {
  useStore.setState({
    accessMode: "user",
    activeView: "study",
    activeProject: "Rendered Chat Book",
    activeLearningBookId: "book:active",
    activeDocumentId: "doc:active",
    animationsEnabled: false,
    apiKey: "openrouter-test-key",
    askTutorQuery: "",
    betaProofTrafficApproval: null,
    deepgramApiKey: "",
    isVoiceActive: false,
    language: "en",
    learnerName: "Learner",
    messages: baseMessages(),
    selectedTextContext: "",
    serperApiKey: "serper-test-key",
    systemPrompt: "",
  });
};

const renderChatPanel = () => render(<ChatPanel />);

const settleChatPanelEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await Promise.resolve();
  });
};

beforeEach(async () => {
  chatRequestBodies = [];
  await db.delete();
  await db.open();
  await db.learningBooks.put(learningBook());
  await db.learningDocuments.put(learningDocument());
  resetChatStore();

  Object.defineProperty(Element.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });

  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/health")) {
      return Response.json({
        providers: {
          deepgram: true,
          openRouter: true,
          openRouterByok: true,
        },
      });
    }

    if (url === "/api/chat") {
      chatRequestBodies.push(String(init?.body || ""));
      return new Response(makeChatStream(), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    return Response.json({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await db.delete();
});

describe("rendered ChatPanel flows", () => {
  it("renders and clears selected PDF context as an accessible chip", async () => {
    useStore.setState({
      selectedTextContext: "Bayesian evidence from page 4.",
    });

    renderChatPanel();
    await settleChatPanelEffects();

    expect(screen.getByText("From PDF Selection")).toBeInTheDocument();
    expect(
      screen.getByText(/Bayesian evidence from page 4/),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear selected PDF context" }),
    );

    expect(useStore.getState().selectedTextContext).toBe("");
    await waitFor(() => {
      expect(screen.queryByText("From PDF Selection")).toBeNull();
    });
  });

  it("activates and removes the Web Search skill through the tools menu", async () => {
    vi.useFakeTimers();
    renderChatPanel();
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open tutor tools" }));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText("Web Search")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search the web..."),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove web search tool" }),
    );

    expect(screen.queryByText("Web Search")).toBeNull();
    expect(screen.getByPlaceholderText("Ask...")).toBeInTheDocument();
  });

  it("does not send on Shift+Enter, then streams a selected-context chat request on Enter", async () => {
    useStore.setState({
      selectedTextContext: "Retrieval practice selection.",
    });
    renderChatPanel();
    await settleChatPanelEffects();

    const input = screen.getByPlaceholderText("Ask...");
    fireEvent.change(input, { target: { value: "Explain this passage" } });

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(chatRequestBodies).toHaveLength(0);

    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(chatRequestBodies).toHaveLength(1);
    });

    const payload = JSON.parse(chatRequestBodies[0]) as {
      activeDocumentId?: string;
      documentContexts?: Array<{ id: string; title: string }>;
      messages: Array<{ content: string }>;
    };
    const userMessage = payload.messages[payload.messages.length - 1]?.content;

    expect(payload.activeDocumentId).toBe("doc:active");
    expect(payload.documentContexts?.[0]).toMatchObject({
      id: "doc:active",
      title: "Rendered PDF",
    });
    expect(userMessage).toContain("Regarding this selected text");
    expect(userMessage).toContain("Retrieval practice selection.");
    expect(userMessage).toContain("Explain this passage");
    expect(useStore.getState().selectedTextContext).toBe("");
    expect(await screen.findByText("Mock tutor answer.")).toBeInTheDocument();
  });

  it("surfaces special-character validation while keeping voice and send controls named", async () => {
    renderChatPanel();
    await settleChatPanelEffects();

    expect(
      screen.getByRole("button", { name: "Start voice input" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send message" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Ask..."), {
      target: { value: "Explain ∑ notation" },
    });

    expect(
      screen.getByText("Special characters are limited."),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-active='true'][data-valid='false']"),
    ).toBeInTheDocument();
  });
});
