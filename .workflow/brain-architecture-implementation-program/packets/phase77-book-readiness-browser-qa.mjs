import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE ||
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
);

const appUrl = process.env.APP_URL || "http://127.0.0.1:3001";
const outDir =
  process.env.QA_OUT_DIR ||
  ".workflow/brain-architecture-implementation-program/results";
const defaultChromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function setupLocalStorage(state) {
  const { activeView, openBookId } = state;
  localStorage.setItem("access_mode", "admin");
  localStorage.removeItem("tutor_book_hidden");
  localStorage.removeItem("user_brain_architecture_book_hidden");
  localStorage.removeItem("app_design_language_book_hidden");
  if (openBookId) localStorage.setItem("revision_open_book_id", openBookId);
  localStorage.setItem(
    "learning-ai-store",
    JSON.stringify({
      state: {
        activeView,
        accessMode: "admin",
        activeProject: "Book readiness QA",
        language: "en",
        ttsVoice: "miso-tts-8b",
        misoTtsApiUrl: "http://127.0.0.1:8080",
        animationsEnabled: false,
      },
      version: 0,
    }),
  );
}

function assertNoOverflow(label, snapshot) {
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(`${label} overflow: ${JSON.stringify(snapshot)}`);
  }
}

function assertCleanConsole(label, consoleLogs) {
  const actionableLogs = consoleLogs.filter(
    (entry) => !String(entry.text || "").startsWith("[vite] connecting"),
  );
  if (actionableLogs.length) {
    throw new Error(`${label} console logs: ${JSON.stringify(actionableLogs)}`);
  }
}

async function waitForText(page, label, marker) {
  try {
    await page.waitForFunction(
      (expected) => document.body.textContent.includes(expected),
      marker,
      { timeout: 12000 },
    );
  } catch {
    const bodyStart = await page
      .evaluate(() => document.body.textContent.slice(0, 1400))
      .catch(() => "");
    throw new Error(
      `${label} missing ${JSON.stringify(marker)}. Body starts: ${JSON.stringify(bodyStart)}`,
    );
  }
}

async function clickText(page, label, text) {
  try {
    await page.waitForFunction(
      (expected) =>
        [...document.querySelectorAll("button, a, [role=button]")].some(
          (node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return (
              node.textContent?.replace(/\s+/g, " ").trim() === expected &&
              rect.width > 1 &&
              rect.height > 1 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          },
        ),
      text,
      { timeout: 8000 },
    );
    await page.evaluate((expected) => {
      const control = [...document.querySelectorAll("button, a, [role=button]")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return (
            node.textContent?.replace(/\s+/g, " ").trim() === expected &&
            rect.width > 1 &&
            rect.height > 1 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .at(0);
      if (!control) throw new Error(`Visible control not found: ${expected}`);
      control.scrollIntoView({ block: "center", inline: "center" });
      control.click();
    }, text);
    await page.waitForTimeout(300);
  } catch {
    const visibleButtons = await page
      .locator("button, a, [role=button]")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.textContent?.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .slice(0, 60),
      )
      .catch(() => []);
    throw new Error(
      `${label} could not click ${JSON.stringify(text)}. Controls: ${JSON.stringify(visibleButtons)}`,
    );
  }
}

async function newCheckedPage(browser, label, activeView, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleLogs = [];
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      consoleLogs.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    consoleLogs.push({ type: "pageerror", text: error.message });
  });
  const initState =
    typeof activeView === "string" ? { activeView } : activeView;
  await page.addInitScript(setupLocalStorage, initState);
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  return { page, consoleLogs, label };
}

async function openRevisionIfNeeded(page, label) {
  const text = await page.locator("body").innerText({ timeout: 8000 });
  if (text.includes("Tutor System Architecture")) return;
  await clickText(page, label, "Revision");
  await waitForText(page, label, "Tutor System Architecture");
}

async function capturePage(page, label, fileName) {
  const snapshot = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.textContent.slice(0, 4000),
  }));
  assertNoOverflow(label, snapshot);
  await page.screenshot({ path: path.join(outDir, fileName), fullPage: true });
  return snapshot;
}

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  const launchOptions = {
    headless: true,
    executablePath: defaultChromeExecutable,
  };

  const browser = await chromium.launch(launchOptions).catch(async () => {
    delete launchOptions.executablePath;
    return chromium.launch(launchOptions);
  });

  const results = [];
  try {
    {
      const { page, consoleLogs, label } = await newCheckedPage(
        browser,
        "admin desktop",
        "admin",
        { width: 1280, height: 900 },
      );
      await waitForText(page, label, "Admin Center");
      await waitForText(
        page,
        label,
        "Track models, tools, memory, retrieval, voice, and beta readiness.",
      );
      const snapshot = await capturePage(
        page,
        label,
        "phase77-admin-concise-preface-desktop.png",
      );
      assertCleanConsole(label, consoleLogs);
      results.push({
        label,
        consoleLogs,
        textLength: snapshot.bodyText.length,
      });
      await page.close();
    }

    {
      const { page, consoleLogs, label } = await newCheckedPage(
        browser,
        "tutor book desktop",
        { activeView: "revision", openBookId: "tutor-book" },
        { width: 1280, height: 900 },
      );
      await openRevisionIfNeeded(page, label);
      await waitForText(page, label, "Tutor System Architecture");
      await waitForText(page, label, "Chapter 10: Model And Provider Map");
      await clickText(page, label, "Chapter 10: Model And Provider Map");
      await waitForText(page, label, "Assistant Read Aloud");
      await waitForText(page, label, "MISO_TTS_API_URL");
      await waitForText(
        page,
        label,
        "does not replace the live Deepgram websocket",
      );
      const snapshot = await capturePage(
        page,
        label,
        "phase77-tutor-book-misotts-provider-desktop.png",
      );
      assertCleanConsole(label, consoleLogs);
      results.push({
        label,
        consoleLogs,
        textLength: snapshot.bodyText.length,
      });
      await page.close();
    }

    {
      const { page, consoleLogs, label } = await newCheckedPage(
        browser,
        "user brain book mobile",
        { activeView: "revision", openBookId: "user-brain-architecture" },
        { width: 390, height: 844 },
      );
      await openRevisionIfNeeded(page, label);
      await waitForText(page, label, "User Brain Architecture");
      await waitForText(page, label, "Chapter 6: Voice, Audio, And Timing");
      await clickText(page, label, "Chapter 6: Voice, Audio, And Timing");
      await waitForText(page, label, "Read Aloud is a separate audio path");
      await waitForText(page, label, "MisoTTS API URL");
      await waitForText(page, label, "realtime voice still uses the Deepgram");
      const snapshot = await capturePage(
        page,
        label,
        "phase77-user-brain-misotts-mobile.png",
      );
      assertCleanConsole(label, consoleLogs);
      results.push({
        label,
        consoleLogs,
        textLength: snapshot.bodyText.length,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(
    path.join(outDir, "phase77-book-readiness-browser-qa.json"),
    JSON.stringify(
      {
        appUrl,
        checkedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
}

await run();
