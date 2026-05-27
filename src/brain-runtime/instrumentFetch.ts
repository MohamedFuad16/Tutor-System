import { recordBrainRuntime } from "./runtimeTelemetry";

export function instrumentFetch() {
  const marker = "__brainRuntimeFetchInstrumented";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const startedAt = performance.now();
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method =
      init?.method || (input instanceof Request ? input.method : "GET");
    try {
      const response = await originalFetch(input, init);
      recordBrainRuntime({
        type: "fetch",
        name: new URL(url, window.location.href).pathname,
        durationMs: performance.now() - startedAt,
        metadata: {
          method,
          status: response.status,
          contentType: response.headers.get("content-type"),
        },
      });
      return response;
    } catch (error) {
      recordBrainRuntime({
        type: "fetch",
        name: new URL(url, window.location.href).pathname,
        durationMs: performance.now() - startedAt,
        metadata: {
          method,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  };
}
