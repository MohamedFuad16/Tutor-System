import fs from "node:fs";
import WebSocket from "ws";

const outDir = ".workflow/brain-architecture-implementation-program/results";
const appUrl = "http://127.0.0.1:3100";
const cdpVersionUrl = "http://127.0.0.1:9342/json/version";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const version = await fetch(cdpVersionUrl).then((response) => response.json());
const ws = new WebSocket(version.webSocketDebuggerUrl);

let nextId = 1;
const pending = new Map();
const errors = [];

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(JSON.stringify(message.error)));
    } else {
      resolve(message.result);
    }
  }
  if (message.method === "Runtime.exceptionThrown") {
    errors.push(
      `exception: ${message.params.exceptionDetails?.text || "unknown"}`,
    );
  }
  if (message.method === "Log.entryAdded") {
    const entry = message.params.entry;
    if (entry.level === "error" || entry.level === "warning") {
      errors.push(`${entry.level}: ${entry.text}`);
    }
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const evaluate = (sessionId, expression) =>
  send(
    "Runtime.evaluate",
    {
      expression,
      returnByValue: true,
      awaitPromise: true,
    },
    sessionId,
  );

const clickText = (sessionId, text) =>
  evaluate(
    sessionId,
    `
    (() => {
      const target = ${JSON.stringify(text)};
      const words = target.split(/\\s+/).filter(Boolean);
      const candidates = Array.from(document.querySelectorAll("button, [role='button'], a, .cursor-pointer"));
      const clickable = candidates
        .filter((candidate) => words.every((word) => (candidate.textContent || "").includes(word)))
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
      if (clickable) clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return Boolean(clickable);
    })();
    `,
  );

const pressRouteKey = async (sessionId, key) => {
  const code = `Digit${key}`;
  const windowsVirtualKeyCode = key.charCodeAt(0);
  await send(
    "Input.dispatchKeyEvent",
    {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode,
    },
    sessionId,
  );
  await send(
    "Input.dispatchKeyEvent",
    {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode,
    },
    sessionId,
  );
};

const pageSnapshot = (sessionId) =>
  evaluate(
    sessionId,
    `
      ({
        text: document.body.innerText,
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title
      })
    `,
  );

const assertIncludes = (snapshot, label, expectedText) => {
  if (!snapshot.text.toLowerCase().includes(expectedText.toLowerCase())) {
    throw new Error(
      `${label} did not render expected text: ${expectedText}. Body: ${snapshot.text.slice(0, 1600)}`,
    );
  }
};

const assertNoOverflow = (snapshot, label) => {
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(
      `${label} has horizontal overflow: ${JSON.stringify(snapshot)}`,
    );
  }
};

const capture = async (sessionId, filename) => {
  const shot = await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false },
    sessionId,
  );
  fs.writeFileSync(`${outDir}/${filename}`, Buffer.from(shot.data, "base64"));
};

const setAppState = (sessionId, activeView) =>
  evaluate(
    sessionId,
    `
      localStorage.setItem("access_mode", "admin");
      const raw = localStorage.getItem("learning-ai-store");
      const store = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      store.state = { ...(store.state || {}), activeView: ${JSON.stringify(activeView)}, accessMode: "admin" };
      localStorage.setItem("learning-ai-store", JSON.stringify(store));
      true;
    `,
  );

const setRevisionBook = (sessionId, bookId) =>
  evaluate(
    sessionId,
    `
      localStorage.setItem("access_mode", "admin");
      localStorage.removeItem("tutor_book_hidden");
      localStorage.removeItem("user_brain_architecture_book_hidden");
      localStorage.removeItem("app_design_language_book_hidden");
      localStorage.setItem("revision_open_book_id", ${JSON.stringify(bookId)});
      const raw = localStorage.getItem("learning-ai-store");
      const store = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      store.state = { ...(store.state || {}), activeView: "revision", accessMode: "admin" };
      localStorage.setItem("learning-ai-store", JSON.stringify(store));
      true;
    `,
  );

const bookTitles = {
  "user-brain-architecture": "User Brain Architecture",
  "tutor-book": "Tutor System Architecture",
  "app-design-language": "App Design Language",
};

