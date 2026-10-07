import * as THREE from 'three';
import type { GameWorld } from '../core/types';
import { tuning } from './params';

const Z = new THREE.Vector3(0, 0, 1);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const mid = new THREE.Vector3();
const dir = new THREE.Vector3();

interface Tracer { a: THREE.Vector3; b: THREE.Vector3; life: number }
interface Flash { pos: THREE.Vector3; radius: number; life: number }

/** Pulemyot tracerlari va portlash chaqnashlari (havzali InstancedMesh). */
export class Effects {
  private readonly tracerMesh: THREE.InstancedMesh;
  private readonly flashMesh: THREE.InstancedMesh;
  private readonly tracers: Tracer[] = [];
  private readonly flashes: Flash[] = [];
  private readonly off: () => void;

  constructor(private readonly world: GameWorld) {
    const fx = tuning.fx;
    this.tracerMesh = this.make(new THREE.BoxGeometry(1, 1, 1), tuning.mg.tracerColor, 1, fx.tracerMax);
    this.flashMesh = this.make(new THREE.IcosahedronGeometry(1, 0), fx.flashColor, 0.75, fx.flashMax);
    this.off = world.events.on('explosion', (e) => this.flash(e.pos, e.radius));
  }

  private make(geo: THREE.BufferGeometry, color: string, opacity: number, max: number): THREE.InstancedMesh {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.world.scene.add(mesh);
    return mesh;
  }

  tracer(a: THREE.Vector3, b: THREE.Vector3): void {
    if (this.tracers.length >= tuning.fx.tracerMax) this.tracers.shift();
    this.tracers.push({ a: a.clone(), b: b.clone(), life: tuning.mg.tracerLife });
  }

  flash(pos: THREE.Vector3, radius: number): void {
    if (this.flashes.length >= tuning.fx.flashMax) this.flashes.shift();
    this.flashes.push({ pos: pos.clone(), radius, life: tuning.fx.flashLife });
  }

  update(dt: number): void {
    this.age(this.tracers, dt);
    this.age(this.flashes, dt);
    let n = 0;
    for (const t of this.tracers) {
      dir.subVectors(t.b, t.a);
      const len = dir.length();
      if (len < 1e-4) continue;
      dir.divideScalar(len);
      mid.addVectors(t.a, t.b).multiplyScalar(0.5);
      q.setFromUnitVectors(Z, dir);
      m.compose(mid, q, s.set(tuning.mg.tracerWidth, tuning.mg.tracerWidth, len));
      this.tracerMesh.setMatrixAt(n++, m);
    }
    this.tracerMesh.count = n;
    this.tracerMesh.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const f of this.flashes) {
      const k = 1 - f.life / tuning.fx.flashLife;
      m.compose(f.pos, q.identity(), s.setScalar(f.radius * (0.3 + 0.7 * Math.sqrt(k))));
      this.flashMesh.setMatrixAt(n++, m);
    }
    this.flashMesh.count = n;
    this.flashMesh.instanceMatrix.needsUpdate = true;
  }

  private age(list: Array<{ life: number }>, dt: number): void {
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].life -= dt;
      if (list[i].life <= 0) list.splice(i, 1);
    }
  }

  dispose(): void {
    this.off();
    for (const mesh of [this.tracerMesh, this.flashMesh]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
