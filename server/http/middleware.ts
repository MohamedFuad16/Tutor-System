/**
 * Cross-cutting HTTP concerns: learner identity, per-learner rate limiting,
 * async error handling. The site is public: there is no access code.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { errorMessage, log } from "../lib/log.js";

const USER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{5,63}$/;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
      learnerName: string;
    }
  }
}

/**
 * Local learner profiles: the browser generates a stable id and sends it as
 * X-User-Id (EventSource cannot set headers, so `?u=` is accepted too). This
 * is identity, not authentication — production deployments put real auth
 * (e.g. Cognito/OIDC) in front and map the verified subject to this id.
 */
export function identity(): RequestHandler {
  return (req, _res, next) => {
    const userId = String(req.header("x-user-id") ?? req.query.u ?? "");
    if (!USER_ID.test(userId)) return next(new HttpError(400, "Missing or invalid learner id"));
    req.userId = userId;
    let name = String(req.header("x-user-name") ?? "");
    try {
      // Sent URI-encoded so non-ASCII names survive HTTP headers.
      name = decodeURIComponent(name);
    } catch {
      // keep raw
    }
    req.learnerName = name.trim().slice(0, 60) || "Learner";
    next();
  };
}

/** Token bucket per learner for model-backed routes. */
export function rateLimit(perMinute: number): RequestHandler {
  const buckets = new Map<string, { tokens: number; updated: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const bucket = buckets.get(req.userId) ?? { tokens: perMinute, updated: now };
    bucket.tokens = Math.min(perMinute, bucket.tokens + ((now - bucket.updated) / 60_000) * perMinute);
    bucket.updated = now;
    if (bucket.tokens < 1) {
      res.setHeader("Retry-After", "10");
      return next(new HttpError(429, "You're sending requests too quickly. Please wait a moment."));
    }
    bucket.tokens -= 1;
    buckets.set(req.userId, bucket);
    if (buckets.size > 10_000) buckets.clear();
    next();
  };
}

/** Wraps async route handlers so rejections reach the error middleware. */
export const route =
  (handler: (req: Request, res: Response) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };

export function errorHandler() {
  return (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof HttpError ? error.status : ((error as { status?: number })?.status ?? 500);
    if (status >= 500) log.error("http.error", { path: req.path, error: errorMessage(error) });
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(status).json({ error: status >= 500 ? "Internal server error" : errorMessage(error) });
  };
}

export function requireString(value: unknown, name: string, max = 10_000) {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${name} is required`);
  return value.trim().slice(0, max);
}
