import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import { WebSocket } from "ws";

import { createTutorServerApp } from "../.tmp-test/server.mjs";

const startApp = async () => {
  const { app } = await createTutorServerApp({ serveClient: false });
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const startVoiceApp = async () => {
  const { app, attachWebSockets } = await createTutorServerApp({
    serveClient: false,
    voiceProvider: "mock",
  });
  const server = app.listen(0);
  attachWebSockets(server);
  await once(server, "listening");
  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}/api/voice-agent?language=en`,
  };
};

const readActivity = async (baseUrl, headers = {}) => {
  const response = await fetch(`${baseUrl}/api/debug/system-activity`, {
    cache: "no-store",
    headers,
  });
  assert.equal(response.status, 200);
  return response.json();
};

const startMisoHealthServer = async () => {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, modelLoaded: true }));
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const waitForActivity = async (baseUrl, predicate) => {
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    const body = await readActivity(baseUrl);
    if (predicate(body)) return body;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return readActivity(baseUrl);
};

test("system activity endpoint exposes local ledger metadata", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const body = await readActivity(baseUrl);

  assert.equal(body.ok, true);
  assert.equal(body.localOnly, true);
  assert.equal(body.retention.limit, 250);
  assert.equal(body.summary.retentionLimit, 250);
  assert.ok(body.summary.total >= 1);
  assert.ok(Array.isArray(body.events));
  assert.ok(body.events.some((event) => event.kind === "system"));
  assert.equal(body.meters.graph.codeArchitecture, "Graphify");
  assert.equal(typeof body.meters.providers.misoTts, "boolean");
  assert.equal(body.meters.providerDetails.misoTts.configured, true);
});

test("system activity marks MisoTTS reachable when the local API health endpoint responds", async (t) => {
  const previousMisoUrl = process.env.MISO_TTS_API_URL;
  const miso = await startMisoHealthServer();
  process.env.MISO_TTS_API_URL = miso.baseUrl;
  t.after(() => {
    miso.server.close();
    if (previousMisoUrl === undefined) {
      delete process.env.MISO_TTS_API_URL;
    } else {
      process.env.MISO_TTS_API_URL = previousMisoUrl;
    }
  });

  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const body = await readActivity(baseUrl);

  assert.equal(body.meters.providers.misoTts, true);
  assert.equal(body.meters.providerDetails.misoTts.configured, true);
  assert.equal(body.meters.providerDetails.misoTts.reachable, true);
  assert.equal(body.meters.providerDetails.misoTts.status, 200);
});

test("system activity uses a browser-provided MisoTTS API URL override", async (t) => {
  const previousMisoUrl = process.env.MISO_TTS_API_URL;
  delete process.env.MISO_TTS_API_URL;
  const miso = await startMisoHealthServer();
  t.after(() => {
    miso.server.close();
    if (previousMisoUrl === undefined) {
      delete process.env.MISO_TTS_API_URL;
    } else {
      process.env.MISO_TTS_API_URL = previousMisoUrl;
    }
  });

  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const body = await readActivity(baseUrl, {
    "x-miso-tts-api-url": miso.baseUrl,
  });

  assert.equal(body.meters.providers.misoTts, true);
  assert.equal(body.meters.providerDetails.misoTts.configured, true);
  assert.equal(body.meters.providerDetails.misoTts.reachable, true);
  assert.equal(body.meters.providerDetails.misoTts.status, 200);
});

test("blocked chat requests are recorded without live model calls", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Explain local observability." }],
      aiModel: "deepseek/deepseek-v4-flash",
    }),
  });

  assert.equal(response.status, 200);
  const streamText = await response.text();
  assert.match(streamText, /OpenRouter API key is required/);
  assert.match(streamText, /"type":"model_run"/);
  assert.match(streamText, /"status":"blocked"/);
  assert.match(streamText, /"requestedModel":"deepseek\/deepseek-v4-flash"/);

  const body = await readActivity(baseUrl);
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "model" &&
        event.status === "blocked" &&
        event.title === "Chat request blocked",
    ),
  );
});

test("mock voice websocket records a local tool-call loop", async (t) => {
  const { server, baseUrl, wsUrl } = await startVoiceApp();
  t.after(() => server.close());
  const proofAttemptId = "beta-proof-voice-test";
  const hasVoiceProofMetadata = (event) =>
    event.metadata?.proofAttemptId === proofAttemptId &&
    event.metadata?.mode === "voice" &&
    event.metadata?.agentLayer === "voice_realtime";

  const ws = new WebSocket(wsUrl);
  t.after(() => {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });
  await once(ws, "open");

  const functionRequest = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("FunctionCallRequest was not received.")),
      1000,
    );
    ws.on("message", (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === "FunctionCallRequest") {
        clearTimeout(timeout);
        resolve(parsed);
      }
    });
  });

  ws.send(
    JSON.stringify({
      type: "voice_auth",
      voiceSessionId: "voice-test-session-1",
      requestId: "voice-test-session-1",
      proofAttemptId,
      studyContext: "Local websocket test study context.",
      activeBookId: "book:voice-test",
      activeBookTitle: "Voice Tool Test",
      activeDocumentId: "doc:voice-test",
      documentIds: ["doc:voice-test", "doc:voice-supplement"],
      documentCount: 2,
      readyDocumentIds: ["doc:voice-test"],
      readyDocumentCount: 1,
      contextDocumentIds: ["doc:voice-test"],
      unreadyDocumentCount: 1,
      omittedReadyDocumentCount: 0,
      studyContextChars: 35,
      studyContextMetadata: {
        proofAttemptId,
        mode: "voice",
        agentLayer: "voice_realtime",
        rawContextChars: 120,
        memoryContextChars: 20,
        activeBookContextChars: 30,
        documentContextChars: 70,
        contextCompacted: false,
      },
    }),
  );

  const request = await functionRequest;
  const toolNames = request.functions.map((fn) => fn.name).sort();
  assert.deepEqual(toolNames, [
    "evaluate_answer",
    "generate_flashcards",
    "look_at_current_page",
    "look_at_study_context",
    "render_diagram",
    "update_graph",
    "web_search",
  ]);

  request.functions.forEach((fn) => {
    ws.send(
      JSON.stringify({
        type: "FunctionCallResponse",
        id: fn.id,
        name: fn.name,
        content: JSON.stringify({ status: "ok" }),
      }),
    );
  });

  const body = await waitForActivity(baseUrl, (activity) =>
    activity.events.some(
      (event) =>
        event.kind === "tool" &&
        event.status === "completed" &&
        event.title === "Voice client tool completed",
    ),
  );

  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "tool" &&
        event.status === "started" &&
        event.title === "Voice tool call requested" &&
        event.requestId === "voice-test-session-1" &&
        hasVoiceProofMetadata(event),
    ),
  );
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "tool" &&
        event.status === "completed" &&
        event.title === "Voice client tool completed" &&
        event.requestId === "voice-test-session-1" &&
        hasVoiceProofMetadata(event),
    ),
  );
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "voice" &&
        event.status === "started" &&
        event.title === "Voice session accepted" &&
        event.requestId === "voice-test-session-1" &&
        event.metadata?.studyContextChars === 35 &&
        hasVoiceProofMetadata(event),
    ),
  );
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "voice" &&
        event.status === "completed" &&
        event.title === "Mock voice provider ready" &&
        event.requestId === "voice-test-session-1" &&
        hasVoiceProofMetadata(event),
    ),
  );
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "retrieval" &&
        event.status === "completed" &&
        event.title === "Voice study context attached" &&
        event.requestId === "voice-test-session-1" &&
        event.metadata?.documentCount === 2 &&
        event.metadata?.readyDocumentCount === 1 &&
        event.metadata?.unreadyDocumentCount === 1 &&
        event.metadata?.contextDocumentIds?.includes("doc:voice-test") &&
        event.metadata?.documentIds?.includes("doc:voice-supplement") &&
        hasVoiceProofMetadata(event),
    ),
  );
});

test("blocked voice current-page vision writes correlated system activity", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/voice-current-page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: "voice-page-test-1",
      query: "What is visible here?",
      image: "",
    }),
  });

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.requestId, "voice-page-test-1");
  assert.equal(payload.error, "Current page image is required.");

  const body = await readActivity(baseUrl);
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "tool" &&
        event.status === "blocked" &&
        event.title === "Voice current-page vision blocked" &&
        event.requestId === "voice-page-test-1" &&
        event.toolName === "look_at_current_page",
    ),
  );
});

test("blocked voice web search writes correlated system activity", async (t) => {
  const { server, baseUrl } = await startApp();
  t.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/voice-web-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: "voice-web-test-1",
      query: "",
      mode: "search",
    }),
  });

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.requestId, "voice-web-test-1");
  assert.equal(payload.error, "Query is required.");

  const body = await readActivity(baseUrl);
  assert.ok(
    body.events.some(
      (event) =>
        event.kind === "web" &&
        event.status === "blocked" &&
        event.title === "Voice web search blocked" &&
        event.requestId === "voice-web-test-1" &&
        event.toolName === "web_search",
    ),
  );
});
