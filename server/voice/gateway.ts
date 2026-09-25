/**
 * WebSocket entry point for voice. Browsers cannot attach auth headers to a
 * WebSocket, so the client first obtains a short-lived single-use ticket over
 * authenticated HTTP, then opens /ws/voice?ticket=… . Origins are checked
 * against the app's own host and ALLOWED_ORIGINS.
 */
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { randomBytes } from "node:crypto";
import { WebSocketServer } from "ws";
import { log } from "../lib/log.js";
import { VoiceSession, type VoiceDeps } from "./session.js";

const TICKET_TTL_MS = 60_000;

export function isAllowedOrigin(req: IncomingMessage, allowedOrigins: string[]) {
  const origin = req.headers.origin;
  if (!origin) return true; // Non-browser client: the ticket is the credential.
  if (allowedOrigins.includes(origin)) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function createVoiceGateway(deps: VoiceDeps & { allowedOrigins: string[] }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024, perMessageDeflate: false });
  const tickets = new Map<string, { userId: string; name: string; expires: number }>();
  const sessions = new Set<VoiceSession>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ticket, entry] of tickets) if (entry.expires < now) tickets.delete(ticket);
  }, 30_000);
  sweep.unref?.();

  return {
    issueTicket(userId: string, name: string) {
      const ticket = randomBytes(24).toString("base64url");
      tickets.set(ticket, { userId, name, expires: Date.now() + TICKET_TTL_MS });
      return ticket;
    },

    /** Returns true if the upgrade request was for voice (handled or rejected). */
    handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname !== "/ws/voice") return false;
      const reject = (status: number, text: string) => {
        socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
        socket.destroy();
      };
      if (!isAllowedOrigin(req, deps.allowedOrigins)) {
        reject(403, "Forbidden");
        return true;
      }
      const ticket = url.searchParams.get("ticket") ?? "";
      const entry = tickets.get(ticket);
      tickets.delete(ticket);
      if (!entry || entry.expires < Date.now()) {
        reject(401, "Unauthorized");
        return true;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        const session = new VoiceSession(ws, entry.userId, entry.name, deps);
        sessions.add(session);
        ws.on("close", () => sessions.delete(session));
      });
      return true;
    },

    get activeSessions() {
      return sessions.size;
    },

    closeAll() {
      for (const session of sessions) session.close("server shutdown");
      wss.close();
      clearInterval(sweep);
      log.info("voice.gateway_closed");
    },
  };
}

export type VoiceGateway = ReturnType<typeof createVoiceGateway>;
