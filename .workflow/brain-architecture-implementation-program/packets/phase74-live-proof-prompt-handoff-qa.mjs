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

const BOOK_ID = "acq-proof-prompt-book";
const THREAD_ID = "acq-proof-prompt-thread";
const DOCUMENT_IDS = ["acq-doc-active", "acq-doc-companion"];
const BASE_TS = Number(process.env.QA_BASE_TS || Date.now() - 60_000);
const DUMMY_PDF_URL =
  "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMCAvS2lkcyBbXT4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAwPj4Kc3RyZWFtCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjQgMDAwMDAgbiAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE3IDAwMDAwIG4gCnRyYWlsZXIKPDwvUm9vdCAxIDAgUiAvU2l6ZSA1Pj4Kc3RhcnR4cmVmCjE2NwolJUVPRg==";
const defaultChromeExecutable =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const storageSeed = {
  bookId: BOOK_ID,
  documentIds: DOCUMENT_IDS,
  dummyPdfUrl: DUMMY_PDF_URL,
  title: "ACQ Proof Prompt Book",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setupLocalStorage(seed) {
  localStorage.setItem("access_mode", "admin");
  localStorage.setItem("openrouter_api_key", "handoff-openrouter-key");
  localStorage.setItem("deepgram_api_key", "handoff-deepgram-key");
  localStorage.setItem("active_project", seed.title);
  localStorage.setItem("active_learning_book_id", seed.bookId);
  localStorage.setItem("active_document_id", seed.documentIds[0]);
  localStorage.setItem(
    "learning-ai-store",
    JSON.stringify({
      state: {
        activeView: "admin",
        accessMode: "admin",
        activeProject: seed.title,
        activeLearningBookId: seed.bookId,
        activeDocumentId: seed.documentIds[0],
        activeBetaProofAttemptId: null,
        pdfUrl: seed.dummyPdfUrl,
        pdfPage: 1,
        pdfTotalPages: 1,
        language: "en",
      },
      version: 0,
    }),
  );
}

async function seedBookRows(page) {
  const rows = {
    learningBooks: [
      {
        id: BOOK_ID,
        sessionId: "acq-proof-prompt-seed",
        title: "ACQ Proof Prompt Book",
        userName: "Beta QA",
        source: "local_beta_qa",
        overview: "Local proof prompt handoff QA book.",
        summary: "Local proof prompt handoff QA book.",
        knowledgeSummary: "Local proof prompt handoff QA book.",
        chapters: [],
        conceptIds: [],
        conversationCount: 1,
        createdAt: BASE_TS,
        updatedAt: BASE_TS + 20,
        lastConversationId: THREAD_ID,
        activeDocumentId: DOCUMENT_IDS[0],
        documentIds: DOCUMENT_IDS,
        agentModel: "openai/gpt-4.1-mini",
      },
    ],
    learningDocuments: DOCUMENT_IDS.map((id, index) => ({
      id,
      bookId: BOOK_ID,
      title: index === 0 ? "Active PDF" : "Companion PDF",
      mimeType: "application/pdf",
      size: 1024 + index,
      extractedText:
        "Proof prompt handoff QA source text about a shared concept.",
      processingStatus: "ready",
      createdAt: BASE_TS,
      updatedAt: BASE_TS + index,
      totalPages: 3,
    })),
    bookChatThreads: [
      {
        id: THREAD_ID,
        bookId: BOOK_ID,
        bookTitle: "ACQ Proof Prompt Book",
        title: "ACQ proof prompt thread",
        messages: [],
        createdAt: BASE_TS,
        updatedAt: BASE_TS + 20,
      },
    ],
  };

  await page.evaluate(async (seedRows) => {
    const openRequest = indexedDB.open("NeuralNestBrain");
    const db = await new Promise((resolve, reject) => {
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => resolve(openRequest.result);
    });
    const storeNames = Object.keys(seedRows);
    const tx = db.transaction(storeNames, "readwrite");
    await Promise.all(
      storeNames.flatMap((storeName) =>
        seedRows[storeName].map(
          (row) =>
            new Promise((resolve, reject) => {
              const store = tx.objectStore(storeName);
              const deleteRequest = store.delete(row.id);
              deleteRequest.onerror = () => reject(deleteRequest.error);
              deleteRequest.onsuccess = () => {
                const putRequest = store.put(row);
                putRequest.onerror = () => reject(putRequest.error);
                putRequest.onsuccess = () => resolve();
              };
            }),
        ),
      ),
    );
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    return true;
  }, rows);
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

async function runHandoffCheck(browser, label, viewport) {
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
    } catch (error) {
      const bodyStart = await page
        .evaluate(() => document.body.textContent.slice(0, 1200))
        .catch(() => "");
      throw new Error(
        `${label} missing ${JSON.stringify(marker)}. Body starts: ${JSON.stringify(bodyStart)}`,
      );
    }
  };

  await page.addInitScript(setupLocalStorage, storageSeed);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await waitForText("Admin");
  await page.evaluate(setupLocalStorage, storageSeed);
  await seedBookRows(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForText("Admin");
  const adminNavButton = page.locator("button", { hasText: "Admin" }).first();
  if ((await adminNavButton.count()) > 0) {
    await adminNavButton.click();
  }
  await waitForText("Beta Diagnostics");
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")];
    const betaButton =
      buttons.find(
        (button) =>
          button.getClientRects().length > 0 &&
          (button.textContent || "").includes("Beta Diagnostics"),
      ) ||
      buttons.find(
        (button) =>
          button.getClientRects().length > 0 &&
          (button.textContent || "").trim() === "Beta",
      ) ||
      buttons.find((button) =>
        (button.textContent || "").includes("Beta Diagnostics"),
      );
    if (!betaButton) {
      throw new Error("Beta Diagnostics tab button not found.");
    }
    betaButton.click();
  });
  await waitForText("Exact local prompts for chat and voice");

  await page
    .locator("button", { hasText: /Start proof attempt|Restart proof attempt/ })
    .first()
    .click();
  const proofAttemptId = await page.waitForFunction(
    () => localStorage.getItem("active_beta_proof_attempt_id") || "",
  );
  const expectedProofAttemptId = await proofAttemptId.jsonValue();

  await page.locator("button", { hasText: "Load in chat" }).first().click();
  await waitForText("Live proof capture");
  await page.waitForFunction(() =>
    Boolean(
      document
        .querySelector("textarea")
        ?.value.includes("Provider-key proof turn"),
    ),
  );
  await sleep(400);

  const snapshot = await page.evaluate((proofAttemptId) => {
    const text = document.body.textContent || "";
    const lower = text.toLowerCase();
    const textarea = document.querySelector("textarea");
    const hudIndex = lower.indexOf("live proof capture");
    return {
      surface: "admin-to-chat",
      label: window.innerWidth < 700 ? "mobile" : "desktop",
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      hasHud: lower.includes("live proof capture"),
      hasAttempt: lower.includes(proofAttemptId),
      hasBook: lower.includes("acq proof prompt book"),
      hasPromptLoaded: lower.includes("proof prompt loaded"),
      hasReadyPdfs: lower.includes("ready pdfs 2"),
      hasOpenRouterKey: lower.includes("openrouter key set"),
      hasDeepgramKey: lower.includes("deepgram key set"),
      textareaHasPrompt: Boolean(
        textarea?.value.includes("Provider-key proof turn"),
      ),
      textareaFocused: document.activeElement === textarea,
      hudSnippet:
        hudIndex >= 0
          ? text.slice(hudIndex, hudIndex + 420)
          : text.slice(0, 420),
    };
  }, expectedProofAttemptId);

  if (
    !snapshot.hasHud ||
    !snapshot.hasAttempt ||
    !snapshot.hasBook ||
    !snapshot.hasPromptLoaded ||
    !snapshot.hasReadyPdfs ||
    !snapshot.hasOpenRouterKey ||
    !snapshot.hasDeepgramKey ||
    !snapshot.textareaHasPrompt ||
    !snapshot.textareaFocused
  ) {
    throw new Error(`${label} handoff mismatch: ${JSON.stringify(snapshot)}`);
  }

  assertNoOverflow(label, snapshot);
  await page.screenshot({
    path: `${outDir}/ACQ-live-proof-prompt-handoff-${label}.png`,
    fullPage: false,
  });
  assertCleanConsole(label, consoleLogs);
  await page.close();
  return { ...snapshot, consoleLogs: [] };
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
    results.push(await runHandoffCheck(browser, label, viewport));
  }

  await fs.writeFile(
    `${outDir}/phase74-live-proof-prompt-handoff-qa.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
