// Sandiq olinganda qisqa chaqnash: pool qilingan (shar + halqa), additive.
import * as THREE from 'three';
import { vis } from './config';

interface Slot { group: THREE.Group; mat: THREE.MeshBasicMaterial; age: number }

export class PickupFlash {
  private readonly slots: Slot[] = [];
  private readonly sphere = new THREE.SphereGeometry(0.5, 12, 8);
  private readonly ring = new THREE.RingGeometry(0.7, 1, 24).rotateX(-Math.PI / 2);
  private next = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < vis.crate.burst.pool; i++) {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(this.sphere, mat), new THREE.Mesh(this.ring, mat));
      group.visible = false;
      scene.add(group);
      this.slots.push({ group, mat, age: Infinity });
    }
  }

  /** Faol chaqnashlar soni. */
  get active(): number {
    return this.slots.reduce((n, s) => n + (s.age < vis.crate.burst.life ? 1 : 0), 0);
  }

  burst(pos: THREE.Vector3, color: string): void {
    const s = this.slots[this.next];
    this.next = (this.next + 1) % this.slots.length;
    s.age = 0;
    s.group.position.copy(pos);
    s.mat.color.set(color).multiplyScalar(vis.crate.burst.intensity);
    s.group.visible = true;
    this.apply(s);
  }

  update(dt: number): void {
    for (const s of this.slots) {
      if (s.age >= vis.crate.burst.life) continue;
      s.age += dt;
      if (s.age >= vis.crate.burst.life) s.group.visible = false;
      else this.apply(s);
    }
  }

  private apply(s: Slot): void {
    const b = vis.crate.burst;
    const t = s.age / b.life;
    s.group.scale.setScalar(b.radius * (1 - (1 - t) ** 3));
    s.mat.opacity = 1 - t;
  }

  dispose(): void {
    for (const s of this.slots) {
      s.group.removeFromParent();
      s.mat.dispose();
    }
    this.sphere.dispose();
    this.ring.dispose();
  }
}
