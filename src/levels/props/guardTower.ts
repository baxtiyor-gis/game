import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { base, bmat, glow } from './baseKit';

const T = base.tower;

/** Chiroq (qidiruv proyektori) balandligi: yerdan, m */
export const towerLampHeight = (): number => T.legH + 0.3 + T.cabH + 0.3 + 0.85;

/** Ko'cha chirog'i: ustun va yorqin panel (kechki yoritish uchun porlaydi). */
export function createLampPost(R: Rapier, o: Origin): PropBuild {
  const g = new THREE.Group();
  const pole = bmat('metalDark', 0.6, 0.5);
  put(g, unitCyl(), pole, [0, base.lamp.height / 2, 0], [0.16, base.lamp.height, 0.16]);
  put(g, unitBox(), pole, [base.lamp.arm / 2, base.lamp.height, 0], [base.lamp.arm, 0.14, 0.2]);
  put(g, unitBox(), glow('lamp'), [base.lamp.arm, base.lamp.height - 0.12, 0], [1.0, 0.1, 0.6]);
  put(g, unitCyl(), bmat('concreteDark', 0.9, 0.05), [0, 0.3, 0], [0.45, 0.6, 0.45]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, base.lamp.height / 2, 0], [0.3, base.lamp.height / 2, 0.3])] };
}

/** Qo'riqlash minorasi: 4 ta tayanch, o'zaro bog'langan, ustida kabina, tom va proyektor chirog'i. */
export function createGuardTower(R: Rapier, o: Origin): PropBuild {
  const frame = bmat('metalDark', 0.6, 0.5);
  const wall = bmat('olive', 0.85, 0.15);
  const roof = bmat('oliveDark', 0.8, 0.2);
  const cube = unitBox();
  const g = new THREE.Group();
  const h = T.legH;
  const s = T.legSpan / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) put(g, cube, frame, [sx * s, h / 2, sz * s], [T.leg, h, T.leg]);
  }
  for (const k of [0.3, 0.65]) {
    for (const sx of [-1, 1]) put(g, cube, frame, [sx * s, h * k, 0], [0.18, 0.18, T.legSpan * 1.4]).rotation.x = k > 0.5 ? 0.6 : -0.6;
    for (const sz of [-1, 1]) put(g, cube, frame, [0, h * k, sz * s], [T.legSpan * 1.4, 0.18, 0.18]).rotation.z = k > 0.5 ? -0.6 : 0.6;
  }
  put(g, cube, frame, [0, h + 0.15, 0], [T.legSpan + 1.6, 0.3, T.legSpan + 1.6]);
  for (const sx of [-1, 1]) {
    put(g, cube, frame, [sx * (s + 0.6), h + 0.75, 0], [0.1, 1.0, T.legSpan + 1.6]);
    put(g, cube, frame, [0, h + 0.75, sx * (s + 0.6)], [T.legSpan + 1.6, 1.0, 0.1]);
  }
  put(g, unitCyl(), frame, [0, h * 0.5, s + 0.9], [0.1, h, 0.1]);
  const cabY = h + 0.3 + T.cabH / 2;
  put(g, cube, wall, [0, cabY, 0], [T.legSpan - 0.2, T.cabH, T.legSpan - 0.2]);
  put(g, cube, glow('amber'), [0, cabY + 0.2, s - 0.08], [T.legSpan * 0.6, 0.6, 0.1]);
  put(g, cube, roof, [0, h + 0.3 + T.cabH + 0.15, 0], [T.legSpan + 0.8 + T.roofOver, 0.3, T.legSpan + 0.8 + T.roofOver]);
  const lampY = h + 0.3 + T.cabH + 0.3;
  put(g, cube, frame, [0, lampY + 0.2, 0], [0.5, 0.4, 0.5]);
  put(g, cube, bmat('metal', 0.4, 0.7), [0, lampY + 0.85, 0], [1.1, 0.9, 1.1]);
  for (const sg of [-1, 1]) {
    put(g, cube, glow('lamp'), [0, lampY + 0.85, sg * 0.58], [0.8, 0.65, 0.06]);
    put(g, cube, glow('lamp'), [sg * 0.58, lampY + 0.85, 0], [0.06, 0.65, 0.8]);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const colliders = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(R, o, [sx * s, h / 2, sz * s], [T.leg / 2 + 0.05, h / 2, T.leg / 2 + 0.05])));
  return { object: g, colliders };
}
