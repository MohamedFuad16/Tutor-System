import { chromium } from "playwright";
import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";

type RuntimeEvent = {
  type: "render" | "state" | "fetch" | "websocket" | "database" | "route";
  name: string;
  timestamp: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

const ROOT = process.cwd();
const RUNTIME_DIR = path.join(ROOT, "brain/runtime");
const SERVER_PORT = Number(process.env.BRAIN_RUNTIME_PORT || 3210);
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(SERVER_URL);
      if (response.status < 500) return true;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureServer() {
  if (await waitForServer(1000)) return null;
  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      VITE_BRAIN_RUNTIME: "true",
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) =>
    process.stdout.write(`[brain-runtime-server] ${data}`),
  );
  child.stderr.on("data", (data) =>
    process.stderr.write(`[brain-runtime-server] ${data}`),
  );
  if (!(await waitForServer())) {
    child.kill();
    throw new Error(
      "Timed out waiting for dev server at http://127.0.0.1:3000",
    );
  }
  return child;
}

function summarize(events: RuntimeEvent[]) {
  const renderEvents = events.filter((event) => event.type === "render");
  const stateEvents = events.filter((event) => event.type === "state");
  const routeEvents = events.filter((event) => event.type === "route");
  const fetchEvents = events.filter((event) => event.type === "fetch");
  const websocketEvents = events.filter((event) => event.type === "websocket");
  const databaseEvents = events.filter((event) => event.type === "database");

  const renderByName = Object.values(
    renderEvents.reduce<
      Record<
        string,
        {
          component: string;
          count: number;
          totalDurationMs: number;
          maxDurationMs: number;
        }
      >
    >((acc, event) => {
      acc[event.name] ??= {
        component: event.name,
        count: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
      };
      acc[event.name].count += 1;
      acc[event.name].totalDurationMs += event.durationMs ?? 0;
      acc[event.name].maxDurationMs = Math.max(
        acc[event.name].maxDurationMs,
        event.durationMs ?? 0,
      );
      return acc;
    }, {}),
  ).map((entry) => ({
    ...entry,
    averageDurationMs: entry.count ? entry.totalDurationMs / entry.count : 0,
  }));

  const propagation = stateEvents.map((event) => {
    const nextRender = renderEvents.find(
      (render) => render.timestamp >= event.timestamp,
    );
    return {
      state: event.name,
      timestamp: event.timestamp,
      nextRender: nextRender?.name,
      lagMs: nextRender ? nextRender.timestamp - event.timestamp : null,
      metadata: event.metadata,
    };
  });

  const hotspots = [
    ...renderByName
      .filter((entry) => entry.count > 1 || entry.maxDurationMs > 16)
      .map((entry) => ({
        type: "render",
        name: entry.component,
        severity: Math.min(
          100,
          Math.round(entry.count * 10 + entry.maxDurationMs),
        ),
        evidence: entry,
      })),
    ...Object.entries(
      databaseEvents.reduce<Record<string, number>>((acc, event) => {
        if (event.metadata?.mutation)
          acc[event.name] = (acc[event.name] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([name, count]) => ({
      type: "database-write",
      name,
      severity: count * 20,
      evidence: { count },
    })),
  ].sort((a, b) => b.severity - a.severity);

  return {
    renderByName,
    routeTransitions: routeEvents,
    fetchEvents,
    websocketEvents,
    databaseEvents,
    propagation,
    hotspots,
  };
}

async function runBenchmark() {
  const server = await ensureServer();
  let browser;
  try {
    const graphPath = path.join(ROOT, "brain/knowledge/graph.json");
    const graph = fs.existsSync(graphPath)
      ? JSON.parse(fs.readFileSync(graphPath, "utf8"))
      : { metadata: {} };
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem("brain_runtime", "1"));
    await page.goto(SERVER_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    for (const routeName of ["Brain", "Analytics", "Revision"]) {
      const button = page
        .getByRole("button", { name: new RegExp(routeName, "i") })
        .first();
      if ((await button.count()) > 0 && (await button.isVisible())) {
        await button.click();
        await page.waitForTimeout(800);
      }
    }
    await page.keyboard.press("1");
    await page.waitForTimeout(800);
    await page
      .getByRole("button", { name: /Settings/i })
      .click()
      .catch(() => undefined);
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape").catch(() => undefined);

    const events = await page.evaluate(
      () => window.__BRAIN_RUNTIME__?.export() ?? [],
    );
    const summary = summarize(events as RuntimeEvent[]);
    const metadata = {
      generatedAt: new Date().toISOString(),
      source: "brain/runtime/run-runtime-benchmark.ts",
      sourceHash: graph.metadata?.sourceHash ?? null,
      url: SERVER_URL,
      eventCount: events.length,
      confidence: events.length > 0 ? 0.82 : 0,
    };

    writeJson(path.join(RUNTIME_DIR, "runtime-impact-map.json"), {
      metadata,
      events,
      summary,
    });
    writeJson(path.join(RUNTIME_DIR, "rerender-graph.json"), {
      metadata,
      renders: summary.renderByName,
    });
    writeJson(path.join(RUNTIME_DIR, "propagation-map.json"), {
      metadata,
      propagation: summary.propagation,
    });
    writeJson(path.join(RUNTIME_DIR, "runtime-hotspots.json"), {
      metadata,
      hotspots: summary.hotspots,
    });
    console.log(`Runtime benchmark complete: ${events.length} events.`);
  } finally {
    if (browser) await browser.close();
    if (server)
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        server.once("exit", finish);
        try {
          if (server.pid) process.kill(-server.pid, "SIGTERM");
          else server.kill("SIGTERM");
        } catch {
          server.kill("SIGTERM");
        }
        setTimeout(() => {
          try {
            if (server.pid) process.kill(-server.pid, "SIGKILL");
          } catch {
            // Process group already stopped.
          }
          finish();
        }, 1000);
      });
  }
}

runBenchmark().catch((error) => {
  writeJson(path.join(RUNTIME_DIR, "runtime-impact-map.json"), {
    metadata: {
      generatedAt: new Date().toISOString(),
      confidence: 0,
      error: error instanceof Error ? error.message : String(error),
    },
    events: [],
    summary: {},
  });
  console.error(error);
  process.exit(1);
});
