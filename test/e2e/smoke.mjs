/**
 * Browser smoke test: drives the real app (production build or dev server)
 * through every surface and saves screenshots. Run against a server started
 * with mock providers:  BASE_URL=http://localhost:3300 node test/e2e/smoke.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/node22/lib/node_modules/playwright"));
}

const BASE = process.env.BASE_URL ?? "http://localhost:3300";
const OUT = process.env.SHOTS_DIR ?? "test/e2e/shots";
const PDF = path.resolve("test/fixtures/photosynthesis.pdf");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
  console.log(`${condition ? "✓" : "✗"} ${message}`);
};

async function run(label, viewport) {
  const context = await browser.newContext({ viewport, permissions: ["microphone"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  const shot = (name) => page.screenshot({ path: `${OUT}/${label}-${name}.png` });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(label === "desktop" ? 7000 : 5000);
  await shot("01-intro");
  check(await page.getByText("Upload a document").first().isVisible(), `${label}: intro shows upload card`);

  // Upload a PDF.
  await page.locator('input[type="file"]').first().setInputFiles(PDF);
  await page.getByRole("button", { name: "Next page" }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  if (label === "mobile") await shot("02-reader");

  // Reader: select text → highlight (persisted across reload) → ask the tutor about it.
  if (label === "desktop") {
    const selectFirstLine = async () => {
      const span = page.locator(".react-pdf__Page__textContent span").first();
      await span.waitFor({ timeout: 15000 });
      const box = await span.boundingBox();
      await page.mouse.move(box.x + 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
    };
    await selectFirstLine();
    await page.getByRole("button", { name: "Highlight" }).click();
    await page.locator('[aria-label^="Highlighted:"]').first().waitFor({ timeout: 8000 });
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "load" });
    await page.getByRole("button", { name: "Next page" }).waitFor({ timeout: 20000 });
    const persisted = await page.locator('[aria-label^="Highlighted:"]').first().waitFor({ timeout: 10000 }).then(() => true, () => false);
    check(persisted, `${label}: highlight persists across reload`);
    await page.keyboard.press("Escape");
    await selectFirstLine();
    await page.getByRole("button", { name: "Ask tutor about the selection" }).click();
    const chip = await page.getByRole("button", { name: "Remove highlighted passage" }).waitFor({ timeout: 5000 }).then(() => true, () => false);
    check(chip, `${label}: selection becomes a quoted passage in the composer`);
  }

  // Ask a question.
  if (label === "mobile") await page.getByRole("tab", { name: "Tutor" }).click();
  await page.waitForTimeout(400);
  if (label === "desktop") await shot("02-reader");
  const box = page.getByLabel("Message the tutor");
  await box.fill("How does the Calvin cycle process work?");
  await box.press("Enter");
  await page
    .getByRole("button", { name: /Walk me through/ })
    .first()
    .waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot("03-answer");
  check(
    await page
      .locator("button", { hasText: /^p\.\d+$/ })
      .first()
      .isVisible(),
    `${label}: answer has page citation chip`,
  );
  check((await page.locator(".mermaid-host svg").count()) > 0, `${label}: diagram rendered`);

  // Quiz.
  await box.fill("quiz me on this");
  await box.press("Enter");
  await page.getByText("Quick check").first().waitFor({ timeout: 15000 });
  await page
    .getByRole("button", { name: /^ARight$/ })
    .first()
    .click()
    .catch(async () => page.locator("button", { hasText: "Right" }).first().click());
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByText("Nailed it.").waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);
  await shot("04-quiz");
  check(true, `${label}: quiz graded`);

  // Citation jump (desktop has the reader visible).
  if (label === "desktop") {
    await page.getByRole("button", { name: "Next page" }).click();
    await page.waitForTimeout(600);
    const chip = page.locator("button", { hasText: /^p\.\d+$/ }).first();
    const target = (await chip.innerText()).replace("p.", "");
    await chip.click();
    await page.waitForTimeout(1200);
    const pageInput = await page
      .getByLabel(/Page number|Current page|Go to page/i)
      .first()
      .inputValue()
      .catch(() => "");
    check(pageInput === target, `${label}: citation jumps the reader to page ${target} (got ${pageInput})`);
  }

  // Voice mode (typed input, mock speech).
  await page.getByRole("button", { name: "Start voice conversation" }).click();
  await page.getByRole("dialog", { name: "Voice conversation" }).waitFor();
  await page.waitForTimeout(1500);
  // Real microphone path: Chromium's fake device → AudioWorklet → 16 kHz PCM → server.
  let audioIn = 0;
  for (let attempt = 0; attempt < 10 && !audioIn; attempt += 1) {
    await page.waitForTimeout(500);
    audioIn = await page.evaluate(async () => {
      const userId = JSON.parse(localStorage.getItem("tutor-app-v2") ?? "{}").state?.userId;
      const response = await fetch("/api/system", { headers: { "x-user-id": userId } });
      return (await response.json()).metrics.counters["voice.audio_bytes_in"] ?? 0;
    });
  }
  check(audioIn > 0, `${label}: microphone audio reaches the server (${audioIn} bytes)`);
  await page.getByRole("button", { name: "Type a message" }).click();
  await page.getByRole("textbox", { name: "Type your message" }).fill("Can you draw a diagram of the Calvin cycle?");
  await page.getByRole("textbox", { name: "Type your message" }).press("Enter");
  await page.locator(".mermaid-host svg").last().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot("05-voice");
  check(true, `${label}: voice delegated diagram shown`);
  await page.getByRole("button", { name: "End voice conversation" }).first().click();
  await page.waitForTimeout(800);

  // Revision.
  await page.getByRole("button", { name: "Revision" }).click();
  await page.waitForTimeout(1500);
  await shot("06-revision");
  await page.getByText("How Tutor Works").first().click();
  await page.waitForTimeout(2500);
  await shot("07-builtin-book");
  await page.getByRole("button", { name: "Back to library" }).click();
  await page.waitForTimeout(800);
  await page
    .getByText(/Mock Study (Topic|Guide)/)
    .first()
    .click();
  await page.waitForTimeout(3000);
  await shot("08-guide");
  check(await page.getByText("Concept map").first().isVisible(), `${label}: study guide has a concept map`);
  await page
    .getByRole("button", { name: /Review/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await shot("09-review");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Analytics.
  await page.getByRole("button", { name: "Analytics" }).click();
  await page.waitForTimeout(2500);
  await shot("10-analytics");

  // Settings.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForTimeout(1500);
  await shot("11-settings");

  const serious = errors.filter((error) => !/favicon|ERR_CERT|net::ERR|Failed to load resource/.test(error));
  check(
    serious.length === 0,
    `${label}: no console errors${serious.length ? `: ${serious.slice(0, 3).join(" | ")}` : ""}`,
  );
  await context.close();
}

try {
  await run("desktop", { width: 1440, height: 900 });
  await run("mobile", { width: 390, height: 844 });
} catch (error) {
  failures.push(String(error));
  console.error(error);
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed");
