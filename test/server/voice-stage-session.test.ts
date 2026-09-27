/**
 * The voice stage end to end over the WebSocket (mock model and speech):
 * "close it" clears the screen at once without asking the model, the magic
 * pen writes a board line by line in step with its narration, the tutor
 * builds a 3D model and then a web page (seeing what is on screen when asked
 * to change it), and speech recognition reconnects when its connection drops
 * instead of leaving the tutor deaf.
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

const USER = "learner_voicestage01";
let ctx: AppContext;
let speech: ReturnType<typeof createMockSpeech>;
let server: http.Server;
let base = "";
let sttOpened = 0;
const requests: LlmRequest[] = [];

const fakeSearch: Search = {
  providers: { web: "wikipedia", images: "wikimedia" },
  async web() {
    return [];
  },
  async readPage() {
    return null;
  },
  async images(query: string) {
    return [
      {
        title: `${query} thumbnail`,
        imageUrl: "https://example.com/small.jpg",
        thumbnailUrl: "https://example.com/small.jpg",
        sourceUrl: "https://example.com",
        domain: "example.com",
        width: 180,
        height: 120,
      },
      {
        title: query,
        imageUrl: "https://upload.wikimedia.org/big.jpg",
        thumbnailUrl: "https://upload.wikimedia.org/big-thumb.jpg",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Big.jpg",
        domain: "commons.wikimedia.org",
        width: 1600,
        height: 1000,
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

const until = async (check: () => boolean, timeout = 10_000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for condition");
};

beforeAll(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutor-stage-"));
  const config = { ...loadConfig(), dataDir, allowedOrigins: [] };
  speech = createMockSpeech();
  const openStt = speech.openStt.bind(speech);
  speech.openStt = (options) => {
    sttOpened += 1;
    return openStt(options);
  };
  const llm = createMockLlm({ tokenDelayMs: 2 });
  const stream = llm.stream.bind(llm);
  llm.stream = (request) => {
    requests.push(request);
    return stream(request);
  };
  const complete = llm.complete.bind(llm);
  llm.complete = (request) => {
    requests.push(request);
    return complete(request);
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
  const turnEnds = () => messages.filter((m) => m.type === "turn_end").length;
  const say = async (transcript: string, turns = 1) => {
    const before = turnEnds();
    speech.lastSession!.emit({ type: "end_of_turn", transcript });
    await until(() => turnEnds() >= before + turns);
  };
  return { ws, messages, say };
}

const stage = (messages: any[], kind: string) =>
  messages.filter((m) => m.type === "stage" && m.command.kind === kind).map((m) => m.command);

it("shows one photo, then closes it instantly without asking the model", async () => {
  const { ws, messages, say } = await openSession("Pandas");
  await say("show me pictures of red pandas");
  const pending = stage(messages, "pending");
  const visual = messages.find((m) => m.type === "visual")!.visual;
  expect(pending[0]).toMatchObject({ visual: "images", title: "red pandas" });
  // The placeholder turns into the result: same id.
  expect(visual.id).toBe(pending[0].id);
  // The big, clean photo comes first.
  expect(visual.images[0].domain).toBe("commons.wikimedia.org");

  const asked = requests.length;
  await say("Can you close it?");
  ws.close();
  expect(stage(messages, "close")).toHaveLength(1);
  expect(requests.length).toBe(asked);
  const reply = messages.filter((m) => m.type === "segment").at(-1)!.text;
  expect(["Done.", "Okay, cleared.", "Sure, it's gone."]).toContain(reply);
});

it("writes a board line by line while narrating it, and points at a line on request", async () => {
  const { ws, messages, say } = await openSession("Algebra");
  // Two turns: the bridge sentence, then the narrated board once it is ready.
  await say("solve x squared minus 5x plus 6 equals 0", 2);
  const pending = stage(messages, "pending").find((command) => command.visual === "board");
  const board = messages.find((m) => m.type === "visual" && m.visual.kind === "board")!.visual;
  expect(board.id).toBe(pending.id);
  expect(board.board.items.map((item: { id: string }) => item.id)).toEqual(["L1", "L2", "L3", "L4", "L5"]);
  const focused = messages
    .filter((m) => m.type === "segment" && m.focus?.visualId === board.id)
    .map((m) => m.focus.node);
  expect(focused).toEqual(["L1", "L2", "L3", "L4", "L5"]);

  requests.length = 0;
  await say("highlight the answer");
  ws.close();
  expect(stage(messages, "focus").at(-1)).toEqual({ kind: "focus", visualId: board.id, target: "L5" });
  // The model still answers, knowing the line is already highlighted.
  const turn = requests.find((request) => request.purpose === "voice.fg")!;
  expect(String(turn.messages.at(-1)!.content)).toContain("(Already done on screen: highlighted L5.)");
  expect(String(turn.messages[0].content)).toContain("L5 = $x = 2 \\text{ or } x = 3$");
});

it("builds a 3D model, then a web page that sees what is on screen", async () => {
  const { ws, messages, say } = await openSession("Space");
  await say("build a 3d model of the solar system", 2);
  const scene = messages.find((m) => m.type === "visual" && m.visual.kind === "scene")!.visual;
  expect(scene.scene.objects.map((object: { id: string }) => object.id)).toEqual(["sun", "earth", "orbit"]);
  expect(
    messages.filter((m) => m.type === "segment" && m.focus?.visualId === scene.id).map((m) => m.focus.node),
  ).toEqual(["sun", "earth"]);

  requests.length = 0;
  await say("now build a website about it", 2);
  ws.close();
  const web = messages.find((m) => m.type === "visual" && m.visual.kind === "web")!.visual;
  expect(web.html).toContain("Hello from Tutor");
  const build = requests.find((request) => request.purpose === "voice.build")!;
  expect(String(build.messages[0].content)).toContain("Current 3D scene JSON");
});

it("reconnects speech recognition when its connection drops", async () => {
  const { ws, messages, say } = await openSession("Reconnect");
  const opened = sttOpened;
  const broken = speech.lastSession!;
  broken.emit({ type: "closed" });
  await until(() => sttOpened === opened + 1);
  // Events from the dead connection are ignored; the new one is heard.
  broken.emit({ type: "end_of_turn", transcript: "this should be ignored" });
  await say("are you still there?");
  ws.close();
  const heard = messages.filter((m) => m.type === "user_final").map((m) => m.text);
  expect(heard).toEqual(["are you still there?"]);
  expect(messages.some((m) => m.type === "ready" && m.stt === "browser")).toBe(false);
});
