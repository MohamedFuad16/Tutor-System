/**
 * Live validation against the real Z.AI API. Not part of `npm test` (costs
 * tokens, needs network). Run with:
 *
 *   ZAI_API_KEY=... npm run test:live
 *
 * Checks: streaming, reasoning effort vs time-to-first-token (the number that
 * decides voice latency), tool calling, JSON mode, and how many parallel
 * requests the account tolerates before throttling (1302).
 */
import "dotenv/config";
import { loadConfig } from "../../server/config";
import { Priority } from "../../server/lib/limiter";
import { LlmError, parseJsonObject, type LlmRequest } from "../../server/providers/llm";
import { ZaiProvider } from "../../server/providers/zai";

const config = loadConfig();
if (!config.llm.apiKey) {
  console.error("Set ZAI_API_KEY (and optionally ZAI_BASE_URL) to run the live checks.");
  process.exit(2);
}

const llm = new ZaiProvider({
  apiKey: config.llm.apiKey,
  baseUrl: config.llm.baseUrl,
  models: { fast: config.llm.fastModel, smart: config.llm.smartModel, vision: config.llm.visionModel },
  concurrency: { fast: 16, smart: 16, vision: 4 },
  timeoutMs: 120_000,
  maxRetries: 0,
});

type Row = { check: string; ok: boolean; detail: string };
const rows: Row[] = [];
const record = (check: string, ok: boolean, detail: string) => {
  rows.push({ check, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${check} — ${detail}`);
};

async function timed(request: LlmRequest) {
  const started = Date.now();
  let firstText = 0;
  let firstAny = 0;
  let text = "";
  let reasoning = "";
  const tools: string[] = [];
  for await (const event of llm.stream(request)) {
    if (!firstAny && event.type !== "done") firstAny = Date.now();
    if (event.type === "text") {
      if (!firstText) firstText = Date.now();
      text += event.delta;
    } else if (event.type === "reasoning") reasoning += event.delta;
    else if (event.type === "tool_call") tools.push(`${event.call.name}(${event.call.arguments})`);
  }
  return {
    ttftMs: firstText ? firstText - started : null,
    firstEventMs: firstAny - started,
    totalMs: Date.now() - started,
    text,
    reasoning,
    tools,
  };
}

async function main() {
  console.log(`Endpoint ${config.llm.baseUrl} · fast=${config.llm.fastModel} smart=${config.llm.smartModel}\n`);

  // 1. Voice-critical latency: fast model at the lowest reasoning setting.
  for (const reasoning of ["off", "low"] as const) {
    const samples: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      try {
        const run = await timed({
          role: "fast",
          reasoning,
          priority: Priority.realtime,
          maxTokens: 120,
          messages: [
            {
              role: "system",
              content: "You are a friendly tutor speaking aloud. One or two short sentences, no markdown.",
            },
            { role: "user", content: "Why do leaves look green?" },
          ],
        });
        if (run.ttftMs) samples.push(run.ttftMs);
        if (i === 0) console.log(`  sample (${reasoning}): ${run.text.slice(0, 120)}`);
      } catch (error) {
        record(
          `fast model TTFT (reasoning ${reasoning})`,
          false,
          error instanceof LlmError ? `${error.kind} ${error.code ?? ""} ${error.message}` : String(error),
        );
      }
    }
    if (samples.length) {
      samples.sort((a, b) => a - b);
      record(
        `fast model TTFT (reasoning ${reasoning})`,
        true,
        `p50 ${samples[Math.floor(samples.length / 2)]} ms, min ${samples[0]} ms over ${samples.length} runs`,
      );
    }
  }

  // 2. Tool calling on the fast model.
  try {
    const run = await timed({
      role: "fast",
      reasoning: "low",
      maxTokens: 400,
      messages: [{ role: "user", content: "Show me photos of a red panda." }],
      tools: [
        {
          name: "show_images",
          description: "Show real photos of something concrete to the learner.",
          parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        },
      ],
    });
    record(
      "tool calling",
      run.tools.length > 0,
      run.tools.join(", ") || `no tool call; said: ${run.text.slice(0, 80)}`,
    );
  } catch (error) {
    record("tool calling", false, String(error));
  }

  // 3. JSON mode on the smart model (study-guide sync path).
  try {
    const run = await timed({
      role: "smart",
      reasoning: "low",
      json: true,
      maxTokens: 800,
      priority: Priority.batch,
      messages: [
        {
          role: "system",
          content: 'Reply only with JSON: {"ops":[{"op":"set_overview","title":"...","summary":"..."}]}',
        },
        { role: "user", content: "Learner asked what photosynthesis is; tutor explained light and dark reactions." },
      ],
    });
    const parsed = parseJsonObject<{ ops?: unknown[] }>(run.text);
    record(
      "JSON mode (smart model)",
      Boolean(parsed?.ops),
      `total ${run.totalMs} ms, first event ${run.firstEventMs} ms`,
    );
  } catch (error) {
    record("JSON mode (smart model)", false, String(error));
  }

  // 4. Concurrency ceiling: fire N parallel short requests, count throttles.
  for (const parallel of [3, 6]) {
    const results = await Promise.allSettled(
      Array.from({ length: parallel }, () =>
        llm.complete({
          role: "fast",
          reasoning: "low",
          maxTokens: 20,
          messages: [{ role: "user", content: "Say OK." }],
        }),
      ),
    );
    const throttled = results.filter(
      (r) => r.status === "rejected" && r.reason instanceof LlmError && r.reason.kind === "rate_limit",
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;
    record(
      `concurrency ${parallel} parallel`,
      failed === 0,
      `${parallel - failed} ok, ${throttled} throttled (1302), ${failed - throttled} other errors`,
    );
  }

  const failures = rows.filter((row) => !row.ok).length;
  console.log(`\n${rows.length - failures}/${rows.length} live checks passed.`);
  console.log("Tip: set ZAI_FAST_CONCURRENCY / ZAI_SMART_CONCURRENCY just below the level where throttling started.");
  process.exit(failures ? 1 : 0);
}

void main();
