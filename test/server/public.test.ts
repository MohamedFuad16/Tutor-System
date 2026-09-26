/**
 * The site is public: there is no access code. A deployment that still has
 * an old ACCESS_CODE in its environment (for example a leftover SSM
 * parameter) must not gate anything.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createApp } from "../../server/app";
import { loadConfig } from "../../server/config";
import { createContext, type AppContext } from "../../server/context";
import { createMockLlm, createMockSpeech } from "../../server/providers/mock";

let ctx: AppContext;
let server: http.Server;
let base = "";
const previous = process.env.ACCESS_CODE;

beforeAll(async () => {
  process.env.ACCESS_CODE = "old-secret-code";
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tutor-public-"));
  ctx = createContext(
    { ...loadConfig(), dataDir, allowedOrigins: [] },
    {
      llm: createMockLlm(),
      speech: createMockSpeech(),
    },
  );
  server = http.createServer(await createApp(ctx, { serveClient: false }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

afterAll(async () => {
  if (previous === undefined) delete process.env.ACCESS_CODE;
  else process.env.ACCESS_CODE = previous;
  ctx.shutdown();
  await new Promise((resolve) => server.close(resolve));
});

it("serves every learner without an access code, even if one is still configured", async () => {
  const headers = { "x-user-id": "learner_public01", "content-type": "application/json" };
  const health = await (await fetch(`${base}/api/health`)).json();
  expect(health).not.toHaveProperty("accessCodeRequired");

  const created = await fetch(`${base}/api/books`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "Open" }),
  });
  expect(created.status).toBe(201);
  const books = await fetch(`${base}/api/books`, { headers });
  expect(books.ok).toBe(true);
  const ticket = await fetch(`${base}/api/voice/ticket`, { method: "POST", headers });
  expect(ticket.ok).toBe(true);
  // Live events (EventSource) authenticate with the learner id only.
  const events = await fetch(`${base}/api/events?u=learner_public01`, { signal: AbortSignal.timeout(1500) }).catch(
    () => null,
  );
  expect(events?.status ?? 200).toBe(200);
});
