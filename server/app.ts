/**
 * Express application: API, static client (production) or Vite middleware
 * (development), security headers, CORS for split hosting.
 */
import compression from "compression";
import express, { type Express } from "express";
import fs from "node:fs";
import type http from "node:http";
import path from "node:path";
import type { AppContext } from "./context.js";
import { createApiRouter } from "./http/routes.js";
import { errorHandler } from "./http/middleware.js";

export async function createApp(
  ctx: AppContext,
  options: { serveClient: boolean; httpServer?: http.Server },
): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "microphone=(self), camera=()");
    const origin = req.headers.origin;
    if (origin && ctx.config.allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id, X-User-Name");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Expose-Headers", "X-Sample-Rate");
      if (req.method === "OPTIONS") return res.status(204).end();
    }
    next();
  });

  // Never compress streams: SSE and PCM must reach the client unbuffered.
  app.use(
    compression({
      filter: (req, res) => {
        const type = String(res.getHeader("Content-Type") ?? "");
        if (type.includes("text/event-stream") || type.includes("octet-stream")) return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use("/api", createApiRouter(ctx));
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  if (options.serveClient) {
    if (!ctx.config.isProduction) {
      const { createServer } = await import("vite");
      // HMR rides on the app's own HTTP server: one port, works behind proxies.
      const vite = await createServer({
        server: { middlewareMode: true, hmr: options.httpServer ? { server: options.httpServer } : undefined },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const dist = path.resolve(process.cwd(), "dist/client");
      if (fs.existsSync(dist)) {
        app.use(
          express.static(dist, {
            index: false,
            setHeaders: (res, filePath) => {
              if (filePath.includes(`${path.sep}assets${path.sep}`))
                res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            },
          }),
        );
        app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
      }
    }
  }

  app.use(errorHandler());
  return app;
}
