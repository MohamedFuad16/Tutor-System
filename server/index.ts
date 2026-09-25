/**
 * Process entry point: build context, start HTTP + WebSocket server, shut
 * down gracefully (drain voice sessions, close the database) on SIGTERM so
 * rolling deploys behind a load balancer don't drop learners mid-sentence.
 */
import http from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { createContext } from "./context.js";
import { log } from "./lib/log.js";

async function main() {
  const ctx = createContext(config);
  const app = await createApp(ctx, { serveClient: process.env.SERVE_CLIENT !== "false" });
  const server = http.createServer(app);
  server.keepAliveTimeout = 65_000; // longer than typical ALB idle timeout
  server.headersTimeout = 66_000;

  server.on("upgrade", (req, socket, head) => {
    if (ctx.voice.handleUpgrade(req, socket, head)) return;
    // Vite HMR runs on its own port; anything else is not ours.
    socket.destroy();
  });

  server.listen(config.port, config.host, () => {
    log.info("server.listening", {
      url: `http://localhost:${config.port}`,
      llm: `${ctx.llm.name} (${ctx.llm.modelFor("fast")} / ${ctx.llm.modelFor("smart")})`,
      speech: ctx.speech?.name ?? "browser-only",
      search: `${ctx.search.providers.web}/${ctx.search.providers.images}`,
      env: config.env,
    });
    if (ctx.llm.name === "mock") {
      log.warn("server.mock_llm", {
        hint: "No ZAI_API_KEY set: using the offline mock model. Set ZAI_API_KEY in .env for real answers.",
      });
    }
  });

  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log.info("server.shutdown", { signal });
    server.close();
    ctx.shutdown();
    setTimeout(() => process.exit(0), 3_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  log.error("server.crash", { error: String(error?.stack ?? error) });
  process.exit(1);
});
