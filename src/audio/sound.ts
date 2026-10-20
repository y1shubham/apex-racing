export const AUDIO = {
  engineBaseHz: 55,
  engineRangeHz: 170,
  engineIdleGain: 0.05,
  engineLoadGain: 0.11,
  musicBpm: 112,
  musicGain: 0.5,
  lookahead: 0.25,
};

export function engineTone(
  speedRatio: number,
  throttle: boolean,
  boosting: boolean,
) {
  const r = Math.max(0, Math.min(1.25, speedRatio));
  const gearWobble = 0.08 * Math.sin(r * Math.PI * 6);
  return {
    frequency:
      AUDIO.engineBaseHz +
      AUDIO.engineRangeHz * (r + gearWobble) * (boosting ? 1.12 : 1),
    cutoff: 500 + 2600 * r + (throttle ? 600 : 0),
    gain:
      throttle || r > 0.05
        ? AUDIO.engineLoadGain * (0.6 + 0.4 * Math.min(1, r))
        : AUDIO.engineIdleGain,
  };
}

const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

class Sound {
  private ctx: AudioContext | null = null;
  private music!: GainNode;
  private sfx!: GainNode;
  private noise!: AudioBuffer;
  private engine: {
    osc: OscillatorNode[];
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;
  private loops = new Map<
    string,
    { src: AudioBufferSourceNode; gain: GainNode }
  >();
  private volumes = { music: 0.6, sfx: 0.8 };
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;

  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music.connect(this.ctx.destination);
    this.sfx.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate,
      this.ctx.sampleRate,
    );
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.startMusic();
  }

  setVolumes(music: number, sfx: number) {
    this.volumes = { music, sfx };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(
      this.volumes.music * AUDIO.musicGain,
      t,
      0.05,
    );
    this.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
  }

  private tone(
    freq: number,
    start: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    out: AudioNode,
    endFreq?: number,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq)
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private burst(
    start: number,
    duration: number,
    peak: number,
    filterType: BiquadFilterType,
    freq: number,
    out: AudioNode,
    endFreq?: number,
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, start);
    if (endFreq)
      filter.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(out);
    src.start(start, Math.random() * 0.5);
    src.stop(start + duration + 0.05);
  }

  private startMusic() {
    if (this.musicTimer || !this.ctx) return;
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 100);
  }

  private scheduleMusic() {
    const ctx = this.ctx!;
    const step = 60 / AUDIO.musicBpm / 2;
    while (this.nextBeat < ctx.currentTime + AUDIO.lookahead) {
      const t = this.nextBeat;
      const eighth = this.beat % 8;
      const chord = CHORDS[Math.floor(this.beat / 8) % CHORDS.length]!;
      if (eighth % 4 === 0)
        this.tone(150, t, 0.25, "sine", 0.5, this.music, 40);
      this.burst(
        t,
        0.04,
        eighth % 2 ? 0.05 : 0.09,
        "highpass",
        7000,
        this.music,
      );
      this.tone(
        midi(chord[0]! - 12),
        t,
        step * 0.9,
        "triangle",
        0.18,
        this.music,
      );
      if (eighth === 0 || eighth === 3 || eighth === 6)
        chord.forEach((n) =>
          this.tone(midi(n), t, step * 2.5, "sawtooth", 0.035, this.music),
        );
      if (eighth % 2 === 1)
        this.tone(
          midi(chord[(this.beat >> 1) % 3]! + 12),
          t,
          step * 0.8,
          "square",
          0.025,
          this.music,
        );
      this.nextBeat += step;
      this.beat++;
    }
  }

  click() {
    if (!this.ctx) return;
    this.tone(
      1400,
      this.ctx.currentTime,
      0.06,
      "triangle",
      0.12,
      this.sfx,
      900,
    );
  }

  beep(go: boolean) {
    if (!this.ctx) return;
    this.tone(
      go ? 880 : 440,
      this.ctx.currentTime,
      go ? 0.45 : 0.18,
      "square",
      0.12,
      this.sfx,
    );
  }

  hit(hard: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(
      hard ? 90 : 140,
      t,
      hard ? 0.35 : 0.15,
      "sine",
      hard ? 0.6 : 0.3,
      this.sfx,
      40,
    );
    this.burst(
      t,
      hard ? 0.25 : 0.1,
      hard ? 0.35 : 0.15,
      "lowpass",
      1800,
      this.sfx,
      300,
    );
  }

  nitroStart() {
    if (!this.ctx) return;
    this.burst(
      this.ctx.currentTime,
      0.6,
      0.35,
      "bandpass",
      400,
      this.sfx,
      4000,
    );
  }

  finish(won: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    (won ? [72, 76, 79, 84] : [69, 72, 76]).forEach((n, i) =>
      this.tone(midi(n), t + i * 0.14, 0.4, "square", 0.1, this.sfx),
    );
  }

  setLoop(name: "drift" | "boost", on: boolean) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const current = this.loops.get(name);
    if (on && !current) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = name === "drift" ? 2600 : 900;
      filter.Q.value = name === "drift" ? 8 : 1.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        name === "drift" ? 0.18 : 0.12,
        ctx.currentTime + 0.08,
      );
      src.connect(filter).connect(gain).connect(this.sfx);
      src.start();
      this.loops.set(name, { src, gain });
    } else if (!on && current) {
      current.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      current.src.stop(ctx.currentTime + 0.3);
      this.loops.delete(name);
    }
  }

  setEngine(speedRatio: number, throttle: boolean, boosting: boolean) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (!this.engine) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const osc = (["sawtooth", "square"] as const).map((type, i) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.detune.value = i ? -1200 : 7;
        o.connect(filter);
        o.start();
        return o;
      });
      filter.connect(gain).connect(this.sfx);
      this.engine = { osc, filter, gain };
    }
    const tone = engineTone(speedRatio, throttle, boosting);
    const t = ctx.currentTime;
    this.engine.osc.forEach((o) =>
      o.frequency.setTargetAtTime(tone.frequency, t, 0.06),
    );
    this.engine.filter.frequency.setTargetAtTime(tone.cutoff, t, 0.08);
    this.engine.gain.gain.setTargetAtTime(tone.gain, t, 0.08);
  }

  silenceRace() {
    if (!this.ctx) return;
    this.setLoop("drift", false);
    this.setLoop("boost", false);
    this.engine?.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  stopRace() {
    this.silenceRace();
    if (!this.engine || !this.ctx) return;
    const { osc } = this.engine;
    osc.forEach((o) => o.stop(this.ctx!.currentTime + 0.2));
    this.engine = null;
  }
}

export const sound = new Sound();
