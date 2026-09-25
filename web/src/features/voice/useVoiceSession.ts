/**
 * Client side of the duplex voice protocol (see shared/voice.ts).
 *
 * Input:  server STT (mic → AudioWorklet → 16 kHz PCM over the socket) or the
 *         browser's SpeechRecognition when server speech isn't available.
 * Output: server TTS (PCM segments, played gaplessly) or speechSynthesis.
 * Playback start/end is reported per segment so the server knows exactly
 * what was heard, and diagram-tour highlights stay in sync with the audio.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientVoiceMessage, ServerVoiceMessage, VoiceState, VoiceVisual } from "@shared/voice";
import { unpackAudio } from "@shared/voice";
import { api, wsUrl } from "@/lib/api";
import { MicCapture, PcmPlayer, silentBands } from "@/lib/audio";
import { keys, queryClient } from "@/lib/queries";
import { useApp } from "@/store/app";

type Caption = { role: "user" | "tutor"; text: string; final: boolean };
export type VoiceTask = { id: string; title: string; status: "running" | "done" | "failed"; summary?: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onspeechstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const Recognition = (): (new () => SpeechRecognitionLike) | null =>
  typeof window === "undefined"
    ? null
    : ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

export const browserRecognitionAvailable = () => Boolean(Recognition());

const LOCALES: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

export function useVoiceSession() {
  const [state, setState] = useState<VoiceState | "idle" | "error">("idle");
  const [captions, setCaptions] = useState<{ user: Caption | null; tutor: Caption | null }>({
    user: null,
    tutor: null,
  });
  const [visuals, setVisuals] = useState<VoiceVisual[]>([]);
  const [focus, setFocus] = useState<{ visualId: string; node: string } | null>(null);
  const [tasks, setTasks] = useState<VoiceTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [modes, setModes] = useState<{ stt: "server" | "browser"; tts: "server" | "browser" } | null>(null);

  const socket = useRef<WebSocket | null>(null);
  const mic = useRef<MicCapture | null>(null);
  const player = useRef<PcmPlayer | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const segments = useRef(new Map<number, { text: string; focus?: { visualId: string; node: string } }>());
  const utterances = useRef<number[]>([]);
  const micLevel = useRef(0);
  const active = useRef(false);
  const mutedRef = useRef(false);
  const ttsMode = useRef<"server" | "browser">("server");

  const send = useCallback((message: ClientVoiceMessage) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(message));
  }, []);

  const onSegmentStart = useCallback(
    (seq: number) => {
      send({ type: "playback", seq, state: "start" });
      const segment = segments.current.get(seq);
      if (!segment) return;
      setCaptions((current) => ({ ...current, tutor: { role: "tutor", text: segment.text, final: false } }));
      if (segment.focus) setFocus(segment.focus);
    },
    [send],
  );

  const onSegmentEnd = useCallback(
    (seq: number) => {
      send({ type: "playback", seq, state: "end" });
      segments.current.delete(seq);
    },
    [send],
  );

  const speakBrowser = useCallback(
    (seq: number, text: string, language: string) => {
      if (typeof speechSynthesis === "undefined") {
        onSegmentStart(seq);
        onSegmentEnd(seq);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LOCALES[language] ?? language;
      utterance.rate = 1.04;
      utterance.onstart = () => onSegmentStart(seq);
      utterance.onend = () => {
        utterances.current = utterances.current.filter((id) => id !== seq);
        onSegmentEnd(seq);
      };
      utterance.onerror = () => onSegmentEnd(seq);
      utterances.current.push(seq);
      speechSynthesis.speak(utterance);
    },
    [onSegmentStart, onSegmentEnd],
  );

  const clearPlayback = useCallback(() => {
    player.current?.clear();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    utterances.current = [];
    segments.current.clear();
    setFocus(null);
  }, []);

  const startBrowserRecognition = useCallback(
    (language: string) => {
      const Ctor = Recognition();
      if (!Ctor) {
        setError("Your browser can't recognise speech. Type below, or ask your admin to configure server speech.");
        return;
      }
      const rec = new Ctor();
      rec.lang = LOCALES[language] ?? language;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onspeechstart = () => send({ type: "speech_start" });
      rec.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = String(result[0]?.transcript ?? "");
          if (result.isFinal) {
            if (transcript.trim()) send({ type: "text", text: transcript.trim(), spoken: true });
          } else interim += transcript;
        }
        if (interim.trim()) send({ type: "partial", text: interim.trim() });
      };
      // Chrome ends recognition after silence; keep it alive for the session.
      rec.onend = () => {
        if (active.current && !mutedRef.current && recognition.current === rec) {
          try {
            rec.start();
          } catch {
            // already started
          }
        }
      };
      rec.onerror = (event: any) => {
        if (event?.error === "not-allowed") setError("Microphone access was blocked.");
      };
      recognition.current = rec;
      try {
        rec.start();
      } catch {
        // ignore double start
      }
    },
    [send],
  );

  /** Ends the session. `failed` keeps the overlay in an error state (with Reconnect) instead of idle. */
  const stop = useCallback((failed = false) => {
    active.current = false;
    send({ type: "bye" });
    socket.current?.close();
    socket.current = null;
    mic.current?.stop();
    mic.current = null;
    recognition.current?.abort();
    recognition.current = null;
    clearPlayback();
    player.current?.close();
    player.current = null;
    setState(failed ? "error" : "idle");
    const bookId = useApp.getState().activeBookId;
    if (bookId) {
      queryClient.invalidateQueries({ queryKey: keys.messages(bookId) });
      queryClient.invalidateQueries({ queryKey: keys.guide(bookId) });
    }
    queryClient.invalidateQueries({ queryKey: keys.analytics });
  }, [send, clearPlayback]);

  const start = useCallback(async () => {
    const app = useApp.getState();
    const bookId = app.activeBookId;
    if (!bookId || active.current) return;
    active.current = true;
    setError(null);
    setVisuals([]);
    setTasks([]);
    setCaptions({ user: null, tutor: null });
    setState("connecting");
    try {
      const ticket = await api<{ ticket: string; path: string; serverSpeech: boolean }>("/voice/ticket", {
        method: "POST",
      });
      const wantServerIn = app.voiceInput === "server" || (app.voiceInput === "auto" && ticket.serverSpeech);
      const wantServerOut = app.voiceOutput === "server" || (app.voiceOutput === "auto" && ticket.serverSpeech);
      const stt = wantServerIn && ticket.serverSpeech ? "server" : "browser";
      const tts = wantServerOut && ticket.serverSpeech ? "server" : "browser";
      ttsMode.current = tts;

      // Audio output must be created in the click gesture to satisfy autoplay rules.
      player.current = new PcmPlayer(24_000, { onStart: onSegmentStart, onEnd: onSegmentEnd });
      await player.current.resume();

      const ws = new WebSocket(`${wsUrl(ticket.path)}?ticket=${encodeURIComponent(ticket.ticket)}`);
      ws.binaryType = "arraybuffer";
      socket.current = ws;
      ws.onopen = () => {
        const documentId = app.activeDocumentByBook[bookId];
        send({
          type: "hello",
          bookId,
          language: app.language,
          stt,
          tts,
          sampleRate: 16_000,
          focus: documentId ? { documentId, page: app.page } : undefined,
        });
      };
      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const { seq, pcm } = unpackAudio(event.data);
          player.current?.push(seq, new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
          return;
        }
        const message = JSON.parse(String(event.data)) as ServerVoiceMessage;
        switch (message.type) {
          case "ready":
            player.current?.setSampleRate(message.outputSampleRate);
            ttsMode.current = message.tts;
            setModes({ stt: message.stt, tts: message.tts });
            if (message.stt === "server" && !mic.current) {
              mic.current = new MicCapture((pcm, rms) => {
                micLevel.current = rms;
                if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(pcm);
              });
              mic.current.start().catch(() => {
                setError("Microphone access was blocked. Allow it in your browser to talk.");
              });
            } else if (message.stt === "browser" && !recognition.current) {
              mic.current?.stop();
              mic.current = null;
              startBrowserRecognition(app.language);
            }
            break;
          case "state":
            setState(message.state);
            break;
          case "user_partial":
            setCaptions((current) => ({ ...current, user: { role: "user", text: message.text, final: false } }));
            break;
          case "user_final":
            setCaptions({ user: { role: "user", text: message.text, final: true }, tutor: null });
            break;
          case "segment":
            segments.current.set(message.seq, { text: message.text, focus: message.focus });
            if (ttsMode.current === "browser") speakBrowser(message.seq, message.text, app.language);
            break;
          case "segment_end":
            if (ttsMode.current === "server") player.current?.finish(message.seq);
            break;
          case "turn_end":
            setFocus(null);
            break;
          case "duck":
            player.current?.duck(message.on);
            break;
          case "clear":
            clearPlayback();
            break;
          case "visual":
            setVisuals((current) =>
              [...current.filter((visual) => visual.id !== message.visual.id), message.visual].slice(-6),
            );
            break;
          case "task":
            setTasks((current) => [
              ...current.filter((task) => task.id !== message.id),
              { id: message.id, title: message.title, status: message.status, summary: message.summary },
            ]);
            if (message.status !== "running") {
              window.setTimeout(() => setTasks((current) => current.filter((task) => task.id !== message.id)), 6000);
            }
            break;
          case "error":
            setError(message.message);
            if (message.fatal) stop(true);
            break;
        }
      };
      ws.onclose = () => {
        if (active.current) {
          setError((current) => current ?? "The voice connection closed.");
          stop(true);
        }
      };
    } catch (caught) {
      active.current = false;
      setState("error");
      setError(caught instanceof Error ? caught.message : "Couldn't start voice mode.");
    }
  }, [send, onSegmentStart, onSegmentEnd, speakBrowser, clearPlayback, startBrowserRecognition, stop]);

  // Keep the server informed about what the learner is looking at.
  const page = useApp((s) => s.page);
  const bookId = useApp((s) => s.activeBookId);
  const documentId = useApp((s) => (s.activeBookId ? s.activeDocumentByBook[s.activeBookId] : undefined));
  useEffect(() => {
    if (state !== "idle") send({ type: "focus", documentId, page });
  }, [page, documentId, bookId, state, send]);

  useEffect(
    () => () => {
      if (active.current) stop();
    },
    [stop],
  );

  return {
    state,
    captions,
    visuals,
    focus,
    tasks,
    error,
    modes,
    muted,
    start,
    stop: () => stop(false),
    interrupt: () => {
      clearPlayback();
      send({ type: "interrupt" });
    },
    sendText: (text: string) => send({ type: "text", text }),
    toggleMute: () => {
      const next = !muted;
      mutedRef.current = next;
      setMuted(next);
      if (mic.current) mic.current.muted = next;
      if (recognition.current) {
        if (next) recognition.current.stop();
        else {
          try {
            recognition.current.start();
          } catch {
            // already running
          }
        }
      }
    },
    /** 0..1 levels for the orb (read inside animation frames, no re-render). */
    levels: () => ({ mic: Math.min(1, micLevel.current * 6), out: Math.min(1, (player.current?.loudness() ?? 0) * 5) }),
    /** Per-band energy of the learner's mic and the tutor's voice (read per frame). */
    bands: () => ({ mic: mic.current?.bands() ?? silentBands(), out: player.current?.bands() ?? silentBands() }),
  };
}

export type VoiceSessionApi = ReturnType<typeof useVoiceSession>;
