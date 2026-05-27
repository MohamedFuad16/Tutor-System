export class AudioSystem {
  context: AudioContext | null = null;
  humOscillators: OscillatorNode[] = [];
  humGain: GainNode | null = null;

  init() {
    if (!this.context) {
      this.context = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.context.state === "suspended") {
      this.context.resume();
    }
    // this.startHum();
  }

  playHover() {
    if (!this.context) return;
    const ctx = this.context;

    // Whoosh using filtered noise
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(
      1500 + Math.random() * 300,
      ctx.currentTime + 0.1,
    );
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.5);
  }

  playClick() {
    if (!this.context) return;
    const ctx = this.context;

    // Helper for short, high-pitched metallic partials
    const playClink = (
      freq: number,
      decay: number,
      volume: number,
      type: OscillatorType = "sine",
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + decay);
    };

    // Coin clink consists of multiple high, inharmonic partials
    playClink(2550, 0.4, 0.04, "sine");
    playClink(3820, 0.3, 0.03, "sine");
    playClink(6540, 0.2, 0.02, "triangle");
    playClink(8210, 0.1, 0.015, "triangle");

    // Slight lower fundamental thump/ring to give it weight
    playClink(1250, 0.5, 0.02, "sine");
  }

  startHum() {
    if (!this.context || this.humGain) return;
    const ctx = this.context;

    this.humGain = ctx.createGain();
    this.humGain.gain.setValueAtTime(0, ctx.currentTime);
    this.humGain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 3); // fade in slow

    // lowpass filter to make hum very subtle
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 150;

    this.humGain.connect(filter);
    filter.connect(ctx.destination);

    // Deep continuous smooth drone
    const freqs = [55, 55.5];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(this.humGain!);
      osc.start();
      this.humOscillators.push(osc);
    });
  }

  stopHum() {
    if (!this.context || !this.humGain) return;
    const ctx = this.context;
    this.humGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1);

    setTimeout(() => {
      this.humOscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch (e) {}
      });
      this.humOscillators = [];
      this.humGain = null;
    }, 1000);
  }
}

export const audio = new AudioSystem();
