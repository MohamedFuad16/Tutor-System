/**
 * One live voice conversation: a "fast talker, slow thinker" duplex loop.
 *
 *   mic ──► STT (turn events) ──► foreground model (fast, streaming, tools)
 *                                   │ phrases ──► SpeechQueue ──► speaker
 *                                   └ delegate ──► background model (smart)
 *                                                    └ result ──► visual on screen
 *                                                               + spoken intro + narrated diagram tour
 *
 * Turn-taking rules
 *  - EagerEndOfTurn starts a speculative reply; its audio is held back until
 *    EndOfTurn confirms the same transcript (TurnResumed cancels it).
 *  - Barge-in is two-stage to survive speaker echo: StartOfTurn while the
 *    tutor talks only ducks the volume; real words (or end of turn) stop
 *    playback and truncate the tutor's message to what was actually heard.
 *  - Background results are woven in when the conversation is idle, never on
 *    top of the learner or the tutor.
 */
import type WebSocket from "ws";
import type { Diagram, MessagePart } from "../../shared/types.js";
import {
  packAudio,
  type ClientVoiceMessage,
  type ServerVoiceMessage,
  type StageCommand,
  type VisualKind,
  type VoiceState,
  type VoiceVisual,
} from "../../shared/voice.js";
import { PhraseChunker, estimateSpeechMs, toSpeakableText } from "../../shared/speech.js";
import { Priority } from "../lib/limiter.js";
import { errorMessage, log } from "../lib/log.js";
import { metrics } from "../lib/metrics.js";
import { LlmError, parseJsonObject, type ChatMessage as LlmMessage, type LlmProvider } from "../providers/llm.js";
import type { SpeechProvider, SttEvent, SttSession } from "../providers/deepgram.js";
import type { Search } from "../providers/search.js";
import { newId } from "../store/db.js";
import type { Store } from "../store/index.js";
import { buildContext, CHAT_BUDGET, VOICE_BUDGET } from "../services/context.js";
import { mermaidNodes } from "../services/learning.js";
import {
  voiceBackgroundPrompt,
  voiceBoardPrompt,
  voiceBuildPrompt,
  voiceForegroundPrompt,
} from "../services/prompts.js";
import { historyMessages } from "../services/tutor.js";
import { ActionTagFilter, actionTag, asVoiceNotes, type DeepMode, type VoiceAction } from "./actions.js";
import { detectImageIntent, detectStageIntent } from "./intent.js";
import { SpeechQueue } from "./speech-queue.js";
import {
  matchStageTarget,
  rankImages,
  sanitizeBoard,
  sanitizeHtml,
  sanitizeScene,
  stageNote,
  stageSource,
} from "./stage.js";

const BRIDGES: Record<string, { delegate: string; images: string; ready: string; missed: string }> = {
  en: {
    delegate: "Let me work that out for you, one moment.",
    images: "Here are some pictures.",
    ready: "Okay, it's ready.",
    missed: "Sorry, could you say that again?",
  },
  ja: {
    delegate: "少し考えてみますね。",
    images: "写真を表示しますね。",
    ready: "準備ができました。",
    missed: "すみません、もう一度言ってもらえますか？",
  },
};

/**
 * Short acknowledgements played when a reply is slow to start (the model's
 * first token can take seconds), so the learner hears the tutor react
 * instead of silence. Pre-synthesized per session language.
 */
const ACKS: Record<string, string[]> = {
  en: ["Mm, let me think.", "Okay.", "Hmm, good one.", "Right.", "Let me see."],
  ja: ["ええと。", "なるほど。", "そうですね。"],
  es: ["Mm, déjame pensar.", "Vale.", "A ver."],
  fr: ["Hmm, voyons.", "D'accord.", "Alors."],
  de: ["Hmm, mal sehen.", "Okay.", "Also."],
};
/** How long a confirmed turn may stay silent before the tutor acknowledges it. */
const ACK_DELAY_MS = 700;

/** Spoken replies to plain screen commands ("close it", "zoom in"), which skip the model. English only. */
const COMMAND_REPLIES: Record<string, string[]> = {
  close: ["Done.", "Okay, cleared.", "Sure, it's gone."],
  zoom_in: ["Zooming in."],
  zoom_out: ["Zooming out."],
  reset: ["Back to the start."],
  rotate: ["Spinning it for you."],
  stop: ["Okay, holding still."],
  next: ["Here's another one."],
  previous: ["Here's the previous one."],
  sideways: ["Turned it sideways."],
  upright: ["Turned it upright."],
  ar: ["Opening your camera. Point it at a clear space."],
};

const TASK_TITLES: Record<DeepMode, string> = {
  diagram: "Drawing a diagram",
  explain: "Working on a detailed answer",
  research: "Looking it up",
  compare: "Comparing",
  board: "Writing on the board",
  build: "Building it",
};

/** Transcripts equal up to case and punctuation ("Close it." vs "close it"). */
const sameWords = (a: string, b: string) => {
  const words = (text: string) => (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).join(" ");
  return words(a) === words(b);
};

type Response = {
  id: string;
  transcript: string;
  speculative: boolean;
  abort: AbortController;
  text: string;
  held: Array<{ text: string }>;
  generationDone: boolean;
  startedAt: number;
  firstAudioAt?: number;
  parts: MessagePart[];
  delegated: string[];
  /** Side effects of a speculative turn wait until the turn is confirmed. */
  deferred: Array<() => void>;
  /** A short acknowledgement was played while the reply was still coming. */
  acked?: boolean;
  /** Side work this turn performed, kept in history as tags (see actionTag). */
  actions: VoiceAction[];
  /** The one photo search this turn shows (the learner's explicit request wins). */
  imageQuery?: string;
  /** A model image tag that lost to the learner's request, tried if that search finds nothing. */
  imageFallback?: string;
};

