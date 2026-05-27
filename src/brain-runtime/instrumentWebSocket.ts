import { recordBrainRuntime } from "./runtimeTelemetry";

export function instrumentWebSocket() {
  const marker = "__brainRuntimeWebSocketInstrumented";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  const NativeWebSocket = window.WebSocket;
  window.WebSocket = class BrainRuntimeWebSocket extends NativeWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const startedAt = performance.now();
      super(url, protocols as any);
      const pathName = new URL(String(url), window.location.href).pathname;
      recordBrainRuntime({
        type: "websocket",
        name: pathName,
        metadata: { event: "construct" },
      });
      this.addEventListener("open", () => {
        recordBrainRuntime({
          type: "websocket",
          name: pathName,
          durationMs: performance.now() - startedAt,
          metadata: { event: "open" },
        });
      });
      this.addEventListener("message", (event) => {
        recordBrainRuntime({
          type: "websocket",
          name: pathName,
          metadata: {
            event: "message",
            bytes:
              typeof event.data === "string" ? event.data.length : undefined,
          },
        });
      });
      this.addEventListener("error", () => {
        recordBrainRuntime({
          type: "websocket",
          name: pathName,
          durationMs: performance.now() - startedAt,
          metadata: { event: "error" },
        });
      });
      this.addEventListener("close", (event) => {
        recordBrainRuntime({
          type: "websocket",
          name: pathName,
          durationMs: performance.now() - startedAt,
          metadata: { event: "close", code: event.code },
        });
      });
    }
  };
}
