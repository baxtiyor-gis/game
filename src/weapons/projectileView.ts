import * as THREE from 'three';
import type { WeaponId } from '../core/types';
import { vis, type DiskModel, type RocketModel, type ShellModel } from './visuals/config';
import { getModel, modelIds } from './visuals/models';
import { TrailPool } from './visuals/trails';
import { tuning } from './params';

const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const m = new THREE.Matrix4();
const mg = new THREE.Matrix4();
const ma = new THREE.Matrix4();
const q = new THREE.Quaternion();
const qs = new THREE.Quaternion();
const s = new THREE.Vector3();
const col = new THREE.Color();
const tint = new THREE.Color();
const WHITE = new THREE.Color(1, 1, 1);
const LAYERS = 3;

/** Har kadr uchun qo'shimcha ma'lumot (bitta obyekt qayta ishlatiladi). */
export interface ViewExtra {
  /** pool indeksi (iz uchun) */
  id: number;
  age: number;
  moving: boolean;
  /** maxsus harakat id si; null = oddiy snaryad */
  tag: string | null;
  splash: number;
}

interface Layer {
  body: THREE.InstancedMesh;
  glow: THREE.InstancedMesh | null;
  n: number;
}

/** Snaryadlar: har qurol uchun InstancedMesh (korpus + yorqin qism) va umumiy iz pooli. */
export class ProjectileView {
  private readonly layers = new Map<WeaponId, Layer>();
  private readonly trails: TrailPool;
  private total = 0;
  private time = 0;
  private dt = 0;
  private frame = 1;
  private readonly lastPos: Float32Array;
  private readonly lastAge: Float32Array;
  private readonly lastFrame: Int32Array;
  private readonly lastWeapon: Uint8Array;
  private readonly acc: Float32Array;

  constructor(private readonly scene: THREE.Scene, private readonly max: number) {
    for (const w of modelIds()) this.layers.set(w, this.makeLayer(w));
    this.trails = new TrailPool();
    scene.add(this.trails.points);
    this.lastPos = new Float32Array(max * 3);
    this.lastAge = new Float32Array(max);
    this.lastFrame = new Int32Array(max);
    this.lastWeapon = new Uint8Array(max);
    this.acc = new Float32Array(max * LAYERS);
  }

