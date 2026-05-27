// src/audio.ts

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  return audioCtx;
};

export const playHoverSound = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    // Soft whoosh (filtered noise)
    const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start();
    noiseSource.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn("Audio not supported or permitted yet", err);
  }
};

export const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    // Metallic thump (FM synthesis / percussion)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc2.type = "square"; // adding metallic harmonics

    osc1.frequency.setValueAtTime(180, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

    osc2.frequency.setValueAtTime(400, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn("Audio not supported or permitted yet", err);
  }
};

let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
let ambientLfo: OscillatorNode | null = null;
let isAmbientPlaying = false;

export const startAmbientHum = () => {
  if (isAmbientPlaying) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    ambientOsc = ctx.createOscillator();
    ambientLfo = ctx.createOscillator();
    ambientGain = ctx.createGain();

    ambientOsc.type = "sine";
    ambientOsc.frequency.value = 55; // Low hum

    ambientLfo.type = "sine";
    ambientLfo.frequency.value = 0.1; // Very slow modulation

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 2; // modulate frequency by +/- 2hz

    ambientLfo.connect(lfoGain);
    lfoGain.connect(ambientOsc.frequency);

    ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    ambientGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 2); // fade in gently

    ambientOsc.connect(ambientGain);
    ambientGain.connect(ctx.destination);

    ambientOsc.start();
    ambientLfo.start();
    isAmbientPlaying = true;
  } catch (err) {
    console.warn("Audio not supported or permitted yet", err);
  }
};