/** Finished background work, waiting for a quiet moment to be presented. */
type Injection = {
  taskId: string;
  speech: string;
  visual?: VoiceVisual;
  /** Narrated stops: each is spoken while its part (node, board line, 3D object) is highlighted. */
  tour?: { visualId: string; steps: Array<{ node: string; say: string }> };
  /** What the chat thread keeps (the spoken text plus anything worth reading later). */
  content: string;
  parts: MessagePart[];
};

export type VoiceDeps = {
  store: Store;
  llm: LlmProvider;
  search: Search;
  speech: SpeechProvider | null;
  outputSampleRate: number;
  maxSessionMinutes: number;
  onTurnComplete: (userId: string, bookId: string, language: string) => void;
};

export class VoiceSession {
  readonly id = newId("voice");
  private state: VoiceState = "connecting";
  private bookId = "";
  private language = "en";
  private focus: { documentId?: string; page?: number; selection?: string } = {};
  private stt: SttSession | null = null;
  private sttMode: "server" | "browser" = "browser";
  private ttsMode: "server" | "browser" = "browser";
  private queue!: SpeechQueue;
  private history: LlmMessage[] = [];
  private current: Response | null = null;
  private speakingTurn: string | null = null;
  private ducked = false;
  private injections: Injection[] = [];
  private tasks = new Map<string, AbortController>();
  private userSpeaking = false;
  private startedAt = Date.now();
  private closed = false;
  private idleTimer: NodeJS.Timeout | null = null;
  private turnEndTimer: NodeJS.Timeout | null = null;
  private maxTimer: NodeJS.Timeout | null = null;
  private eotAt = 0;
  private lastAck = -1;
  /** What the tutor said recently, to recognise its own voice picked up by the mic. */
  private recentSpeech: Array<{ text: string; at: number }> = [];
  /** What the learner sees right now, and the recent visuals they can go back to. */
  private stage: VoiceVisual | null = null;
  private shown = new Map<string, VoiceVisual>();
  /** Server speech recognition: bumped per connection so a replaced one's events are ignored. */
  private sttGeneration = 0;
  private sttReopens: number[] = [];
  private sttOptions: { sampleRate: number; keyterms: string[] } = { sampleRate: 16_000, keyterms: [] };

  constructor(
    private readonly socket: WebSocket,
    private readonly userId: string,
    private readonly learnerName: string,
    private readonly deps: VoiceDeps,
  ) {
    socket.on("message", (data, isBinary) => {
      if (isBinary) this.onAudio(data as Buffer);
      else this.onMessage(String(data));
    });
    socket.on("close", () => this.close("socket closed"));
    socket.on("error", () => this.close("socket error"));
    this.maxTimer = setTimeout(() => {
      this.send({ type: "error", message: "Voice session time limit reached.", fatal: true });
      this.close("max duration");
    }, deps.maxSessionMinutes * 60_000);
    this.maxTimer.unref?.();
  }

  // ---------------------------------------------------------------- transport

  private send(message: ServerVoiceMessage) {
    if (this.closed || this.socket.readyState !== 1) return;
    this.socket.send(JSON.stringify(message));
  }

  private setState(state: VoiceState) {
    if (this.state === state) return;
    this.state = state;
    this.send({ type: "state", state });
  }

  private onAudio(chunk: Buffer) {
    if (this.sttMode !== "server" || !this.stt) return;
    metrics.increment("voice.audio_bytes_in", chunk.length);
    this.stt.sendAudio(chunk);
  }

  private onMessage(raw: string) {
    let message: ClientVoiceMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    this.bumpIdle();
    switch (message.type) {
      case "hello":
        this.start(message);
        break;
      case "focus":
        this.focus = { documentId: message.documentId, page: message.page, selection: message.selection };
        break;
      case "text":
        if (message.text?.trim())
          this.handleFinalTranscript(message.text.trim().slice(0, 2000), Boolean(message.spoken));
        break;
      case "partial":
        this.onStt({ type: "update", transcript: String(message.text ?? "") });
        break;
      case "speech_start":
        this.onStt({ type: "start_of_turn" });
        break;
      case "interrupt":
        this.bargeIn("button");
        break;
      case "playback":
        this.queue?.notePlayback(Number(message.seq), message.state);
        if (message.state === "start" && this.current && !this.current.firstAudioAt && this.eotAt) {
          this.current.firstAudioAt = Date.now();
          metrics.time("voice.eot_to_first_audio", this.current.firstAudioAt - this.eotAt);
        }
        if (message.state === "end") this.maybeFinishTurn();
        break;
      case "stage":
        // The learner closed the visual or went back to an earlier one.
        this.stage = message.visualId ? (this.shown.get(String(message.visualId)) ?? null) : null;
        break;
      case "bye":
        this.close("client bye");
        break;
    }
  }

  // ---------------------------------------------------------------- lifecycle

