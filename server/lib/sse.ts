/**
 * Minimal Server-Sent-Events helpers: a parser for upstream provider streams
 * and a writer for our own browser-facing streams.
 */
import type { Response } from "express";

/** Parses an SSE byte stream into `data:` payload strings (one per event). */
export async function* readSseData(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const onAbort = () => void reader.cancel().catch(() => undefined);
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      // Events are separated by a blank line; tolerate \r\n line endings.
      while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, "");
        const data = rawEvent
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data) yield data;
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith("data:")) yield tail.slice(5).trim();
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

export type SseWriter = {
  send: (event: string, data: unknown) => void;
  comment: (text: string) => void;
  close: () => void;
  readonly closed: boolean;
  /** Aborts when the client disconnects. */
  readonly signal: AbortSignal;
};

/** Opens a browser-facing SSE stream with named events and heartbeats. */
export function openSse(res: Response, options: { heartbeatMs?: number } = {}): SseWriter {
  const controller = new AbortController();
  let closed = false;
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    if (!closed) res.write(": ping\n\n");
  }, options.heartbeatMs ?? 15_000);

  const finish = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    controller.abort();
  };
  res.on("close", finish);

  return {
    send(event, data) {
      if (closed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    comment(text) {
      if (!closed) res.write(`: ${text.replace(/\n/g, " ")}\n\n`);
    },
    close() {
      if (closed) return;
      finish();
      res.end();
    },
    get closed() {
      return closed;
    },
    get signal() {
      return controller.signal;
    },
  };
}
