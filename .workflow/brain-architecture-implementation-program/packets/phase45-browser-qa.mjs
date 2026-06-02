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

const configureRevisionBook = (sessionId) =>
  evaluate(
    sessionId,
    `
      localStorage.setItem("access_mode", "admin");
      localStorage.removeItem("user_brain_architecture_book_hidden");
      localStorage.setItem("revision_open_book_id", "user-brain-architecture");
      const raw = localStorage.getItem("learning-ai-store");
      const store = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      store.state = { ...(store.state || {}), activeView: "revision", accessMode: "admin" };
      localStorage.setItem("learning-ai-store", JSON.stringify(store));
      true;
    `,
  );

const clickChapterContaining = (sessionId, text) =>
  evaluate(
    sessionId,
    `
    (() => {
      const target = ${JSON.stringify(text)};
      const words = target.split(/\\s+/).filter(Boolean);
      const button = Array.from(document.querySelectorAll("button"))
        .find((candidate) => words.every((word) => (candidate.textContent || "").includes(word)));
      if (button) button.click();
      return Boolean(button);
    })();
    `,
  );

const clickVisibleText = (sessionId, text) =>
  evaluate(
    sessionId,
    `
    (() => {
      const target = ${JSON.stringify(text)};
      const words = target.split(/\\s+/).filter(Boolean);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (words.every((word) => (node.nodeValue || "").includes(word))) {
          const element = node.parentElement?.closest("button, [role='button'], .cursor-pointer, a, div") || node.parentElement;
          if (element) {
            element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            return true;
          }
        }
      }
      const candidates = Array.from(document.querySelectorAll("*"));
      const exact = candidates.find((candidate) => (candidate.textContent || "").trim() === target);
      const clickable = exact || candidates
        .filter((candidate) => words.every((word) => (candidate.textContent || "").includes(word)))
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
      if (clickable) clickable.click();
      return Boolean(clickable);
    })();
    `,
  );

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

const openUserBrainBook = async (sessionId, metrics) => {
  await send("Emulation.setDeviceMetricsOverride", metrics, sessionId);
  await configureRevisionBook(sessionId);
  await send("Page.navigate", { url: appUrl }, sessionId);
  await sleep(1800);
  const opened = (await pageSnapshot(sessionId)).result.value;
  if (!opened.text.includes("User Brain Architecture")) {
    throw new Error(
      `Revision did not open User Brain Architecture. Body: ${opened.text.slice(0, 1200)}`,
    );
  }
  let clicked = (
    await clickChapterContaining(
      sessionId,
      "Chapter 2: The Learner Brain Ledger",
    )
  ).result.value;
  if (!clicked) {
    const bookClicked = (
      await clickVisibleText(sessionId, "User Brain Architecture")
    ).result.value;
    if (!bookClicked) {
      throw new Error(
        `Could not click User Brain Architecture card. Body: ${opened.text.slice(0, 1200)}`,
      );
    }
    await sleep(800);
    const afterBookClick = (await pageSnapshot(sessionId)).result.value;
    clicked = (
      await clickChapterContaining(
        sessionId,
        "Chapter 2: The Learner Brain Ledger",
      )
    ).result.value;
    if (!clicked && !afterBookClick.text.includes("Chapter 2")) {
      throw new Error(
        `Clicked User Brain Architecture but did not enter the book. Body: ${afterBookClick.text.slice(0, 1200)}`,
      );
    }
  }
  if (!clicked) {
    throw new Error("Could not select the learner brain ledger chapter.");
  }
  await sleep(600);
  return (await pageSnapshot(sessionId)).result.value;
};

const assertConfidenceGateText = (snapshot, label) => {
  const text = snapshot.text.toLowerCase();
  if (!text.includes("model summaries can add evidence rows")) {
    throw new Error(`${label} did not render the model-summary gate sentence.`);
  }
  if (!text.includes("cannot raise mastery or durable learner confidence")) {
    throw new Error(`${label} did not render the durable confidence boundary.`);
  }
  if (snapshot.scrollWidth > snapshot.width + 2) {
    throw new Error(
      `${label} has horizontal overflow: ${JSON.stringify(snapshot)}`,
    );
  }
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

const desktop = await openUserBrainBook(sessionId, {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
assertConfidenceGateText(desktop, "Desktop User Brain Architecture");
const desktopShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/XX-cdp-user-brain-confidence-desktop.png`,
  Buffer.from(desktopShot.data, "base64"),
);

const mobile = await openUserBrainBook(sessionId, {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
assertConfidenceGateText(mobile, "Mobile User Brain Architecture");
const mobileShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/XX-cdp-user-brain-confidence-mobile.png`,
  Buffer.from(mobileShot.data, "base64"),
);

await send("Target.closeTarget", { targetId: target.targetId });
ws.close();

console.log(
  JSON.stringify(
    {
      desktop: {
        confidenceGate: desktop.text.includes(
          "cannot raise mastery or durable learner confidence",
        ),
        width: desktop.width,
        height: desktop.height,
        scrollWidth: desktop.scrollWidth,
      },
      mobile: {
        confidenceGate: mobile.text.includes(
          "cannot raise mastery or durable learner confidence",
        ),
        width: mobile.width,
        height: mobile.height,
        scrollWidth: mobile.scrollWidth,
      },
      errors,
    },
    null,
    2,
  ),
);
