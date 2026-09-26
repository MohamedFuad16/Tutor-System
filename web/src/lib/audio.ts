/**
 * Browser audio primitives.
 *
 * MicCapture: getUserMedia → AudioWorklet (off the main thread) → 16 kHz
 * PCM16 frames of ~40 ms, plus an RMS level for visualisation. Echo
 * cancellation and noise suppression stay on so the tutor's own voice is not
 * transcribed as the learner.
 *
 * PcmPlayer: gapless scheduling of PCM16 chunks, grouped by segment number,
 * with per-segment start/end callbacks (what the learner actually heard),
 * ducking, and instant clear for barge-in.
 */

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / options.processorOptions.targetRate;
    this.frame = Math.round(options.processorOptions.targetRate * 0.04);
    this.buffer = new Int16Array(this.frame);
    this.index = 0;
    this.acc = 0;
    this.pos = 0;
    this.sum = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i] * input[i];
      this.pos += 1;
      // Simple decimation with averaging (inputs are band-limited by the mic path).
      this.acc += input[i];
      if (this.pos >= this.ratio) {
        const sample = Math.max(-1, Math.min(1, this.acc / this.pos));
        this.buffer[this.index++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        this.pos -= this.ratio;
        this.acc = 0;
        if (this.index === this.frame) {
          const rms = Math.sqrt(this.sum / (this.frame * this.ratio));
          this.port.postMessage({ pcm: this.buffer.buffer, rms }, [this.buffer.buffer]);
          this.buffer = new Int16Array(this.frame);
          this.index = 0;
          this.sum = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("tutor-capture", Capture);
`;

let workletUrl: string | null = null;

/** Smoothed-by-caller 0..1 energy per voice band, for audio-reactive visuals. */
export type AudioBands = { low: number; mid: number; high: number; all: number };
export const silentBands = (): AudioBands => ({ low: 0, mid: 0, high: 0, all: 0 });

/** Low / mid / high band energy and overall RMS from an analyser (same scaling as the orb's reference). */
function readBands(
  analyser: AnalyserNode,
  spectrum: Uint8Array<ArrayBuffer>,
  wave: Float32Array<ArrayBuffer>,
): AudioBands {
  analyser.getByteFrequencyData(spectrum);
  analyser.getFloatTimeDomainData(wave);
  let sum = 0;
  for (const value of wave) sum += value * value;
  const all = Math.min(1, Math.max(0, Math.sqrt(sum / wave.length) - 0.004) * 5.5);
  if (!all) return silentBands();
  const nyquist = analyser.context.sampleRate / 2;
  const bin = (hz: number) => Math.max(0, Math.min(spectrum.length - 1, Math.round((hz / nyquist) * spectrum.length)));
  const average = (from: number, to: number) => {
    const start = bin(from);
    const end = bin(to);
    let total = 0;
    for (let i = start; i <= end; i += 1) total += spectrum[i];
    return Math.min(1, (total / (end - start + 1) / 255) * 2);
  };
  return { low: average(30, 200), mid: average(200, 2000), high: average(2000, 12000), all };
}

export class MicCapture {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private spectrum = new Uint8Array(512);
  private wave = new Float32Array(1024);
  muted = false;

  constructor(
    private readonly onFrame: (pcm: ArrayBuffer, rms: number) => void,
    readonly targetRate = 16_000,
  ) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.context = new AudioContext();
    workletUrl ??= URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await this.context.audioWorklet.addModule(workletUrl);
    const source = this.context.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.context, "tutor-capture", {
      processorOptions: { targetRate: this.targetRate },
    });
    this.node.port.onmessage = (event) => {
      const { pcm, rms } = event.data as { pcm: ArrayBuffer; rms: number };
      this.onFrame(this.muted ? new ArrayBuffer(pcm.byteLength) : pcm, this.muted ? 0 : rms);
    };
    source.connect(this.node);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.65;
    source.connect(this.analyser);
    // Keep the graph pulling without making the mic audible.
    const sink = this.context.createGain();
    sink.gain.value = 0;
    this.node.connect(sink).connect(this.context.destination);
  }

  /** Mic energy per band (zero while muted). */
  bands(): AudioBands {
    return this.analyser && !this.muted ? readBands(this.analyser, this.spectrum, this.wave) : silentBands();
  }

  stop() {
    this.node?.disconnect();
    this.analyser?.disconnect();
    this.analyser = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close().catch(() => undefined);
    this.node = null;
    this.stream = null;
    this.context = null;
  }
}

type SegmentCallbacks = { onStart?: (seq: number) => void; onEnd?: (seq: number) => void };

export class PcmPlayer {
  private context: AudioContext;
  private gain: GainNode;
  private analyser: AnalyserNode;
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private segmentEnds = new Map<number, number>();
  private started = new Set<number>();
  private timers = new Set<number>();
  private dropped = new Set<number>();
  private level = new Uint8Array(128);
  private spectrum = new Uint8Array(256);
  private wave = new Float32Array(512);
  private leftover: Uint8Array | null = null;

  constructor(
    private sampleRate: number,
    private readonly callbacks: SegmentCallbacks = {},
  ) {
    this.context = new AudioContext();
    this.gain = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.6;
    this.gain.connect(this.analyser).connect(this.context.destination);
  }

  setSampleRate(rate: number) {
    this.sampleRate = rate;
  }

  async resume() {
    if (this.context.state !== "running") await this.context.resume();
  }

  /** Queue PCM16 bytes for a segment. Chunks for a cleared segment are ignored. */
  push(seq: number, bytes: Uint8Array) {
    if (this.dropped.has(seq)) return;
    let data = bytes;
    if (this.leftover) {
      data = new Uint8Array(this.leftover.length + bytes.length);
      data.set(this.leftover);
      data.set(bytes, this.leftover.length);
      this.leftover = null;
    }
    if (data.length % 2) {
      this.leftover = data.slice(data.length - 1);
      data = data.slice(0, data.length - 1);
    }
    if (!data.length) return;
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const buffer = this.context.createBuffer(1, samples.length, this.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i] / 0x8000;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    const now = this.context.currentTime;
    // Small lead when the queue ran dry so the first chunk isn't clipped.
    const startAt = Math.max(now + 0.03, this.nextTime);
    source.start(startAt);
    this.nextTime = startAt + buffer.duration;
    this.segmentEnds.set(seq, this.nextTime);
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    if (!this.started.has(seq)) {
      this.started.add(seq);
      this.at(startAt, () => this.callbacks.onStart?.(seq));
    }
  }

  /** Marks a segment complete; fires onEnd when its last sample has played. */
  finish(seq: number) {
    if (this.dropped.has(seq)) return;
    const end = this.segmentEnds.get(seq);
    if (end === undefined) {
      // Segment without audio (e.g. synthesis failed): report immediately.
      this.callbacks.onStart?.(seq);
      this.callbacks.onEnd?.(seq);
      return;
    }
    this.at(end, () => this.callbacks.onEnd?.(seq));
  }

  /** Stop everything now (barge-in). Late chunks of these segments are dropped. */
  clear() {
    for (const seq of this.segmentEnds.keys()) this.dropped.add(seq);
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.sources.clear();
    this.segmentEnds.clear();
    this.nextTime = 0;
    this.leftover = null;
  }

  duck(on: boolean) {
    this.gain.gain.setTargetAtTime(on ? 0.25 : 1, this.context.currentTime, 0.06);
  }

  get playing() {
    return this.sources.size > 0;
  }

  /** 0..1 output loudness, for the orb. */
  loudness() {
    this.analyser.getByteTimeDomainData(this.level);
    let sum = 0;
    for (const value of this.level) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    return Math.sqrt(sum / this.level.length);
  }

  /** Output energy per band, for the orb while the tutor speaks. */
  bands(): AudioBands {
    return readBands(this.analyser, this.spectrum, this.wave);
  }

  close() {
    this.clear();
    void this.context.close().catch(() => undefined);
  }

  private at(time: number, fn: () => void) {
    const delay = Math.max(0, (time - this.context.currentTime) * 1000);
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, delay);
    this.timers.add(timer);
  }
}
