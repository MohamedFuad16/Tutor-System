/**
 * One-shot speech output outside voice mode: "Read aloud" and narrated
 * diagram tours. Streams server TTS (starts playing on the first chunk) and
 * falls back to the browser's speechSynthesis when server speech is off.
 */
import { API_BASE, authHeaders } from "./api";
import { PcmPlayer } from "./audio";

let player: PcmPlayer | null = null;
let current: AbortController | null = null;
let serverSpeech: boolean | null = null;
let seq = 0;
const pendingEnds = new Map<number, () => void>();

function getPlayer(rate: number) {
  if (!player) {
    player = new PcmPlayer(rate, {
      onEnd: (id) => {
        pendingEnds.get(id)?.();
        pendingEnds.delete(id);
      },
    });
  }
  player.setSampleRate(rate);
  return player;
}

export function stopSpeaking() {
  current?.abort();
  current = null;
  player?.clear();
  for (const resolve of pendingEnds.values()) resolve();
  pendingEnds.clear();
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

function browserSpeak(text: string, language: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.03;
    const preferred = speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.startsWith(language) && /natural|neural|google|samantha/i.test(voice.name));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    signal.addEventListener("abort", () => {
      speechSynthesis.cancel();
      resolve();
    });
    speechSynthesis.speak(utterance);
  });
}

/** Speaks text and resolves when playback ends (or is stopped). */
export async function speak(text: string, language = "en"): Promise<void> {
  stopSpeaking();
  const controller = new AbortController();
  current = controller;
  if (serverSpeech !== false) {
    try {
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        signal: controller.signal,
      });
      if (response.status === 503) {
        serverSpeech = false;
      } else if (response.ok && response.body) {
        serverSpeech = true;
        const rate = Number(response.headers.get("X-Sample-Rate")) || 24_000;
        const output = getPlayer(rate);
        await output.resume();
        const id = ++seq;
        const done = new Promise<void>((resolve) => pendingEnds.set(id, resolve));
        const reader = response.body.getReader();
        for (;;) {
          const { value, done: finished } = await reader.read();
          if (finished || controller.signal.aborted) break;
          output.push(id, value);
        }
        output.finish(id);
        await done;
        return;
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.warn("Server speech failed, using browser voice", error);
    }
  }
  await browserSpeak(text, language, controller.signal);
}
