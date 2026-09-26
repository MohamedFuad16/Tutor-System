/**
 * End-to-end API test: real Express app + WebSocket gateway + SQLite, with
 * the offline mock model and mock speech. Covers every product flow.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createApp } from "../../server/app";
import { loadConfig } from "../../server/config";
import { createContext, type AppContext } from "../../server/context";
import { createMockLlm, createMockSpeech } from "../../server/providers/mock";
import type { ChatMessage, StudyDocument } from "../../shared/types";

const USER = "learner_integration01";
const OTHER = "learner_integration02";
let ctx: AppContext;
let speech: ReturnType<typeof createMockSpeech>;
let server: http.Server;
let base = "";

const headers = (user = USER) => ({ "x-user-id": user, "x-user-name": "Mo", "content-type": "application/json" });

async function json<T>(
  method: string,
  route: string,
  body?: unknown,
  user = USER,
): Promise<{ status: number; data: T }> {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: headers(user),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, data: (text ? JSON.parse(text) : undefined) as T };
}

async function chat(bookId: string, message: string, extra: Record<string, unknown> = {}) {
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ bookId, message, ...extra }),
  });
  const text = await response.text();
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => ({
      event: block.match(/^event: (.+)$/m)?.[1] ?? "message",
      data: JSON.parse(block.match(/^data: (.+)$/m)?.[1] ?? "null"),
    }));
}

const until = async (check: () => Promise<boolean> | boolean, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Timed out waiting for condition");
};

beforeAll(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutor-api-"));
  const config = {
    ...loadConfig(),
    dataDir,
    allowedOrigins: [],
    guide: { debounceMs: 30, maxPendingMessages: 50 },
  };
  speech = createMockSpeech();
  ctx = createContext(config, { llm: createMockLlm({ tokenDelayMs: 1 }), speech });
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

describe("API", () => {
  let bookId = "";
  let documentId = "";

  it("reports health without identity, requires identity elsewhere", async () => {
    const health = await fetch(`${base}/api/health`).then((r) => r.json());
    expect(health.ok).toBe(true);
    expect(health.llm.provider).toBe("mock");
    const denied = await fetch(`${base}/api/books`);
    expect(denied.status).toBe(400);
  });

  it("creates a notebook and ingests a PDF", async () => {
    const created = await json<{ id: string; title: string }>("POST", "/books", { title: "New notebook" });
    expect(created.status).toBe(201);
    bookId = created.data.id;

    const form = new FormData();
    form.append(
      "file",
      new Blob([fs.readFileSync(path.join(__dirname, "../fixtures/photosynthesis.pdf"))], { type: "application/pdf" }),
      "photosynthesis.pdf",
    );
    const upload = await fetch(`${base}/api/books/${bookId}/documents`, {
      method: "POST",
      headers: { "x-user-id": USER },
      body: form,
    });
    expect(upload.status).toBe(202);
    documentId = (await upload.json()).id;

    await until(
      async () => (await json<StudyDocument[]>("GET", `/books/${bookId}/documents`)).data[0]?.status === "ready",
    );
    const docs = (await json<StudyDocument[]>("GET", `/books/${bookId}/documents`)).data;
    expect(docs[0].pageCount).toBe(3);
    expect(docs[0].title).not.toMatch(/about:blank/);

    const file = await fetch(`${base}/api/documents/${documentId}/file`, { headers: { "x-user-id": USER } });
    expect(file.headers.get("content-type")).toContain("application/pdf");
    // The notebook takes its name from the document (named just after the document is ready).
    const bookTitle = async () =>
      (await json<Array<{ id: string; title: string }>>("GET", "/books")).data.find((b) => b.id === bookId)?.title;
    await until(async () => (await bookTitle()) === "Mock Study Topic");
    expect(await bookTitle()).toBe("Mock Study Topic");
  });

  it("OCRs scanned pages that have no text layer", async () => {
    const created = await json<{ id: string }>("POST", "/books", { title: "Scans" });
    const form = new FormData();
    form.append(
      "file",
      new Blob([fs.readFileSync(path.join(__dirname, "../fixtures/scanned.pdf"))], { type: "application/pdf" }),
      "scanned.pdf",
    );
    const upload = await fetch(`${base}/api/books/${created.data.id}/documents`, {
      method: "POST",
      headers: { "x-user-id": USER },
      body: form,
    });
    expect(upload.status).toBe(202);
    await until(
      async () =>
        (await json<StudyDocument[]>("GET", `/books/${created.data.id}/documents`)).data[0]?.status !== "processing",
    );
    const [doc] = (await json<StudyDocument[]>("GET", `/books/${created.data.id}/documents`)).data;
    expect(doc.status).toBe("ready");
    expect(doc.ocrPages).toBe(1);
    // The OCR text is now retrievable like any other page.
    expect(ctx.store.library.getPageText(doc.id, 1)).toContain("Mock OCR transcription");
    await fetch(`${base}/api/books/${created.data.id}`, { method: "DELETE", headers: headers() });
  });

  it("rejects non-PDF uploads and hides other learners' data", async () => {
    const form = new FormData();
    form.append("file", new Blob(["hello"], { type: "text/plain" }), "notes.txt");
    const bad = await fetch(`${base}/api/books/${bookId}/documents`, {
      method: "POST",
      headers: { "x-user-id": USER },
      body: form,
    });
    expect(bad.status).toBe(400);
    expect((await json("GET", `/books/${bookId}/documents`, undefined, OTHER)).status).toBe(404);
    const file = await fetch(`${base}/api/documents/${documentId}/file`, { headers: { "x-user-id": OTHER } });
    expect(file.status).toBe(404);
  });

  it("streams a grounded chat answer with page citations and a diagram", async () => {
    const events = await chat(bookId, "How does the Calvin cycle process work?", { focus: { documentId, page: 2 } });
    const names = events.map((e) => e.event);
    expect(names[0]).toBe("start");
    expect(names).toContain("delta");
    expect(names.at(-1)).toBe("done");
    const done = events.at(-1)!.data.message as ChatMessage;
    expect(done.content).toContain("[D1 p.");
    expect(done.content).toContain("```mermaid");
    const sources = done.parts.find((p) => p.type === "sources");
    expect(sources && sources.type === "sources" && sources.sources[0].documentId).toBe(documentId);
  });

  it("runs tools: quiz card graded server-side moves mastery", async () => {
    const events = await chat(bookId, "quiz me on this");
    const part = events.find((e) => e.event === "part")?.data;
    expect(part.type).toBe("quiz");
    expect(part.quiz.answer).toBe(""); // answer never leaks before grading
    const graded = await json<{ result: { correct: boolean; mastery: number } }>(
      "POST",
      `/quiz/${part.quiz.id}/answer`,
      { choice: 0 },
    );
    expect(graded.data.result.correct).toBe(true);
    expect(graded.data.result.mastery).toBeGreaterThan(0.2);
    // Result is persisted on the message.
    const messages = (await json<ChatMessage[]>("GET", `/books/${bookId}/messages`)).data;
    const quizPart = messages.flatMap((m) => m.parts).find((p) => p.type === "quiz");
    expect(quizPart && quizPart.type === "quiz" && quizPart.result?.correct).toBe(true);
  });

  it("shows images via the image tool", async () => {
    // Search is offline here; the tool must degrade gracefully (no images → no part, still an answer).
    const events = await chat(bookId, "show me a picture of chloroplasts");
    expect(events.at(-1)!.event).toBe("done");
  });

  it("builds the living study guide and mirrors flashcards", async () => {
    await until(
      async () => (await json<{ guide: { version: number } }>("GET", `/books/${bookId}/guide`)).data.guide.version > 0,
    );
    const { data } = await json<{
      guide: { sections: unknown[]; concepts: Array<{ id: string }> };
      mastery: Record<string, number>;
    }>("GET", `/books/${bookId}/guide`);
    expect(data.guide.sections.length).toBeGreaterThan(0);
    expect(data.guide.concepts.length).toBeGreaterThan(0);
    const cards = (await json<Array<{ id: string }>>("GET", `/cards?bookId=${bookId}`)).data;
    expect(cards.length).toBeGreaterThan(0);
    const reviewed = await json<{ card: { reps: number } }>("POST", `/cards/${cards[0].id}/review`, { grade: "good" });
    expect(reviewed.data.card.reps).toBe(1);
  });

  it("narrates diagrams with a generated tour", async () => {
    const { data } = await json<{ steps: Array<{ node: string }> }>("POST", "/diagram/tour", {
      mermaid: "flowchart LR\n A[Light] --> B[Sugar]",
    });
    expect(data.steps.map((s) => s.node)).toEqual(["A", "B"]);
  });

  it("aggregates analytics", async () => {
    await json("POST", "/activity", { seconds: 120, bookId });
    const { data } = await json<{
      totals: { questions: number; studyMinutes: number; reviews: number; documents: number };
    }>("GET", "/analytics");
    expect(data.totals.questions).toBeGreaterThanOrEqual(3);
    expect(data.totals.studyMinutes).toBeGreaterThanOrEqual(2);
    expect(data.totals.reviews).toBeGreaterThanOrEqual(2);
    expect(data.totals.documents).toBe(1);
  });

  it("runs a duplex voice session: answer, delegate, narrated diagram, barge-in", async () => {
    const ticket = (await json<{ ticket: string; path: string }>("POST", "/voice/ticket")).data;
    const ws = new WebSocket(`${base.replace("http", "ws")}${ticket.path}?ticket=${ticket.ticket}`);
    const messages: any[] = [];
    let audio = 0;
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        audio += (data as Buffer).length;
        return;
      }
      const message = JSON.parse(String(data));
      messages.push(message);
      if (message.type === "segment") ws.send(JSON.stringify({ type: "playback", seq: message.seq, state: "start" }));
      if (message.type === "segment_end")
        setTimeout(() => ws.send(JSON.stringify({ type: "playback", seq: message.seq, state: "end" })), 5);
    });
    await new Promise((resolve) => ws.on("open", resolve));
    ws.send(
      JSON.stringify({
        type: "hello",
        bookId,
        language: "en",
        stt: "browser",
        tts: "server",
        sampleRate: 16000,
        focus: { documentId, page: 1 },
      }),
    );
    await until(() => messages.some((m) => m.type === "ready"));

    ws.send(JSON.stringify({ type: "text", text: "What does chlorophyll do?" }));
    await until(() => messages.some((m) => m.type === "turn_end"));
    expect(audio).toBeGreaterThan(0);

    ws.send(JSON.stringify({ type: "text", text: "Can you draw a diagram of the Calvin cycle?" }));
    await until(() => messages.some((m) => m.type === "visual" && m.visual.kind === "diagram"));
    await until(() => messages.filter((m) => m.type === "segment" && m.focus).length >= 3);
    const focused = messages.filter((m) => m.type === "segment" && m.focus);
    expect(focused.map((m) => m.focus.node)).toEqual(["A", "B", "C"]);
    await until(() => messages.filter((m) => m.type === "turn_end").length >= 3);

    // Barge-in: the learner talks over the tutor.
    const before = messages.length;
    ws.send(JSON.stringify({ type: "text", text: "Tell me about limiting factors in detail please" }));
    await until(() => messages.slice(before).some((m) => m.type === "segment"));
    ws.send(JSON.stringify({ type: "speech_start" }));
    ws.send(JSON.stringify({ type: "partial", text: "wait actually" }));
    await until(() => messages.slice(before).some((m) => m.type === "clear"));
    ws.send(JSON.stringify({ type: "bye" }));
    await new Promise((resolve) => ws.on("close", resolve));

    // Voice turns land in the notebook thread.
    const thread = (await json<ChatMessage[]>("GET", `/books/${bookId}/messages?limit=100`)).data;
    expect(thread.some((m) => m.channel === "voice" && m.role === "user")).toBe(true);
    expect(thread.some((m) => m.channel === "voice" && m.parts.some((p) => p.type === "diagram"))).toBe(true);
    expect(thread.some((m) => m.channel === "voice" && m.interrupted)).toBe(true);
  });

  it("speculates on EagerEndOfTurn, releases on EndOfTurn, cancels on TurnResumed", async () => {
    const ticket = (await json<{ ticket: string; path: string }>("POST", "/voice/ticket")).data;
    const ws = new WebSocket(`${base.replace("http", "ws")}${ticket.path}?ticket=${ticket.ticket}`);
    const messages: any[] = [];
    let audioFrames = 0;
    // While `hold` is set, playback "end" is withheld: the tutor is audibly still talking.
    let hold = false;
    const held: number[] = [];
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        audioFrames += 1;
        return;
      }
      const message = JSON.parse(String(data));
      messages.push(message);
      if (message.type === "segment") ws.send(JSON.stringify({ type: "playback", seq: message.seq, state: "start" }));
      if (message.type === "segment_end") {
        if (hold) held.push(message.seq);
        else setTimeout(() => ws.send(JSON.stringify({ type: "playback", seq: message.seq, state: "end" })), 5);
      }
    });
    await new Promise((resolve) => ws.on("open", resolve));
    ws.send(JSON.stringify({ type: "hello", bookId, language: "en", stt: "server", tts: "server", sampleRate: 16000 }));
    await until(() => messages.some((m) => m.type === "ready"));
    expect(messages.find((m) => m.type === "ready").stt).toBe("server");
    const emit = speech.lastSession!.emit;

    // Speculative start: generation begins, but no audio may play before the turn is confirmed.
    emit({ type: "start_of_turn" });
    emit({ type: "update", transcript: "what does chlorophyll do" });
    emit({ type: "eager_end_of_turn", transcript: "what does chlorophyll do" });
    await new Promise((r) => setTimeout(r, 300));
    expect(audioFrames).toBe(0);
    expect(messages.some((m) => m.type === "segment")).toBe(false);
    emit({ type: "end_of_turn", transcript: "what does chlorophyll do" });
    await until(() => messages.some((m) => m.type === "turn_end"));
    expect(audioFrames).toBeGreaterThan(0);
    const system = (await json<{ metrics: { counters: Record<string, number> } }>("GET", "/system")).data;
    expect(system.metrics.counters["voice.speculation_hit"]).toBeGreaterThanOrEqual(1);

    // Resumed turn: the speculative draft is discarded and the final transcript answered fresh.
    const before = messages.length;
    emit({ type: "start_of_turn" });
    emit({ type: "eager_end_of_turn", transcript: "and what about" });
    await new Promise((r) => setTimeout(r, 50));
    emit({ type: "turn_resumed" });
    emit({ type: "end_of_turn", transcript: "and what about the Calvin cycle" });
    await until(() => messages.slice(before).some((m) => m.type === "turn_end"));
    const finals = messages.slice(before).filter((m) => m.type === "user_final");
    expect(finals.map((m) => m.text)).toEqual(["and what about the Calvin cycle"]);

    // Echo guard: the mic hearing the tutor's own words must neither interrupt nor become a turn.
    const echoStart = messages.length;
    hold = true;
    emit({ type: "end_of_turn", transcript: "tell me about the limiting factors" });
    await until(() => messages.slice(echoStart).some((m) => m.type === "segment"));
    const spoken = messages.slice(echoStart).find((m) => m.type === "segment").text as string;
    const echo = spoken.split(/\s+/).slice(0, 6).join(" ");
    emit({ type: "start_of_turn" });
    emit({ type: "update", transcript: echo });
    emit({ type: "end_of_turn", transcript: echo });
    await new Promise((r) => setTimeout(r, 150));
    const afterEcho = messages.slice(echoStart);
    expect(afterEcho.some((m) => m.type === "clear")).toBe(false);
    expect(afterEcho.filter((m) => m.type === "user_final").map((m) => m.text)).toEqual([
      "tell me about the limiting factors",
    ]);
    // Real words from the learner still barge in.
    emit({ type: "update", transcript: "hold on a second" });
    await until(() => messages.slice(echoStart).some((m) => m.type === "clear"));

    ws.send(JSON.stringify({ type: "bye" }));
    await new Promise((resolve) => ws.on("close", resolve));
  });

  it("refuses voice upgrades without a valid ticket", async () => {
    const ws = new WebSocket(`${base.replace("http", "ws")}/ws/voice?ticket=forged`);
    const status = await new Promise<number>((resolve) =>
      ws.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0)),
    );
    expect(status).toBe(401);
  });

  it("deletes a notebook with everything in it", async () => {
    const response = await fetch(`${base}/api/books/${bookId}`, { method: "DELETE", headers: headers() });
    expect(response.status).toBe(204);
    expect((await json("GET", `/books/${bookId}/guide`)).status).toBe(404);
  });
});
