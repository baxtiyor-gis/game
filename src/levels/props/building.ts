import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box, cachedGeo, mesh, propCfg, stdMat } from './common';
import type { Origin, PropBuild } from './common';

const col = propCfg.colors;

/** Neft zavodi binosi: gofrirovka devor, ustiga chiqqan tom, eshik, derazalar, shamollatgich quvur. size = [eni, balandligi, uzunligi]. */
export function createBuilding(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const [w, h, d] = def.size ?? [10, 5, 14];
  const cube = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const cyl = cachedGeo('unitCyl', () => new THREE.CylinderGeometry(1, 1, 1, 16));
  const wall = stdMat('bld.wall', col.wall, 0.8, 0.25);
  const roof = stdMat('bld.roof', col.roof, 0.6, 0.45);
  const dark = stdMat('bld.door', col.door, 0.9, 0.1);
  const glass = stdMat('bld.window', col.window, 0.15, 0.7);
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number], s: [number, number, number]): void => {
    const m = mesh(geo, mat, ...p);
    m.scale.set(...s);
    g.add(m);
  };

  add(cube, wall, [0, h / 2, 0], [w, h, d]);
  add(cube, roof, [0, h + 0.15, 0], [w + 0.8, 0.3, d + 0.8]);
  add(cube, dark, [0, 1.3, d / 2 + 0.03], [2.4, 2.6, 0.1]);
  const windows = Math.max(1, Math.floor((d - 3) / 4));
  for (let i = 0; i < windows; i++) {
    const z = -d / 2 + (d * (i + 0.5)) / windows;
    for (const sx of [-1, 1]) add(cube, glass, [sx * (w / 2 + 0.03), h * 0.62, z], [0.1, 1.1, 1.6]);
  }
  add(cyl, roof, [w * 0.25, h + 1.4, -d * 0.25], [0.45, 2.4, 0.45]);
  add(cyl, wall, [-w * 0.25, h + 0.55, d * 0.2], [0.9, 0.8, 0.9]);

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders: [box(R, o, [0, h / 2, 0], [w / 2, h / 2, d / 2])] };
}
