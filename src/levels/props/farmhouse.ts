import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { fc, gable, mat, put, unitBox } from './farmKit';

/** Ferma uyi: oq devor, qizg'ish tom, ayvon (porch), eshik, derazalar, mo'ri. size = [eni, balandligi, uzunligi]. */
export function createFarmhouse(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? [9, 4.5, 7.5];
  const cube = unitBox();
  const wall = mat('house', fc.house, 0.85, 0.05);
  const roof = mat('houseRoof', fc.houseRoof, 0.7, 0.15);
  const door = mat('houseDoor', fc.houseDoor, 0.9, 0.05);
  const glass = mat('glass', fc.glass, 0.15, 0.7);
  const wood = mat('wood', fc.wood, 0.9, 0.05);
  const g = new THREE.Group();
  const rh = w * 0.34;
  put(g, cube, wall, [0, h / 2, 0], [w, h, d]);
  put(g, gable(w + 1.2, rh, d + 1.2), roof, [0, h, 0]);
  put(g, gable(w, rh - 0.3, d), wall, [0, h, 0]);
  const z = d / 2;
  put(g, cube, door, [0, 1.1, z + 0.05], [1.2, 2.2, 0.1]);
  for (const sx of [-1, 1]) put(g, cube, glass, [sx * w * 0.3, h * 0.55, z + 0.04], [1.3, 1.3, 0.1]);
  for (const sx of [-1, 1]) for (const zz of [-d * 0.22, d * 0.22]) put(g, cube, glass, [sx * (w / 2 + 0.04), h * 0.55, zz], [0.1, 1.3, 1.2]);
  put(g, cube, wood, [0, 0.15, z + 1.1], [w * 0.6, 0.3, 2.2]);
  for (const sx of [-1, 1]) put(g, cube, wood, [sx * w * 0.27, 1.6, z + 2], [0.2, 3.2, 0.2]);
  put(g, cube, roof, [0, 3.3, z + 1.1], [w * 0.64, 0.2, 2.6]);
  put(g, cube, mat('chimney', '#8a5a4a', 0.9, 0.05), [w * 0.25, h + rh * 0.55, -d * 0.2], [0.9, rh * 1.4, 0.9]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, h / 2, 0], [w / 2, h / 2, d / 2])] };
}
