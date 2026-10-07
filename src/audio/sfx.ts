import type { GameWorld } from '../core/types';
import audioConfig from '../../data/audio.json';

interface ActiveSound {
  oscs: OscillatorNode[];
  nodes: AudioNode[];
}

export class SfxSystem {
  private pool: ActiveSound[] = [];
  private off: (() => void)[] = [];

  constructor(private _world: GameWorld, private ctx: AudioContext | undefined, private sfxGain: GainNode | undefined) {
    if (!ctx || !sfxGain) return;

    this.off.push(this._world.events.on('fire', (e) => this.playFire(e)));
    this.off.push(this._world.events.on('explosion', (e) => this.playExplosion(e)));
    this.off.push(this._world.events.on('damage', (e) => {
      if (e.weapon === 'collision') this.playImpact();
    }));
    this.off.push(this._world.events.on('pickup', () => this.playPickup()));
    this.off.push(this._world.events.on('whammy', (e) => this.playWhammy(e.count)));
    this.off.push(this._world.events.on('destroyed', () => this.playDestroyed()));
  }

  private playFire(e: { weapon: string }): void {
    if (!this.ctx || !this.sfxGain) return;
    const cfg = (audioConfig.weapons as any)[e.weapon];
    if (!cfg) return;

    const gain = this.ctx.createGain();
    gain.gain.value = cfg.gain;
    gain.connect(this.sfxGain);

    if (cfg.timbre === 'whoosh') {
      this.playWhoosh(gain, cfg.freq);
    } else if (cfg.timbre === 'bum') {
      this.playBum(gain, cfg.freq);
    } else if (cfg.timbre === 'deep') {
      this.playDeep(gain, cfg.freq);
    } else if (cfg.timbre === 'click') {
      this.playClick(gain, cfg.freq);
    } else {
      this.playMgBurst(gain, cfg.freq, cfg.duration);
    }
  }

  private playWhoosh(gain: GainNode, freq: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, this.ctx!.currentTime + 0.25);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.25);
    this.track([osc], [gain]);
  }

  private playBum(gain: GainNode, freq: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.2, this.ctx!.currentTime + 0.4);

    gain.gain.setValueAtTime(1, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.4);
    this.track([osc], [gain]);
  }

  private playDeep(gain: GainNode, freq: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx!.currentTime + 0.15);

    gain.gain.setValueAtTime(1, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.15);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.15);
    this.track([osc], [gain]);
  }

  private playClick(gain: GainNode, freq: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.5, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.1);
    this.track([osc], [gain]);
  }

  private playMgBurst(gain: GainNode, freq: number, duration: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.3, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + duration);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
    this.track([osc], [gain]);
  }

  private playExplosion(e: { radius: number }): void {
    if (!this.ctx || !this.sfxGain) return;
    const cfg = audioConfig.explosion;

    const gain = this.ctx.createGain();
    gain.gain.value = cfg.gain * Math.min(1, e.radius / 10);
    gain.connect(this.sfxGain);

    // Low freq tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + cfg.decay);

    // Noise
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * cfg.decay, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    osc.connect(gain);
    noise.connect(gain);
    gain.gain.setValueAtTime(cfg.gain * Math.min(1, e.radius / 10), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + cfg.decay);

    osc.start();
    noise.start();
    osc.stop(this.ctx.currentTime + cfg.decay);
    noise.stop(this.ctx.currentTime + cfg.decay);
    this.track([osc], [gain, noise]);
  }

  private playImpact(): void {
    if (!this.ctx || !this.sfxGain) return;
    const freq = 1200;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    gain.connect(this.sfxGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.06);

    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);
    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
    this.track([osc], [gain]);
  }

  private playPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const cfg = audioConfig.pickup;

    const gain = this.ctx.createGain();
    gain.gain.value = cfg.gain;
    gain.connect(this.sfxGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.freq * 0.8, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(cfg.freq, this.ctx.currentTime + cfg.duration * 0.5);

    gain.gain.setValueAtTime(cfg.gain, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + cfg.duration);

    osc.connect(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + cfg.duration);
    this.track([osc], [gain]);
  }

  private playWhammy(count: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const cfg = audioConfig.whammy;

    const gain = this.ctx.createGain();
    gain.gain.value = cfg.gain * (1 + count * 0.2);
    gain.connect(this.sfxGain);

    const freqs = cfg.chordFreqs.map((f) => f * (1 + count * 0.1));
    const oscs = freqs.map((freq) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      return osc;
    });

    gain.gain.setValueAtTime(cfg.gain * (1 + count * 0.2), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + cfg.duration);

    setTimeout(() => {
      oscs.forEach((o) => o.stop(this.ctx!.currentTime));
    }, cfg.duration * 1000);

    this.track(oscs, [gain]);
  }

  private playDestroyed(): void {
    if (!this.ctx || !this.sfxGain) return;
    const cfg = audioConfig.explosion;

    const gain = this.ctx.createGain();
    gain.gain.value = cfg.gain * 1.5;
    gain.connect(this.sfxGain);

    // Heavier explosion
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(cfg.baseFreq * 0.5, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + cfg.decay * 1.5);

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * cfg.decay * 1.5, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    osc.connect(gain);
    noise.connect(gain);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + cfg.decay * 1.5);

    osc.start();
    noise.start();
    osc.stop(this.ctx.currentTime + cfg.decay * 1.5);
    noise.stop(this.ctx.currentTime + cfg.decay * 1.5);
    this.track([osc], [gain, noise]);
  }

  private track(oscs: OscillatorNode[], nodes: AudioNode[]): void {
    if (this.pool.length >= audioConfig.sfx.poolSize) {
      const old = this.pool.shift();
      if (old) {
        old.oscs.forEach((o) => o.stop());
      }
    }
    this.pool.push({ oscs, nodes });
  }

  dispose(): void {
    this.off.forEach((f) => f());
    this.pool.forEach((s) => s.oscs.forEach((o) => o.stop()));
    this.pool = [];
  }
}
