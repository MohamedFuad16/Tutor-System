import { spawn } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { chromium, type Browser } from "playwright";

type ViewportResult = {
  name: string;
  width: number;
  height: number;
  horizontalOverflow: number;
  worstFrameMs: number;
  averageFrameMs: number;
  droppedFrames: number;
  headerOpaque: boolean;
  visibleReasoningDropdown: boolean;
  visibleReasoningSteps: boolean;
  browserExecuted: boolean;
  interactionSimulation: {
    reasoningDropdownToggled: boolean;
    revisionNavigationClicked: boolean;
    studyNavigationClicked: boolean;
  };
  runtimeInstrumentation: {
    frameSamples: number;
    performanceNowAvailable: boolean;
  };
  visualChecks: {
    screenshotHash: string;
    screenshotBytes: number;
    visibleControls: number;
    bodyTextLength: number;
    possibleOverlapPairs: number;
    nonBlankViewport: boolean;
  };
  stateTransitions: {
    initialRouteText: string;
    afterRevisionText: string;
    afterStudyText: string;
  };
  errors: string[];
};

const ROOT = process.cwd();
const SERVER_URL =
  process.env.BRAIN_UI_REGRESSION_URL || "http://127.0.0.1:3000";
const OUTPUT_PATH = path.join(ROOT, "brain/debug/ui-regression/latest.json");
const SCREENSHOT_DIR = path.join(ROOT, "brain/debug/ui-regression/screenshots");

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
      // Keep waiting for the local app.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureServer() {
  if (await waitForServer(1000)) return null;
  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    env: { ...process.env, VITE_BRAIN_RUNTIME: "true" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!(await waitForServer())) {
    child.kill();
    throw new Error(`Timed out waiting for dev server at ${SERVER_URL}`);
  }
  return child;
}

