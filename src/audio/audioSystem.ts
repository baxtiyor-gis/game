import * as THREE from 'three';
import type { System, GameWorld } from '../core/types';
import audioConfig from '../../data/audio.json';

export class AudioSystem implements System {
  readonly name = 'audio';
  ctx?: AudioContext;
  masterGain?: GainNode;
  sfxGain?: GainNode;
  musicGain?: GainNode;
  private muted = false;
  private masterGainValue = audioConfig.master.gain;
  private listening = false;
  private readonly listenerGetter: () => THREE.Object3D | undefined;
  private readonly pos = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3(0, 0, -1);
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly muteKey = audioConfig.muteKey || 'KeyM';

  constructor(_world: GameWorld, listener: () => THREE.Object3D | undefined) {
    this.listenerGetter = listener;
    // Lazy-init AudioContext on first user interaction
    if (!this.listening) {
      this.listening = true;
      document.addEventListener('pointerdown', () => this.init(), { once: true });
      document.addEventListener('keydown', () => this.init(), { once: true });
    }
  }

  private init(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterGainValue;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = audioConfig.sfx.gain;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = audioConfig.music.gain;
    this.musicGain.connect(this.masterGain);

    document.addEventListener('keydown', (e) => {
      if (e.code === this.muteKey) {
        this.toggleMute();
      }
    });
  }

  /** Umumiy balandlik 0..1 (sozlamalardan). AudioContext ochilmagan bo'lsa ham saqlanadi. */
  setVolume(v: number): void {
    this.masterGainValue = audioConfig.master.gain * Math.max(0, Math.min(1, v));
    if (this.masterGain && !this.muted) this.masterGain.gain.value = this.masterGainValue;
  }

  private toggleMute(): void {
    if (!this.masterGain) return;
    this.muted = !this.muted;
    this.masterGain.gain.value = this.muted ? 0 : this.masterGainValue;
  }

  update(_dt: number, _alpha: number): void {
    const listener = this.listenerGetter();
    if (!listener || !this.ctx) return;

    listener.getWorldPosition(this.pos);
    listener.getWorldDirection(this.fwd);

    const li = this.ctx.listener;
    li.positionX.value = this.pos.x;
    li.positionY.value = this.pos.y;
    li.positionZ.value = this.pos.z;

    li.forwardX.value = this.fwd.x;
    li.forwardY.value = this.fwd.y;
    li.forwardZ.value = this.fwd.z;

    li.upX.value = this.up.x;
    li.upY.value = this.up.y;
    li.upZ.value = this.up.z;
  }

  dispose(): void {
    if (this.ctx) this.ctx.close();
  }
}
