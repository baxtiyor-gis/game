import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { dam, dmat, strut } from './damKit';

const P = dam.pylon;
const up = new THREE.Vector3(0, 1, 0);

/** Ustun tepasidagi sim bog'lanish nuqtalari (dunyo): har ikki yelkada, ikki balandlikda, 4 tadan; yaw bilan aylangan. */
function attachPoints(x: number, baseY: number, z: number, yaw: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const ay of P.arms) {
    for (const sx of [-1, 1]) out.push(new THREE.Vector3(sx * P.armHalf, baseY + ay - P.insulator + 0.1, 0).applyAxisAngle(up, yaw).add(new THREE.Vector3(x, 0, z)));
  }
  return out;
}

/** Sim: a dan b gacha cho'kuvchi (parabola) egri chiziq, ingichka silindrlar zanjiri. */
function wire(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const m = dmat('wire', 0.6, 0.3);
  let prev = a.clone();
  for (let i = 1; i <= P.wireSegs; i++) {
    const t = i / P.wireSegs;
    const p = a.clone().lerp(b, t);
    p.y -= P.sag * 4 * t * (1 - t);
    g.add(strut(prev, p, P.wireR, m));
    prev = p;
  }
}

/**
 * Yuqori kuchlanish panjara ustuni: 4 qiya oyoq, kesishgan taqsimlar, ikki qavat yelka, chinni izolyatorlar.
 * `points[0]` bo'lsa — shu joydagi (bir xil yaw li) keyingi ustunga 4 ta sim tortiladi. Kollayder: asos ustuni.
 */
export function createPowerPylon(R: Rapier, o: Origin, def: PropDef, heightAt: (x: number, z: number) => number): PropBuild {
  const steel = dmat('steel', 0.55, 0.5);
  const dark = dmat('steelDark', 0.6, 0.5);
  const porcelain = dmat('porcelain', 0.35, 0.1);
  const g = new THREE.Group();
  const base = P.base / 2;
  const top = P.top / 2;
  const legs: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const a = new THREE.Vector3(sx * base, -0.5, sz * base);
      const b = new THREE.Vector3(sx * top, P.height, sz * top);
      legs.push([a, b]);
      g.add(strut(a, b, 0.14, steel));
    }
  }
  // Kesishgan taqsimlar (X) har oraliqda
  for (let k = 0; k < 4; k++) {
    const t0 = k / 4;
    const t1 = (k + 1) / 4;
    const at = (leg: [THREE.Vector3, THREE.Vector3], t: number): THREE.Vector3 => leg[0].clone().lerp(leg[1], t);
    const [l0, l1, l2, l3] = legs as [typeof legs[0], typeof legs[0], typeof legs[0], typeof legs[0]];
    for (const [pa, pb] of [[l0, l1], [l2, l3], [l0, l2], [l1, l3]] as const) {
      g.add(strut(at(pa, t0), at(pb, t1), 0.07, dark));
      g.add(strut(at(pb, t0), at(pa, t1), 0.07, dark));
    }
  }
  // Yelkalar va izolyatorlar
  P.arms.forEach((ay) => {
    put(g, unitBox(), steel, [0, ay, 0], [P.armHalf * 2, 0.22, 0.22]);
    for (const sx of [-1, 1]) put(g, unitBox(), porcelain, [sx * P.armHalf, ay - P.insulator / 2 + 0.1, 0], [0.22, P.insulator, 0.22]);
  });
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;

  const root = new THREE.Group();
  root.add(g);
  const next = def.points?.[0];
  if (next) {
    const from = attachPoints(o.x, o.y, o.z, o.yaw);
    const to = attachPoints(next[0], heightAt(next[0], next[1]), next[1], o.yaw);
    from.forEach((a, i) => wire(root, a, to[i]!));
  }
  return { object: root, colliders: [box(R, o, [0, P.colliderH / 2, 0], [P.collider, P.colliderH / 2, P.collider])] };
}
