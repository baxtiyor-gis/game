import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** [z, y, burchak radiusi]. Lokal +Z = old; profil yon ko'rinishda (Z gorizontal, Y vertikal). */
export type Pt = [number, number, number?];

/** Burchaklari yumaloqlangan ko'pburchak (quadratic egri chiziqlar). */
export function polyShape(pts: Pt[]): THREE.Shape {
  const n = pts.length;
  const ends: Array<[THREE.Vector2, THREE.Vector2]> = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Vector2(pts[i]![0], pts[i]![1]);
    const a = new THREE.Vector2(pts[(i + n - 1) % n]![0], pts[(i + n - 1) % n]![1]);
    const c = new THREE.Vector2(pts[(i + 1) % n]![0], pts[(i + 1) % n]![1]);
    const r = pts[i]![2] ?? 0;
    if (r <= 0) {
      ends.push([b, b]);
      continue;
    }
    const da = a.clone().sub(b);
    const dc = c.clone().sub(b);
    const ra = Math.min(r, da.length() * 0.5);
    const rc = Math.min(r, dc.length() * 0.5);
    ends.push([b.clone().add(da.normalize().multiplyScalar(ra)), b.clone().add(dc.normalize().multiplyScalar(rc))]);
  }
  const s = new THREE.Shape();
  s.moveTo(ends[0]![1].x, ends[0]![1].y);
  for (let i = 1; i <= n; i++) {
    const k = i % n;
    const [st, en] = ends[k]!;
    s.lineTo(st.x, st.y);
    if (st !== en) s.quadraticCurveTo(pts[k]![0], pts[k]![1], en.x, en.y);
  }
  return s;
}

export interface ExtrudeOpts {
  bevel?: number; // qirra yumaloqligi (m)
  segments?: number; // egri chiziq bo'laklari
  bs?: number; // bevel segmentlari (default 2)
  /** Eni bo'yicha deformatsiya: (x, y, z) -> x ko'paytuvchisi. */
  taper?: (y: number, z: number) => number;
}

/** Yon profilni X bo'ylab `width` ga cho'zadi (X markazda). Shape-x -> dunyo Z, shape-y -> Y. */
export function sideExtrude(pts: Pt[], width: number, o: ExtrudeOpts = {}): THREE.BufferGeometry {
  const b = o.bevel ?? 0.05;
  const geo = new THREE.ExtrudeGeometry(polyShape(pts), {
    depth: Math.max(0.001, width - 2 * b),
    bevelEnabled: b > 0,
    bevelSize: b,
    bevelThickness: b,
    bevelOffset: -b,
    bevelSegments: o.bs ?? 2,
    curveSegments: o.segments ?? 2,
    steps: 1,
  });
  geo.translate(0, 0, -(width - 2 * b) / 2);
  geo.rotateY(-Math.PI / 2); // shape-x -> +Z, extrude -> X
  if (o.taper) {
    const p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * o.taper(p.getY(i), p.getZ(i)));
  }
  return toCreasedNormals(geo, 0.6);
}

/** Yaxlit (yumaloq qirrali) quti. */
export function roundBox(w: number, h: number, d: number, r = 0.04): THREE.BufferGeometry {
  const b = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(-w / 2 + b, -h / 2 + b).lineTo(w / 2 - b, -h / 2 + b).lineTo(w / 2 - b, h / 2 - b).lineTo(-w / 2 + b, h / 2 - b).closePath(), {
    depth: Math.max(0.001, d - 2 * b),
    bevelEnabled: true,
    bevelSize: b,
    bevelThickness: b,
    bevelSegments: 1,
    steps: 1,
  });
  geo.translate(0, 0, -(d - 2 * b) / 2);
  return geo;
}

/** Z o'qi bo'ylab silindr (stvol, far, quvur). */
export function cylZ(r0: number, r1: number, len: number, seg = 8): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.rotateX(Math.PI / 2); // +Y -> +Z; r1 old tomonda
  return g;
}

/** X o'qi bo'ylab silindr. */
export function cylX(r: number, len: number, seg = 10): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Y o'qi atrofida aylanish profili (LatheGeometry), [radius, y] juftliklari. */
export function lathe(profile: Array<[number, number]>, seg = 16): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
}

/** Quyi chetida g'ildirak gumbazlari kesilgan kuzov kontur nuqtalari (orqadan oldinga). */
export function archedBottom(yBottom: number, arches: Array<{ z: number; yc: number; r: number }>, zMin: number, zMax: number): Pt[] {
  const pts: Pt[] = [[zMin, yBottom]];
  const sorted = [...arches].sort((a, b) => a.z - b.z);
  for (const a of sorted) {
    const dy = yBottom - a.yc;
    if (dy >= a.r) continue;
    const d = Math.sqrt(a.r * a.r - dy * dy);
    const a0 = Math.atan2(dy, -d);
    const a1 = Math.atan2(dy, d);
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = a0 + ((a1 - a0 + (a1 < a0 ? 0 : -2 * Math.PI)) * i) / steps;
      pts.push([a.z + a.r * Math.cos(t), a.yc + a.r * Math.sin(t)]);
    }
  }
  pts.push([zMax, yBottom]);
  return pts;
}

/** Oddiy quti (12 uchburchak) — ko'p takrorlanadigan ingichka detallar uchun. */
export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

/** Y o'qi bo'ylab silindr (disk, plita). */
export function cylY(r: number, len: number, seg = 12): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(r, r, len, seg, 1);
}
