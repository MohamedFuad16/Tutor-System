/**
 * Voice fast path against a slow model: the tutor acknowledges the learner
 * while the reply is still coming, action tags never reach speech, and an
 * [[images: …]] tag puts photos on screen and in the notebook thread.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import WebSocket from "ws";
import { createApp } from "../../server/app";
import { loadConfig } from "../../server/config";
import { createContext, type AppContext } from "../../server/context";
import { createMockLlm, createMockSpeech } from "../../server/providers/mock";
import type { Search } from "../../server/providers/search";
import type { ChatMessage } from "../../shared/types";

const USER = "learner_voicefast01";
let ctx: AppContext;
let speech: ReturnType<typeof createMockSpeech>;
let server: http.Server;
let base = "";
const searched: string[] = [];

const fakeSearch: Search = {
  providers: { web: "wikipedia", images: "wikimedia" },
  async web() {
    return [];
  },
  async images(query: string) {
    searched.push(query);
    return [
      {
        title: "Red panda",
        imageUrl: "https://upload.wikimedia.org/red-panda.jpg",
        thumbnailUrl: "https://upload.wikimedia.org/red-panda-thumb.jpg",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Red_panda.jpg",
        domain: "commons.wikimedia.org",
      },
    ];
  },
} as unknown as Search;

async function api<T>(method: string, route: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: { "x-user-id": USER, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await response.json()) as T;
}

const until = async (check: () => boolean | Promise<boolean>, timeout = 10_000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for condition");
};

beforeAll(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutor-voice-"));
  const config = { ...loadConfig(), dataDir, allowedOrigins: [], accessCode: "" };
  speech = createMockSpeech();
  // 200 ms per token: the first word arrives after ~1 s, well past the acknowledgement delay.
  ctx = createContext(config, { llm: createMockLlm({ tokenDelayMs: 200 }), speech, search: fakeSearch });
  const app = await createApp(ctx, { serveClient: false });
  server = http.createServer(app);
  server.on("upgrade", (req, socket, head) => {
    if (!ctx.voice.handleUpgrade(req, socket, head)) socket.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  ctx.shutdown();
  await new Promise((resolve) => server.close(resolve));
});

it("acknowledges a slow reply, hides action tags from speech, and shows requested images", async () => {
  const book = await api<{ id: string }>("POST", "/books", { title: "Animals" });
  const ticket = await api<{ ticket: string; path: string }>("POST", "/voice/ticket");
  const ws = new WebSocket(`${base.replace("http", "ws")}${ticket.path}?ticket=${ticket.ticket}`);
  const messages: any[] = [];
  ws.on("message", (data, isBinary) => {
    if (isBinary) return;
    const message = JSON.parse(String(data));
    messages.push(message);
    if (message.type === "segment") ws.send(JSON.stringify({ type: "playback", seq: message.seq, state: "start" }));
    if (message.type === "segment_end") ws.send(JSON.stringify({ type: "playback", seq: message.seq, state: "end" }));
  });
  await new Promise((resolve) => ws.on("open", resolve));
  ws.send(JSON.stringify({ type: "hello", bookId: book.id, language: "en", stt: "server", tts: "server" }));
  await until(() => messages.some((m) => m.type === "ready"));

  speech.lastSession!.emit({ type: "end_of_turn", transcript: "show me pictures of red pandas" });
  await until(() => messages.some((m) => m.type === "turn_end"));
  ws.close();

  const spoken = messages.filter((m) => m.type === "segment").map((m) => m.text as string);
  // The acknowledgement comes first, before the model's first words.
  expect(spoken[0]).toMatch(/^(Mm, let me think\.|Okay\.|Hmm, good one\.|Right\.|Let me see\.)$/);
  expect(spoken.slice(1).join(" ")).toContain("Here's what it looks like.");
  expect(spoken.join(" ")).not.toContain("[[");
  expect(searched).toEqual(["show me pictures of red pandas"]);
  expect(messages.some((m) => m.type === "visual" && m.visual.kind === "images")).toBe(true);

  // The notebook thread keeps the spoken answer (without the acknowledgement or the tag) and the images.
  const thread = await api<ChatMessage[]>("GET", `/books/${book.id}/messages?limit=20`);
  const answer = thread.find((m) => m.role === "assistant" && m.channel === "voice");
  expect(answer?.content).toBe("Here's what it looks like.");
  expect(answer?.parts.some((part) => part.type === "images")).toBe(true);
});
