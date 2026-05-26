export type BrainRuntimeEvent = {
  type: "render" | "state" | "fetch" | "websocket" | "database" | "route" | "web_search";
  name: string;
  timestamp: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

declare global {
  interface Window {
    __BRAIN_RUNTIME__?: {
      enabled: boolean;
      events: BrainRuntimeEvent[];
      record: (event: Omit<BrainRuntimeEvent, "timestamp">) => void;
      export: () => BrainRuntimeEvent[];
      clear: () => void;
    };
  }
}

export function isBrainRuntimeEnabled() {
  return import.meta.env.VITE_BRAIN_RUNTIME === "true" || localStorage.getItem("brain_runtime") === "1";
}

export function ensureBrainRuntime() {
  if (!window.__BRAIN_RUNTIME__) {
    window.__BRAIN_RUNTIME__ = {
      enabled: isBrainRuntimeEnabled(),
      events: [],
      record(event) {
        if (!this.enabled) return;
        this.events.push({ ...event, timestamp: performance.now() });
        if (this.events.length > 5000) {
          this.events.splice(0, 1000); // Prevent unbounded growth
        }
      },
      export() {
        return [...this.events];
      },
      clear() {
        this.events.length = 0;
      },
    };
  }
  window.__BRAIN_RUNTIME__.enabled = isBrainRuntimeEnabled();
  return window.__BRAIN_RUNTIME__;
}

export function recordBrainRuntime(event: Omit<BrainRuntimeEvent, "timestamp">) {
  ensureBrainRuntime().record(event);
}
