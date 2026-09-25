/**
 * Deepgram speech adapters behind a provider-neutral interface.
 *
 * STT: one streaming socket per voice session.
 *   - English: Flux (v2/listen) — native turn detection with StartOfTurn,
 *     EagerEndOfTurn (speculative), TurnResumed and EndOfTurn events.
 *   - Other languages: Nova-3 (v1/listen) with VAD + utterance-end, mapped
 *     onto the same events (no eager turn).
 * TTS: Aura-2 over HTTP, one request per phrase, streamed as raw PCM16. Per
 * phrase requests give exact segment boundaries for captions, diagram-tour
 * sync and barge-in truncation, and let us pipeline phrase N+1 while N plays.
 */
import WebSocket from "ws";
import { errorMessage, log } from "../lib/log.js";

export type SttEvent =
  | { type: "start_of_turn" }
  | { type: "update"; transcript: string }
  | { type: "eager_end_of_turn"; transcript: string }
  | { type: "turn_resumed" }
  | { type: "end_of_turn"; transcript: string }
  | { type: "error"; message: string; fatal: boolean }
  | { type: "closed" };

export interface SttSession {
  sendAudio(chunk: Buffer): void;
  close(): void;
}

export interface SpeechProvider {
  readonly name: string;
  readonly available: boolean;
  openStt(options: {
    language: string;
    sampleRate: number;
    onEvent: (event: SttEvent) => void;
    keyterms?: string[];
  }): SttSession;
  synthesize(
    text: string,
    options: { language: string; voice?: string; sampleRate: number; signal?: AbortSignal },
  ): AsyncGenerator<Buffer>;
}

/** Default Aura-2 voice per language; override with VOICE_TTS_VOICE for English. */
const AURA_VOICES: Record<string, string> = {
  en: "aura-2-thalia-en",
  es: "aura-2-celeste-es",
  fr: "aura-2-agathe-fr",
  de: "aura-2-julius-de",
  it: "aura-2-livia-it",
  nl: "aura-2-rhea-nl",
  ja: "aura-2-izanami-ja",
};

export type DeepgramOptions = {
  apiKey: string;
  sttModel: string;
  sttMultilingualModel: string;
  ttsVoice: string;
  eotThreshold: number;
  eagerEotThreshold: number;
};

