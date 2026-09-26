/**
 * Voice fast path against a slow model: the tutor acknowledges the learner
 * while the reply is still coming, action tags never reach speech, photo
 * requests put pictures on screen (from the model's [[images: …]] tag or,
 * when the model forgets it, from the server's own intent detection), and the
 * model sees its own tags in history on the next turn.
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
import type { LlmRequest } from "../../server/providers/llm";
import type { Search } from "../../server/providers/search";
import type { ChatMessage } from "../../shared/types";

const USER = "learner_voicefast01";
let ctx: AppContext;
let speech: ReturnType<typeof createMockSpeech>;
let server: http.Server;
let base = "";
const searched: string[] = [];
const requests: LlmRequest[] = [];

const fakeSearch: Search = {
  providers: { web: "wikipedia", images: "wikimedia" },
  async web() {
    return [];
  },
  async images(query: string) {
    searched.push(query);
    return [
      {
        title: query,
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
  const config = { ...loadConfig(), dataDir, allowedOrigins: [] };
  speech = createMockSpeech();
  // 200 ms per token: the first word arrives after ~1 s, well past the acknowledgement delay.
  const llm = createMockLlm({ tokenDelayMs: 200 });
  const stream = llm.stream.bind(llm);
  llm.stream = (request) => {
    requests.push(request);
    return stream(request);
  };
  ctx = createContext(config, { llm, speech, search: fakeSearch });
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

async function openSession(title: string) {
  const book = await api<{ id: string }>("POST", "/books", { title });
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
  const say = async (transcript: string) => {
    const before = messages.filter((m) => m.type === "turn_end").length;
    speech.lastSession!.emit({ type: "end_of_turn", transcript });
    await until(() => messages.filter((m) => m.type === "turn_end").length > before);
  };
  return { book, ws, messages, say };
}

it("acknowledges a slow reply, hides action tags from speech, and shows requested images", async () => {
  searched.length = 0;
  const { book, ws, messages, say } = await openSession("Animals");
  await say("show me pictures of red pandas");
  ws.close();

  const spoken = messages.filter((m) => m.type === "segment").map((m) => m.text as string);
  // The acknowledgement comes first, before the model's first words.
  expect(spoken[0]).toMatch(/^(Mm, let me think\.|Okay\.|Hmm, good one\.|Right\.|Let me see\.)$/);
  expect(spoken.slice(1).join(" ")).toContain("Here's what it looks like.");
  expect(spoken.join(" ")).not.toContain("[[");
  // The learner's own words drive one search (the model's tag for the same request is not repeated).
  expect(searched).toEqual(["red pandas"]);
  expect(messages.filter((m) => m.type === "visual" && m.visual.kind === "images")).toHaveLength(1);

  // The notebook thread keeps the spoken answer (without the acknowledgement or the tag) and the images.
  const thread = await api<ChatMessage[]>("GET", `/books/${book.id}/messages?limit=20`);
  const answer = thread.find((m) => m.role === "assistant" && m.channel === "voice");
  expect(answer?.content).toBe("Here's what it looks like.");
  expect(answer?.parts.some((part) => part.type === "images")).toBe(true);
});

it("pulls up photos the model only talked about, and remembers them next turn", async () => {
  searched.length = 0;
  const { ws, messages, say } = await openSession("Cities");

  // The mock model answers this without an [[images: …]] tag.
  await say("Pull up Tokyo");
  const visuals = messages.filter((m) => m.type === "visual" && m.visual.kind === "images");
  expect(visuals.map((m) => m.visual.query)).toEqual(["Tokyo"]);
  expect(searched).toEqual(["Tokyo"]);
  // Photos arrive before the reply finishes speaking, not after it.
  const visualAt = messages.indexOf(visuals[0]);
  const turnEndAt = messages.findIndex((m) => m.type === "turn_end");
  expect(visualAt).toBeLessThan(turnEndAt);

  // Next turn: the model's history records what it showed, in its own tag format.
  requests.length = 0;
  await say("Thanks, that looks busy");
  ws.close();
  const history = requests.find((request) => request.purpose === "voice.fg")!.messages;
  const previous = history.filter((message) => message.role === "assistant").at(-1);
  expect(String(previous?.content)).toContain("[[images: Tokyo]]");
  expect(
    messages
      .filter((m) => m.type === "segment")
      .map((m) => m.text as string)
      .join(" "),
  ).not.toContain("[[");
});
