/**
 * Typed-chat tutor turn: grounding → streaming model → tool rounds →
 * persisted message → background study-guide sync.
 */
import type { ChatMessage, ChatRequest, MessagePart, SourceRef } from "../../shared/types.js";
import { Priority } from "../lib/limiter.js";
import { errorMessage, log } from "../lib/log.js";
import type { SseWriter } from "../lib/sse.js";
import { LlmError, type ChatMessage as LlmMessage, type LlmProvider, type ToolCall } from "../providers/llm.js";
import type { Search } from "../providers/search.js";
import type { Store } from "../store/index.js";
import { buildContext, CHAT_BUDGET, type ContextPacket } from "./context.js";
import { chatSystemPrompt } from "./prompts.js";
import { CHAT_TOOL_NAMES, TOOLS, parseToolArgs, toolDefinitions, type ToolContext } from "./tools.js";

const MAX_TOOL_ROUNDS = 3;
const HISTORY_MESSAGES = 12;

/** Compact text rendering of a stored message for the model's history window. */
export function historyText(message: ChatMessage): string {
  const notes: string[] = [];
  for (const part of message.parts) {
    if (part.type === "images") notes.push(`[showed images: ${part.query}]`);
    if (part.type === "diagram") notes.push(`[showed diagram: ${part.diagram.title}]`);
    if (part.type === "quiz") {
      notes.push(
        `[quiz on ${part.quiz.concept}: "${part.quiz.question}"${part.result ? ` — learner was ${part.result.correct ? "correct" : "incorrect"}` : ""}]`,
      );
    }
  }
  const content = message.content.length > 2500 ? `${message.content.slice(0, 2500)}…` : message.content;
  return [content, ...notes].filter(Boolean).join("\n");
}

export function historyMessages(messages: ChatMessage[]): LlmMessage[] {
  return messages
    .filter((message) => message.content.trim() || message.parts.length)
    .map((message) =>
      message.role === "user"
        ? { role: "user" as const, content: historyText(message) }
        : { role: "assistant" as const, content: historyText(message) },
    );
}

