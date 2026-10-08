import * as THREE from 'three';
import type { Rapier } from '../../core/types';
import { box, cachedGeo } from './common';
import type { Origin, PropBuild } from './common';
import { put, unitBox, unitCyl } from './farmKit';
import { base, bmat, halfCyl } from './baseKit';

const T = base.truck;

/** Harbiy yuk mashinasi (statik): 'cargo' — brezent usti, 'tanker' — yoqilg'i sisternasi. Yaw: old tomon +z. */
export function createMilitaryTruck(R: Rapier, o: Origin, variant = 'cargo'): PropBuild {
  const body = bmat('olive', 0.8, 0.2);
  const dark = bmat('oliveDark', 0.8, 0.25);
  const tire = bmat('tire', 0.95, 0.02);
  const glass = bmat('glass', 0.15, 0.7);
  const g = new THREE.Group();
  const wheel = cachedGeo('truck.wheel', () => new THREE.CylinderGeometry(T.wheelR, T.wheelR, 0.5, 14));
  const half = T.length / 2;
  const bedL = T.length - T.cabL - 0.4;
  const bedZ = -half + bedL / 2;
  const baseY = T.wheelR + 0.1;

  put(g, unitBox(), dark, [0, baseY + T.chassisH / 2, 0], [T.width - 0.5, T.chassisH, T.length]);
  const cabZ = half - T.cabL / 2;
  put(g, unitBox(), body, [0, baseY + T.chassisH + 0.9, cabZ], [T.width, 1.8, T.cabL]);
  put(g, unitBox(), glass, [0, baseY + T.chassisH + 1.15, half - 0.02], [T.width - 0.5, 0.8, 0.08]).rotation.x = -0.12;
  put(g, unitBox(), dark, [0, baseY + T.chassisH + 0.45, half + 0.25], [T.width - 0.2, 0.6, 0.5]);
  for (const s of [-1, 1]) {
    put(g, unitBox(), glass, [s * (T.width / 2 + 0.01), baseY + T.chassisH + 1.15, cabZ], [0.06, 0.7, T.cabL * 0.55]);
    for (const z of [half - 1.5, -half + 1.4, -half + 3.2]) put(g, wheel, tire, [s * (T.width / 2 - 0.1), T.wheelR, z], [1, 1, 1], [0, 0, Math.PI / 2]);
  }
  if (variant === 'tanker') {
    const r = T.cargoH / 2;
    put(g, unitCyl(), bmat('metal', 0.45, 0.6), [0, baseY + T.chassisH + r, bedZ], [r, bedL, r], [Math.PI / 2, 0, 0]);
    put(g, unitBox(), dark, [0, baseY + T.chassisH + T.cargoH + 0.1, bedZ], [0.8, 0.25, 1.2]);
  } else {
    put(g, unitBox(), body, [0, baseY + T.chassisH + 0.15, bedZ], [T.width, 0.3, bedL]);
    put(g, halfCyl(), bmat('canvas', 0.95, 0.02, true), [0, baseY + T.chassisH + 0.3, bedZ], [T.width / 2 - 0.1, T.cargoH - 0.3, bedL]);
  }
  g.position.set(o.x, o.y, o.z);
  g.rotation.y = o.yaw;
  const top = baseY + T.chassisH + T.cargoH;
  return {
    object: g,
    colliders: [
      box(R, o, [0, top / 2 + 0.3, bedZ], [T.width / 2, top / 2 - 0.2, bedL / 2]),
      box(R, o, [0, (baseY + T.chassisH + 1.8) / 2, cabZ + 0.2], [T.width / 2, (baseY + T.chassisH + 1.8) / 2, T.cabL / 2 + 0.3]),
    ],
  };
}
