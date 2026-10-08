import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild, Vec3 } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { amat, taperCyl } from './airKit';
import cfg from '../../../data/levels/crane.json';

export type LoadKind = keyof typeof cfg.loads;
/** Yuk ustidan spreader qalinligi (m) */
export const HANG = 0.4;
export const loadSize = (kind: string): Vec3 => (cfg.loads[kind as LoadKind] ?? cfg.loads.container).size as Vec3;

/** Portal (gantry) kran: ikkita A-shaklli tayanch, uzun to'sin, aravacha. To'sin x bo'ylab; mashinalar z bo'ylab tagidan o'tadi. */
export function createCraneStructure(R: Rapier, o: Origin): PropBuild {
  const { span, height: H, column: cw, braceZ, beamHeight, beamDepth } = cfg;
  const body = amat('craneBody', 0.55, 0.45);
  const dark = amat('craneDark', 0.7, 0.45);
  const concrete = amat('concreteDark', 0.95, 0.02);
  const cube = unitBox();
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  for (const sx of [1, -1]) {
    const x = (sx * span) / 2;
    put(g, cube, concrete, [x, 0.35, 0], [cw * 3.4, 0.7, braceZ * 2 + cw * 3]);
    for (const sz of [1, -1]) {
      put(g, cube, body, [x, H / 2, sz * braceZ], [cw, H, cw]);
      colliders.push(box(R, o, [x, H / 2, sz * braceZ], [cw / 2, H / 2, cw / 2]));
      for (const wz of [-1.2, 1.2]) put(g, cachedGeo('craneWheel', () => new THREE.CylinderGeometry(0.55, 0.55, 0.5, 12)), dark, [x, 0.9, sz * braceZ + wz], [1, 1, 1], [0, 0, Math.PI / 2]);
    }
    const len = Math.hypot(braceZ * 2, H * 0.55);
    for (const k of [0.15, 0.55]) {
      put(g, cube, dark, [x, H * (k + 0.2), 0], [0.25, len, 0.25], [Math.atan2(braceZ * 2, H * 0.55), 0, 0]);
      put(g, cube, dark, [x, H * (k + 0.2), 0], [0.25, len, 0.25], [-Math.atan2(braceZ * 2, H * 0.55), 0, 0]);
    }
    put(g, cube, dark, [x, H * 0.5, 0], [0.35, 0.35, braceZ * 2]);
    put(g, cube, body, [x, H + 0.4, 0], [cw * 1.6, 0.8, braceZ * 2 + cw]);
  }
  put(g, cube, body, [0, H + beamHeight / 2, 0], [span + 5, beamHeight, beamDepth]);
  put(g, cube, dark, [0, H + beamHeight + 0.2, 0], [span + 5, 0.4, beamDepth * 0.4]);
  for (let x = -span / 2 + 1; x < span / 2; x += 4) put(g, cube, dark, [x, H + beamHeight / 2, 0], [0.3, beamHeight + 0.1, beamDepth + 0.1]);
  put(g, cube, dark, [0, H + beamHeight + 1.0, 0], [3.4, 1.2, beamDepth * 0.9]);
  put(g, cube, amat('towerGlass', 0.15, 0.6), [-span / 2 - 1.6, H - 3, braceZ + 0.4], [2.2, 2.2, 2.2]);
  put(g, cube, dark, [-span / 2 - 1.6, H - 4.2, braceZ + 0.4], [2.6, 0.2, 2.6]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}

/** Osma yuk: konteyner yoki dvigatel + yuk ko'targich (spreader) va ilgak. Markaz = yuk markazi. */
export function createLoadModel(kind: string): THREE.Group {
  const def = cfg.loads[kind as LoadKind] ?? cfg.loads.container;
  const [w, h, d] = def.size as Vec3;
  const main = amat(def.color, 0.7, 0.3);
  const dark = amat('craneDark', 0.7, 0.45);
  const yellow = amat('craneBody', 0.55, 0.45);
  const cube = unitBox();
  const g = new THREE.Group();
  if (kind === 'engine') {
    put(g, unitCyl(), amat('aluDark', 0.4, 0.7), [0, 0, 0], [w / 2, d, w / 2], [Math.PI / 2, 0, 0]);
    put(g, unitCyl(), dark, [0, 0, d / 2 + 0.02], [w / 2 - 0.2, 0.1, w / 2 - 0.2], [Math.PI / 2, 0, 0]);
    put(g, taperCyl(0.6), dark, [0, 0, -d / 2 - 0.5], [w / 2 - 0.3, 1.0, w / 2 - 0.3], [-Math.PI / 2, 0, 0]);
    for (const z of [-2, 0, 2]) put(g, unitCyl(), main, [0, 0, z], [w / 2 + 0.08, 0.35, w / 2 + 0.08], [Math.PI / 2, 0, 0]);
  } else {
    put(g, cube, main, [0, 0, 0], [w, h, d]);
    for (let z = -d / 2 + 0.5; z < d / 2; z += 0.6) for (const s of [1, -1]) put(g, cube, dark, [s * (w / 2 + 0.03), 0, z], [0.08, h * 0.92, 0.12]);
    put(g, cube, yellow, [0, 0, d / 2 + 0.03], [w * 0.9, h * 0.9, 0.08]);
    put(g, cube, dark, [0, 0, d / 2 + 0.07], [0.12, h * 0.9, 0.06]);
  }
  put(g, cube, yellow, [0, h / 2 + HANG / 2, 0], [w + 0.4, HANG, d * 0.8]);
  put(g, cube, dark, [0, h / 2 + HANG + cfg.hookHeight / 2, 0], [0.7, cfg.hookHeight, 0.7]);
  return g;
}
