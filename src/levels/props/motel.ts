import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { box } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { casino, cmat, neon, signPanel } from './casinoKit';

const M = casino.motel;

/**
 * Cho'l chetidagi motel (statik): L shaklidagi bir qavatli xonalar qatori (rang-barang eshiklar, iliq derazalar, tekis tom),
 * oldida ayvon, yonida baland neon viveska. Lokal +z — old (mashinalar to'xtaydigan tomon); qator x bo'ylab, qanot +z ga qaytadi.
 */
export function createMotel(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const g = new THREE.Group();
  const colliders: PropBuild['colliders'] = [];
  const wall = cmat('motelWall', 0.9, 0.03);
  const roof = cmat('motelRoof', 0.85, 0.05);
  const rowW = M.rooms * M.roomW;
  const y = M.height;
  const body = (x: number, z: number, w: number, d: number): void => {
    put(g, unitBox(), wall, [x, y / 2, z], [w, y, d]);
    put(g, unitBox(), roof, [x, y + 0.2, z], [w + 0.8, 0.4, d + 0.8]);
    put(g, unitBox(), neon('pink'), [x, y + 0.45, z + d / 2 + 0.4], [w + 0.8, 0.1, 0.1]);
    colliders.push(box(R, o, [x, y / 2, z], [w / 2, y / 2, d / 2]));
  };
  body(0, 0, rowW, M.depth);
  const wingD = M.wing * M.roomW;
  const wingZ = M.depth / 2 + wingD / 2;
  body(rowW / 2 - M.depth / 2, wingZ, M.depth, wingD);

  const door = (x: number, z: number, onX: boolean, i: number): void => {
    const s: [number, number, number] = onX ? [1.1, 2.1, 0.1] : [0.1, 2.1, 1.1];
    put(g, unitBox(), cmat(i % 2 ? 'doorA' : 'doorB', 0.6, 0.1), [x, 1.05, z], s);
    const w: [number, number, number] = onX ? [1.6, 1.0, 0.1] : [0.1, 1.0, 1.6];
    const dx = onX ? 1.8 : 0;
    const dz = onX ? 0 : 1.8;
    put(g, unitBox(), neon('warm'), [x + dx, 1.6, z + dz], w);
  };
  for (let i = 0; i < M.rooms; i++) door(-rowW / 2 + (i + 0.5) * M.roomW, M.depth / 2 + 0.05, true, i);
  for (let i = 0; i < M.wing; i++) door(rowW / 2 - M.depth / 2 + M.depth / 2 + 0.05, M.depth / 2 + (i + 0.5) * M.roomW, false, i);

  // Ayvon ustunlari
  for (let i = 0; i <= M.rooms; i += 2) put(g, unitBox(), cmat('steelDark', 0.6, 0.4), [-rowW / 2 + i * M.roomW, y / 2, M.depth / 2 + M.balcony], [0.2, y, 0.2]);
  put(g, unitBox(), roof, [0, y, M.depth / 2 + M.balcony / 2], [rowW, 0.15, M.balcony]);

  // Baland neon viveska (yon tomonda)
  const sx = -rowW / 2 - 5;
  const sz = M.depth / 2 + 4;
  put(g, unitBox(), cmat('steelDark', 0.6, 0.4), [sx, M.signH / 2, sz], [0.6, M.signH, 0.6]);
  put(g, unitBox(), cmat('steelDark', 0.6, 0.4), [sx, M.signH - 1.6, sz], [M.signW + 0.4, 3.3, 0.5]);
  signPanel(g, M.signW, 2.8, [sx, M.signH - 1.6, sz + 0.27], def.sign ?? 'casino.sign.motel', 'cyan');
  put(g, unitBox(), neon('pink'), [sx, M.signH + 0.2, sz], [M.signW + 0.6, 0.3, 0.7]);
  put(g, unitBox(), neon('amber'), [sx, M.signH - 3.5, sz], [M.signW * 0.6, 0.5, 0.7]);
  colliders.push(box(R, o, [sx, M.signH / 2, sz], [0.3, M.signH / 2, 0.3]));

  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  return { object: g, colliders };
}