  private start(hello: Extract<ClientVoiceMessage, { type: "hello" }>) {
    if (this.bookId) return;
    const book = this.deps.store.library.getBook(this.userId, String(hello.bookId));
    if (!book) {
      this.send({ type: "error", message: "Notebook not found.", fatal: true });
      this.close("unknown book");
      return;
    }
    this.bookId = book.id;
    this.language = (hello.language || "en").slice(0, 2);
    this.focus = hello.focus ?? {};
    const speech = this.deps.speech?.available ? this.deps.speech : null;
    this.sttMode = hello.stt === "server" && speech ? "server" : "browser";
    this.ttsMode = hello.tts === "server" && speech ? "server" : "browser";
    this.queue = new SpeechQueue({
      speech: this.ttsMode === "server" ? speech : null,
      language: this.language,
      sampleRate: this.deps.outputSampleRate,
      sink: {
        announce: (segment) => {
          this.recentSpeech = [
            ...this.recentSpeech.filter((item) => Date.now() - item.at < 20_000),
            { text: segment.text, at: Date.now() },
          ].slice(-6);
          if (!this.speakingTurn) this.speakingTurn = segment.turnId;
          this.setState("speaking");
          this.send({
            type: "segment",
            turnId: segment.turnId,
            seq: segment.seq,
            text: segment.text,
            focus: segment.focus,
          });
        },
        audio: (seq, pcm) => {
          if (!this.closed && this.socket.readyState === 1) this.socket.send(packAudio(seq, pcm));
        },
        segmentEnd: (seq) => {
          this.send({ type: "segment_end", seq });
          this.scheduleTurnEndFallback();
        },
      },
      onError: (message) => this.send({ type: "error", message: `Speech output failed: ${message}`, fatal: false }),
    });

    // Warm upstream connections now so the first turn doesn't pay TLS handshakes,
    // and pre-synthesize the acknowledgements so they play without a TTS round trip.
    this.deps.llm.warm?.();
    if (this.ttsMode === "server") {
      speech?.warm?.();
      void this.queue.warm(ACKS[this.language] ?? []);
    }

    // Seed the conversation with the recent notebook thread so voice continues the chat.
    this.history = historyMessages(this.deps.store.messages.recent(this.userId, this.bookId, 10)).map((message) =>
      message.role === "assistant" ? { ...message, content: asVoiceNotes(String(message.content)) } : message,
    );

    if (this.sttMode === "server" && speech) {
      this.sttOptions = {
        sampleRate: Math.min(48_000, Math.max(8_000, Number(hello.sampleRate) || 16_000)),
        keyterms: this.deps.store.learning
          .conceptsForBook(this.userId, this.bookId)
          .slice(0, 20)
          .map((concept) => concept.name),
      };
      this.openServerStt();
    }
    this.send({
      type: "ready",
      sessionId: this.id,
      stt: this.sttMode,
      tts: this.ttsMode,
      outputSampleRate: this.deps.outputSampleRate,
      models: { fast: this.deps.llm.modelFor("fast"), smart: this.deps.llm.modelFor("smart") },
    });
    this.setState("listening");
    this.bumpIdle();
    log.info("voice.start", { sessionId: this.id, stt: this.sttMode, tts: this.ttsMode, language: this.language });
  }

  close(reason: string) {
    if (this.closed) return;
    this.closed = true;
    this.current?.abort.abort();
    for (const controller of this.tasks.values()) controller.abort();
    this.queue?.cancel();
    this.stt?.close();
    for (const timer of [this.idleTimer, this.turnEndTimer, this.maxTimer]) if (timer) clearTimeout(timer);
    const seconds = Math.round((Date.now() - this.startedAt) / 1000);
    if (this.bookId && seconds > 0) this.deps.store.activity.record(this.userId, "voice_seconds", seconds, this.bookId);
    try {
      this.socket.close(1000, reason.slice(0, 60));
    } catch {
      // already closed
    }
    log.info("voice.end", { sessionId: this.id, reason, seconds });
  }

