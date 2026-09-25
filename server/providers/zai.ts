/**
 * Z.AI (Zhipu GLM) chat-completions client.
 *
 * Z.AI exposes an OpenAI-compatible `/chat/completions` endpoint, but with a
 * few differences worth handling explicitly instead of going through a
 * generic SDK:
 *   - `thinking: { type: "enabled" | "disabled" }` toggles the reasoning phase
 *     (disabled for anything latency-sensitive),
 *   - reasoning arrives as `delta.reasoning_content`,
 *   - business error codes in the body (e.g. 1302 concurrency, 1113/1308/1310
 *     quota) decide whether a retry makes sense.
 *
 * Each model role gets its own PriorityLimiter so background synthesis can
 * never starve a live voice turn.
 */
import { AbortedError, PriorityLimiter, Priority } from "../lib/limiter.js";
import { log } from "../lib/log.js";
import { readSseData } from "../lib/sse.js";
import { metrics } from "../lib/metrics.js";
import {
  LlmError,
  collect,
  type ChatMessage,
  type Completion,
  type LlmProvider,
  type LlmRequest,
  type ModelRole,
  type StreamEvent,
  type ToolCall,
} from "./llm.js";

export type ZaiOptions = {
  apiKey: string;
  baseUrl: string;
  models: Record<ModelRole, string>;
  concurrency: Record<ModelRole, number>;
  timeoutMs: number;
  maxRetries: number;
  fetchImpl?: typeof fetch;
};

/** Codes Z.AI documents for "you are out of quota": retrying will not help. */
const QUOTA_CODES = new Set(["1113", "1304", "1308", "1309", "1310"]);
/** Codes for transient throttling / overload. */
const RATE_CODES = new Set(["1302", "1303", "1305", "1312"]);

type WireMessage = {
  role: string;
  content: unknown;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

function toWireMessages(messages: ChatMessage[]): WireMessage[] {
  return messages.map((message) => {
    if (message.role === "assistant" && message.tool_calls?.length) {
      return {
        role: "assistant",
        content: message.content || "",
        tool_calls: message.tool_calls.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments || "{}" },
        })),
      };
    }
    if (message.role === "tool") {
      return { role: "tool", content: message.content, tool_call_id: message.tool_call_id };
    }
    return { role: message.role, content: message.content };
  });
}

function classifyHttpError(status: number, bodyText: string, retryAfter: string | null): LlmError {
  let code = "";
  let message = bodyText.slice(0, 300);
  try {
    const parsed = JSON.parse(bodyText);
    code = String(parsed?.error?.code ?? parsed?.code ?? "");
    message = String(parsed?.error?.message ?? parsed?.message ?? message);
  } catch {
    // Non-JSON error body; keep the raw text.
  }
  const retryAfterMs = retryAfter ? Math.min(30_000, Number(retryAfter) * 1000 || 0) : undefined;
  if (status === 401 || status === 403 || code === "1000" || code === "1001" || code === "1002") {
    return new LlmError(`Z.AI auth failed: ${message}`, "auth", status, code);
  }
  if (QUOTA_CODES.has(code)) return new LlmError(`Z.AI quota: ${message}`, "quota", status, code);
  if (status === 429 || RATE_CODES.has(code)) {
    return new LlmError(`Z.AI rate limited: ${message}`, "rate_limit", status, code, retryAfterMs);
  }
  if (status >= 500) return new LlmError(`Z.AI upstream ${status}: ${message}`, "upstream", status, code);
  return new LlmError(`Z.AI rejected request (${status}): ${message}`, "bad_request", status, code);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new AbortedError());
      },
      { once: true },
    );
  });

