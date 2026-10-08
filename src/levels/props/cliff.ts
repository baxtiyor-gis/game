import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { placed } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { dam, dmat, hash2 } from './damKit';

const C = dam.cliff;
const BANDS = ['rock1', 'rock2', 'rock3', 'rock4'];

/**
 * Qizil qoya (kanyon devori): 3 pog'onali mesa. Har pog'ona tor va past, yaw bo'yicha biroz burilgan, rangi qatlam-qatlam.
 * size = eni, balandligi, chuqurligi. Poydevor `sink` m yerga ko'milgan (qiya relyefda havoda qolmasin). Kollayder: har pog'onaga kuboid.
 */
export function createCliff(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? [24, 22, 16];
  const seed = hash2(o.x, o.z);
  const g = new THREE.Group();
  const colliders: RAPIER.ColliderDesc[] = [];
  let y = -C.sink;
  C.tiers.forEach(([scale, share], i) => {
    const th = h * share! + (i === 0 ? C.sink : 0);
    const turn = (hash2(o.x + i, o.z - i) - 0.5) * 0.5;
    const tw = w * scale!;
    const td = d * scale!;
    const off = (i === 0 ? 0 : (seed - 0.5) * w * 0.12);
    const m = dmat(BANDS[(i + Math.floor(seed * 4)) % BANDS.length]!, 0.95, 0.02);
    put(g, unitBox(), m, [off, y + th / 2, 0], [tw, th, td], [0, turn, 0]);
    // Qatlam chizig'i: tor, to'q belbog'
    put(g, unitBox(), dmat('rock3', 0.95, 0.02), [off, y + th * 0.55, 0], [tw * 1.015, th * 0.12, td * 1.015], [0, turn, 0]);
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    colliders.push(placed(R.ColliderDesc.cuboid(tw / 2, th / 2, td / 2), o, [off, y + th / 2, 0], rot));
    y += th;
  });
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
