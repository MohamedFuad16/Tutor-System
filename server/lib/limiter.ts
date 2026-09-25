/**
 * Priority-aware concurrency limiter for upstream model calls.
 *
 * Every model (or model family) gets its own limiter so a slow background
 * synthesis job can never starve the live voice turn. Work is admitted in
 * priority order (lower number first, FIFO within a priority), queued work can
 * be cancelled with an AbortSignal, and the ceiling adapts to upstream
 * back-pressure: a 429 halves the effective concurrency, each success creeps it
 * back up towards the configured maximum (AIMD, the same shape TCP uses).
 */

export const Priority = {
  /** Live voice turn: a human is waiting with an open microphone. */
  realtime: 0,
  /** Typed chat: a human is watching a stream. */
  interactive: 1,
  /** Delegated work a user asked for, finished asynchronously. */
  background: 2,
  /** Housekeeping such as study-guide synthesis. */
  batch: 3,
} as const;

export type PriorityLevel = (typeof Priority)[keyof typeof Priority];

type Waiter = {
  priority: number;
  seq: number;
  enqueuedAt: number;
  resolve: (release: () => void) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
};

export type LimiterStats = {
  name: string;
  maxConcurrency: number;
  effectiveConcurrency: number;
  active: number;
  queued: number;
  queuedByPriority: Record<string, number>;
  completed: number;
  throttled: number;
  avgQueueWaitMs: number;
};

export class AbortedError extends Error {
  constructor(message = "Aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export class PriorityLimiter {
  private active = 0;
  private seq = 0;
  private queue: Waiter[] = [];
  private effective: number;
  private completed = 0;
  private throttled = 0;
  private waitTotalMs = 0;
  private waitSamples = 0;

  constructor(
    readonly name: string,
    private maxConcurrency: number,
  ) {
    this.maxConcurrency = Math.max(1, Math.floor(maxConcurrency));
    this.effective = this.maxConcurrency;
  }

  /** Runs `task` once a slot is free. Rejects early if `signal` aborts while queued. */
  async run<T>(task: () => Promise<T>, options: { priority?: number; signal?: AbortSignal } = {}): Promise<T> {
    const release = await this.acquire(options.priority ?? Priority.interactive, options.signal);
    try {
      return await task();
    } finally {
      release();
    }
  }

  acquire(priority: number, signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new AbortedError());
    if (this.active < this.effective && this.queue.length === 0) {
      this.active += 1;
      this.recordWait(0);
      return Promise.resolve(this.makeRelease());
    }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        priority,
        seq: this.seq++,
        enqueuedAt: Date.now(),
        resolve,
        reject,
        signal,
      };
      if (signal) {
        waiter.onAbort = () => {
          const index = this.queue.indexOf(waiter);
          if (index >= 0) this.queue.splice(index, 1);
          reject(new AbortedError());
        };
        signal.addEventListener("abort", waiter.onAbort, { once: true });
      }
      this.insert(waiter);
    });
  }

  /** Upstream said "slow down": halve the admission ceiling. */
  noteThrottled() {
    this.throttled += 1;
    this.effective = Math.max(1, Math.floor(this.effective / 2));
  }

  /** Upstream call succeeded: additive increase back towards the maximum. */
  noteSuccess() {
    this.completed += 1;
    if (this.effective < this.maxConcurrency) {
      this.effective += 1;
      this.drain();
    }
  }

  setMaxConcurrency(value: number) {
    this.maxConcurrency = Math.max(1, Math.floor(value));
    this.effective = Math.min(this.effective, this.maxConcurrency) || 1;
    this.drain();
  }

  stats(): LimiterStats {
    const queuedByPriority: Record<string, number> = {};
    for (const waiter of this.queue) {
      const key = String(waiter.priority);
      queuedByPriority[key] = (queuedByPriority[key] || 0) + 1;
    }
    return {
      name: this.name,
      maxConcurrency: this.maxConcurrency,
      effectiveConcurrency: this.effective,
      active: this.active,
      queued: this.queue.length,
      queuedByPriority,
      completed: this.completed,
      throttled: this.throttled,
      avgQueueWaitMs: this.waitSamples ? Math.round(this.waitTotalMs / this.waitSamples) : 0,
    };
  }

  private insert(waiter: Waiter) {
    // Binary search keeps insertion O(log n); ties keep FIFO order via seq.
    let lo = 0;
    let hi = this.queue.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const other = this.queue[mid];
      if (other.priority < waiter.priority || (other.priority === waiter.priority && other.seq < waiter.seq)) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this.queue.splice(lo, 0, waiter);
  }

  private makeRelease() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      this.drain();
    };
  }

  private drain() {
    while (this.active < this.effective && this.queue.length > 0) {
      const next = this.queue.shift()!;
      if (next.signal && next.onAbort) next.signal.removeEventListener("abort", next.onAbort);
      this.active += 1;
      this.recordWait(Date.now() - next.enqueuedAt);
      next.resolve(this.makeRelease());
    }
  }

  private recordWait(ms: number) {
    this.waitTotalMs += ms;
    this.waitSamples += 1;
  }
}
