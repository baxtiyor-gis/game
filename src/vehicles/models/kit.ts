import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VehicleDef } from '../../core/types';
import { wheelLayout } from '../layout';
import type { WheelSpec } from '../layout';

export type V3 = [number, number, number];
export interface Placement {
  p?: V3; // joy
  r?: V3; // burilish (rad, XYZ)
  s?: V3; // masshtab
}
export interface Part {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();

/** Mashina qismlarini yig'ib, material bo'yicha bitta mesh'ga birlashtiradi (draw call kam). */
export class Kit {
  readonly w: number;
  readonly h: number;
  readonly l: number;
  readonly wheels: WheelSpec[];
  private readonly groups = new Map<THREE.Material, THREE.BufferGeometry[]>();

  constructor(readonly def: VehicleDef) {
    [this.w, this.h, this.l] = def.size;
    this.wheels = wheelLayout(def);
  }

  /** Geometriyani materialga qo'shadi (geo o'zgartiriladi; qayta ishlatmang). */
  add(geo: THREE.BufferGeometry, mat: THREE.Material, pl: Placement = {}): this {
    const [x, y, z] = pl.p ?? [0, 0, 0];
    const [rx, ry, rz] = pl.r ?? [0, 0, 0];
    const [sx, sy, sz] = pl.s ?? [1, 1, 1];
    q.setFromEuler(e.set(rx, ry, rz));
    geo.applyMatrix4(m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)));
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    g.clearGroups();
    const list = this.groups.get(mat) ?? [];
    list.push(g);
    this.groups.set(mat, list);
    return this;
  }

  /** Chap/o'ng juftlik: p.x musbat; o'ng tomon uchun y/z burilishi teskari. `make` har safar yangi geometriya qaytaradi. */
  pair(make: () => THREE.BufferGeometry, mat: THREE.Material, pl: Placement = {}): this {
    const [x, y, z] = pl.p ?? [0, 0, 0];
    const [rx, ry, rz] = pl.r ?? [0, 0, 0];
    this.add(make(), mat, { ...pl, p: [x, y, z], r: [rx, ry, rz] });
    return this.add(make(), mat, { ...pl, p: [-x, y, z], r: [rx, -ry, -rz] });
  }

  /** Kuzov g'ildirak gumbazlari (o'q z, markaz yc, radius r). */
  arches(scale = 1.2): Array<{ z: number; yc: number; r: number }> {
    return this.wheels
      .filter((s) => s.x > 0)
      .map((s) => ({ z: s.z, yc: s.y - s.restLength, r: s.radius * scale }));
  }

  /** G'ildirak markazining dam olish holatidagi balandligi. */
  get wheelY(): number {
    const s = this.wheels[0]!;
    return s.y - s.restLength;
  }

  /** Yer sathi (dam olish holatida g'ildirak tagi). */
  get ground(): number {
    return this.wheelY - this.wheels[0]!.radius;
  }

  /** Kuzov tubi: yerdan `clearance` m yuqorida. */
  sill(clearance: number): number {
    return this.ground + clearance;
  }

  parts(): Part[] {
    const out: Part[] = [];
    for (const [mat, list] of this.groups) {
      const geo = mergeGeometries(list, false);
      if (geo) out.push({ geo, mat });
    }
    return out;
  }
}

export const triCount = (parts: Part[]): number => parts.reduce((n, p) => n + p.geo.getAttribute('position').count / 3, 0);