/** Maps inline citations like [D1 p.12] back to document pages. */
export function citedSources(text: string, context: ContextPacket): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const match of text.matchAll(/\[D(\d+)\s*p\.?\s*(\d+)(?:\s*[-–]\s*\d+)?\]/gi)) {
    const doc = context.documentLabels[Number(match[1]) - 1];
    const page = Number(match[2]);
    if (!doc || !page) continue;
    const key = `${doc.id}:${page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const offered = context.sources.find((source) => source.documentId === doc.id && source.page === page);
    sources.push({ documentId: doc.id, documentTitle: doc.title, page, snippet: offered?.snippet });
  }
  return sources.slice(0, 12);
}

export type TutorDeps = {
  store: Store;
  llm: LlmProvider;
  search: Search;
  onTurnComplete: (userId: string, bookId: string, language?: string) => void;
};

export function createTutor(deps: TutorDeps) {
  const { store, llm, search } = deps;

  async function runChatTurn(userId: string, learnerName: string, request: ChatRequest, sse: SseWriter) {
    const started = Date.now();
    const bookId = request.bookId;
    const text = request.message.trim().slice(0, 8000);
    const selection = request.focus?.selection?.trim().slice(0, 2000);
    const userParts: MessagePart[] = [];
    if (selection && request.focus?.documentId) {
      userParts.push({
        type: "sources",
        sources: [{ documentId: request.focus.documentId, page: request.focus.page ?? 1, snippet: selection }],
      });
    }

    const history = store.messages.recent(userId, bookId, HISTORY_MESSAGES);
    const userMessage = store.messages.add({
      userId,
      bookId,
      role: "user",
      channel: "chat",
      content: text,
      parts: userParts,
    });
    store.library.touchBook(bookId);
    store.activity.record(userId, "chat", 1, bookId);

    const role = request.deep ? "smart" : "fast";
    const model = llm.modelFor(role);
    const context = buildContext(store, { userId, bookId, query: text, focus: request.focus, budget: CHAT_BUDGET });
    const toolCtx: ToolContext = { userId, bookId, language: request.language ?? "en", store, search };
    const assistantId = `msg_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    sse.send("start", { userMessage, assistantId, model });

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: chatSystemPrompt({ learnerName, language: request.language, context, web: Boolean(request.web) }),
      },
      ...historyMessages(history),
      {
        role: "user",
        content: selection ? `About this highlighted passage:\n> ${selection.replace(/\n/g, "\n> ")}\n\n${text}` : text,
      },
    ];

    let answer = "";
    const parts: MessagePart[] = [];
    let reasoningBuffer = "";
    let lastReasoningFlush = 0;
    const flushReasoning = (force = false) => {
      if (!reasoningBuffer || (!force && Date.now() - lastReasoningFlush < 120)) return;
      sse.send("reasoning", { text: reasoningBuffer });
      reasoningBuffer = "";
      lastReasoningFlush = Date.now();
    };

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
        const toolCalls: ToolCall[] = [];
        let roundText = "";
        const allowTools = round < MAX_TOOL_ROUNDS;
        for await (const event of llm.stream({
          role,
          purpose: "chat",
          userId,
          priority: Priority.interactive,
          reasoning: request.deep ? "high" : "low",
          temperature: 0.5,
          maxTokens: request.deep ? 6000 : 3000,
          messages,
          tools: allowTools ? toolDefinitions(CHAT_TOOL_NAMES) : undefined,
          signal: sse.signal,
        })) {
          if (event.type === "text") {
            flushReasoning(true);
            roundText += event.delta;
            answer += event.delta;
            sse.send("delta", { text: event.delta });
          } else if (event.type === "reasoning") {
            reasoningBuffer += event.delta;
            flushReasoning();
          } else if (event.type === "tool_call") {
            toolCalls.push(event.call);
          }
        }
        flushReasoning(true);
        if (!toolCalls.length) break;

        messages.push({ role: "assistant", content: roundText, tool_calls: toolCalls });
        const results = await Promise.all(
          toolCalls.map(async (call) => {
            const tool = TOOLS[call.name];
            if (!tool || !(CHAT_TOOL_NAMES as readonly string[]).includes(call.name)) {
              return { call, content: `Unknown tool ${call.name}.` };
            }
            const args = parseToolArgs(call.arguments);
            sse.send("status", { label: tool.status(args) });
            try {
              const result = await tool.run(args, toolCtx);
              for (const part of result.parts ?? []) {
                parts.push(part);
                sse.send("part", part);
              }
              return { call, content: result.content };
            } catch (error) {
              log.warn("tool.failed", { tool: call.name, error: errorMessage(error) });
              return { call, content: `Tool failed: ${errorMessage(error)}` };
            }
          }),
        );
        for (const result of results) {
          messages.push({ role: "tool", tool_call_id: result.call.id, content: result.content });
        }
        if (answer && !answer.endsWith("\n")) {
          answer += "\n\n";
          sse.send("delta", { text: "\n\n" });
        }
      }

      const cited = citedSources(answer, context);
      if (cited.length) parts.unshift({ type: "sources", sources: cited });
      const assistant = store.messages.add({
        id: assistantId,
        userId,
        bookId,
        role: "assistant",
        channel: "chat",
        content: answer.trim(),
        parts,
        model,
        latencyMs: Date.now() - started,
      });
      for (const part of parts) {
        if (part.type === "quiz") store.learning.attachQuizMessage(part.quiz.id, assistant.id);
      }
      sse.send("done", { message: assistant });
      deps.onTurnComplete(userId, bookId, request.language);
    } catch (error) {
      const llmError = error instanceof LlmError ? error : null;
      if (sse.signal.aborted || llmError?.kind === "aborted") {
        // Learner stopped or left: keep whatever was said so the thread stays honest.
        if (answer.trim()) {
          store.messages.add({
            id: assistantId,
            userId,
            bookId,
            role: "assistant",
            channel: "chat",
            content: answer.trim(),
            parts,
            model,
            interrupted: true,
          });
          deps.onTurnComplete(userId, bookId, request.language);
        }
        return;
      }
      log.warn("chat.failed", { bookId, error: errorMessage(error) });
      sse.send("error", {
        message: llmError?.userMessage ?? "Something went wrong while answering. Please try again.",
        retryable: llmError ? llmError.retryable : true,
      });
    }
  }

  return { runChatTurn };
}

export type Tutor = ReturnType<typeof createTutor>;
