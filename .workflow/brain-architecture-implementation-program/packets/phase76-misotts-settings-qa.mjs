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

function setupLocalStorage() {
  localStorage.setItem("access_mode", "admin");
  localStorage.setItem("tts_voice", "aura-asteria-en");
  localStorage.setItem(
    "learning-ai-store",
    JSON.stringify({
      state: {
        activeView: "study",
        accessMode: "admin",
        activeProject: "MisoTTS QA",
        language: "en",
        ttsVoice: "aura-asteria-en",
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

async function runSettingsCheck(browser, label, viewport) {
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

  const waitForText = async (marker) => {
    try {
      await page.waitForFunction(
        (expected) => document.body.textContent.includes(expected),
        marker,
        { timeout: 12000 },
      );
    } catch {
      const bodyStart = await page
        .evaluate(() => document.body.textContent.slice(0, 1200))
        .catch(() => "");
      throw new Error(
        `${label} missing ${JSON.stringify(marker)}. Body starts: ${JSON.stringify(bodyStart)}`,
      );
    }
  };

  await page.addInitScript(setupLocalStorage);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await waitForText("Tutor");

  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")];
    const settingsButton = buttons.find((button) => {
      const classes = String(button.getAttribute("class") || "");
      return (
        button.getClientRects().length > 0 &&
        classes.includes("fixed") &&
        classes.includes("right-4")
      );
    });
    if (!settingsButton) {
      throw new Error("Settings button not found.");
    }
    settingsButton.click();
  });

  await waitForText("App Settings");
  await waitForText("MisoTTS 8B (Vast local API)");
  await waitForText("MISO_TTS_API_URL");

  const modalSnapshot = await page.evaluate(() => {
    const text = document.body.textContent || "";
    return {
      hasMisoOption: text.includes("MisoTTS 8B (Vast local API)"),
      hasEnvCopy: text.includes("MISO_TTS_API_URL"),
      hasTunnelCopy: text.includes("localhost:8080"),
    };
  });

  const selectionResult = await page.evaluate(() => {
    const select = [...document.querySelectorAll("select")].find((candidate) =>
      [...candidate.options].some((option) => option.value === "miso-tts-8b"),
    );
    if (!select) {
      throw new Error("MisoTTS select option not found.");
    }
    select.value = "miso-tts-8b";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      value: select.value,
      optionText:
        select.selectedOptions[0]?.textContent?.trim() ||
        select.options[select.selectedIndex]?.textContent?.trim() ||
        "",
    };
  });

  if (selectionResult.value !== "miso-tts-8b") {
    throw new Error(
      `${label} failed to select MisoTTS: ${JSON.stringify(selectionResult)}`,
    );
  }

  await page.locator("button", { hasText: "Save Changes" }).first().click();
  await page.waitForFunction(
    () => localStorage.getItem("tts_voice") === "miso-tts-8b",
    { timeout: 6000 },
  );

  const snapshot = await page.evaluate(() => {
    const text = document.body.textContent || "";
    return {
      surface: "settings",
      label: window.innerWidth < 700 ? "mobile" : "desktop",
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      savedVoice: localStorage.getItem("tts_voice"),
      hasSettingsModalClosed: !text.includes("App Settings"),
    };
  });

  if (
    snapshot.savedVoice !== "miso-tts-8b" ||
    !snapshot.hasSettingsModalClosed ||
    !modalSnapshot.hasMisoOption ||
    !modalSnapshot.hasEnvCopy ||
    !modalSnapshot.hasTunnelCopy
  ) {
    throw new Error(
      `${label} settings mismatch: ${JSON.stringify({
        snapshot,
        modalSnapshot,
      })}`,
    );
  }

  assertNoOverflow(label, snapshot);
  await page.screenshot({
    path: `${outDir}/ACT-misotts-settings-${label}.png`,
    fullPage: false,
  });
  assertCleanConsole(label, consoleLogs);
  await page.close();
  return { ...snapshot, modalSnapshot, consoleLogs: [] };
}

await fs.mkdir(outDir, { recursive: true });
const launchOptions = { headless: true };
const executablePath = process.env.CHROME_EXECUTABLE || defaultChromeExecutable;
try {
  await fs.access(executablePath);
  launchOptions.executablePath = executablePath;
} catch {
  // Fall back to Playwright's bundled browser if system Chrome is unavailable.
}
const browser = await chromium.launch(launchOptions);

try {
  const results = [];
  for (const { label, viewport } of [
    { label: "desktop", viewport: { width: 1440, height: 1000 } },
    { label: "mobile", viewport: { width: 390, height: 844 } },
  ]) {
    results.push(await runSettingsCheck(browser, label, viewport));
  }

  await fs.writeFile(
    `${outDir}/phase76-misotts-settings-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