  private bumpIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.close("idle"), 10 * 60_000);
    this.idleTimer.unref?.();
  }

  // ---------------------------------------------------------------- turn-taking

  private onStt(event: SttEvent) {
    if (this.closed || !this.bookId) return;
    switch (event.type) {
      case "start_of_turn":
        this.userSpeaking = true;
        this.bumpIdle();
        if (this.isTutorBusy()) {
          this.ducked = true;
          this.send({ type: "duck", on: true });
        }
        break;
      case "update":
        this.send({ type: "user_partial", text: event.transcript });
        // Two real words while the tutor talks = genuine interruption — unless it is the tutor's own voice.
        if (
          this.isTutorBusy() &&
          event.transcript.split(/\s+/).filter(Boolean).length >= 2 &&
          !this.isEcho(event.transcript)
        ) {
          this.bargeIn("speech");
        }
        break;
      case "eager_end_of_turn":
        // The tutor hearing its own voice is not a turn.
        if (this.isTutorBusy() && this.isEcho(event.transcript)) break;
        if (this.current?.speculative && sameWords(this.current.transcript, event.transcript)) break;
        if (this.current?.speculative) this.cancelResponse();
        if (this.isTutorBusy()) this.bargeIn("speech");
        this.startResponse(event.transcript, true);
        break;
      case "turn_resumed":
        if (this.current?.speculative) this.cancelResponse();
        break;
      case "end_of_turn":
        this.userSpeaking = false;
        this.handleFinalTranscript(event.transcript, true);
        break;
      case "error":
        if (event.fatal) this.recoverStt(event.message);
        else this.send({ type: "error", message: event.message, fatal: false });
        break;
      case "closed":
        // The recognition connection dropped (network blip, provider timeout): without
        // a new one the tutor would silently stop hearing the learner.
        this.recoverStt("connection closed");
        break;
    }
  }

  private openServerStt() {
    const speech = this.deps.speech?.available ? this.deps.speech : null;
    if (!speech || this.closed) return;
    const generation = ++this.sttGeneration;
    this.stt = speech.openStt({
      language: this.language,
      sampleRate: this.sttOptions.sampleRate,
      keyterms: this.sttOptions.keyterms,
      onEvent: (event) => {
        if (generation === this.sttGeneration) this.onStt(event);
      },
    });
  }

  /** Reconnects server speech recognition; after repeated failures, falls back to the browser's. */
  private recoverStt(reason: string) {
    if (this.closed || this.sttMode !== "server") return;
    const now = Date.now();
    this.sttReopens = this.sttReopens.filter((at) => now - at < 120_000);
    this.sttGeneration += 1; // ignore anything more from the broken connection
    this.stt?.close();
    this.stt = null;
    this.userSpeaking = false;
    if (this.sttReopens.length < 4 && this.deps.speech?.available) {
      this.sttReopens.push(now);
      metrics.increment("voice.stt_reconnect");
      log.warn("voice.stt_reconnect", { sessionId: this.id, reason, attempt: this.sttReopens.length });
      const retry = setTimeout(() => this.openServerStt(), (this.sttReopens.length - 1) * 500);
      retry.unref?.();
      return;
    }
    log.warn("voice.stt_fallback", { sessionId: this.id, reason });
    this.send({ type: "error", message: reason, fatal: false });
    this.sttMode = "browser";
    this.send({
      type: "ready",
      sessionId: this.id,
      stt: "browser",
      tts: this.ttsMode,
      outputSampleRate: this.deps.outputSampleRate,
      models: { fast: this.deps.llm.modelFor("fast"), smart: this.deps.llm.modelFor("smart") },
    });
  }

  private isTutorBusy() {
    return Boolean(this.speakingTurn) || Boolean(this.current && !this.current.speculative);
  }

  /**
   * True when a transcript is mostly words the tutor just said: its own
   * voice leaking from the speakers into the microphone.
   */
  private isEcho(transcript: string) {
    const words = transcript.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
    if (words.length < 2 || !this.recentSpeech.length) return false;
    const spoken = new Set(
      this.recentSpeech
        .filter((item) => Date.now() - item.at < 20_000)
        .flatMap((item) => item.text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []),
    );
    const overlap = words.filter((word) => spoken.has(word)).length / words.length;
    return overlap >= 0.8;
  }

  private handleFinalTranscript(transcript: string, spoken = false) {
    if (spoken && this.isTutorBusy() && this.isEcho(transcript)) {
      // Ignore the tutor hearing itself; restore volume and keep talking.
      metrics.increment("voice.echo_ignored");
      if (this.ducked) {
        this.ducked = false;
        this.send({ type: "duck", on: false });
      }
      return;
    }
    this.userSpeaking = false;
    this.eotAt = Date.now();
    if (this.ducked) {
      this.ducked = false;
      this.send({ type: "duck", on: false });
    }
    if (this.isTutorBusy()) this.bargeIn("speech");
    const turnId = newId("turn");
    this.send({ type: "user_final", turnId, text: transcript });
    this.deps.store.messages.add({
      userId: this.userId,
      bookId: this.bookId,
      role: "user",
      channel: "voice",
      content: transcript,
    });
    this.deps.store.activity.record(this.userId, "chat", 1, this.bookId);

    if (this.current?.speculative && sameWords(this.current.transcript, transcript)) {
      // Speculation confirmed: release the audio we have been holding back.
      this.current.speculative = false;
      metrics.increment("voice.speculation_hit");
      this.setState(this.current.held.length || this.current.text ? "speaking" : "thinking");
      for (const phrase of this.current.held.splice(0)) this.queue.enqueue(this.current.id, phrase.text);
      for (const effect of this.current.deferred.splice(0)) effect();
      if (this.current.generationDone) this.maybeFinishTurn();
      else this.scheduleAck(this.current);
      return;
    }
    if (this.current?.speculative) {
      metrics.increment("voice.speculation_miss");
      this.cancelResponse();
    }
    this.startResponse(transcript, false);
    if (this.current) this.scheduleAck(this.current);
  }

  /** If the confirmed reply hasn't started speaking soon, acknowledge the learner first. */
  private scheduleAck(response: Response) {
    const acks = ACKS[this.language];
    if (!acks?.length) return;
    const timer = setTimeout(() => {
      if (this.closed || this.current !== response || response.speculative || response.abort.signal.aborted) return;
      if (response.text.trim() || this.queue.lastSeqOf(response.id)) return;
      this.lastAck = (this.lastAck + 1 + Math.floor(Math.random() * (acks.length - 1))) % acks.length;
      response.acked = true;
      metrics.increment("voice.ack");
      this.queue.enqueue(response.id, acks[this.lastAck]);
    }, ACK_DELAY_MS);
    timer.unref?.();
  }

  /** Stops the tutor: cancels generation and audio, keeps only what the learner heard. */
  private bargeIn(source: "speech" | "button") {
    const response = this.current;
    const turnId = this.speakingTurn ?? response?.id;
    if (!turnId && !response) return;
    this.queue.cancel();
    this.send({ type: "clear" });
    if (this.ducked) {
      this.ducked = false;
      this.send({ type: "duck", on: false });
    }
    if (response && !response.speculative) {
      response.abort.abort();
      const heard = this.queue.heardText(response.id);
      this.commitAssistant(response, heard ? `${heard}…` : "", true);
      this.current = null;
    } else if (turnId) {
      const heard = this.queue.heardText(turnId);
      if (heard) this.history.push({ role: "assistant", content: `${heard}…` });
    }
    this.speakingTurn = null;
    this.setState("listening");
    metrics.increment(`voice.barge_in.${source}`);
  }

  private cancelResponse() {
    if (!this.current) return;
    this.current.abort.abort();
    this.current = null;
  }

  // ---------------------------------------------------------------- foreground

  private startResponse(transcript: string, speculative: boolean) {
    const response: Response = {
      id: newId("turn"),
      transcript,
      speculative,
      abort: new AbortController(),
      text: "",
      held: [],
      generationDone: false,
      startedAt: Date.now(),
      parts: [],
      delegated: [],
      deferred: [],
      actions: [],
    };
    this.current = response;
    if (!speculative) this.setState("thinking");
    void this.generate(response).catch((error) => {
      if (response.abort.signal.aborted) return;
      const message = error instanceof LlmError ? error.userMessage : "I had trouble answering that.";
      log.warn("voice.generate_failed", { error: errorMessage(error) });
      this.send({ type: "error", message, fatal: false });
      if (this.current === response) {
        this.current = null;
        this.setState("listening");
      }
    });
  }

  private speak(response: Response, phrase: string) {
    if (!phrase) return;
    if (response.speculative) response.held.push({ text: phrase });
    else this.queue.enqueue(response.id, phrase);
  }

  /** Runs now for a confirmed turn, or once a speculative turn is confirmed. */
  private whenConfirmed(response: Response, effect: () => void) {
    if (response.speculative) response.deferred.push(effect);
    else effect();
  }

  private async generate(response: Response) {
    const pending: Array<Promise<void>> = [];
    // "Close it", "zoom in", "highlight the database step": act on the screen right away.
    const command = detectStageIntent(response.transcript, this.stage);
    const done: string[] = [];
    for (const action of command?.actions ?? []) {
      if (action.kind !== "close" && action.kind !== "focus" && action.kind !== "view") continue;
      const note = this.stageAction(response, action);
      if (note) done.push(note);
    }
    const replies = command?.pure && this.language === "en" ? this.commandReplies(command.actions) : null;
    if (replies) {
      // A plain command needs no model: acknowledge it and listen again.
      const line = replies[Math.floor(Math.random() * replies.length)];
      response.text = line;
      this.speak(response, line);
      response.generationDone = true;
      if (!response.speculative) this.maybeFinishTurn();
      return;
    }

    const context = buildContext(this.deps.store, {
      userId: this.userId,
      bookId: this.bookId,
      query: response.transcript,
      focus: this.focus,
      budget: VOICE_BUDGET,
    });
    const messages: LlmMessage[] = [
      {
        role: "system",
        content: voiceForegroundPrompt({
          learnerName: this.learnerName,
          language: this.language,
          context,
          stage: stageNote(this.stage),
        }),
      },
      ...this.history.slice(-16),
      {
        role: "user",
        content: done.length
          ? `${response.transcript}\n(Already done on screen: ${done.join("; ")}.)`
          : response.transcript,
      },
    ];
    const chunker = new PhraseChunker({ firstMinChars: 12, minChars: 50 });
    const tags = new ActionTagFilter();
    // "Pull up Tokyo" / "yes please" (to an offer): search now, in parallel with
    // the model, so a photo appears fast even if the model forgets its tag.
    // Pointing at something already on screen is not a photo request.
    const intent = command?.actions.some((action) => action.kind === "focus")
      ? null
      : detectImageIntent(response.transcript, this.lastAssistantText());
    if (intent) pending.push(this.showImages(response, intent, "intent"));
    const onText = (text: string) => {
      if (!text) return;
      response.text += text;
      for (const phrase of chunker.push(text)) this.speak(response, phrase);
    };
    // No tool declarations here: they add seconds of time-to-first-token on
    // GLM. The model requests side work with silent inline tags instead.
    for await (const event of this.deps.llm.stream({
      role: "fast",
      purpose: "voice.fg",
      userId: this.userId,
      priority: Priority.realtime,
      reasoning: "off",
      temperature: 0.6,
      maxTokens: 400,
      messages,
      signal: response.abort.signal,
    })) {
      if (response.abort.signal.aborted) return;
      if (event.type !== "text") continue;
      const out = tags.push(event.delta);
      onText(out.text);
      for (const action of out.actions) pending.push(this.runAction(response, action));
    }
    onText(tags.flush());
    for (const phrase of chunker.flush()) this.speak(response, phrase);
    await Promise.all(pending);
    if (response.abort.signal.aborted) return;

    // Every turn says something, even when the model only asked for side work.
    if (!response.text.trim()) {
      const bridge = BRIDGES[this.language] ?? BRIDGES.en;
      const line = response.delegated.length
        ? bridge.delegate
        : response.parts.some((part) => part.type === "images")
          ? bridge.images
          : bridge.missed;
      response.text = line;
      this.speak(response, line);
    }
    response.generationDone = true;
    if (!response.speculative) this.maybeFinishTurn();
  }

  /** Side work requested by a voice action tag (see ./actions.ts). */
  private async runAction(response: Response, action: VoiceAction) {
    if (action.kind === "deep") {
      // One piece of deep work per reply: a second tag would only race the first.
      if (response.delegated.length) return;
      response.delegated.push(action.task);
      response.actions.push(action);
      this.whenConfirmed(response, () => this.startBackgroundTask(action.task, action.mode));
      return;
    }
    if (action.kind === "images") {
      await this.showImages(response, action.query, "tag");
      return;
    }
    // The server already acted on an explicit command this turn; the model's matching tag is a repeat.
    if (response.actions.some((done) => done.kind === action.kind)) return;
    this.stageAction(response, action);
  }

  /** Close, point or move the view. Returns a short note of what was done, or null if nothing applied. */
  private stageAction(response: Response, action: Extract<VoiceAction, { kind: "close" | "focus" | "view" }>) {
    const visual = this.stage;
    if (!visual) return null;
    let command: StageCommand;
    let note: string;
    if (action.kind === "close") {
      command = { kind: "close" };
      note = "cleared the screen";
    } else if (action.kind === "view") {
      command = { kind: "view", visualId: visual.id, view: action.view };
      note = `view ${action.view.replace("_", " ")}`;
    } else {
      const target = matchStageTarget(visual, action.target);
      if (!target) return null;
      command = { kind: "focus", visualId: visual.id, target };
      note = `highlighted ${target}`;
    }
    response.actions.push(command.kind === "focus" ? { kind: "focus", target: command.target } : action);
    this.whenConfirmed(response, () => {
      if (command.kind === "close") this.stage = null;
      this.send({ type: "stage", command });
    });
    metrics.increment(`voice.stage.${action.kind}`);
    return note;
  }

  private commandReplies(actions: VoiceAction[]) {
    const action = actions[0];
    if (!action || actions.length > 1) return null;
    if (action.kind === "close") return COMMAND_REPLIES.close;
    if (action.kind === "view") return COMMAND_REPLIES[action.view] ?? null;
    return null;
  }

  /** Puts a visual on screen and remembers it as what the learner is looking at. */
  private showVisual(visual: VoiceVisual) {
    this.stage = visual;
    this.shown.set(visual.id, visual);
    for (const key of [...this.shown.keys()].slice(0, -8)) this.shown.delete(key);
    this.send({ type: "visual", visual });
  }

  /** Shows one photo per turn (best result first); the learner's explicit request wins over the model's tag. */
  private async showImages(response: Response, query: string, source: "intent" | "tag") {
    if (response.imageQuery) {
      if (source === "tag") response.imageFallback ??= query;
      return;
    }
    response.imageQuery = query;
    const id = newId("vis");
    this.whenConfirmed(response, () =>
      this.send({ type: "stage", command: { kind: "pending", id, visual: "images", title: query } }),
    );
    const found = await this.deps.search.images(query, 8).catch(() => []);
    if (response.abort.signal.aborted) return;
    if (!found.length) {
      this.whenConfirmed(response, () => this.send({ type: "stage", command: { kind: "settled", id } }));
      response.imageQuery = undefined;
      const fallback = response.imageFallback;
      response.imageFallback = undefined;
      if (fallback && fallback !== query) await this.showImages(response, fallback, "tag");
      return;
    }
    const images = rankImages(found, query).slice(0, 6);
    const visual: VoiceVisual = { id, kind: "images", query, images };
    this.whenConfirmed(response, () => this.showVisual(visual));
    response.parts.push({ type: "images", query, images });
    response.actions.push({ kind: "images", query });
    metrics.increment(`voice.images.${source}`);
  }

  /** The tutor's previous turn, to resolve "yes please" against what it offered. */
  private lastAssistantText() {
    for (let index = this.history.length - 1; index >= 0; index--) {
      const message = this.history[index];
      if (message.role === "assistant") return typeof message.content === "string" ? message.content : "";
    }
    return undefined;
  }

  /** A turn ends when generation is done and the client finished playing its last segment. */
  private maybeFinishTurn() {
    const response = this.current;
    if (response && !response.speculative && response.generationDone) {
      const last = this.queue.lastSeqOf(response.id);
      const delivered = this.queue.isDelivered(response.id);
      if (last === 0 || (delivered && this.queue.hasPlaybackEnded(last))) {
        this.commitAssistant(response, response.text.trim(), false);
        this.current = null;
        this.finishSpeaking(response.id);
      }
      return;
    }
    if (!response && this.speakingTurn) {
      const last = this.queue.lastSeqOf(this.speakingTurn);
      if (this.queue.isDelivered(this.speakingTurn) && (last === 0 || this.queue.hasPlaybackEnded(last))) {
        this.finishSpeaking(this.speakingTurn);
      }
    }
  }

  private finishSpeaking(turnId: string) {
    if (this.turnEndTimer) clearTimeout(this.turnEndTimer);
    this.speakingTurn = null;
    this.send({ type: "turn_end", turnId, interrupted: false });
    this.setState("listening");
    // Something finished in the background while we were talking: present it now.
    setTimeout(() => this.deliverInjections(), 350);
  }

  /** Clients that never report playback (or lost audio) must not freeze the session. */
  private scheduleTurnEndFallback() {
    if (this.turnEndTimer) clearTimeout(this.turnEndTimer);
    const turnId = this.current?.id ?? this.speakingTurn;
    if (!turnId) return;
    const remaining = estimateSpeechMs(this.queue.turnText(turnId)) + 4000;
    this.turnEndTimer = setTimeout(
      () => {
        const last = this.queue.lastSeqOf(turnId);
        if (last) this.queue.notePlayback(last, "end");
        this.maybeFinishTurn();
      },
      Math.min(30_000, remaining),
    );
    this.turnEndTimer.unref?.();
  }

  private commitAssistant(response: Response, content: string, interrupted: boolean) {
    // History keeps the tags this turn used, so the model sees itself showing photos
    // and delegating (and keeps doing it). Double brackets are never spoken.
    this.history.push({ role: "user", content: response.transcript });
    this.history.push({
      role: "assistant",
      content: [content || "(interrupted)", ...response.actions.map(actionTag)].join(" "),
    });
    if (!content && !response.parts.length) return;
    this.deps.store.messages.add({
      userId: this.userId,
      bookId: this.bookId,
      role: "assistant",
      channel: "voice",
      content: content || "…",
      parts: response.parts,
      model: this.deps.llm.modelFor("fast"),
      latencyMs: response.firstAudioAt ? response.firstAudioAt - response.startedAt : undefined,
      interrupted,
    });
    this.deps.onTurnComplete(this.userId, this.bookId, this.language);
  }

  // ---------------------------------------------------------------- background

  private startBackgroundTask(task: string, mode: DeepMode) {
    const id = newId("task");
    // The visual's id is fixed now, so the placeholder on screen turns into the result.
    const visualId = newId("vis");
    const controller = new AbortController();
    this.tasks.set(id, controller);
    const title = TASK_TITLES[mode] ?? TASK_TITLES.explain;
    const placeholder: VisualKind | "build" =
      mode === "board" ? "board" : mode === "build" ? "build" : mode === "diagram" ? "diagram" : "markdown";
    this.send({ type: "task", id, title, status: "running" });
    this.send({
      type: "stage",
      command: { kind: "pending", id: visualId, visual: placeholder, title: task.slice(0, 120) },
    });
    void (async () => {
      try {
        const injection = await this.runBackground(id, visualId, task, mode, controller.signal);
        if (controller.signal.aborted) return;
        const summary = injection.visual && "title" in injection.visual ? injection.visual.title : undefined;
        this.send({ type: "task", id, title, status: "done", summary });
        if (!injection.visual) this.send({ type: "stage", command: { kind: "settled", id: visualId } });
        this.injections.push(injection);
        this.deliverInjections();
      } catch (error) {
        if (controller.signal.aborted) return;
        log.warn("voice.background_failed", { mode, error: errorMessage(error) });
        this.send({ type: "stage", command: { kind: "settled", id: visualId } });
        this.send({
          type: "task",
          id,
          title,
          status: "failed",
          summary: error instanceof LlmError ? error.userMessage : "Background task failed",
        });
      } finally {
        this.tasks.delete(id);
      }
    })();
  }

  private async runBackground(
    taskId: string,
    visualId: string,
    task: string,
    mode: DeepMode,
    signal: AbortSignal,
  ): Promise<Injection> {
    const context = buildContext(this.deps.store, {
      userId: this.userId,
      bookId: this.bookId,
      query: task,
      focus: this.focus,
      budget: CHAT_BUDGET,
    });
    // Edits ("make the sun bigger") need what is on screen now, when it is the same kind of thing.
    const current = this.stage;
    const editable =
      current &&
      ((mode === "board" && current.kind === "board") ||
        (mode === "build" && (current.kind === "scene" || current.kind === "web")) ||
        (mode === "diagram" && current.kind === "diagram"))
        ? stageSource(current)
        : "";
    const stage = [`On the learner's screen now: ${stageNote(current)}`, editable].filter(Boolean).join("\n\n");
    if (mode === "board") return this.runBoard(taskId, visualId, task, context, stage, signal);
    if (mode === "build") return this.runBuild(taskId, visualId, task, context, stage, signal);

    let webNotes = "";
    if (mode === "research" || /\b(latest|current|news|look up|search)\b/i.test(task)) {
      const results = await this.deps.search.web(task, 5, this.language).catch(() => []);
      if (results.length) {
        webNotes = `\n\nWeb results:\n${results.map((r, i) => `[W${i + 1}] ${r.title}: ${r.snippet ?? ""}`).join("\n")}`;
        // Read the top pages too: snippets alone are too thin for a real answer.
        const pages = await Promise.all(
          results.slice(0, 2).map((result) => this.deps.search.readPage(result.url).catch(() => null)),
        );
        for (const [index, page] of pages.entries()) {
          if (page?.text) webNotes += `\n\n[W${index + 1}] full text (${page.domain}):\n${page.text.slice(0, 5000)}`;
        }
      }
    }
    const completion = await this.deps.llm.complete({
      role: "smart",
      purpose: "voice.bg",
      userId: this.userId,
      priority: Priority.background,
      reasoning: "low",
      temperature: 0.4,
      maxTokens: 5000,
      json: true,
      signal,
      messages: [
        { role: "system", content: voiceBackgroundPrompt({ language: this.language, context, stage }) },
        ...this.history.slice(-8),
        { role: "user", content: `Task (${mode}): ${task}${webNotes}` },
      ],
    });
    const result = parseJsonObject<{
      speech?: string;
      display?: string;
      diagram?: { title?: string; mermaid?: string; steps?: Array<{ node?: string; say?: string }> } | null;
      image_query?: string | null;
    }>(completion.text);
    if (!result) throw new Error("Background result was not JSON");

    const parts: MessagePart[] = [];
    let diagram: Diagram | undefined;
    let visual: VoiceVisual | undefined;
    if (result.diagram?.mermaid) {
      const valid = new Set(mermaidNodes(result.diagram.mermaid).map((node) => node.id));
      diagram = {
        id: visualId,
        title: String(result.diagram.title ?? "Diagram").slice(0, 120),
        mermaid: String(result.diagram.mermaid).slice(0, 4000),
        steps: (result.diagram.steps ?? [])
          .map((step) => ({
            node: String(step.node ?? "").trim(),
            say: toSpeakableText(String(step.say ?? "")).slice(0, 400),
          }))
          .filter((step) => step.say && (!valid.size || valid.has(step.node)))
          .slice(0, 12),
      };
      visual = { id: visualId, kind: "diagram", diagram };
      parts.push({ type: "diagram", diagram });
    }
    if (result.image_query) {
      const found = await this.deps.search.images(String(result.image_query), 8).catch(() => []);
      if (found.length) {
        const images = rankImages(found, String(result.image_query)).slice(0, 6);
        const query = String(result.image_query);
        if (!visual) visual = { id: visualId, kind: "images", query, images };
        else this.showVisual({ id: newId("vis"), kind: "images", query, images });
        parts.push({ type: "images", query, images });
      }
    }
    if (result.display?.trim() && !visual) {
      visual = { id: visualId, kind: "markdown", title: task.slice(0, 80), markdown: result.display.slice(0, 6000) };
    }
    const speech = toSpeakableText(result.speech ?? "") || (BRIDGES[this.language] ?? BRIDGES.en).ready;
    const tourSteps = diagram?.steps ?? [];
    return {
      taskId,
      speech,
      visual,
      tour: diagram && tourSteps.length ? { visualId, steps: tourSteps } : undefined,
      content:
        visual?.kind === "markdown"
          ? `${speech}\n\n${visual.markdown}`
          : [speech, ...tourSteps.map((step) => step.say)].join(" "),
      parts,
    };
  }

  /** Magic pen: working written line by line, each line narrated as it appears. */
  private async runBoard(
    taskId: string,
    visualId: string,
    task: string,
    context: ReturnType<typeof buildContext>,
    stage: string,
    signal: AbortSignal,
  ): Promise<Injection> {
    const completion = await this.deps.llm.complete({
      role: "smart",
      purpose: "voice.board",
      userId: this.userId,
      priority: Priority.background,
      reasoning: "low",
      temperature: 0.3,
      maxTokens: 5000,
      json: true,
      signal,
      messages: [
        { role: "system", content: voiceBoardPrompt({ language: this.language, context, stage }) },
        ...this.history.slice(-6),
        { role: "user", content: `Board task: ${task}` },
      ],
    });
    const board = sanitizeBoard(parseJsonObject(completion.text));
    if (!board) throw new Error("The board came back empty");
    const steps = board.steps
      .map((step) => ({ node: step.node, say: toSpeakableText(step.say) }))
      .filter((step) => step.say);
    const speech = toSpeakableText(board.speech) || "Okay, let's work through it on the board.";
    const written = board.value.items
      .map((item) =>
        item.kind === "math"
          ? `$$${item.latex}$$`
          : item.kind === "text"
            ? item.text
            : `(graph of ${item.plot?.fns.join(", ")})`,
      )
      .join("\n\n");
    return {
      taskId,
      speech,
      visual: { id: visualId, kind: "board", board: board.value },
      tour: steps.length ? { visualId, steps } : undefined,
      content: `${speech}\n\n**${board.value.title}**\n\n${written}`,
      parts: [],
    };
  }

  /** Builds a 3D scene or a web page (or edits the one on screen). */
  private async runBuild(
    taskId: string,
    visualId: string,
    task: string,
    context: ReturnType<typeof buildContext>,
    stage: string,
    signal: AbortSignal,
  ): Promise<Injection> {
    const completion = await this.deps.llm.complete({
      role: "smart",
      purpose: "voice.build",
      userId: this.userId,
      priority: Priority.background,
      reasoning: "low",
      temperature: 0.5,
      maxTokens: 16_000,
      json: true,
      signal,
      messages: [
        { role: "system", content: voiceBuildPrompt({ language: this.language, context, stage }) },
        ...this.history.slice(-6),
        { role: "user", content: `Build task: ${task}` },
      ],
    });
    const result = parseJsonObject<{ type?: string; title?: string; speech?: string; html?: string }>(completion.text);
    const looksLikePage = /<!doctype html|<html[\s>]/i.test(completion.text);
    if (result?.type === "web" || (!result && looksLikePage)) {
      // A page is sometimes returned raw (or with broken JSON escaping): take the document itself.
      const raw = result?.html ?? /<!doctype html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i.exec(completion.text)?.[0];
      const html = sanitizeHtml(raw);
      if (!html) throw new Error("The web page came back empty");
      const title = String(result?.title ?? /<title>([^<]{1,120})<\/title>/i.exec(html)?.[1] ?? "Web page").slice(
        0,
        120,
      );
      const speech = toSpeakableText(result?.speech ?? "") || "Here it is. It's live, so try clicking around.";
      return {
        taskId,
        speech,
        visual: { id: visualId, kind: "web", title, html },
        content: `${speech}\n\n(Built a web page: ${title})`,
        parts: [],
      };
    }
    const scene = sanitizeScene(result);
    if (!scene) throw new Error("The model came back empty");
    const steps = scene.steps
      .map((step) => ({ node: step.node, say: toSpeakableText(step.say) }))
      .filter((step) => step.say);
    const speech = toSpeakableText(scene.speech) || "Here it is. You can spin it around and tap any part.";
    return {
      taskId,
      speech,
      visual: { id: visualId, kind: "scene", scene: scene.value },
      tour: steps.length ? { visualId, steps } : undefined,
      content: `${[speech, ...steps.map((step) => step.say)].join(" ")}\n\n(Built a 3D model: ${scene.value.title})`,
      parts: [],
    };
  }

  /** Presents finished background work when nobody is talking. */
  private deliverInjections() {
    if (this.closed || !this.injections.length) return;
    if (this.userSpeaking || this.current || this.speakingTurn) return;
    const injection = this.injections.shift()!;
    const turnId = newId("turn");
    this.speakingTurn = turnId;
    if (injection.visual) this.showVisual(injection.visual);
    const chunker = new PhraseChunker({ firstMinChars: 12, minChars: 50 });
    const phrases = [...chunker.push(injection.speech), ...chunker.flush()];
    for (const phrase of phrases) this.queue.enqueue(turnId, phrase);
    // Narrated tour: each stop is its own segment, highlighting its part while spoken.
    const tour = injection.tour;
    for (const step of tour?.steps ?? [])
      this.queue.enqueue(turnId, step.say, { visualId: tour!.visualId, node: step.node });
    const spoken = [injection.speech, ...(tour?.steps ?? []).map((step) => step.say)].join(" ");
    const visual = injection.visual;
    const label =
      visual?.kind === "diagram"
        ? `diagram "${visual.diagram.title}"`
        : visual?.kind === "board"
          ? `board "${visual.board.title}"`
          : visual?.kind === "scene"
            ? `3D model "${visual.scene.title}"`
            : visual?.kind === "web"
              ? `web page "${visual.title}"`
              : visual?.kind === "images"
                ? `photo "${visual.query}"`
                : visual
                  ? `notes "${visual.title}"`
                  : "";
    this.history.push({ role: "assistant", content: `${spoken}${label ? ` [[shown on screen: ${label}]]` : ""}` });
    this.deps.store.messages.add({
      userId: this.userId,
      bookId: this.bookId,
      role: "assistant",
      channel: "voice",
      content: injection.content,
      parts: injection.parts,
      model: this.deps.llm.modelFor("smart"),
    });
    this.deps.onTurnComplete(this.userId, this.bookId, this.language);
    if (!phrases.length && !tour?.steps.length) this.finishSpeaking(turnId);
  }
}
