import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import type { PropDef } from '../types';
import { cachedGeo, placed } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox } from './farmKit';
import { dam, dmat } from './damKit';

const T = dam.tower;

/**
 * Suv olish minorasi: balandligi height (`size[1]`), silindrsimon beton tana, halqa belbog'lari, tepada oynali kabina va tom,
 * yon tomonda tik yoriqlar. Ko'lda turadi (asos y — ko'l tubi). Kollayder: silindr.
 */
export function createIntakeTower(R: Rapier, o: Origin, def: PropDef): PropBuild {
  const r = (def.scale ?? 1) * T.radius;
  const h = def.size?.[1] ?? T.height;
  const wall = dmat('concrete', 0.9, 0.02);
  const dark = dmat('concreteDark', 0.9, 0.02);
  const glass = dmat('glass', 0.25, 0.6);
  const roof = dmat('roof', 0.9, 0.1);
  const cyl = cachedGeo('dam.towerCyl', () => new THREE.CylinderGeometry(0.88, 1, 1, 18));
  const ring = cachedGeo('dam.towerRing', () => new THREE.CylinderGeometry(1, 1, 1, 18));
  const g = new THREE.Group();
  put(g, cyl, wall, [0, h / 2 - 1, 0], [r, h + 2, r]);
  for (let i = 1; i <= T.bands; i++) put(g, ring, dark, [0, (h * i) / (T.bands + 1), 0], [r * 1.06, 0.5, r * 1.06]);
  // Tik yoriqlar (suv kirish)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put(g, unitBox(), dark, [Math.cos(a) * r * 0.96, h * 0.45, Math.sin(a) * r * 0.96], [0.5, h * 0.35, 0.5], [0, -a, 0]);
  }
  // Tepada: kabina, oynalar, tom, antenna
  const cy = h + T.cabinH / 2;
  put(g, unitBox(), wall, [0, cy, 0], [T.cabin, T.cabinH, T.cabin]);
  for (const sz of [-1, 1]) put(g, unitBox(), glass, [0, cy, sz * (T.cabin / 2 + 0.03)], [T.cabin * 0.75, T.cabinH * 0.4, 0.1]);
  for (const sx of [-1, 1]) put(g, unitBox(), glass, [sx * (T.cabin / 2 + 0.03), cy, 0], [0.1, T.cabinH * 0.4, T.cabin * 0.75]);
  put(g, unitBox(), roof, [0, h + T.cabinH + 0.25, 0], [T.cabin + 1, 0.5, T.cabin + 1]);
  put(g, unitBox(), dark, [0, h + T.cabinH + 2, 0], [0.12, 3.5, 0.12]);
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const collider = placed(R.ColliderDesc.cylinder((h + 2) / 2, r), o, [0, h / 2 - 1, 0]);
  return { object: g, colliders: [collider] };
}
