import { describe, expect, it } from "vitest";
import { AbortedError, Priority, PriorityLimiter } from "../../server/lib/limiter";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("PriorityLimiter", () => {
  it("never exceeds its concurrency", async () => {
    const limiter = new PriorityLimiter("t", 2);
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 8 }, () =>
        limiter.run(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((r) => setTimeout(r, 5));
          active -= 1;
        }),
      ),
    );
    expect(peak).toBe(2);
  });

  it("admits higher priority work first, FIFO within a priority", async () => {
    const limiter = new PriorityLimiter("t", 1);
    const gate = deferred();
    const order: string[] = [];
    const blocker = limiter.run(() => gate.promise);
    const jobs = [
      limiter.run(async () => void order.push("batch"), { priority: Priority.batch }),
      limiter.run(async () => void order.push("chat-1"), { priority: Priority.interactive }),
      limiter.run(async () => void order.push("voice"), { priority: Priority.realtime }),
      limiter.run(async () => void order.push("chat-2"), { priority: Priority.interactive }),
    ];
    gate.resolve();
    await Promise.all([blocker, ...jobs]);
    expect(order).toEqual(["voice", "chat-1", "chat-2", "batch"]);
  });

  it("removes aborted work from the queue", async () => {
    const limiter = new PriorityLimiter("t", 1);
    const gate = deferred();
    const blocker = limiter.run(() => gate.promise);
    const controller = new AbortController();
    const queued = limiter.run(async () => "ran", { signal: controller.signal });
    expect(limiter.stats().queued).toBe(1);
    controller.abort();
    await expect(queued).rejects.toBeInstanceOf(AbortedError);
    expect(limiter.stats().queued).toBe(0);
    gate.resolve();
    await blocker;
  });

  it("halves concurrency on throttling and recovers additively", () => {
    const limiter = new PriorityLimiter("t", 4);
    limiter.noteThrottled();
    expect(limiter.stats().effectiveConcurrency).toBe(2);
    limiter.noteThrottled();
    limiter.noteThrottled();
    expect(limiter.stats().effectiveConcurrency).toBe(1);
    limiter.noteSuccess();
    limiter.noteSuccess();
    expect(limiter.stats().effectiveConcurrency).toBe(3);
  });
});