const openBookChapter = async (sessionId, metrics, bookId, chapterText) => {
  await send("Emulation.setDeviceMetricsOverride", metrics, sessionId);
  await setRevisionBook(sessionId, bookId);
  await send("Page.navigate", { url: appUrl }, sessionId);
  await sleep(1800);
  let snapshot = (await pageSnapshot(sessionId)).result.value;
  if (!snapshot.text.includes(chapterText)) {
    await clickText(sessionId, bookTitles[bookId] || bookId);
    await sleep(1000);
  }
  await clickText(sessionId, chapterText);
  await sleep(900);
  return (await pageSnapshot(sessionId)).result.value;
};

const target = await send("Target.createTarget", { url: "about:blank" });
const attached = await send("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const sessionId = attached.sessionId;

await send("Runtime.enable", {}, sessionId);
await send("Log.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);

const desktopMetrics = {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
};
const mobileMetrics = {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
};

await send("Emulation.setDeviceMetricsOverride", desktopMetrics, sessionId);
await setAppState(sessionId, "admin");
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1800);
await pressRouteKey(sessionId, "4");
await sleep(800);
await clickText(sessionId, "Correction Requests");
await sleep(900);
const adminDesktop = (await pageSnapshot(sessionId)).result.value;
assertIncludes(
  adminDesktop,
  "Desktop Admin Corrections",
  "Concept corrections quarantine learner-state scores locally",
);
assertIncludes(
  adminDesktop,
  "Desktop Admin Corrections",
  "confidence is cleared",
);
assertNoOverflow(adminDesktop, "Desktop Admin Corrections");
await capture(sessionId, "AAA-cdp-admin-corrections-desktop.png");

await send("Emulation.setDeviceMetricsOverride", mobileMetrics, sessionId);
await setAppState(sessionId, "admin");
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1800);
await pressRouteKey(sessionId, "4");
await sleep(800);
await clickText(sessionId, "Correct");
await sleep(900);
const adminMobile = (await pageSnapshot(sessionId)).result.value;
assertIncludes(
  adminMobile,
  "Mobile Admin Corrections",
  "Concept corrections quarantine learner-state scores locally",
);
assertNoOverflow(adminMobile, "Mobile Admin Corrections");
await capture(sessionId, "AAA-cdp-admin-corrections-mobile.png");

const userBrain = await openBookChapter(
  sessionId,
  desktopMetrics,
  "user-brain-architecture",
  "Chapter 2: The Learner Brain Ledger",
);
assertIncludes(
  userBrain,
  "Desktop User Brain Architecture",
  "Concept-level corrections now quarantine durable learner state locally",
);
assertNoOverflow(userBrain, "Desktop User Brain Architecture");
await capture(sessionId, "AAA-cdp-user-brain-correction.png");

const tutorBook = await openBookChapter(
  sessionId,
  desktopMetrics,
  "tutor-book",
  "Chapter 6: Memory, Dexie, And The Library",
);
assertIncludes(
  tutorBook,
  "Desktop Tutor System Architecture",
  "Concept-level corrections also quarantine learner-state scores locally",
);
assertNoOverflow(tutorBook, "Desktop Tutor System Architecture");
await capture(sessionId, "AAA-cdp-tutor-book-correction.png");

const appDesign = await openBookChapter(
  sessionId,
  desktopMetrics,
  "app-design-language",
  "Local Beta Control Patterns",
);
assertIncludes(
  appDesign,
  "Desktop App Design Language",
  "corrected concepts quarantine confidence/mastery",
);
assertNoOverflow(appDesign, "Desktop App Design Language");
await capture(sessionId, "AAA-cdp-app-design-correction.png");

if (errors.length) {
  throw new Error(`Captured browser errors: ${errors.join(" | ")}`);
}

await send("Target.closeTarget", { targetId: target.targetId });
ws.close();

console.log(
  JSON.stringify(
    {
      adminDesktop: {
        width: adminDesktop.width,
        scrollWidth: adminDesktop.scrollWidth,
      },
      adminMobile: {
        width: adminMobile.width,
        scrollWidth: adminMobile.scrollWidth,
      },
      userBrain: {
        width: userBrain.width,
        scrollWidth: userBrain.scrollWidth,
      },
      tutorBook: {
        width: tutorBook.width,
        scrollWidth: tutorBook.scrollWidth,
      },
      appDesign: {
        width: appDesign.width,
        scrollWidth: appDesign.scrollWidth,
      },
      errors,
    },
    null,
    2,
  ),
);