async function measureFrames(browser: Browser, viewport: ViewportResult) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem("chat_cleared_by_bot", "true");
    localStorage.setItem(
      "learning-ai-store",
      JSON.stringify({
        state: {
          activeView: "study",
        },
        version: 0,
      }),
    );
    localStorage.setItem(
      "learning_ai_chat_archives_v1",
      JSON.stringify([
        {
          id: "ui-regression-chat",
          title: "UI regression reasoning chat",
          bookId: "book:ui-regression",
          bookTitle: "UI Regression",
          updatedAt: Date.now(),
          messages: [
            {
              id: "1",
              role: "assistant",
              content: "Regression probe welcome.",
            },
            {
              id: "ui-regression-user",
              role: "user",
              content: "Explain this page.",
            },
            {
              id: "ui-regression-assistant",
              role: "assistant",
              content: "Regression probe message.",
              phase: "complete",
              reasoningSteps: [
                {
                  id: "probe-step-1",
                  content: "Retrieving relevant contextual knowledge",
                },
                {
                  id: "probe-step-2",
                  content: "Linking concepts",
                },
              ],
            },
          ],
        },
      ]),
    );
  });

  await page.goto(SERVER_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 1600).catch(() => undefined);
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    document.querySelectorAll<HTMLElement>("*").forEach((element) => {
      if (element.scrollHeight > element.clientHeight + 80) {
        element.scrollTop = element.scrollHeight;
      }
    });
  });
  await page.waitForTimeout(250);
  await page
    .locator("[data-tutor-chat-header] button")
    .filter({ hasText: /General Study|UI Regression/i })
    .first()
    .click()
    .catch(() => undefined);
  await page.waitForTimeout(150);
  await page
    .getByRole("button", { name: /UI regression reasoning chat/i })
    .first()
    .click()
    .catch(() => undefined);
  await page.waitForTimeout(300);
  const initialRouteText = await page
    .locator("body")
    .innerText({ timeout: 1000 })
    .catch(() => "");

  let reasoningDropdownToggled = false;
  await page
    .locator("[data-reasoning-dropdown] button")
    .first()
    .click()
    .then(() => {
      reasoningDropdownToggled = true;
    })
    .catch(() => undefined);
  await page.waitForTimeout(300);
  const reasoningProbe = await page.evaluate(() => ({
    visibleReasoningDropdown: Boolean(
      document.querySelector("[data-reasoning-dropdown]"),
    ),
    visibleReasoningSteps:
      document.body.innerText.includes(
        "Retrieving relevant contextual knowledge",
      ) && document.body.innerText.includes("Linking concepts"),
  }));

  let revisionNavigationClicked = false;
  await page
    .getByRole("button", { name: /revision/i })
    .first()
    .click()
    .then(() => {
      revisionNavigationClicked = true;
    })
    .catch(() => undefined);
  await page.waitForTimeout(300);
  const afterRevisionText = await page
    .locator("body")
    .innerText({ timeout: 1000 })
    .catch(() => "");

  let studyNavigationClicked = false;
  await page
    .getByRole("button", { name: /study/i })
    .first()
    .click()
    .then(() => {
      studyNavigationClicked = true;
    })
    .catch(() => undefined);
  await page.waitForTimeout(300);
  const afterStudyText = await page
    .locator("body")
    .innerText({ timeout: 1000 })
    .catch(() => "");

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(250);

  const metrics = (await page.evaluate(`
    (async () => {
      const frameTimes = [];
      await new Promise((resolve) => {
        let previous = performance.now();
        const sample = () => {
          const now = performance.now();
          frameTimes.push(now - previous);
          previous = now;
          if (frameTimes.length >= 90) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      const horizontalOverflow = Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth,
      );
      const header = document.querySelector("[data-tutor-chat-header]");
      const headerStyle = header ? getComputedStyle(header) : null;
      const headerOpaque =
        !headerStyle ||
        headerStyle.backgroundColor === "rgb(253, 253, 253)" ||
        headerStyle.backgroundColor.includes("0.98") ||
        headerStyle.backgroundColor.includes("0.99");
      const worstFrameMs = Math.max(...frameTimes);
      const averageFrameMs =
        frameTimes.reduce((sum, item) => sum + item, 0) / frameTimes.length;
      const visibleElements = Array.from(
        document.querySelectorAll("button, a, input, textarea, select, [role='button'], [role='tab']"),
      )
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 2 && rect.height > 2);
      const possibleOverlapPairs = visibleElements.reduce((count, rect, index) => {
        return (
          count +
          visibleElements.slice(index + 1).filter((other) => {
            const overlapX = Math.max(
              0,
              Math.min(rect.right, other.right) - Math.max(rect.left, other.left),
            );
            const overlapY = Math.max(
              0,
              Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top),
            );
            const overlapArea = overlapX * overlapY;
            const smallerArea = Math.min(
              rect.width * rect.height,
              other.width * other.height,
            );
            return smallerArea > 0 && overlapArea / smallerArea > 0.4;
          }).length
        );
      }, 0);
      const bodyTextLength = document.body.innerText.trim().length;
      return {
        horizontalOverflow,
        worstFrameMs,
        averageFrameMs,
        droppedFrames: frameTimes.filter((time) => time > 32).length,
        frameSamples: frameTimes.length,
        performanceNowAvailable: typeof performance.now === "function",
        bodyTextLength,
        visibleControls: visibleElements.length,
        possibleOverlapPairs,
        nonBlankViewport: bodyTextLength > 20 || visibleElements.length > 0,
        headerOpaque,
        visibleReasoningDropdown: Boolean(
          document.querySelector("[data-reasoning-dropdown]"),
        ),
        visibleReasoningSteps:
          document.body.innerText.includes(
            "Retrieving relevant contextual knowledge",
          ) && document.body.innerText.includes("Linking concepts"),
      };
    })()
  `)) as Pick<
    ViewportResult,
    | "horizontalOverflow"
    | "worstFrameMs"
    | "averageFrameMs"
    | "droppedFrames"
    | "headerOpaque"
    | "visibleReasoningDropdown"
    | "visibleReasoningSteps"
    | "frameSamples"
    | "performanceNowAvailable"
    | "bodyTextLength"
    | "visibleControls"
    | "possibleOverlapPairs"
    | "nonBlankViewport"
  >;

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const screenshot = await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `latest-${viewport.name}.png`),
    fullPage: false,
  });
  const screenshotHash = crypto
    .createHash("sha256")
    .update(screenshot)
    .digest("hex");

  await page.close();
  return {
    ...viewport,
    horizontalOverflow: metrics.horizontalOverflow,
    worstFrameMs: metrics.worstFrameMs,
    averageFrameMs: metrics.averageFrameMs,
    droppedFrames: metrics.droppedFrames,
    headerOpaque: metrics.headerOpaque,
    visibleReasoningDropdown: reasoningProbe.visibleReasoningDropdown,
    visibleReasoningSteps: reasoningProbe.visibleReasoningSteps,
    browserExecuted: true,
    interactionSimulation: {
      reasoningDropdownToggled,
      revisionNavigationClicked,
      studyNavigationClicked,
    },
    runtimeInstrumentation: {
      frameSamples: metrics.frameSamples,
      performanceNowAvailable: metrics.performanceNowAvailable,
    },
    visualChecks: {
      screenshotHash,
      screenshotBytes: screenshot.byteLength,
      visibleControls: metrics.visibleControls,
      bodyTextLength: metrics.bodyTextLength,
      possibleOverlapPairs: metrics.possibleOverlapPairs,
      nonBlankViewport: metrics.nonBlankViewport,
    },
    stateTransitions: {
      initialRouteText: initialRouteText.slice(0, 160),
      afterRevisionText: afterRevisionText.slice(0, 160),
      afterStudyText: afterStudyText.slice(0, 160),
    },
    errors,
  };
}

