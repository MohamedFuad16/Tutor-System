/**
 * Tiny structured logger. JSON lines in production (ready for CloudWatch /
 * Loki), compact human-readable lines in development. Secrets never belong in
 * log fields; `redact` strips anything that looks like a credential.
 */
const isProduction = process.env.NODE_ENV === "production";
const level = (process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "warn" : "info")).toLowerCase();
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;
const threshold = LEVELS[(level as Level) in LEVELS ? (level as Level) : "info"];

const SECRET_KEY = /(key|token|secret|authorization|password)/i;

function redact(fields: Record<string, unknown> | undefined) {
  if (!fields) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SECRET_KEY.test(key) ? "[redacted]" : value;
  }
  return out;
}

function emit(lvl: Level, event: string, fields?: Record<string, unknown>) {
  if (LEVELS[lvl] < threshold) return;
  const safe = redact(fields);
  const stream = lvl === "error" || lvl === "warn" ? process.stderr : process.stdout;
  if (isProduction) {
    stream.write(`${JSON.stringify({ t: new Date().toISOString(), level: lvl, event, ...safe })}\n`);
    return;
  }
  const detail = safe && Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
  stream.write(`[${lvl}] ${event}${detail}\n`);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
