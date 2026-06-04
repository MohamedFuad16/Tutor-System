import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createTutorServerApp } from "../.tmp-test/server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const settingsSource = readFileSync(
  `${repoRoot}/src/components/SettingsModal.tsx`,
  "utf8",
);
const chatPanelSource = readFileSync(
  `${repoRoot}/src/components/ChatPanel.tsx`,
  "utf8",
);

const startTutorApp = async () => {
  const { app } = await createTutorServerApp({ serveClient: false });
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const startMisoStub = async () => {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({
        method: req.method,
        url: req.url,
        body: JSON.parse(body || "{}"),
      });
      res.writeHead(200, {
        "Content-Type": "audio/wav",
      });
      res.end(Buffer.from("RIFF0000WAVEfmt "));
    });
  });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  return { server, requests, baseUrl: `http://127.0.0.1:${port}` };
};

test("MisoTTS read-aloud option is available in settings", () => {
  assert.match(settingsSource, /miso-tts-8b/);
  assert.match(settingsSource, /MisoTTS 8B \(Vast local API\)/);
  assert.match(settingsSource, /MisoTTS API URL/);
  assert.match(settingsSource, /setMisoTtsApiUrl/);
  assert.match(settingsSource, /http:\/\/127\.0\.0\.1:8080/);
  assert.match(settingsSource, /MISO_TTS_API_URL/);
});

test("chat read-aloud control surfaces the selected MisoTTS voice", () => {
  assert.match(chatPanelSource, /READ_ALOUD_VOICE_LABELS/);
  assert.match(chatPanelSource, /"miso-tts-8b": "MisoTTS 8B"/);
  assert.match(chatPanelSource, /Read aloud with/);
  assert.match(chatPanelSource, /misoTtsApiUrl/);
  assert.match(chatPanelSource, /x-miso-tts-api-url/);
  assert.match(chatPanelSource, /Live Voice still uses Deepgram/);
});

test("TTS route proxies the MisoTTS voice to the local tunneled API", async (t) => {
  const miso = await startMisoStub();
  t.after(() => miso.server.close());

  const previousMisoUrl = process.env.MISO_TTS_API_URL;
  process.env.MISO_TTS_API_URL = miso.baseUrl;
  t.after(() => {
    if (previousMisoUrl === undefined) {
      delete process.env.MISO_TTS_API_URL;
    } else {
      process.env.MISO_TTS_API_URL = previousMisoUrl;
    }
  });

  const { server, baseUrl } = await startTutorApp();
  t.after(() => server.close());

  const response = await fetch(
    `${baseUrl}/api/tts?voice=miso-tts-8b&text=${encodeURIComponent(
      "Explain active recall in one sentence.",
    )}`,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /audio\/wav/);
  assert.equal(response.headers.get("X-Usage-Provider"), "misotts");
  assert.equal(response.headers.get("X-Usage-Model"), "miso-tts-8b");
  assert.equal(response.headers.get("X-Usage-Estimated"), "true");
  assert.equal(miso.requests.length, 1);
  assert.equal(miso.requests[0].method, "POST");
  assert.equal(miso.requests[0].url, "/v1/audio/speech");
  assert.equal(
    miso.requests[0].body.text,
    "Explain active recall in one sentence.",
  );
  assert.equal(miso.requests[0].body.speaker, 0);
  assert.equal(typeof miso.requests[0].body.max_audio_length_ms, "number");

  const audio = Buffer.from(await response.arrayBuffer());
  assert.match(audio.toString("utf8"), /^RIFF/);
});

test("TTS route accepts a browser-provided MisoTTS API URL override", async (t) => {
  const miso = await startMisoStub();
  t.after(() => miso.server.close());

  const previousMisoUrl = process.env.MISO_TTS_API_URL;
  delete process.env.MISO_TTS_API_URL;
  t.after(() => {
    if (previousMisoUrl === undefined) {
      delete process.env.MISO_TTS_API_URL;
    } else {
      process.env.MISO_TTS_API_URL = previousMisoUrl;
    }
  });

  const { server, baseUrl } = await startTutorApp();
  t.after(() => server.close());

  const response = await fetch(
    `${baseUrl}/api/tts?voice=miso-tts-8b&text=${encodeURIComponent(
      "Use the configured Miso endpoint.",
    )}`,
    {
      headers: {
        "x-miso-tts-api-url": miso.baseUrl,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Usage-Provider"), "misotts");
  assert.equal(response.headers.get("X-Usage-Model"), "miso-tts-8b");
  assert.equal(miso.requests.length, 1);
  assert.equal(miso.requests[0].url, "/v1/audio/speech");
  assert.equal(miso.requests[0].body.text, "Use the configured Miso endpoint.");
});
