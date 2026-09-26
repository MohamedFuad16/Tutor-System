/**
 * HTTP client for the Tutor API. Adds the learner identity headers, turns
 * error bodies into readable errors, and parses POST-based SSE streams.
 */
import type { ChatRequest, ChatStreamEvent } from "@shared/types";
import { useApp } from "@/store/app";

/** Set VITE_API_BASE when the API is hosted on another origin (e.g. CDN frontend). */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function authHeaders(): Record<string, string> {
  const { userId, learnerName } = useApp.getState();
  return {
    "X-User-Id": userId,
    "X-User-Name": encodeURIComponent(learnerName).slice(0, 120),
  };
}

/** Query-string identity for transports that cannot set headers (EventSource, PDF worker fetch). */
export function authQuery() {
  return new URLSearchParams({ u: useApp.getState().userId }).toString();
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return String(body?.error ?? response.statusText);
  } catch {
    return response.statusText || `Request failed (${response.status})`;
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const response = await fetch(`${API_BASE}/api${path}`, { ...init, headers, body });
  if (!response.ok) throw new ApiError(response.status, await readError(response));
  if (response.status === 204) return undefined as T;
  const type = response.headers.get("content-type") ?? "";
  return (type.includes("application/json") ? response.json() : response.text()) as Promise<T>;
}

/** Streams POST /api/chat, invoking `onEvent` for every named SSE event. */
export async function streamChat(request: ChatRequest, onEvent: (event: ChatStreamEvent) => void, signal: AbortSignal) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok || !response.body) throw new ApiError(response.status, await readError(response));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (!data.length) continue;
      try {
        onEvent({ event, data: JSON.parse(data.join("\n")) } as ChatStreamEvent);
      } catch {
        // Ignore malformed frames rather than killing the stream.
      }
    }
  }
}

export function wsUrl(path: string) {
  const base = API_BASE || window.location.origin;
  const url = new URL(path, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
