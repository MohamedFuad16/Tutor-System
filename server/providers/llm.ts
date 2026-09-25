/**
 * Provider-neutral LLM contract. The rest of the server only ever talks to
 * this interface, so swapping Z.AI for another OpenAI-compatible vendor (or
 * the offline mock) is a one-line change in the provider registry.
 */

export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export type ToolCall = {
  id: string;
  name: string;
  /** Raw JSON string as produced by the model. */
  arguments: string;
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

export type ToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
};

export type ModelRole = "fast" | "smart" | "vision";

export type LlmRequest = {
  role: ModelRole;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | { name: string };
  temperature?: number;
  maxTokens?: number;
  /**
   * How much the model may reason before answering. "off" disables thinking
   * where the model allows it (GLM-5.3 models always think, so "off" is sent
   * as "low" to them). Latency-sensitive paths should use "off" or "low".
   */
  reasoning?: "off" | "low" | "high" | "max";
  /** Ask for a JSON object response. */
  json?: boolean;
  /** Scheduling priority, see `Priority` in lib/limiter. */
  priority?: number;
  signal?: AbortSignal;
  /** Free-form label for metrics ("chat", "voice.fg", "guide.sync", ...). */
  purpose?: string;
  userId?: string;
};

export type Usage = { inputTokens: number; outputTokens: number };

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "done"; finishReason: string; usage: Usage; model: string };

export type Completion = {
  text: string;
  reasoning: string;
  toolCalls: ToolCall[];
  finishReason: string;
  usage: Usage;
  model: string;
};

export interface LlmProvider {
  readonly name: string;
  modelFor(role: ModelRole): string;
  stream(request: LlmRequest): AsyncIterable<StreamEvent>;
  complete(request: LlmRequest): Promise<Completion>;
  stats(): unknown;
  /** Opens a pooled connection ahead of a latency-critical request (optional). */
  warm?(): void;
}

/** Normalised provider failure with enough detail to decide on retries and UX. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: "auth" | "quota" | "rate_limit" | "bad_request" | "upstream" | "timeout" | "aborted" | "network",
    readonly status?: number,
    readonly code?: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }

  get retryable() {
    return this.kind === "rate_limit" || this.kind === "upstream" || this.kind === "network" || this.kind === "timeout";
  }

  /** Short message that is safe to show a learner. */
  get userMessage() {
    switch (this.kind) {
      case "auth":
        return "The AI provider rejected the server's API key.";
      case "quota": {
        // Z.AI quota errors usually carry the reset time; surface it.
        const reset = this.message.match(/(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)/);
        return reset
          ? `The AI usage quota is used up until ${reset[1]}. Please try again after that.`
          : "The AI provider's usage quota is used up for now. Please try again later.";
      }
      case "rate_limit":
        return "The AI provider is busy right now. Please try again in a moment.";
      case "timeout":
        return "The AI provider took too long to respond.";
      case "aborted":
        return "Request cancelled.";
      default:
        return "The AI provider had a problem answering. Please try again.";
    }
  }
}

/** Collects a stream into a single completion. */
export async function collect(stream: AsyncIterable<StreamEvent>): Promise<Completion> {
  let text = "";
  let reasoning = "";
  const toolCalls: ToolCall[] = [];
  let finishReason = "stop";
  let usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let model = "";
  for await (const event of stream) {
    if (event.type === "text") text += event.delta;
    else if (event.type === "reasoning") reasoning += event.delta;
    else if (event.type === "tool_call") toolCalls.push(event.call);
    else {
      finishReason = event.finishReason;
      usage = event.usage;
      model = event.model;
    }
  }
  return { text, reasoning, toolCalls, finishReason, usage, model };
}

/** Extracts the first JSON object from model text (tolerates code fences and prose). */
export function parseJsonObject<T = Record<string, unknown>>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  if (start < 0) return null;
  // Walk to the matching brace so trailing prose does not break parsing.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