export class ZaiProvider implements LlmProvider {
  readonly name = "zai";
  private readonly limiters: Record<ModelRole, PriorityLimiter>;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ZaiOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.limiters = {
      fast: new PriorityLimiter(`zai:${options.models.fast}`, options.concurrency.fast),
      smart: new PriorityLimiter(`zai:${options.models.smart}`, options.concurrency.smart),
      vision: new PriorityLimiter(`zai:${options.models.vision}`, options.concurrency.vision),
    };
  }

  modelFor(role: ModelRole) {
    return this.options.models[role];
  }

  stats() {
    return {
      provider: this.name,
      baseUrl: this.options.baseUrl,
      models: this.options.models,
      limiters: Object.values(this.limiters).map((limiter) => limiter.stats()),
    };
  }

  complete(request: LlmRequest): Promise<Completion> {
    return collect(this.stream(request));
  }

  async *stream(request: LlmRequest): AsyncGenerator<StreamEvent> {
    const limiter = this.limiters[request.role];
    const release = await limiter.acquire(request.priority ?? Priority.interactive, request.signal);
    const model = this.modelFor(request.role);
    const started = Date.now();
    let firstTokenAt = 0;
    let usage = { inputTokens: 0, outputTokens: 0 };
    let outcome: "ok" | "error" = "ok";
    try {
      const response = await this.openStream(request, model, limiter);
      limiter.noteSuccess();
      for await (const event of this.parse(response, request.signal)) {
        if (!firstTokenAt && (event.type === "text" || event.type === "tool_call")) firstTokenAt = Date.now();
        if (event.type === "done") usage = event.usage;
        yield event;
      }
    } catch (error) {
      outcome = "error";
      if (error instanceof LlmError) throw error;
      if ((error as Error)?.name === "AbortError" || request.signal?.aborted) {
        throw new LlmError("Request aborted", "aborted");
      }
      throw new LlmError(`Z.AI stream failed: ${(error as Error)?.message || error}`, "network");
    } finally {
      release();
      metrics.recordLlmCall({
        model,
        role: request.role,
        purpose: request.purpose || "unspecified",
        userId: request.userId,
        ms: Date.now() - started,
        ttftMs: firstTokenAt ? firstTokenAt - started : null,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        ok: outcome === "ok",
      });
    }
  }

  /**
   * Thinking parameters for a model. GLM-5.3-family models always reason and
   * reject `thinking: disabled` (error 1210); older models accept it. We learn
   * this per model at runtime so new model ids work without a code change.
   */
  private thinkingParams(model: string, reasoning: LlmRequest["reasoning"]) {
    const effort = reasoning ?? "off";
    if (effort === "off" && !this.alwaysThinking.has(model) && !/^glm-5\.[3-9]/i.test(model)) {
      return { thinking: { type: "disabled" } };
    }
    return { thinking: { type: "enabled" }, reasoning_effort: effort === "off" ? "low" : effort };
  }

  private readonly alwaysThinking = new Set<string>();

  /** Retry budget: humans waiting get a couple of quick retries, background work waits longer. */
  private retryPolicy(priority: number) {
    return priority <= Priority.interactive
      ? { retries: Math.min(2, this.options.maxRetries), capMs: 2_500 }
      : { retries: Math.max(this.options.maxRetries, 5), capMs: 45_000 };
  }

  /** Opens the HTTP stream, retrying transient failures before the first byte. */
  private async openStream(request: LlmRequest, model: string, limiter: PriorityLimiter): Promise<Response> {
    const body: Record<string, unknown> = {
      model,
      messages: toWireMessages(request.messages),
      stream: true,
      temperature: request.temperature ?? 0.6,
      ...this.thinkingParams(model, request.reasoning),
    };
    if (request.maxTokens) body.max_tokens = request.maxTokens;
    if (request.json) body.response_format = { type: "json_object" };
    if (request.tools?.length) {
      body.tools = request.tools.map((tool) => ({
        type: "function",
        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
      }));
      body.tool_choice = "auto";
      if (request.toolChoice === "none") body.tool_choice = "none";
    }

    const policy = this.retryPolicy(request.priority ?? Priority.interactive);
    let attempt = 0;
    for (;;) {
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), this.options.timeoutMs);
      const signal = request.signal ? AbortSignal.any([request.signal, timeout.signal]) : timeout.signal;
      try {
        const response = await this.fetchImpl(`${this.options.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.options.apiKey}`,
            "Content-Type": "application/json",
            "Accept-Language": "en-US,en",
          },
          body: JSON.stringify(body),
          signal,
        });
        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "");
          throw classifyHttpError(response.status, text, response.headers.get("retry-after"));
        }
        clearTimeout(timer);
        return response;
      } catch (rawError) {
        clearTimeout(timer);
        if (request.signal?.aborted) throw new LlmError("Request aborted", "aborted");
        const error =
          rawError instanceof LlmError
            ? rawError
            : timeout.signal.aborted
              ? new LlmError("Z.AI request timed out", "timeout")
              : new LlmError(`Z.AI network error: ${(rawError as Error)?.message}`, "network");
        // Model refuses to disable thinking: remember it and retry immediately with low effort.
        if (error.code === "1210" && (body.thinking as { type: string })?.type === "disabled") {
          this.alwaysThinking.add(model);
          Object.assign(body, this.thinkingParams(model, "low"));
          continue;
        }
        if (error.kind === "rate_limit") limiter.noteThrottled();
        if (!error.retryable || attempt >= policy.retries) throw error;
        const backoff = error.retryAfterMs ?? Math.min(policy.capMs, 500 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
        attempt += 1;
        log.warn("llm.retry", { model, attempt, kind: error.kind, code: error.code, backoffMs: Math.round(backoff) });
        await sleep(backoff, request.signal);
      }
    }
  }

  private async *parse(response: Response, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    // Tool calls stream as fragments keyed by index; assemble before emitting.
    const pending = new Map<number, ToolCall>();
    let finishReason = "stop";
    let usage = { inputTokens: 0, outputTokens: 0 };
    let model = "";
    for await (const data of readSseData(response.body!, signal)) {
      if (data === "[DONE]") break;
      let chunk: any;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }
      if (chunk?.error) throw classifyHttpError(500, JSON.stringify(chunk), null);
      model = chunk.model || model;
      if (chunk.usage) {
        usage = {
          inputTokens: Number(chunk.usage.prompt_tokens) || 0,
          outputTokens: Number(chunk.usage.completion_tokens) || 0,
        };
      }
      const choice = chunk.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta || {};
      if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
        yield { type: "reasoning", delta: delta.reasoning_content };
      }
      if (typeof delta.content === "string" && delta.content) {
        yield { type: "text", delta: delta.content };
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const fragment of delta.tool_calls) {
          const index = Number.isInteger(fragment.index) ? fragment.index : pending.size;
          const current = pending.get(index) ?? { id: "", name: "", arguments: "" };
          if (fragment.id) current.id = fragment.id;
          if (fragment.function?.name) current.name = fragment.function.name;
          if (typeof fragment.function?.arguments === "string") current.arguments += fragment.function.arguments;
          else if (fragment.function?.arguments && typeof fragment.function.arguments === "object") {
            current.arguments = JSON.stringify(fragment.function.arguments);
          }
          pending.set(index, current);
        }
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }
    // A cancelled read ends the stream quietly; never report it as a finished answer.
    if (signal?.aborted) throw new LlmError("Request aborted", "aborted");
    for (const [index, call] of [...pending.entries()].sort((a, b) => a[0] - b[0])) {
      if (!call.name) continue;
      yield { type: "tool_call", call: { ...call, id: call.id || `call_${index}_${Date.now().toString(36)}` } };
    }
    yield { type: "done", finishReason, usage, model };
  }
}
