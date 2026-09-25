import { describe, expect, it } from "vitest";
import { Priority } from "../../server/lib/limiter";
import { LlmError } from "../../server/providers/llm";
import { ZaiProvider } from "../../server/providers/zai";

type Call = { url: string; body: any };

function sse(chunks: unknown[]) {
  const text = chunks.map((chunk) => `data: ${typeof chunk === "string" ? chunk : JSON.stringify(chunk)}\n\n`).join("");
  return new Response(
    new ReadableStream({
      start(controller) {
        // Split mid-event to exercise the parser's buffering.
        const bytes = new TextEncoder().encode(text);
        controller.enqueue(bytes.slice(0, 37));
        controller.enqueue(bytes.slice(37));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}

function provider(responses: Array<(call: Call) => Response>, calls: Call[] = []) {
  let index = 0;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call = { url, body: JSON.parse(String(init.body)) };
    calls.push(call);
    const respond = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return respond(call);
  }) as unknown as typeof fetch;
  return new ZaiProvider({
    apiKey: "test-key",
    baseUrl: "https://api.z.ai/api/paas/v4",
    models: { fast: "glm-5.3-flash", smart: "glm-5.3", vision: "glm-5.3-flash" },
    concurrency: { fast: 2, smart: 1, vision: 1 },
    timeoutMs: 5_000,
    maxRetries: 3,
    fetchImpl,
  });
}

describe("ZaiProvider", () => {
  it("streams reasoning, text, fragmented tool calls and usage", async () => {
    const calls: Call[] = [];
    const llm = provider(
      [
        () =>
          sse([
            {
              model: "glm-5.3-flash",
              choices: [{ index: 0, delta: { role: "assistant", reasoning_content: "Let me think." } }],
            },
            { choices: [{ index: 0, delta: { content: "Hello " } }] },
            { choices: [{ index: 0, delta: { content: "world" } }] },
            {
              choices: [
                {
                  index: 0,
                  delta: {
                    tool_calls: [{ index: 0, id: "call_1", function: { name: "show_images", arguments: '{"que' } }],
                  },
                },
              ],
            },
            { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: 'ry":"cells"}' } }] } }] },
            {
              choices: [{ index: 0, finish_reason: "tool_calls", delta: {} }],
              usage: { prompt_tokens: 12, completion_tokens: 7 },
            },
            "[DONE]",
          ]),
      ],
      calls,
    );
    const result = await llm.complete({ role: "fast", messages: [{ role: "user", content: "hi" }], reasoning: "low" });
    expect(result.reasoning).toBe("Let me think.");
    expect(result.text).toBe("Hello world");
    expect(result.toolCalls).toEqual([{ id: "call_1", name: "show_images", arguments: '{"query":"cells"}' }]);
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7 });
    expect(calls[0].url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    expect(calls[0].body.model).toBe("glm-5.3-flash");
    // GLM-5.3 models always think: latency-sensitive calls ask for low effort.
    expect(calls[0].body.thinking).toEqual({ type: "enabled" });
    expect(calls[0].body.reasoning_effort).toBe("low");
  });

  it("disables thinking where the model allows it, and adapts when it refuses (1210)", async () => {
    const calls: Call[] = [];
    const refuse = () =>
      new Response(JSON.stringify({ error: { code: "1210", message: "cannot be disabled" } }), { status: 400 });
    const ok = () => sse([{ choices: [{ index: 0, delta: { content: "ok" }, finish_reason: "stop" }] }, "[DONE]"]);
    const llm = new ZaiProvider({
      apiKey: "k",
      baseUrl: "https://x",
      models: { fast: "glm-4.7", smart: "glm-4.7", vision: "glm-4.7" },
      concurrency: { fast: 1, smart: 1, vision: 1 },
      timeoutMs: 5_000,
      maxRetries: 0,
      fetchImpl: (async (url: string, init: RequestInit) => {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return calls.length === 1 ? refuse() : ok();
      }) as unknown as typeof fetch,
    });
    const first = await llm.complete({ role: "fast", messages: [{ role: "user", content: "x" }], reasoning: "off" });
    expect(first.text).toBe("ok");
    expect(calls[0].body.thinking).toEqual({ type: "disabled" });
    expect(calls[1].body.thinking).toEqual({ type: "enabled" });
    // Learned: the next call goes straight to low effort.
    await llm.complete({ role: "fast", messages: [{ role: "user", content: "y" }], reasoning: "off" });
    expect(calls[2].body.reasoning_effort).toBe("low");
  });

  it("retries rate limits (1302) and succeeds", async () => {
    const calls: Call[] = [];
    const llm = provider(
      [
        () =>
          new Response(JSON.stringify({ error: { code: "1302", message: "High concurrency" } }), {
            status: 429,
            headers: { "retry-after": "0" },
          }),
        () => sse([{ choices: [{ index: 0, delta: { content: "done" }, finish_reason: "stop" }] }, "[DONE]"]),
      ],
      calls,
    );
    const result = await llm.complete({
      role: "fast",
      messages: [{ role: "user", content: "x" }],
      priority: Priority.interactive,
    });
    expect(result.text).toBe("done");
    expect(calls).toHaveLength(2);
    const stats = llm.stats() as { limiters: Array<{ throttled: number }> };
    expect(stats.limiters[0].throttled).toBe(1);
  });

  it("never retries quota errors and surfaces the reset time", async () => {
    const calls: Call[] = [];
    const llm = provider(
      [
        () =>
          new Response(
            JSON.stringify({
              error: {
                code: "1308",
                message: "Usage limit reached for 5 hour. Your limit will reset at 2026-09-25 18:00:00",
              },
            }),
            { status: 429 },
          ),
      ],
      calls,
    );
    const error = await llm
      .complete({ role: "smart", messages: [{ role: "user", content: "x" }], priority: Priority.batch })
      .catch((e) => e);
    expect(error).toBeInstanceOf(LlmError);
    expect(error.kind).toBe("quota");
    expect(error.userMessage).toContain("2026-09-25 18:00");
    expect(calls).toHaveLength(1);
  });

  it("rejects bad keys without retrying", async () => {
    const calls: Call[] = [];
    const llm = provider(
      [() => new Response(JSON.stringify({ error: { code: "1001", message: "Invalid key" } }), { status: 401 })],
      calls,
    );
    const error = await llm.complete({ role: "fast", messages: [{ role: "user", content: "x" }] }).catch((e) => e);
    expect(error.kind).toBe("auth");
    expect(calls).toHaveLength(1);
  });

  it("aborts cleanly", async () => {
    const controller = new AbortController();
    const llm = provider([
      () => new Response(new ReadableStream({ start() {} }), { status: 200 }), // never ends
    ]);
    const pending = llm.complete({
      role: "fast",
      messages: [{ role: "user", content: "x" }],
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 20);
    const error = await pending.catch((e) => e);
    expect(error).toBeInstanceOf(LlmError);
    expect(error.kind).toBe("aborted");
  });
});
