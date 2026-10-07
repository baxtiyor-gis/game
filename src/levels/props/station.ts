import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo, mesh, propCfg, stdMat } from './common';
import type { Origin, PropBuild } from './common';

const col = propCfg.colors;

/** Yoqilg'i quyish shoxobchasi: soyabon tom (4 ustun), 2 ta kolonka oroli, do'kon, balandlikdagi belgi. +z — kirish. */
export function createStation(R: Rapier, o: Origin): PropBuild {
  const cube = cachedGeo('unitBox', () => new THREE.BoxGeometry(1, 1, 1));
  const canopy = stdMat('st.canopy', col.stationCanopy, 0.5, 0.2);
  const stripe = stdMat('st.stripe', col.stationStripe, 0.5, 0.2);
  const pump = stdMat('st.pump', col.stationPump, 0.4, 0.4);
  const wall = stdMat('bld.wall', col.wall, 0.8, 0.25);
  const glass = stdMat('bld.window', col.window, 0.15, 0.7);
  const post = stdMat('pipe.post', col.pipePost, 0.8, 0.3);
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const add = (mat: THREE.Material, p: [number, number, number], s: [number, number, number]): void => {
    const m = mesh(cube, mat, ...p);
    m.scale.set(...s);
    g.add(m);
  };
  const solid = (p: [number, number, number], s: [number, number, number]): void => {
    colliders.push(box(R, o, p, [s[0] / 2, s[1] / 2, s[2] / 2]));
  };

  const roofY = 5.2;
  add(canopy, [0, roofY, 0], [14, 0.5, 8]);
  add(stripe, [0, roofY - 0.45, 4.05], [14, 0.4, 0.15]);
  for (const sx of [-6, 6]) {
    for (const sz of [-3, 3]) {
      add(post, [sx, roofY / 2, sz], [0.5, roofY, 0.5]);
      solid([sx, roofY / 2, sz], [0.5, roofY, 0.5]);
    }
  }
  for (const sx of [-2.5, 2.5]) {
    add(post, [sx, 0.1, 0], [1.4, 0.2, 6]);
    for (const sz of [-1.6, 1.6]) {
      add(pump, [sx, 1.0, sz], [0.8, 1.8, 0.6]);
      add(stripe, [sx, 1.7, sz + 0.31], [0.6, 0.35, 0.05]);
    }
    solid([sx, 0.9, 0], [1.4, 1.8, 6]);
  }
  // Do'kon
  add(wall, [0, 1.8, -9.5], [10, 3.6, 6]);
  add(canopy, [0, 3.75, -9.5], [10.8, 0.3, 6.8]);
  add(glass, [0, 1.8, -6.45], [7, 1.6, 0.1]);
  solid([0, 1.8, -9.5], [10, 3.6, 6]);
  // Belgi ustuni
  add(post, [-9, 4, 3], [0.4, 8, 0.4]);
  add(stripe, [-9, 8.4, 3], [2.8, 1.6, 0.3]);
  solid([-9, 4, 3], [0.4, 8, 0.4]);

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