async function stopServer(server: Awaited<ReturnType<typeof ensureServer>>) {
  if (!server) return;
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
        // Already stopped.
      }
      finish();
    }, 1000);
  });
}

async function main() {
  const server = await ensureServer();
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const viewports: ViewportResult[] = [
      {
        name: "mobile",
        width: 390,
        height: 844,
        horizontalOverflow: 0,
        worstFrameMs: 0,
        averageFrameMs: 0,
        droppedFrames: 0,
        headerOpaque: false,
        visibleReasoningDropdown: false,
        visibleReasoningSteps: false,
        browserExecuted: false,
        interactionSimulation: {
          reasoningDropdownToggled: false,
          revisionNavigationClicked: false,
          studyNavigationClicked: false,
        },
        runtimeInstrumentation: {
          frameSamples: 0,
          performanceNowAvailable: false,
        },
        visualChecks: {
          screenshotHash: "",
          screenshotBytes: 0,
          visibleControls: 0,
          bodyTextLength: 0,
          possibleOverlapPairs: 0,
          nonBlankViewport: false,
        },
        stateTransitions: {
          initialRouteText: "",
          afterRevisionText: "",
          afterStudyText: "",
        },
        errors: [],
      },
      {
        name: "tablet",
        width: 768,
        height: 1024,
        horizontalOverflow: 0,
        worstFrameMs: 0,
        averageFrameMs: 0,
        droppedFrames: 0,
        headerOpaque: false,
        visibleReasoningDropdown: false,
        visibleReasoningSteps: false,
        browserExecuted: false,
        interactionSimulation: {
          reasoningDropdownToggled: false,
          revisionNavigationClicked: false,
          studyNavigationClicked: false,
        },
        runtimeInstrumentation: {
          frameSamples: 0,
          performanceNowAvailable: false,
        },
        visualChecks: {
          screenshotHash: "",
          screenshotBytes: 0,
          visibleControls: 0,
          bodyTextLength: 0,
          possibleOverlapPairs: 0,
          nonBlankViewport: false,
        },
        stateTransitions: {
          initialRouteText: "",
          afterRevisionText: "",
          afterStudyText: "",
        },
        errors: [],
      },
      {
        name: "desktop",
        width: 1440,
        height: 1000,
        horizontalOverflow: 0,
        worstFrameMs: 0,
        averageFrameMs: 0,
        droppedFrames: 0,
        headerOpaque: false,
        visibleReasoningDropdown: false,
        visibleReasoningSteps: false,
        browserExecuted: false,
        interactionSimulation: {
          reasoningDropdownToggled: false,
          revisionNavigationClicked: false,
          studyNavigationClicked: false,
        },
        runtimeInstrumentation: {
          frameSamples: 0,
          performanceNowAvailable: false,
        },
        visualChecks: {
          screenshotHash: "",
          screenshotBytes: 0,
          visibleControls: 0,
          bodyTextLength: 0,
          possibleOverlapPairs: 0,
          nonBlankViewport: false,
        },
        stateTransitions: {
          initialRouteText: "",
          afterRevisionText: "",
          afterStudyText: "",
        },
        errors: [],
      },
    ];
    const results = [];
    for (const viewport of viewports) {
      results.push(await measureFrames(browser, viewport));
    }
    const failures = results.flatMap((result) => {
      const next: string[] = [];
      if (result.horizontalOverflow > 2)
        next.push(
          `${result.name}: horizontal overflow ${result.horizontalOverflow}px`,
        );
      if (result.droppedFrames > 8)
        next.push(`${result.name}: ${result.droppedFrames} dropped frames`);
      if (result.errors.length)
        next.push(`${result.name}: ${result.errors.length} browser error(s)`);
      if (!result.browserExecuted)
        next.push(`${result.name}: browser execution did not complete`);
      if (!result.visualChecks.nonBlankViewport)
        next.push(`${result.name}: viewport appears blank`);
      const shouldRequireReasoningTrace =
        result.width >= 640 || result.visibleReasoningDropdown;
      if (
        shouldRequireReasoningTrace &&
        !result.interactionSimulation.reasoningDropdownToggled
      )
        next.push(`${result.name}: reasoning interaction was not simulated`);
      if (!result.interactionSimulation.revisionNavigationClicked)
        next.push(`${result.name}: revision navigation was not simulated`);
      if (!result.interactionSimulation.studyNavigationClicked)
        next.push(`${result.name}: study navigation was not simulated`);
      if (!result.runtimeInstrumentation.performanceNowAvailable)
        next.push(`${result.name}: runtime instrumentation unavailable`);
      if (result.visualChecks.screenshotBytes < 1000)
        next.push(`${result.name}: screenshot output is unexpectedly small`);
      if (!result.headerOpaque)
        next.push(`${result.name}: tutor header background is not opaque`);
      if (shouldRequireReasoningTrace && !result.visibleReasoningDropdown)
        next.push(`${result.name}: reasoning dropdown is not visible`);
      if (shouldRequireReasoningTrace && !result.visibleReasoningSteps)
        next.push(`${result.name}: reasoning dropdown did not expand`);
      return next;
    });
    const report = {
      ok: failures.length === 0,
      generatedAt: new Date().toISOString(),
      source: "brain/debug/ui-regression-probe.ts",
      url: SERVER_URL,
      thresholds: {
        horizontalOverflowPx: 2,
        droppedFrameBudget: 8,
        sampledFrameMs: 90,
      },
      requiredEvidence: [
        "actual browser execution",
        "viewport testing",
        "interaction simulation",
        "runtime instrumentation",
        "visual regression screenshot hash",
        "state transition testing",
      ],
      results,
      failures,
    };
    writeJson(OUTPUT_PATH, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exit(1);
  } finally {
    if (browser) await browser.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  const report = {
    ok: false,
    generatedAt: new Date().toISOString(),
    source: "brain/debug/ui-regression-probe.ts",
    error: error instanceof Error ? error.message : String(error),
  };
  writeJson(OUTPUT_PATH, report);
  console.error(error);
  process.exit(1);
});
