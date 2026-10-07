import * as THREE from 'three';
import type { VehicleHandle } from '../../core/types';
import { vsp } from './params';

export interface FxOpts {
  /** item tugaganda dispose qilinadigan geometriyalar (umumiylarni bermang) */
  geos?: THREE.BufferGeometry[];
  /** life ning shu ulushidan boshlab materiallar shaffoflashadi; berilmasa so'nmaydi */
  fadeStart?: number;
  /** mashinaga yopishib yuradi (render interpolatsiyalangan pozitsiya) */
  follow?: { v: VehicleHandle; offset: THREE.Vector3; rotate?: boolean };
  /** har kadr: k = yosh/umr (0..1) */
  update?: (k: number, dt: number, item: FxItem) => void;
  /** false qaytarsa item darhol olib tashlanadi */
  alive?: () => boolean;
}

export interface FxItem {
  readonly obj: THREE.Object3D;
  readonly life: number;
  age: number;
  readonly opts: FxOpts;
  readonly mats: THREE.Material[];
  readonly base: number[];
}

const tmp = new THREE.Vector3();

/** Maxsus qurol vizuallari: qisqa muddatli emissive obyektlar (halqa, nur, olov, shar), umr/so'nish/yopishish bilan. */
export class SpecialFx {
  private items: FxItem[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  get count(): number {
    return this.items.length;
  }

  add(obj: THREE.Object3D, life: number, opts: FxOpts = {}): FxItem {
    if (this.items.length >= vsp.fx.max) this.remove(this.items[0]);
    const mats: THREE.Material[] = [];
    obj.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (m) for (const x of Array.isArray(m) ? m : [m]) if (!mats.includes(x)) mats.push(x);
    });
    const item: FxItem = { obj, life, age: 0, opts, mats, base: mats.map((m) => m.opacity) };
    this.scene.add(obj);
    this.items.push(item);
    this.apply(item, 0);
    return item;
  }

  update(rawDt: number): void {
    const dt = Math.min(rawDt, vsp.fx.maxDt); // kadr sakrashida (tab/past FPS) effektlar bir zumda yo'qolmasin
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      this.apply(it, dt);
      if (it.age >= it.life || it.opts.alive?.() === false) this.remove(it);
    }
  }

  clear(): void {
    for (const it of [...this.items]) this.remove(it);
  }

  dispose(): void {
    this.clear();
  }

  private apply(it: FxItem, dt: number): void {
    const k = Math.min(1, it.age / it.life);
    const f = it.opts.follow;
    if (f) {
      const o = f.v.object;
      tmp.copy(f.offset);
      if (f.rotate) {
        tmp.applyQuaternion(o.quaternion);
        it.obj.quaternion.copy(o.quaternion);
      }
      it.obj.position.copy(o.position).add(tmp);
    }
    it.opts.update?.(k, dt, it);
    const fs = it.opts.fadeStart;
    if (fs === undefined) return;
    const m = k < fs ? 1 : Math.max(0, 1 - (k - fs) / Math.max(1e-3, 1 - fs));
    it.mats.forEach((mat, i) => (mat.opacity = it.base[i] * m));
  }

  private remove(it: FxItem): void {
    const i = this.items.indexOf(it);
    if (i >= 0) this.items.splice(i, 1);
    this.scene.remove(it.obj);
    for (const m of it.mats) m.dispose();
    for (const g of it.opts.geos ?? []) g.dispose();
  }
}