  private makeLayer(w: WeaponId): Layer {
    const model = getModel(w);
    const body = this.instanced(model.body, new THREE.MeshStandardMaterial({
      vertexColors: true, metalness: model.metalness, roughness: model.roughness,
    }));
    const glow = model.glow ? this.instanced(model.glow, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })) : null;
    return { body, glow, n: 0 };
  }

  private instanced(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geo, mat, this.max);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, WHITE);
    this.scene.add(mesh);
    return mesh;
  }

  /** Hozirgi kadrda chizilayotgan snaryadlar soni. */
  get drawn(): number {
    return this.total;
  }

  get trailParticles(): number {
    return this.trails.live;
  }

  get trailCapacity(): number {
    return this.trails.capacity;
  }

  begin(dt = 0): void {
    this.total = 0;
    this.dt = dt;
    this.time += dt;
    this.frame++;
    for (const l of this.layers.values()) l.n = 0;
  }

  /** dir = null bo'lsa burilmaydi (yerdagi mina). */
  add(weapon: WeaponId, pos: THREE.Vector3, dir: THREE.Vector3 | null, extra?: ViewExtra): void {
    if (this.total >= this.max) return;
    const layer = this.layers.get(weapon)!;
    const cfg = vis.models[weapon];
    const age = extra?.age ?? this.time;
    const special = !!extra?.tag;
    const sc = special ? vis.special.scale * Math.max(1, extra!.splash) ** 0.5 : 1;

    if (dir) q.setFromUnitVectors(Z, dir);
    else q.identity();
    this.spin(cfg, age, extra?.moving ?? true);
    m.compose(pos, q, s.setScalar(sc));
    const i = layer.n++;
    this.total++;
    layer.body.setMatrixAt(i, m);
    if (special) col.copy(WHITE).lerp(tint.set(vis.special.tints[weapon]), vis.special.tintMix);
    else col.copy(WHITE);
    layer.body.setColorAt(i, col);

    if (layer.glow) {
      const model = getModel(weapon);
      const k = this.glowK(cfg, age);
      mg.makeTranslation(0, 0, model.glowAnchor).multiply(ma.makeScale(1, 1, cfg.kind === 'rocket' && cfg.flame ? k : 1));
      mg.premultiply(m);
      layer.glow.setMatrixAt(i, mg);
      layer.glow.setColorAt(i, col.setScalar(cfg.kind === 'disk' ? this.blink(cfg, age) : cfg.kind === 'rocket' && cfg.tip ? 0.85 + 0.15 * Math.sin(age * 30) : 1));
    }
    if (extra && dir && extra.moving) this.emitTrail(weapon, extra, pos, dir);
  }

  /** Aylanish: raketa roll (Z), mortira tumble (X), mina (Y, faqat uchayotganda). */
  private spin(cfg: RocketModel | ShellModel | DiskModel, age: number, moving: boolean): void {
    if (cfg.kind === 'rocket') {
      if (cfg.roll) q.multiply(qs.setFromAxisAngle(Z, age * cfg.roll));
    } else if (cfg.kind === 'shell') q.multiply(qs.setFromAxisAngle(X, age * cfg.tumble));
    else if (moving) q.multiply(qs.setFromAxisAngle(Y, age * cfg.spin));
  }

  private glowK(cfg: RocketModel | ShellModel | DiskModel, age: number): number {
    if (cfg.kind !== 'rocket') return 1;
    return 1 + cfg.flicker * (Math.sin(age * 55) * 0.6 + Math.sin(age * 91 + 1.7) * 0.4);
  }

  /** Mina chirog'i: armed bo'lganda tezroq miltillaydi; o'chiq paytda xira. */
  private blink(cfg: DiskModel, age: number): number {
    const freq = age >= tuning.mine.armDelay ? cfg.blinkArmed : cfg.blinkIdle;
    return (age * freq) % 1 < cfg.duty ? 1 : cfg.dim;
  }

  private emitTrail(weapon: WeaponId, e: ViewExtra, pos: THREE.Vector3, dir: THREE.Vector3): void {
    const layers = vis.trails[weapon];
    if (layers.length === 0) return;
    const id = e.id;
    const wi = modelIds().indexOf(weapon);
    const p = id * 3;
    const lp = this.lastPos;
    const dx = pos.x - lp[p];
    const dy = pos.y - lp[p + 1];
    const dz = pos.z - lp[p + 2];
    const fresh = this.lastFrame[id] !== this.frame - 1 || this.lastWeapon[id] !== wi || e.age < this.lastAge[id]
      || dx * dx + dy * dy + dz * dz > vis.viewMax.trailResetDistance ** 2;
    if (fresh) {
      lp[p] = pos.x;
      lp[p + 1] = pos.y;
      lp[p + 2] = pos.z;
      this.acc.fill(0, id * LAYERS, id * LAYERS + LAYERS);
    }
    for (let li = 0; li < layers.length && li < LAYERS; li++) {
      const l = layers[li];
      const a = (this.acc[id * LAYERS + li] += this.dt * l.rate);
      const cnt = Math.min(Math.floor(a), vis.viewMax.trailMaxPerFrame);
      this.acc[id * LAYERS + li] = a - Math.floor(a);
      for (let k = 1; k <= cnt; k++) {
        const t = k / cnt;
        this.trails.emit(l, lp[p] + (pos.x - lp[p]) * t - dir.x * l.back, lp[p + 1] + (pos.y - lp[p + 1]) * t - dir.y * l.back, lp[p + 2] + (pos.z - lp[p + 2]) * t - dir.z * l.back);
      }
    }
    lp[p] = pos.x;
    lp[p + 1] = pos.y;
    lp[p + 2] = pos.z;
    this.lastFrame[id] = this.frame;
    this.lastWeapon[id] = wi;
    this.lastAge[id] = e.age;
  }

  end(): void {
    for (const l of this.layers.values()) {
      for (const mesh of [l.body, l.glow]) {
        if (!mesh) continue;
        mesh.count = l.n;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    this.trails.update(this.dt);
  }

  dispose(): void {
    for (const l of this.layers.values()) {
      for (const mesh of [l.body, l.glow]) {
        if (!mesh) continue;
        mesh.removeFromParent();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    }
    this.trails.dispose();
  }
}
