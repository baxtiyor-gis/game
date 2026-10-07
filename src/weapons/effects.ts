import * as THREE from 'three';
import type { GameWorld } from '../core/types';
import { tuning } from './params';
import { vis } from './visuals/config';

const Z = new THREE.Vector3(0, 0, 1);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const mid = new THREE.Vector3();
const dir = new THREE.Vector3();

interface Tracer { a: THREE.Vector3; dir: THREE.Vector3; dist: number; age: number; life: number }
interface Flash { pos: THREE.Vector3; radius: number; life: number }

/** Uchi (+Z) yorqin, dumi qora (additive'da ko'rinmaydi) konus: tracer geometriyasi. */
function tracerGeometry(): THREE.BufferGeometry {
  const t = vis.tracer;
  const g = new THREE.CylinderGeometry(t.headWidth, t.tailWidth, 1, 6, 3, true).rotateX(Math.PI / 2);
  const pos = g.getAttribute('position');
  const head = new THREE.Color(t.head).multiplyScalar(vis.hdr.tracerHead);
  const mid2 = new THREE.Color(t.mid).multiplyScalar(vis.hdr.tracerMid);
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getZ(i) + 0.5; // 0 = dum, 1 = bosh
    if (k > 0.66) c.copy(mid2).lerp(head, (k - 0.66) / 0.34);
    else c.copy(mid2).multiplyScalar(Math.max(0, k / 0.66) ** 1.6);
    arr.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Pulemyot tracerlari (kalta, tez, bloom ushlaydi) va portlash chaqnashlari (havzali InstancedMesh). */
export class Effects {
  private readonly tracerMesh: THREE.InstancedMesh;
  private readonly haloMesh: THREE.InstancedMesh;
  private readonly flashMesh: THREE.InstancedMesh;
  private readonly tracers: Tracer[] = [];
  private readonly flashes: Flash[] = [];
  private readonly off: () => void;

  constructor(private readonly world: GameWorld) {
    const fx = tuning.fx;
    const geo = tracerGeometry();
    const tmax = vis.tracer.maxTracers;
    const base = { vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false };
    this.tracerMesh = this.make(geo, new THREE.MeshBasicMaterial(base), tmax);
    this.haloMesh = this.make(geo, new THREE.MeshBasicMaterial({ ...base, color: new THREE.Color().setScalar(vis.tracer.haloIntensity) }), tmax);
    const flashMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(fx.flashColor).multiplyScalar(vis.flash.intensity), transparent: true, opacity: 0.75, toneMapped: false,
    });
    this.flashMesh = this.make(new THREE.IcosahedronGeometry(1, 1), flashMat, fx.flashMax);
    this.off = world.events.on('explosion', (e) => this.flash(e.pos, e.radius));
  }

  private make(geo: THREE.BufferGeometry, mat: THREE.Material, max: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.world.scene.add(mesh);
    return mesh;
  }

  tracer(a: THREE.Vector3, b: THREE.Vector3): void {
    if (this.tracers.length >= vis.tracer.maxTracers) this.tracers.shift();
    dir.subVectors(b, a);
    const dist = dir.length();
    if (dist < 1e-4) return;
    const t = vis.tracer;
    this.tracers.push({ a: a.clone(), dir: dir.clone().divideScalar(dist), dist, age: t.length * 0.5 / t.speed, life: Math.max(t.minLife, (dist + t.length) / t.speed) });
  }

  flash(pos: THREE.Vector3, radius: number): void {
    if (this.flashes.length >= tuning.fx.flashMax) this.flashes.shift();
    this.flashes.push({ pos: pos.clone(), radius, life: tuning.fx.flashLife });
  }

  get activeTracers(): number {
    return this.tracers.length;
  }

  update(dt: number): void {
    const t = vis.tracer;
    let n = 0;
    for (const tr of this.tracers) {
      const run = tr.age * t.speed;
      const head = Math.min(tr.dist, run);
      const tail = Math.min(tr.dist, Math.max(0, run - t.length));
      const len = head - tail;
      if (len < 0.05) continue;
      mid.copy(tr.a).addScaledVector(tr.dir, (head + tail) * 0.5);
      q.setFromUnitVectors(Z, tr.dir);
      m.compose(mid, q, s.set(1, 1, len));
      this.tracerMesh.setMatrixAt(n, m);
      m.compose(mid, q, s.set(t.haloScale, t.haloScale, len * 1.05));
      this.haloMesh.setMatrixAt(n++, m);
    }
    this.tracerMesh.count = this.haloMesh.count = n;
    this.tracerMesh.instanceMatrix.needsUpdate = this.haloMesh.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const f of this.flashes) {
      const k = 1 - f.life / tuning.fx.flashLife;
      m.compose(f.pos, q.identity(), s.setScalar(f.radius * (0.3 + 0.7 * Math.sqrt(k))));
      this.flashMesh.setMatrixAt(n++, m);
    }
    this.flashMesh.count = n;
    this.flashMesh.instanceMatrix.needsUpdate = true;
    // yoshartirish chizishdan keyin: past FPS da ham har tracer/chaqnash kamida bir kadr ko'rinadi
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      if ((this.tracers[i].age += dt) >= this.tracers[i].life) this.tracers.splice(i, 1);
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      if ((this.flashes[i].life -= dt) <= 0) this.flashes.splice(i, 1);
    }
  }

  dispose(): void {
    this.off();
    this.tracerMesh.geometry.dispose();
    for (const mesh of [this.tracerMesh, this.haloMesh, this.flashMesh]) {
      mesh.removeFromParent();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    }
    this.flashMesh.geometry.dispose();
  }
}
