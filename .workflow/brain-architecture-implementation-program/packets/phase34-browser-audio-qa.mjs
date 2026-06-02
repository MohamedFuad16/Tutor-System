import { mkdir, writeFile } from "node:fs/promises";
import WebSocket from "ws";

const appUrl = process.env.APP_URL || "http://localhost:3100";
const cdpUrl = process.env.CDP_URL || "http://127.0.0.1:9351";
const screenshotDir =
  ".workflow/brain-architecture-implementation-program/results";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createTarget = async (url) => {
  const endpoint = `${cdpUrl}/json/new?${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, { method: "PUT" });
  if (!response.ok) {
    throw new Error(`Unable to create Chrome target: ${response.status}`);
  }
  return response.json();
};

const connectCdp = (webSocketDebuggerUrl) =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

const createClient = async (webSocketDebuggerUrl) => {
  const socket = await connectCdp(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const handlers = pending.get(message.id);
    if (!handlers) return;
    pending.delete(message.id);
    if (message.error) {
      handlers.reject(new Error(JSON.stringify(message.error)));
    } else {
      handlers.resolve(message.result || {});
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  return {
    close: () => socket.close(),
    send,
  };
};

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
};

const clickText = async (client, text, { optional = false } = {}) => {
  const clicked = await evaluate(
    client,
    `(async () => {
      const matches = [...document.querySelectorAll('button, [role="button"], a, main *')]
        .filter((node) => (node.textContent || '').trim().includes(${JSON.stringify(text)}));
      const target = matches.find((node) => (node.textContent || '').trim() === ${JSON.stringify(text)}) || matches[0];
      if (!target) return false;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    })()`,
  );
  if (!clicked && optional) return false;
  if (!clicked) throw new Error(`Unable to click text: ${text}`);
  await wait(700);
  return true;
};

const setViewport = async (client, width, height) => {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await wait(300);
};

const probeAudioCard = async (client, label) =>
  evaluate(
    client,
    `(async () => {
      const audio = document.querySelector('audio');
      for (let i = 0; i < 30 && audio && (!Number.isFinite(audio.duration) || audio.duration === 0); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      const card = audio?.parentElement?.parentElement;
      const cardText = card?.innerText || '';
      return {
        label: ${JSON.stringify(label)},
        url: location.href,
        title: document.title,
        audioCount: document.querySelectorAll('audio').length,
        audioSrc: audio?.currentSrc || audio?.getAttribute('src') || null,
        controls: audio?.hasAttribute('controls') || false,
        preload: audio?.getAttribute('preload') || null,
        durationSeconds: audio && Number.isFinite(audio.duration) ? Math.round(audio.duration) : null,
        hasTranscript: cardText.includes('Transcript'),
        hasRawMetadata: /aura-2|outputFile|assetStatus/i.test(cardText),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        cardText: cardText.slice(0, 260),
      };
    })()`,
  );

const captureScreenshot = async (client, name) => {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await mkdir(screenshotDir, { recursive: true });
  const path = `${screenshotDir}/${name}.png`;
  await writeFile(path, Buffer.from(result.data, "base64"));
  return path;
};

const target = await createTarget(appUrl);
const client = await createClient(target.webSocketDebuggerUrl);

try {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await wait(1000);

  await clickText(client, "Revision");

  const results = [];
  for (const viewport of [
    { label: "mobile", width: 390, height: 844 },
    { label: "desktop", width: 1440, height: 900 },
  ]) {
    await setViewport(client, viewport.width, viewport.height);
    await clickText(client, "Back to Library", { optional: true });
    await clickText(client, "Tutor System Architecture");
    results.push(await probeAudioCard(client, `tutor-book-${viewport.label}`));
    if (viewport.label === "mobile") {
      results.push({
        label: "tutor-book-mobile-screenshot",
        path: await captureScreenshot(client, "phase34-tutor-audio-mobile"),
      });
    }

    await clickText(client, "Back to Library");
    await clickText(client, "App Design Language");
    results.push(
      await probeAudioCard(client, `app-design-language-${viewport.label}`),
    );
    if (viewport.label === "mobile") {
      results.push({
        label: "app-design-mobile-screenshot",
        path: await captureScreenshot(
          client,
          "phase34-app-design-audio-mobile",
        ),
      });
    }
  }

  const failures = results.filter(
    (result) =>
      result.audioCount !== undefined &&
      (result.audioCount !== 1 ||
        !result.controls ||
        !result.hasTranscript ||
        result.hasRawMetadata ||
        result.horizontalOverflow ||
        !result.durationSeconds ||
        result.durationSeconds < 180 ||
        result.durationSeconds > 245),
  );

  console.log(JSON.stringify({ results, failures }, null, 2));
  if (failures.length) process.exit(1);
} finally {
  client.close();
}
