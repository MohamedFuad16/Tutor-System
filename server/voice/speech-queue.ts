/**
 * Ordered, pipelined speech output for one voice session.
 *
 * Phrases are synthesized up to `concurrency` at a time (so phrase N+1 is
 * ready before N finishes playing) but always delivered to the client in
 * order. Each phrase is a numbered segment; the client reports playback
 * start/end per segment, which tells us exactly what the learner heard when
 * they interrupt. `cancel()` drops everything instantly for barge-in.
 */
import type { SpeechProvider } from "../providers/deepgram.js";
import { errorMessage, log } from "../lib/log.js";

export type Segment = {
  seq: number;
  turnId: string;
  text: string;
  focus?: { visualId: string; node: string };
};

type Slot = Segment & {
  chunks: Buffer[];
  synthDone: boolean;
  announced: boolean;
  sentAll: boolean;
  abort: AbortController;
  started: boolean;
};

/**
 * Synthesized audio for short, recurring phrases (acknowledgements, bridges),
 * shared by every session: a cache hit plays with no TTS round trip.
 */
const PHRASE_CACHE_MAX = 64;
const PHRASE_MAX_CHARS = 60;
const phraseCache = new Map<string, Buffer[]>();

function cacheKey(voice: string, language: string, sampleRate: number, text: string) {
  return `${voice}|${language}|${sampleRate}|${text}`;
}

function remember(key: string, chunks: Buffer[]) {
  phraseCache.delete(key);
  phraseCache.set(key, chunks);
  if (phraseCache.size > PHRASE_CACHE_MAX) phraseCache.delete(phraseCache.keys().next().value!);
}

export type SpeechSink = {
  announce(segment: Segment): void;
  audio(seq: number, pcm: Buffer): void;
  segmentEnd(seq: number): void;
};

export class SpeechQueue {
  private slots: Slot[] = [];
  private nextSeq = 1;
  private inFlight = 0;
  private readonly played = new Map<number, "start" | "end">();
  private readonly texts = new Map<number, { turnId: string; text: string }>();

  constructor(
    private readonly options: {
      speech: SpeechProvider | null;
      language: string;
      sampleRate: number;
      concurrency?: number;
      sink: SpeechSink;
      onError?: (message: string) => void;
    },
  ) {}

  enqueue(turnId: string, text: string, focus?: Segment["focus"]): number {
    const seq = this.nextSeq++;
    this.texts.set(seq, { turnId, text });
    this.slots.push({
      seq,
      turnId,
      text,
      focus,
      chunks: [],
      synthDone: false,
      announced: false,
      sentAll: false,
      abort: new AbortController(),
      started: false,
    });
    this.pump();
    return seq;
  }

  /** Client playback progress. */
  notePlayback(seq: number, state: "start" | "end") {
    if (state === "end" || !this.played.has(seq)) this.played.set(seq, state);
  }

  /** True once every enqueued segment for the turn has been fully delivered. */
  isDelivered(turnId: string) {
    return !this.slots.some((slot) => slot.turnId === turnId);
  }

  /** Last segment number of a turn that was enqueued, or 0. */
  lastSeqOf(turnId: string) {
    let last = 0;
    for (const [seq, entry] of this.texts) if (entry.turnId === turnId && seq > last) last = seq;
    return last;
  }

  hasPlaybackEnded(seq: number) {
    return this.played.get(seq) === "end";
  }

  /** Text of a turn the learner actually heard (segments whose playback started). */
  heardText(turnId: string) {
    const heard: string[] = [];
    for (const [seq, entry] of [...this.texts.entries()].sort((a, b) => a[0] - b[0])) {
      if (entry.turnId === turnId && this.played.has(seq)) heard.push(entry.text);
    }
    return heard.join(" ");
  }

  /** Everything enqueued for a turn, heard or not. */
  turnText(turnId: string) {
    return [...this.texts.values()]
      .filter((entry) => entry.turnId === turnId)
      .map((entry) => entry.text)
      .join(" ");
  }

  /** Pre-synthesizes short phrases into the shared cache (e.g. acknowledgements), one at a time. */
  async warm(texts: string[]) {
    const speech = this.options.speech;
    if (!speech) return;
    for (const text of texts) {
      const key = this.key(text);
      if (!key || phraseCache.has(key)) continue;
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of speech.synthesize(text, {
          language: this.options.language,
          sampleRate: this.options.sampleRate,
          signal: AbortSignal.timeout(10_000),
        })) {
          chunks.push(chunk);
        }
        if (chunks.length) remember(key, chunks);
      } catch (error) {
        log.debug("voice.tts_warm_failed", { error: errorMessage(error) });
      }
    }
  }

  private key(text: string) {
    const speech = this.options.speech;
    return speech && text.length <= PHRASE_MAX_CHARS
      ? cacheKey(speech.name, this.options.language, this.options.sampleRate, text)
      : null;
  }

  /** Barge-in: abort synthesis and drop everything not yet delivered. */
  cancel() {
    for (const slot of this.slots) slot.abort.abort();
    this.slots = [];
    this.inFlight = 0;
  }

  get pending() {
    return this.slots.length;
  }

  private pump() {
    const concurrency = this.options.concurrency ?? 2;
    for (const slot of this.slots) {
      if (this.inFlight >= concurrency) break;
      if (slot.started) continue;
      slot.started = true;
      this.inFlight += 1;
      void this.synthesize(slot);
    }
    this.flush();
  }

  private async synthesize(slot: Slot) {
    try {
      const key = this.key(slot.text);
      const cached = key ? phraseCache.get(key) : undefined;
      if (cached) {
        slot.chunks.push(...cached);
      } else if (this.options.speech) {
        const produced: Buffer[] = [];
        for await (const chunk of this.options.speech.synthesize(slot.text, {
          language: this.options.language,
          sampleRate: this.options.sampleRate,
          signal: slot.abort.signal,
        })) {
          if (slot.abort.signal.aborted) return;
          slot.chunks.push(chunk);
          produced.push(chunk);
          this.flush();
        }
        if (key && produced.length && !slot.abort.signal.aborted) remember(key, produced);
      }
    } catch (error) {
      if (!slot.abort.signal.aborted) {
        log.warn("voice.tts_failed", { error: errorMessage(error) });
        this.options.onError?.(errorMessage(error));
      }
    } finally {
      if (!slot.abort.signal.aborted) {
        slot.synthDone = true;
        this.inFlight = Math.max(0, this.inFlight - 1);
        this.flush();
        this.pump();
      }
    }
  }

  /** Streams audio strictly in segment order; later segments buffer until earlier ones finish. */
  private flush() {
    while (this.slots.length) {
      const head = this.slots[0];
      if (!head.started) return;
      if (!head.announced) {
        head.announced = true;
        this.options.sink.announce({ seq: head.seq, turnId: head.turnId, text: head.text, focus: head.focus });
      }
      for (const chunk of head.chunks.splice(0)) this.options.sink.audio(head.seq, chunk);
      if (!head.synthDone) return;
      head.sentAll = true;
      this.options.sink.segmentEnd(head.seq);
      this.slots.shift();
    }
  }
}
