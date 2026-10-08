import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { air, amat } from './airKit';

const T = air.tower;

/** Nazorat minorasi: past bino, ustun, sakkiz qirrali shisha kabina, tom, antenna va radar likopchasi. */
export function createControlTower(R: Rapier, o: Origin): PropBuild {
  const wall = amat('towerWall', 0.8, 0.1);
  const trim = amat('towerTrim', 0.6, 0.2);
  const glass = amat('towerGlass', 0.12, 0.75);
  const dark = amat('craneDark', 0.7, 0.4);
  const cube = unitBox();
  const cyl = unitCyl();
  const oct = cachedGeo('towerOct', () => new THREE.CylinderGeometry(1, 0.86, 1, 8));
  const dish = cachedGeo('towerDish', () => new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.35));
  const g = new THREE.Group();
  const top = T.baseH + T.shaftH;

  put(g, cube, wall, [0, T.baseH / 2, 0], [T.baseW, T.baseH, T.baseW * 0.8]);
  put(g, cube, trim, [0, T.baseH + 0.2, 0], [T.baseW + 0.8, 0.4, T.baseW * 0.8 + 0.8]);
  put(g, cube, dark, [0, 1.3, T.baseW * 0.4 + 0.03], [2.2, 2.6, 0.1]);
  for (const s of [-1, 1]) put(g, cube, glass, [s * T.baseW * 0.25, T.baseH * 0.62, T.baseW * 0.4 + 0.03], [2.4, 1.2, 0.1]);
  put(g, cube, wall, [0, T.baseH + T.shaftH / 2, 0], [T.shaftW, T.shaftH, T.shaftW]);
  for (let y = 4; y < T.shaftH; y += 5) put(g, cube, trim, [0, T.baseH + y, 0], [T.shaftW + 0.2, 0.45, T.shaftW + 0.2]);
  put(g, cube, dark, [0, top + 0.3, 0], [T.cabR * 2 + 1.2, 0.6, T.cabR * 2 + 1.2]);
  put(g, oct, glass, [0, top + 0.6 + T.cabH / 2, 0], [T.cabR, T.cabH, T.cabR]);
  put(g, cyl, wall, [0, top + 0.6 + T.cabH / 2 - 0.2, 0], [T.cabR * 0.14, T.cabH, T.cabR * 0.14]);
  put(g, cube, wall, [0, top + 0.6 + T.cabH + 0.2, 0], [T.cabR * 2 + 1.8, 0.4, T.cabR * 2 + 1.8]);
  put(g, cyl, dark, [0, top + 0.6 + T.cabH + 0.4 + T.mast / 2, 0], [0.12, T.mast, 0.12]);
  put(g, cyl, trim, [0, top + 0.6 + T.cabH + 0.4 + T.mast, 0], [0.22, 0.25, 0.22]);
  put(g, cyl, dark, [T.cabR * 0.6, top + 0.6 + T.cabH + 0.9, T.cabR * 0.3], [0.1, 1.0, 0.1]);
  put(g, dish, wall, [-T.cabR * 0.55, top + 0.6 + T.cabH + 0.6, -T.cabR * 0.3], [1.5, 1.5, 1.5], [-0.5, 0, 0]);

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return {
    object: g,
    colliders: [
      box(R, o, [0, T.baseH / 2, 0], [T.baseW / 2, T.baseH / 2, T.baseW * 0.4]),
      box(R, o, [0, T.baseH + T.shaftH / 2, 0], [T.shaftW / 2, T.shaftH / 2, T.shaftW / 2]),
    ],
  };
}
