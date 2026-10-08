import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, placed } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { smat, ski } from './skiKit';

const J = ski.ramp;

/**
 * Chang'i trampleni: yer sathidan boshlanib ko'tariladigan qiya plita (yurish yo'nalishi — lokal +z) va oxirida tik devor.
 * size = [eni, balandligi, uzunligi]. Mashina plita bo'ylab ko'tarilib, uchida havoga uchadi.
 * Plita yuzasi: z=0 da y=0 dan z=L da y=H gacha; kollayder — shu yuza ostidagi qiya kuboid (qalinligi `thick`).
 */
export function createSkiJump(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, H, L] = def.size ?? J.size;
  const a = Math.atan2(H, L);
  const len = Math.hypot(L, H);
  const nz = -Math.sin(a);
  const ny = Math.cos(a);
  const cz = L / 2 - nz * (J.thick / 2);
  const cy = H / 2 - ny * (J.thick / 2) - J.sink;
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -a);
  const g = new THREE.Group();
  const slab = put(g, unitBox(), smat('ramp', 0.5, 0.02), [0, cy, cz], [w, J.thick, len], [-a, 0, 0]);
  slab.receiveShadow = true;
  for (const sx of [-1, 1]) {
    // Yon taxtalar (qizil-oq), plita bo'ylab
    put(g, unitBox(), smat('rampRail', 0.7, 0.05), [sx * (w / 2 + 0.12), cy + J.rail / 2, cz], [0.24, J.thick + J.rail, len], [-a, 0, 0]);
  }
  const wallH = H - J.sink - J.wallCut;
  put(g, unitBox(), smat('rampWood', 0.9, 0.02), [0, wallH / 2, L - 0.25], [w - 0.4, wallH, 0.5]);
  for (let i = 1; i <= J.posts; i++) {
    const t = i / (J.posts + 1);
    const hh = H * t - J.sink - J.thick;
    if (hh <= 0.2) continue;
    for (const sx of [-1, 1]) put(g, unitBox(), smat('rampWood', 0.9, 0.02), [sx * (w / 2 - 0.3), hh / 2, L * t], [0.3, hh, 0.3]);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const colliders = [
    placed(R.ColliderDesc.cuboid(w / 2, J.thick / 2, len / 2), o, [0, cy, cz], rot),
    box(R, o, [0, wallH / 2, L - 0.25], [w / 2, wallH / 2, 0.25]),
  ];
  return { object: g, colliders };
}
