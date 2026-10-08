import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { smat, ski } from './skiKit';

const L = ski.lift;

/**
 * Kanat yo'li stansiyasi: yo'nalish lokal +z (pastki -> yuqori). Platforma, to'rt ustun, qorli tom, past orqa to'siq va
 * g'altak (arqon aylanadigan vertikal baraban). Kabinalar tom ostidan (arqon balandligida) o'tadi.
 * `cableY` — arqon balandligi stansiya yeriga nisbatan.
 */
export function createLiftStation(R: Rapier, o: Origin, cableY: number): PropBuild {
  const w = L.gap + L.station.margin * 2;
  const d = L.station.depth;
  const roofY = cableY + L.station.roofGap;
  const concrete = smat('concrete', 0.9, 0.05);
  const steel = smat('steel', 0.5, 0.5);
  const g = new THREE.Group();
  put(g, unitBox(), concrete, [0, 0.2, 0], [w, 0.4, d]);
  const px = w / 2 - 0.4;
  const pz = d / 2 - 0.4;
  const colliders = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(g, unitBox(), steel, [sx * px, roofY / 2, sz * pz], [0.5, roofY, 0.5]);
      colliders.push(box(R, o, [sx * px, roofY / 2, sz * pz], [0.3, roofY / 2, 0.3]));
    }
  }
  put(g, unitBox(), smat('gondola', 0.6, 0.1), [0, roofY + 0.15, 0], [w + 1.2, 0.3, d + 1.2]);
  put(g, unitBox(), smat('snow', 0.8, 0.02), [0, roofY + 0.38, 0], [w + 1.0, 0.2, d + 1.0]);
  put(g, unitBox(), smat('log', 0.9, 0.02), [0, 0.7, -pz], [w - 1, 1, 0.3]); // past to'siq (orqa devor ochiq: kabinalar ko'rinadi)
  colliders.push(box(R, o, [0, 0.7, -pz], [(w - 1) / 2, 0.5, 0.2]));
  for (const sx of [-1, 1]) put(g, unitCyl(), steel, [sx * L.gap / 2, cableY - 0.4, -pz + 1.2], [1.1, 0.25, 1.1]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
