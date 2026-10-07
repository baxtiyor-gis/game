import type { GameWorld } from '../core/types';
import audioConfig from '../../data/audio.json';

type ScheduledOsc = { osc: OscillatorNode; stopTime: number };

export class MusicSystem {
  private nextNoteTime = 0;
  private scheduledOscs: ScheduledOsc[] = [];
  private running = false;
  private intensity = 1; // 1–3 based on combat intensity
  private bassIdx = 0;
  private off: (() => void)[] = [];

  constructor(_world: GameWorld, private ctx: AudioContext | undefined, private musicGain: GainNode | undefined) {
    if (!ctx || !musicGain) return;
    this.running = true;
    this.nextNoteTime = ctx.currentTime;
  }

  update(): void {
    if (!this.ctx || !this.running) return;

    const cfg = audioConfig.music;
    const beatDuration = (60 / cfg.bpm) / 4; // 16th note duration

    // Lookahead scheduling: queue notes 100ms ahead
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      const beatIdx = Math.floor((this.nextNoteTime - this.ctx.currentTime) / beatDuration) % 16;
      this.scheduleNote(beatIdx, this.nextNoteTime, beatDuration);
      this.nextNoteTime += beatDuration;
    }

    // Clean up old scheduled oscs
    this.scheduledOscs = this.scheduledOscs.filter((s) => s.stopTime > this.ctx!.currentTime);
  }

  private scheduleNote(beatIdx: number, time: number, beatDuration: number): void {
    // Bass syncopation: beats 0,2,5,7,10,13,14
    const bassBeatPattern = [0, 2, 5, 7, 10, 13, 14];
    if (bassBeatPattern.includes(beatIdx)) {
      const bassFreqs = [55, 82.5, 110, 165]; // 1-octave bass line
      const freq = bassFreqs[this.bassIdx % bassFreqs.length];
      this.bassIdx++;
      this.playBass(freq, time, beatDuration * 2);
    }

    // Kick: beats 0, 8
    if (beatIdx === 0 || beatIdx === 8) {
      this.playKick(time, beatDuration * 0.5);
    }

    // Snare: beats 4, 12
    if (beatIdx === 4 || beatIdx === 12) {
      this.playSnare(time, beatDuration * 0.4);
    }

    // Hi-hat: every beat, lighter on odd
    if (beatIdx % 2 === 0) {
      this.playHihat(time, beatDuration * 0.3);
    } else if (this.intensity > 1) {
      this.playHihat(time, beatDuration * 0.2);
    }

    // Guitar riff every 4 beats (syncopated wah)
    if (beatIdx % 4 === 1 && this.intensity > 1) {
      this.playGuitar(time, beatDuration * 2);
    } else if (beatIdx % 4 === 1 && this.intensity === 1) {
      this.playGuitar(time, beatDuration * 3);
    }
  }

  private playBass(freq: number, time: number, duration: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(audioConfig.music.bassGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(time);
    osc.stop(time + duration);

    this.scheduledOscs.push({ osc, stopTime: time + duration });
  }

  private playKick(time: number, duration: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(audioConfig.music.kickFreq, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + duration);

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(audioConfig.music.kickGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(time);
    osc.stop(time + duration);

    this.scheduledOscs.push({ osc, stopTime: time + duration });
  }

  private playSnare(time: number, duration: number): void {
    const buf = this.ctx!.createBuffer(1, Math.floor(this.ctx!.sampleRate * duration), this.ctx!.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buf;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(audioConfig.music.snareGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(gain);
    gain.connect(this.musicGain!);
    noise.start(time);
    noise.stop(time + duration);
  }

  private playHihat(time: number, duration: number): void {
    const buf = this.ctx!.createBuffer(1, Math.floor(this.ctx!.sampleRate * duration), this.ctx!.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = audioConfig.music.hihatFreq;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(audioConfig.music.hihatGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);
    noise.start(time);
    noise.stop(time + duration);
  }

  private playGuitar(time: number, duration: number): void {
    // Wah guitar using bandpass filter on noise
    const buf = this.ctx!.createBuffer(1, Math.floor(this.ctx!.sampleRate * duration), this.ctx!.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(2000, time + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(400, time + duration);
    filter.Q.value = 10;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(audioConfig.music.guitarGain, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);
    noise.start(time);
    noise.stop(time + duration);
  }

  setIntensity(level: number): void {
    this.intensity = Math.max(1, Math.min(3, level));
  }

  dispose(): void {
    this.running = false;
    this.scheduledOscs.forEach((s) => s.osc.stop());
    this.scheduledOscs = [];
    this.off.forEach((f) => f());
  }
}
