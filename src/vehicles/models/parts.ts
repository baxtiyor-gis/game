import * as THREE from 'three';
import { Kit } from './kit';
import { amber, chrome, gunmetal, lamp, steel, tail, trim, matte } from './palette';
import { box, cylX, cylZ, roundBox } from './shapes';

/** Dumaloq faralar juftligi (old tomonga qaragan), xrom hoshiyali. */
export function roundHeadlights(k: Kit, x: number, y: number, z: number, r: number): void {
  k.pair(() => cylZ(r, r, 0.05, 10), lamp(), { p: [x, y, z + 0.02] });
  k.pair(() => cylZ(r * 1.18, r * 1.18, 0.05, 10), chrome(), { p: [x, y, z - 0.005] });
}

/** To'rtburchak faralar (kengroq, muscle car). */
export function squareHeadlights(k: Kit, x: number, y: number, z: number, w: number, h: number): void {
  k.pair(() => roundBox(w, h, 0.06, 0.02), lamp(), { p: [x, y, z + 0.015] });
  k.pair(() => roundBox(w * 1.14, h * 1.18, 0.05, 0.02), chrome(), { p: [x, y, z - 0.015] });
}

/** Orqa chiroqlar (qizil) + oq/amber burilish ko'rsatkichi. */
export function tailLights(k: Kit, x: number, y: number, z: number, w: number, h: number): void {
  k.pair(() => roundBox(w, h, 0.06, 0.02), tail(), { p: [x, y, z - 0.02] });
  k.pair(() => box(w * 0.5, h * 0.35, 0.05), amber(), { p: [x, y - h * 0.8, z - 0.02] });
}

/** Xrom bamper (to'liq kenglik) + ikki "bomba" (bullet) tayanch. */
export function bumper(k: Kit, w: number, y: number, z: number, h = 0.13, front = true): void {
  const d = 0.14;
  const dir = front ? 1 : -1;
  k.add(roundBox(w, h, d, 0.04), chrome(), { p: [0, y, z + dir * d * 0.3] });
  k.pair(() => roundBox(w * 0.1, h * 1.15, d * 1.4, 0.03), chrome(), { p: [w * 0.34, y, z + dir * d * 0.4] });
}

/** Radiator panjara: qora fon + gorizontal xrom plankalar. */
export function grille(k: Kit, w: number, h: number, y: number, z: number, bars = 3): void {
  k.add(roundBox(w, h, 0.06, 0.015), trim(), { p: [0, y, z] });
  for (let i = 0; i < bars; i++) {
    const yy = y + h * (0.32 - (0.64 * i) / Math.max(1, bars - 1));
    k.add(box(w * 0.92, h * 0.07, 0.05), chrome(), { p: [0, yy, z + 0.03] });
  }
}

export function mirrors(k: Kit, x: number, y: number, z: number): void {
  k.pair(() => box(0.1, 0.1, 0.05), chrome(), { p: [x, y, z] });
  k.pair(() => cylX(0.012, 0.12, 5), trim(), { p: [x - 0.05, y - 0.05, z] });
}

export function exhausts(k: Kit, x: number, y: number, z: number, r = 0.045): void {
  k.pair(() => cylZ(r, r, 0.28, 8), chrome(), { p: [x, y, z - 0.08] });
  k.pair(() => cylZ(r * 0.6, r * 0.6, 0.29, 6), trim(), { p: [x, y, z - 0.09] });
}

/** Eshik chiziqlari va tutqichlar (yon tomonlarda, x = kuzov chetidan biroz tashqarida). */
export function doors(k: Kit, x: number, y0: number, y1: number, zs: number[], handleZ: number[]): void {
  const hh = y1 - y0;
  for (const z of zs) k.pair(() => box(0.015, hh, 0.012), trim(), { p: [x, (y0 + y1) / 2, z] });
  for (const z of handleZ) k.pair(() => box(0.02, 0.025, 0.13), chrome(), { p: [x + 0.005, y1 - hh * 0.12, z] });
}

/** Kapot ustidagi ikkita pulemyot stvoli (Vigilante 8 ruhi). */
export function hoodGuns(k: Kit, x: number, y: number, z: number, len = 0.7): void {
  k.pair(() => roundBox(0.12, 0.09, 0.22, 0.02), gunmetal(), { p: [x, y, z] });
  k.pair(() => cylZ(0.028, 0.028, len, 6), gunmetal(), { p: [x, y + 0.005, z + len / 2] });
  k.pair(() => cylZ(0.04, 0.04, 0.09, 6), steel(), { p: [x, y + 0.005, z + len] });
}

/** Tom ustidagi raketa podi: 2x2 quvur. */
export function rocketPod(k: Kit, x: number, y: number, z: number, len = 0.8, color = '#4a5a3a', sc = 1): void {
  const b = 0.38 * sc;
  k.add(roundBox(b, b * 0.8, len, 0.03), matte(color), { p: [x, y, z] });
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      k.add(cylZ(0.075 * sc, 0.075 * sc, 0.1, 6), trim(), { p: [x + sx * b * 0.24, y + sy * b * 0.2, z + len / 2 + 0.03] });
      k.add(cylZ(0.04, 0.0, 0.1, 5), amber(), { p: [x + sx * b * 0.24, y + sy * b * 0.2, z + len / 2 - 0.03] });
    }
  }
  k.add(box(0.1, 0.12, 0.2), gunmetal(), { p: [x, y - b * 0.46, z - len * 0.1] });
}

/** Antenna (nozik tayoq). */
export function antenna(k: Kit, x: number, y: number, z: number, len = 0.8): void {
  k.add(new THREE.CylinderGeometry(0.01, 0.014, len, 5), steel(), { p: [x, y + len / 2, z], r: [0, 0, -0.08] });
}

/** a -> b oralig'idagi quvur (rollkletka, ramka). */
export function tube(k: Kit, a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material, seg = 6): void {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  const m = va.add(vb).multiplyScalar(0.5);
  k.add(g, mat, { p: [m.x, m.y, m.z] });
}

/** Yon profil bo'ylab (z, y) yupqa chiziq (poygalar, kapot polosalari). */
export function stripe(k: Kit, pts: Array<[number, number]>, x: number, w: number, mat: THREE.Material, lift = 0.01): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [z0, y0] = pts[i]!;
    const [z1, y1] = pts[i + 1]!;
    const len = Math.hypot(z1 - z0, y1 - y0);
    k.add(box(w, 0.012, len + 0.03), mat, { p: [x, (y0 + y1) / 2 + lift, (z0 + z1) / 2], r: [-Math.atan2(y1 - y0, z1 - z0), 0, 0] });
  }
}

/** Zaxira g'ildirak / disk shaklidagi dumaloq plastina (orqa eshikda). */
export function spareTire(k: Kit, x: number, y: number, z: number, r: number): void {
  k.add(cylZ(r, r, 0.22, 14), trim(), { p: [x, y, z] });
  k.add(cylZ(r * 0.55, r * 0.55, 0.24, 10), steel(), { p: [x, y, z] });
}