export function createDeepgram(options: DeepgramOptions): SpeechProvider {
  const available = Boolean(options.apiKey);

  function openFlux(sampleRate: number, onEvent: (event: SttEvent) => void, keyterms: string[]) {
    const params = new URLSearchParams({
      model: options.sttModel,
      encoding: "linear16",
      sample_rate: String(sampleRate),
      eot_threshold: String(options.eotThreshold),
      eot_timeout_ms: "5000",
    });
    if (options.eagerEotThreshold > 0) {
      params.set("eager_eot_threshold", String(Math.min(options.eagerEotThreshold, options.eotThreshold)));
    }
    for (const term of keyterms.slice(0, 20)) params.append("keyterm", term);
    const socket = new WebSocket(`wss://api.deepgram.com/v2/listen?${params}`, {
      headers: { Authorization: `Token ${options.apiKey}` },
    });
    socket.on("message", (data, isBinary) => {
      if (isBinary) return;
      let message: any;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (message.type === "TurnInfo") {
        const transcript = String(message.transcript ?? "").trim();
        switch (message.event) {
          case "StartOfTurn":
            onEvent({ type: "start_of_turn" });
            break;
          case "Update":
            if (transcript) onEvent({ type: "update", transcript });
            break;
          case "EagerEndOfTurn":
            if (transcript) onEvent({ type: "eager_end_of_turn", transcript });
            break;
          case "TurnResumed":
            onEvent({ type: "turn_resumed" });
            break;
          case "EndOfTurn":
            if (transcript) onEvent({ type: "end_of_turn", transcript });
            break;
        }
      } else if (message.type === "FatalError" || message.type === "Error") {
        onEvent({
          type: "error",
          message: String(message.description ?? message.message ?? "Speech recognition error"),
          fatal: message.type === "FatalError",
        });
      }
    });
    return socket;
  }

  function openNova(language: string, sampleRate: number, onEvent: (event: SttEvent) => void, keyterms: string[]) {
    const params = new URLSearchParams({
      model: options.sttMultilingualModel,
      language,
      encoding: "linear16",
      sample_rate: String(sampleRate),
      channels: "1",
      interim_results: "true",
      endpointing: "400",
      utterance_end_ms: "1200",
      vad_events: "true",
      smart_format: "true",
      punctuate: "true",
    });
    for (const term of keyterms.slice(0, 20)) params.append("keyterm", term);
    const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, {
      headers: { Authorization: `Token ${options.apiKey}` },
    });
    let finals: string[] = [];
    let inTurn = false;
    const endTurn = () => {
      const transcript = finals.join(" ").trim();
      finals = [];
      if (inTurn && transcript) onEvent({ type: "end_of_turn", transcript });
      inTurn = false;
    };
    const keepAlive = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "KeepAlive" }));
    }, 5000);
    socket.on("close", () => clearInterval(keepAlive));
    socket.on("message", (data, isBinary) => {
      if (isBinary) return;
      let message: any;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (message.type === "SpeechStarted") {
        if (!inTurn) onEvent({ type: "start_of_turn" });
        inTurn = true;
      } else if (message.type === "Results") {
        const transcript = String(message.channel?.alternatives?.[0]?.transcript ?? "").trim();
        if (transcript && !inTurn) {
          inTurn = true;
          onEvent({ type: "start_of_turn" });
        }
        if (message.is_final && transcript) finals.push(transcript);
        const partial = [...finals, message.is_final ? "" : transcript].join(" ").trim();
        if (partial) onEvent({ type: "update", transcript: partial });
        if (message.speech_final) endTurn();
      } else if (message.type === "UtteranceEnd") {
        endTurn();
      } else if (message.type === "Error") {
        onEvent({ type: "error", message: String(message.description ?? "Speech recognition error"), fatal: false });
      }
    });
    return socket;
  }

  return {
    name: "deepgram",
    available,

    openStt({ language, sampleRate, onEvent, keyterms = [] }) {
      const lang = (language || "en").slice(0, 2);
      const socket =
        lang === "en" ? openFlux(sampleRate, onEvent, keyterms) : openNova(lang, sampleRate, onEvent, keyterms);
      const pending: Buffer[] = [];
      let closed = false;
      socket.on("open", () => {
        for (const chunk of pending.splice(0)) socket.send(chunk);
      });
      socket.on("error", (error) => onEvent({ type: "error", message: errorMessage(error), fatal: true }));
      socket.on("unexpected-response", (_req, res) => {
        onEvent({
          type: "error",
          message: `Speech recognition rejected the connection (HTTP ${res.statusCode})`,
          fatal: true,
        });
      });
      socket.on("close", () => {
        if (!closed) onEvent({ type: "closed" });
      });
      return {
        sendAudio(chunk: Buffer) {
          if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
          else if (socket.readyState === WebSocket.CONNECTING && pending.length < 200) pending.push(chunk);
        },
        close() {
          closed = true;
          try {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "CloseStream" }));
            }
            socket.close();
          } catch {
            socket.terminate();
          }
        },
      };
    },

    async *synthesize(text, { language, voice, sampleRate, signal }) {
      const lang = (language || "en").slice(0, 2);
      const model = voice || (lang === "en" ? options.ttsVoice : (AURA_VOICES[lang] ?? options.ttsVoice));
      const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=linear16&sample_rate=${sampleRate}&container=none`;
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Token ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 1900) }),
        signal,
      });
      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        log.warn("tts.failed", { status: response.status, model, detail: detail.slice(0, 200) });
        throw new Error(`Text-to-speech failed (HTTP ${response.status})`);
      }
      const reader = response.body.getReader();
      let carry: Buffer | null = null;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          let chunk = Buffer.from(value);
          if (carry) {
            chunk = Buffer.concat([carry, chunk]);
            carry = null;
          }
          // Keep PCM16 frames aligned: never split a sample across chunks.
          if (chunk.length % 2) {
            carry = chunk.subarray(chunk.length - 1);
            chunk = chunk.subarray(0, chunk.length - 1);
          }
          if (chunk.length) yield chunk;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
