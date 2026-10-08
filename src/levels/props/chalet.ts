import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { gable, put, unitBox, unitCyl } from './farmKit';
import { glowMat, smat, ski } from './skiKit';

const C = ski.chalet;

/**
 * Yog'och uy: tosh poydevor, taxta devorlar (gorizontal chiziqlar), qorli ikki qiyali tom, mo'ri, eshik, yoritilgan derazalar.
 * `lodge` — katta (ayvon ustunlari bilan), `cabin` — kichik. size = [eni, balandligi, uzunligi]; eshik +z tomonda.
 */
export function createChalet(R: Rapier, o: Origin, def: PropDef, lodge: boolean): PropBuild {
  const [w, h, d] = def.size ?? (lodge ? C.lodgeSize : C.cabinSize);
  const log = smat('log', 0.9, 0.02);
  const logDark = smat('logDark', 0.9, 0.02);
  const snow = smat('snow', 0.75, 0.02);
  const stone = smat('stone', 0.95, 0.02);
  const g = new THREE.Group();
  put(g, unitBox(), stone, [0, C.foundation / 2, 0], [w + 0.3, C.foundation, d + 0.3]);
  put(g, unitBox(), log, [0, C.foundation + h / 2, 0], [w, h, d]);
  const courses = Math.floor(h / C.courseGap);
  for (let i = 1; i < courses; i++) {
    const y = C.foundation + i * C.courseGap;
    put(g, unitBox(), logDark, [0, y, 0], [w + 0.12, 0.08, d + 0.12]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, unitBox(), logDark, [sx * w / 2, C.foundation + h / 2, sz * d / 2], [0.4, h + 0.1, 0.4]);
  const rh = Math.min(w * C.roofPitch, C.roofMax);
  put(g, gable(w + C.eave, rh, d + C.eave), snow, [0, C.foundation + h, 0]);
  put(g, unitBox(), smat('roofWood', 0.9, 0.02), [0, C.foundation + h - 0.05, 0], [w + C.eave * 0.9, 0.12, d + C.eave * 0.9]);
  put(g, unitBox(), stone, [w * 0.28, C.foundation + h + rh * 0.55, -d * 0.2], [0.9, rh * 1.3 + 0.8, 0.9]);
  put(g, unitBox(), snow, [w * 0.28, C.foundation + h + rh * 1.2 + 0.5, -d * 0.2], [1.1, 0.18, 1.1]);
  put(g, unitBox(), logDark, [0, C.foundation + 1.15, d / 2 + 0.04], [1.5, 2.3, 0.12]);
  const glow = glowMat();
  const wins = Math.max(1, Math.floor(d / C.windowGap));
  for (let i = 0; i < wins; i++) {
    const z = -d / 2 + (d * (i + 0.5)) / wins;
    for (const sx of [-1, 1]) {
      put(g, unitBox(), glow, [sx * (w / 2 + 0.04), C.foundation + h * 0.55, z], [0.1, C.windowH, C.windowW]);
      put(g, unitBox(), logDark, [sx * (w / 2 + 0.02), C.foundation + h * 0.55, z], [0.08, C.windowH + 0.3, C.windowW + 0.3]);
    }
  }
  const front = Math.max(1, Math.floor(w / (C.windowGap * 1.3)));
  for (let i = 0; i < front; i++) {
    const x = w * ((i + 0.5) / front - 0.5);
    if (Math.abs(x) < 1.6) continue;
    put(g, unitBox(), glow, [x, C.foundation + h * 0.55, d / 2 + 0.04], [C.windowW, C.windowH, 0.1]);
  }
  if (lodge) {
    // Ayvon: tom va ustunlar (tomonda to'siq yo'q — kirish ochiq)
    put(g, unitBox(), snow, [0, C.foundation + C.porchH, d / 2 + C.porchD / 2], [w * 0.7, 0.25, C.porchD]);
    for (const sx of [-1, -0.33, 0.33, 1]) put(g, unitCyl(), logDark, [sx * w * 0.35, C.foundation + C.porchH / 2, d / 2 + C.porchD - 0.3], [0.16, C.porchH, 0.16]);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, (C.foundation + h) / 2, 0], [w / 2 + 0.15, (C.foundation + h) / 2, d / 2 + 0.15])] };
}
