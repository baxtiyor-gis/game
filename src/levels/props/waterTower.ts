import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { farm, fc, mat, put, unitBox, unitCyl } from './farmKit';

/** Suv minorasi: 4 ta yog'och oyoq, xochsimon taxta, tsilindr bak, konus tom. Oyoqlar orasidan o'tib bo'ladi. */
export function createWaterTower(R: Rapier, o: Origin): PropBuild {
  const { legHeight: lh, tankRadius: tr, tankHeight: th } = farm.waterTower;
  const leg = mat('towerLeg', fc.towerLeg, 0.9, 0.05);
  const tank = mat('towerTank', fc.towerTank, 0.5, 0.5);
  const g = new THREE.Group();
  const a = tr * 0.7;
  const colliders = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      put(g, unitBox(), leg, [sx * a, lh / 2, sz * a], [0.45, lh, 0.45]);
      colliders.push(box(R, o, [sx * a, lh / 2, sz * a], [0.25, lh / 2, 0.25]));
    }
  }
  const diag = Math.hypot(2 * a, lh * 0.5);
  const ang = Math.atan2(lh * 0.5, 2 * a);
  for (const s of [-1, 1]) {
    put(g, unitBox(), leg, [0, lh * 0.5, a], [diag, 0.18, 0.18], [0, 0, s * ang]);
    put(g, unitBox(), leg, [0, lh * 0.5, -a], [diag, 0.18, 0.18], [0, 0, s * ang]);
    put(g, unitBox(), leg, [a, lh * 0.5, 0], [0.18, 0.18, diag], [s * ang, 0, 0]);
  }
  put(g, unitCyl(), tank, [0, lh + th / 2, 0], [tr, th, tr]);
  put(g, unitCyl(), leg, [0, lh + 0.1, 0], [tr * 1.05, 0.2, tr * 1.05]);
  put(g, unitCyl(), leg, [0, lh + th - 0.1, 0], [tr * 1.05, 0.2, tr * 1.05]);
  put(g, cachedGeo('towerRoof', () => new THREE.ConeGeometry(1, 1, 16)), mat('towerRoof', '#5a3d2a', 0.8, 0.1), [0, lh + th + tr * 0.35, 0], [tr * 1.15, tr * 0.7, tr * 1.15]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
