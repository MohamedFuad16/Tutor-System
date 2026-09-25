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
  type VoiceState,
  type VoiceVisual,
} from "../../shared/voice.js";
import { PhraseChunker, estimateSpeechMs, toSpeakableText } from "../../shared/speech.js";
import { Priority } from "../lib/limiter.js";
import { errorMessage, log } from "../lib/log.js";
import { metrics } from "../lib/metrics.js";
import {
  LlmError,
  parseJsonObject,
  type ChatMessage as LlmMessage,
  type LlmProvider,
  type ToolDefinition,
} from "../providers/llm.js";
import type { SpeechProvider, SttEvent, SttSession } from "../providers/deepgram.js";
import type { Search } from "../providers/search.js";
import { newId } from "../store/db.js";
import type { Store } from "../store/index.js";
import { buildContext, CHAT_BUDGET, VOICE_BUDGET } from "../services/context.js";
import { mermaidNodes } from "../services/learning.js";
import { voiceBackgroundPrompt, voiceForegroundPrompt } from "../services/prompts.js";
import { historyMessages } from "../services/tutor.js";
import { SpeechQueue } from "./speech-queue.js";

const FOREGROUND_TOOLS: ToolDefinition[] = [
  {
    name: "delegate",
    description:
      "Hand a task to your background specialist (it has more time and a stronger model). Use for: diagrams/flowcharts of a process, detailed or multi-step explanations, web lookups, comparing sections, careful reasoning. The result shows on screen and is narrated when ready.",
    parameters: {
      type: "object",
      properties: {
        task: { type: "string", description: "Self-contained description of what to produce, including the topic." },
        kind: { type: "string", enum: ["diagram", "explain", "research", "compare"] },
      },
      required: ["task", "kind"],
    },
  },
  {
    name: "show_images",
    description:
      "Show real photos of something concrete (organisms, places, devices, artworks) on the learner's screen right away.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
];

const BRIDGES: Record<string, { delegate: string; images: string; ready: string }> = {
  en: {
    delegate: "Let me work that out for you, one moment.",
    images: "Here are some pictures.",
    ready: "Okay, it's ready.",
  },
  ja: { delegate: "少し考えてみますね。", images: "写真を表示しますね。", ready: "準備ができました。" },
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
};

type Injection = { taskId: string; speech: string; visual?: VoiceVisual; diagram?: Diagram; parts: MessagePart[] };

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
  /** What the tutor said recently, to recognise its own voice picked up by the mic. */
  private recentSpeech: Array<{ text: string; at: number }> = [];

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

    // Seed the conversation with the recent notebook thread so voice continues the chat.
    this.history = historyMessages(this.deps.store.messages.recent(this.userId, this.bookId, 10));

    if (this.sttMode === "server" && speech) {
      const keyterms = this.deps.store.learning
        .conceptsForBook(this.userId, this.bookId)
        .slice(0, 20)
        .map((concept) => concept.name);
      this.stt = speech.openStt({
        language: this.language,
        sampleRate: Math.min(48_000, Math.max(8_000, Number(hello.sampleRate) || 16_000)),
        onEvent: (event) => this.onStt(event),
        keyterms,
      });
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
        if (this.current?.speculative && this.current.transcript === event.transcript) break;
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
        this.send({ type: "error", message: event.message, fatal: false });
        if (event.fatal) {
          // Fall back to browser recognition rather than killing the session.
          this.stt?.close();
          this.stt = null;
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
        break;
      case "closed":
        break;
    }
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

    if (this.current?.speculative && this.current.transcript.trim() === transcript.trim()) {
      // Speculation confirmed: release the audio we have been holding back.
      this.current.speculative = false;
      metrics.increment("voice.speculation_hit");
      this.setState(this.current.held.length || this.current.text ? "speaking" : "thinking");
      for (const phrase of this.current.held.splice(0)) this.queue.enqueue(this.current.id, phrase.text);
      for (const effect of this.current.deferred.splice(0)) effect();
      if (this.current.generationDone) this.maybeFinishTurn();
      return;
    }
    if (this.current?.speculative) {
      metrics.increment("voice.speculation_miss");
      this.cancelResponse();
    }
    this.startResponse(transcript, false);
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
        content: voiceForegroundPrompt({ learnerName: this.learnerName, language: this.language, context }),
      },
      ...this.history.slice(-16),
      { role: "user", content: response.transcript },
    ];
    const chunker = new PhraseChunker({ firstMinChars: 12, minChars: 50 });
    const toolCalls: Array<{ name: string; arguments: string }> = [];
    for await (const event of this.deps.llm.stream({
      role: "fast",
      purpose: "voice.fg",
      userId: this.userId,
      priority: Priority.realtime,
      reasoning: "off",
      temperature: 0.6,
      maxTokens: 400,
      messages,
      tools: FOREGROUND_TOOLS,
      signal: response.abort.signal,
    })) {
      if (response.abort.signal.aborted) return;
      if (event.type === "text") {
        response.text += event.delta;
        for (const phrase of chunker.push(event.delta)) this.speak(response, phrase);
      } else if (event.type === "tool_call") {
        toolCalls.push(event.call);
      }
    }
    for (const phrase of chunker.flush()) this.speak(response, phrase);
    if (response.abort.signal.aborted) return;

    const bridge = BRIDGES[this.language] ?? BRIDGES.en;
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch {
        args = {};
      }
      if (call.name === "delegate") {
        const task = String(args.task ?? response.transcript).slice(0, 1200);
        if (!response.text.trim()) {
          response.text = bridge.delegate;
          this.speak(response, bridge.delegate);
        }
        response.delegated.push(task);
        const kind = String(args.kind ?? "explain");
        this.whenConfirmed(response, () => this.startBackgroundTask(task, kind));
      } else if (call.name === "show_images") {
        const query = String(args.query ?? "").slice(0, 200);
        const images = await this.deps.search.images(query, 6).catch(() => []);
        if (images.length) {
          const visual: VoiceVisual = { id: newId("vis"), kind: "images", query, images };
          this.whenConfirmed(response, () => this.send({ type: "visual", visual }));
          response.parts.push({ type: "images", query, images });
          if (!response.text.trim()) {
            response.text = bridge.images;
            this.speak(response, bridge.images);
          }
        }
      }
    }
    response.generationDone = true;
    if (!response.speculative) this.maybeFinishTurn();
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
    const notes = response.delegated.map((task) => `[started background task: ${task.slice(0, 120)}]`);
    this.history.push({ role: "user", content: response.transcript });
    this.history.push({ role: "assistant", content: [content || "(interrupted)", ...notes].join("\n") });
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

  private startBackgroundTask(task: string, kind: string) {
    const id = newId("task");
    const controller = new AbortController();
    this.tasks.set(id, controller);
    const title =
      kind === "diagram" ? "Drawing a diagram" : kind === "research" ? "Looking it up" : "Working on a detailed answer";
    this.send({ type: "task", id, title, status: "running" });
    void (async () => {
      try {
        const injection = await this.runBackground(id, task, kind, controller.signal);
        if (controller.signal.aborted) return;
        this.send({ type: "task", id, title, status: "done", summary: injection.diagram?.title });
        this.injections.push(injection);
        this.deliverInjections();
      } catch (error) {
        if (controller.signal.aborted) return;
        log.warn("voice.background_failed", { error: errorMessage(error) });
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

  private async runBackground(taskId: string, task: string, kind: string, signal: AbortSignal): Promise<Injection> {
    const context = buildContext(this.deps.store, {
      userId: this.userId,
      bookId: this.bookId,
      query: task,
      focus: this.focus,
      budget: CHAT_BUDGET,
    });
    let webNotes = "";
    if (kind === "research" || /\b(latest|current|news|look up|search)\b/i.test(task)) {
      const results = await this.deps.search.web(task, 5, this.language).catch(() => []);
      if (results.length)
        webNotes = `\n\nWeb results:\n${results.map((r, i) => `[W${i + 1}] ${r.title}: ${r.snippet ?? ""}`).join("\n")}`;
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
        { role: "system", content: voiceBackgroundPrompt({ language: this.language, context }) },
        ...this.history.slice(-8),
        { role: "user", content: `Task (${kind}): ${task}${webNotes}` },
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
        id: newId("dia"),
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
      visual = { id: diagram.id, kind: "diagram", diagram };
      parts.push({ type: "diagram", diagram });
    }
    if (result.image_query) {
      const images = await this.deps.search.images(String(result.image_query), 6).catch(() => []);
      if (images.length) {
        const imageVisual: VoiceVisual = {
          id: newId("vis"),
          kind: "images",
          query: String(result.image_query),
          images,
        };
        this.send({ type: "visual", visual: imageVisual });
        parts.push({ type: "images", query: String(result.image_query), images });
      }
    }
    if (result.display?.trim() && !visual) {
      visual = {
        id: newId("vis"),
        kind: "markdown",
        title: task.slice(0, 80),
        markdown: result.display.slice(0, 6000),
      };
    }
    return {
      taskId,
      speech: toSpeakableText(result.speech ?? "") || (BRIDGES[this.language] ?? BRIDGES.en).ready,
      visual,
      diagram,
      parts,
    };
  }

  /** Presents finished background work when nobody is talking. */
  private deliverInjections() {
    if (this.closed || !this.injections.length) return;
    if (this.userSpeaking || this.current || this.speakingTurn) return;
    const injection = this.injections.shift()!;
    const turnId = newId("turn");
    this.speakingTurn = turnId;
    if (injection.visual) this.send({ type: "visual", visual: injection.visual });
    const chunker = new PhraseChunker({ firstMinChars: 12, minChars: 50 });
    const phrases = [...chunker.push(injection.speech), ...chunker.flush()];
    for (const phrase of phrases) this.queue.enqueue(turnId, phrase);
    // Narrated tour: each step is its own segment, highlighting its node while spoken.
    for (const step of injection.diagram?.steps ?? []) {
      this.queue.enqueue(turnId, step.say, { visualId: injection.diagram!.id, node: step.node });
    }
    const spoken = [injection.speech, ...(injection.diagram?.steps ?? []).map((step) => step.say)].join(" ");
    this.history.push({
      role: "assistant",
      content: `${spoken}${injection.diagram ? `\n[showed diagram: ${injection.diagram.title}]` : ""}`,
    });
    this.deps.store.messages.add({
      userId: this.userId,
      bookId: this.bookId,
      role: "assistant",
      channel: "voice",
      content: injection.visual?.kind === "markdown" ? `${injection.speech}\n\n${injection.visual.markdown}` : spoken,
      parts: injection.parts,
      model: this.deps.llm.modelFor("smart"),
    });
    this.deps.onTurnComplete(this.userId, this.bookId, this.language);
    if (!phrases.length && !injection.diagram?.steps.length) this.finishSpeaking(turnId);
  }
}
