import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo, stdMat } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { base, bmat, glow } from './baseKit';

const L = base.launch;

/** Relyefga yopishgan yassi disk/halqa (decal): flats ostida tekis. */
const disc = (key: string, inner: number): THREE.BufferGeometry =>
  cachedGeo(`pad.${key}`, () => new THREE.RingGeometry(inner, 1, 40).rotateX(-Math.PI / 2));

const decal = (key: string, color: string): THREE.MeshStandardMaterial =>
  stdMat(`base.decal.${key}`, color, 0.9, 0.05, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

/** Uchirish maydonchasi: beton disk, sariq halqa, alanga deflektori va xizmat minorasi (ustun + qo'llar). Statik, kollayderi — minora. */
export function createLaunchPad(R: Rapier, o: Origin): PropBuild {
  const g = new THREE.Group();
  const pad = decal('pad', '#6d7075');
  const hz = decal('hazard', base.colors.hazard);
  const steel = bmat('metalDark', 0.6, 0.55);
  const cube = unitBox();
  const r = L.padRadius;
  put(g, disc('fill', 0), pad, [0, 0.07, 0], [r, 1, r]).castShadow = false;
  put(g, disc('ring', 0.9), hz, [0, 0.09, 0], [r * 0.93, 1, r * 0.93]).castShadow = false;
  put(g, cube, bmat('black', 0.9, 0.1), [0, 0.12, 0], [4.2, 0.1, 4.2]);
  const mx = L.mastOffset;
  const h = L.mastH;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, cube, steel, [mx + sx * 0.9, h / 2, sz * 0.9], [0.22, h, 0.22]);
  for (let y = 3; y < h; y += 3.2) {
    put(g, cube, steel, [mx, y, 0.9], [1.8, 0.14, 0.14]);
    put(g, cube, steel, [mx, y, -0.9], [1.8, 0.14, 0.14]);
    put(g, cube, steel, [mx, y + 1.5, 0.9], [1.8, 0.1, 0.1]).rotation.z = 0.7;
    put(g, cube, steel, [mx, y + 1.5, -0.9], [1.8, 0.1, 0.1]).rotation.z = -0.7;
  }
  for (const y of [h * 0.45, h * 0.78]) put(g, cube, steel, [mx / 2 + 0.2, y, 0], [mx - 1.5, 0.3, 0.5]);
  put(g, cube, glow('red'), [mx, h + 0.4, 0], [0.5, 0.5, 0.5]);
  for (let a = 0; a < 6; a++) {
    const t = (a / 6) * Math.PI * 2;
    put(g, cube, glow('amber'), [Math.cos(t) * r * 0.93, 0.14, Math.sin(t) * r * 0.93], [0.5, 0.1, 0.5]);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [mx, h / 2, 0], [1.1, h / 2, 1.1])] };
}

/** Terminal (konsol) va uning oldidagi bosim plitasi: konsol — kollayder (otiladi), plita — dekor (ustidan o'tilsa ishga tushadi). yaw: old tomon (+z). */
export function createTerminal(R: Rapier, o: Origin): PropBuild {
  const T = L.terminal;
  const cube = unitBox();
  const g = new THREE.Group();
  const shell = bmat('metal', 0.5, 0.5);
  put(g, cube, bmat('concreteDark', 0.9, 0.05), [0, 0.15, 0], [T.w + 0.6, 0.3, T.d + 0.6]);
  put(g, cube, shell, [0, T.h / 2 + 0.3, 0], [T.w, T.h, T.d]);
  const top = put(g, cube, bmat("black", 0.4, 0.4), [0, T.h + 0.3, T.d * 0.1], [T.w, 0.1, T.d * 0.8]);
  top.rotation.x = 0.35;
  put(g, cube, glow("cyan"), [-T.w * 0.25, T.h + 0.38, T.d * 0.12], [0.5, 0.05, 0.3]).rotation.x = 0.35;
  const plate = decal('plate', base.colors.hazard);
  put(g, cube, plate, [0, 0.06, T.plateOffset], [T.plateHalf * 2, 0.08, T.plateHalf * 2]).castShadow = false;
  put(g, cube, decal('plateIn', '#2a2c30'), [0, 0.1, T.plateOffset], [T.plateHalf * 2 - 0.9, 0.06, T.plateHalf * 2 - 0.9]).castShadow = false;
  put(g, cube, glow('red'), [0, 0.14, T.plateOffset], [T.plateHalf * 0.8, 0.04, T.plateHalf * 0.8]).castShadow = false;
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, (T.h + 0.3) / 2, 0], [T.w / 2, (T.h + 0.3) / 2, T.d / 2])] };
}
