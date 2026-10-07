import * as THREE from 'three';
import type { System } from '../core/types';

export interface ChaseTarget {
  object: THREE.Object3D;
  rearView?: () => boolean;
}

/** Asl o'yindagidek orqadan, past burchakli kuzatuvchi kamera. */
export class ChaseCamera implements System {
  readonly name = 'chaseCamera';
  distance = 9;
  height = 3.2;
  lookAhead = 4;
  stiffness = 6;

  private readonly pos = new THREE.Vector3();
  private readonly want = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private initialized = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    public target: ChaseTarget | null = null,
  ) {}

  update(dt: number): void {
    const t = this.target;
    if (!t) return;
    const o = t.object;
    this.fwd.set(0, 0, 1).applyQuaternion(o.quaternion);
    this.fwd.y = 0;
    if (this.fwd.lengthSq() < 1e-4) this.fwd.set(0, 0, 1);
    this.fwd.normalize();
    const rear = t.rearView?.() ?? false;
    const dir = rear ? 1 : -1;

    this.want.copy(o.position).addScaledVector(this.fwd, dir * this.distance);
    this.want.y += this.height;
    if (!this.initialized || rear) {
      this.pos.copy(this.want);
      this.initialized = true;
    } else {
      this.pos.lerp(this.want, 1 - Math.exp(-this.stiffness * dt));
    }
    this.look.copy(o.position).addScaledVector(this.fwd, -dir * this.lookAhead);
    this.look.y += 1;
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
