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

const setAdminView = async (sessionId, activeView = "admin") => {
  await evaluate(
    sessionId,
    `
      localStorage.setItem("access_mode", "admin");
      const raw = localStorage.getItem("learning-ai-store");
      const store = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      store.state = { ...(store.state || {}), activeView: "${activeView}", accessMode: "admin" };
      localStorage.setItem("learning-ai-store", JSON.stringify(store));
      location.reload();
      true;
    `,
  );
};

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

const clickBetaDiagnostics = (sessionId) =>
  evaluate(
    sessionId,
    `
      const button = Array.from(document.querySelectorAll("button"))
        .find((candidate) => /Beta Diagnostics|Beta/.test(candidate.textContent || ""));
      if (button) button.click();
      Boolean(button);
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
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1200);
await setAdminView(sessionId, "admin");
await sleep(1800);
await pressRouteKey(sessionId, "4");
await sleep(800);
await clickBetaDiagnostics(sessionId);
await sleep(1000);

const desktop = (await pageSnapshot(sessionId)).result.value;
const desktopText = desktop.text.toLowerCase();
if (!desktopText.includes("brain flow coverage")) {
  throw new Error(
    `Desktop Admin Beta did not render Brain Flow Coverage. Body: ${desktop.text.slice(0, 1200)}`,
  );
}
if (!desktopText.includes("chat, voice, tools, and memory proof")) {
  throw new Error("Desktop Admin Beta did not render verifier copy.");
}
if (
  !desktopText.includes("missing local evidence") &&
  !desktopText.includes("100%")
) {
  throw new Error("Desktop Admin Beta did not render an evidence state.");
}

const desktopShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/WW-cdp-admin-beta-desktop.png`,
  Buffer.from(desktopShot.data, "base64"),
);

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  sessionId,
);
await send("Page.navigate", { url: appUrl }, sessionId);
await sleep(1600);
await pressRouteKey(sessionId, "4");
await sleep(800);
await clickBetaDiagnostics(sessionId);
await sleep(1000);

const mobile = (await pageSnapshot(sessionId)).result.value;
const mobileText = mobile.text.toLowerCase();
if (!mobileText.includes("brain flow coverage")) {
  throw new Error(
    `Mobile Admin Beta did not render Brain Flow Coverage. Body: ${mobile.text.slice(0, 1200)}`,
  );
}
if (mobile.scrollWidth > mobile.width + 2) {
  throw new Error(
    `Mobile Admin Beta has horizontal overflow: ${JSON.stringify(mobile)}`,
  );
}

const mobileShot = await send(
  "Page.captureScreenshot",
  { format: "png", captureBeyondViewport: false },
  sessionId,
);
fs.writeFileSync(
  `${outDir}/WW-cdp-admin-beta-mobile.png`,
  Buffer.from(mobileShot.data, "base64"),
);

await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  sessionId,
);
await setAdminView(sessionId, "revision");
await sleep(1800);
await pressRouteKey(sessionId, "3");
await sleep(800);
const revision = (await pageSnapshot(sessionId)).result.value;
if (!revision.text.includes("App Design")) {
  throw new Error("Revision did not render the App Design Library entry.");
}

await send("Target.closeTarget", { targetId: target.targetId });
ws.close();

console.log(
  JSON.stringify(
    {
      desktop: {
        brainFlow: desktopText.includes("brain flow coverage"),
        missingEvidence: desktopText.includes("missing local evidence"),
        width: desktop.width,
        height: desktop.height,
      },
      mobile: {
        brainFlow: mobileText.includes("brain flow coverage"),
        width: mobile.width,
        height: mobile.height,
        scrollWidth: mobile.scrollWidth,
      },
      revision: {
        appDesign: revision.text.includes("App Design"),
      },
      errors,
    },
    null,
    2,
  ),
);
