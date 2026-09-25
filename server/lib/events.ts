/**
 * Per-learner push channel. Background work (document ingestion, study-guide
 * sync) publishes here and every open tab of that learner receives it over
 * GET /api/events (SSE). Single-process today; swap the Map for Redis pub/sub
 * when running more than one instance.
 */
import type { ServerEvent } from "../../shared/types.js";

type Subscriber = (event: ServerEvent) => void;

export class EventHub {
  private subscribers = new Map<string, Set<Subscriber>>();

  subscribe(userId: string, subscriber: Subscriber) {
    if (!this.subscribers.has(userId)) this.subscribers.set(userId, new Set());
    this.subscribers.get(userId)!.add(subscriber);
    return () => {
      const set = this.subscribers.get(userId);
      set?.delete(subscriber);
      if (set && !set.size) this.subscribers.delete(userId);
    };
  }

  publish(userId: string, event: ServerEvent) {
    for (const subscriber of this.subscribers.get(userId) ?? []) {
      try {
        subscriber(event);
      } catch {
        // A broken subscriber must not affect the publisher.
      }
    }
  }

  get connections() {
    let total = 0;
    for (const set of this.subscribers.values()) total += set.size;
    return total;
  }
}

/**
 * Coalesces repeated triggers per key: waits `delayMs` after the last trigger
 * (or runs immediately when `force`), never runs the same key concurrently,
 * and re-runs once if triggered while running.
 */
export class KeyedDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private running = new Set<string>();
  private dirty = new Set<string>();

  constructor(private readonly task: (key: string) => Promise<void>) {}

  trigger(key: string, delayMs: number, force = false) {
    if (this.running.has(key)) {
      this.dirty.add(key);
      return;
    }
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => void this.run(key), force ? 0 : delayMs);
    timer.unref?.();
    this.timers.set(key, timer);
  }

  isBusy(key: string) {
    return this.running.has(key) || this.timers.has(key);
  }

  private async run(key: string) {
    this.timers.delete(key);
    this.running.add(key);
    try {
      await this.task(key);
    } catch {
      // Task implementations log their own failures.
    } finally {
      this.running.delete(key);
      if (this.dirty.delete(key)) this.trigger(key, 1_000);
    }
  }

  cancelAll() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
