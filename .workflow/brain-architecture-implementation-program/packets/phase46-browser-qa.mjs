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

const clickText = (sessionId, text) =>
  evaluate(
    sessionId,
    `
    (() => {
      const target = ${JSON.stringify(text)};
      const words = target.split(/\\s+/).filter(Boolean);
      const candidates = Array.from(document.querySelectorAll("button, [role='button'], .cursor-pointer, a, *"));
      const clickable = candidates
        .filter((candidate) => words.every((word) => (candidate.textContent || "").includes(word)))
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
      if (clickable) clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return Boolean(clickable);
    })();
    `,
  );

const assertNoOverflow = (snapshot, label) => {
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

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  sessionId,
);
await setAppState(sessionId, "admin");
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1800);
await pressRouteKey(sessionId, "4");
await sleep(800);
await clickText(sessionId, "Beta Diagnostics");
await sleep(1000);

const adminDesktop = (await pageSnapshot(sessionId)).result.value;
const adminDesktopText = adminDesktop.text.toLowerCase();
if (!adminDesktopText.includes("brain flow coverage")) {
  throw new Error("Desktop Admin Beta did not render Brain Flow Coverage.");
}
if (
  !adminDesktopText.includes(
    "request-correlated background learner-memory rows",
  )
) {
  throw new Error(
    "Desktop Admin Beta did not render request-correlated memory copy.",
  );
}
assertNoOverflow(adminDesktop, "Desktop Admin Beta");
const adminDesktopShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/YY-cdp-admin-beta-request-memory-desktop.png`,
  Buffer.from(adminDesktopShot.data, "base64"),
);

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  sessionId,
);
await setAppState(sessionId, "admin");
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1800);
await pressRouteKey(sessionId, "4");
await sleep(800);
await clickText(sessionId, "Beta Diagnostics");
await sleep(1000);

const adminMobile = (await pageSnapshot(sessionId)).result.value;
const adminMobileText = adminMobile.text.toLowerCase();
if (
  !adminMobileText.includes(
    "request-correlated background learner-memory rows",
  ) &&
  !adminMobileText.includes("request-correlated chat and voice memory rows")
) {
  throw new Error(
    "Mobile Admin Beta did not render request-correlated memory copy.",
  );
}
assertNoOverflow(adminMobile, "Mobile Admin Beta");
const adminMobileShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/YY-cdp-admin-beta-request-memory-mobile.png`,
  Buffer.from(adminMobileShot.data, "base64"),
);

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  sessionId,
);
await evaluate(
  sessionId,
  `
    localStorage.setItem("revision_open_book_id", "app-design-language");
    true;
  `,
);
await setAppState(sessionId, "revision");
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1800);
await clickText(sessionId, "Local Beta Control Patterns");
await sleep(800);
const revision = (await pageSnapshot(sessionId)).result.value;
if (!revision.text.includes("request-correlated chat and voice memory rows")) {
  throw new Error(
    "App Design book did not render the request-correlated memory pattern.",
  );
}
assertNoOverflow(revision, "Desktop App Design book");
const revisionShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/YY-cdp-app-design-request-memory.png`,
  Buffer.from(revisionShot.data, "base64"),
);

await send("Target.closeTarget", { targetId: target.targetId });
ws.close();

console.log(
  JSON.stringify(
    {
      adminDesktop: {
        requestMemoryCopy: adminDesktopText.includes(
          "request-correlated background learner-memory rows",
        ),
        width: adminDesktop.width,
        height: adminDesktop.height,
        scrollWidth: adminDesktop.scrollWidth,
      },
      adminMobile: {
        requestMemoryCopy:
          adminMobileText.includes(
            "request-correlated background learner-memory rows",
          ) ||
          adminMobileText.includes(
            "request-correlated chat and voice memory rows",
          ),
        width: adminMobile.width,
        height: adminMobile.height,
        scrollWidth: adminMobile.scrollWidth,
      },
      revision: {
        appDesignCopy: revision.text.includes(
          "request-correlated chat and voice memory rows",
        ),
        width: revision.width,
        height: revision.height,
        scrollWidth: revision.scrollWidth,
      },
      errors,
    },
    null,
    2,
  ),
);
