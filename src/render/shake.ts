import * as THREE from 'three';
import type { GameWorld, System } from '../core/types';
import cfgJson from '../../data/render.json';

const cfg = cfgJson.shake;

/** Portlash masofa/radiusiga qarab trauma (0..1). Sof funksiya. */
export function shakeTrauma(dist: number, radius: number): number {
  if (dist >= cfg.maxDistance) return 0;
  const near = Math.pow(1 - dist / cfg.maxDistance, cfg.falloff);
  const size = Math.pow(radius / cfg.refRadius, cfg.radiusPower);
  return Math.min(1, near * size);
}

/** Trauma holati: qo'shiladi, chiziqli so'nadi; ofset ~ trauma^2. Sof mantiq. */
export class ShakeState {
  trauma = 0;

  add(t: number): void {
    this.trauma = Math.min(1, this.trauma + Math.max(0, t));
  }

  step(dt: number): void {
    this.trauma = Math.max(0, this.trauma - cfg.decayPerSec * dt);
  }

  offset(time: number, out: THREE.Vector3): THREE.Vector3 {
    const a = this.trauma * this.trauma * cfg.maxOffset;
    const w = time * cfg.frequency;
    return out.set(
      a * Math.sin(w * 1.00 + 0.3) * Math.cos(w * 0.37),
      a * Math.sin(w * 1.31 + 1.7),
      a * Math.sin(w * 0.83 + 2.9) * Math.cos(w * 0.53),
    );
  }
}

/** ChaseCamera dan KEYIN qo'shing: camera.position ga ofset qo'llaydi. */
export class ShakeSystem implements System {
  readonly name = 'shake';
  readonly state = new ShakeState();
  private readonly applied = new THREE.Vector3();
  private readonly lastPos = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private time = 0;
  private readonly off: Array<() => void>;

  constructor(private readonly world: GameWorld) {
    const add = (e: { pos: THREE.Vector3; radius: number }): void => {
      this.state.add(shakeTrauma(e.pos.distanceTo(this.world.camera.position), e.radius));
    };
    this.off = [world.events.on('explosion', add), world.events.on('shake', add)];
  }

  update(dt: number): void {
    const cam = this.world.camera;
    // Kamera boshqa tizim tomonidan yozilmagan bo'lsa, oldingi ofsetni qaytarib olamiz
    if (cam.position.equals(this.lastPos)) cam.position.sub(this.applied);
    this.time += dt;
    this.state.step(dt);
    this.state.offset(this.time, this.tmp);
    this.applied.copy(this.tmp);
    cam.position.add(this.applied);
    this.lastPos.copy(cam.position);
  }

  dispose(): void {
    for (const off of this.off) off();
  }
}
