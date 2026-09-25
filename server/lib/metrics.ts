/**
 * In-process metrics: rolling latency samples and counters for the health
 * endpoint, plus a listener hook so the store can persist per-learner usage.
 * Kept deliberately small; in a multi-instance deployment these would be
 * exported to CloudWatch/Prometheus instead.
 */

export type LlmCallRecord = {
  model: string;
  role: string;
  purpose: string;
  userId?: string;
  ms: number;
  ttftMs: number | null;
  inputTokens: number;
  outputTokens: number;
  ok: boolean;
};

type Listener = (record: LlmCallRecord) => void;

class Rolling {
  private values: number[] = [];
  constructor(private readonly size = 200) {}
  add(value: number) {
    this.values.push(value);
    if (this.values.length > this.size) this.values.shift();
  }
  percentile(p: number) {
    if (!this.values.length) return null;
    const sorted = [...this.values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  }
  get count() {
    return this.values.length;
  }
}

class Metrics {
  private listeners = new Set<Listener>();
  private llmLatency = new Map<string, Rolling>();
  private llmTtft = new Map<string, Rolling>();
  private timers = new Map<string, Rolling>();
  private counters = new Map<string, number>();

  onLlmCall(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  recordLlmCall(record: LlmCallRecord) {
    const key = `${record.model}:${record.purpose}`;
    if (!this.llmLatency.has(key)) this.llmLatency.set(key, new Rolling());
    this.llmLatency.get(key)!.add(record.ms);
    if (record.ttftMs !== null) {
      if (!this.llmTtft.has(key)) this.llmTtft.set(key, new Rolling());
      this.llmTtft.get(key)!.add(record.ttftMs);
    }
    this.increment(record.ok ? "llm.ok" : "llm.error");
    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch {
        // Metrics must never break a request.
      }
    }
  }

  /** Records a named latency sample, e.g. "voice.eot_to_first_audio". */
  time(name: string, ms: number) {
    if (!this.timers.has(name)) this.timers.set(name, new Rolling());
    this.timers.get(name)!.add(ms);
  }

  increment(name: string, by = 1) {
    this.counters.set(name, (this.counters.get(name) || 0) + by);
  }

  snapshot() {
    const summarize = (map: Map<string, Rolling>) =>
      Object.fromEntries(
        [...map.entries()].map(([key, rolling]) => [
          key,
          { n: rolling.count, p50: rolling.percentile(50), p95: rolling.percentile(95) },
        ]),
      );
    return {
      llmLatencyMs: summarize(this.llmLatency),
      llmTtftMs: summarize(this.llmTtft),
      timersMs: summarize(this.timers),
      counters: Object.fromEntries(this.counters),
    };
  }
}

export const metrics = new Metrics();
