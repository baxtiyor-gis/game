import * as THREE from 'three';
import type { VehicleHandle } from '../core/types';
import audioConfig from '../../data/audio.json';

export class EngineSound {
  private oscs: OscillatorNode[] = [];
  private filter?: BiquadFilterNode;
  private noise?: AudioBufferSourceNode;
  private panner?: PannerNode;
  private gain?: GainNode;
  private running = false;

  constructor(
    private ctx: AudioContext,
    private vehicle: VehicleHandle,
    private egain: GainNode,
    private listener: () => THREE.Object3D | undefined
  ) {}

  start(): void {
    if (this.running || !this.ctx) return;
    this.running = true;

    this.gain = this.ctx.createGain();
    this.gain.connect(this.egain);
    const cfg = audioConfig.engine;

    // 3 oscillators with different waveforms
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : i === 1 ? 'square' : 'sawtooth';
      osc.start();
      this.oscs.push(osc);
    }

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = cfg.baseFreq;
    this.filter.Q.value = 2;

    // Connect oscillators to filter
    this.oscs.forEach((o) => o.connect(this.filter!));

    // Add noise
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noise = this.ctx.createBufferSource();
    this.noise.buffer = buf;
    this.noise.loop = true;
    this.noise.start();
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = cfg.noiseAmount;
    this.noise.connect(noiseGain);
    noiseGain.connect(this.filter);

    // Panner for spatial positioning
    this.panner = this.ctx.createPanner();
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = cfg.distanceCutoff;
    this.filter.connect(this.panner);
    this.panner.connect(this.gain);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.oscs.forEach((o) => o.stop());
    if (this.noise) this.noise.stop();
    this.oscs = [];
  }

  update(): void {
    if (!this.running || !this.gain || !this.panner) return;

    const dist = this.calcDist();
    if (dist > audioConfig.engine.distanceCutoff) {
      this.gain.gain.value = 0;
      return;
    }

    const speed = this.vehicle.speed();
    const throttle = Math.abs(this.vehicle.input.throttle);
    const cfg = audioConfig.engine;
    const mass = this.vehicle.def.mass;

    // Pitch: base + speed contribution, lower for heavier vehicles
    const massRatio = Math.max(0.5, 1 - (mass - 1000) / 5000);
    const baseFreq = cfg.baseFreq * massRatio;
    const freq = baseFreq + speed * 20 + throttle * 100;
    const clampedFreq = Math.max(cfg.minFreq, Math.min(cfg.maxFreq, freq));

    // Set oscillator frequencies
    this.oscs[0].frequency.exponentialRampToValueAtTime(clampedFreq, this.ctx.currentTime + 0.05);
    this.oscs[1].frequency.exponentialRampToValueAtTime(clampedFreq * 0.75, this.ctx.currentTime + 0.05);
    this.oscs[2].frequency.exponentialRampToValueAtTime(clampedFreq * 1.5, this.ctx.currentTime + 0.05);

    // Filter cutoff follows speed
    if (this.filter) {
      this.filter.frequency.exponentialRampToValueAtTime(
        cfg.baseFreq + speed * 30,
        this.ctx.currentTime + 0.05
      );
    }

    // Gain from throttle
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.01, throttle), this.ctx.currentTime + 0.05);

    // Position
    const pos = new THREE.Vector3();
    this.vehicle.position(pos);
    this.panner.positionX.value = pos.x;
    this.panner.positionY.value = pos.y;
    this.panner.positionZ.value = pos.z;
  }

  private calcDist(): number {
    const listener = this.listener();
    if (!listener) return Infinity;
    const pos = new THREE.Vector3();
    this.vehicle.position(pos);
    const lpos = new THREE.Vector3();
    listener.getWorldPosition(lpos);
    return pos.distanceTo(lpos);
  }
}
